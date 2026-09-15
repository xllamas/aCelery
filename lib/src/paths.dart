import 'dart:io';

import 'package:path/path.dart' as p;

/// Single source of truth for where the aCelery tree lives.
///
/// Ported from `aCeleryPaths.java`. The Android original moved off
/// `Environment.getExternalStorageDirectory()` (i.e. /sdcard) because since
/// API 29 (scoped storage) an app cannot create directories there, and
/// WRITE_EXTERNAL_STORAGE no longer grants that ability. The app's own
/// documents directory needs no permission at all and works on every platform.
///
/// [root] is what `path_provider.getApplicationDocumentsDirectory()` returns on
/// the device; tests pass a temporary directory instead.
class ACeleryPaths {
  ACeleryPaths(this.root);

  /// Parent of the "aCelery" folder, with no trailing slash.
  final String root;

  /// The aCelery tree itself.
  String get base => '$root/aCelery';

  /// Document root served over HTTP, with a trailing slash.
  String get wwwRoot => '$base/www/';

  String get filesRoot => '$base/files/';

  String get dbRoot => '$base/db/';

  String get logRoot => '$base/log/';

  String get userRoot => '$base/www/user/';

  /// Scratch space for generated files (exported project zips).
  String get cacheRoot => '$base/cache/';

  String userProjectDir(String project) => '$base/www/user/$project';

  /// Who is paired with the server, and whether it is shared on the network.
  ///
  /// Outside [base], not merely outside [wwwRoot]: it holds bearer tokens, and
  /// the file bridge reads and writes anything inside [base]. It used to sit
  /// at `$base/.acelery-access.json`, where `opt=file` could open it.
  String get accessStore => '$root/.acelery/access.json';

  /// Directories that hold user-created content and must survive a bundle
  /// upgrade. The Java original unzipped unconditionally over the whole tree,
  /// which destroyed user projects and databases on every app update.
  List<String> get userDataRoots => [userRoot, dbRoot, filesRoot, logRoot];

  /// Joins [base] and [path] the way the Java bridge did, collapsing the
  /// duplicate separators the original produced (`bpath` already ends in "/"
  /// in most callers, and `xFileOpen` appended another one).
  static String join(String? basePath, String path) {
    final prefix = (basePath == null || basePath.isEmpty) ? '' : '$basePath/';
    return normalize('$prefix$path');
  }

  /// Collapses repeated slashes. POSIX treats `a//b` as `a/b`, and the Java
  /// code relied on that; we do it explicitly so paths compare equal.
  static String normalize(String path) => path.replaceAll(RegExp(r'/{2,}'), '/');

  /// True when [candidate] resolves inside [root] — the "zip slip" / path
  /// traversal guard. Applied to every filesystem route, not just unzipping,
  /// because `path` and `bpath` arrive from the WebView.
  ///
  /// Both sides are normalized first, so `..` segments are resolved and the
  /// trailing slashes the bundle's paths carry do not defeat the comparison.
  static bool isInside(Directory root, FileSystemEntity candidate) {
    final rootPath = p.normalize(root.absolute.path);
    final target = p.normalize(candidate.absolute.path);
    return target == rootPath || p.isWithin(rootPath, target);
  }
}
