@TestOn('vm')
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/bridge/sql_bridge.dart';
import 'package:acelery/src/mcp/app_runs.dart';
import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/access_control.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import 'package:shelf/shelf.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:test/test.dart';

/// The MCP server at `/mcp` (doc/mcp-server.md), over real HTTP against a real
/// SQLite engine and a temporary tree holding the bundle's scaffold and guide.
void main() {
  sqfliteFfiInit();

  late Directory tmp;
  late ACeleryPaths paths;
  late ACeleryServer server;
  late Uri endpoint;
  late String token;

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('acelery_mcp');
    paths = ACeleryPaths(tmp.path);
    for (final dir in [...paths.userDataRoots, paths.wwwRoot]) {
      await Directory(dir).create(recursive: true);
    }
    // What the installer would have put there, from the source tree.
    for (final dir in ['system/scaffold', 'system/mcp']) {
      final target = Directory('${paths.wwwRoot}$dir');
      await target.create(recursive: true);
      for (final file in Directory('bundle/www/$dir').listSync().whereType<File>()) {
        await file.copy(p.join(target.path, p.basename(file.path)));
      }
    }

    server = ACeleryServer(
      paths: paths,
      databaseFactory: databaseFactoryFfi,
      port: 0,
      address: InternetAddress.loopbackIPv4,
    );
    await server.start();
    endpoint = Uri.parse('http://127.0.0.1:${server.boundPort}/mcp');
    token = await server.access.mintClient();
  });

  tearDown(() async {
    await server.stop();
    server.access.dispose();
    await tmp.delete(recursive: true);
  });

  Map<String, String> headers({String? session, String? bearer}) => {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer ${bearer ?? token}',
        'Mcp-Session-Id': ?session,
      };

  var nextId = 0;

  Future<http.Response> post(Object? body,
          {String? session, Map<String, String>? extra, String? bearer}) =>
      http.post(
        endpoint,
        headers: {...headers(session: session, bearer: bearer), ...?extra},
        body: body is String ? body : jsonEncode(body),
      );

  Map<String, Object?> request(String method, [Object? params]) => {
        'jsonrpc': '2.0',
        'id': ++nextId,
        'method': method,
        'params': ?params,
      };

  Future<String> initialize({String? bearer}) async {
    final response = await post(
      request('initialize', {
        'protocolVersion': '2025-06-18',
        'capabilities': {},
        'clientInfo': {'name': 'test', 'version': '1'},
      }),
      bearer: bearer,
    );
    expect(response.statusCode, 200, reason: response.body);
    return response.headers['mcp-session-id']!;
  }

  /// A request in a fresh session; returns the decoded JSON-RPC envelope.
  Future<Map<String, dynamic>> rpc(String method, [Object? params]) async {
    final session = await initialize();
    final response = await post(request(method, params), session: session);
    expect(response.statusCode, 200, reason: response.body);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// A tool call's result: the parsed JSON, or the failure message.
  Future<({Object? value, String? error})> call(
    String tool, [
    Map<String, Object?> args = const {},
  ]) async {
    final envelope = await rpc('tools/call', {'name': tool, 'arguments': args});
    final result = envelope['result'] as Map<String, dynamic>;
    final text = (result['content'] as List).first['text'] as String;
    if (result['isError'] == true) return (value: null, error: text);
    Object? value;
    try {
      value = jsonDecode(text);
    } on FormatException {
      value = text;
    }
    return (value: value, error: null);
  }

  Future<Map<String, dynamic>> ok(String tool,
      [Map<String, Object?> args = const {}]) async {
    final result = await call(tool, args);
    expect(result.error, isNull, reason: '$tool failed');
    return result.value as Map<String, dynamic>;
  }

  Future<String> failure(String tool, Map<String, Object?> args) async {
    final result = await call(tool, args);
    expect(result.error, isNotNull, reason: '$tool should have failed');
    return result.error!;
  }

  group('transport', () {
    test('initialize agrees a version and opens a session', () async {
      final response = await post(request('initialize', {
        'protocolVersion': '2025-06-18',
        'capabilities': {},
        'clientInfo': {'name': 'test', 'version': '1'},
      }));
      expect(response.statusCode, 200);
      expect(response.headers['mcp-session-id'], isNotEmpty);

      final result = (jsonDecode(response.body) as Map)['result'] as Map;
      expect(result['protocolVersion'], '2025-06-18');
      expect(result['serverInfo'], containsPair('name', 'aCelery'));
      expect(result['capabilities'],
          allOf(contains('tools'), contains('resources'), contains('prompts')));
      expect(result['instructions'], contains('acelery://guide'));
    });

    test('a version it does not know is answered with its newest', () async {
      final response = await post(request('initialize', {
        'protocolVersion': '1999-01-01',
        'capabilities': {},
        'clientInfo': {'name': 'test', 'version': '1'},
      }));
      final result = (jsonDecode(response.body) as Map)['result'] as Map;
      expect(result['protocolVersion'], '2025-11-25');
    });

    test('tools/list describes every tool with its hints', () async {
      final tools = ((await rpc('tools/list'))['result']['tools'] as List)
          .cast<Map<String, dynamic>>();
      final byName = {for (final t in tools) t['name']: t};
      expect(byName.keys, containsAll([
        'list_apps', 'read_app', 'read_file', 'create_app', 'write_file',
        'delete_file', 'delete_app', 'list_databases', 'query_db', 'exec_db',
        'get_guide', 'run_app', 'read_console', 'eval_js', 'read_dom',
        'close_app',
      ]));
      expect(byName['read_console']!['annotations']['readOnlyHint'], isTrue);
      expect(byName['eval_js']!['annotations']['destructiveHint'], isTrue);
      expect(byName['query_db']!['annotations']['readOnlyHint'], isTrue);
      expect(byName['delete_app']!['annotations']['destructiveHint'], isTrue);
      expect(byName['write_file']!['inputSchema']['required'],
          ['app', 'path', 'content']);
    });

    test('ping answers', () async {
      expect((await rpc('ping'))['result'], isEmpty);
    });

    test('an unknown method is -32601', () async {
      expect((await rpc('nope/nothing'))['error']['code'], -32601);
    });

    test('an unknown tool is a protocol error, a failing one is a result',
        () async {
      expect((await rpc('tools/call', {'name': 'nope'}))['error']['code'],
          -32602);
      expect(await failure('read_app', {'app': 'Missing'}),
          contains('No app named'));
    });

    test('a malformed body is a parse error', () async {
      final session = await initialize();
      final response = await post('{not json', session: session);
      expect(response.statusCode, 400);
      expect(jsonDecode(response.body)['error']['code'], -32700);
    });

    test('a batch is refused', () async {
      final session = await initialize();
      final response =
          await post([request('ping'), request('ping')], session: session);
      expect(response.statusCode, 400);
    });

    test('anything but initialize needs a session', () async {
      final response = await post(request('ping'));
      expect(response.statusCode, 400);
      expect(response.body, contains('Mcp-Session-Id'));
    });

    test('an unknown session is 404, so the client starts again', () async {
      final response = await post(request('ping'), session: 'made-up');
      expect(response.statusCode, 404);
    });

    test("one client's session is not another's", () async {
      final session = await initialize();
      final other = await server.access.mintClient();
      final response =
          await post(request('ping'), session: session, bearer: other);
      expect(response.statusCode, 404);
    });

    test('a notification is accepted with no body', () async {
      final session = await initialize();
      final response = await post(
        {'jsonrpc': '2.0', 'method': 'notifications/initialized'},
        session: session,
      );
      expect(response.statusCode, 202);
      expect(response.body, isEmpty);
    });

    test('an unsupported MCP-Protocol-Version header is refused', () async {
      final session = await initialize();
      final response = await post(request('ping'),
          session: session, extra: {'MCP-Protocol-Version': '1999-01-01'});
      expect(response.statusCode, 400);
    });

    test('a body that is not JSON by type is refused', () async {
      final session = await initialize();
      final response = await post(request('ping'),
          session: session, extra: {'Content-Type': 'text/plain'});
      expect(response.statusCode, 415);
    });

    test('GET has no stream to open', () async {
      final response = await http.get(endpoint, headers: headers());
      expect(response.statusCode, 405);
    });

    test('DELETE ends the session', () async {
      final session = await initialize();
      final deleted = await http.delete(endpoint, headers: headers(session: session));
      expect(deleted.statusCode, 204);
      final after = await post(request('ping'), session: session);
      expect(after.statusCode, 404);
    });

    test('sessions survive turning sharing on, which rebinds the socket',
        () async {
      // Rebinding is a stop and a start; the MCP state lives with the server
      // object, not the socket.
      final session = await initialize();
      final before = server.boundPort;
      await server.setSharedOnNetwork(true);
      // Port 0 means the rebind picked a new port, which proves it happened.
      expect(server.boundPort, isNot(before));
      endpoint = endpoint.replace(port: server.boundPort);
      final response = await post(request('ping'), session: session);
      expect(response.statusCode, 200);
    });
  });

  group('authorization', () {
    Future<http.Response> ping(Map<String, String> h) => http.post(
          endpoint,
          headers: {'Content-Type': 'application/json', ...h},
          body: jsonEncode(request('initialize', {
            'protocolVersion': '2025-06-18',
            'capabilities': {},
            'clientInfo': {'name': 'test', 'version': '1'},
          })),
        );

    test('no token is 401, even on loopback', () async {
      // Loopback is trusted everywhere else; a page in the WebView is loopback.
      final response = await ping({});
      expect(response.statusCode, 401);
      expect(response.headers['www-authenticate'], startsWith('Bearer'));
    });

    test('a made-up token is 401', () async {
      expect((await ping({'Authorization': 'Bearer made-up'})).statusCode, 401);
    });

    test("a paired browser's cookie is not a client token", () async {
      final browser = await _pairBrowser(server.access);
      expect(
        (await ping({'Cookie': '${AccessControl.cookieName}=$browser'}))
            .statusCode,
        401,
      );
      expect((await ping({'Authorization': 'Bearer $browser'})).statusCode, 401,
          reason: 'nor is its token, sent as a bearer');
    });

    test('a request carrying Origin is refused, token or not', () async {
      final response = await ping({
        'Authorization': 'Bearer $token',
        'Origin': 'http://127.0.0.1:${server.boundPort}',
      });
      expect(response.statusCode, 403);
    });

    test('a revoked token stops working', () async {
      final session = await initialize();
      await server.access.revoke(token);
      final response = await post(request('ping'), session: session);
      expect(response.statusCode, 401);
    });

    test('the rest of the server keeps its rules', () async {
      // Loopback without a token still reaches the bridge: the token rule is
      // for /mcp only.
      final response = await http.get(Uri.parse(
          'http://127.0.0.1:${server.boundPort}/android.itf?opt=file&action=getextpath'));
      expect(response.statusCode, 200);
    });
  });

  group('the gate, from the network', () {
    // Decision logic with a non-loopback peer; the sockets are exercised above
    // and in access_control_test.dart.
    final peer = InternetAddress('192.168.1.50');
    Request withHeaders(Map<String, String> h) =>
        Request('POST', Uri.parse('http://phone/mcp'), headers: h);

    test('with sharing off, a client on the network is refused', () async {
      await server.access.setShared(false);
      expect(
        server.access.checkClient(
            withHeaders({'authorization': 'Bearer $token'}), peer),
        isA<AccessRefused>(),
      );
    });

    test('with sharing on, its token lets it in', () async {
      await server.access.setShared(true);
      expect(
        server.access.checkClient(
            withHeaders({'authorization': 'Bearer $token'}), peer),
        isA<AccessAllowed>(),
      );
    });

    test('a client without a token raises no pairing prompt', () async {
      await server.access.setShared(true);
      expect(server.access.checkClient(withHeaders({}), peer),
          isA<AccessUnauthorized>());
      expect(server.access.pending, isEmpty);
    });

    test('a client token is not a browser cookie', () async {
      await server.access.setShared(true);
      final result = server.access.check(
          withHeaders({'cookie': '${AccessControl.cookieName}=$token'}), peer);
      expect(result, isA<AccessPairingRequired>());
    });

    test("a client's last call survives a restart", () async {
      // Kept only in memory, it was lost on every launch, and an assistant
      // that had been working all afternoon was listed as never connected.
      await server.access.setShared(true);
      final paired = server.access.deviceByToken(token)!.pairedAt;
      await Future<void>.delayed(const Duration(milliseconds: 5));
      server.access.checkClient(
          withHeaders({'authorization': 'Bearer $token'}), peer);
      // The save is not awaited by the gate; let it land.
      await Future<void>.delayed(const Duration(milliseconds: 200));

      final reloaded = AccessControl(storeFile: File(paths.accessStore));
      await reloaded.load();
      final device = reloaded.deviceByToken(token)!;
      expect(device.address, '192.168.1.50');
      expect(device.lastSeen.isAfter(paired), isTrue);
      reloaded.dispose();
    });

    test('client tokens persist with their kind', () async {
      final reloaded = AccessControl(storeFile: File(paths.accessStore));
      await reloaded.load();
      expect(reloaded.deviceByToken(token)?.kind, DeviceKind.client);
      reloaded.dispose();
    });
  });

  group('authoring tools', () {
    test('create_app makes the scaffold, and read_app reads it back', () async {
      final created = await ok('create_app',
          {'name': 'water', 'description': 'Logs how much I drink'});
      expect(created['app'], 'Water');

      final app = await ok('read_app', {'app': 'Water'});
      expect(app['manifest'], {
        'name': 'Water',
        'description': 'Logs how much I drink',
        'entry': 'main.js',
      });
      final files = {
        for (final f in (app['files'] as List).cast<Map<String, dynamic>>())
          f['path']: f,
      };
      expect(files.keys, unorderedEquals(['acelery_app.json', 'main.js']));
      expect(files['main.js']!['content'], contains('title="Water"'));
      expect(files['main.js']!['mtime'], isA<int>());

      final listed = await ok('list_apps');
      expect((listed['apps'] as List).map((a) => a['name']), ['Water']);
    });

    test('create_app refuses a bad name and a taken one', () async {
      expect(await failure('create_app', {'name': 'my app'}),
          contains('Letters, numbers and underscore'));
      expect(await failure('create_app', {'name': '../escape'}),
          contains('Letters, numbers and underscore'));
      await ok('create_app', {'name': 'Water'});
      expect(await failure('create_app', {'name': 'water'}),
          contains('already exists'));
      expect(await failure('create_app',
              {'name': 'Long', 'description': 'x' * 141}),
          contains('140'));
    });

    test('write_file creates, and replaces only what was read', () async {
      await ok('create_app', {'name': 'Water'});

      final created = await ok('write_file',
          {'app': 'Water', 'path': 'lib/sums.js', 'content': 'export const a = 1;'});
      expect(File('${paths.userRoot}Water/lib/sums.js').readAsStringSync(),
          'export const a = 1;');

      expect(
        await failure('write_file',
            {'app': 'Water', 'path': 'lib/sums.js', 'content': 'x'}),
        contains('expected_mtime'),
        reason: 'replacing needs the mtime it was read at',
      );

      // The user saves the file in the IDE on the phone in the meantime.
      final file = File('${paths.userRoot}Water/lib/sums.js');
      file.writeAsStringSync('export const a = 2; // edited on the phone');
      file.setLastModifiedSync(DateTime.now().add(const Duration(seconds: 5)));

      expect(
        await failure('write_file', {
          'app': 'Water',
          'path': 'lib/sums.js',
          'content': 'x',
          'expected_mtime': created['mtime'],
        }),
        contains('changed since it was read'),
      );
      expect(file.readAsStringSync(), contains('edited on the phone'));

      final current = await ok('read_file', {'app': 'Water', 'path': 'lib/sums.js'});
      final replaced = await ok('write_file', {
        'app': 'Water',
        'path': 'lib/sums.js',
        'content': 'export const a = 3;',
        'expected_mtime': current['mtime'],
      });
      expect(file.readAsStringSync(), 'export const a = 3;');
      expect(replaced['mtime'], file.statSync().modified.millisecondsSinceEpoch);
    });

    test('paths cannot leave the app', () async {
      await ok('create_app', {'name': 'Water'});
      await ok('create_app', {'name': 'Other'});
      for (final path in [
        '../Other/main.js',
        '/etc/passwd',
        'a//b.js',
        '..',
        'lib/../../Other/x.js',
        r'lib\x.js',
      ]) {
        await failure('write_file', {'app': 'Water', 'path': path, 'content': 'x'});
      }
      for (final app in ['../Water', '..', '.hidden', 'Water/lib', '']) {
        await failure('write_file', {'app': app, 'path': 'x.js', 'content': 'x'});
      }
      expect(File('${paths.userRoot}Other/main.js').readAsStringSync(),
          isNot('x'));
      expect(File('${paths.base}/www/x.js').existsSync(), isFalse);
    });

    test('a binary file is listed without contents', () async {
      await ok('create_app', {'name': 'Water'});
      File('${paths.userRoot}Water/icon.png')
          .writeAsBytesSync([0x89, 0x50, 0x4e, 0x47, 0, 0, 0xff, 0xfe]);
      final file = await ok('read_file', {'app': 'Water', 'path': 'icon.png'});
      expect(file['binary'], isTrue);
      expect(file, isNot(contains('content')));
    });

    test('a large text file is cut, and says so', () async {
      await ok('create_app', {'name': 'Water'});
      File('${paths.userRoot}Water/big.js')
          .writeAsStringSync('// é\n' * 60000);
      final file = await ok('read_file', {'app': 'Water', 'path': 'big.js'});
      expect(file['truncated'], isTrue);
      expect(utf8.encode(file['content'] as String).length,
          lessThanOrEqualTo(200 * 1024));
    });

    test('delete_file and delete_app', () async {
      await ok('create_app', {'name': 'Water'});
      await ok('write_file', {'app': 'Water', 'path': 'x.js', 'content': 'x'});
      await ok('delete_file', {'app': 'Water', 'path': 'x.js'});
      expect(File('${paths.userRoot}Water/x.js').existsSync(), isFalse);
      expect(await failure('delete_file', {'app': 'Water', 'path': 'x.js'}),
          contains('does not exist'));

      await ok('delete_app', {'app': 'Water'});
      expect(Directory('${paths.userRoot}Water').existsSync(), isFalse);
    });

    test('an argument of the wrong type is a failure the model can read',
        () async {
      expect(await failure('read_app', {'app': 7}), contains('"app"'));
      expect(await failure('read_app', {}), contains('"app" is required'));
    });

    test('every call is logged', () async {
      await ok('create_app', {'name': 'Water'});
      await failure('read_app', {'app': 'Missing'});
      final log = File('${paths.logRoot}mcp.log').readAsLinesSync();
      expect(log, hasLength(2));
      expect(log[0], contains('\tcreate_app\tWater\tok'));
      expect(log[1], contains('\tread_app\tMissing\tfailed: No app named'));
    });
  });

  group('data tools', () {
    test('exec_db changes data, query_db reads it back', () async {
      final created = await ok('exec_db', {
        'database': 'water.db',
        'sql': 'create table drink (at text, ml integer, note text)',
      });
      // DDL changes no rows and inserts nothing. Android's sqflite reported
      // one change and rowid 1 here, which is why these are measured.
      expect(created, {'changes': 0});

      final inserted = await ok('exec_db', {
        'database': 'water.db',
        'sql': 'insert into drink values (?, ?, ?)',
        'params': ['2026-09-16', 250, null],
      });
      expect(inserted, {'changes': 1, 'lastInsertRowid': 1});

      final updated = await ok('exec_db', {
        'database': 'water.db',
        'sql': 'update drink set note = ? where ml > 0',
        'params': ['morning'],
      });
      expect(updated, {'changes': 1}, reason: 'an UPDATE inserts no row');

      final rows = await ok('query_db', {
        'database': 'water.db',
        'sql': 'select * from drink where ml > ?',
        'params': [100],
      });
      expect(rows['columns'], ['at', 'ml', 'note']);
      expect(rows['rows'], [
        {'at': '2026-09-16', 'ml': 250, 'note': 'morning'},
      ]);

      final dbs = await ok('list_databases');
      expect((dbs['databases'] as List).map((d) => d['name']), ['water.db']);
    });

    test('query_db cannot write', () async {
      await ok('exec_db',
          {'database': 'water.db', 'sql': 'create table drink (ml integer)'});
      expect(
        await failure('query_db',
            {'database': 'water.db', 'sql': 'insert into drink values (1)'}),
        contains('readonly'),
      );
    });

    test('query_db does not create a missing database', () async {
      expect(await failure('query_db', {'database': 'nope.db', 'sql': 'select 1'}),
          contains('No database'));
      expect(File('${paths.dbRoot}nope.db').existsSync(), isFalse);
    });

    test('query_db stops at 200 rows and says how many there were', () async {
      await ok('exec_db',
          {'database': 'n.db', 'sql': 'create table n (i integer)'});
      await ok('exec_db', {
        'database': 'n.db',
        'sql': 'insert into n with recursive c(i) as '
            '(select 1 union all select i + 1 from c where i < 250) '
            'select i from c',
      });
      final rows = await ok('query_db', {'database': 'n.db', 'sql': 'select * from n'});
      expect(rows['rows'], hasLength(200));
      expect(rows['rowCount'], 250);
      expect(rows['truncated'], isTrue);
    });

    test('a BLOB is described, not sent', () async {
      await ok('exec_db',
          {'database': 'b.db', 'sql': 'create table b (data blob)'});
      await ok('exec_db',
          {'database': 'b.db', 'sql': "insert into b values (x'00010203')"});
      final rows = await ok('query_db', {'database': 'b.db', 'sql': 'select data from b'});
      expect(rows['rows'], [
        {'data': {'blob': 4}},
      ]);
    });

    test('a bad statement reports SQLite\'s message', () async {
      await ok('exec_db', {'database': 'x.db', 'sql': 'create table t (a)'});
      expect(
          await failure('query_db', {'database': 'x.db', 'sql': 'select nope from t'}),
          contains('nope'));
    });

    test('a database name cannot leave db/', () async {
      for (final name in ['../escape.db', '/tmp/x.db', '.hidden.db', 'a/b.db']) {
        await failure('exec_db', {'database': name, 'sql': 'create table t (a)'});
      }
      expect(File('${paths.base}/www/escape.db').existsSync(), isFalse);
      expect(File('${paths.base}/escape.db').existsSync(), isFalse);
    });

    test('ATTACH and VACUUM INTO are refused', () async {
      final outside = p.join(tmp.path, 'outside.db');
      expect(
        await failure('exec_db', {
          'database': 'x.db',
          'sql': "attach database '$outside' as o",
        }),
        contains('ATTACH'),
      );
      expect(File(outside).existsSync(), isFalse);
      await ok('exec_db', {'database': 'x.db', 'sql': 'create table t (a)'});
      await failure('exec_db',
          {'database': 'x.db', 'sql': "VACUUM main INTO '$outside'"});
      expect(File(outside).existsSync(), isFalse);
    });
  });

  group('SqlBridge.fileProblem', () {
    test('sees through case, comments and spacing', () {
      for (final sql in [
        "ATTACH 'x.db' AS x",
        "attach database 'x.db' as x",
        "  /* hi */ Attach 'x' as y",
        "vacuum into '/tmp/x.db'",
        "VACUUM\nmain\nINTO 'x'",
      ]) {
        expect(SqlBridge.fileProblem(sql), isNotNull, reason: sql);
      }
    });

    test('does not trip on a value or a name that says attach', () {
      for (final sql in [
        "insert into notes values ('attach the file')",
        'select "attach" from t',
        'select [attach] from t',
        'select 1 -- attach later',
        "insert into t values ('vacuum the car into the garage')",
        'select attachment from mail',
      ]) {
        expect(SqlBridge.fileProblem(sql), isNull, reason: sql);
      }
    });
  });

  group('run and debug tools', () {
    late _FakePage page;

    setUp(() async {
      page = _FakePage(server.runs);
      server.runs.screen = page;
      await ok('create_app', {'name': 'Water'});
    });

    test('run_app opens the app and returns its start and console', () async {
      final run = await ok('run_app', {'app': 'Water', 'settle_ms': 100});
      expect(page.opened, ['Water']);
      expect(run['status'], 'started');
      expect(run['app'], 'Water');
      final console = (run['console'] as List).cast<Map<String, dynamic>>();
      expect(console.map((e) => e['text']),
          ['Water says hello', 'a warning while settling'],
          reason: 'output in the settle window is included');
      expect(console.last['level'], 'warn');
      expect(run['last_seq'], 2);
      expect(run['more'], isFalse);
    });

    test('a failed start comes back with the launcher\'s message, at once',
        () async {
      page.failWith = 'main.js failed to load';
      final watch = Stopwatch()..start();
      final run = await ok('run_app', {'app': 'Water', 'settle_ms': 5000});
      expect(watch.elapsed, lessThan(const Duration(seconds: 3)),
          reason: 'no settling after a failure');
      expect(run['status'], 'failed');
      expect(run['failure'], {
        'title': 'main.js failed to load',
        'detail': 'SyntaxError: Unexpected token at main.js:3:9',
      });
    });

    test('run_app refuses an app that does not exist, before opening anything',
        () async {
      expect(await failure('run_app', {'app': 'Nope'}), contains('No app named'));
      expect(page.opened, isEmpty);
    });

    test('without aCelery on screen, run_app says so', () async {
      server.runs.screen = null;
      expect(await failure('run_app', {'app': 'Water'}),
          contains('not showing its screen'));
    });

    test('read_console returns only what is new after last_seq', () async {
      expect(await failure('read_console', {}), contains('No app has run'));
      final run = await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      page.run!.log('error', 'Uncaught TypeError: x is null',
          stack: 'TypeError: x is null\n    at add (main.js:20:3)',
          source: 'main.js:20:3');

      final fresh =
          await ok('read_console', {'after_seq': run['last_seq'] as int});
      expect(fresh['running'], isTrue);
      expect(fresh['status'], 'started');
      final entries = (fresh['console'] as List).cast<Map<String, dynamic>>();
      expect(entries.map((e) => e['text']).last, 'Uncaught TypeError: x is null');
      expect(entries.last['source'], 'main.js:20:3');
      expect(entries.last['stack'], contains('main.js:20:3'));
    });

    test('eval_js returns the value, or what the code threw', () async {
      await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      final result = await ok('eval_js', {'code': 'document.title'});
      expect(result, {'app': 'Water', 'value': 'Water'});
      expect(page.evaluated, ['document.title']);

      expect(await failure('eval_js', {'code': 'throw new Error("no")'}),
          'The code threw: Error: no\n    at <anonymous>:1:7');
    });

    test('read_dom returns the element, and says when nothing matches',
        () async {
      await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      final dom = await ok('read_dom', {'selector': 'button', 'max_chars': 100});
      expect(dom['matches'], 2);
      expect(dom['content'], hasLength(100));
      expect(dom['truncated'], isTrue);
      expect(dom['length'], 150);

      expect(await failure('read_dom', {'selector': '.missing'}),
          contains('Nothing on the page matches ".missing"'));
    });

    test('take_screenshot returns a PNG, after the page has painted', () async {
      await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      final envelope = await rpc('tools/call', {'name': 'take_screenshot'});
      final content = (envelope['result']['content'] as List)
          .cast<Map<String, dynamic>>();
      expect(content.first['type'], 'image');
      expect(content.first['mimeType'], 'image/png');
      expect(base64Decode(content.first['data'] as String), [137, 80, 78, 71]);
      expect(jsonDecode(content.last['text'] as String),
          {'app': 'Water', 'width': 360, 'height': 640});
      expect(page.evaluated.single, contains('requestAnimationFrame'),
          reason: 'a change made a moment ago must be in the picture');

      page.canSnapshot = false;
      await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      expect(await failure('take_screenshot', {}),
          contains('not available on this device'));
    });

    test('close_app closes, and the console stays readable', () async {
      await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      expect(await ok('close_app'), {'closed': true});
      expect(await ok('close_app'), {'closed': false});

      expect(await failure('eval_js', {'code': '1'}),
          contains('Water is no longer open'));
      final console = await ok('read_console');
      expect(console['running'], isFalse);
      expect(console['console'], isNotEmpty);
    });

    test('run_app is logged with its app', () async {
      await ok('run_app', {'app': 'Water', 'settle_ms': 0});
      final log = File('${paths.logRoot}mcp.log').readAsLinesSync();
      expect(log.last, contains('\trun_app\tWater\tok'));
    });
  });

  group('resources and prompts', () {
    test('the guide is listed and readable, and get_guide returns it', () async {
      final listed = (await rpc('resources/list'))['result']['resources'] as List;
      expect(listed.first['uri'], 'acelery://guide');

      final read = (await rpc('resources/read', {'uri': 'acelery://guide'}))['result'];
      final text = read['contents'][0]['text'] as String;
      expect(text, startsWith('# Writing an aCelery app'));
      expect(read['contents'][0]['mimeType'], 'text/markdown');

      expect((await call('get_guide')).value, text);
    });

    test('an app file reads through its URI', () async {
      await ok('create_app', {'name': 'Water'});
      final read = (await rpc('resources/read',
          {'uri': 'acelery://apps/Water/main.js'}))['result'];
      expect(read['contents'][0]['text'], contains('title="Water"'));

      final templates = (await rpc('resources/templates/list'))['result'];
      expect(templates['resourceTemplates'][0]['uriTemplate'],
          'acelery://apps/{app}/{+path}');
    });

    test('a missing or escaping resource is -32002', () async {
      for (final uri in [
        'acelery://apps/Water/nope.js',
        'acelery://apps/../db/x.db',
        'acelery://apps/Water/..%2F..%2Fdb%2Fx.db',
        'acelery://nothing',
      ]) {
        expect((await rpc('resources/read', {'uri': uri}))['error']['code'],
            -32002,
            reason: uri);
      }
    });

    test('create_acelery_app carries the guide and the idea', () async {
      final prompts = (await rpc('prompts/list'))['result']['prompts'] as List;
      expect(prompts.single['name'], 'create_acelery_app');

      final got = (await rpc('prompts/get', {
        'name': 'create_acelery_app',
        'arguments': {'idea': 'track my water'},
      }))['result'];
      final messages = got['messages'] as List;
      expect(messages[0]['content']['resource']['uri'], 'acelery://guide');
      expect(messages[1]['content']['text'], contains('track my water'));

      expect(
          (await rpc('prompts/get', {'name': 'create_acelery_app'}))['error']
              ['code'],
          -32602);
    });
  });
}

