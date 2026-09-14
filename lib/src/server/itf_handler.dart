import 'dart:convert';
import 'dart:io';

import 'package:mime/mime.dart';
import 'package:shelf/shelf.dart';

import '../bridge/export_bridge.dart';
import '../bridge/file_bridge.dart';
import '../bridge/http_bridge.dart';
import '../bridge/sql_bridge.dart';

/// Handles `/android.itf` — the whole native bridge.
///
/// xScript calls these routes with a synchronous XMLHttpRequest whenever the
/// `Android` JS interface is absent. The Flutter host deliberately does not
/// register that interface (webview_flutter's JavaScriptChannel is one-way and
/// asynchronous, so it cannot return a value to a `while` loop), which makes
/// this handler the only bridge. See doc/web-bundle-port-plan.md §2.
class ItfHandler {
  ItfHandler({
    required this.sql,
    required this.files,
    required this.http,
    required this.export,
  });

  final SqlBridge sql;
  final FileBridge files;
  final HttpBridge http;
  final ExportBridge export;

  static const _noCache = {
    'Cache-Control': 'max-age=0, no-cache, must-revalidate, proxy-revalidate',
  };

  Future<Response> call(Request request) async {
    final q = request.url.queryParameters;
    return switch (q['opt']) {
      'sql' => await _sql(request, q),
      'file' => await _file(request, q),
      'http' => await _http(request, q),
      'export' => await _export(request, q),
      'exportproject' => await _exportProject(q),
      _ => _badRequest,
    };
  }

  // ---------------------------------------------------------------- helpers

  // Built per call, never shared: a shelf Response body can only be read once,
  // so a cached instance serves the first request and then throws.
  static Response get _badRequest => Response.badRequest(headers: _noCache);

  static Response get _serverError =>
      Response.internalServerError(headers: _noCache);

  /// JSON reply. Every successful bridge call that is not raw data returns one.
  static Response _json(Object? body) => Response.ok(
        jsonEncode(body),
        headers: {'Content-Type': 'application/json; charset=utf-8', ..._noCache},
      );

  /// Raw reply, for `fileread` and the HTTP proxy. xScript reads these with
  /// `rawRemoteInterface`, i.e. `responseText` with no parsing.
  static Response _raw(String body) => Response.ok(
        body,
        headers: {
          'Content-Type': 'application/octet-stream; charset=utf-8',
          ..._noCache,
        },
      );

  /// Queries carry SQL base64-encoded, because `btoa()` on the JS side keeps
  /// the statement out of the URL's reserved character set.
  static String? _decodeQuery(String? encoded) {
    if (encoded == null) return null;
    try {
      return utf8.decode(base64.decode(encoded));
    } on FormatException {
      return null;
    }
  }

  static int? _int(String? value) =>
      value == null ? null : int.tryParse(value);

  // -------------------------------------------------------------------- sql

  Future<Response> _sql(Request request, Map<String, String> q) async {
    switch (q['action']) {
      // --------------------------------------------- Phase 4b: the async API
      //
      // POST with a JSON body `{handle, sql, args}`. The body carries the SQL
      // so it needs neither base64 (which was transport encoding, not escaping)
      // nor a URL long enough to hold it, and `args` are bound by SQLite
      // rather than concatenated in. See doc/js-ui-framework-evaluation.md §3.3.
      case 'query':
      case 'run':
      case 'insertrow':
        return _asyncSql(request, q['action']!);

      case 'opendb':
        final path = q['path'];
        if (path == null) return _badRequest;
        final handle = await sql.openDb(path, q['bpath']);
        if (handle < 0) return _serverError;
        return _json({'handle': '$handle'});

      case 'closedb':
        final handle = _int(q['handle']);
        if (handle == null) return _badRequest;
        await sql.closeDb(handle);
        return _json(const {});

      case 'deletedb':
        final path = q['path'];
        if (path == null) return _badRequest;
        await sql.deleteDb(path, q['bpath']);
        return _json(const {});

      case 'exec':
        final handle = _int(q['handle']);
        final query = _decodeQuery(q['query']);
        if (handle == null || query == null) return _badRequest;
        await sql.exec(handle, query);
        return _json(const {});

      case 'insert':
        final handle = _int(q['handle']);
        final query = _decodeQuery(q['query']);
        if (handle == null || query == null) return _badRequest;
        final rowid = await sql.insert(handle, query);
        return _json({'rowid': '$rowid'});

      case 'select':
        final handle = _int(q['handle']);
        final query = _decodeQuery(q['query']);
        if (handle == null || query == null) return _badRequest;
        final cursor = await sql.select(handle, query);
        if (cursor < 0) return _serverError;
        return _json({'cursor': '$cursor'});

      case 'getrowcount':
        final cursor = _int(q['cursor']);
        if (cursor == null) return _badRequest;
        return _json({'rowcount': '${sql.rowCount(cursor)}'});

      case 'gotolastrow':
        final cursor = _int(q['cursor']);
        if (cursor == null) return _badRequest;
        sql.gotoLastRow(cursor);
        return _json(const {});

      // An exhausted cursor returns {} rather than an error; xScript's
      // `while (resObj = db.getNextRow())` loops terminate on the empty object.
      case 'getnextrow':
        final cursor = _int(q['cursor']);
        if (cursor == null) return _badRequest;
        return _json(sql.nextRow(cursor) ?? const {});

      case 'getprevrow':
        final cursor = _int(q['cursor']);
        if (cursor == null) return _badRequest;
        return _json(sql.prevRow(cursor) ?? const {});

      case 'closecursor':
        final cursor = _int(q['cursor']);
        if (cursor == null) return _badRequest;
        sql.closeCursor(cursor);
        return _json(const {});

      default:
        return _badRequest;
    }
  }

