import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../acelery_runtime.dart';
import '../bundle_installer.dart';
import '../paths.dart';

/// The platform work the two Activities used to do: saving a download,
/// picking a project archive to import.
class HostActions {
  const HostActions(this.runtime);

  final ACeleryRuntime runtime;

  /// Saves an export to a real file and hands it to the system share sheet.
  ///
  /// `ACeleryActivity` enqueued these with `DownloadManager` straight into
  /// Downloads/. Scoped storage makes that a permission dance now, and the
  /// share sheet lets the user put the file wherever they actually want it.
  ///
  /// The payload never leaves the device on its own: the bytes are pulled
  /// straight out of the in-process bridge rather than fetched over HTTP, so
  /// the export is not consumed twice.
  Future<void> download(Uri url) async {
    final (name, bytes) = await _resolve(url);
    if (bytes == null) return;

    final file = File(ACeleryPaths.normalize('${runtime.paths.cacheRoot}$name'));
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes);

    await SharePlus.instance.share(
      ShareParams(files: [XFile(file.path)], fileNameOverrides: [name]),
    );
  }

  /// Reads the pending export directly from the bridge that produced it.
  Future<(String, List<int>?)> _resolve(Uri url) async {
    final q = url.queryParameters;

    if (q['opt'] == 'export') {
      final handle = int.tryParse(q['handle'] ?? '');
      if (handle == null) return ('export', null);
      final pending = runtime.server.export.peek(handle);
      if (pending == null) return ('export', null);
      runtime.server.export.remove(handle);
      return (pending.fname, utf8.encode(pending.data));
    }

    if (q['opt'] == 'exportproject') {
      final project = q['project'];
      if (project == null) return ('project.zip', null);
      final zipPath = await runtime.server.export.exportProject(project);
      if (zipPath == null) return ('$project.zip', null);
      final zip = File(zipPath);
      final bytes = await zip.readAsBytes();
      await zip.delete();
      return ('$project.zip', bytes);
    }

    return (url.pathSegments.lastOrNull ?? 'download', null);
  }

  /// Opens a link outside aCelery, the way the Website menu item did.
  ///
  /// A user app is free to link anywhere; letting the WebView follow would
  /// replace the running app with a web page and strip it of its bridge.
  Future<void> openExternal(Uri url) =>
      launchUrl(url, mode: LaunchMode.externalApplication);

  /// Replaces `xSelectImportProjectFile` plus the `onActivityResult` handler.
  ///
  /// Returns the imported project's name, or null if the user cancelled or the
  /// archive was unusable.
  Future<String?> importProject() async {
    final picked = await FilePicker.pickFile(
      dialogTitle: 'Import aCelery project',
      type: FileType.custom,
      allowedExtensions: const ['zip'],
    );
    final path = picked?.path;
    if (path == null) return null;

    final name = _projectNameFor(path);
    final target = Directory(runtime.paths.userProjectDir(name));
    await target.create(recursive: true);

    await extractArchive(await File(path).readAsBytes(), target);
    return name;
  }

  String _projectNameFor(String archivePath) {
    final base = archivePath.split(Platform.pathSeparator).last;
    final name = base.endsWith('.zip')
        ? base.substring(0, base.length - 4)
        : base;
    // Keep it to something that survives a URL and a directory name, since it
    // becomes /user/<name>/ and an `app=` query parameter.
    return name.replaceAll(RegExp(r'[^A-Za-z0-9 _-]'), '_');
  }
}

/// Shown while a host action is running.
Future<void> showBusy(BuildContext context, Future<void> work) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    await work;
  } on Exception catch (error) {
    messenger.showSnackBar(SnackBar(content: Text('$error')));
  }
}
