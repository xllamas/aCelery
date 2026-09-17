import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// What a page's `<input type="file">` asked for, reduced to a picker the host
/// can open (doc/pickers-evaluation.md §2, §3).
sealed class ChooserPlan {
  const ChooserPlan();
}

/// `accept="image/*" capture`: the camera, one photo.
class TakePhoto extends ChooserPlan {
  const TakePhoto();
}

/// `accept="video/*" capture`: the camera, one video.
class RecordVideo extends ChooserPlan {
  const RecordVideo();
}

/// Only images: Android's Photo Picker.
class PickImages extends ChooserPlan {
  const PickImages({required this.multiple});

  final bool multiple;
}

/// Anything else: the system's document picker, narrowed where it can be.
class PickFiles extends ChooserPlan {
  const PickFiles({
    required this.type,
    required this.multiple,
    this.extensions = const [],
  });

  final FileType type;
  final bool multiple;

  /// Without dots, for [FileType.custom].
  final List<String> extensions;
}

/// A save dialog, which a file input never asks for.
class Unsupported extends ChooserPlan {
  const Unsupported();
}

const _imageExtensions = {
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'avif',
};
const _videoExtensions = {'mp4', 'mov', 'webm', '3gp', 'mkv', 'm4v'};
const _audioExtensions = {'mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'flac', 'opus'};

enum _Kind { image, video, audio, other }

/// Decides which picker answers a file input.
///
/// [accept] is the input's `accept` list as the WebView passes it: MIME types
/// (`image/*`, `application/json`) and extensions (`.csv`), in any mix.
ChooserPlan planChooser({
  required List<String> accept,
  required bool multiple,
  required bool capture,
  bool save = false,
}) {
  if (save) return const Unsupported();

  final entries = [
    for (final raw in accept)
      for (final part in raw.split(','))
        if (part.trim().isNotEmpty) part.trim().toLowerCase(),
  ];
  if (entries.isEmpty) return PickFiles(type: FileType.any, multiple: multiple);

  _Kind kindOf(String entry) {
    final ext = entry.startsWith('.') ? entry.substring(1) : null;
    if (entry.startsWith('image/') || _imageExtensions.contains(ext)) {
      return _Kind.image;
    }
    if (entry.startsWith('video/') || _videoExtensions.contains(ext)) {
      return _Kind.video;
    }
    if (entry.startsWith('audio/') || _audioExtensions.contains(ext)) {
      return _Kind.audio;
    }
    return _Kind.other;
  }

  final kinds = entries.map(kindOf).toSet();
  if (kinds.length == 1) {
    switch (kinds.single) {
      case _Kind.image:
        return capture ? const TakePhoto() : PickImages(multiple: multiple);
      case _Kind.video:
        return capture
            ? const RecordVideo()
            : PickFiles(type: FileType.video, multiple: multiple);
      case _Kind.audio:
        return PickFiles(type: FileType.audio, multiple: multiple);
      case _Kind.other:
        break;
    }
  }
  if (!kinds.contains(_Kind.other) && !kinds.contains(_Kind.audio)) {
    return PickFiles(type: FileType.media, multiple: multiple);
  }

  // Narrow the document picker by extension when every entry names one. A
  // wildcard such as text/* cannot be written as extensions, so it opens the
  // picker unfiltered and leaves the page's own check to reject a wrong file.
  final extensions = <String>{};
  for (final entry in entries) {
    if (entry.startsWith('.')) {
      extensions.add(entry.substring(1));
    } else if (entry.endsWith('/*')) {
      return PickFiles(type: FileType.any, multiple: multiple);
    } else {
      final ext = extensionFromMime(entry);
      if (ext == null) return PickFiles(type: FileType.any, multiple: multiple);
      extensions.add(ext);
    }
  }
  return PickFiles(
    type: FileType.custom,
    multiple: multiple,
    extensions: extensions.toList(),
  );
}

/// Answers the Android WebView's file chooser, so `<input type="file">` works
/// in aCelery as it does in a browser.
///
/// Both plugins copy what the user picks into the app's cache. The copies are
/// moved into a folder of aCelery's own, one subfolder per pick, and handed to
/// the WebView as `file://` URIs. The page reads a `File` lazily, maybe long
/// after the pick, so copies are not deleted at the next pick: they go at
/// startup, and after an hour.
class FileChooser {
  FileChooser({ImagePicker? images}) : _images = images ?? ImagePicker();

  final ImagePicker _images;

  static const String folderName = 'acelery_picked';

  /// How long a pick's files are kept while aCelery keeps running.
  static const Duration keep = Duration(hours: 1);

  static Future<Directory> _root() async =>
      Directory(p.join((await getTemporaryDirectory()).path, folderName));

  /// Removes every earlier pick. Called when aCelery starts.
  static Future<void> clearAll() async {
    try {
      final root = await _root();
      if (root.existsSync()) await root.delete(recursive: true);
    } on FileSystemException catch (e) {
      debugPrint('aCelery: could not clear picked files: $e');
    }
  }

  /// Opens the picker [plan] names and returns `file://` URIs, or none when
  /// the user cancels.
  Future<List<String>> choose(ChooserPlan plan) async {
    final picked = await _open(plan);
    if (picked.isEmpty) return const [];

    final root = await _root();
    await _removeOld(root);
    final pick = Directory(
        p.join(root.path, '${DateTime.now().microsecondsSinceEpoch}'));
    await pick.create(recursive: true);

    return [
      for (final path in picked)
        Uri.file((await _move(File(path), pick)).path).toString(),
    ];
  }

  Future<List<String>> _open(ChooserPlan plan) async {
    switch (plan) {
      case TakePhoto():
        final photo = await _images.pickImage(
            source: ImageSource.camera, requestFullMetadata: false);
        return [?photo?.path];
      case RecordVideo():
        final video = await _images.pickVideo(source: ImageSource.camera);
        return [?video?.path];
      case PickImages(multiple: true):
        final photos = await _images.pickMultiImage(requestFullMetadata: false);
        return [for (final photo in photos) photo.path];
      case PickImages():
        final photo = await _images.pickImage(
            source: ImageSource.gallery, requestFullMetadata: false);
        return [?photo?.path];
      case PickFiles(:final type, :final multiple, :final extensions):
        final custom = type == FileType.custom;
        if (multiple) {
          final files = await FilePicker.pickFiles(
            type: type,
            allowedExtensions: custom ? extensions : null,
          );
          return [for (final file in files) ?file.path];
        }
        final file = await FilePicker.pickFile(
          type: type,
          allowedExtensions: custom ? extensions : null,
        );
        return [?file?.path];
      case Unsupported():
        return const [];
    }
  }

  /// Moves a plugin's copy into [pick], keeping its name. A rename, because
  /// both live in the cache; a copy if that ever fails.
  static Future<File> _move(File from, Directory pick) async {
    final to = p.join(pick.path, p.basename(from.path));
    try {
      return await from.rename(to);
    } on FileSystemException {
      final copy = await from.copy(to);
      await from.delete().catchError((Object _) => from);
      return copy;
    }
  }

  static Future<void> _removeOld(Directory root) async {
    if (!root.existsSync()) return;
    final cutoff = DateTime.now().subtract(keep);
    for (final entry in root.listSync().whereType<Directory>()) {
      if (entry.statSync().modified.isBefore(cutoff)) {
        await entry.delete(recursive: true).catchError((Object _) => entry);
      }
    }
  }
}
