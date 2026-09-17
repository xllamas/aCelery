@TestOn('vm')
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:acelery/src/bridge/export_bridge.dart';
import 'package:acelery/src/bridge/file_bridge.dart';
import 'package:acelery/src/bridge/http_bridge.dart';
import 'package:acelery/src/bridge/sql_bridge.dart';
import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:archive/archive.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
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

  /// Mirrors the Phase 4b async bridge: POST a JSON body, get JSON back.
  Future<http.Response> postJson(String query, Map<String, Object?> body) =>
      http.post(
        itf.replace(query: query),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

  Future<Map<String, dynamic>> callJson(
      String query, Map<String, Object?> body) async {
    final response = await postJson(query, body);
    expect(response.statusCode, 200, reason: '$query ${response.body}');
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

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

    test('two handles on one file are independent', () async {
      // The shell writes a setting to acelery.db while the Data screen may
      // have acelery.db open. With sqflite's shared instance per path, the
      // settings write's closedb closed the other handle too, and its next
      // query failed.
      final first =
          (await get('opt=sql&action=opendb&path=shared.db'))['handle'] as String;
      final second =
          (await get('opt=sql&action=opendb&path=shared.db'))['handle'] as String;
      expect(first, isNot(second));

      await callJson('opt=sql&action=run', {
        'handle': int.parse(first),
        'sql': 'create table t (n integer)',
        'args': <Object?>[],
      });
      await get('opt=sql&action=closedb&handle=$first');

      final result = await callJson('opt=sql&action=query', {
        'handle': int.parse(second),
        'sql': 'select count(*) as n from t',
        'args': <Object?>[],
      });
      expect(result['rows'], [
        {'n': 0},
      ]);
      await get('opt=sql&action=closedb&handle=$second');
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

  group('opt=sql — the Phase 4b async routes', () {
    // These replace the cursor protocol: one round-trip per statement instead
    // of one per row, and bound parameters instead of concatenated SQL.
    // See doc/js-ui-framework-evaluation.md §3.3.

    Future<String> openDb() async =>
        (await get('opt=sql&action=opendb&path=async.db'))['handle'] as String;

    test('query returns the whole result set in one call', () async {
      final handle = await openDb();
      await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'create table person (mname text, age integer)',
      });
      for (final (name, age) in [('Ada', 36), ('Grace', 45), ('Alan', 41)]) {
        await callJson('opt=sql&action=insertrow', {
          'handle': handle,
          'sql': 'insert into person values (?, ?)',
          'args': [name, age],
        });
      }

      final rows = (await callJson('opt=sql&action=query', {
        'handle': handle,
        'sql': 'select * from person order by mname',
      }))['rows'] as List;

      expect(rows, hasLength(3));
      expect(rows.map((r) => r['mname']), ['Ada', 'Alan', 'Grace']);
    });

    test('columns keep their SQLite types', () async {
      // The cursor routes stringify every column because android.database
      // .Cursor did. Nothing carries that contract into the async API.
      final handle = await openDb();
      await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'create table t (n integer, x real, s text, z text)',
      });
      await callJson('opt=sql&action=insertrow', {
        'handle': handle,
        'sql': 'insert into t values (?, ?, ?, ?)',
        'args': [7, 1.5, 'seven', null],
      });

      final rows = (await callJson(
          'opt=sql&action=query', {'handle': handle, 'sql': 'select * from t'}))['rows'] as List;
      expect(rows.single['n'], 7);
      expect(rows.single['x'], 1.5);
      expect(rows.single['s'], 'seven');
      expect(rows.single['z'], isNull);
    });

    test('arguments are bound, not interpolated', () async {
      // The whole point of the route: a value containing a quote is data.
      final handle = await openDb();
      await callJson('opt=sql&action=run',
          {'handle': handle, 'sql': 'create table t (v text)'});

      const nasty = "Robert'); drop table t;--";
      await callJson('opt=sql&action=insertrow',
          {'handle': handle, 'sql': 'insert into t values (?)', 'args': [nasty]});

      final rows = (await callJson('opt=sql&action=query',
          {'handle': handle, 'sql': 'select v from t'}))['rows'] as List;
      expect(rows.single['v'], nasty);
    });

    test('run reports how many rows it changed', () async {
      final handle = await openDb();
      await callJson('opt=sql&action=run',
          {'handle': handle, 'sql': 'create table t (v integer)'});
      for (final v in [1, 2, 3]) {
        await callJson('opt=sql&action=insertrow',
            {'handle': handle, 'sql': 'insert into t values (?)', 'args': [v]});
      }

      final changed = (await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'update t set v = v + 1 where v > ?',
        'args': [1],
      }))['changes'];
      expect(changed, 2);
    });

    test('insertrow returns the new rowid', () async {
      final handle = await openDb();
      await callJson('opt=sql&action=run',
          {'handle': handle, 'sql': 'create table t (v text)'});
      final first = (await callJson('opt=sql&action=insertrow',
          {'handle': handle, 'sql': "insert into t values ('a')"}))['rowid'];
      final second = (await callJson('opt=sql&action=insertrow',
          {'handle': handle, 'sql': "insert into t values ('b')"}))['rowid'];
      expect(first, 1);
      expect(second, 2);
    });

    test('a booleans binds as SQLite stores it', () async {
      final handle = await openDb();
      await callJson('opt=sql&action=run',
          {'handle': handle, 'sql': 'create table t (done integer)'});
      await callJson('opt=sql&action=insertrow', {
        'handle': handle,
        'sql': 'insert into t values (?)',
        'args': [true],
      });
      final rows = (await callJson('opt=sql&action=query',
          {'handle': handle, 'sql': 'select done from t'}))['rows'] as List;
      expect(rows.single['done'], 1);
    });

    test('a bad statement comes back with its message', () async {
      // The cursor routes swallow this and return -1. An app author debugging
      // a typo needs to read what SQLite said.
      final handle = await openDb();
      final response = await postJson('opt=sql&action=query',
          {'handle': handle, 'sql': 'select * from nope'});
      expect(response.statusCode, 500);
      expect(jsonDecode(response.body)['error'], contains('nope'));
    });

    test('an unknown database handle is an error, not an empty result', () {
      return expectLater(
        postJson('opt=sql&action=query', {'handle': 999, 'sql': 'select 1'})
            .then((r) => r.statusCode),
        completion(500),
      );
    });

    test('a malformed body is a bad request', () async {
      expect((await postJson('opt=sql&action=query', {'sql': 'select 1'}))
          .statusCode, 400);
      expect((await postJson('opt=sql&action=query', {'handle': 1})).statusCode,
          400);
      expect(
        (await http.post(itf.replace(query: 'opt=sql&action=query'),
                body: 'not json'))
            .statusCode,
        400,
      );
    });

    test('the async routes never cache', () async {
      final handle = await openDb();
      await callJson('opt=sql&action=run',
          {'handle': handle, 'sql': 'create table t (v integer)'});
      final response = await postJson(
          'opt=sql&action=query', {'handle': handle, 'sql': 'select * from t'});
      expect(response.headers['cache-control'], contains('no-cache'));
    });
  });

  group('the SQL TableMaint emits is valid against real SQLite', () {
    // web/test/table_maint.test.js pins which statements the component sends,
    // against a stub. This pins that those statements actually run — the two
    // halves of the same contract, and neither is sufficient alone. Phase 3
    // shipped a break of exactly this shape: each side checked, the seam not.

    late String handle;

    setUp(() async {
      handle = (await get('opt=sql&action=opendb&path=tm.db'))['handle']
          as String;
      await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'create table person (mname text, email text, age integer)',
      });
      await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'create table phone (person integer, number text)',
      });
      for (final (name, mail, age) in [
        ('Ada', 'ada@example.com', 36),
        ('Grace', 'grace@example.com', 45),
        ('Alan', 'alan@example.com', 41),
      ]) {
        await callJson('opt=sql&action=insertrow', {
          'handle': handle,
          'sql': 'insert into person (mname, email, age) values (?, ?, ?)',
          'args': [name, mail, age],
        });
      }
    });

    Future<List> select(String sql, [List<Object?> args = const []]) async =>
        (await callJson(
            'opt=sql&action=query', {'handle': handle, 'sql': sql, 'args': args}))['rows'] as List;

    test('the list page query runs and pages by rowid', () async {
      final first = await select(
          'select rowid, * from person where rowid >= ? order by rowid asc limit 2',
          [0]);
      expect(first, hasLength(2));
      expect(first.first['mname'], 'Ada');

      final next = await select(
          'select rowid, * from person where rowid >= ? order by rowid asc limit 2',
          [(first.last['rowid'] as int) + 1]);
      expect(next.single['mname'], 'Alan');
    });

    test('paging backwards reverses, as the Prev button does', () async {
      final back = await select(
          'select rowid, * from person where rowid <= ? order by rowid desc limit 2',
          [3]);
      expect(back.map((r) => r['mname']), ['Alan', 'Grace']);
    });

    test('the record query binds its rowid', () async {
      final row = await select('select rowid, * from person where rowid = ?', [2]);
      expect(row.single['mname'], 'Grace');
    });

    test('a prefix search matches, and cannot be escaped', () async {
      expect(await select('select rowid, * from person where ((mname like ?))', ['A%']),
          hasLength(2));

      // A value that would close the quote in a concatenated statement.
      final nasty = await select(
          'select rowid, * from person where ((mname like ?))', ["A%' or '1'='1"]);
      expect(nasty, isEmpty, reason: 'the argument was treated as data');
    });

    test('a numeric range search runs — the query that never worked', () async {
      // xbTableMaint.findResult interpolated `fld.getName`, the function
      // object, so the statement it built was not valid SQL at all.
      final rows = await select(
          'select rowid, * from person where ((age >= ? and age <= ?))', [40, 46]);
      expect(rows.map((r) => r['mname']), ['Grace', 'Alan']);
    });

    test('insert, update and delete round-trip with placeholders', () async {
      final rowid = (await callJson('opt=sql&action=insertrow', {
        'handle': handle,
        'sql': 'insert into person (mname, email, age) values (?, ?, ?)',
        'args': ['Edsger', 'e@example.com', 72],
      }))['rowid'];

      await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'update person set mname = ?, email = ?, age = ? where rowid = ?',
        'args': ['Edsger D', 'e@example.com', 72, rowid],
      });
      expect(
        (await select('select mname from person where rowid = ?', [rowid]))
            .single['mname'],
        'Edsger D',
      );

      await callJson('opt=sql&action=run', {
        'handle': handle,
        'sql': 'delete from person where rowid = ?',
        'args': [rowid],
      });
      expect(await select('select rowid from person where rowid = ?', [rowid]),
          isEmpty);
    });

    test('a linked table filters by its link column', () async {
      await callJson('opt=sql&action=insertrow', {
        'handle': handle,
        'sql': 'insert into phone (person, number) values (?, ?)',
        'args': [1, '555'],
      });
      final rows = await select(
          'select rowid, * from phone where person = ? and rowid >= ? '
          'order by rowid asc',
          [1, 0]);
      expect(rows.single['number'], '555');
    });

    test('a null binds as NULL, not as the string "null"', () async {
      final rowid = (await callJson('opt=sql&action=insertrow', {
        'handle': handle,
        'sql': 'insert into person (mname, email, age) values (?, ?, ?)',
        'args': ['Nulls', 'n@example.com', null],
      }))['rowid'];
      final row = await select('select age from person where rowid = ?', [rowid]);
      expect(row.single['age'], isNull);
      expect(await select('select rowid from person where age is null'),
          hasLength(1));
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

  group('opt=file — binary upload and raw read', () {
    /// Every byte value, so an encoding step anywhere would show.
    final bytes = List<int>.generate(1024, (i) => i % 256);

    Future<http.Response> upload(String query, List<int> body) =>
        http.post(itf.replace(query: 'opt=file&action=upload&$query'),
            body: body);

    test('bytes go in and come back unchanged, with a content type', () async {
      final path = Uri.encodeComponent('Garden/photos/rose 1.png');
      final response = await upload('path=$path', bytes);
      expect(response.statusCode, 200, reason: response.body);
      expect(jsonDecode(response.body), {'size': 1024});
      expect(File('${paths.filesRoot}Garden/photos/rose 1.png').readAsBytesSync(),
          bytes, reason: 'folders are created, the name is kept');

      final read = await raw('opt=file&action=raw&path=$path');
      expect(read.statusCode, 200);
      expect(read.bodyBytes, bytes);
      expect(read.headers['content-type'], 'image/png');
      expect(read.headers['cache-control'], contains('no-cache'));
    });

    test('an upload replaces the file, and leaves no .part behind', () async {
      await upload('path=a.jpg', [1, 2, 3]);
      await upload('path=a.jpg', [4, 5]);
      expect(File('${paths.filesRoot}a.jpg').readAsBytesSync(), [4, 5]);
      expect(File('${paths.filesRoot}a.jpg.part').existsSync(), isFalse);
      expect((await raw('opt=file&action=raw&path=a.jpg'))
          .headers['content-type'], 'image/jpeg');
    });

    test('bpath works as for the other file routes', () async {
      final bpath = Uri.encodeComponent(paths.userRoot);
      expect((await upload('path=App/icon.webp&bpath=$bpath', bytes)).statusCode,
          200);
      expect(File('${paths.userRoot}App/icon.webp').existsSync(), isTrue);
      expect((await raw('opt=file&action=raw&path=App/icon.webp&bpath=$bpath'))
          .bodyBytes, bytes);
    });

    test('outside the tree is refused both ways', () async {
      final escape = Uri.encodeComponent('../../escape.png');
      final written = await upload('path=$escape', bytes);
      expect(written.statusCode, 500);
      expect(jsonDecode(written.body)['error'], contains('Cannot write'));
      expect(File(p.join(tmp.path, 'escape.png')).existsSync(), isFalse,
          reason: 'files/../../ is the folder above the aCelery tree');

      await File(p.join(tmp.path, 'outside.txt')).writeAsString('secret');
      final read = await raw('opt=file&action=raw'
          '&path=${Uri.encodeComponent('../../outside.txt')}');
      expect(read.statusCode, 404);
      expect(read.body, isNot(contains('secret')));
    });

    test('a directory is neither overwritten nor served', () async {
      await Directory('${paths.filesRoot}photos').create();
      expect((await upload('path=photos', bytes)).statusCode, 500);
      expect(Directory('${paths.filesRoot}photos').existsSync(), isTrue);
      expect((await raw('opt=file&action=raw&path=photos')).statusCode, 404);
      expect((await raw('opt=file&action=raw&path=missing.png')).statusCode, 404);
    });

    test('upload must be a POST', () async {
      expect((await raw('opt=file&action=upload&path=x.png')).statusCode, 400);
    });

    test('a body over the limit is refused with 413, and nothing is written',
        () async {
      final response = await upload(
          'path=big.bin', Uint8List(FileBridge.maxUploadBytes + 1));
      expect(response.statusCode, 413);
      expect(jsonDecode(response.body)['error'], contains('25 MB'));
      expect(File('${paths.filesRoot}big.bin').existsSync(), isFalse);
    });

    test('a stream that turns out too large stops, and leaves the old file',
        () async {
      // No Content-Length to refuse up front: counted as it arrives.
      final bridge = FileBridge(paths: paths);
      await File('${paths.filesRoot}keep.bin').writeAsBytes([9]);
      final result = await bridge.upload(
        'keep.bin',
        null,
        Stream.fromIterable([List.filled(60, 1), List.filled(60, 2)]),
        maxBytes: 100,
      );
      expect(result, isA<UploadTooLarge>());
      expect(File('${paths.filesRoot}keep.bin').readAsBytesSync(), [9]);
      expect(File('${paths.filesRoot}keep.bin.part').existsSync(), isFalse);
    });

    test('a client that goes away mid-body leaves nothing behind', () async {
      final bridge = FileBridge(paths: paths);
      final body = StreamController<List<int>>();
      final result = bridge.upload('cut.bin', null, body.stream);
      body.add([1, 2, 3]);
      body.addError(const HttpException('Connection closed while receiving data'));
      await body.close();
      expect(await result, isA<UploadFailed>());
      expect(File('${paths.filesRoot}cut.bin').existsSync(), isFalse);
      expect(File('${paths.filesRoot}cut.bin.part').existsSync(), isFalse);
    });
  });

  group('confinement', () {
    // FileBridge checked every path against the aCelery tree from the start.
    // SqlBridge did not: `opendb` and `deletedb` reached anywhere the process
    // could write, which a paired device on the network — an MCP server, say —
    // could use to delete files outside aCelery (doc/mcp-server.md §6, S1).
    test('opendb refuses a path that leaves the tree', () async {
      final response = await raw('opt=sql&action=opendb'
          '&path=${Uri.encodeComponent('../../escape.db')}');
      expect(response.statusCode, 500);
      expect(File('${tmp.path}/escape.db').existsSync(), isFalse);
    });

    test('opendb refuses a base path outside the tree', () async {
      final response = await raw('opt=sql&action=opendb&path=escape.db'
          '&bpath=${Uri.encodeComponent('${tmp.path}/')}');
      expect(response.statusCode, 500);
      expect(File('${tmp.path}/escape.db').existsSync(), isFalse);
    });

    test('deletedb refuses a path that leaves the tree', () async {
      final victim = File('${tmp.path}/victim.db')..writeAsStringSync('keep');
      final response = await raw('opt=sql&action=deletedb'
          '&path=${Uri.encodeComponent('../../victim.db')}');
      expect(response.statusCode, 500);
      expect(victim.existsSync(), isTrue);
    });

    test('a database inside the tree still opens by base path', () async {
      // Apps pass bpath; confining it must not break them.
      final response = await raw('opt=sql&action=opendb&path=inside.db'
          '&bpath=${Uri.encodeComponent(paths.filesRoot)}');
      expect(response.statusCode, 200);
    });

    test('the access store cannot be reached through the file routes',
        () async {
      // It holds every paired device's bearer token (§6, S2). Serving is not
      // the only way out of the tree: opt=file reads anything inside it.
      await server.access.setShared(false); // writes the store
      final store = server.access.storeFile;
      expect(store.existsSync(), isTrue);

      final relative = p.relative(store.path, from: paths.filesRoot);
      final byPath = await raw('opt=file&action=openfile'
          '&path=${Uri.encodeComponent(relative)}');
      expect(byPath.statusCode, 500, reason: 'path=$relative');

      final byBase = await raw('opt=file&action=openfile'
          '&path=${Uri.encodeComponent(p.basename(store.path))}'
          '&bpath=${Uri.encodeComponent(store.parent.path)}');
      expect(byBase.statusCode, 500, reason: 'bpath=${store.parent.path}');
    });
  });

  group('confinement: SQL that names a file', () {
    // ATTACH and VACUUM INTO take a path inside the statement, which the path
    // checks on opendb never see. `attach database '<anywhere>' as o` and then
    // `create table o.t` created a database outside the tree — S1 again, one
    // layer down. Every route that runs SQL is covered, because a page can
    // reach all of them.
    late String outside;
    late String handle;

    setUp(() async {
      outside = '${tmp.path}/outside.db';
      handle = (await get('opt=sql&action=opendb&path=x.db'))['handle'] as String;
    });

    Future<http.Response> run(String action, String sql) =>
        postJson('opt=sql&action=$action',
            {'handle': int.parse(handle), 'sql': sql, 'args': <Object?>[]});

    for (final action in ['run', 'query', 'insertrow']) {
      test('$action refuses ATTACH, with a message', () async {
        final response = await run(action, "attach database '$outside' as o");
        expect(response.statusCode, 500);
        expect(response.body, contains('ATTACH'));
        await run('run', 'create table o.t (a)');
        expect(File(outside).existsSync(), isFalse);
      });
    }

    test('run refuses VACUUM INTO', () async {
      await run('run', 'create table t (a)');
      final response = await run('run', "vacuum into '$outside'");
      expect(response.statusCode, 500);
      expect(File(outside).existsSync(), isFalse);
    });

    test('the cursor routes refuse it too', () async {
      await raw('opt=sql&action=exec&handle=$handle'
          '&query=${enc("attach database '$outside' as o")}');
      await raw('opt=sql&action=exec&handle=$handle'
          '&query=${enc('create table o.t (a)')}');
      expect(File(outside).existsSync(), isFalse, reason: 'exec');

      final insert = await get('opt=sql&action=insert&handle=$handle'
          '&query=${enc("attach '$outside' as o")}');
      expect(insert['rowid'], '-1');

      final select = await raw('opt=sql&action=select&handle=$handle'
          '&query=${enc("attach '$outside' as o")}');
      expect(select.statusCode, 500);
      expect(File(outside).existsSync(), isFalse);
    });

    test('a value or a name that says attach is still fine', () async {
      await run('run', 'create table notes (body text, attachment text)');
      final response = await run('run',
          "insert into notes (body, attachment) values ('attach the file', '')");
      expect(response.statusCode, 200, reason: response.body);
    });
  });

  group('opt=sql — read-only handles', () {
    // What an MCP server's query tool opens, so that "look at the data" cannot
    // change it (§6, S3).
    test('a read-only handle reads but cannot write', () async {
      final rw = (await get('opt=sql&action=opendb&path=ro.db'))['handle'];
      await callJson('opt=sql&action=run',
          {'handle': rw, 'sql': 'create table t (x integer)'});
      await callJson('opt=sql&action=insertrow',
          {'handle': rw, 'sql': 'insert into t values (?)', 'args': [1]});
      await get('opt=sql&action=closedb&handle=$rw');

      final ro = (await get(
          'opt=sql&action=opendb&path=ro.db&readonly=true'))['handle'];
      final read = await callJson(
          'opt=sql&action=query', {'handle': ro, 'sql': 'select x from t'});
      expect(read['rows'], [
        {'x': 1}
      ]);

      final write = await postJson('opt=sql&action=run',
          {'handle': ro, 'sql': 'insert into t values (2)'});
      expect(write.statusCode, 500);
      expect(jsonDecode(write.body)['error'], contains('readonly'));
    });

    test('opening a missing database read-only does not create it', () async {
      final response =
          await raw('opt=sql&action=opendb&path=nothere.db&readonly=true');
      expect(response.statusCode, 500);
      expect(File('${paths.dbRoot}nothere.db').existsSync(), isFalse);
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
    test('a static response must be revalidated, never reused blind', () async {
      // shelf_static sends Last-Modified but nothing tells the client it has
      // to ask. A WebView then picks its own freshness lifetime and serves a
      // stale file without a request, which breaks the IDE's edit-then-Run
      // loop — and an ES module caches harder than a script did.
      await File('${paths.wwwRoot}app.js').writeAsString('export default 1;');
      final response = await http
          .get(Uri.parse('http://127.0.0.1:${server.boundPort}/app.js'));
      expect(response.statusCode, 200);
      expect(response.headers['cache-control'], contains('no-cache'));
    });

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
