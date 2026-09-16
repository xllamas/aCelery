import 'dart:convert';
import 'dart:io';

import '../paths.dart';

/// What a new project is made of, read from the installed bundle.
///
/// The rules and templates live in `www/system/scaffold/`, where the IDE
/// fetches them too (`web/src/ide/scaffold.js`), so an app the MCP server
/// creates is the app the New project sheet would have made
/// (doc/mcp-server.md §7, P5). `test/mcp_scaffold_test.dart` runs both over the
/// same files and compares the results.
class Scaffold {
  Scaffold._(this._rules, this._templates)
      : _pattern = RegExp(_rules['namePattern'] as String);

  final Map<String, Object?> _rules;
  final Map<String, String> _templates;
  final RegExp _pattern;

  /// The directory under the document root that holds the scaffold.
  static String dirOf(ACeleryPaths paths) => '${paths.wwwRoot}system/scaffold/';

  /// Reads `scaffold.json` and every template it names.
  static Future<Scaffold> load(ACeleryPaths paths) async {
    final dir = dirOf(paths);
    final rules = jsonDecode(await File('${dir}scaffold.json').readAsString())
        as Map<String, Object?>;
    final templates = <String, String>{};
    for (final entry
        in (rules['templates'] as Map<String, Object?>).entries) {
      templates[entry.key] =
          await File('$dir${entry.value as String}').readAsString();
    }
    return Scaffold._(rules, templates);
  }

  Map<String, Object?> get _messages =>
      _rules['messages'] as Map<String, Object?>;

  /// The module a new project's manifest names as its entry.
  String get entry => _rules['entry'] as String;

  /// Why [name] cannot be used, or null. Whether it is taken is the caller's
  /// to check.
  String? nameProblem(String? name) {
    final trimmed = (name ?? '').trim();
    if (trimmed.isEmpty) return _messages['nameRequired'] as String;
    if (!_pattern.hasMatch(trimmed)) return _messages['nameInvalid'] as String;
    return null;
  }

  /// Why [description] cannot be used, or null.
  String? descriptionProblem(String? description) =>
      (description ?? '').length <= (_rules['descriptionMax'] as int)
          ? null
          : _messages['descriptionTooLong'] as String;

  /// The name actually used: trimmed and capitalised.
  String projectName(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return trimmed;
    return trimmed[0].toUpperCase() + trimmed.substring(1);
  }

  /// Every file of a new project, as name → text, manifest first.
  ///
  /// The manifest's key order and spacing match `JSON.stringify` in the IDE,
  /// so the two produce the same bytes.
  Map<String, String> files(String name, String? description) => {
        'acelery_app.json': jsonEncode({
          'name': name,
          'description': description ?? '',
          'entry': entry,
        }),
        for (final template in _templates.entries)
          template.key: template.value.replaceAll('{{name}}', name),
      };
}
