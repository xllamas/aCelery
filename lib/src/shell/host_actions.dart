import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../acelery_runtime.dart';
import '../bundle_installer.dart';
import '../paths.dart';
import 'home_shortcuts.dart';

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

  /// What [url] names: a pending export, read straight from the bridge that
  /// produced it, or a file the bundle ships.
  ///
  /// Null bytes mean nothing was found, and [download] then does nothing --
  /// a stale handle, or a link to a file that is not there.
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

    // A static file the page linked to rather than an export it staged: the
    // user's guide, and anything else the bundle ships that a WebView cannot
    // render itself. Confined to the served tree, because `download` is
    // reachable from any page and what it resolves goes to the share sheet.
    final name = url.pathSegments.lastOrNull ?? 'download';
    final root = Directory(runtime.paths.wwwRoot);
    final file = File(
        ACeleryPaths.normalize('${runtime.paths.wwwRoot}${url.path}'));
    if (ACeleryPaths.isInside(root, file) && file.existsSync()) {
      return (name, await file.readAsBytes());
    }

    return (name, null);
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

/// Apps → ⋮ → Add to home screen, and the same item in a running app's menu.
///
/// Says nothing when the launcher takes the request: it asks the user itself,
/// and the IDE reports the shortcut once the launcher confirms it is placed.
Future<void> addToHomeScreen(
  BuildContext context,
  ACeleryRuntime runtime,
  String app,
) async {
  final messenger = ScaffoldMessenger.of(context);
  void say(String text) =>
      messenger.showSnackBar(SnackBar(content: Text(text)));

  final shortcuts = runtime.shortcuts;
  if (!shortcuts.exists(app)) {
    say('$app no longer exists');
    return;
  }
  try {
    switch (await shortcuts.pin(app)) {
      case PinOutcome.requested:
        break;
      case PinOutcome.updated:
        say('$app is already on your home screen');
      case PinOutcome.unsupported:
        say("Your home screen doesn't accept shortcuts");
    }
  } on PlatformException catch (error) {
    say('Could not add $app: ${error.message}');
  }
}
