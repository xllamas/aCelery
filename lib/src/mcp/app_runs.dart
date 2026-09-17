import 'dart:async';
import 'dart:collection';
import 'dart:convert';

import 'tool.dart';

/// One line a running app's console produced, or an error it did not catch.
class ConsoleEntry {
  ConsoleEntry({
    required this.seq,
    required this.time,
    required this.level,
    required this.text,
    this.stack,
    this.source,
  });

  /// Increases by one per entry in a run, so a client can ask for what came
  /// after the last one it saw.
  final int seq;
  final DateTime time;

  /// `log`, `info`, `warn`, `error` or `debug`, as the console method was
  /// named. Uncaught errors and unhandled rejections are `error`.
  final String level;
  final String text;
  final String? stack;

  /// `file:line:column`, when the page knew it.
  final String? source;

  Map<String, Object?> toJson() => {
        'seq': seq,
        'time': time.toIso8601String(),
        'level': level,
        'text': text,
        'stack': ?stack,
        'source': ?source,
      };
}

/// How an app's start came out, as `launcher.html` reported it.
sealed class StartOutcome {
  const StartOutcome();
}

/// `main()` returned without throwing.
class Started extends StartOutcome {
  const Started();
}

/// `launcher.html`'s `fail()`: the entry would not load, exported no function,
/// or threw.
class StartFailed extends StartOutcome {
  const StartFailed(this.title, this.detail);

  final String title;
  final String detail;
}

/// One app, open on the device's screen, from the moment its WebView exists
/// until its screen goes away.
///
/// A run is begun by the screen, whoever asked for it: the user tapping Run,
/// a home screen shortcut, or `run_app`. So `read_console` shows the console of
/// whatever is on screen, however it got there.
class AppRun {
  AppRun._(this.id, this.app, this._send, this._snapshot);

  final int id;
  final String app;
  final DateTime started = DateTime.now();

  /// Runs a script in the app's WebView, without waiting for a result.
  final Future<void> Function(String script) _send;

  /// Draws what the app's screen shows, as PNG, or null when it cannot.
  final Future<AppSnapshot?> Function()? _snapshot;

  Future<AppSnapshot?> snapshot() async {
    if (_ended) throw ToolFailure('$app has closed');
    return _snapshot?.call();
  }

  /// Entries kept per run; the oldest go first.
  static const int maxEntries = 500;

  /// Characters kept per entry's text, and per stack.
  static const int maxEntryChars = 4000;

  final Queue<ConsoleEntry> _entries = Queue();
  int _nextSeq = 1;

  /// Entries pushed out of the buffer, plus any the page itself dropped
  /// because it was logging faster than it could send.
  int dropped = 0;

  bool _ended = false;
  bool get ended => _ended;

  final Completer<StartOutcome> _start = Completer();

  /// Completes when the launcher reports the start, never if it does not.
  Future<StartOutcome> get startOutcome => _start.future;

  StartOutcome? get outcome => _outcome;
  StartOutcome? _outcome;

  final Map<int, Completer<EvalResult>> _evals = {};
  int _nextEval = 1;

  Iterable<ConsoleEntry> entriesAfter(int seq) =>
      _entries.where((e) => e.seq > seq);

  /// The seq the next entry will get.
  int get nextSeq => _nextSeq;

  void log(String level, String text, {String? stack, String? source}) {
    _entries.add(ConsoleEntry(
      seq: _nextSeq++,
      time: DateTime.now(),
      level: level,
      text: _cap(text),
      stack: stack == null ? null : _cap(stack),
      source: source,
    ));
    while (_entries.length > maxEntries) {
      _entries.removeFirst();
      dropped++;
    }
  }

  /// How long a report from the platform's console waits for capture.js to
  /// report the same error, before it is recorded on its own.
  static const Duration platformGrace = Duration(milliseconds: 300);

  /// An uncaught error as Chromium's own console reported it, through
  /// Android's console callback.
  ///
  /// capture.js cannot see every one: Chromium does not dispatch
  /// `unhandledrejection` for a promise rejected by the browser itself, such as
  /// `response.json()` on a body that is not JSON, or for code run through
  /// `evaluateJavascript`. Its console still says `Uncaught (in promise) …`.
  /// That line has no stack, so capture.js's report wins when both arrive.
  void reportPlatformUncaught(String message) {
    const inPromise = 'Uncaught (in promise) ';
    final String text;
    if (message.startsWith(inPromise)) {
      text = 'Unhandled rejection: ${message.substring(inPromise.length)}';
    } else if (message.startsWith('Uncaught ')) {
      text = message;
    } else {
      return;
    }
    final heard = DateTime.now();
    Timer(platformGrace, () {
      if (_ended) return;
      final window = heard.subtract(const Duration(seconds: 2));
      final seen = _entries.any((e) => e.text == text && e.time.isAfter(window));
      if (!seen) log('error', text);
    });
  }

  void reportStarted() => _settle(const Started());

  void reportFailed(String title, String detail) =>
      _settle(StartFailed(title, _cap(detail)));

  void _settle(StartOutcome outcome) {
    // A page that reloads reports again; the first report is the run's.
    if (_start.isCompleted) return;
    _outcome = outcome;
    _start.complete(outcome);
  }

