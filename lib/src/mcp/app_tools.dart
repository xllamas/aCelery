import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

import '../paths.dart';
import 'scaffold.dart';
import 'tool.dart';

/// The user's apps, as the MCP tools see them: folders under `www/user/`.
///
/// This works on files directly rather than through [FileBridge]'s handles.
/// The bridge is shaped for the page — open, read, close, and failures
/// swallowed into an empty string, as the Java original did — while a tool has
/// to tell the model *why* a write did not happen. The confinement is the same
/// check, [ACeleryPaths.isInside], applied here to the app's own folder rather
/// than the whole tree.
class UserApps {
  UserApps(this.paths);

  final ACeleryPaths paths;

  /// Text returned per file, so one large asset cannot flood a model's context.
  static const int maxTextBytes = 200 * 1024;

  /// How many files `read_app` lists before it stops.
  static const int maxFiles = 500;

  static const String manifestName = 'acelery_app.json';

  Directory get _root => Directory(paths.userRoot);

  /// Every app folder, sorted by name.
  List<Directory> list() {
    if (!_root.existsSync()) return const [];
    return _root.listSync().whereType<Directory>().toList()
      ..sort((a, b) => p.basename(a.path).compareTo(p.basename(b.path)));
  }

  /// The folder of an existing app, or a [ToolFailure] saying why not.
  Directory app(String name) {
    if (name.isEmpty ||
        name.contains('/') ||
        name.contains(r'\') ||
        name.startsWith('.')) {
      throw ToolFailure('"$name" is not an app name');
    }
    final dir = Directory(p.join(paths.userRoot, name));
    if (!ACeleryPaths.isInside(_root, dir) || !dir.existsSync()) {
      throw ToolFailure('No app named "$name". list_apps shows the apps.');
    }
    return dir;
  }

  /// A file inside [app], by a relative path, confined to that app.
  File file(Directory app, String path) {
    final segments = path.split('/');
    if (path.isEmpty ||
        path.startsWith('/') ||
        path.contains(r'\') ||
        segments.any((s) => s.isEmpty || s == '.' || s == '..')) {
      throw ToolFailure('"$path" must be a relative path inside the app, '
          'with "/" between folders and no "." or ".." segments');
    }
    final file = File(p.joinAll([app.path, ...segments]));
    if (!ACeleryPaths.isInside(app, file) || file.path == app.path) {
      throw ToolFailure('"$path" is outside the app');
    }
    return file;
  }

  /// The manifest, parsed, or why it could not be.
  ({Map<String, Object?>? manifest, String? problem}) manifest(Directory app) {
    final file = File(p.join(app.path, manifestName));
    if (!file.existsSync()) {
      return (manifest: null, problem: '$manifestName is missing');
    }
    try {
      final json = jsonDecode(file.readAsStringSync());
      if (json is Map<String, Object?>) return (manifest: json, problem: null);
      return (manifest: null, problem: '$manifestName is not a JSON object');
    } on FormatException catch (e) {
      return (manifest: null, problem: '$manifestName is not JSON: ${e.message}');
    }
  }

  /// Files under [app], recursively, as paths relative to it.
  List<File> files(Directory app) {
    final out = app
        .listSync(recursive: true, followLinks: false)
        .whereType<File>()
        .toList()
      ..sort((a, b) => a.path.compareTo(b.path));
    return out;
  }

  String relative(Directory app, File file) =>
      p.split(p.relative(file.path, from: app.path)).join('/');

  static int mtimeOf(File file) =>
      file.statSync().modified.millisecondsSinceEpoch;

  /// A file's text, capped at [maxTextBytes], or null for a binary file.
  static ({String text, bool truncated})? textOf(File file) {
    final bytes = file.readAsBytesSync();
    final truncated = bytes.length > maxTextBytes;
    try {
      final text = utf8.decode(
        truncated ? bytes.sublist(0, maxTextBytes) : bytes,
        // A cut can land inside a character; only the whole file must be valid.
        allowMalformed: truncated,
      );
      if (truncated) utf8.decode(bytes);
      // NUL does not occur in source text, and does in most binary formats
      // that happen to decode.
      if (text.contains('\u0000')) return null;
      return (text: text, truncated: truncated);
    } on FormatException {
      return null;
    }
  }

  /// Checks the caller has seen the version of [file] it is about to replace.
  ///
  /// The IDE on the phone may have saved the file since the model read it, and
  /// a write that silently discarded that would lose the user's work.
  static void checkUnchanged(File file, String path, int? expectedMtime) {
    final exists = file.existsSync();
    if (exists && expectedMtime == null) {
      throw ToolFailure('$path already exists. Pass expected_mtime — the mtime '
          'read_file or read_app reported — to replace it.');
    }
    if (!exists && expectedMtime != null) {
      throw ToolFailure('$path does not exist, so expected_mtime cannot match. '
          'Omit it to create the file.');
    }
    if (exists && mtimeOf(file) != expectedMtime) {
      throw ToolFailure('$path changed since it was read: its mtime is now '
          '${mtimeOf(file)}, not $expectedMtime. Read it again before '
          'writing, so that changes made on the device are not lost.');
    }
  }
}

/// `list_apps`, `read_app`, `read_file`, `create_app`, `write_file`,
/// `delete_file` and `delete_app` (doc/mcp-server.md §5).
List<McpTool> appTools(UserApps apps) {
  String appTarget(ToolArgs a) => a.optionalString('app') ?? '?';
  String fileTarget(ToolArgs a) =>
      '${a.optionalString('app') ?? '?'}/${a.optionalString('path') ?? '?'}';

  const appProperty = {
    'type': 'string',
    'description': 'The app\'s folder name under www/user/, as list_apps '
        'reports it.',
  };
  const pathProperty = {
    'type': 'string',
    'description': 'A path relative to the app folder, such as "main.js" or '
        '"css/app.css".',
  };
  const mtimeProperty = {
    'type': 'integer',
    'description': 'The mtime (milliseconds since the epoch) that read_file, '
        'read_app or a previous write reported for this file.',
  };

  return [
    McpTool(
      name: 'list_apps',
      title: 'List apps',
      description: 'Lists the apps on the device, each with its manifest '
          '(acelery_app.json). Read acelery://guide, or call get_guide, before '
          'writing an app.',
      properties: const {},
      readOnly: true,
      run: (_) => {
        'apps': [
          for (final dir in apps.list())
            () {
              final (:manifest, :problem) = apps.manifest(dir);
              return {
                'name': p.basename(dir.path),
                'manifest': manifest,
                'manifestProblem': ?problem,
              };
            }(),
        ],
      },
    ),
    McpTool(
      name: 'read_app',
      title: 'Read an app',
      description: 'Returns an app\'s manifest and every file in it with its '
          'size and mtime, and the text of each text file (up to 200 KB per '
          'file; "truncated" marks a cut). Binary files are listed without '
          'contents.',
      properties: {
        'app': appProperty,
        'contents': {
          'type': 'boolean',
          'description': 'Include file text. Default true; false lists only.',
        },
      },
      required: const ['app'],
      readOnly: true,
      target: appTarget,
      run: (args) {
        final dir = apps.app(args.string('app'));
        final withText = args.optionalBool('contents', fallback: true);
        final (:manifest, :problem) = apps.manifest(dir);
        final all = apps.files(dir);
        return {
          'app': p.basename(dir.path),
          'manifest': manifest,
          'manifestProblem': ?problem,
          'files': [
            for (final file in all.take(UserApps.maxFiles))
              {
                'path': apps.relative(dir, file),
                'size': file.lengthSync(),
                'mtime': UserApps.mtimeOf(file),
                if (withText) ..._textFields(file),
              },
          ],
          if (all.length > UserApps.maxFiles)
            'omittedFiles': all.length - UserApps.maxFiles,
        };
      },
    ),
    McpTool(
      name: 'read_file',
      title: 'Read a file',
      description: 'Returns one file of an app: its text (up to 200 KB), size '
          'and mtime. Pass the mtime to write_file to replace it.',
      properties: {'app': appProperty, 'path': pathProperty},
      required: const ['app', 'path'],
      readOnly: true,
      target: fileTarget,
      run: (args) {
        final path = args.string('path');
        final file = apps.file(apps.app(args.string('app')), path);
        if (!file.existsSync()) throw ToolFailure('$path does not exist');
        return {
          'path': path,
          'size': file.lengthSync(),
          'mtime': UserApps.mtimeOf(file),
          ..._textFields(file),
        };
      },
    ),
    McpTool(
      name: 'create_app',
      title: 'Create an app',
      description: 'Creates an app folder with a manifest and a runnable '
          'main.js, exactly as the IDE\'s New project sheet does. The name is '
          'letters, digits and underscore, 16 at most, and its first letter is '
          'capitalised. Returns the name used and the files with their mtimes.',
      properties: const {
        'name': {
          'type': 'string',
          'description': 'Letters, digits and underscore; 16 at most.',
        },
        'description': {
          'type': 'string',
          'description': 'What the app does, in a sentence. 140 at most.',
        },
      },
      required: const ['name'],
      target: (a) => a.optionalString('name') ?? '?',
      run: (args) async {
        final scaffold = await Scaffold.load(apps.paths);
        final requested = args.string('name');
        final description = args.optionalString('description') ?? '';

        final problem = scaffold.nameProblem(requested) ??
            scaffold.descriptionProblem(description);
        if (problem != null) throw ToolFailure(problem);

        final name = scaffold.projectName(requested);
        final taken = apps.list().any(
            (d) => p.basename(d.path).toLowerCase() == name.toLowerCase());
        if (taken) throw ToolFailure('An app named "$name" already exists');

        final dir = Directory(p.join(apps.paths.userRoot, name));
        await dir.create(recursive: true);
        final written = <Map<String, Object?>>[];
        for (final entry in scaffold.files(name, description).entries) {
          final file = File(p.join(dir.path, entry.key));
          await file.writeAsString(entry.value, flush: true);
          written.add({'path': entry.key, 'mtime': UserApps.mtimeOf(file)});
        }
        return {'app': name, 'entry': scaffold.entry, 'files': written};
      },
    ),
    McpTool(
      name: 'write_file',
      title: 'Write a file',
      description: 'Creates or replaces a text file in an existing app, '
          'creating folders as needed. Replacing a file requires '
          'expected_mtime, and fails if the file changed since it was read — '
          'the user may have edited it on the device. Returns the new mtime.',
      properties: {
        'app': appProperty,
        'path': pathProperty,
        'content': {'type': 'string', 'description': 'The whole file.'},
        'expected_mtime': mtimeProperty,
      },
      required: const ['app', 'path', 'content'],
      target: fileTarget,
      run: (args) async {
        final path = args.string('path');
        final file = apps.file(apps.app(args.string('app')), path);
        final content = args.string('content');
        if (FileSystemEntity.isDirectorySync(file.path)) {
          throw ToolFailure('$path is a folder');
        }
        UserApps.checkUnchanged(file, path, args.optionalInt('expected_mtime'));

        await file.parent.create(recursive: true);
        await file.writeAsString(content, flush: true);
        return {
          'path': path,
          'size': file.lengthSync(),
          'mtime': UserApps.mtimeOf(file),
        };
      },
    ),
    McpTool(
      name: 'delete_file',
      title: 'Delete a file',
      description: 'Deletes one file from an app. With expected_mtime, refuses '
          'if the file changed since it was read.',
      properties: {
        'app': appProperty,
        'path': pathProperty,
        'expected_mtime': mtimeProperty,
      },
      required: const ['app', 'path'],
      destructive: true,
      target: fileTarget,
      run: (args) async {
        final path = args.string('path');
        final file = apps.file(apps.app(args.string('app')), path);
        if (!file.existsSync()) throw ToolFailure('$path does not exist');
        final expected = args.optionalInt('expected_mtime');
        if (expected != null) UserApps.checkUnchanged(file, path, expected);
        await file.delete();
        return {'deleted': path};
      },
    ),
    McpTool(
      name: 'delete_app',
      title: 'Delete an app',
      description: 'Deletes an app folder and everything in it. Its databases '
          'under db/ are not touched.',
      properties: {'app': appProperty},
      required: const ['app'],
      destructive: true,
      target: appTarget,
      run: (args) async {
        final dir = apps.app(args.string('app'));
        await dir.delete(recursive: true);
        return {'deleted': p.basename(dir.path)};
      },
    ),
  ];
}

Map<String, Object?> _textFields(File file) {
  final text = UserApps.textOf(file);
  if (text == null) return const {'binary': true};
  return {
    'content': text.text,
    if (text.truncated) 'truncated': true,
  };
}
