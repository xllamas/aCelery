import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart' show databaseFactory;
import 'package:sqflite_common/sqlite_api.dart';

import 'bundle_installer.dart';
import 'paths.dart';
import 'server/acelery_server.dart';

/// Brings the aCelery host up: install the web bundle, then start the server
/// that hosts it.
///
/// Phase 2 adds the WebView that points at [ACeleryServer.baseUri].
class ACeleryRuntime {
  ACeleryRuntime._(this.paths, this.server);

  /// Bump when `assets/aCelery.zip` changes, so installed devices refresh the
  /// shipped files on their next launch. User content is never touched.
  static const String bundleVersion = '1.2.8+phase4d-ide';

  final ACeleryPaths paths;
  final ACeleryServer server;

  /// URL the WebView should load — the IDE's entry point.
  Uri get ideUrl => server.baseUri.replace(path: '/system/index.html');

  /// The IDE's app list, reached from the options menu.
  Uri get myAppsUrl => server.baseUri
      .replace(path: '/system/index.html', query: 'opt=apps');

  /// The logcat viewer a debug run offers.
  Uri get errorLogUrl => server.baseUri.replace(path: '/system/errorlog.html');

  /// Loads one of the user's apps, the way `xRunUserApp` did.
  Uri launcherUrl(String app) => server.baseUri.replace(
        path: '/system/launcher.html',
        queryParameters: {'app': app},
      );

  static Future<ACeleryRuntime> start({
    DatabaseFactory? factory,
    int port = ACeleryServer.defaultPort,
  }) async {
    final documents = await getApplicationDocumentsDirectory();
    final paths = ACeleryPaths(documents.path);

    await BundleInstaller(
      paths: paths,
      bundleVersion: bundleVersion,
      loadAsset: () async {
        final data = await rootBundle.load('assets/aCelery.zip');
        return data.buffer.asUint8List(
          data.offsetInBytes,
          data.lengthInBytes,
        );
      },
    ).installIfNeeded();

    final server = ACeleryServer(
      paths: paths,
      databaseFactory: factory ?? databaseFactory,
      port: port,
    );
    await server.start();

    return ACeleryRuntime._(paths, server);
  }

  Future<void> stop() => server.stop();
}
