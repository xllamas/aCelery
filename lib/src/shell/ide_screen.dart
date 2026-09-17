import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../acelery_runtime.dart';
import '../mcp/app_runs.dart';
import '../mcp/tool.dart';
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

    // The IDE is the root route, so it is what a home screen shortcut opens
    // an app on top of, including the shortcut that started aCelery.
    widget.runtime.shortcuts
      ..listen(onOpen: _openFromShortcut, onPinned: _onShortcutPinned)
      ..sync();

    // And what an assistant's run_app opens apps on (doc/mcp-server.md §7 P4).
    widget.runtime.server.runs.screen = _screen;
  }

  late final _IdeAppScreen _screen = _IdeAppScreen(this);

  @override
  void dispose() {
    final runs = widget.runtime.server.runs;
    if (identical(runs.screen, _screen)) runs.screen = null;
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
    // Leaving for the home screen is when a deleted app's shortcut would next
    // be seen, so grey it out now.
    if (state == AppLifecycleState.paused) {
      widget.runtime.shortcuts.sync();
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
      case AddShortcutMessage(:final app):
        await addToHomeScreen(context, widget.runtime, app);
      case SetKeepAwakeMessage(:final on):
        await WakelockPlus.toggle(enable: on);
      case SetChromeMessage(:final dark, :final color):
        if (!mounted) return;
        setState(() {
          _chromeDark = dark;
          if (color != null) _chromeColor = Color(color);
        });
      case CloseAppMessage():
      // The IDE itself has nowhere to close to, and only launcher.html
      // reports a console or a start.
      case ConsoleMessage():
      case ConsoleDroppedMessage():
      case AppStartedMessage():
      case AppFailedMessage():
      case EvalResultMessage():
        break;
    }
  }

  Future<void> _runApp(RunAppMessage message) async {
    await _webView?.forceSaveFile();
    if (!mounted) return;
    await Navigator.of(context).push(
      UserAppScreen.route(
        runtime: widget.runtime,
        title: message.title,
        app: message.app,
        debug: message.debug,
      ),
    );
    // The app may have created databases or files; let the IDE catch up. The
    // shell's route is in the URL, so the reload lands where you were.
    await _webView?.controller.reload();
  }

  /// A home screen shortcut was tapped: run [app] over the IDE, closing
  /// whatever app was open, as the 2014 shortcut's own Activity did.
  Future<void> _openFromShortcut(String app) async {
    if (!mounted) return;
    final shortcuts = widget.runtime.shortcuts;
    if (!shortcuts.exists(app)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('$app no longer exists')));
      await shortcuts.sync();
      return;
    }

    // Already on screen: reloading it would throw away where the user was.
    if (_showing() == UserAppScreen.routeName(app)) return;
    _openApp(app);
  }

  /// The name of the route on top.
  String? _showing() {
    String? name;
    Navigator.of(context).popUntil((route) {
      name = route.settings.name;
      return true;
    });
    return name;
  }

  /// Shows [app] over the IDE, closing whatever app was open. Returns once
  /// the route is pushed, not when it closes.
  void _openApp(String app) {
    Navigator.of(context).popUntil((route) => route.isFirst);
    unawaited(_runApp(RunAppMessage(title: app, app: app, debug: false)));
  }

  /// Back to the IDE, closing any app that is open.
  void _closeApps() {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _onShortcutPinned(String app) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Added $app to your home screen')));
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

/// [AppScreen] for the MCP run tools, backed by the IDE's navigator.
class _IdeAppScreen implements AppScreen {
  _IdeAppScreen(this._ide);

  final _IdeScreenState _ide;

  @override
  Future<void> open(String app) async {
    if (!_ide.mounted) throw ToolFailure('aCelery\'s screen has closed');
    _ide._openApp(app);
  }

  @override
  Future<void> close() async {
    if (_ide.mounted) _ide._closeApps();
  }
}
