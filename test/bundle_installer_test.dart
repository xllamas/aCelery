@TestOn('vm')
library;

import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';

import 'package:acelery/src/bundle_installer.dart';
import 'package:acelery/src/paths.dart';
import 'package:test/test.dart';

/// Runs against the real `assets/aCelery.zip`, so the layout assertions track
/// the shipped bundle rather than a fixture.
void main() {
  late Directory tmp;
  late ACeleryPaths paths;

  Future<Uint8List> loadBundle() => File('assets/aCelery.zip').readAsBytes();

  BundleInstaller installer({String version = '1.0.5'}) => BundleInstaller(
        paths: paths,
        loadAsset: loadBundle,
        bundleVersion: version,
      );

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('acelery_bundle');
    paths = ACeleryPaths(tmp.path);
  });

  tearDown(() => tmp.delete(recursive: true));

  test('installs the tree the server expects to serve', () async {
    expect(await installer().needsInstall(), isTrue);
    expect(await installer().installIfNeeded(), isTrue);

    expect(File('${paths.wwwRoot}index.html').existsSync(), isTrue);
    expect(File('${paths.wwwRoot}system/index.html').existsSync(), isTrue);
    expect(File('${paths.wwwRoot}system/launcher.html').existsSync(), isTrue);
    expect(File('${paths.wwwRoot}tools/js/xscript.js').existsSync(), isTrue);
    expect(
        File('${paths.userRoot}Example/acelery_app.json').existsSync(), isTrue);

    // The zip ships these empty; the bridge writes into them at runtime.
    for (final dir in paths.userDataRoots) {
      expect(Directory(dir).existsSync(), isTrue, reason: dir);
    }
  });

  test('a second run is a no-op', () async {
    await installer().install();
    expect(await installer().needsInstall(), isFalse);
    expect(await installer().installIfNeeded(), isFalse);
  });

  test('a version bump reinstalls the shipped files', () async {
    await installer().install();

    final shipped = File('${paths.wwwRoot}tools/js/xscript.js');
    await shipped.writeAsString('tampered');

    expect(await installer(version: '1.0.6').installIfNeeded(), isTrue);
    expect(await shipped.readAsString(), isNot('tampered'));
  });

  test('a reinstall never touches what the user made', () async {
    await installer().install();

    // Stand in for what a user creates through the IDE. Nothing in the shipped
    // zip names any of these, so the installer never even considers them.
    final project = File('${paths.userRoot}MyApp/main.js');
    await project.parent.create(recursive: true);
    await project.writeAsString('function main(){}');
    final database = File('${paths.dbRoot}mydata.db');
    await database.writeAsString('sqlite bytes');
    final userFile = File('${paths.filesRoot}notes.txt');
    await userFile.writeAsString('notes');
    final log = File('${paths.logRoot}session.log');
    await log.parent.create(recursive: true);
    await log.writeAsString('log lines');

    expect(await installer(version: '2.0.0').installIfNeeded(), isTrue);

    expect(await project.readAsString(), 'function main(){}');
    expect(await database.readAsString(), 'sqlite bytes');
    expect(await userFile.readAsString(), 'notes');
    expect(await log.readAsString(), 'log lines');
  });

  test('a reinstall refreshes the shipped sample app', () async {
    // Changed in Phase 4c. Treating the sample as user data froze it at
    // whatever version first installed: a device that had ever launched
    // aCelery kept a 2014-style Example that the module launcher cannot run,
    // and Phase 4d's rewrite of it would never have arrived either. It is
    // shipped content; a user who wants to change it copies it first.
    await installer().install();

    final example = File('${paths.userRoot}Example/example.js');
    await example.writeAsString('// stale, from an older bundle');

    expect(await installer(version: '2.0.0').installIfNeeded(), isTrue);
    expect(await example.readAsString(), isNot(contains('stale')));
  });

  test('refreshing the sample leaves a neighbouring project alone', () async {
    // The two live in the same directory, so the rule has to separate them by
    // what is in the zip, not by where the file sits.
    await installer().install();

    final mine = File('${paths.userRoot}Example2/example.js');
    await mine.parent.create(recursive: true);
    await mine.writeAsString('// mine, not shipped');

    await installer(version: '2.0.0').installIfNeeded();
    expect(await mine.readAsString(), '// mine, not shipped');
  });

  test('a deleted shipped file is restored on reinstall', () async {
    await installer().install();
    await File('${paths.userRoot}Example/example.js').delete();

    await installer(version: '2.0.0').installIfNeeded();
    expect(File('${paths.userRoot}Example/example.js').existsSync(), isTrue);
  });

  test('a traversing zip entry is rejected', () async {
    // Guards xImportProject, which unzips user-supplied archives.
    final malicious = BundleInstaller(
      paths: paths,
      bundleVersion: 'evil',
      loadAsset: () async => _zipWith('../../escaped.txt'),
    );
    await expectLater(malicious.install(), throwsA(isA<FileSystemException>()));
    expect(File('${tmp.parent.path}/escaped.txt').existsSync(), isFalse);
  });
}

/// A minimal zip containing a single entry at [name].
Uint8List _zipWith(String name) {
  final encoder = ZipEncoderShim();
  return encoder.encode(name, 'pwned');
}

class ZipEncoderShim {
  Uint8List encode(String name, String content) {
    final archive = Archive()..add(ArchiveFile.string(name, content));
    return Uint8List.fromList(ZipEncoder().encode(archive));
  }
}
