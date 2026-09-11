import 'dart:io';

import '../paths.dart';
import 'handle_table.dart';

/// Metadata for one directory entry, shaped exactly as `xFile.listFiles`
/// expects (`aCeleryAndroidInterface.xListFiles`).
class FileEntry {
  FileEntry({
    required this.path,
    required this.fname,
    required this.directory,
    required this.lastModified,
    required this.length,
  });

  final String path;
  final String fname;
  final bool directory;
  final int lastModified;
  final int length;

  Map<String, Object?> toJson() => {
        'path': path,
        'fname': fname,
        'directory': directory,
        'lastmodified': lastModified,
        'length': length,
      };
}

/// Implements the eight `opt=file` routes of `/android.itf`.
///
/// Every resolved path is checked against the aCelery tree before use. The
/// Java original did not do this: `path` and `bpath` come straight from the
/// WebView, so `../` in either escaped to anywhere the app could read.
class FileBridge {
  FileBridge({required this.paths});

  final ACeleryPaths paths;

  final HandleTable<File> _files = HandleTable();

  Directory get _sandbox => Directory(paths.base);

  /// `xFileOpen` and `xListFiles` joined with a separator; `xFileMkDir` did
  /// not. Both forms are normalized to the same result.
  String _resolve(String path, String? basePath) =>
      ACeleryPaths.join(
        (basePath == null || basePath.isEmpty) ? paths.filesRoot : basePath,
        path,
      );

  /// Returns false for anything outside the aCelery tree.
  bool _permitted(String resolved) =>
      ACeleryPaths.isInside(_sandbox, File(resolved));

  /// Returns a handle, or -1 if the path escapes the sandbox.
  int open(String path, String? basePath) {
    final resolved = _resolve(path, basePath);
    if (!_permitted(resolved)) return -1;
    return _files.add(File(resolved));
  }

  /// Returns null when the path is not a directory, matching the Java method's
  /// empty-string return.
  List<FileEntry>? listFiles(String path, String? basePath) {
    final resolved = _resolve(path, basePath);
    if (!_permitted(resolved)) return null;
    final dir = Directory(resolved);
    if (!dir.existsSync()) return null;

    final entries = <FileEntry>[];
    for (final entity in dir.listSync()) {
      final stat = entity.statSync();
      entries.add(FileEntry(
        path: entity.path,
        fname: entity.uri.pathSegments
            .lastWhere((s) => s.isNotEmpty, orElse: () => entity.path),
        directory: stat.type == FileSystemEntityType.directory,
        lastModified: stat.modified.millisecondsSinceEpoch,
        length: stat.size,
      ));
    }
    return entries;
  }

  bool mkdir(String path, String? basePath) {
    final resolved = _resolve(path, basePath);
    if (!_permitted(resolved)) return false;
    final dir = Directory(resolved);
    if (dir.existsSync()) return false; // File.mkdir() returns false too.
    try {
      dir.createSync(recursive: true);
      return true;
    } on FileSystemException {
      return false;
    }
  }

  void close(int handle) => _files.remove(handle);

  /// Deletes the handle's target. Directories are removed with their immediate
  /// children, as `xFileDelete` did.
  bool delete(int handle) {
    final file = _files[handle];
    if (file == null) return false;
    if (!_permitted(file.path)) return false;
    try {
      final dir = Directory(file.path);
      if (dir.existsSync()) {
        dir.deleteSync(recursive: true);
        return true;
      }
      if (!file.existsSync()) return false;
      file.deleteSync();
      return true;
    } on FileSystemException {
      return false;
    }
  }

  /// Returns the file's contents, or "" if it cannot be read — the Java
  /// version returned the (empty) buffer on IOException rather than throwing.
  String read(int handle) {
    final file = _files[handle];
    if (file == null || !_permitted(file.path)) return '';
    try {
      return file.readAsStringSync();
    } on FileSystemException {
      return '';
    }
  }

  void write(int handle, String data, {required bool append}) {
    final file = _files[handle];
    if (file == null || !_permitted(file.path)) return;
    try {
      file.parent.createSync(recursive: true);
      file.writeAsStringSync(
        data,
        mode: append ? FileMode.append : FileMode.write,
      );
    } on FileSystemException {
      // Logged and swallowed in the original.
    }
  }

  /// `xGetExternalStoragePath` — the parent of the aCelery folder. The JS side
  /// concatenates "/aCelery/www/user/" onto this in `launcher.html`.
  String externalStoragePath() => paths.root;
}
