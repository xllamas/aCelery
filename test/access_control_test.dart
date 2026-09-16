@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:acelery/src/server/access_control.dart';
import 'package:http/http.dart' as http;
import 'package:shelf/shelf.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:test/test.dart';

/// The access model from doc/modernization-assessment.md §2, exercised over
/// real sockets from a real non-loopback peer.
///
/// The original bound to 0.0.0.0 and authenticated nothing, so anything on the
/// Wi-Fi could reach the SQL and filesystem bridges. Testing this through the
/// loopback interface alone would prove nothing, because loopback is the case
/// that is *supposed* to skip the gate — so these bind to a real LAN address
/// and connect to it.
/// A bare request, for the decision logic that does not care about the URL.
Request _request() => Request('GET', Uri.parse('http://localhost/index.html'));

void main() {
  sqfliteFfiInit();

  late Directory tmp;
  late ACeleryPaths paths;
  late ACeleryServer server;

  /// A non-loopback address of this machine, or null if there is none.
  Future<InternetAddress?> lanAddress() async {
    final interfaces = await NetworkInterface.list(
      type: InternetAddressType.IPv4,
      includeLoopback: false,
    );
    for (final i in interfaces) {
      for (final a in i.addresses) {
        if (!a.isLoopback) return a;
      }
    }
    return null;
  }

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('acelery_access');
    paths = ACeleryPaths(tmp.path);
    for (final dir in [...paths.userDataRoots, paths.wwwRoot]) {
      await Directory(dir).create(recursive: true);
    }
    await File('${paths.wwwRoot}index.html').writeAsString('<html>hi</html>');
  });

  tearDown(() async {
    await server.stop();
    server.access.dispose();
    await tmp.delete(recursive: true);
  });

  Future<void> startOn(InternetAddress address, {bool shared = true}) async {
    server = ACeleryServer(
      paths: paths,
      databaseFactory: databaseFactoryFfi,
      port: 0,
      address: address,
    );
    await server.access.setShared(shared);
    await server.start();
  }

  group('loopback', () {
    setUp(() => startOn(InternetAddress.loopbackIPv4));

    test('is trusted without pairing', () async {
      // The app's own WebView is this case; making it pair with itself would
      // be absurd, and would lock the product out of its own server.
      final response = await http
          .get(Uri.parse('http://127.0.0.1:${server.boundPort}/index.html'));
      expect(response.statusCode, 200);
      expect(response.body, contains('hi'));
    });

    test('reaches the bridge without pairing', () async {
      final response = await http.get(Uri.parse(
          'http://127.0.0.1:${server.boundPort}/android.itf'
          '?opt=file&action=getextpath'));
      expect(response.statusCode, 200);
    });

    test('turning sharing on or off is reported, once the socket has rebound',
        () async {
      // The app starts and stops its Android foreground service from this
      // (lib/src/serving.dart), so a change must be reported exactly when it
      // happens, and a repeat of the current setting must not be.
      await server.setSharedOnNetwork(false); // this group starts shared
      final reported = <(bool, bool)>[];
      server.onSharingChanged = (shared) async {
        reported.add((shared, server.isRunning));
      };
      await server.setSharedOnNetwork(true);
      await server.setSharedOnNetwork(true);
      await server.setSharedOnNetwork(false);
      expect(reported, [(true, true), (false, true)]);
    });

    test('is told it does not need to pair', () async {
      final response = await http
          .get(Uri.parse('http://127.0.0.1:${server.boundPort}/acelery.pair'));
      expect(response.body, contains('does not need to pair'));
    });
  });

  group('a device on the network', () {
    late InternetAddress? lan;
    late String origin;

    setUp(() async {
      lan = await lanAddress();
      if (lan == null) return;
      await startOn(InternetAddress.anyIPv4);
      origin = 'http://${lan!.address}:${server.boundPort}';
    });

    test('gets a pairing page instead of the app', () async {
      if (lan == null) return; // no LAN interface on this machine
      final response = await http.get(
        Uri.parse('$origin/index.html'),
        headers: {'Accept': 'text/html'},
      );
      expect(response.statusCode, 200);
      expect(response.body, contains('Approve this device'));
      // The thing being protected must not leak.
      expect(response.body, isNot(contains('<html>hi</html>')));
    });

    test('cannot reach the bridge before pairing', () async {
      if (lan == null) return;
      final response = await http.get(
          Uri.parse('$origin/android.itf?opt=file&action=getextpath'));
      expect(response.statusCode, 401);
      // Not the extpath, and not a hint of one.
      expect(response.body, isNot(contains('aCelery/files')));
    });

    Future<http.Response> initializeMcp({String? token}) => http.post(
          Uri.parse('$origin/mcp'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': ?(token == null ? null : 'Bearer $token'),
          },
          body: jsonEncode({
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'initialize',
            'params': {
              'protocolVersion': '2025-06-18',
              'capabilities': {},
              'clientInfo': {'name': 'test', 'version': '1'},
            },
          }),
        );

    test('an assistant with its key reaches /mcp, until the key is revoked',
        () async {
      // M2: the MCP route from a real non-loopback peer, not only loopback.
      if (lan == null) return;
      final token = await server.access.mintClient(label: 'laptop');

      final allowed = await initializeMcp(token: token);
      expect(allowed.statusCode, 200, reason: allowed.body);
      expect(allowed.headers['mcp-session-id'], isNotEmpty);
      expect(server.access.deviceByToken(token)!.address, lan!.address,
          reason: 'the list shows where the assistant last called from');

      await server.access.revoke(token);
      expect((await initializeMcp(token: token)).statusCode, 401);
      expect(server.access.pending, isEmpty);
    });

    test('OAuth discovery raises no pairing prompt', () async {
      // mcp-remote with a wrong or revoked key asks for these before giving
      // up. Through the gate, each one raised "Allow this device?" on the
      // phone.
      if (lan == null) return;
      expect((await initializeMcp(token: 'wrong')).statusCode, 401);
      for (final path in [
        '/.well-known/oauth-protected-resource/mcp',
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-authorization-server',
        '/.well-known/openid-configuration',
      ]) {
        final response = await http.get(Uri.parse('$origin$path'),
            headers: {'Accept': 'application/json'});
        expect(response.statusCode, 404, reason: path);
        expect(jsonDecode(response.body)['error_description'],
            contains('does not use OAuth'),
            reason: path);
      }
      final register = await http.post(Uri.parse('$origin/register'),
          headers: {'Content-Type': 'application/json'}, body: '{}');
      expect(register.statusCode, 404);
      expect(server.access.pending, isEmpty);
    });

    test('a subresource gets a status, not a page of HTML', () async {
      if (lan == null) return;
      final response = await http.get(Uri.parse('$origin/tools/js/x.js'));
      expect(response.statusCode, 401);
      expect(response.headers['content-type'], contains('application/json'));
      expect(jsonDecode(response.body), containsPair('code', isA<String>()));
    });

    test('one browser load raises one pairing, not one per request', () async {
      if (lan == null) return;
      for (var i = 0; i < 5; i++) {
        await http.get(Uri.parse('$origin/asset$i.css'));
      }
      expect(server.access.pending, hasLength(1));
    });

    test('approving issues a token, and the token gets in', () async {
      if (lan == null) return;

      // The browser asks.
      await http.get(Uri.parse('$origin/index.html'),
          headers: {'Accept': 'text/html'});
      final pairing = server.access.pending.single;
      expect(pairing.address, lan!.address);
      expect(pairing.code, matches(RegExp(r'^\d{4}$')));

      // The user allows it on the device.
      final token = await server.access.approve(pairing.id);
      expect(token, isNotNull);

      // The waiting page collects it as an HttpOnly cookie.
      final status = await http
          .get(Uri.parse('$origin/acelery.pair/status?id=${pairing.id}'));
      expect(jsonDecode(status.body), containsPair('state', 'approved'));
      final cookie = status.headers['set-cookie']!;
      expect(cookie, contains('HttpOnly'));
      expect(cookie, contains('SameSite=Strict'));
      expect(cookie, contains(token!));

      // And now the app is served.
      final app = await http.get(
        Uri.parse('$origin/index.html'),
        headers: {'Cookie': '${AccessControl.cookieName}=$token'},
      );
      expect(app.statusCode, 200);
      expect(app.body, contains('<html>hi</html>'));
    });

    test('denying leaves the device outside', () async {
      if (lan == null) return;
      await http.get(Uri.parse('$origin/index.html'),
          headers: {'Accept': 'text/html'});
      final pairing = server.access.pending.single;

      await server.access.deny(pairing.id);
      final status = await http
          .get(Uri.parse('$origin/acelery.pair/status?id=${pairing.id}'));
      expect(jsonDecode(status.body), containsPair('state', 'denied'));

      final app = await http.get(Uri.parse('$origin/index.html'),
          headers: {'Accept': 'text/html'});
      expect(app.body, contains('Approve this device'));
    });

    test('a made-up token is not a token', () async {
      if (lan == null) return;
      final response = await http.get(
        Uri.parse('$origin/index.html'),
        headers: {
          'Accept': 'text/html',
          'Cookie': '${AccessControl.cookieName}=not-a-real-token',
        },
      );
      expect(response.body, contains('Approve this device'));
      expect(response.body, isNot(contains('<html>hi</html>')));
    });

    test('revoking puts a paired device back outside', () async {
      if (lan == null) return;
      await http.get(Uri.parse('$origin/index.html'),
          headers: {'Accept': 'text/html'});
      final token = await server.access.approve(server.access.pending.single.id);

      await server.access.revoke(token!);

      final response = await http.get(
        Uri.parse('$origin/index.html'),
        headers: {
          'Accept': 'text/html',
          'Cookie': '${AccessControl.cookieName}=$token',
        },
      );
      expect(response.body, contains('Approve this device'));
    });

    test('with sharing off, an assistant with a key is still refused',
        () async {
      if (lan == null) return;
      final token = await server.access.mintClient();
      await server.access.setShared(false);
      expect((await initializeMcp(token: token)).statusCode, 403);
    });

    test('with sharing off, there is nothing to pair with', () async {
      if (lan == null) return;
      await server.access.setShared(false);
      final response = await http.get(Uri.parse('$origin/index.html'),
          headers: {'Accept': 'text/html'});
      expect(response.statusCode, 403);
      expect(response.body, contains('not shared'));
    });
  });

  group('the pairing lifecycle', () {
    setUp(() => startOn(InternetAddress.loopbackIPv4, shared: true));

    test('an answer survives until the browser has read it', () async {
      // The defect this suite found: approve() removed the pairing, so the
      // browser's next poll saw "unknown", reloaded, and raised a *fresh*
      // request — an approved device could never actually get in.
      final pairing = server.access
          .check(_request(), InternetAddress('192.0.2.10')) as AccessPairingRequired;

      await server.access.approve(pairing.pairing.id);
      expect(server.access.pendingById(pairing.pairing.id), isNotNull,
          reason: 'the answer must outlive the decision');

      server.access.collect(pairing.pairing.id);
      expect(server.access.pendingById(pairing.pairing.id), isNull,
          reason: 'and not outlive its collection');
    });

    test('a settled pairing is not offered to the shell again', () async {
      final first = server.access
          .check(_request(), InternetAddress('192.0.2.11')) as AccessPairingRequired;
      expect(server.access.pending, hasLength(1));

      await server.access.deny(first.pairing.id);
      expect(server.access.pending, isEmpty,
          reason: 'a decided request is not still a question');
    });

    test('a denied device asks afresh rather than re-reading its refusal', () async {
      final peer = InternetAddress('192.0.2.12');
      final first =
          server.access.check(_request(), peer) as AccessPairingRequired;
      await server.access.deny(first.pairing.id);

      final second =
          server.access.check(_request(), peer) as AccessPairingRequired;
      expect(second.pairing.id, isNot(first.pairing.id));
    });

    test('abandoned requests expire', () async {
      server.access.check(_request(), InternetAddress('192.0.2.13'));
      expect(server.access.pending, hasLength(1));

      // Nobody answered; an hour later it should not still be asking.
      server.access.expire(after: Duration.zero);
      expect(server.access.pending, isEmpty);
    });

    test('two devices at once get different codes and separate answers',
        () async {
      // The reason the code exists: approving one prompt must not approve the
      // other.
      final a = server.access
          .check(_request(), InternetAddress('192.0.2.20')) as AccessPairingRequired;
      final b = server.access
          .check(_request(), InternetAddress('192.0.2.21')) as AccessPairingRequired;
      expect(a.pairing.id, isNot(b.pairing.id));

      await server.access.approve(a.pairing.id);
      expect(await a.pairing.settled, isNotNull);
      expect(b.pairing.isSettled, isFalse);
    });
  });

  group('the store', () {
    setUp(() => startOn(InternetAddress.loopbackIPv4, shared: false));

    test('remembers pairings and the setting across a restart', () async {
      // "Remember the decision" — §2 item 2. Pairing on every launch would be
      // the kind of friction that gets a feature turned off permanently.
      await server.access.setShared(true);
      final store = File(paths.accessStore);
      expect(store.existsSync(), isTrue);

      final fresh = AccessControl(storeFile: store);
      await fresh.load();
      expect(fresh.sharedOnNetwork, isTrue);
      fresh.dispose();
    });

    test('is not inside the aCelery tree', () async {
      // It holds bearer tokens. Everything under www/ is served, and the file
      // bridge reads anything under the tree, so outside www/ is not enough.
      final store = server.access.storeFile;
      await server.access.setShared(true);
      expect(store.existsSync(), isTrue);
      expect(store.path, paths.accessStore);
      expect(ACeleryPaths.isInside(Directory(paths.wwwRoot), store), isFalse);
      expect(ACeleryPaths.isInside(Directory(paths.base), store), isFalse);
    });

    test('a corrupt store means nobody is paired', () async {
      // The safe reading of "we do not know who is allowed".
      final store = File(paths.accessStore);
      await store.writeAsString('{ this is not json');

      final fresh = AccessControl(storeFile: store);
      await fresh.load();
      expect(fresh.sharedOnNetwork, isFalse);
      expect(fresh.devices, isEmpty);
      fresh.dispose();
    });
  });
}
