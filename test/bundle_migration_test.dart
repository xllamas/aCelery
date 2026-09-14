@TestOn('vm')
library;

import 'dart:io';

import 'package:crypto/crypto.dart';
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
        'css/bootstrap_themes/default/bootstrap.min.css',
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

    test('every library property the shipped pages read still exists', () {
      // The method-level check below was itself not sufficient. The IDE also
      // reached for `navBar.navA`, a *property* the Bootstrap 3 library
      // exposed and xscript5 does not, so opening a project threw
      // "Cannot read properties of undefined (reading 'node')" — the same
      // class of silent break as addDropdown, one level down.
      final library = [
        'js/xscript.js',
        'js/xscript_bs5.js',
        'js/xscript_crud.js',
      ].map((f) => read(File('${tools.path}/$f'))).join('\n');

      final pageSource = [
        ...pages.map(read),
        read(File('bundle/www/user/Example/example.js')),
      ].join('\n');

      // Properties the pages read off a widget, as `something.prop.` or
      // `something.prop =`. Only the names the library is supposed to own are
      // interesting, so this is pinned to the set the pages actually use.
      const widgetProperties = ['node', 'elements', 'navList', 'list', 'id'];
      for (final property in widgetProperties) {
        if (!pageSource.contains('.$property')) continue;
        expect(library, contains('this.$property'),
            reason: '$property is read by a shipped page but the library '
                'never assigns it');
      }

      // And specifically: nothing may reach for the Bootstrap 3 brand link.
      expect(pageSource, isNot(contains('navA')),
          reason: 'navA was the Bootstrap 3 brand xLink; use setTitle');
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
    test('xscript.js talks to the HTTP interface', () {
      // The whole port rests on this transport; see plan §2.
      final js = read(File('${tools.path}/js/xscript.js'));
      expect(js, contains('/android.itf?'));
    });

    test('the dead in-WebView branch is gone', () {
      // The Flutter host deliberately never registers an `Android` channel, so
      // every `typeof Android != "undefined"` branch has been unreachable since
      // Phase 2. Keeping them made the bridge dual-mode for no one
      // (evaluation §1.4).
      final js = read(File('${tools.path}/js/xscript.js'));
      expect(js, isNot(contains('Android')));
    });

    test('the library and the bundle have not drifted', () {
      // xscript5/ is where the library is maintained; bundle/ is what ships.
      // Phase 3 shipped a defect because a fix landed in only one of them.
      for (final f in ['xscript.js', 'xscript_bs5.js', 'xscript_crud.js']) {
        expect(read(File('${tools.path}/js/$f')),
            read(File('xscript5/$f')), reason: f);
      }
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

  group('Phase 4a — the pages leave quirks mode', () {
    test('every page declares a doctype and a charset', () {
      // Without one the page renders in quirks mode, where Bootstrap 5's
      // percentage heights and table-cell inheritance behave differently.
      for (final page in [...pages, File('bundle/www/index.html')]) {
        final html = read(page);
        expect(html.trimLeft(), startsWith('<!DOCTYPE html>'),
            reason: page.path);
        expect(html, contains('<meta charset="utf-8">'), reason: page.path);
      }
    });

    test('no page blocks pinch-zoom', () {
      // user-scalable=no is an accessibility failure and buys nothing on a
      // modern WebView (evaluation §7.2).
      for (final page in pages) {
        final html = read(page);
        expect(html, isNot(contains('user-scalable')), reason: page.path);
        expect(html, isNot(contains('maximum-scale')), reason: page.path);
        expect(html, contains('width=device-width'), reason: page.path);
      }
    });
  });

  group('Phase 4a — the vendored trees stay pruned', () {
    // A vendor refresh that re-extracts an upstream archive would silently put
    // ~2 MB back. These pin what was removed and why.
    final cm = Directory('${tools.path}/codemirror');

    test('the unreferenced CodeMirror trees are gone', () {
      // 51 addons and 228 KB of keymaps, none referenced anywhere in bundle/.
      expect(Directory('${cm.path}/addon').existsSync(), isFalse);
      expect(Directory('${cm.path}/keymap').existsSync(), isFalse);
    });

    test('only the six modes the IDE loads are shipped', () {
      final modes = Directory('${cm.path}/mode')
          .listSync()
          .whereType<Directory>()
          .map((d) => d.path.split('/').last)
          .toSet();
      expect(modes, {'clike', 'css', 'htmlmixed', 'javascript', 'php', 'xml'});
    });

    test('every mode the IDE loads is actually present', () {
      // htmlmixed pulls xml/javascript/css, php pulls clike/htmlmixed, so the
      // six are closed under their own requires.
      final html = read(pages.first);
      for (final m in RegExp(r'codemirror/mode/([a-z]+)/')
          .allMatches(html)
          .map((m) => m.group(1)!)) {
        expect(File('${cm.path}/mode/$m/$m.js').existsSync(), isTrue,
            reason: m);
      }
    });

    test('no vendored demo pages are served to the LAN', () {
      // CodeMirror ships an index.html per mode; the embedded server exposed
      // all 89 of them on the network for no benefit.
      final demos = cm
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.html'));
      expect(demos, isEmpty);
    });

    test('the dead top-level bootstrap.min.css stays deleted', () {
      // 228 KB referenced by nothing; the pages load a theme stylesheet.
      expect(File('${tools.path}/css/bootstrap.min.css').existsSync(), isFalse);
    });

    test('every theme the editor offers still resolves', () {
      final html = read(pages.first);
      final block = html.substring(
          html.indexOf('var edThemes'), html.indexOf('var acSel'));
      final values = RegExp(r'value: "([a-z0-9-]+)"')
          .allMatches(block)
          .map((m) => m.group(1)!)
          .toList();
      expect(values, isNotEmpty);
      for (final theme in values) {
        expect(File('${cm.path}/theme/$theme.css').existsSync(), isTrue,
            reason: theme);
      }
    });
  });

  group('Phase 4b — the async bridge', () {
    final modules = Directory('bundle/www/tools/js/acelery');

    test('the built modules are shipped', () {
      // web/ is the source; tool/build_js.sh writes these, and they are
      // committed so a checkout without node still packs a working bundle.
      for (final m in [
        'bridge.js',
        'sql.js',
        'file.js',
        'http.js',
        'export.js',
        'index.js',
      ]) {
        expect(File('${modules.path}/$m').existsSync(), isTrue, reason: m);
      }
    });

    test('the built output matches web/src', () {
      // A stale build ships yesterday's bridge. tool/build_js.sh stamps the
      // output with a hash of its inputs, so this catches a source edit that
      // was never built without needing node to rebuild and diff.
      final stamp = File('${modules.path}/.sources.sha256');
      expect(stamp.existsSync(), isTrue,
          reason: 'no build stamp; run tool/build_js.sh');

      final sources = Directory('web/src/acelery')
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith('.js'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));

      final digest = sha256
          .convert(sources.expand((f) => f.readAsBytesSync()).toList())
          .toString();

      expect(digest, stamp.readAsStringSync().trim(),
          reason: 'bundle/www/tools/js/acelery is stale; run tool/build_js.sh');
    });

    test('every route the modules call is one the host implements', () {
      // The check Phase 3 needed and did not have: a name mismatch across this
      // seam is silent until an app runs. bridge_test.dart pins the Dart side;
      // this pins that the JS side asks for the same things.
      final js = [
        'sql.js',
        'file.js',
        'http.js',
        'export.js',
      ].map((m) => File('web/src/acelery/$m').readAsStringSync()).join('\n');

      final handler =
          File('lib/src/server/itf_handler.dart').readAsStringSync();
      // The handler dispatches two ways: `case 'x':` in statement switches and
      // `'x' => ...` in expression ones.
      final implemented = {
        ...RegExp(r"case '([a-z0-9]+)':")
            .allMatches(handler)
            .map((m) => m.group(1)!),
        ...RegExp(r"'([a-z0-9]+)' =>")
            .allMatches(handler)
            .map((m) => m.group(1)!),
      };

      // Only the bridge calls: every one carries an `opt`. export.js also
      // posts `{action: ...}` payloads to the host channel, which is a
      // different protocol and is pinned by host_bridge_test.dart.
      final requested = RegExp(r'opt:\s*"[a-z]+",\s*action:\s*"([a-z0-9]+)"')
          .allMatches(js)
          .map((m) => m.group(1)!)
          .toSet();

      expect(requested, isNotEmpty);
      for (final action in requested) {
        expect(implemented, contains(action),
            reason: '$action is requested by web/src/acelery but '
                '/android.itf does not implement it');
      }
    });

    test('nothing in the new modules builds SQL by concatenation', () {
      // §3.3: bound parameters are the only shape offered, so that an app —
      // or a model writing one — cannot reach for the other.
      final sql = File('web/src/acelery/sql.js').readAsStringSync();
      expect(sql, isNot(contains('btoa')));
      for (final method in ['select(sql', 'exec(sql', 'insert(sql']) {
        expect(sql, contains('$method, args'), reason: method);
      }
    });

    test('the modules use fetch, not synchronous XHR', () {
      // The reason the UI froze on every database call. Evaluation §1.2.
      for (final m in ['bridge.js', 'sql.js', 'file.js', 'http.js']) {
        final source = File('web/src/acelery/$m').readAsStringSync();
        expect(source, isNot(contains('XMLHttpRequest')), reason: m);
      }
      expect(File('web/src/acelery/bridge.js').readAsStringSync(),
          contains('await fetch('));
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
      // Phase 4a's pruning has to reach the device, not just the source tree.
      expect(listing, isNot(contains('codemirror/keymap/')));
      expect(listing, isNot(contains('codemirror/addon/')));
      expect(listing, isNot(contains('tools/css/bootstrap.min.css')));
      expect(listing, contains('aCelery/www/tools/js/acelery/sql.js'));
    });
  });
}
