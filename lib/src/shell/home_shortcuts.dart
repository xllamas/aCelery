import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;

import '../paths.dart';

/// What asking for a home screen shortcut came to.
enum PinOutcome {
  /// The launcher is asking the user; it confirms on its own.
  requested,

  /// The shortcut was already there, and now carries the current icon.
  updated,

  /// The launcher, or an Android older than 8.0, cannot take one.
  unsupported,
}

/// Home screen shortcuts that open one of the user's apps
/// (android/…/HomeShortcuts.kt).
///
/// `ACeleryUserAppActivity` offered "Add Shortcut". iOS has no way for an app
/// to put an icon on the home screen, so there the item is not offered at all
/// (doc/modernization-assessment.md, Addendum 2).
class HomeShortcuts {
  HomeShortcuts(this.paths);

  final ACeleryPaths paths;

  static const MethodChannel _channel = MethodChannel('acelery/shortcuts');

  static bool get supported => !kIsWeb && Platform.isAndroid;

  /// Calls [onOpen] with each app a shortcut asks for, starting with the one
  /// that launched aCelery, if any, and [onPinned] once the launcher has put
  /// a shortcut on the home screen.
  void listen({
    required void Function(String app) onOpen,
    required void Function(String app) onPinned,
  }) {
    if (!supported) return;
    Future<void> take() async {
      final app = await _channel.invokeMethod<String>('take');
      if (app != null) onOpen(app);
    }

    _channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'pending':
          await take();
        case 'pinned':
          final app = (call.arguments as Map?)?['app'];
          if (app is String) onPinned(app);
      }
    });
    take();
  }

  /// Whether [app] names a project that is still there.
  ///
  /// The name arrives in an intent extra, and MainActivity is exported, so it
  /// is checked to be a single folder name before it goes near a path.
  bool exists(String app) =>
      isProjectName(app) && Directory(paths.userProjectDir(app)).existsSync();

  Future<PinOutcome> pin(String app) async {
    final icon = await renderShortcutIcon(app, await _manifestIcon(app));
    final outcome = await _channel.invokeMethod<String>(
      'pin',
      {'app': app, 'icon': icon},
    );
    return PinOutcome.values.asNameMap()[outcome] ?? PinOutcome.unsupported;
  }

  /// Disables the shortcuts of deleted apps, and re-enables any whose app has
  /// come back. Projects are deleted through the file bridge, which knows
  /// nothing of shortcuts, so this runs whenever aCelery leaves the screen.
  Future<void> sync() async {
    if (!supported) return;
    final root = Directory(paths.userRoot);
    if (!root.existsSync()) return;
    final apps = [
      for (final entry in root.listSync())
        if (entry is Directory) p.basename(entry.path),
    ];
    await _channel.invokeMethod<void>('sync', {'apps': apps});
  }

  /// The manifest's `icon`, when it names a file inside the project.
  Future<File?> _manifestIcon(String app) async {
    try {
      final manifest = File('${paths.userProjectDir(app)}/acelery_app.json');
      final json = jsonDecode(await manifest.readAsString());
      final icon = json is Map ? safeIconPath(json['icon']) : null;
      if (icon == null) return null;
      final file = File('${paths.userProjectDir(app)}/$icon');
      return file.existsSync() ? file : null;
    } on Exception {
      // No manifest, or not JSON: the Apps screen draws a monogram, and so
      // does this.
      return null;
    }
  }
}

/// One folder directly under `www/user/`.
bool isProjectName(String name) =>
    name.isNotEmpty &&
    name != '.' &&
    name != '..' &&
    !name.contains('/') &&
    !name.contains(r'\');

/// `safeIcon` in web/src/ide/store.js: a relative path that cannot climb out
/// of the project, or null.
String? safeIconPath(Object? icon) {
  if (icon is! String) return null;
  if (!RegExp(r'^[\w.-]+(/[\w.-]+)*$').hasMatch(icon)) return null;
  if (icon.split('/').contains('..')) return null;
  return icon;
}

/// `HUES` in web/src/ide/parts.js, so a shortcut wears the colour of its card.
const List<int> monogramHues = [
  0xFF3D6B63, 0xFF1F6F8B, 0xFF6B4FA0, 0xFFA14A2B,
  0xFF2E7D32, 0xFF8A5A00, 0xFF9C2F5E, 0xFF45617D,
];

/// `hue()` in web/src/ide/parts.js: a 32-bit rolling hash over code points.
int monogramHue(String name) {
  var h = 0;
  for (final rune in name.runes) {
    h = (h * 31 + rune) & 0xFFFFFFFF;
  }
  return monogramHues[h % monogramHues.length];
}

/// The letter the tile shows: the first code point, upper-cased.
String monogramLetter(String name) =>
    name.isEmpty ? '?' : String.fromCharCode(name.runes.first).toUpperCase();

/// An adaptive icon's canvas is 108 dp, of which a launcher's mask shows about
/// the middle 72. This is 108 dp at xxxhdpi.
const int shortcutIconSize = 432;

/// Draws the app's tile as an adaptive-icon bitmap and returns it as PNG.
///
/// A monogram fills the canvas with its hue and centres the letter in the
/// visible part. An image is fitted to the visible part on white, so the mask
/// trims margin rather than the picture. An image that will not decode falls
/// back to the monogram, as a broken `<img>` does on the Apps screen.
Future<Uint8List> renderShortcutIcon(String name, File? image) async {
  const size = shortcutIconSize;
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final full = Rect.fromLTWH(0, 0, size.toDouble(), size.toDouble());
  final visible = Rect.fromCenter(
    center: full.center,
    width: size * 72 / 108,
    height: size * 72 / 108,
  );

  final picture = image == null ? null : await _decode(image);
  if (picture != null) {
    canvas.drawRect(full, Paint()..color = const Color(0xFFFFFFFF));
    final src = Rect.fromLTWH(
        0, 0, picture.width.toDouble(), picture.height.toDouble());
    // object-fit: cover, as the tile's <img> does.
    final fitted = applyBoxFit(BoxFit.cover, src.size, visible.size);
    canvas.drawImageRect(
      picture,
      Alignment.center.inscribe(fitted.source, src),
      visible,
      Paint()..filterQuality = FilterQuality.high,
    );
    picture.dispose();
  } else {
    canvas.drawRect(full, Paint()..color = Color(monogramHue(name)));
    // The tile's 1.25rem letter on a 48 px square, scaled to the visible part.
    final letter = TextPainter(
      text: TextSpan(
        text: monogramLetter(name),
        style: TextStyle(
          color: const Color(0xFFFFFFFF),
          fontSize: visible.height * 20 / 48,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    letter.paint(
      canvas,
      full.center - Offset(letter.width / 2, letter.height / 2),
    );
    letter.dispose();
  }

  final rendered = await recorder.endRecording().toImage(size, size);
  final png = await rendered.toByteData(format: ui.ImageByteFormat.png);
  rendered.dispose();
  return png!.buffer.asUint8List();
}

Future<ui.Image?> _decode(File file) async {
  try {
    final codec = await ui.instantiateImageCodec(await file.readAsBytes());
    final frame = await codec.getNextFrame();
    codec.dispose();
    return frame.image;
  } on Exception {
    // SVG, or not an image at all.
    return null;
  }
}
