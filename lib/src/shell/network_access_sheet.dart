import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../server/acelery_server.dart';
import '../server/access_control.dart';

/// Turning network sharing on, and seeing who is on it.
///
/// This is the switch `doc/modernization-assessment.md` §2 item 5 asks for.
/// It lives on the host rather than in the web IDE because binding a socket is
/// the host's business — and because a setting that governs who may reach the
/// web IDE should not itself be reachable through it.
class NetworkAccessSheet extends StatefulWidget {
  const NetworkAccessSheet({super.key, required this.server});

  final ACeleryServer server;

  @override
  State<NetworkAccessSheet> createState() => _NetworkAccessSheetState();
}

class _NetworkAccessSheetState extends State<NetworkAccessSheet> {
  bool _busy = false;
  String? _address;

  AccessControl get _access => widget.server.access;

  @override
  void initState() {
    super.initState();
    _findAddress();
  }

  Future<void> _findAddress() async {
    final interfaces = await NetworkInterface.list(
      type: InternetAddressType.IPv4,
      includeLoopback: false,
    );
    final address = interfaces
        .expand((i) => i.addresses)
        .map((a) => a.address)
        .firstOrNull;
    if (mounted) setState(() => _address = address);
  }

  Future<void> _setShared(bool shared) async {
    setState(() => _busy = true);
    // Rebinding the socket is a stop and a start, so the switch is disabled
    // while it happens rather than letting a second tap race the first.
    await widget.server.setSharedOnNetwork(shared);
    if (mounted) setState(() => _busy = false);
  }

  /// Mints a client token and shows it, once, to copy into an assistant.
  Future<void> _connectAssistant() async {
    final token = await _access.mintClient();
    if (!mounted) return;
    setState(() {});
    // With sharing off the only way in is loopback, which on a phone means
    // `adb forward` from a computer.
    final host = _access.sharedOnNetwork && _address != null
        ? _address!
        : 'localhost';
    await showAssistantToken(
      context,
      url: 'http://$host:${widget.server.boundPort}/mcp',
      token: token,
    );
  }

  Future<void> _revoke(PairedDevice device) async {
    await _access.revoke(device.token);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final shared = _access.sharedOnNetwork;
    final devices = _access.devices;
    final port = widget.server.boundPort;

    return SafeArea(
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          ListTile(
            title: Text('Network access',
                style: Theme.of(context).textTheme.titleLarge),
          ),
          SwitchListTile(
            value: shared,
            onChanged: _busy ? null : _setShared,
            title: const Text('Share on this network'),
            subtitle: Text(
              shared
                  ? 'Other devices can ask to connect. Each one needs your '
                      'approval before it sees anything.'
                  : 'aCelery is only listening on this device.',
            ),
          ),
          if (shared)
            ListTile(
              leading: const Icon(Icons.link),
              title: Text(
                _address == null
                    ? 'Not on a network'
                    : 'http://$_address:$port',
              ),
              subtitle: const Text(
                'Open this in a browser on another device on the same network.',
              ),
            ),
          ListTile(
            leading: const Icon(Icons.smart_toy_outlined),
            title: const Text('Connect an assistant'),
            subtitle: const Text(
              'Creates a key an AI assistant uses to build and edit apps here.',
            ),
            onTap: _connectAssistant,
          ),
          const Divider(),
          ListTile(
            dense: true,
            title: Text(
              devices.isEmpty
                  ? 'No devices approved'
                  : 'Approved devices (${devices.length})',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            trailing: devices.isEmpty
                ? null
                : TextButton(
                    onPressed: () async {
                      await _access.revokeAll();
                      if (mounted) setState(() {});
                    },
                    child: const Text('Revoke all'),
                  ),
          ),
          for (final device in devices)
            ListTile(
              leading: Icon(device.kind == DeviceKind.client
                  ? Icons.smart_toy_outlined
                  : Icons.devices),
              title: Text(device.label ?? device.address),
              subtitle: Text(switch (device) {
                PairedDevice(kind: DeviceKind.client)
                    when device.lastSeen == device.pairedAt =>
                  'Not connected yet',
                PairedDevice(kind: DeviceKind.client) =>
                  '${device.address} · last seen ${_ago(device.lastSeen)}',
                _ => 'Last seen ${_ago(device.lastSeen)}',
              }),
              trailing: IconButton(
                icon: const Icon(Icons.close),
                tooltip: 'Revoke',
                onPressed: () => _revoke(device),
              ),
            ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  static String _ago(DateTime when) {
    final gap = DateTime.now().difference(when);
    if (gap.inMinutes < 1) return 'just now';
    if (gap.inHours < 1) return '${gap.inMinutes} min ago';
    if (gap.inDays < 1) return '${gap.inHours} h ago';
    return '${gap.inDays} d ago';
  }
}

/// Shows a freshly minted client token, the only time it is shown.
Future<void> showAssistantToken(
  BuildContext context, {
  required String url,
  required String token,
}) {
  final command = 'claude mcp add --transport http aCelery $url '
      '--header "Authorization: Bearer $token"';
  const mono = TextStyle(fontFamily: 'monospace', fontSize: 13);

  Widget copyable(String label, String value) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(label)),
              IconButton(
                icon: const Icon(Icons.copy, size: 20),
                tooltip: 'Copy',
                onPressed: () => Clipboard.setData(ClipboardData(text: value)),
              ),
            ],
          ),
          SelectableText(value, style: mono),
          const SizedBox(height: 12),
        ],
      );

  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Connect an assistant'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            copyable('Address', url),
            copyable('Key', token),
            copyable('For Claude Code', command),
            const Text(
              'This key is shown once. Anyone holding it can read and change '
              'your apps and databases, so revoke it here when you are done.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
      actions: [
        FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Done'),
        ),
      ],
    ),
  );
}

/// The prompt a device's request raises.
///
/// Shows the peer's address and the code the waiting browser is displaying, so
/// that approving one of two simultaneous requests cannot approve the other.
Future<bool> showPairingRequest(
  BuildContext context,
  PendingPairing pairing,
) async {
  final allowed = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => AlertDialog(
      title: const Text('Allow this device?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${pairing.address} wants to use aCelery.'),
          const SizedBox(height: 16),
          const Text('It should be showing this code:'),
          const SizedBox(height: 8),
          Center(
            child: Text(
              pairing.code,
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 8,
                fontFamily: 'monospace',
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Allowing it gives that device your databases and files.',
            style: TextStyle(fontSize: 12),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Deny'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Allow'),
        ),
      ],
    ),
  );
  return allowed ?? false;
}
