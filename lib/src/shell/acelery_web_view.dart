import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'host_bridge.dart';

/// A WebView configured the way `ACeleryActivity` configured its own.
///
/// Both Activities set up an identical WebView; the only difference was the URL
/// and the menu, so this is shared by the IDE and by a running user app.
class ACeleryWebView extends StatefulWidget {
  const ACeleryWebView({
    super.key,
    required this.initialUrl,
    required this.onMessage,
    this.onControllerReady,
  });

  final Uri initialUrl;

  /// Receives the shim's one-way UI messages.
  final void Function(HostMessage message) onMessage;

  final void Function(WebViewController controller)? onControllerReady;

  @override
  State<ACeleryWebView> createState() => ACeleryWebViewState();
}

class ACeleryWebViewState extends State<ACeleryWebView> {
  late final WebViewController _controller;

  WebViewController get controller => _controller;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      // The IDE writes files as you type; a cached page would show stale ones.
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel(
        hostChannelName,
        onMessageReceived: (message) {
          final parsed = HostMessage.parse(message.message);
          if (parsed != null) widget.onMessage(parsed);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) => _controller.runJavaScript(hostShim),
          onNavigationRequest: _onNavigationRequest,
        ),
      );

    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      // `ACeleryActivity` logged every console message to logcat; keep that,
      // since a user's app has no other way to report a scripting error.
      platform.setOnConsoleMessage((message) {
        debugPrint('aCelery [${message.level.name}] ${message.message}');
      });
      // xAlertDialog falls back to window.alert when there is no Android
      // interface. An unhandled alert blocks the WebView permanently, so it
      // has to become a Flutter dialog.
      platform.setOnJavaScriptAlertDialog((request) async {
        await _showAlert(request.message);
      });
      platform.setOnJavaScriptConfirmDialog((request) async {
        return await _showConfirm(request.message) ?? false;
      });
      platform.setUseWideViewPort(true);
    }

    _controller.loadRequest(widget.initialUrl);
    widget.onControllerReady?.call(_controller);
  }

  FutureOr<NavigationDecision> _onNavigationRequest(NavigationRequest request) {
    return switch (decideNavigation(request.url)) {
      AllowNavigation() => NavigationDecision.navigate,
      DivertToHost(:final message) => () {
          widget.onMessage(message);
          return NavigationDecision.prevent;
        }(),
    };
  }

  Future<void> _showAlert(String message) {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<bool?> _showConfirm(String message) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  /// Flushes an unsaved editor buffer, as `onPause` did.
  Future<void> forceSaveFile() => _controller.runJavaScript(forceSaveFileScript);

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _controller);
}
