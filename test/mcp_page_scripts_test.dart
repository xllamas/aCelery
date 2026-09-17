@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/mcp/app_runs.dart';
import 'package:acelery/src/mcp/run_tools.dart';
import 'package:test/test.dart';

/// The scripts `eval_js` and `read_dom` send, run in a page with capture.js
/// loaded (jsdom under node), so what they post back is what the device's
/// WebView would post.
///
/// Needs node and web/node_modules, as web/test does. Skipped otherwise.
void main() {
  final node = _which('node');
  final skip = node != null && Directory('web/node_modules/jsdom').existsSync()
      ? null
      : 'needs node and web/node_modules';

  /// Runs [scripts] in one page and returns every message the host received,
  /// in order.
  Future<List<Map<String, dynamic>>> inPage(List<String> scripts) async {
    const runner = r'''
      import { readFileSync } from "node:fs";
      import { JSDOM } from "jsdom";
      const dom = new JSDOM(
        `<!doctype html><body><main><h1>Water</h1>
         <button class="add">Add a glass</button><button>Undo</button></main></body>`,
        { runScripts: "outside-only" });
      const { window } = dom;
      const posted = [];
      window.ACeleryHost = { postMessage: (m) => posted.push(JSON.parse(m)) };
      window.eval(readFileSync("../bundle/www/system/js/capture.js", "utf8"));
      window.document.title = "Water";
      for (const script of JSON.parse(process.argv[1])) window.eval(script);
      await new Promise((r) => setTimeout(r, 200));
      console.log(JSON.stringify(posted.filter((p) => p.action === "evalResult")));
    ''';
    final result = await Process.run(
      node!,
      ['--input-type=module', '-e', runner, jsonEncode(scripts)],
      workingDirectory: 'web',
    );
    expect(result.exitCode, 0, reason: '${result.stderr}');
    return (jsonDecode(result.stdout as String) as List)
        .cast<Map<String, dynamic>>();
  }

  test('eval_js: values, promises and errors come back by id', () async {
    final posted = await inPage([
      evalScript(1, 'document.title.length * 2'),
      evalScript(2, 'new Promise((r) => setTimeout(() => r({glasses: 3}), 10))'),
      evalScript(3, 'let x = 1;\nx + 1'),
      evalScript(4, 'null.boom'),
      evalScript(5, 'this is not javascript'),
      evalScript(6, 'document.querySelector("h1")'),
      evalScript(7, 'Promise.reject(new RangeError("no rows"))'),
      evalScript(8, '"quote \\" and \\u2028 survive"'),
    ]);
    final byId = {for (final p in posted) p['id']: p};

    expect(byId[1], {'action': 'evalResult', 'id': 1, 'ok': true, 'value': '10'});
    expect(byId[2]!['value'], '{\n  "glasses": 3\n}');
    expect(byId[3]!['value'], '2', reason: 'statements, then an expression');
    expect(byId[4]!['ok'], isFalse);
    expect(byId[4]!['error'], contains('TypeError'));
    expect(byId[5]!['error'], contains('SyntaxError'));
    expect(byId[6]!['value'], '<h1>Water</h1>');
    expect(byId[7]!['error'], contains('RangeError: no rows'));
    expect(byId[8]!['value'], 'quote " and \u2028 survive');
  }, skip: skip);

  test('read_dom: an element, its text, and a selector that finds nothing',
      () async {
    final posted = await inPage([
      evalScript(1, domScript('button', text: false)),
      evalScript(2, domScript('main', text: true)),
      evalScript(3, domScript('.missing', text: false)),
      evalScript(4, domScript('!!bad', text: false)),
    ]);
    final byId = {for (final p in posted) p['id']: p};
    Map<String, dynamic> found(int id) =>
        jsonDecode(byId[id]!['value'] as String) as Map<String, dynamic>;

    expect(found(1), {'count': 2, 'content': '<button class="add">Add a glass</button>'});
    // jsdom has no layout, so innerText is undefined there; the device's
    // WebView has it. What matters here is the shape.
    expect(found(2)['count'], 1);
    expect(found(3), {'count': 0, 'content': ''});
    expect(byId[4]!['ok'], isFalse);
  }, skip: skip);
}

String? _which(String command) {
  final result = Process.runSync('which', [command]);
  return result.exitCode == 0 ? (result.stdout as String).trim() : null;
}
