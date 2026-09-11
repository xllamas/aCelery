import 'dart:io';

import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../acelery_runtime.dart';
import 'acelery_web_view.dart';
import 'host_actions.dart';
import 'host_bridge.dart';
import 'user_app_screen.dart';

/// Replaces `ACeleryActivity`: the IDE, plus the options menu that sat on it.
class IdeScreen extends StatefulWidget {
  const IdeScreen({super.key, required this.runtime});

  final ACeleryRuntime runtime;

  @override
  State<IdeScreen> createState() => _IdeScreenState();
}

enum _MenuAction { main, myApps, getIp, noSleep, about, website }

class _IdeScreenState extends State<IdeScreen> with WidgetsBindingObserver {
  final GlobalKey<ACeleryWebViewState> _webViewKey = GlobalKey();
  late final HostActions _actions = HostActions(widget.runtime);
  bool _noSleep = false;

  ACeleryWebViewState? get _webView => _webViewKey.currentState;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // `ACeleryActivity.onPause` flushed the editor before going away.
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _webView?.forceSaveFile();
    }
  }

  Future<void> _onMessage(HostMessage message) async {
    switch (message) {
      case RunAppMessage():
        await _runApp(message);
      case DownloadMessage():
        await showBusy(context, _actions.download(Uri.parse(message.url)));
      case ImportProjectMessage():
        await _importProject();
      case OpenExternalMessage():
        await showBusy(context, _actions.openExternal(Uri.parse(message.url)));
      case CloseAppMessage():
        // The IDE itself has nowhere to close to; the original's Exit menu
        // item is what leaves, and that is handled below.
        break;
    }
  }

  Future<void> _runApp(RunAppMessage message) async {
    await _webView?.forceSaveFile();
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => UserAppScreen(
          runtime: widget.runtime,
          title: message.title,
          app: message.app,
          debug: message.debug,
        ),
      ),
    );
    // The app may have created databases or files; let the IDE catch up.
    await _webView?.controller.reload();
  }

  Future<void> _importProject() async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final name = await _actions.importProject();
      if (!mounted) return;
      if (name == null) return;
      messenger.showSnackBar(SnackBar(content: Text('Imported $name')));
      await _webView?.controller.reload();
    } on Exception catch (error) {
      messenger.showSnackBar(SnackBar(content: Text('Import failed: $error')));
    }
  }

  Future<void> _onMenu(_MenuAction action) async {
    switch (action) {
      case _MenuAction.main:
        await _webView?.controller.loadRequest(widget.runtime.ideUrl);
      case _MenuAction.myApps:
        await _webView?.controller.loadRequest(widget.runtime.myAppsUrl);
      case _MenuAction.getIp:
        await _showIpAddress();
      case _MenuAction.noSleep:
        await _toggleNoSleep();
      case _MenuAction.about:
        await _showAbout();
      case _MenuAction.website:
        await showBusy(
          context,
          _actions.openExternal(Uri.parse('http://www.acelery.com/')),
        );
    }
  }

  /// `getMyIP` — the address another device would point a browser at.
  ///
  /// The server now binds to loopback by default, so this reports whether LAN
  /// access is actually available rather than implying that it is.
  Future<void> _showIpAddress() async {
    if (!widget.runtime.server.isSharedOnNetwork) {
      await _showMessage(
        'Network access',
        'The server is only listening on this device.\n\n'
        'The original app served every network interface by default, which '
        'exposed its database and file APIs to anyone on the same network. '
        'Turn network sharing on deliberately when you want it.',
      );
      return;
    }

    final addresses = await NetworkInterface.list(
      type: InternetAddressType.IPv4,
      includeLoopback: false,
    );
    final ip = addresses
        .expand((interface) => interface.addresses)
        .map((address) => address.address)
        .firstOrNull;

    await _showMessage(
      'Network access',
      ip == null
          ? 'No network address available.'
          : 'Point a browser at:\n\nhttp://$ip:${widget.runtime.server.boundPort}',
    );
  }

  /// `noSleep` — the original held a PARTIAL_WAKE_LOCK so its background
  /// Service kept serving. There is no Service any more, so this keeps the
  /// screen awake while the app is in front instead; it does not keep the
  /// server running once aCelery is backgrounded.
  Future<void> _toggleNoSleep() async {
    final enable = !_noSleep;
    await WakelockPlus.toggle(enable: enable);
    if (!mounted) return;
    setState(() => _noSleep = enable);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(enable ? 'Screen will stay on' : 'Screen may sleep'),
      ),
    );
  }

  Future<void> _showAbout() => _showMessage(
        'aCelery',
        'Build and run your own JavaScript apps.\n\n'
        'Serving ${widget.runtime.server.baseUri}',
      );

  Future<void> _showMessage(String title, String body) {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        // Back walks the page history first, exactly as the WebView did.
        await _webView?.forceSaveFile();
        final controller = _webView?.controller;
        if (controller != null && await controller.canGoBack()) {
          await controller.goBack();
          return;
        }
        if (context.mounted) Navigator.of(context).maybePop();
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('aCelery'),
          actions: [
            PopupMenuButton<_MenuAction>(
              onSelected: _onMenu,
              itemBuilder: (context) => [
                const PopupMenuItem(value: _MenuAction.main, child: Text('Main')),
                const PopupMenuItem(
                    value: _MenuAction.myApps, child: Text('My Apps')),
                const PopupMenuItem(
                    value: _MenuAction.getIp, child: Text('Network access')),
                CheckedPopupMenuItem(
                  value: _MenuAction.noSleep,
                  checked: _noSleep,
                  child: const Text('Keep screen on'),
                ),
                const PopupMenuItem(
                    value: _MenuAction.about, child: Text('About')),
                const PopupMenuItem(
                    value: _MenuAction.website, child: Text('Website')),
              ],
            ),
          ],
        ),
        body: ACeleryWebView(
          key: _webViewKey,
          initialUrl: widget.runtime.ideUrl,
          onMessage: _onMessage,
        ),
      ),
    );
  }
}
