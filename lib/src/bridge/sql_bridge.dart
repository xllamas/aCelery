import 'dart:typed_data';

import 'package:sqflite_common/sqlite_api.dart';

import '../paths.dart';
import 'handle_table.dart';

/// A scrollable cursor over a completed query.
///
/// The Android original handed out a live `android.database.Cursor`; sqflite
/// returns the full result list, so the cursor becomes a list plus an index.
/// The position semantics are reproduced exactly, because `xscript_crud.js`
/// depends on them:
///
///  * after `select` the cursor sits on row 0;
///  * `getNextRow` returns the *current* row then advances, and returns `{}`
///    once past the last row;
///  * `getPrevRow` returns the current row then steps back, and returns `{}`
///    once before the first row;
///  * `gotoLastRow` positions on the last row so a `getPrevRow` walk can start.
class SqlCursor {
  SqlCursor(this.rows);

  final List<Map<String, Object?>> rows;
  int position = 0;

  int get rowCount => rows.length;

  bool get isAfterLast => position >= rows.length;

  bool get isBeforeFirst => position < 0;

  void gotoLast() => position = rows.length - 1;

  /// Returns the current row and advances; null once exhausted.
  Map<String, String>? next() {
    if (isAfterLast || isBeforeFirst) return null;
    final row = _stringify(rows[position]);
    position++;
    return row;
  }

  /// Returns the current row and steps back; null once exhausted.
  Map<String, String>? previous() {
    if (isAfterLast || isBeforeFirst) return null;
    final row = _stringify(rows[position]);
    position--;
    return row;
  }

  /// The Java bridge put every column into the JSON object as a string, with
  /// NULL and BLOB collapsing to "". xScript compares and concatenates these
  /// as strings throughout, so the coercion is part of the contract.
  static Map<String, String> _stringify(Map<String, Object?> row) {
    final out = <String, String>{};
    row.forEach((key, value) {
      out[key] = switch (value) {
        null => '',
        Uint8List() => '',
        int v => v.toString(),
        double v => v.toString(),
        _ => value.toString(),
      };
    });
    return out;
  }
}

