import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:path/path.dart' as p;

import '../bridge/sql_bridge.dart';
import '../paths.dart';
import 'tool.dart';

/// Rows `query_db` returns before it stops.
const int maxQueryRows = 200;

/// `list_databases`, `query_db` and `exec_db` (doc/mcp-server.md §5).
///
/// These go through [SqlBridge] in-process, so they get its path confinement
/// and the read-only handles M0 added, and share its engine with the pages.
List<McpTool> dataTools(ACeleryPaths paths, SqlBridge sql) {
  const databaseProperty = {
    'type': 'string',
    'description': 'A database file name in db/, as list_databases reports '
        'it, such as "xtest.db".',
  };
  const sqlProperty = {
    'type': 'string',
    'description': 'One SQL statement. Use ? placeholders and params for '
        'values rather than building strings.',
  };
  const paramsProperty = {
    'type': 'array',
    'description': 'Values bound to the ? placeholders, in order.',
    'items': {
      'type': ['string', 'number', 'boolean', 'null'],
    },
  };

  String target(ToolArgs a) => a.optionalString('database') ?? '?';

  return [
    McpTool(
      name: 'list_databases',
      title: 'List databases',
      description: 'Lists the SQLite databases in db/, with size and mtime. '
          'Journal files are left out.',
      properties: const {},
      readOnly: true,
      run: (_) {
        final dir = Directory(paths.dbRoot);
        if (!dir.existsSync()) return {'databases': const []};
        final files = dir.listSync().whereType<File>().where((f) {
          final name = p.basename(f.path);
          return !name.endsWith('-journal') &&
              !name.endsWith('-wal') &&
              !name.endsWith('-shm');
        }).toList()
          ..sort((a, b) => a.path.compareTo(b.path));
        return {
          'databases': [
            for (final f in files)
              {
                'name': p.basename(f.path),
                'size': f.lengthSync(),
                'mtime': f.statSync().modified.millisecondsSinceEpoch,
              },
          ],
        };
      },
    ),
    McpTool(
      name: 'query_db',
      title: 'Query a database',
      description: 'Runs one read-only statement (SELECT, or a PRAGMA that '
          'reads) and returns up to $maxQueryRows rows. The database is opened '
          'read-only, so nothing here can change it. BLOB columns come back as '
          'a size, not their bytes.',
      properties: {
        'database': databaseProperty,
        'sql': sqlProperty,
        'params': paramsProperty,
      },
      required: const ['database', 'sql'],
      readOnly: true,
      target: target,
      run: (args) async {
        final name = _databaseName(args.string('database'));
        final statement = args.string('sql');
        final params = _params(args);
        refuseAttach(statement);

        if (!File('${paths.dbRoot}$name').existsSync()) {
          throw ToolFailure('No database named "$name". list_databases shows '
              'the databases.');
        }
        final handle = await sql.openDb(name, null, readOnly: true);
        if (handle < 0) throw ToolFailure('"$name" could not be opened');
        try {
          final rows = await sql.query(handle, statement, params);
          return {
            'columns': rows.isEmpty ? const [] : rows.first.keys.toList(),
            'rows': [
              for (final row in rows.take(maxQueryRows)) _jsonRow(row),
            ],
            'rowCount': rows.length,
            if (rows.length > maxQueryRows) 'truncated': true,
          };
        } on SqlError catch (e) {
          throw ToolFailure(e.message);
        } finally {
          await sql.closeDb(handle);
        }
      },
    ),
    McpTool(
      name: 'exec_db',
      title: 'Change a database',
      description: 'Runs one statement that changes data or schema — INSERT, '
          'UPDATE, DELETE, CREATE, DROP. Creates the database if it does not '
          'exist. Returns the rows changed, and the new rowid after an INSERT.',
      properties: {
        'database': databaseProperty,
        'sql': sqlProperty,
        'params': paramsProperty,
      },
      required: const ['database', 'sql'],
      destructive: true,
      target: target,
      run: (args) async {
        final name = _databaseName(args.string('database'));
        final statement = args.string('sql');
        final params = _params(args);
        refuseAttach(statement);

        final handle = await sql.openDb(name, null);
        if (handle < 0) throw ToolFailure('"$name" could not be opened');
        try {
          // Measured around the statement rather than taken from what the
          // platform reports: on Android, CREATE TABLE on a fresh database
          // came back as one change with rowid 1. These two functions count
          // on this connection only, so DDL is 0 and a rowid is reported only
          // when this statement produced one.
          Future<Map<String, Object?>> counters() async => (await sql.query(
                  handle,
                  'select total_changes() as changes, '
                  'last_insert_rowid() as rowid'))
              .first;
          final before = await counters();
          await sql.run(handle, statement, params);
          final after = await counters();
          return {
            'changes':
                (after['changes'] as int) - (before['changes'] as int),
            if (after['rowid'] != before['rowid'])
              'lastInsertRowid': after['rowid'],
          };
        } on SqlError catch (e) {
          throw ToolFailure(e.message);
        } finally {
          await sql.closeDb(handle);
        }
      },
    ),
  ];
}

/// A database is a file directly in db/; anything with a path in it is not.
String _databaseName(String name) {
  if (name.isEmpty ||
      name.contains('/') ||
      name.contains(r'\') ||
      name.startsWith('.')) {
    throw ToolFailure('"$name" is not a database name: it must be a file name '
        'in db/, with no folders');
  }
  return name;
}

List<Object?> _params(ToolArgs args) {
  final params = args.optionalList('params');
  for (final value in params) {
    if (value is Map || value is List) {
      throw ToolFailure('params must be strings, numbers, booleans or null');
    }
  }
  return params;
}

/// Refuses `ATTACH` and `VACUUM INTO`.
///
/// Both name a file by path inside the SQL, which the bridge's confinement
/// never sees: `ATTACH '/anywhere/x.db'` creates or opens a database outside
/// the aCelery tree, and `VACUUM INTO` writes one. SQLite's authorizer would be
/// the proper place to stop them, and sqflite does not expose it, so the text
/// is checked instead — with string literals, quoted identifiers and comments
/// removed first, so that a value or a column that merely says "attach" does
/// not trip it.
void refuseAttach(String statement) {
  final code = statement.replaceAll(
    RegExp(
      r"'(?:[^']|'')*'"
      r'|"(?:[^"]|"")*"'
      r'|`(?:[^`]|``)*`'
      r'|\[[^\]]*\]'
      r'|--[^\n]*'
      r'|/\*[\s\S]*?(?:\*/|$)',
    ),
    ' ',
  );
  if (RegExp(r'\battach\b', caseSensitive: false).hasMatch(code) ||
      RegExp(r'\bvacuum\b[\s\S]*\binto\b', caseSensitive: false)
          .hasMatch(code)) {
    throw ToolFailure('ATTACH and VACUUM INTO are not allowed: they reach '
        'files outside db/. Query each database by name instead.');
  }
}

/// A row as JSON: BLOBs have no JSON form, so they are described instead.
Map<String, Object?> _jsonRow(Map<String, Object?> row) => {
      for (final entry in row.entries)
        entry.key: switch (entry.value) {
          final Uint8List bytes => {'blob': bytes.length},
          final double d when d.isNaN || d.isInfinite => d.toString(),
          final value => value,
        },
    };

/// For tests: the text a result would be encoded as.
String encodeRow(Map<String, Object?> row) => jsonEncode(_jsonRow(row));
