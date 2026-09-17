@TestOn('vm')
library;

import 'dart:async';

import 'package:acelery/src/mcp/app_runs.dart';
import 'package:acelery/src/mcp/tool.dart';
import 'package:test/test.dart';

/// A screen that begins a run for whatever it is asked to open, the way
/// `UserAppScreen` does once its WebView exists.
class _Screen implements AppScreen {
  _Screen(this.runs, {this.begins = true});

  final AppRuns runs;
  final bool begins;
  final opened = <String>[];
  final scripts = <String>[];

  @override
  Future<void> open(String app) async {
    opened.add(app);
    if (begins) {
      scheduleMicrotask(() => runs.begin(app, (s) async => scripts.add(s)));
    }
  }

  @override
  Future<void> close() async {}
}

void main() {
  group('a run', () {
    late AppRuns runs;
    setUp(() => runs = AppRuns());

    test('keeps the newest entries and counts the rest as dropped', () {
      final run = runs.begin('Demo', (_) async {});
      for (var i = 1; i <= AppRun.maxEntries + 20; i++) {
        run.log('log', 'line $i');
      }
      final kept = run.entriesAfter(0).toList();
      expect(kept, hasLength(AppRun.maxEntries));
      expect(kept.first.text, 'line 21');
      expect(kept.last.seq, AppRun.maxEntries + 20);
      expect(run.dropped, 20);
      expect(run.entriesAfter(kept.last.seq - 2).map((e) => e.text),
          ['line 519', 'line 520']);
    });

    test('cuts long text, and says how long it was', () {
      final run = runs.begin('Demo', (_) async {});
      run.log('error', 'x' * 10000, stack: 's' * 10000);
      final entry = run.entriesAfter(0).single;
      expect(entry.text.length, lessThan(AppRun.maxEntryChars + 40));
      expect(entry.text, endsWith('(10000 characters)'));
      expect(entry.stack, endsWith('(10000 characters)'));
    });

    test('the first start report is the one that counts', () async {
      final run = runs.begin('Demo', (_) async {});
      expect(run.outcome, isNull);
      run.reportFailed('main.js failed to load', 'SyntaxError at 3:1');
      run.reportStarted(); // a page reloaded by hand reports again
      final outcome = await run.startOutcome;
      expect(outcome, isA<StartFailed>());
      expect((outcome as StartFailed).detail, 'SyntaxError at 3:1');
      expect(run.outcome, same(outcome));
    });

    test("the platform's uncaught errors fill in what capture.js missed",
        () async {
      final run = runs.begin('Demo', (_) async {});
      // capture.js saw this rejection, with a stack, just before Chromium's
      // console reported it too.
      run.log('error', 'Unhandled rejection: SyntaxError: bad JSON',
          stack: 'SyntaxError: bad JSON\n    at main.js:6:77');
      run.reportPlatformUncaught('Uncaught (in promise) SyntaxError: bad JSON');
      // Only Chromium's console saw this one: response.json() rejected it.
      run.reportPlatformUncaught(
          'Uncaught (in promise) SyntaxError: Unexpected token N');
      // And capture.js may report a sync error after the platform does.
      run.reportPlatformUncaught('Uncaught TypeError: x is null');
      run.log('error', 'Uncaught TypeError: x is null', stack: 'at main.js:2');
      run.reportPlatformUncaught('Not an uncaught error at all');

      await Future<void>.delayed(
          AppRun.platformGrace + const Duration(milliseconds: 50));
      expect(run.entriesAfter(0).map((e) => e.text), [
        'Unhandled rejection: SyntaxError: bad JSON',
        'Uncaught TypeError: x is null',
        'Unhandled rejection: SyntaxError: Unexpected token N',
      ]);
    });

    test('ending an old run does not end the one that replaced it', () {
      // A user app opening another replaces its route, and the new screen
      // mounts before the old one is disposed.
      final first = runs.begin('A', (_) async {});
      final second = runs.begin('B', (_) async {});
      runs.end(first);
      expect(runs.current, same(second));
      expect(first.ended, isTrue);
      runs.end(second);
      expect(runs.current, isNull);
      expect(runs.latest, same(second), reason: 'its console stays readable');
    });
  });

  group('evaluate', () {
    late AppRuns runs;
    late List<String> sent;
    late AppRun run;

    setUp(() {
      runs = AppRuns();
      sent = [];
      run = runs.begin('Demo', (script) async => sent.add(script));
    });

    int idOf(String script) =>
        int.parse(RegExp(r'payload\.id = (\d+);').firstMatch(script)!.group(1)!);

    test('sends the code as a JSON string and waits for its answer', () async {
      final answer = run.evaluate('document.title + "\\u2028"',
          timeout: const Duration(seconds: 1));
      await Future<void>.delayed(Duration.zero);
      expect(sent.single, contains(r'(0, eval)("document.title + \"\\u2028\"")'));

      run.resolveEval(idOf(sent.single), const EvalResult.value('Demo'));
      expect((await answer).value, 'Demo');
    });

    test('an answer for nobody is ignored', () {
      run.resolveEval(99, const EvalResult.value('stray'));
    });

    test('gives up after the timeout', () async {
      await expectLater(
        run.evaluate('new Promise(() => {})',
            timeout: const Duration(milliseconds: 20)),
        throwsA(isA<ToolFailure>().having(
            (f) => f.message, 'message', contains('No answer from Demo'))),
      );
    });

    test('fails what is pending when the app closes', () async {
      final answer =
          run.evaluate('1', timeout: const Duration(seconds: 5));
      await Future<void>.delayed(Duration.zero);
      runs.end(run);
      await expectLater(answer, throwsA(isA<ToolFailure>()));
      await expectLater(run.evaluate('1', timeout: const Duration(seconds: 1)),
          throwsA(isA<ToolFailure>()));
    });
  });

  group('open', () {
    test('without a screen, says why', () async {
      await expectLater(
        AppRuns().open('Demo', timeout: const Duration(seconds: 1)),
        throwsA(isA<ToolFailure>().having(
            (f) => f.message, 'message', contains('not showing its screen'))),
      );
    });

    test('returns the run the screen began for that app', () async {
      final runs = AppRuns();
      final screen = _Screen(runs);
      runs.screen = screen;
      final run = await runs.open('Demo', timeout: const Duration(seconds: 1));
      expect(run.app, 'Demo');
      expect(runs.current, same(run));
      expect(screen.opened, ['Demo']);
    });

    test('close ends the run at once, not when the screen is disposed',
        () async {
      final runs = AppRuns();
      runs.screen = _Screen(runs);
      expect(await runs.close(), isFalse, reason: 'nothing is open');
      final run = await runs.open('Demo', timeout: const Duration(seconds: 1));
      expect(await runs.close(), isTrue);
      expect(run.ended, isTrue);
      expect(runs.current, isNull);
      expect(await runs.close(), isFalse);
    });

    test('times out when no screen appears', () async {
      final runs = AppRuns()..screen = null;
      runs.screen = _Screen(runs, begins: false);
      await expectLater(
        runs.open('Demo', timeout: const Duration(milliseconds: 20)),
        throwsA(isA<ToolFailure>()
            .having((f) => f.message, 'message', contains('did not open'))),
      );
    });
  });
}
