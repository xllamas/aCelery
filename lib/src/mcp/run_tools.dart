import 'dart:convert';

import 'app_runs.dart';
import 'app_tools.dart';
import 'tool.dart';

/// Run and debug (doc/mcp-server.md §5): open an app on the device, read what
/// its console said, and look inside its page.
///
/// Apps run where they will really run, in the device's WebView, on its
/// screen. The user holding the phone sees every run.
List<McpTool> runTools(UserApps apps, AppRuns runs) => [
      McpTool(
        name: 'run_app',
        title: 'Run an app on the device',
        description: 'Opens the app on the device\'s screen, closing whatever '
            'app was open, and waits for it to start. Returns "started", '
            '"failed" (with the launcher\'s message and stack) or "timeout", '
            'and the console output from the first moments of the run. Always '
            'loads the files as they are now, so run again after write_file. '
            'The user sees the app open.',
        properties: const {
          'app': {'type': 'string', 'description': 'The app folder name.'},
          'settle_ms': {
            'type': 'integer',
            'description': 'How long to keep collecting console output after '
                'the app has started. Default 1000, at most 10000.',
          },
        },
        required: const ['app'],
        target: (args) => args.string('app'),
        run: (args) async {
          final name = args.string('app');
          apps.app(name); // fails, with a helpful message, for a missing app
          final settle = Duration(
              milliseconds:
                  (args.optionalInt('settle_ms') ?? 1000).clamp(0, 10000));

          final run = await runs.open(name, timeout: openTimeout);
          // Null when the launcher never reported.
          final outcome = await run.startOutcome
              .then<StartOutcome?>((o) => o)
              .timeout(startTimeout, onTimeout: () => null);
          if (outcome is Started) await Future<void>.delayed(settle);

          return {
            'app': name,
            'run_id': run.id,
            'status': switch (outcome) {
              Started() => 'started',
              StartFailed() => 'failed',
              null => 'timeout',
            },
            if (outcome is StartFailed)
              'failure': {'title': outcome.title, 'detail': outcome.detail},
            if (outcome == null)
              'note': 'The launcher did not report a start within '
                  '${startTimeout.inSeconds} s. main() may still be awaiting '
                  'something; read_console and read_dom show where it is.',
            ..._console(run, after: 0, limit: 200),
          };
        },
      ),
      McpTool(
        name: 'read_console',
        title: 'Read the app\'s console',
        description: 'The console of the app on screen, or of the last one to '
            'run: console.log, info, warn, error and debug, plus uncaught '
            'errors and unhandled promise rejections, with stacks. Pass the '
            'last_seq from an earlier call as after_seq to get only what is '
            'new. The last 500 entries of a run are kept.',
        properties: const {
          'after_seq': {
            'type': 'integer',
            'description': 'Only entries after this one. Default 0, all.',
          },
          'limit': {
            'type': 'integer',
            'description': 'Most entries to return, oldest first. Default '
                '200, at most 500.',
          },
        },
        readOnly: true,
        run: (args) {
          final run = runs.latest ?? (throw _nothingRan());
          return {
            'app': run.app,
            'run_id': run.id,
            'running': !run.ended,
            'status': switch (run.outcome) {
              Started() => 'started',
              StartFailed() => 'failed',
              null => 'starting',
            },
            ..._console(
              run,
              after: args.optionalInt('after_seq') ?? 0,
              limit: (args.optionalInt('limit') ?? 200).clamp(1, 500),
            ),
          };
        },
      ),
      McpTool(
        name: 'eval_js',
        title: 'Run JavaScript in the app',
        description: 'Runs JavaScript in the page of the app on screen and '
            'returns the value of its last expression; a promise is awaited. '
            'It runs as global code, so it sees window and document but not '
            'the variables inside the app\'s modules. Elements come back as '
            'outerHTML, errors with their stack, and other values as JSON, '
            'cut at 50,000 characters. The code has the app\'s full access to '
            'files and databases.',
        properties: const {
          'code': {'type': 'string', 'description': 'JavaScript to run.'},
          'timeout_ms': {
            'type': 'integer',
            'description': 'How long to wait for a value. Default 10000, at '
                'most 60000.',
          },
        },
        required: const ['code'],
        destructive: true,
        target: (args) => runs.current?.app ?? '',
        run: (args) async {
          final run = _running(runs);
          final timeout = Duration(
              milliseconds:
                  (args.optionalInt('timeout_ms') ?? 10000).clamp(100, 60000));
          final result = await run.evaluate(args.string('code'), timeout: timeout);
          if (!result.ok) throw ToolFailure('The code threw: ${result.error}');
          return {'app': run.app, 'value': result.value};
        },
      ),
      McpTool(
        name: 'read_dom',
        title: 'Read the app\'s page',
        description: 'What the app on screen is showing: the outerHTML, or '
            'with text: true the visible text, of the first element matching '
            'a CSS selector (default "body"). A stand-in for a screenshot: '
            'check that something rendered, read a message, find a button\'s '
            'selector.',
        properties: const {
          'selector': {
            'type': 'string',
            'description': 'A CSS selector. Default "body".',
          },
          'text': {
            'type': 'boolean',
            'description': 'Return innerText instead of outerHTML.',
          },
          'max_chars': {
            'type': 'integer',
            'description': 'Default 20000, at most 100000.',
          },
        },
        readOnly: true,
        target: (args) => runs.current?.app ?? '',
        run: (args) async {
          final run = _running(runs);
          final selector = args.optionalString('selector') ?? 'body';
          final text = args.optionalBool('text', fallback: false);
          final max = (args.optionalInt('max_chars') ?? 20000).clamp(100, 100000);

          final result = await run.evaluate(domScript(selector, text: text),
              timeout: const Duration(seconds: 10));
          if (!result.ok) {
            throw ToolFailure('Could not read "$selector": ${result.error}');
          }
          final found = jsonDecode(result.value!) as Map<String, dynamic>;
          if (found['count'] == 0) {
            throw ToolFailure('Nothing on the page matches "$selector"');
          }
          final content = found['content'] as String;
          return {
            'app': run.app,
            'selector': selector,
            'matches': found['count'],
            'content': content.length <= max ? content : content.substring(0, max),
            'truncated': content.length > max,
            'length': content.length,
          };
        },
      ),
      McpTool(
        name: 'take_screenshot',
        title: 'Take a screenshot of the app',
        description: 'A PNG of what the app on screen shows, below aCelery\'s '
            'title bar, at most 1280 pixels on its longer side. Use read_dom '
            'to find text and selectors; use this to judge layout, colour and '
            'whether something looks right.',
        properties: const {},
        readOnly: true,
        target: (args) => runs.current?.app ?? '',
        run: (args) async {
          final run = _running(runs);
          // The picture is the last frame the WebView handed to Flutter, so a
          // change made a moment ago would be missing. Wait for the page to
          // paint first.
          await run.evaluate(paintedScript, timeout: const Duration(seconds: 5));
          final shot = await run.snapshot();
          if (shot == null) {
            throw ToolFailure('Screenshots are not available on this device. '
                'read_dom shows what the page contains.');
          }
          return ToolImage(shot.png, {
            'app': run.app,
            'width': shot.width,
            'height': shot.height,
          });
        },
      ),
      McpTool(
        name: 'close_app',
        title: 'Close the app on the device',
        description: 'Closes the app on screen and returns to aCelery\'s own '
            'screens. Its console stays readable with read_console.',
        properties: const {},
        idempotent: true,
        run: (_) async => {'closed': await runs.close()},
      ),
    ];