/// A browser paired the way the pairing page does it, returning its token.
Future<String> _pairBrowser(AccessControl access) async {
  await access.setShared(true);
  final result = access.check(
    Request('GET', Uri.parse('http://phone/index.html')),
    InternetAddress('192.168.1.60'),
  ) as AccessPairingRequired;
  return (await access.approve(result.pairing.id))!;
}

/// The device side of the run tools: a screen that opens an app and a page
/// that answers the scripts `eval_js` and `read_dom` send, the way
/// `UserAppScreen` and capture.js do. The scripts themselves run for real in
/// mcp_page_scripts_test.dart.
class _FakePage implements AppScreen {
  _FakePage(this.runs);

  final AppRuns runs;
  final opened = <String>[];
  final evaluated = <String>[];
  AppRun? run;

  /// False for a device that cannot take screenshots, as on iOS.
  bool canSnapshot = true;

  /// Set to make the next start fail with this title.
  String? failWith;

  @override
  Future<void> open(String app) async {
    opened.add(app);
    final previous = run;
    if (previous != null) runs.end(previous);
    scheduleMicrotask(() {
      final begun = run = runs.begin(app, _send,
          snapshot: canSnapshot
              ? () async => const AppSnapshot(
                  png: [137, 80, 78, 71], width: 360, height: 640)
              : null);
      begun.log('log', '$app says hello');
      if (failWith != null) {
        begun.reportFailed(
            failWith!, 'SyntaxError: Unexpected token at main.js:3:9');
      } else {
        begun.reportStarted();
        Timer(const Duration(milliseconds: 20),
            () => begun.log('warn', 'a warning while settling'));
      }
    });
  }

  /// Like a route, the screen is disposed, and ends its run, only after the
  /// closing animation.
  @override
  Future<void> close() async {
    final open = run;
    if (open != null) {
      Timer(const Duration(milliseconds: 300), () => runs.end(open));
    }
  }

  Future<void> _send(String script) async {
    final id = int.parse(
        RegExp(r'payload\.id = (\d+);').firstMatch(script)!.group(1)!);
    final code = jsonDecode(
        RegExp(r'\(0, eval\)\((".*")\); \}\)').firstMatch(script)!.group(1)!)
        as String;
    final target = run!;
    scheduleMicrotask(() => target.resolveEval(id, _answer(code)));
  }

  EvalResult _answer(String code) {
    if (code.contains('querySelectorAll("button")')) {
      return EvalResult.value(jsonEncode({'count': 2, 'content': 'b' * 150}));
    }
    if (code.contains('querySelectorAll(')) {
      return EvalResult.value(jsonEncode({'count': 0, 'content': ''}));
    }
    evaluated.add(code);
    if (code.startsWith('throw')) {
      return const EvalResult.error('Error: no\n    at <anonymous>:1:7');
    }
    return const EvalResult.value('Water');
  }
}
