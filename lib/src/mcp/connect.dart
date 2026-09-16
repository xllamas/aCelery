import 'dart:convert';
import 'dart:io';

/// What to tell an assistant so it can reach `/mcp` — the text the Network
/// access sheet shows and `tool/serve.dart --mint-token` prints
/// (doc/mcp-server.md §2, §4).
///
/// Built here rather than in the sheet so the lines people paste into a
/// terminal or a config file are tested, and cannot differ between the app
/// and the desktop harness.
class AssistantConnection {
  const AssistantConnection({required this.url, required this.token});

  /// `http://<address>:<port>/mcp`.
  final String url;
  final String token;

  /// The server name clients list the tools under.
  static const String serverName = 'aCelery';

  /// For Claude Code, which connects from the computer itself.
  String get claudeCode => 'claude mcp add --transport http $serverName $url '
      '--header "Authorization: Bearer $token"';

  /// For Claude Desktop, whose config accepts only local programs, so
  /// `mcp-remote` runs locally and speaks HTTP to the phone.
  ///
  /// - `--allow-http`: mcp-remote refuses plain HTTP to anything but localhost
  ///   without it, and a phone on a home network has no certificate.
  /// - `--transport http-only`: aCelery has no SSE endpoint, so a fallback
  ///   would only hide the real error.
  /// - The token travels in `env`, not in `args`. Other users on the computer
  ///   can read process arguments, and some clients split arguments at spaces;
  ///   mcp-remote expands `${AUTH_HEADER}` itself.
  String get claudeDesktop => const JsonEncoder.withIndent('  ').convert({
        'mcpServers': {
          serverName: {
            'command': 'npx',
            'args': [
              '-y',
              'mcp-remote',
              url,
              '--allow-http',
              '--transport',
              'http-only',
              '--header',
              r'Authorization:${AUTH_HEADER}',
            ],
            'env': {'AUTH_HEADER': 'Bearer $token'},
          },
        },
      });
}

/// This device's address on the local network, or null when it has none.
///
/// A phone has several interfaces — Wi-Fi, mobile data, sometimes a VPN — and
/// only the Wi-Fi one is reachable from a computer beside it. Taking the first
/// address, as the sheet used to, could offer the mobile-data address, which
/// nothing on the Wi-Fi can reach.
Future<String?> lanAddress() async {
  final interfaces = await NetworkInterface.list(
    type: InternetAddressType.IPv4,
    includeLoopback: false,
  );
  return pickLanAddress([
    for (final i in interfaces)
      for (final a in i.addresses)
        if (!a.isLoopback) (interface: i.name, address: a.address),
  ]);
}

/// The choice [lanAddress] makes, separated so it can be tested.
///
/// Preference: a Wi-Fi or wired interface by name, then any private address,
/// then whatever there is.
String? pickLanAddress(List<({String interface, String address})> candidates) {
  bool named(String name) =>
      RegExp(r'^(wlan|wifi|en|eth|ap)\d*', caseSensitive: false)
          .hasMatch(name);
  bool private(String address) =>
      address.startsWith('10.') ||
      address.startsWith('192.168.') ||
      RegExp(r'^172\.(1[6-9]|2\d|3[01])\.').hasMatch(address);

  for (final c in candidates) {
    if (named(c.interface) && private(c.address)) return c.address;
  }
  for (final c in candidates) {
    if (private(c.address)) return c.address;
  }
  return candidates.firstOrNull?.address;
}
