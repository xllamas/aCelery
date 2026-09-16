import 'dart:convert';
import 'dart:io';

import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_static/shelf_static.dart';
import 'package:sqflite_common/sqlite_api.dart';

import '../bridge/export_bridge.dart';
import '../bridge/file_bridge.dart';
import '../bridge/http_bridge.dart';
import '../bridge/sql_bridge.dart';
import '../mcp/server.dart';
import '../mcp/transport.dart';
import '../paths.dart';
import 'access_control.dart';
import 'itf_handler.dart';
import 'pairing_page.dart';

/// The embedded HTTP server: serves the aCelery web bundle and the
/// `/android.itf` bridge.
///
/// Replaces `ACeleryBackground` (a foreground Service) plus
/// `aCeleryResponseThread` (a hand-rolled HTTP/1.0 server on the removed
/// `org.apache.http.*` APIs). This runs in-process.
class ACeleryServer {
  ACeleryServer({
    required this.paths,
    required DatabaseFactory databaseFactory,
    this.port = defaultPort,
    this.address,
    AccessControl? access,
    String version = 'dev',
  })  : sql = SqlBridge(paths: paths, factory: databaseFactory),
        files = FileBridge(paths: paths),
        http = HttpBridge(),
        export = ExportBridge(paths: paths),
        access = access ??
            AccessControl(
              storeFile: File(paths.accessStore),
            ) {
    // Built here rather than in start(), so sessions survive the rebind that
    // turning network sharing on or off performs.
    mcp = McpTransport(McpServer(paths: paths, sql: sql, version: version));
  }

  /// The port the bundle hard-codes in `xRunUserApp` and the IDE's URLs.
  static const int defaultPort = 8123;

  final ACeleryPaths paths;
  final int port;

  /// Overrides the address the socket binds to, for tests.
  ///
  /// In the app the address follows [AccessControl.sharedOnNetwork]: loopback
  /// when sharing is off, every interface when it is on. The Android original
  /// bound to every interface unconditionally, which is what made the missing
  /// authentication a live exposure.
  final InternetAddress? address;

  /// Who may talk to this server, and whether it listens beyond loopback.
  final AccessControl access;

  final SqlBridge sql;
  final FileBridge files;
  final HttpBridge http;
  final ExportBridge export;

  /// `/mcp`: the MCP server an assistant connects to (doc/mcp-server.md).
  late final McpTransport mcp;

  HttpServer? _server;

  bool get isRunning => _server != null;

  /// The port actually bound. Equals [port] unless [port] was 0, which lets
  /// the OS pick one — used by tests so they can run in parallel.
  int get boundPort => _server?.port ?? port;

  Uri get baseUri => Uri.parse('http://localhost:$boundPort');

  /// True when the server is reachable from other devices. The Android
  /// original was always in this state; it is now opt-in.
  bool get isSharedOnNetwork => _boundAddress?.isLoopback == false;

  InternetAddress? _boundAddress;

  /// The address the socket should bind to for the current setting.
  InternetAddress get _target =>
      address ??
      (access.sharedOnNetwork
          ? InternetAddress.anyIPv4
          : InternetAddress.loopbackIPv4);

  Future<void> start() async {
    if (_server != null) return;

    final itf = ItfHandler(sql: sql, files: files, http: http, export: export);
    final static = createStaticHandler(
      paths.wwwRoot,
      defaultDocument: 'index.html',
      useHeaderBytesForContentType: true,
    );

    /// Serves a static file, always revalidated.
    ///
    /// `shelf_static` sends `Last-Modified` and answers conditional requests,
    /// but nothing tells the client it must ask. A WebView is then free to
    /// pick its own freshness lifetime from the file's age and serve a stale
    /// copy without a request — which it does, and which breaks the IDE's
    /// whole loop: edit a file, hit Run, watch the previous version run.
    /// Phase 4c hit exactly this, and an ES module is worse than a script was,
    /// because the module map caches too.
    ///
    /// `no-cache` means "revalidate", not "don't store": the client still gets
    /// a 304 for anything unchanged, over loopback, which costs nothing.
    Future<Response> serveStatic(Request request) async {
      final response = await static(request);
      if (response.statusCode >= 400) return response;
      return response.change(headers: {'Cache-Control': 'no-cache'});
    }

    Future<Response> route(Request request) async {
      if (request.url.path == 'android.itf') return itf.call(request);
      return serveStatic(request);
    }

    /// Everything goes through the gate first.
    ///
    /// Including static files: an unpaired device must not be handed anything
    /// from the document root, which is the thing being protected.
    Future<Response> guarded(Request request) async {
      final peer = _peerOf(request);

      // The MCP server has its own rules, and none of them is pairing.
      if (request.url.path == 'mcp') return _mcp(request, peer);

      // An MCP client whose key is wrong or revoked goes looking for OAuth:
      // mcp-remote asks for four /.well-known/ documents and then POSTs
      // /register. Through the gate, each of those raised an "Allow this
      // device?" prompt on the phone, for something that can never pair.
      // aCelery has no OAuth and nothing in the tree lives at these paths, so
      // they are answered here: the client fails fast and says why.
      if (_isOAuthProbe(request.url.path)) {
        // Shaped as an OAuth error, so a client prints the description rather
        // than a complaint that the body is not JSON.
        return Response.notFound(
          jsonEncode({
            'error': 'invalid_request',
            'error_description': 'aCelery does not use OAuth. Create a key in '
                'aCelery under Network access and send it as '
                '"Authorization: Bearer <key>".',
          }),
          headers: {'Content-Type': 'application/json; charset=utf-8'},
        );
      }

      // The pairing endpoints are the one thing an unpaired device may reach,
      // or it could never become paired.
      if (request.url.path.startsWith('acelery.pair')) {
        return _pairing(request, peer);
      }

      switch (access.check(request, peer)) {
        case AccessAllowed():
          return route(request);

        case AccessRefused():
          return _notShared;

        case AccessUnauthorized():
          // check() never answers this; checkClient() does, for /mcp only.
          return _notShared;

        case AccessPairingRequired(:final pairing):
          // A navigation gets a page it can act on; a subresource gets a
          // status, because replacing a stylesheet with HTML helps nobody.
          final wantsHtml =
              (request.headers['accept'] ?? '').contains('text/html');
          if (!wantsHtml) {
            return Response(
              401,
              body: jsonEncode({'pairing': pairing.id, 'code': pairing.code}),
              headers: {'Content-Type': 'application/json; charset=utf-8'},
            );
          }
          return Response.ok(
            pairingPage(pairingId: pairing.id, code: pairing.code),
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          );
      }
    }

    _boundAddress = _target;
    _server = await shelf_io.serve(
      const Pipeline().addHandler(guarded),
      _boundAddress!,
      port,
    );
  }

