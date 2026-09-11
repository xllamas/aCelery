import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';

import 'paths.dart';

/// Installs the aCelery web bundle (`assets/aCelery.zip`) into the app's
/// documents directory on first run, and refreshes it when the shipped bundle
/// changes.
///
/// Ported from `aCeleryUnzip.java` + the unzip call in `ACeleryActivity`, with
/// one deliberate behaviour change: the Java version unzipped the whole tree
/// unconditionally on every launch where it decided an update was due, which
/// overwrote `www/user/`, `db/` and `files/` — i.e. it destroyed the user's
/// projects and databases. Here those subtrees are never written to.
class BundleInstaller {
  BundleInstaller({
    required this.paths,
    required this.loadAsset,
    required this.bundleVersion,
  });

  final ACeleryPaths paths;

  /// Reads the packaged zip. Production passes `rootBundle.load`; tests pass a
  /// closure over a fixture so no Flutter binding is needed.
  final Future<Uint8List> Function() loadAsset;

  /// Stamp written next to the tree. Change it to force a refresh of the
  /// shipped files on the next launch.
  final String bundleVersion;

  File get _stampFile => File('${paths.base}/.bundle-version');

  /// True when the tree is missing or was installed by a different bundle.
  Future<bool> needsInstall() async {
    if (!await Directory(paths.wwwRoot).exists()) return true;
    if (!await _stampFile.exists()) return true;
    return (await _stampFile.readAsString()).trim() != bundleVersion;
  }

  /// Installs the bundle if needed. Returns true if anything was written.
  Future<bool> installIfNeeded() async {
    if (!await needsInstall()) return false;
    await install();
    return true;
  }

  Future<void> install() async {
    final bytes = await loadAsset();
    final archive = ZipDecoder().decodeBytes(bytes);

    final destRoot = Directory(paths.root);
    await destRoot.create(recursive: true);

    for (final entry in archive) {
      final target = File(ACeleryPaths.normalize('${paths.root}/${entry.name}'));

      // Reject entries that would escape the destination ("zip slip"). The
      // same unzip path is reused for user-supplied project archives.
      if (!ACeleryPaths.isInside(destRoot, target)) {
        throw FileSystemException('Zip entry outside destination', entry.name);
      }

      if (entry.isDirectory) {
        await Directory(target.path).create(recursive: true);
        continue;
      }

      // Never clobber user-created content.
      if (_isUserData(target.path)) {
        if (await target.exists()) continue;
      }

      await target.parent.create(recursive: true);
      await target.writeAsBytes(entry.readBytes() ?? const []);
    }

    // The zip ships these as empty directories; make sure they exist even if a
    // future bundle drops them.
    for (final dir in paths.userDataRoots) {
      await Directory(dir).create(recursive: true);
    }
    await Directory(paths.cacheRoot).create(recursive: true);

    await _stampFile.writeAsString(bundleVersion);
  }

  bool _isUserData(String absolutePath) {
    final normalized = ACeleryPaths.normalize(absolutePath);
    return paths.userDataRoots.any(
      (root) => normalized.startsWith(ACeleryPaths.normalize(root)),
    );
  }
}
