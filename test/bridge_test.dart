@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/bridge/export_bridge.dart';
import 'package:acelery/src/bridge/file_bridge.dart';
import 'package:acelery/src/bridge/http_bridge.dart';
import 'package:acelery/src/bridge/sql_bridge.dart';
import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:archive/archive.dart';
import 'package:http/http.dart' as http;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:test/test.dart';

/// Exercises the `/android.itf` routes over real HTTP against a real SQLite
/// engine, the same way xscript.js calls them.
void main() {
  sqfliteFfiInit();

  late Directory tmp;
  late ACeleryPaths paths;
  late ACeleryServer server;
  late Uri itf;

  /// Mirrors `xInterface.getRemoteInterface` — a GET returning parsed JSON.
  Future<Map<String, dynamic>> get(String query) async {
    final response = await http.get(itf.replace(query: query));
    expect(response.statusCode, 200, reason: query);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<http.Response> raw(String query) =>
      http.get(itf.replace(query: query));

  Future<http.Response> post(String query, String body) =>
      http.post(itf.replace(query: query), body: body);

  /// xScript base64-encodes SQL with `btoa()`.
  String enc(String sql) => base64.encode(utf8.encode(sql));

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('acelery_test');
    paths = ACeleryPaths(tmp.path);
    for (final dir in [...paths.userDataRoots, paths.wwwRoot]) {
      await Directory(dir).create(recursive: true);
    }
    server = ACeleryServer(
      paths: paths,
      databaseFactory: databaseFactoryFfi,
      port: 0,
    );
    await server.start();
    // port 0 means the OS picked one; read it back off the bound socket.
    itf = Uri.parse('http://127.0.0.1:${server.boundPort}/android.itf');
  });

  tearDown(() async {
    await server.stop();
    await tmp.delete(recursive: true);
  });

  group('opt=sql', () {
    test('open, exec, insert and scroll a cursor', () async {
      final handle = (await get('opt=sql&action=opendb&path=xtest.db'))['handle'];
      expect(handle, '1');

      await get('opt=sql&action=exec&handle=$handle'
          '&query=${enc('create table person (mname string, email string)')}');

      final rowid = (await get('opt=sql&action=insert&handle=$handle'
          '&query=${enc("insert into person values ('Ada','ada@example.com')")}'))['rowid'];
      expect(rowid, '1');

      await get('opt=sql&action=insert&handle=$handle'
          '&query=${enc("insert into person values ('Grace','grace@example.com')")}');

      final cursor =
          (await get('opt=sql&action=select&handle=$handle'
              '&query=${enc('select * from person order by mname')}'))['cursor'];

      expect(
        (await get('opt=sql&action=getrowcount&cursor=$cursor'))['rowcount'],
        '2',
      );

      // The `while (resObj = db.getNextRow())` walk in example.js.
      expect(await get('opt=sql&action=getnextrow&cursor=$cursor'),
          {'mname': 'Ada', 'email': 'ada@example.com'});
      expect(await get('opt=sql&action=getnextrow&cursor=$cursor'),
          {'mname': 'Grace', 'email': 'grace@example.com'});
      // Exhausted cursors must return {} so the loop terminates.
      expect(await get('opt=sql&action=getnextrow&cursor=$cursor'), isEmpty);

      await get('opt=sql&action=closecursor&cursor=$cursor');
      await get('opt=sql&action=closedb&handle=$handle');
    });

    test('gotolastrow then getprevrow walks backwards', () async {
      final handle = (await get('opt=sql&action=opendb&path=b.db'))['handle'];
      await get('opt=sql&action=exec&handle=$handle'
          '&query=${enc('create table t (n integer)')}');
      for (final n in [1, 2, 3]) {
        await get('opt=sql&action=insert&handle=$handle'
            '&query=${enc('insert into t values ($n)')}');
      }
      final cursor = (await get('opt=sql&action=select&handle=$handle'
          '&query=${enc('select n from t order by n')}'))['cursor'];

      await get('opt=sql&action=gotolastrow&cursor=$cursor');
      expect(await get('opt=sql&action=getprevrow&cursor=$cursor'), {'n': '3'});
      expect(await get('opt=sql&action=getprevrow&cursor=$cursor'), {'n': '2'});
      expect(await get('opt=sql&action=getprevrow&cursor=$cursor'), {'n': '1'});
      expect(await get('opt=sql&action=getprevrow&cursor=$cursor'), isEmpty);
    });

    test('every column comes back as a string, NULL as empty', () async {
      final handle = (await get('opt=sql&action=opendb&path=c.db'))['handle'];
      await get('opt=sql&action=exec&handle=$handle'
          '&query=${enc('create table t (i integer, f real, s text, n text)')}');
      await get('opt=sql&action=insert&handle=$handle'
          '&query=${enc("insert into t values (42, 1.5, 'hi', null)")}');
      final cursor = (await get('opt=sql&action=select&handle=$handle'
          '&query=${enc('select * from t')}'))['cursor'];

      expect(await get('opt=sql&action=getnextrow&cursor=$cursor'),
          {'i': '42', 'f': '1.5', 's': 'hi', 'n': ''});
    });

    test('a failing statement is swallowed, not surfaced', () async {
      final handle = (await get('opt=sql&action=opendb&path=d.db'))['handle'];
      // xSqlExec logged and continued; the IDE relies on that for
      // "create table if not exists" style churn.
      await get('opt=sql&action=exec&handle=$handle'
          '&query=${enc('this is not sql')}');
    });

    test('selecting on a bad query reports an error', () async {
      final handle = (await get('opt=sql&action=opendb&path=e.db'))['handle'];
      final response = await raw('opt=sql&action=select&handle=$handle'
          '&query=${enc('select * from nope')}');
      expect(response.statusCode, 500);
    });
  });

  group('opt=file', () {
    test('open, write, read and delete a file', () async {
      final handle =
          (await get('opt=file&action=openfile&path=notes.txt'))['handle'];

      expect((await post('opt=file&action=filewrite&handle=$handle&append=false',
              'hello'))
          .statusCode, 200);
      expect((await raw('opt=file&action=fileread&handle=$handle')).body,
          'hello');

      await post(
          'opt=file&action=filewrite&handle=$handle&append=true', ' world');
      expect((await raw('opt=file&action=fileread&handle=$handle')).body,
          'hello world');

      expect(File('${paths.filesRoot}notes.txt').existsSync(), isTrue);
      await get('opt=file&action=deletefile&handle=$handle');
      expect(File('${paths.filesRoot}notes.txt').existsSync(), isFalse);
    });

    test('listfiles reports the shape launcher.html iterates', () async {
      await Directory('${paths.userRoot}Example').create(recursive: true);
      await File('${paths.userRoot}Example/example.js').writeAsString('x');
      await File('${paths.userRoot}Example/example.css').writeAsString('y');

      final response = await raw('opt=file&action=listfiles'
          '&path=Example&bpath=${Uri.encodeComponent(paths.userRoot)}');
      final entries = (jsonDecode(response.body) as List).cast<Map>();

      expect(entries, hasLength(2));
      expect(entries.map((e) => e['fname']),
          containsAll(['example.js', 'example.css']));
      expect(entries.every((e) => e['directory'] == false), isTrue);
      expect(entries.first, contains('lastmodified'));
      expect(entries.first, contains('length'));
    });

    test('listfiles on a missing directory returns the empty-object marker',
        () async {
      // xFile.listFiles checks Object.keys(resObj).length, so this exact shape
      // is what makes it return false.
      final response = await raw('opt=file&action=listfiles&path=nope');
      expect(jsonDecode(response.body), [<String, Object?>{}]);
    });

    test('mkdir creates under the files root', () async {
      await get('opt=file&action=mkdir&path=sub');
      expect(Directory('${paths.filesRoot}sub').existsSync(), isTrue);
    });

    test('getextpath returns what launcher.html concatenates onto', () async {
      expect((await get('opt=file&action=getextpath'))['extpath'], paths.root);
    });

    test('path traversal is refused', () async {
      // The Java bridge passed `path` and `bpath` to `new File()` unchecked.
      final response = await raw(
          'opt=file&action=openfile&path=${Uri.encodeComponent('../../escape')}');
      expect(response.statusCode, 500);
    });
  });

  group('opt=export', () {
    test('set then get returns the payload once', () async {
      final handle = jsonDecode((await post(
        'opt=export&action=set&mime=text/csv&fname=directory.csv',
        '"Ada","ada@example.com"\r\n',
      ))
              .body)['handle'];

      final download = await raw('opt=export&action=get&handle=$handle');
      expect(download.statusCode, 200);
      expect(download.body, '"Ada","ada@example.com"\r\n');
      expect(download.headers['content-disposition'],
          'attachment; filename="directory.csv"');

      // Consumed.
      expect((await raw('opt=export&action=get&handle=$handle')).statusCode,
          500);
    });

    test('getwv survives the first fetch and drops on the second', () async {
      final handle = jsonDecode(
              (await post('opt=export&action=set&mime=text/plain&fname=a.txt',
                      'data'))
                  .body)['handle'];

      expect((await raw('opt=export&action=getwv&handle=$handle')).statusCode,
          200);
      expect((await raw('opt=export&action=getwv&handle=$handle')).statusCode,
          200);
      expect((await raw('opt=export&action=getwv&handle=$handle')).statusCode,
          500);
    });
  });

  group('opt=exportproject', () {
    test('zips a project with flat entry names', () async {
      await Directory('${paths.userRoot}Demo').create(recursive: true);
      await File('${paths.userRoot}Demo/demo.js').writeAsString('main(){}');
      await File('${paths.userRoot}Demo/acelery_app.json')
          .writeAsString('{"name":"Demo"}');

      final response = await raw('opt=exportproject&action=export&project=Demo');
      expect(response.statusCode, 200);
      expect(response.headers['content-disposition'],
          'attachment; filename="Demo.zip"');

      final names =
          ZipDecoder().decodeBytes(response.bodyBytes).map((e) => e.name);
      // aCeleryZip.java stored bare filenames, so imports stay compatible.
      expect(names, containsAll(['demo.js', 'acelery_app.json']));
      expect(names.any((n) => n.contains('Demo/')), isFalse);

      // The temp zip must not be left behind.
      expect(Directory(paths.cacheRoot).listSync(), isEmpty);
    });

    test('a traversing project name is refused', () async {
      final response = await raw('opt=exportproject&action=export'
          '&project=${Uri.encodeComponent('../../..')}');
      expect(response.statusCode, 500);
    });
  });

  group('dispatch', () {
    test('unknown opt and action are bad requests', () async {
      expect((await raw('opt=nope&action=get')).statusCode, 400);
      expect((await raw('opt=sql&action=nope')).statusCode, 400);
      expect((await raw('opt=sql')).statusCode, 400);
    });

    test('bridge responses are never cached', () async {
      final response = await raw('opt=file&action=getextpath');
      expect(response.headers['cache-control'], contains('no-cache'));
    });
  });

  group('static files', () {
    test('the www tree is served', () async {
      await File('${paths.wwwRoot}index.html').writeAsString('<html>hi</html>');
      final response =
          await http.get(Uri.parse('http://127.0.0.1:${server.boundPort}/index.html'));
      expect(response.statusCode, 200);
      expect(response.body, '<html>hi</html>');
    });
  });

  group('SqlBridge directly', () {
    test('a cursor starts on the first row, as after Cursor.moveToFirst',
        () async {
      final bridge =
          SqlBridge(paths: paths, factory: databaseFactoryFfi);
      final db = await bridge.openDb('direct.db', null);
      await bridge.exec(db, 'create table t (n integer)');
      await bridge.insert(db, 'insert into t values (7)');
      final cursor = await bridge.select(db, 'select n from t');

      expect(bridge.rowCount(cursor), 1);
      expect(bridge.nextRow(cursor), {'n': '7'});
      expect(bridge.nextRow(cursor), isNull);
      await bridge.dispose();
    });

    test('opening an unopenable database returns -1', () async {
      final bridge = SqlBridge(paths: paths, factory: databaseFactoryFfi);
      expect(await bridge.openDb('/nonexistent-dir/x.db', '/nonexistent-dir/'),
          -1);
    });
  });

  group('FileBridge directly', () {
    test('reading an unknown handle yields an empty string', () {
      final bridge = FileBridge(paths: paths);
      expect(bridge.read(999), '');
      expect(bridge.delete(999), isFalse);
    });
  });

  group('HttpBridge', () {
    test('a failed request yields an empty string, not an exception', () async {
      final bridge = HttpBridge();
      expect(await bridge.get('http://127.0.0.1:1/nope'), '');
      bridge.dispose();
    });
  });

  group('ExportBridge', () {
    test('handles are never reused', () {
      final bridge = ExportBridge(paths: paths);
      final a = bridge.set('text/plain', 'a', '1');
      bridge.remove(a);
      final b = bridge.set('text/plain', 'b', '2');
      expect(b, isNot(a));
    });
  });
}
