@TestOn('vm')
library;

import 'dart:convert';
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
        'css/bootstrap.min.css',
        'css/themes/acelery.css',
        'css/themes/_dark.css',
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
    final themeDir = Directory('${tools.path}/css/themes');

    test('each listed theme has a delta stylesheet', () {
      final lib = read(File('${tools.path}/js/xscript_bs5.js'));
      final block = lib.substring(
          lib.indexOf('function xbTheme'), lib.indexOf('this.currTheme'));
      final values = RegExp(r'value:\s*"([a-z]+)"')
          .allMatches(block)
          .map((m) => m.group(1)!)
          .toList();

      expect(values, hasLength(18));
      // Paper and Readable were renamed upstream (Materia, Litera); the old
      // names are what xbTheme offers, so they are what must resolve.
      expect(values, containsAll(['acelery', 'default', 'paper', 'readable']));

      for (final theme in values) {
        expect(File('${themeDir.path}/$theme.css').existsSync(), isTrue,
            reason: theme);
      }
    });

    test('a theme is a delta, not another whole Bootstrap', () {
      // The point of §3.4: 18 × 228 KB became one base plus small overrides.
      for (final css in themeDir.listSync().whereType<File>()) {
        expect(css.lengthSync(), lessThan(120 * 1024), reason: css.path);
        expect(css.readAsStringSync(), isNot(contains('.container-fluid')),
            reason: '${css.path} redeclares Bootstrap itself');
      }
      final total = themeDir
          .listSync()
          .whereType<File>()
          .fold<int>(0, (sum, f) => sum + f.lengthSync());
      expect(total, lessThan(1024 * 1024),
          reason: '$total bytes; 18 Bootswatch builds were 4.1 MB');
    });

    test('every rule in a theme is scoped to that theme', () {
      // An unscoped rule would leak into every other theme.
      final darkly = File('${themeDir.path}/darkly.css').readAsStringSync();
      final body = darkly.substring(darkly.indexOf('*/') + 2);
      for (final rule in body.split('\n').where((l) => l.contains('{'))) {
        if (rule.trimLeft().startsWith('@')) continue;
        expect(rule, contains('[data-acelery-theme="darkly"]'),
            reason: rule.substring(0, rule.indexOf('{')));
      }
    });

    test('no theme fetches a webfont it cannot reach', () {
      // Bootswatch themes @import Google Fonts. aCelery is fully offline (C3),
      // so those are stripped; a leftover is a guaranteed failed request.
      for (final css in themeDir.listSync().whereType<File>()) {
        final text = css.readAsStringSync();
        expect(text, isNot(contains('@font-face')), reason: css.path);
        expect(text, isNot(contains('@import')), reason: css.path);
        expect(text, isNot(contains('url(')), reason: css.path);
      }
    });

    test('the aCelery theme actually retints its components', () {
      // The defect this design exists for: Bootstrap 5.3 compiles .btn-primary
      // to --bs-btn-bg:#0d6efd, a literal, so overriding --bs-primary alone
      // leaves the Save button stock blue. Verified on device.
      final css = File('${themeDir.path}/acelery.css').readAsStringSync();
      expect(css, contains('--bs-primary: #586d72'));
      expect(css, contains('.btn-primary'));
      expect(css, contains('--bs-btn-bg: #586d72'));
    });

    test('switching a theme swaps a delta, not a whole stylesheet', () {
      // Both the legacy library and acelery/ui.js write the same attribute and
      // point at the same directory, so they cannot drift apart.
      final lib = read(File('${tools.path}/js/xscript_bs5.js'));
      final setTheme = lib.substring(lib.indexOf('xbTheme.prototype.setTheme'));
      final body = setTheme.substring(0, setTheme.indexOf('\n}'));
      expect(body, contains('data-acelery-theme'));
      expect(body, contains('data-bs-theme'));
      expect(body, contains('/tools/css/themes/'));
      expect(body, isNot(contains('bootstrap_themes')));

      final ui = File('web/src/ui/theme.js').readAsStringSync();
      expect(ui, contains('data-acelery-theme'));
      expect(ui, contains('data-bs-theme'));
      expect(ui, contains('/tools/css/themes/'));
    });

    test('every page carries a theme before first paint', () {
      // Without it the page paints stock Bootstrap and then repaints themed.
      for (final page in pages) {
        final html = read(page);
        expect(html, contains('data-acelery-theme='), reason: page.path);
        expect(html, contains('id="xbtheme"'), reason: page.path);
      }
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

    test('the top-level bootstrap.min.css is the base, not a duplicate', () {
      // It was dead weight in Phase 4a — 228 KB referenced by nothing, because
      // every page linked a theme build instead. Phase 4c inverts that: the
      // pages link stock Bootstrap once and themes.css layers custom properties
      // over it (§3.4), so exactly one full Bootstrap ships.
      final css = File('${tools.path}/css/bootstrap.min.css');
      expect(css.existsSync(), isTrue);
      expect(Directory('${tools.path}/css/bootstrap_themes').existsSync(),
          isFalse,
          reason: '18 × 228 KB of theme builds replaced by themes.css');

      final fullBootstraps = Directory('${tools.path}/css')
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.css'))
          .where((f) => f.readAsStringSync().contains('.container-fluid'))
          .length;
      expect(fullBootstraps, 1, reason: 'more than one full Bootstrap shipped');
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

      // Same order tool/build_js.sh cats them in: acelery/ then ui/, each
      // glob-sorted.
      final sources = [
        for (final dir in ['web/src/acelery', 'web/src/ui'])
          ...(Directory(dir)
              .listSync()
              .whereType<File>()
              .where((f) => f.path.endsWith('.js'))
              .toList()
            ..sort((a, b) => a.path.compareTo(b.path))),
      ];

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

  group('Phase 4c — the widget layer', () {
    final ui = File('bundle/www/tools/js/acelery/ui.js');

    test('the bundled widget layer ships', () {
      expect(ui.existsSync(), isTrue, reason: 'run tool/build_js.sh');
    });

    test('exactly one copy of preact core is bundled', () {
      // react-bootstrap resolves through preact/compat while htm/preact
      // resolves preact directly. On esbuild's browser platform both land on
      // preact.module.js; under --platform=node two copies come in, the hooks
      // module registers its options on the instance that is not rendering, and
      // the first render dies inside useBootstrapPrefix with a stack that points
      // nowhere near the cause. Minified output cannot be grepped for this, so
      // tool/build_js.sh reads esbuild's metafile, fails the build at anything
      // but one, and records the count here.
      final info = File('bundle/www/tools/js/acelery/.build-info.json');
      expect(info.existsSync(), isTrue, reason: 'run tool/build_js.sh');

      final decoded =
          jsonDecode(info.readAsStringSync()) as Map<String, Object?>;
      expect(decoded['preactCores'], 1);

      // And the dependency set is the one §3.1a measured. A new name here means
      // the byte budget below was measured against something else.
      expect(decoded['packages'], contains('react-bootstrap'));
      expect(decoded['packages'], contains('preact'));
      expect(decoded['packages'], contains('htm'));
      expect((decoded['packages']! as List), isNot(contains('react')),
          reason: 'react itself must never be bundled; preact/compat stands in');
    });

    test('the widget layer renders to light DOM', () {
      // The whole reason Lit was declined (§3.1): a global stylesheet does not
      // pierce a shadow root, so Bootstrap's CSS would not reach the
      // components. Nothing here may attach one.
      final source = ui.readAsStringSync();
      expect(source, isNot(contains('attachShadow')));
      expect(source, isNot(contains('adoptedStyleSheets')));
    });

    test('the widget layer stays within its byte budget', () {
      // §3.1a measured 127 KB raw / 45 KB gzipped for this stack. A jump means
      // a dependency crept in; §5's weight table assumes it does not.
      expect(ui.lengthSync(), lessThan(200 * 1024),
          reason: '${ui.lengthSync()} bytes — §3.1a measured ~127 KB');
    });

    test('no sourcemap ships for the vendored bundle', () {
      // ~700 KB of map for library internals nobody debugs into, on a bundle
      // being shrunk to ~1.2 MB. The capability modules keep theirs.
      expect(File('${ui.path}.map').existsSync(), isFalse);
      expect(File('bundle/www/tools/js/acelery/sql.js.map').existsSync(), isTrue);
    });

    test('every theme xbTheme offered is still offered', () {
      // Decision §9.6: all 18 survive, resolving through CSS variables.
      final theme = File('web/src/ui/theme.js').readAsStringSync();
      final listed = RegExp(r'"([a-z]+)"')
          .allMatches(theme.substring(theme.indexOf('export const THEMES'),
              theme.indexOf('/** Which of them')))
          .map((m) => m.group(1)!)
          .toSet();

      final old = read(File('${tools.path}/js/xscript_bs5.js'));
      final block = old.substring(
          old.indexOf('function xbTheme'), old.indexOf('this.currTheme'));
      final offered = RegExp(r'value:\s*"([a-z]+)"')
          .allMatches(block)
          .map((m) => m.group(1)!)
          .toSet();

      expect(offered, isNotEmpty);
      expect(listed, containsAll(offered),
          reason: 'a theme xbTheme offers is missing from THEMES');
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
      // Phase 4c reinstated tools/css/bootstrap.min.css as the single base
      // stylesheet; what must not come back is the 18-theme directory.
      expect(listing, isNot(contains('tools/css/bootstrap_themes/')));
      expect(listing, contains('aCelery/www/tools/css/themes/acelery.css'));
      expect(listing, contains('aCelery/www/tools/js/acelery/sql.js'));
      expect(listing, contains('aCelery/www/tools/js/acelery/ui.js'));
    });
  });
}
