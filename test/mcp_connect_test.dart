@TestOn('vm')
library;

import 'dart:convert';

import 'package:acelery/src/mcp/connect.dart';
import 'package:test/test.dart';

/// The lines a person pastes to connect an assistant (doc/mcp-server.md §2).
/// A typo here fails on someone else's computer with nothing to debug, so the
/// shape is pinned. The Desktop entry was run through mcp-remote against
/// tool/serve.dart over the LAN before this was written (§16).
void main() {
  const connection = AssistantConnection(
    url: 'http://192.168.1.20:8123/mcp',
    token: 'tok-EN_123',
  );

  test('Claude Code gets one command with the URL and the bearer header', () {
    expect(
      connection.claudeCode,
      'claude mcp add --transport http aCelery http://192.168.1.20:8123/mcp '
      '--header "Authorization: Bearer tok-EN_123"',
    );
  });

  group('Claude Desktop', () {
    final config = jsonDecode(connection.claudeDesktop) as Map<String, dynamic>;
    final entry = config['mcpServers']['aCelery'] as Map<String, dynamic>;
    final args = (entry['args'] as List).cast<String>();

    test('runs mcp-remote against the phone', () {
      expect(entry['command'], 'npx');
      expect(args.take(3), ['-y', 'mcp-remote', 'http://192.168.1.20:8123/mcp']);
    });

    test('allows plain HTTP and does not fall back to SSE', () {
      // mcp-remote refuses http:// to anything but localhost without it.
      expect(args, contains('--allow-http'));
      expect(args.join(' '), contains('--transport http-only'));
    });

    test('keeps the key out of the arguments', () {
      expect(args.join(' '), isNot(contains('tok-EN_123')));
      expect(args.sublist(args.indexOf('--header')),
          ['--header', r'Authorization:${AUTH_HEADER}']);
      expect(entry['env'], {'AUTH_HEADER': 'Bearer tok-EN_123'});
    });
  });

  group('pickLanAddress', () {
    ({String interface, String address}) c(String i, String a) =>
        (interface: i, address: a);

    test('prefers Wi-Fi over mobile data', () {
      // Android lists rmnet (mobile data) as well, often first, and its
      // address can be private too.
      expect(
        pickLanAddress([
          c('rmnet_data0', '10.140.22.7'),
          c('wlan0', '192.168.1.20'),
        ]),
        '192.168.1.20',
      );
    });

    test('takes a macOS or wired interface by name', () {
      expect(pickLanAddress([c('utun4', '100.96.0.3'), c('en0', '192.168.100.125')]),
          '192.168.100.125');
      expect(pickLanAddress([c('eth0', '10.0.2.15')]), '10.0.2.15');
    });

    test('falls back to a private address, then to anything', () {
      expect(pickLanAddress([c('tun0', '100.64.1.1'), c('bridge100', '172.20.10.2')]),
          '172.20.10.2');
      expect(pickLanAddress([c('tun0', '100.64.1.1')]), '100.64.1.1');
      expect(pickLanAddress([]), isNull);
    });
  });
}
