import 'dart:io';

import 'package:archive/archive_io.dart';

import '../paths.dart';
import 'handle_table.dart';

/// One pending download, held in memory until the WebView fetches it.
class ExportFile {
  ExportFile({required this.mime, required this.fname, required this.data});

  final String mime;
  final String fname;
  final String data;

  /// `getwv` is issued by the in-WebView path, which requests twice (once to
  /// probe, once to download), so the entry is only dropped on the second hit.
  int requestCount = 0;
}

/// Implements `opt=export` (in-memory downloads produced by `xExportFile`) and
/// `opt=exportproject` (zipping a user project folder).
class ExportBridge {
  ExportBridge({required this.paths});

  final ACeleryPaths paths;

  final HandleTable<ExportFile> _exports = HandleTable();

  int set(String mime, String fname, String data) =>
      _exports.add(ExportFile(mime: mime, fname: fname, data: data));

  ExportFile? peek(int handle) {
    final file = _exports[handle];
    file?.requestCount++;
    return file;
  }

  void remove(int handle) => _exports.remove(handle);

  /// `xRemoveExportFileConditional` — only drop once the WebView has actually
  /// pulled the bytes.
  void removeIfFetched(int handle) {
    final file = _exports[handle];
    if (file != null && file.requestCount >= 2) _exports.remove(handle);
  }

  /// Zips `www/user/<project>` into the cache directory and returns the zip's
  /// path. The caller streams it out and deletes it.
  ///
  /// Entries are stored without the project directory prefix, matching
  /// `aCeleryZip.java` so archives stay interchangeable with existing aCelery
  /// exports. Unlike the original this recurses: the Java version called
  /// `new FileInputStream()` on every child including directories, so a
  /// project containing a subfolder threw and produced a truncated zip.
  ///
  /// Returns null when the project name escapes the user directory — the name
  /// arrives as a query parameter from the WebView.
  Future<String?> exportProject(String project) async {
    final dir = Directory(paths.userProjectDir(project));
    if (!ACeleryPaths.isInside(Directory(paths.userRoot), dir)) return null;
    if (!await dir.exists()) return null;

    final encoder = ZipFileEncoder();
    await Directory(paths.cacheRoot).create(recursive: true);
    final zipPath = ACeleryPaths.normalize('${paths.cacheRoot}$project.zip');
    encoder.create(zipPath);
    await encoder.addDirectory(dir, includeDirName: false);
    await encoder.close();
    return zipPath;
  }
}
