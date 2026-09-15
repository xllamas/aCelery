import 'dart:convert';

/// A one-way message from the page to the Flutter shell.
sealed class HostMessage {
  const HostMessage();

  static HostMessage? parse(String raw) {
    final Map<String, dynamic> json;
    try {
      json = jsonDecode(raw) as Map<String, dynamic>;
    } on FormatException {
      return null;
    }
    return switch (json['action']) {
      'runApp' => RunAppMessage(
          title: json['title'] as String? ?? '',
          app: json['app'] as String? ?? '',
          debug: json['debug'] == true,
        ),
      'closeApp' => const CloseAppMessage(),
      'download' => DownloadMessage(url: json['url'] as String? ?? ''),
      'importProject' => const ImportProjectMessage(),
      'showNetworkAccess' => const ShowNetworkAccessMessage(),
      'setKeepAwake' => SetKeepAwakeMessage(on: json['on'] == true),
      'setChrome' => SetChromeMessage(
          dark: json['dark'] == true,
          color: parseHexColor(json['color']),
        ),
      _ => null,
    };
  }
}

/// `#rrggbb` → an opaque ARGB value; null for anything else, including the
/// shorthand and alpha forms, which the page never sends.
int? parseHexColor(Object? value) {
  if (value is! String) return null;
  final match = RegExp(r'^#([0-9a-fA-F]{6})$').firstMatch(value);
  if (match == null) return null;
  return 0xFF000000 | int.parse(match.group(1)!, radix: 16);
}

/// Settings → Network access: open the sheet that decides which devices on
/// the network may reach the server.
class ShowNetworkAccessMessage extends HostMessage {
  const ShowNetworkAccessMessage();
}

/// Settings → Keep screen on.
class SetKeepAwakeMessage extends HostMessage {
  const SetKeepAwakeMessage({required this.on});

  final bool on;
}

/// The colour at the top of the page and whether it is dark, so the status
/// bar above it can match. The host owns that bar; `theme-color` does not
/// reach it (doc/shell-redesign.md §7).
class SetChromeMessage extends HostMessage {
  const SetChromeMessage({required this.dark, this.color});

  final bool dark;

  /// Opaque ARGB, or null if the page could not measure one.
  final int? color;
}

/// `xRunUserApp` — open one of the user's apps.
class RunAppMessage extends HostMessage {
  const RunAppMessage({
    required this.title,
    required this.app,
    required this.debug,
  });

  final String title;
  final String app;
  final bool debug;
}

/// `xCloseApp` — leave the running app and go back.
class CloseAppMessage extends HostMessage {
  const CloseAppMessage();
}

/// `xExportFile.get` / `xExportProject.get` — save a file out of the app.
class DownloadMessage extends HostMessage {
  const DownloadMessage({required this.url});

  final String url;
}

/// `xImportProject.get` — pick a project zip to import.
class ImportProjectMessage extends HostMessage {
  const ImportProjectMessage();
}

/// A link out of aCelery: open it in the system browser.
class OpenExternalMessage extends HostMessage {
  const OpenExternalMessage({required this.url});

  final String url;
}

/// The name of the JavaScript channel the shim posts to.
///
/// Deliberately *not* `Android`: registering that name would make xscript.js
/// take its in-WebView branch, where every data call expects a synchronous
/// return value that a Flutter channel cannot give (see plan §2). This channel
/// carries only fire-and-forget UI actions, which suit a one-way async
/// message fine.
const String hostChannelName = 'ACeleryHost';

/// JavaScript injected after every page load.
///
/// Four xScript entry points reach for the host rather than for data, and each
/// one's browser fallback is a dead end inside a Flutter WebView:
///
///  * `xRunUserApp` calls `window.open`, which needs a WebChromeClient window
///    callback that webview_flutter does not expose;
///  * `xCloseApp` calls `window.close`, a no-op on a top-level page;
///  * `xImportProject.get` has an empty else branch — importing is simply
///    unavailable without a host;
///  * the two `.get()` download helpers submit a form whose response carries
///    Content-Disposition, which a Flutter WebView cannot save.
///
/// Overriding them here keeps the bundle itself untouched, so the Bootstrap 5
/// swap in Phase 3 does not have to carry host-specific edits.
const String hostShim = '''
(function () {
  if (window.__aCeleryHostShim) return;
  window.__aCeleryHostShim = true;

  function post(payload) {
    $hostChannelName.postMessage(JSON.stringify(payload));
  }

  if (typeof xRunUserApp === 'function') {
    window.xRunUserApp = function (title, app, debug) {
      post({action: 'runApp', title: title, app: app, debug: !!debug});
    };
  }

  if (typeof xCloseApp === 'function') {
    window.xCloseApp = function () {
      post({action: 'closeApp'});
    };
  }

  if (typeof xExportFile === 'function') {
    xExportFile.prototype.get = function () {
      post({
        action: 'download',
        url: this.baseURL + 'opt=export&action=get&handle=' + this.handle
      });
    };
  }

  if (typeof xExportProject === 'function') {
    xExportProject.prototype.get = function () {
      post({
        action: 'download',
        url: this.baseURL + 'opt=exportproject&action=export&project=' +
             encodeURIComponent(this.project)
      });
    };
  }

  if (typeof xImportProject === 'function') {
    xImportProject.prototype.get = function () {
      post({action: 'importProject'});
    };
  }
})();
''';

/// What the shell should do with a navigation the page is attempting.
sealed class NavigationOutcome {
  const NavigationOutcome();
}

/// Let the WebView follow it.
class AllowNavigation extends NavigationOutcome {
  const AllowNavigation();
}

/// Block it and hand the URL to the host instead.
class DivertToHost extends NavigationOutcome {
  const DivertToHost(this.message);

  final HostMessage message;
}

/// Decides what to do with an attempted navigation.
///
/// The shim already redirects the download helpers, but a page can still reach
/// a `Content-Disposition` response directly — a user app that builds its own
/// form, or the remote-browser code path — and a Flutter WebView cannot save
/// one. External links are diverted too, so tapping a link in a user app opens
/// the system browser rather than replacing the app with a web page.
NavigationOutcome decideNavigation(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null) return const AllowNavigation();

  if (uri.scheme == 'http' || uri.scheme == 'https') {
    final isLocal = uri.host == 'localhost' || uri.host == '127.0.0.1';
    if (!isLocal) return DivertToHost(OpenExternalMessage(url: url));
  }

  if (uri.path.endsWith('android.itf')) {
    final opt = uri.queryParameters['opt'];
    final action = uri.queryParameters['action'];
    final isDownload = (opt == 'export' && action != 'set') ||
        (opt == 'exportproject' && action == 'export');
    if (isDownload) return DivertToHost(DownloadMessage(url: url));
  }

  return const AllowNavigation();
}

/// Asks the page to flush an unsaved editor buffer.
///
/// `ACeleryActivity.onPause` ran exactly this before the Activity went away,
/// so a half-typed file survived a task switch.
const String forceSaveFileScript =
    "if (typeof forceSaveFile == 'function') { forceSaveFile(); }";
