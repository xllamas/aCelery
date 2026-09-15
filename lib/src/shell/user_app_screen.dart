import 'package:flutter/material.dart';

import '../acelery_runtime.dart';
import 'acelery_web_view.dart';
import 'host_actions.dart';
import 'host_bridge.dart';

/// Replaces `ACeleryUserAppActivity`: one of the user's own apps, running in
/// its own WebView on top of the IDE.
///
/// The original started a second Activity and relied on the task stack to get
/// back; this is a pushed route, so Back returns to the IDE naturally.
class UserAppScreen extends StatefulWidget {
  const UserAppScreen({
    super.key,
    required this.runtime,
    required this.title,
    required this.app,
    required this.debug,
  });

  final ACeleryRuntime runtime;
  final String title;
  final String app;

  /// The IDE passes true when launching from a project, which is what put the
  /// error log in the menu.
  final bool debug;

  @override
  State<UserAppScreen> createState() => _UserAppScreenState();
}

enum _MenuAction { reload, errorLog, close }

class _UserAppScreenState extends State<UserAppScreen> {
  final GlobalKey<ACeleryWebViewState> _webViewKey = GlobalKey();
  late final HostActions _actions = HostActions(widget.runtime);

  ACeleryWebViewState? get _webView => _webViewKey.currentState;

  Future<void> _onMessage(HostMessage message) async {
    switch (message) {
      case CloseAppMessage():
        // xCloseApp: the Exit item a user app puts in its own menu.
        if (mounted) Navigator.of(context).maybePop();
      case DownloadMessage():
        await showBusy(context, _actions.download(Uri.parse(message.url)));
      case RunAppMessage():
        // A user app launching another one replaces this route rather than
        // stacking indefinitely.
        if (!mounted) return;
        await Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) => UserAppScreen(
              runtime: widget.runtime,
              title: message.title,
              app: message.app,
              debug: message.debug,
            ),
          ),
        );
      case OpenExternalMessage():
        await showBusy(context, _actions.openExternal(Uri.parse(message.url)));
      case ImportProjectMessage():
      // The system shell's Settings messages. A user app has no business
      // opening the network sheet or holding a wakelock, so they do nothing
      // here even though the channel will carry them.
      case ShowNetworkAccessMessage():
      case SetKeepAwakeMessage():
      case SetChromeMessage():
        break;
    }
  }

  Future<void> _onMenu(_MenuAction action) async {
    switch (action) {
      case _MenuAction.reload:
        await _webView?.controller.reload();
      case _MenuAction.errorLog:
        await _webView?.controller.loadRequest(widget.runtime.errorLogUrl);
      case _MenuAction.close:
        if (mounted) Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('aCelery - ${widget.title}'),
        actions: [
          PopupMenuButton<_MenuAction>(
            onSelected: _onMenu,
            itemBuilder: (context) => [
              const PopupMenuItem(
                  value: _MenuAction.reload, child: Text('Reload')),
              if (widget.debug)
                const PopupMenuItem(
                    value: _MenuAction.errorLog, child: Text('Error log')),
              const PopupMenuItem(
                  value: _MenuAction.close, child: Text('Close')),
            ],
          ),
        ],
      ),
      body: ACeleryWebView(
        key: _webViewKey,
        initialUrl: widget.runtime.launcherUrl(widget.app),
        onMessage: _onMessage,
      ),
    );
  }
}
