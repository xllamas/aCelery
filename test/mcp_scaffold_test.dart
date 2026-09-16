@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/mcp/scaffold.dart';
import 'package:acelery/src/paths.dart';
import 'package:test/test.dart';

/// One scaffold, two languages (doc/mcp-server.md §7, P5).
///
/// The IDE creates projects in JavaScript and the MCP server in Dart, both
/// from the files under bundle/www/system/scaffold/. This runs the same cases
/// through each and compares what they make, so neither can drift — a name the
/// sheet refuses that create_app accepts, or a manifest that differs by a key.
///
/// Needs node, as web/test does. Skipped where it is not installed.
void main() {
  final node = _which('node');

  final names = [
    'water', '  todo_list ', 'Water_2', 'a' * 16, 'a' * 17, 'my app', '',
    '   ', '../escape', 'ünï', '9lives', '_x',
  ];
  const descriptions = [null, '', 'Logs how much I drink', 'Quote "this"\n'];

  late Directory tmp;
  late Scaffold dart;

  setUpAll(() async {
    tmp = await Directory.systemTemp.createTemp('acelery_scaffold');
    final paths = ACeleryPaths(tmp.path);
    final dir = Directory(Scaffold.dirOf(paths))..createSync(recursive: true);
    for (final file in Directory('bundle/www/system/scaffold')
        .listSync()
        .whereType<File>()) {
      file.copySync('${dir.path}${file.uri.pathSegments.last}');
    }
    dart = await Scaffold.load(paths);
  });

  tearDownAll(() => tmp.delete(recursive: true));

  test('Dart and the IDE make the same app from the same files', () async {
    final script = '''
      import { readFileSync } from "node:fs";
      import { scaffoldFrom } from "./web/src/ide/scaffold.js";
      const read = (f) => readFileSync("bundle/www/system/scaffold/" + f, "utf8");
      const rules = JSON.parse(read("scaffold.json"));
      const templates = Object.fromEntries(
        Object.entries(rules.templates).map(([f, src]) => [f, read(src)]));
      const s = scaffoldFrom(rules, templates);
      const { names, descriptions } = JSON.parse(process.argv[1]);
      const out = { entry: s.entry, names: {}, descriptions: {}, apps: [] };
      for (const n of names) {
        out.names[n] = { problem: s.nameProblem(n) };
        if (!s.nameProblem(n)) out.names[n].used = s.projectName(n);
      }
      for (const d of descriptions) {
        out.descriptions[String(d)] = s.descriptionProblem(d ?? undefined);
        out.apps.push(s.files("Water", d ?? undefined));
      }
      out.descriptions["long"] = s.descriptionProblem("x".repeat(141));
      console.log(JSON.stringify(out));
    ''';
    final result = await Process.run(
      node!,
      [
        '--input-type=module',
        '-e',
        script,
        jsonEncode({'names': names, 'descriptions': descriptions}),
      ],
    );
    expect(result.exitCode, 0, reason: result.stderr as String);
    final js = jsonDecode(result.stdout as String) as Map<String, dynamic>;

    final fromDart = {
      'entry': dart.entry,
      'names': {
        for (final n in names)
          n: {
            'problem': dart.nameProblem(n),
            if (dart.nameProblem(n) == null) 'used': dart.projectName(n),
          },
      },
      'descriptions': {
        for (final d in descriptions) '$d': dart.descriptionProblem(d),
        'long': dart.descriptionProblem('x' * 141),
      },
      'apps': [for (final d in descriptions) dart.files('Water', d)],
    };

    expect(fromDart, js);
    // And the comparison is not vacuous: some names pass and some do not.
    expect((js['names'] as Map).values.where((v) => v['problem'] == null),
        isNotEmpty);
    expect((js['names'] as Map).values.where((v) => v['problem'] != null),
        isNotEmpty);
  }, skip: node == null ? 'node is not installed' : false);
}

String? _which(String command) {
  final result = Process.runSync('which', [command]);
  return result.exitCode == 0 ? (result.stdout as String).trim() : null;
}