  /// The three parameterised routes share a body shape, so they share a
  /// decoder. A malformed body is a bad request; a statement SQLite refuses is
  /// a 500 carrying the message, because an app author needs to read it.
  Future<Response> _asyncSql(Request request, String action) async {
    final Object? body;
    try {
      body = jsonDecode(await request.readAsString());
    } on FormatException {
      return _badRequest;
    }
    if (body is! Map<String, Object?>) return _badRequest;

    final handle = switch (body['handle']) {
      final int h => h,
      final String h => int.tryParse(h),
      _ => null,
    };
    final sql = body['sql'];
    if (handle == null || sql is! String) return _badRequest;

    final rawArgs = body['args'] ?? const [];
    if (rawArgs is! List) return _badRequest;
    final args = List<Object?>.from(rawArgs);

    try {
      return switch (action) {
        'query' => _json({'rows': await this.sql.query(handle, sql, args)}),
        'run' => _json({'changes': await this.sql.run(handle, sql, args)}),
        _ => _json({'rowid': await this.sql.insertRow(handle, sql, args)}),
      };
    } on SqlError catch (e) {
      return Response.internalServerError(
        body: jsonEncode({'error': e.message}),
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ..._noCache,
        },
      );
    }
  }

  // ------------------------------------------------------------------- file

  Future<Response> _file(Request request, Map<String, String> q) async {
    switch (q['action']) {
      case 'openfile':
        final path = q['path'];
        if (path == null) return _badRequest;
        final handle = files.open(path, q['bpath']);
        if (handle < 0) return _serverError;
        return _json({'handle': '$handle'});

      case 'listfiles':
        final path = q['path'];
        if (path == null) return _badRequest;
        final entries = files.listFiles(path, q['bpath']);
        // `xFile.listFiles` treats an empty JSON object as "no such directory",
        // so a non-directory must not come back as a bare empty array.
        if (entries == null) return _json(const [<String, Object?>{}]);
        return _json(entries.map((e) => e.toJson()).toList());

      case 'mkdir':
        final path = q['path'];
        if (path == null) return _badRequest;
        if (!files.mkdir(path, q['bpath'])) return _serverError;
        return _json(const {});

      case 'closefile':
        final handle = _int(q['handle']);
        if (handle == null) return _badRequest;
        files.close(handle);
        return _json(const {});

      case 'deletefile':
        final handle = _int(q['handle']);
        if (handle == null) return _badRequest;
        if (!files.delete(handle)) return _serverError;
        return _json(const {});

      case 'fileread':
        final handle = _int(q['handle']);
        if (handle == null) return _badRequest;
        return _raw(files.read(handle));

      case 'filewrite':
        final handle = _int(q['handle']);
        if (handle == null) return _badRequest;
        files.write(
          handle,
          await request.readAsString(),
          append: q['append'] == 'true',
        );
        return _json(const {});

      case 'getextpath':
        return _json({'extpath': files.externalStoragePath()});

      default:
        return _badRequest;
    }
  }

  // ------------------------------------------------------------------- http

  Future<Response> _http(Request request, Map<String, String> q) async {
    final url = q['url'];
    if (url == null) return _badRequest;
    return switch (q['action']) {
      'get' => _raw(await http.get(url)),
      'post' => _raw(await http.post(url, await request.readAsString())),
      _ => _badRequest,
    };
  }

  // ----------------------------------------------------------------- export

  Future<Response> _export(Request request, Map<String, String> q) async {
    switch (q['action']) {
      case 'set':
        final handle = export.set(
          q['mime'] ?? 'application/octet-stream',
          q['fname'] ?? 'export',
          await request.readAsString(),
        );
        return _json({'handle': '$handle'});

      // `get` is the remote-browser download; `getwv` is the in-WebView one,
      // which is requested twice before the entry may be dropped.
      case 'get':
      case 'getwv':
        final handle = _int(q['handle']);
        if (handle == null) return _badRequest;
        final file = export.peek(handle);
        if (file == null) return _serverError;
        if (q['action'] == 'get') {
          export.remove(handle);
        } else {
          export.removeIfFetched(handle);
        }
        return Response.ok(
          file.data,
          headers: {
            'Content-Type': '${file.mime}; charset=utf-8',
            'Content-Disposition': 'attachment; filename="${file.fname}"',
            ..._noCache,
          },
        );

      default:
        return _badRequest;
    }
  }

  Future<Response> _exportProject(Map<String, String> q) async {
    if (q['action'] != 'export') return _badRequest;
    final project = q['project'];
    if (project == null) return _badRequest;

    final zipPath = await export.exportProject(project);
    if (zipPath == null) return _serverError;

    final zip = File(zipPath);
    final bytes = await zip.readAsBytes();
    await zip.delete(); // The original deleted the temp zip after sending it.

    return Response.ok(
      bytes,
      headers: {
        'Content-Type': lookupMimeType(zipPath) ?? 'application/zip',
        'Content-Disposition': 'attachment; filename="$project.zip"',
        ..._noCache,
      },
    );
  }
}
