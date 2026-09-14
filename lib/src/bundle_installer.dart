import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';

import 'paths.dart';

/// Unzips [bytes] into [into], refusing any entry that would land outside it.
///
/// Shared by the shipped bundle and by project import, which is the case the
/// guard actually matters for: those archives come from the user.
/// [skip] is consulted per destination file; returning true leaves the file on
/// disk untouched.
Future<void> extractArchive(
  Uint8List bytes,
  Directory into, {
  bool Function(File target)? skip,
}) async {
  final archive = ZipDecoder().decodeBytes(bytes);
  await into.create(recursive: true);

  for (final entry in archive) {
    final target = File(ACeleryPaths.normalize('${into.path}/${entry.name}'));

    if (!ACeleryPaths.isInside(into, target)) {
      throw FileSystemException('Zip entry outside destination', entry.name);
    }

    if (entry.isDirectory) {
      await Directory(target.path).create(recursive: true);
      continue;
    }

    if (skip != null && skip(target)) continue;

    await target.parent.create(recursive: true);
    await target.writeAsBytes(entry.readBytes() ?? const []);
  }
}

/// Installs the aCelery web bundle (`assets/aCelery.zip`) into the app's
/// documents directory on first run, and refreshes it when the shipped bundle
/// changes.
///
/// Ported from `aCeleryUnzip.java` + the unzip call in `ACeleryActivity`, with
/// one deliberate behaviour change: the Java version unzipped the whole tree
/// unconditionally on every launch where it decided an update was due, which
/// overwrote `www/user/`, `db/` and `files/` — i.e. it destroyed the user's
/// projects and databases.
///
/// What is preserved, precisely:
///
///  * `db/`, `files/` and `log/` hold nothing but runtime data. Existing files
///    there are never written to, full stop.
///  * `www/user/` holds both: the projects the user made, and the sample app
///    aCelery ships. A project the user created is never touched. A project
///    that came out of the zip is *shipped content* and is refreshed, because
///    the alternative is that it freezes at whatever version first installed —
///    and the sample app is the reference documentation for authors
///    (doc/js-ui-framework-evaluation.md §8 step 11), so a stale one is worse
///    than useless. Phase 4c found this the hard way: the module launcher
///    could not run an Example app still written against the 2014 loader.
///
/// A user who wants to modify the sample should copy it to a project of their
/// own; editing it in place is editing a file the next upgrade will replace.
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
    await extractArchive(
      await loadAsset(),
      Directory(paths.root),
      skip: (target) => _preserve(target),
    );

    // The zip ships these as empty directories; make sure they exist even if a
    // future bundle drops them.
    for (final dir in paths.userDataRoots) {
      await Directory(dir).create(recursive: true);
    }
    await Directory(paths.cacheRoot).create(recursive: true);

    await _stampFile.writeAsString(bundleVersion);
  }

  /// Whether an entry from the zip must leave the file already on disk alone.
  ///
  /// Only ever consulted for paths that are *in* the shipped zip, so a project
  /// the user created is out of scope by construction — nothing in the archive
  /// names it. See the class doc for the rule.
  bool _preserve(File target) {
    if (!target.existsSync()) return false;

    final normalized = ACeleryPaths.normalize(target.path);
    final userRoot = ACeleryPaths.normalize(paths.userRoot);

    // A shipped sample app is shipped content; refresh it.
    if (normalized.startsWith(userRoot)) return false;

    // Everything else under db/, files/ and log/ is the user's alone.
    return paths.userDataRoots.any(
      (root) => normalized.startsWith(ACeleryPaths.normalize(root)),
    );
  }
}
