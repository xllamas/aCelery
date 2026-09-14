import 'dart:io';

import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_static/shelf_static.dart';
import 'package:sqflite_common/sqlite_api.dart';

import '../bridge/export_bridge.dart';
import '../bridge/file_bridge.dart';
import '../bridge/http_bridge.dart';
import '../bridge/sql_bridge.dart';
import '../paths.dart';
import 'itf_handler.dart';

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
  })  : sql = SqlBridge(paths: paths, factory: databaseFactory),
        files = FileBridge(paths: paths),
        http = HttpBridge(),
        export = ExportBridge(paths: paths);

  /// The port the bundle hard-codes in `xRunUserApp` and the IDE's URLs.
  static const int defaultPort = 8123;

  final ACeleryPaths paths;
  final int port;

  /// Defaults to loopback. The Android original bound to every interface so a
  /// user could run their apps from a browser on another device; that is now
  /// opt-in, because it exposed the full SQL and filesystem bridge to the LAN
  /// with no authentication.
  final InternetAddress? address;

  final SqlBridge sql;
  final FileBridge files;
  final HttpBridge http;
  final ExportBridge export;

  HttpServer? _server;

  bool get isRunning => _server != null;

  /// The port actually bound. Equals [port] unless [port] was 0, which lets
  /// the OS pick one — used by tests so they can run in parallel.
  int get boundPort => _server?.port ?? port;

  Uri get baseUri => Uri.parse('http://localhost:$boundPort');

  /// True when the server is reachable from other devices. The Android
  /// original was always in this state; it is now opt-in.
  bool get isSharedOnNetwork =>
      address != null && address != InternetAddress.loopbackIPv4;

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

    _server = await shelf_io.serve(
      const Pipeline().addHandler(route),
      address ?? InternetAddress.loopbackIPv4,
      port,
    );
  }

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
    await sql.dispose();
    http.dispose();
  }
}
