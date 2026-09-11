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

  test('a reinstall never touches user projects, databases or files', () async {
    await installer().install();

    // Stand in for what a user creates through the IDE.
    final project = File('${paths.userRoot}MyApp/main.js');
    await project.parent.create(recursive: true);
    await project.writeAsString('function main(){}');
    final database = File('${paths.dbRoot}mydata.db');
    await database.writeAsString('sqlite bytes');
    final userFile = File('${paths.filesRoot}notes.txt');
    await userFile.writeAsString('notes');

    // The shipped Example app is user-editable too, so an upgrade must not
    // revert edits to it. aCeleryUnzip.java overwrote all of this.
    final example = File('${paths.userRoot}Example/example.js');
    await example.writeAsString('// edited by the user');

    expect(await installer(version: '2.0.0').installIfNeeded(), isTrue);

    expect(await project.readAsString(), 'function main(){}');
    expect(await database.readAsString(), 'sqlite bytes');
    expect(await userFile.readAsString(), 'notes');
    expect(await example.readAsString(), '// edited by the user');
  });

  test('a missing user file is restored on reinstall', () async {
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
