@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:acelery/src/bundle_installer.dart';
import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:http/http.dart' as http;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:test/test.dart';

/// Installs the real bundle, starts the real server, and drives it the way the
/// shipped JavaScript does.
void main() {
  sqfliteFfiInit();

  late Directory tmp;
  late ACeleryPaths paths;
  late ACeleryServer server;
  late String origin;

  setUpAll(() async {
    tmp = await Directory.systemTemp.createTemp('acelery_e2e');
    paths = ACeleryPaths(tmp.path);

    await BundleInstaller(
      paths: paths,
      bundleVersion: 'test',
      loadAsset: () async =>
          Uint8List.fromList(await File('assets/aCelery.zip').readAsBytes()),
    ).install();

    server = ACeleryServer(
      paths: paths,
      databaseFactory: databaseFactoryFfi,
      port: 0,
    );
    await server.start();
    origin = 'http://127.0.0.1:${server.boundPort}';
  });

  tearDownAll(() async {
    await server.stop();
    await tmp.delete(recursive: true);
  });

  group('the bundle is served', () {
    test('/ redirects into the IDE', () async {
      final response = await http.get(Uri.parse('$origin/'));
      expect(response.statusCode, 200);
      expect(response.body, contains('/system/index.html'));
    });

    test('the IDE page and its script tags resolve', () async {
      final page = await http.get(Uri.parse('$origin/system/index.html'));
      expect(page.statusCode, 200);

      final srcs = RegExp(r'src="(/[^"]+)"')
          .allMatches(page.body)
          .map((m) => m.group(1)!)
          .toSet();
      expect(srcs, isNotEmpty);

      for (final src in srcs) {
        final asset = await http.get(Uri.parse('$origin$src'));
        expect(asset.statusCode, 200, reason: src);
      }
    });

    test('the stylesheets resolve', () async {
      final page = await http.get(Uri.parse('$origin/system/index.html'));
      final hrefs = RegExp(r'href="(/[^"]+)"')
          .allMatches(page.body)
          .map((m) => m.group(1)!)
          .toSet();

      for (final href in hrefs) {
        expect((await http.get(Uri.parse('$origin$href'))).statusCode, 200,
            reason: href);
      }
    });

    test('xscript.js is served and still takes the HTTP bridge path', () async {
      final js = await http.get(Uri.parse('$origin/tools/js/xscript.js'));
      expect(js.statusCode, 200);
      // The port depends on this fallback existing; see plan §2.
      expect(js.body, contains('/android.itf?'));
      expect(js.body, contains(r'typeof Android != "undefined"'));
    });

    test('a path outside the document root is not served', () async {
      final response = await http.get(Uri.parse('$origin/../../secret'));
      expect(response.statusCode, isNot(200));
    });
  });

  group('launcher.html can discover a user app', () {
    test('listFiles returns the app folder contents it LazyLoads', () async {
      // Exactly what launcher.html builds: getExtStoragePath() + the suffix.
      final extpath = jsonDecode((await http.get(Uri.parse(
              '$origin/android.itf?opt=file&action=getextpath')))
          .body)['extpath'] as String;
      final base = '$extpath/aCelery/www/user/';

      final response = await http.get(Uri.parse(
          '$origin/android.itf?opt=file&action=listfiles'
          '&path=Example&bpath=${Uri.encodeComponent(base)}'));
      final entries = (jsonDecode(response.body) as List).cast<Map>();

      final scripts = entries
          .where((e) => e['directory'] == false)
          .map((e) => e['fname'] as String)
          .toList();
      expect(scripts, contains('example.js'));
      expect(scripts, contains('example.css'));

      // Those are the URLs launcher.html then asks LazyLoad to fetch.
      for (final name in scripts.where((n) => n.endsWith('.js'))) {
        expect((await http.get(Uri.parse('$origin/user/Example/$name')))
            .statusCode, 200);
      }
    });
  });

  group("the Example app's own database flow", () {
    test('initDB, insert and the dirExport select all work', () async {
      Future<Map<String, dynamic>> itf(String query) async => jsonDecode(
          (await http.get(Uri.parse('$origin/android.itf?$query'))).body);
      String enc(String sql) => base64.encode(utf8.encode(sql));

      // initDB()
      final db = (await itf('opt=sql&action=opendb&path=xtest.db'))['handle'];
      await itf('opt=sql&action=exec&handle=$db&query='
          '${enc('create table if not exists person (mname string, email string, grp string)')}');
      await itf('opt=sql&action=exec&handle=$db&query='
          '${enc('create table if not exists person_tel (person integer, tel string, type string)')}');

      // What xbTableMaint writes when the user saves a row.
      final rowid = (await itf('opt=sql&action=insert&handle=$db&query='
          "${enc("insert into person (mname,email,grp) values ('Ada','ada@example.com','w')")}"))['rowid'];
      await itf('opt=sql&action=insert&handle=$db&query='
          "${enc("insert into person_tel (person,tel,type) values ($rowid,'555-0100','m')")}");

      // dirExport()'s join, walked with the getNextRow loop.
      final cursor = (await itf('opt=sql&action=select&handle=$db&query='
          '${enc('select a.rowid, a.*, b.rowid, b.* from person as a, person_tel as b '
              'where b.person = a.rowid order by a.mname')}'))['cursor'];

      final rows = <Map<String, dynamic>>[];
      while (true) {
        final row = await itf('opt=sql&action=getnextrow&cursor=$cursor');
        if (row.isEmpty) break;
        rows.add(row);
      }

      expect(rows, hasLength(1));
      expect(rows.single['mname'], 'Ada');
      expect(rows.single['tel'], '555-0100');
      // Every value arrives as a string, which is what the CSV builder assumes.
      expect(rows.single.values.every((v) => v is String), isTrue);

      // The file that dirExport() then hands to xExportFile.
      final csv = rows
          .map((r) => r.values.map((v) => '"$v"').join(','))
          .join('\r\n');
      final handle = jsonDecode((await http.post(
        Uri.parse('$origin/android.itf?opt=export&action=set'
            '&mime=text/csv&fname=directory.csv'),
        body: csv,
      ))
              .body)['handle'];

      final download = await http.get(Uri.parse(
          '$origin/android.itf?opt=export&action=get&handle=$handle'));
      expect(download.statusCode, 200);
      expect(download.body, contains('"Ada"'));
      expect(download.headers['content-disposition'],
          'attachment; filename="directory.csv"');
    });
  });

  group('a project round-trips through export', () {
    test('exported entries match what the importer expects', () async {
      final response = await http.get(Uri.parse(
          '$origin/android.itf?opt=exportproject&action=export&project=Example'));
      expect(response.statusCode, 200);
      expect(response.bodyBytes, isNotEmpty);
      expect(response.headers['content-disposition'],
          'attachment; filename="Example.zip"');
    });
  });
}