/// A SQL statement the database refused.
///
/// The cursor routes swallow errors and return -1, because that is what
/// `aCeleryAndroidInterface` did. The async routes report them instead: an app
/// author debugging a typo in a WHERE clause should see the message, not an
/// empty list.
class SqlError implements Exception {
  SqlError(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Implements the `opt=sql` routes of `/android.itf`.
class SqlBridge {
  SqlBridge({required this.paths, required this.factory});

  final ACeleryPaths paths;
  final DatabaseFactory factory;

  final HandleTable<Database> _databases = HandleTable();
  final HandleTable<SqlCursor> _cursors = HandleTable();

  /// `bpath` overrides the default db directory when supplied, matching
  /// `xSqlOpen(path, bpath)`.
  String _resolve(String path, String? basePath) =>
      (basePath == null || basePath.isEmpty)
          ? ACeleryPaths.normalize('${paths.dbRoot}$path')
          : ACeleryPaths.normalize('$basePath$path');

  /// Returns the new handle, or -1 if the database could not be opened.
  Future<int> openDb(String path, String? basePath) async {
    try {
      final db = await factory.openDatabase(
        _resolve(path, basePath),
        // One connection per handle. sqflite's default shares a single
        // instance per path, so closing any handle closed the database under
        // every other handle on the same file — the shell saving a setting
        // closed acelery.db beneath the Data screen browsing it, and every
        // query after that failed. Android's SQLiteDatabase, which this
        // replaces, never shared one either.
        options: OpenDatabaseOptions(singleInstance: false),
      );
      return _databases.add(db);
    } on DatabaseException {
      return -1;
    }
  }

  Future<void> closeDb(int handle) async {
    await _databases.remove(handle)?.close();
  }

  Future<void> deleteDb(String path, String? basePath) async {
    try {
      await factory.deleteDatabase(_resolve(path, basePath));
    } on DatabaseException {
      // The Java version logged and swallowed this too.
    }
  }

  Future<void> exec(int handle, String query) async {
    try {
      await _databases[handle]?.execute(query);
    } on DatabaseException {
      // Swallowed, as in aCeleryAndroidInterface.xSqlExec.
    }
  }

  /// Returns the inserted rowid, or -1 on error.
  Future<int> insert(int handle, String query) async {
    try {
      final db = _databases[handle];
      if (db == null) return -1;
      return await db.rawInsert(query);
    } on DatabaseException {
      return -1;
    }
  }

  /// Returns a cursor handle, or -1 on error.
  Future<int> select(int handle, String query) async {
    try {
      final db = _databases[handle];
      if (db == null) return -1;
      return _cursors.add(SqlCursor(await db.rawQuery(query)));
    } on DatabaseException {
      return -1;
    }
  }

  // ------------------------------------------------- Phase 4b: the async API
  //
  // The cursor protocol above exists to mimic android.database.Cursor, and it
  // costs one HTTP round-trip per row. sqflite already materialises the whole
  // result, so these three return it in one call and take bound parameters
  // instead of concatenated SQL. See doc/js-ui-framework-evaluation.md §3.3.
  //
  // Unlike the cursor routes these do not stringify: a column comes back as
  // the JSON type sqflite gave it, so an INTEGER stays a number and NULL stays
  // null. Nothing depends on the old coercion here — it was the Cursor
  // contract, and the cursor is what these replace.

  /// Runs a SELECT and returns every row. Throws [SqlError] on a bad
  /// statement, so the caller sees the message rather than an empty result.
  Future<List<Map<String, Object?>>> query(
    int handle,
    String sql, [
    List<Object?> args = const [],
  ]) async {
    final db = _requireDb(handle);
    try {
      return await db.rawQuery(sql, _bind(args));
    } on DatabaseException catch (e) {
      throw SqlError('$e');
    }
  }

  /// Runs a statement that returns no rows; yields the number of rows changed.
  Future<int> run(
    int handle,
    String sql, [
    List<Object?> args = const [],
  ]) async {
    final db = _requireDb(handle);
    try {
      return await db.rawUpdate(sql, _bind(args));
    } on DatabaseException catch (e) {
      throw SqlError('$e');
    }
  }

  /// Runs an INSERT; yields the new rowid.
  Future<int> insertRow(
    int handle,
    String sql, [
    List<Object?> args = const [],
  ]) async {
    final db = _requireDb(handle);
    try {
      return await db.rawInsert(sql, _bind(args));
    } on DatabaseException catch (e) {
      throw SqlError('$e');
    }
  }

  Database _requireDb(int handle) {
    final db = _databases[handle];
    if (db == null) throw SqlError('no open database with handle $handle');
    return db;
  }

  /// JSON gives us bool, which sqflite does not bind; SQLite has no boolean
  /// type either, so they go in as 0/1 exactly as SQLite stores them.
  static List<Object?> _bind(List<Object?> args) => [
        for (final a in args)
          switch (a) {
            bool b => b ? 1 : 0,
            _ => a,
          },
      ];

  // ------------------------------------------------- the cursor API (legacy)

  int rowCount(int cursor) => _cursors[cursor]?.rowCount ?? -1;

  void gotoLastRow(int cursor) => _cursors[cursor]?.gotoLast();

  Map<String, String>? nextRow(int cursor) => _cursors[cursor]?.next();

  Map<String, String>? prevRow(int cursor) => _cursors[cursor]?.previous();

  void closeCursor(int cursor) => _cursors.remove(cursor);

  /// Closes every open database. Called when the server shuts down.
  Future<void> dispose() async {
    for (final db in _databases.values) {
      await db.close();
    }
    _databases.clear();
    _cursors.clear();
  }
}
