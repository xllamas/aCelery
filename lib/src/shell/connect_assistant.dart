import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../mcp/connect.dart';
import '../server/acelery_server.dart';

/// "Connect an assistant": name a key, mint it, and show how to use it once
/// (doc/mcp-server.md §4).
///
/// Returns true when a key was minted, so the caller can refresh its list.
Future<bool> connectAssistant(
  BuildContext context,
  ACeleryServer server,
) async {
  final label = await _askForName(context);
  if (label == null || !context.mounted) return false;

  final token = await server.access.mintClient(label: label);
  final shared = server.access.sharedOnNetwork;
  final address = shared ? await lanAddress() : null;
  if (!context.mounted) return true;

  await _showKey(
    context,
    connection: AssistantConnection(
      // With sharing off the only way in is loopback, which from a computer
      // means `adb forward` — a developer's route, and labelled as one.
      url: 'http://${address ?? 'localhost'}:${server.boundPort}/mcp',
      token: token,
    ),
    label: label,
    reachable: shared && address != null,
    shared: shared,
  );
  return true;
}

/// The name shown in the device list, so the right key can be revoked later.
Future<String?> _askForName(BuildContext context) {
  final controller = TextEditingController(text: 'Assistant');
  controller.selection =
      TextSelection(baseOffset: 0, extentOffset: controller.text.length);

  void submit(BuildContext context) {
    final name = controller.text.trim();
    Navigator.of(context).pop(name.isEmpty ? 'Assistant' : name);
  }

  return showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Connect an assistant'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This creates a key an AI assistant on your computer uses to '
            'build and edit apps here. Name it after where it will be used.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: controller,
            autofocus: true,
            maxLength: 40,
            decoration: const InputDecoration(
              labelText: 'Name',
              hintText: 'Claude on my laptop',
            ),
            onSubmitted: (_) => submit(context),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => submit(context),
          child: const Text('Create key'),
        ),
      ],
    ),
  );
}

Future<void> _showKey(
  BuildContext context, {
  required AssistantConnection connection,
  required String label,
  required bool reachable,
  required bool shared,
}) {
  const mono = TextStyle(fontFamily: 'monospace', fontSize: 12);

  Widget copyable(String title, String value, {String? help}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              // No snackbar: behind the dialog it is never seen, and Android
              // shows its own confirmation of a copy.
              IconButton(
                icon: const Icon(Icons.copy, size: 20),
                tooltip: 'Copy $title',
                onPressed: () =>
                    Clipboard.setData(ClipboardData(text: value)),
              ),
            ],
          ),
          if (help != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(help, style: const TextStyle(fontSize: 12)),
            ),
          SelectableText(value, style: mono),
          const SizedBox(height: 16),
        ],
      );

  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(label),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!reachable)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  shared
                      ? 'This phone is not on a network, so a computer cannot '
                          'reach it yet. Join Wi-Fi, then open Network access '
                          'again to see its address.'
                      : 'Turn on "Share on this network" so a computer on the '
                          'same Wi-Fi can reach this phone. Until then the '
                          'address below works only over a USB cable with '
                          'adb forward.',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            copyable('Address', connection.url),
            copyable('Key', connection.token),
            copyable('Claude Code', connection.claudeCode,
                help: 'Run this in a terminal on your computer.'),
            copyable('Claude Desktop', connection.claudeDesktop,
                help: 'Add this to claude_desktop_config.json (Settings → '
                    'Developer → Edit Config), then restart Claude. Needs '
                    'Node.js on the computer.'),
            const Text(
              'The key is shown only now. Anyone holding it can read and '
              'change your apps and databases, and it travels unencrypted '
              'on your Wi-Fi, so use it on a network you trust and revoke '
              'it here when you are done.',
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
