@TestOn('vm')
library;

import 'dart:io';

import 'package:test/test.dart';

/// Guards the Bootstrap 5 migration of bundle/ (plan §4, Phase 3).
///
/// These assert against the source tree rather than the built zip, so a
/// regression is caught at the point someone edits a page rather than after a
/// rebuild.
void main() {
  final tools = Directory('bundle/www/tools');
  final pages = [
    'bundle/www/system/index.html',
    'bundle/www/system/launcher.html',
    'bundle/www/system/errorlog.html',
  ].map(File.new).toList();

  String read(File f) => f.readAsStringSync();

  group('Bootstrap 3 and jQuery are gone', () {
    test('the old libraries are not shipped', () {
      for (final gone in [
        'js/jquery.min.js',
        'js/jquery.mobile.min.js',
        'js/bootstrap.min.js',
        'js/modernizr.custom.js',
        'js/xscript_bootstrap.js',
        'css/bootstrap-theme.min.css',
        'css/font-awesome.min.css',
        'css/jquery.mobile.icons.min.css',
        'css/jquery.mobile.structure.min.css',
        'css/acelery.min.css',
        'css/dlmenu.css',
      ]) {
        expect(File('${tools.path}/$gone').existsSync(), isFalse, reason: gone);
      }
      // Bootstrap 3's glyphicon webfonts went with it.
      expect(Directory('${tools.path}/css/bootstrap_themes/fonts').existsSync(),
          isFalse);
      expect(Directory('${tools.path}/fonts').existsSync(), isFalse);
    });

    test('no page loads jQuery or Bootstrap 3', () {
      for (final page in pages) {
        final html = read(page);
        expect(html, isNot(contains('jquery')), reason: page.path);
        expect(html, isNot(contains('js/bootstrap.min.js')),
            reason: page.path);
        expect(html, isNot(contains('xscript_bootstrap.js')),
            reason: page.path);
      }
    });

    test('nothing anywhere still asks for a glyphicon', () {
      // Bootstrap 5 dropped them, so a leftover renders as empty space.
      final offenders = Directory('bundle/www')
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) =>
              f.path.endsWith('.html') ||
              f.path.endsWith('.js') ||
              f.path.endsWith('.css'))
          .where((f) => !f.path.contains('/codemirror/'))
          .where((f) => f.readAsStringSync().contains('glyphicon'))
          .map((f) => f.path);
      expect(offenders, isEmpty);
    });
  });

  group('the Bootstrap 5 stack is shipped and wired up', () {
    test('the new libraries are present', () {
      for (final needed in [
        'js/bootstrap.bundle.min.js',
        'js/tempus-dominus.min.js',
        'js/xscript_bs5.js',
        'css/bootstrap.min.css',
        'css/tempus-dominus.min.css',
        'fontawesome/css/all.min.css',
        'fontawesome/webfonts/fa-solid-900.woff2',
      ]) {
        expect(File('${tools.path}/$needed').existsSync(), isTrue,
            reason: needed);
      }
    });

    test('every page loads the stack xscript_bs5 assumes', () {
      for (final page in pages) {
        final html = read(page);
        // bootstrap.bundle carries Popper, which Tempus Dominus positions with.
        expect(html, contains('js/bootstrap.bundle.min.js'), reason: page.path);
        expect(html, contains('js/tempus-dominus.min.js'), reason: page.path);
        expect(html, contains('js/xscript_bs5.js'), reason: page.path);
        expect(html, contains('fontawesome/css/all.min.css'), reason: page.path);
        expect(html, contains('css/tempus-dominus.min.css'), reason: page.path);
      }
    });

    test('bootstrap loads before the script that uses it', () {
      for (final page in pages) {
        final html = read(page);
        expect(html.indexOf('js/bootstrap.bundle.min.js'),
            lessThan(html.indexOf('js/xscript_bs5.js')),
            reason: page.path);
      }
    });

    test('the shipped library really is the Bootstrap 5 one', () {
      final bs5 = read(File('${tools.path}/js/xscript_bs5.js'));
      expect(bs5, contains('Bootstrap 5'));
      expect(bs5, contains('data-bs-toggle'));
      // The one widget that had been left on Bootstrap 3 markup.
      expect(bs5, contains('carousel-control-prev'));
      expect(bs5, isNot(contains('data-slide')));
    });
  });

  group('the Bootstrap 3 public API still resolves', () {
    // xscript5's navbar rewrite dropped methods that the IDE, the Example app
    // and any user app written against the Bootstrap 3 library still call.
    // Losing one is silent until the page runs, so pin them here.
    test('the navbar compatibility methods are present', () {
      final bs5 = read(File('${tools.path}/js/xscript_bs5.js'));
      for (final method in [
        'xbNavBar.prototype.addDropdown',
        'xbNavBar.prototype.getNavItem',
        'xbNavBarDropdown.prototype.addTitleWrapper',
        'xbNavBarDropdown.prototype.disabled',
        'xbNavBarItem.prototype.disabled',
        'xbTabs.prototype.removePane',
        'xbModal.prototype.setAutoRemove',
      ]) {
        expect(bs5, contains(method), reason: method);
      }
    });

    test('getNavItem can actually find what was added', () {
      // getNavItem reads this.elements, so both add paths have to record.
      final bs5 = read(File('${tools.path}/js/xscript_bs5.js'));
      final addItem = bs5.substring(bs5.indexOf('xbNavBar.prototype.addItem'));
      expect(addItem.substring(0, 250), contains('this.elements.push'));
    });

    test('every method the shipped pages call still exists', () {
      // The real compatibility check: cross-reference call sites against the
      // library, rather than trusting that the class names lined up.
      final library = [
        'js/xscript.js',
        'js/xscript_bs5.js',
        'js/xscript_crud.js',
      ].map((f) => read(File('${tools.path}/$f'))).join('\n');

      final defined = RegExp(r'^x[A-Za-z0-9_]+\.prototype\.([A-Za-z0-9_]+)\s*=',
              multiLine: true)
          .allMatches(library)
          .map((m) => m.group(1)!)
          .toSet();

      final pageSource = [
        ...pages.map(read),
        read(File('bundle/www/user/Example/example.js')),
      ].join('\n');

      // Methods invoked on something built by a `new x...()` chain.
      final called = RegExp(r'\.\s*([a-zA-Z][A-Za-z0-9_]*)\s*\(')
          .allMatches(pageSource)
          .map((m) => m.group(1)!)
          .toSet();

      final xScriptish = called.intersection({
        'addElement', 'addItem', 'addDropdown', 'addPane', 'addField',
        'addOption', 'addOptions', 'addValidator', 'addLinkedTable',
        'getNavItem', 'getElement', 'addTitleWrapper', 'disabled',
        'bindFunction', 'activatePane', 'setToTop', 'addCloseButton',
        'addToBody', 'addToFooter', 'setTheme', 'setSelected', 'run',
        'remove', 'show', 'hide', 'addDivider', 'setValue', 'getValue',
      });

      expect(xScriptish, isNotEmpty);
      for (final method in xScriptish) {
        expect(defined, contains(method), reason: '$method is called but no '
            'longer defined by the library');
      }
    });
  });

  group('the native bridge survived the swap', () {
    test('xscript.js still falls back to the HTTP interface', () {
      // The whole port rests on this branch; see plan §2.
      final js = read(File('${tools.path}/js/xscript.js'));
      expect(js, contains('/android.itf?'));
      expect(js, contains('typeof Android != "undefined"'));
    });
  });

  group('every theme xbTheme offers resolves', () {
    test('each listed theme has a stylesheet', () {
      final lib = read(File('${tools.path}/js/xscript_bs5.js'));
      final block = lib.substring(
          lib.indexOf('function xbTheme'), lib.indexOf('this.currTheme'));
      final values = RegExp(r'value:\s*"([a-z]+)"')
          .allMatches(block)
          .map((m) => m.group(1)!)
          .toList();

      expect(values, isNotEmpty);
      // Paper and Readable were renamed upstream; the directories keep the old
      // names so existing user apps still resolve.
      expect(values, containsAll(['acelery', 'default', 'paper', 'readable']));

      for (final theme in values) {
        expect(
          File('${tools.path}/css/bootstrap_themes/$theme/bootstrap.min.css')
              .existsSync(),
          isTrue,
          reason: theme,
        );
      }
    });

    test('the themes are Bootstrap 5, not Bootstrap 3', () {
      final dir = Directory('${tools.path}/css/bootstrap_themes');
      for (final theme in dir.listSync().whereType<Directory>()) {
        final css = File('${theme.path}/bootstrap.min.css').readAsStringSync();
        expect(css, contains('--bs-'), reason: theme.path);
        expect(css, isNot(contains('.glyphicon{')), reason: theme.path);
      }
    });

    test('the aCelery theme keeps its palette', () {
      final css = File('${tools.path}/css/bootstrap_themes/acelery/'
              'bootstrap.min.css')
          .readAsStringSync();
      // Carried over from the Bootstrap 3 theme it replaces.
      expect(css, contains('#283b41')); // navbar
      expect(css, contains('#586d72')); // primary
      expect(css, contains('#86a0a4')); // brand text
    });
  });

  group('the built zip matches the source tree', () {
    test('assets/aCelery.zip is not stale', () {
      // tool/build_bundle.sh packs bundle/ into the asset; a forgotten rebuild
      // ships the old Bootstrap 3 files to devices.
      final zip = File('assets/aCelery.zip');
      expect(zip.existsSync(), isTrue);

      final listing = Process.runSync('unzip', ['-Z1', zip.path]).stdout
          as String;
      expect(listing, contains('aCelery/www/tools/js/xscript_bs5.js'));
      expect(listing, contains('aCelery/www/tools/js/bootstrap.bundle.min.js'));
      expect(listing, isNot(contains('jquery.min.js')));
      expect(listing, isNot(contains('xscript_bootstrap.js')));
    });
  });
}