  /// The address the request came from.
  ///
  /// shelf exposes it through the connection info it puts in the context.
  InternetAddress _peerOf(Request request) {
    final info = request.context['shelf.io.connection_info'];
    if (info is HttpConnectionInfo) return info.remoteAddress;
    // No connection info means an in-process call, which is as local as it
    // gets. Failing closed here would lock the app out of its own server.
    return InternetAddress.loopbackIPv4;
  }

  static bool _isOAuthProbe(String path) =>
      path.startsWith('.well-known/') ||
      const {'register', 'authorize', 'token'}.contains(path);

  static Response get _notShared => Response.forbidden(
        'aCelery is not shared on this network.',
        headers: {'Content-Type': 'text/plain; charset=utf-8'},
      );

  /// `/mcp`, behind its own gate (doc/mcp-server.md §3, §4).
  Future<Response> _mcp(Request request, InternetAddress peer) async {
    // Browsers send Origin on every cross-origin request and on every POST,
    // and MCP clients do not. Refusing it keeps pages — a site the user
    // visits, or an app in aCelery's own WebView — from driving the server,
    // which is the DNS-rebinding defence the specification requires.
    if (request.headers.containsKey('origin')) {
      return Response.forbidden(
        'Requests from a web page cannot use the MCP server.',
        headers: {'Content-Type': 'text/plain; charset=utf-8'},
      );
    }

    switch (access.checkClient(request, peer)) {
      case AccessAllowed():
        final token = AccessControl.bearerOf(request)!;
        return mcp.call(request, token: token);
      case AccessRefused():
        return _notShared;
      case AccessUnauthorized():
      case AccessPairingRequired():
        return Response(
          401,
          body: jsonEncode({
            'error': 'A client token is required. Create one in aCelery under '
                'Network access, then send it as "Authorization: Bearer '
                '<token>".',
          }),
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'WWW-Authenticate': 'Bearer realm="aCelery"',
          },
        );
    }
  }

  /// The two endpoints an unpaired device may reach.
  Future<Response> _pairing(Request request, InternetAddress peer) async {
    if (peer.isLoopback) {
      // The app's own WebView never pairs; saying so beats a puzzling page.
      return Response.ok('This device does not need to pair.',
          headers: {'Content-Type': 'text/plain; charset=utf-8'});
    }

    if (request.url.path == 'acelery.pair/status') {
      access.expire();
      final id = request.url.queryParameters['id'];
      final pairing = id == null ? null : access.pendingById(id);

      if (pairing == null) {
        // Either it was answered and cleared, or the app restarted. Both mean
        // "ask again".
        return _json({'state': 'unknown'});
      }
      if (!pairing.isSettled) return _json({'state': 'pending'});

      // The answer is delivered exactly once; the record goes with it.
      final token = await pairing.settled;
      access.collect(pairing.id);
      if (token == null) return _json({'state': 'denied'});

      // The token rides back as an HttpOnly cookie, so no script — ours or
      // anyone's — can read it out of the page.
      return _json({'state': 'approved'}, headers: {
        'Set-Cookie': '${AccessControl.cookieName}=$token; Path=/; '
            'HttpOnly; SameSite=Strict; Max-Age=31536000',
      });
    }

    return Response.notFound('Not found');
  }

  static Response _json(Object? body, {Map<String, String> headers = const {}}) =>
      Response.ok(
        jsonEncode(body),
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          ...headers,
        },
      );

  /// Turns network sharing on or off, rebinding the socket.
  ///
  /// The address a socket listens on cannot be changed once bound, so this is
  /// a stop and a start. Paired devices survive it; open connections do not.
  Future<void> setSharedOnNetwork(bool shared) async {
    if (access.sharedOnNetwork == shared && isRunning) return;
    await access.setShared(shared);
    if (isRunning) {
      await _server?.close(force: true);
      _server = null;
      await start();
    }
    await onSharingChanged?.call(shared);
  }

  /// Told whenever sharing is turned on or off, after the socket has rebound.
  ///
  /// The app uses it to keep the server alive with the screen off while
  /// sharing is on (lib/src/serving.dart). This class stays free of Flutter,
  /// so the harness in tool/serve.dart and the tests can run it.
  Future<void> Function(bool shared)? onSharingChanged;

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
    await sql.dispose();
    http.dispose();
  }
}