  /// Runs [code] in the app's page and returns its value.
  ///
  /// The script posts its answer back over the host channel instead of using
  /// `runJavaScriptReturningResult`, whose result types differ between Android
  /// and iOS and which cannot wait for a promise.
  Future<EvalResult> evaluate(String code, {required Duration timeout}) async {
    if (_ended) throw ToolFailure('$app has closed');
    final id = _nextEval++;
    final answer = Completer<EvalResult>();
    _evals[id] = answer;
    try {
      await _send(evalScript(id, code));
      return await answer.future.timeout(timeout, onTimeout: () {
        throw ToolFailure('No answer from $app within ${timeout.inSeconds} s. '
            'A promise that never settles, or a page that is busy or not on '
            'screen, looks like this.');
      });
    } finally {
      _evals.remove(id);
    }
  }

  /// The page's answer to [evaluate]. Unknown ids are ignored: the page can
  /// post anything on the channel, and a late answer has nobody waiting.
  void resolveEval(int id, EvalResult result) {
    final answer = _evals.remove(id);
    if (answer != null && !answer.isCompleted) answer.complete(result);
  }

  void _end() {
    _ended = true;
    for (final answer in _evals.values) {
      if (!answer.isCompleted) {
        answer.completeError(ToolFailure('$app closed before it answered'));
      }
    }
    _evals.clear();
  }

  static String _cap(String text) => text.length <= maxEntryChars
      ? text
      : '${text.substring(0, maxEntryChars)}… (${text.length} characters)';
}

/// A picture of an app's screen.
class AppSnapshot {
  const AppSnapshot({required this.png, required this.width, required this.height});

  final List<int> png;
  final int width;
  final int height;
}

/// What a script run by [AppRun.evaluate] came to.
class EvalResult {
  const EvalResult.value(this.value) : error = null;
  const EvalResult.error(String this.error) : value = null;

  /// The value, already made readable by the page: JSON for plain data,
  /// `outerHTML` for an element, the stack for an Error.
  final String? value;
  final String? error;

  bool get ok => error == null;
}

/// The script [AppRun.evaluate] sends.
///
/// The code is passed as a JSON string and run with indirect `eval`, so it is
/// global code: it sees the page's globals, not the app module's own scope, and
/// the value of its last expression is the result. A returned promise is
/// awaited.
String evalScript(int id, String code) => '''
(function () {
  var post = function (payload) {
    payload.action = "evalResult";
    payload.id = $id;
    ACeleryHost.postMessage(JSON.stringify(payload));
  };
  var describe = (window.__aCeleryCapture && window.__aCeleryCapture.describe) ||
      function (v) { return String(v); };
  Promise.resolve()
    .then(function () { return (0, eval)(${jsonEncode(code)}); })
    .then(function (value) { post({ ok: true, value: describe(value, 50000) }); },
          function (error) { post({ ok: false, error: describe(error, 50000) }); });
})();
''';

/// Opens and closes apps on the device's screen. The shell implements it; MCP
/// tools call it.
abstract interface class AppScreen {
  /// Shows [app], closing any app that is open, even the same one: a run after
  /// an edit has to load the new code.
  Future<void> open(String app);

  /// Returns to the shell.
  Future<void> close();
}

/// The apps on screen, as the MCP tools see them.
class AppRuns {
  /// Set while the shell is up to open apps. Null in a desktop harness, and
  /// before the IDE has mounted.
  AppScreen? screen;

  AppRun? _current;
  AppRun? _last;
  int _nextId = 1;

  final List<({String app, Completer<AppRun> begun})> _waiting = [];

  /// The run on screen now.
  AppRun? get current => _current;

  /// The run on screen now, or the last one if none is.
  AppRun? get latest => _current ?? _last;

  /// Called by an app's screen once its WebView exists. [send] runs a script
  /// in that WebView.
  AppRun begin(
    String app,
    Future<void> Function(String script) send, {
    Future<AppSnapshot?> Function()? snapshot,
  }) {
    final run = AppRun._(_nextId++, app, send, snapshot);
    _current = run;
    _last = run;
    for (final waiter in [..._waiting]) {
      if (waiter.app == app) {
        _waiting.remove(waiter);
        waiter.begun.complete(run);
      }
    }
    return run;
  }

  /// Called by an app's screen as it goes away.
  void end(AppRun run) {
    run._end();
    // Another app's screen may already have begun: a user app that opens
    // another replaces its own route, and the new one mounts first.
    if (identical(_current, run)) _current = null;
  }

  /// Closes the app on screen. False when none was open.
  ///
  /// The run ends here rather than when its screen is disposed, which is only
  /// after the closing animation: until then a second close, or an eval, would
  /// still find it open.
  Future<bool> close() async {
    final screen = this.screen;
    final run = _current;
    if (screen == null || run == null) return false;
    await screen.close();
    end(run);
    return true;
  }

  /// Opens [app] and returns its run once its screen has begun it.
  Future<AppRun> open(String app, {required Duration timeout}) async {
    final screen = this.screen;
    if (screen == null) {
      throw ToolFailure('aCelery is not showing its screen, so it cannot open '
          'an app. Open aCelery on the device and try again.');
    }
    final begun = Completer<AppRun>();
    final waiter = (app: app, begun: begun);
    _waiting.add(waiter);
    try {
      await screen.open(app);
      return await begun.future.timeout(timeout, onTimeout: () {
        throw ToolFailure('$app did not open within ${timeout.inSeconds} s. '
            'On iOS, and on some Android phones, aCelery cannot show anything '
            'while it is not on screen.');
      });
    } finally {
      _waiting.remove(waiter);
    }
  }
}
