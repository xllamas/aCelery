import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../acelery_runtime.dart';
import '../mcp/app_runs.dart';
import 'acelery_web_view.dart';
import 'home_shortcuts.dart';
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

  /// A route that knows which app it runs, so a home screen shortcut to the
  /// app already on screen can leave it be.
  static Route<void> route({
    required ACeleryRuntime runtime,
    required String title,
    required String app,
    required bool debug,
  }) {
    return MaterialPageRoute<void>(
      settings: RouteSettings(name: routeName(app)),
      builder: (_) => UserAppScreen(
        runtime: runtime,
        title: title,
        app: app,
        debug: debug,
      ),
    );
  }

  static String routeName(String app) => 'app:$app';

  final ACeleryRuntime runtime;
  final String title;
  final String app;

  /// The IDE passes true when launching from a project, which is what put the
  /// error log in the menu.
  final bool debug;

  @override
  State<UserAppScreen> createState() => _UserAppScreenState();
}

enum _MenuAction { reload, errorLog, addShortcut, close }

class _UserAppScreenState extends State<UserAppScreen> {
  final GlobalKey<ACeleryWebViewState> _webViewKey = GlobalKey();
  late final HostActions _actions = HostActions(widget.runtime);

  ACeleryWebViewState? get _webView => _webViewKey.currentState;

  /// What this screen's app is doing, for the MCP run tools. Begun when the
  /// WebView exists, so a start that fails at once is still recorded.
  AppRun? _run;

  AppRuns get _runs => widget.runtime.server.runs;

  void _beginRun(WebViewController controller) {
    _run = _runs.begin(
      widget.app,
      controller.runJavaScript,
      // iOS composites WKWebView natively, outside anything Flutter can draw
      // into an image, so a boundary there would capture a blank page.
      snapshot: Platform.isAndroid ? _snapshot : null,
    );
  }

  /// The page's background, behind the system's navigation bar. White, like
  /// the WebView, until capture.js reports one.
  Color _chromeColor = Colors.white;
  bool _chromeDark = false;

  final GlobalKey _boundaryKey = GlobalKey();

  /// The longer side of a screenshot, in pixels.
  static const double _maxShotSide = 1280;

  /// Draws the WebView through a [RepaintBoundary] (doc/mcp-server.md §13.4).
  Future<AppSnapshot?> _snapshot() async {
    // Two Flutter frames, so the WebView's newest texture has been composited
    // into the layer the boundary draws.
    for (var i = 0; i < 2; i++) {
      WidgetsBinding.instance.scheduleFrame();
      await WidgetsBinding.instance.endOfFrame;
    }
    if (!mounted) return null;
    final boundary = _boundaryKey.currentContext?.findRenderObject();
    if (boundary is! RenderRepaintBoundary) return null;
    final size = boundary.size;
    final longest = size.longestSide;
    if (longest == 0) return null;
    final ratio = MediaQuery.devicePixelRatioOf(context)
        .clamp(0.1, _maxShotSide / longest);
    final image = await boundary.toImage(pixelRatio: ratio);
    try {
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      if (png == null) return null;
      return AppSnapshot(
        png: png.buffer.asUint8List(),
        width: image.width,
        height: image.height,
      );
    } finally {
      image.dispose();
    }
  }

  @override
  void dispose() {
    final run = _run;
    if (run != null) _runs.end(run);
    super.dispose();
  }

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
          UserAppScreen.route(
            runtime: widget.runtime,
            title: message.title,
            app: message.app,
            debug: message.debug,
          ),
        );
      case OpenExternalMessage():
        await showBusy(context, _actions.openExternal(Uri.parse(message.url)));
      case ConsoleMessage(
        :final level,
        :final text,
        :final stack,
        :final source,
      ):
        _run?.log(level, text, stack: stack, source: source);
      case ConsoleDroppedMessage(:final count):
        _run?.dropped += count;
      case AppStartedMessage():
        _run?.reportStarted();
      case AppFailedMessage(:final title, :final detail):
        _run?.reportFailed(title, detail);
      case EvalResultMessage(:final id, :final ok, :final value, :final error):
        _run?.resolveEval(
          id,
          ok
              ? EvalResult.value(value ?? 'undefined')
              : EvalResult.error(error ?? 'unknown error'),
        );
      case SetChromeMessage(:final dark, :final color):
        // capture.js measures the page's background; the strip kept clear of
        // the gesture bar is painted to match.
        if (!mounted) return;
        setState(() {
          _chromeDark = dark;
          if (color != null) _chromeColor = Color(color);
        });
      case ImportProjectMessage():
      // The system shell's Settings messages. A user app has no business
      // opening the network sheet or holding a wakelock, so they do nothing
      // here even though the channel will carry them.
      case ShowNetworkAccessMessage():
      case AddShortcutMessage():
      case SetKeepAwakeMessage():
        break;
    }
  }

  Future<void> _onMenu(_MenuAction action) async {
    switch (action) {
      case _MenuAction.reload:
        final controller = _webView?.controller;
        if (controller == null) return;
        // A reload is a fresh start, with a console of its own.
        final previous = _run;
        if (previous != null) _runs.end(previous);
        _beginRun(controller);
        await controller.reload();
      case _MenuAction.errorLog:
        await _webView?.controller.loadRequest(widget.runtime.errorLogUrl);
      case _MenuAction.addShortcut:
        if (mounted) await addToHomeScreen(context, widget.runtime, widget.app);
      case _MenuAction.close:
        if (mounted) Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Android 15 draws every app edge to edge, so without the SafeArea the page
    // ran on under the gesture bar and its bottom row could not be tapped.
    // Only the navigation bar is styled here: the AppBar's own region decides
    // the status bar.
    final navigation = _chromeDark
        ? SystemUiOverlayStyle.light
        : SystemUiOverlayStyle.dark;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: navigation.copyWith(
        systemNavigationBarColor: _chromeColor,
        systemNavigationBarDividerColor: Colors.transparent,
      ),
      child: _scaffold(context),
    );
  }

  Widget _scaffold(BuildContext context) {
    return Scaffold(
      backgroundColor: _chromeColor,
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
              if (HomeShortcuts.supported)
                const PopupMenuItem(
                    value: _MenuAction.addShortcut,
                    child: Text('Add to home screen')),
              const PopupMenuItem(
                  value: _MenuAction.close, child: Text('Close')),
            ],
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: RepaintBoundary(
          key: _boundaryKey,
          child: ACeleryWebView(
            key: _webViewKey,
            initialUrl: widget.runtime.launcherUrl(widget.app),
            onMessage: _onMessage,
            onControllerReady: _beginRun,
            onConsole: (level, message) {
              if (level == 'error') _run?.reportPlatformUncaught(message);
            },
          ),
        ),
      ),
    );
  }
}
