import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../acelery_runtime.dart';
import '../server/access_control.dart';
import 'acelery_web_view.dart';
import 'host_actions.dart';
import 'host_bridge.dart';
import 'network_access_sheet.dart';
import 'user_app_screen.dart';

/// Replaces `ACeleryActivity`: the IDE.
///
/// The options menu that sat on it — Main, My Apps, Network access, Keep screen
/// on, About, Website — has gone, along with the AppBar that carried it. The
/// page draws its own navigation and a Settings screen, and asks the host for
/// the things only the host can do (doc/shell-redesign.md §7). Two title bars
/// and two overflow menus took about 112 px of a phone before any content.
class IdeScreen extends StatefulWidget {
  const IdeScreen({super.key, required this.runtime});

  final ACeleryRuntime runtime;

  @override
  State<IdeScreen> createState() => _IdeScreenState();
}

class _IdeScreenState extends State<IdeScreen> with WidgetsBindingObserver {
  final GlobalKey<ACeleryWebViewState> _webViewKey = GlobalKey();
  late final HostActions _actions = HostActions(widget.runtime);

  /// What the page reports for its top edge, painted behind the status bar and
  /// the system navigation bar. White until the page says otherwise, which is
  /// also the WebView's own background.
  Color _chromeColor = Colors.white;
  bool _chromeDark = false;

  ACeleryWebViewState? get _webView => _webViewKey.currentState;

  StreamSubscription<PendingPairing>? _pairings;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // A device on the network asking to connect has to interrupt: it is
    // waiting on a decision only the person holding the phone can make.
    _pairings = widget.runtime.server.access.requests.listen(_onPairingRequest);
  }

  @override
  void dispose() {
    _pairings?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _onPairingRequest(PendingPairing pairing) async {
    if (!mounted || pairing.isSettled) return;
    final allowed = await showPairingRequest(context, pairing);
    // The user may have taken a while; if the request expired or was answered
    // elsewhere in the meantime, leave it alone.
    if (pairing.isSettled) return;
    final access = widget.runtime.server.access;
    if (allowed) {
      await access.approve(pairing.id);
    } else {
      await access.deny(pairing.id);
    }
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
      case ShowNetworkAccessMessage():
        await _showNetworkAccess();
      case SetKeepAwakeMessage(:final on):
        await WakelockPlus.toggle(enable: on);
      case SetChromeMessage(:final dark, :final color):
        if (!mounted) return;
        setState(() {
          _chromeDark = dark;
          if (color != null) _chromeColor = Color(color);
        });
      case CloseAppMessage():
        // The IDE itself has nowhere to close to.
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
    // The app may have created databases or files; let the IDE catch up. The
    // shell's route is in the URL, so the reload lands where you were.
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

  /// `getMyIP`, grown into the setting §2 item 5 asks for.
  ///
  /// The original only ever reported an address, because the server was always
  /// listening on it. Now that sharing is opt-in there is something to decide,
  /// and something to review: which devices were let in, and a way to change
  /// your mind about them.
  Future<void> _showNetworkAccess() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => NetworkAccessSheet(server: widget.runtime.server),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Light icons over a dark page, dark icons over a light one.
    final overlay =
        _chromeDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        // Back walks the page history first, exactly as the WebView did. The
        // shell pushes a history entry per level, so this steps out of the
        // editor, then the project, then the list.
        await _webView?.forceSaveFile();
        final controller = _webView?.controller;
        if (controller != null && await controller.canGoBack()) {
          await controller.goBack();
          return;
        }
        if (context.mounted) Navigator.of(context).maybePop();
      },
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: overlay.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: _chromeColor,
        ),
        child: Scaffold(
          backgroundColor: _chromeColor,
          // Both edges: the page pads for env(safe-area-inset-*) too, but a
          // WebView is not guaranteed to report insets, and a bottom nav under
          // the gesture bar is unusable.
          body: SafeArea(
            child: ACeleryWebView(
              key: _webViewKey,
              initialUrl: widget.runtime.ideUrl,
              onMessage: _onMessage,
            ),
          ),
        ),
      ),
    );
  }
}