/// How long `run_app` waits for the app's screen to appear.
const Duration openTimeout = Duration(seconds: 10);

/// How long `run_app` waits for `launcher.html` to report the start.
const Duration startTimeout = Duration(seconds: 15);

Map<String, Object?> _console(AppRun run,
    {required int after, required int limit}) {
  final entries = run.entriesAfter(after).take(limit).toList();
  return {
    'console': [for (final e in entries) e.toJson()],
    'last_seq': entries.isEmpty ? after : entries.last.seq,
    'more': run.entriesAfter(entries.isEmpty ? after : entries.last.seq).isNotEmpty,
    if (run.dropped > 0) 'dropped': run.dropped,
  };
}

AppRun _running(AppRuns runs) {
  final run = runs.current;
  if (run != null) return run;
  if (runs.latest != null) {
    throw ToolFailure('${runs.latest!.app} is no longer open. Call run_app.');
  }
  throw _nothingRan();
}

ToolFailure _nothingRan() =>
    ToolFailure('No app has run since aCelery started. Call run_app.');

/// Finds [selector] and returns `{count, content}` as JSON, so an element that
/// is not there is told apart from one that is empty.
String domScript(String selector, {required bool text}) => '''
(function () {
  var all = document.querySelectorAll(${jsonEncode(selector)});
  var el = all[0];
  return JSON.stringify({
    count: all.length,
    content: el ? String(${text ? 'el.innerText' : 'el.outerHTML'}) : ""
  });
})()
''';

/// Resolves once the page has painted what it has now: the second animation
/// frame from here comes after the first one's paint.
const String paintedScript =
    'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))';
