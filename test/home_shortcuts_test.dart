import 'dart:io';
import 'dart:ui' as ui;

import 'package:acelery/src/paths.dart';
import 'package:acelery/src/shell/home_shortcuts.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('the tile a shortcut wears', () {
    test('hues match the Apps screen', () {
      // Computed with hue() from web/src/ide/parts.js under node. A drift
      // here means a shortcut and its card disagree on colour.
      const fromJs = {
        'Example': 0xFF6B4FA0,
        'Budget': 0xFF8A5A00,
        'Notes': 0xFF1F6F8B,
        'ñandú': 0xFF2E7D32,
        '😀 emoji': 0xFF9C2F5E,
        'a very long project name that overflows': 0xFF8A5A00,
      };
      fromJs.forEach((name, hue) {
        expect(monogramHue(name), hue, reason: name);
      });
    });

    test('the letter is the first code point, upper-cased', () {
      expect(monogramLetter('example'), 'E');
      expect(monogramLetter('ñandú'), 'Ñ');
      expect(monogramLetter('😀 emoji'), '😀');
      expect(monogramLetter(''), '?');
    });

    test('renders a square PNG the size of an adaptive icon', () async {
      final png = await renderShortcutIcon('Example', null);
      final codec = await ui.instantiateImageCodec(png);
      final image = (await codec.getNextFrame()).image;
      expect(image.width, shortcutIconSize);
      expect(image.height, shortcutIconSize);

      // The corner sits outside the letter, so it carries the hue.
      final pixels = (await image.toByteData())!;
      final rgba = pixels.getUint32(0);
      expect(0xFF000000 | (rgba >> 8), monogramHue('Example'));
    });

    test('an image that will not decode falls back to the monogram', () async {
      final dir = await Directory.systemTemp.createTemp('acelery_icon');
      addTearDown(() => dir.delete(recursive: true));
      final notAnImage = File('${dir.path}/icon.svg')
        ..writeAsStringSync('<svg/>');

      final png = await renderShortcutIcon('Example', notAnImage);
      final image =
          (await (await ui.instantiateImageCodec(png)).getNextFrame()).image;
      final rgba = (await image.toByteData())!.getUint32(0);
      expect(0xFF000000 | (rgba >> 8), monogramHue('Example'));
    });
  });

  group('names from outside', () {
    test('a manifest icon cannot climb out of its project', () {
      expect(safeIconPath('icon.png'), 'icon.png');
      expect(safeIconPath('img/icon-192.png'), 'img/icon-192.png');
      for (final bad in [
        '../icon.png',
        'img/../../x.png',
        '/etc/passwd',
        'http://example.com/i.png',
        '',
        42,
        null,
      ]) {
        expect(safeIconPath(bad), isNull, reason: '$bad');
      }
    });

    test('a shortcut opens only a folder directly under user/', () async {
      final dir = await Directory.systemTemp.createTemp('acelery_shortcuts');
      addTearDown(() => dir.delete(recursive: true));
      final paths = ACeleryPaths(dir.path);
      Directory(paths.userProjectDir('Demo')).createSync(recursive: true);
      Directory('${paths.base}/db').createSync(recursive: true);

      final shortcuts = HomeShortcuts(paths);
      expect(shortcuts.exists('Demo'), isTrue);
      expect(shortcuts.exists('Gone'), isFalse);
      // MainActivity is exported, so any app can send it a name.
      for (final bad in ['', '.', '..', '../../db', 'Demo/..', r'..\db']) {
        expect(shortcuts.exists(bad), isFalse, reason: bad);
      }
    });
  });
}
