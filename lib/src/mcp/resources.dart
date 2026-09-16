import 'dart:convert';
import 'dart:io';

import 'package:mime/mime.dart';
import 'package:path/path.dart' as p;

import '../paths.dart';
import 'app_tools.dart';
import 'tool.dart';
import 'transport.dart';

/// `acelery://guide` and `acelery://apps/{app}/{path}`, and the prompt that
/// points at them (doc/mcp-server.md §6).
class McpResources {
  McpResources(this.paths, this.apps);

  final ACeleryPaths paths;
  final UserApps apps;

  static const String guideUri = 'acelery://guide';
  static const String _appsPrefix = 'acelery://apps/';

  /// Files `resources/list` names before it stops. Every file is still
  /// readable through the template.
  static const int maxListed = 200;

  /// An app file larger than this is not returned whole as a resource.
  static const int maxBlobBytes = 2 * 1024 * 1024;

  /// The guide ships in the bundle, so it is edited with everything else and
  /// read from the installed tree.
  File get guideFile => File('${paths.wwwRoot}system/mcp/guide.md');

  Future<String> guide() async {
    if (!await guideFile.exists()) {
      throw ToolFailure('The guide is missing from the installed bundle');
    }
    return guideFile.readAsString();
  }

  Map<String, Object?> list() {
    final resources = <Map<String, Object?>>[
      {
        'uri': guideUri,
        'name': 'guide',
        'title': 'How to write an aCelery app',
        'mimeType': 'text/markdown',
      },
    ];
    outer:
    for (final dir in apps.list()) {
      final app = p.basename(dir.path);
      for (final file in apps.files(dir)) {
        if (resources.length > maxListed) break outer;
        final path = apps.relative(dir, file);
        resources.add({
          'uri': appFileUri(app, path),
          'name': '$app/$path',
          'mimeType': _mimeOf(path),
          'size': file.lengthSync(),
        });
      }
    }
    return {'resources': resources};
  }

  Map<String, Object?> templates() => {
        'resourceTemplates': [
          {
            'uriTemplate': '$_appsPrefix{app}/{+path}',
            'name': 'app-file',
            'title': 'A file in an app',
            'description': 'Any file of an app under www/user/, by its path '
                'inside the app.',
          },
        ],
      };

  Future<Map<String, Object?>> read(Object? params) async {
    final uri = params is Map ? params['uri'] : null;
    if (uri is! String) throw McpError.invalidParams('"uri" is required');

    if (uri == guideUri) {
      return _contents(uri, 'text/markdown', text: await _orNotFound(guide));
    }

    if (uri.startsWith(_appsPrefix)) {
      final rest = uri.substring(_appsPrefix.length).split('/');
      if (rest.length < 2) throw _notFound(uri);
      final List<String> segments;
      try {
        segments = rest.map(Uri.decodeComponent).toList();
      } on ArgumentError {
        throw _notFound(uri);
      }
      final file = await _orNotFound(() async {
        return apps.file(apps.app(segments.first), segments.skip(1).join('/'));
      });
      if (!await file.exists()) throw _notFound(uri);

      // A resource is read whole — the reader asked for this one file — so the
      // per-file cap on read_app's text does not apply; a size limit does.
      final size = await file.length();
      if (size > maxBlobBytes) {
        throw McpError.invalidParams(
            '$uri is $size bytes, over the $maxBlobBytes-byte limit');
      }
      final bytes = await file.readAsBytes();
      final mime = _mimeOf(file.path);
      try {
        final text = utf8.decode(bytes);
        if (!text.contains('\u0000')) return _contents(uri, mime, text: text);
      } on FormatException {
        // Binary: sent as a blob below.
      }
      return _contents(uri, mime, blob: base64Encode(bytes));
    }

    throw _notFound(uri);
  }

  static String appFileUri(String app, String path) =>
      '$_appsPrefix${Uri.encodeComponent(app)}/'
      '${path.split('/').map(Uri.encodeComponent).join('/')}';

  Map<String, Object?> prompts() => {
        'prompts': [
          {
            'name': 'create_acelery_app',
            'title': 'Create an aCelery app',
            'description': 'Builds a new app on the device from an idea, '
                'following the guide.',
            'arguments': [
              {
                'name': 'idea',
                'description': 'What the app should do.',
                'required': true,
              },
            ],
          },
        ],
      };

  Future<Map<String, Object?>> prompt(Object? params) async {
    final name = params is Map ? params['name'] : null;
    if (name != 'create_acelery_app') {
      throw McpError.invalidParams('Unknown prompt: $name');
    }
    final arguments = params is Map ? params['arguments'] : null;
    final idea = arguments is Map ? arguments['idea'] : null;
    if (idea is! String || idea.trim().isEmpty) {
      throw McpError.invalidParams('"idea" is required');
    }

    return {
      'description': 'Create an aCelery app',
      'messages': [
        {
          'role': 'user',
          'content': {
            'type': 'resource',
            'resource': {
              'uri': guideUri,
              'mimeType': 'text/markdown',
              'text': await _orNotFound(guide),
            },
          },
        },
        {
          'role': 'user',
          'content': {
            'type': 'text',
            'text': 'Create an aCelery app on my phone that does this:\n\n'
                '$idea\n\n'
                'Follow the guide above. Check list_apps for a name that is '
                'free, create the app with create_app, then write its files '
                'with write_file. If it keeps data, create its tables from '
                'the app itself on start, as the guide shows, rather than with '
                'exec_db, so the app works on a fresh install. Tell me the '
                'app\'s name when it is ready to run.',
          },
        },
      ],
    };
  }

  static Map<String, Object?> _contents(String uri, String mime,
          {String? text, String? blob}) =>
      {
        'contents': [
          {
            'uri': uri,
            'mimeType': mime,
            'text': ?text,
            'blob': ?blob,
          },
        ],
      };

  static String _mimeOf(String path) {
    if (path.endsWith('.md')) return 'text/markdown';
    return lookupMimeType(path) ?? 'application/octet-stream';
  }

  /// The specification's code for a resource that does not exist.
  static McpError _notFound(String uri) =>
      McpError(-32002, 'Resource not found: $uri');

  /// Turns a [ToolFailure] from the shared app checks into a protocol error,
  /// which is what a resource read reports.
  static Future<T> _orNotFound<T>(Future<T> Function() read) async {
    try {
      return await read();
    } on ToolFailure catch (e) {
      throw McpError(-32002, e.message);
    }
  }
}
