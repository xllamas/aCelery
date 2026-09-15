@TestOn('vm')
library;

import 'package:acelery/src/shell/host_bridge.dart';
import 'package:test/test.dart';

void main() {
  group('messages from the page', () {
    test('runApp carries what xRunUserApp was given', () {
      final message = HostMessage.parse(
          '{"action":"runApp","title":"Demo","app":"Demo","debug":true}');
      expect(message, isA<RunAppMessage>());
      final run = message as RunAppMessage;
      expect(run.title, 'Demo');
      expect(run.app, 'Demo');
      expect(run.debug, isTrue);
    });

    test('debug defaults to false', () {
      final run =
          HostMessage.parse('{"action":"runApp","app":"Demo"}') as RunAppMessage;
      expect(run.debug, isFalse);
      expect(run.title, '');
    });

    test('the other actions parse', () {
      expect(HostMessage.parse('{"action":"closeApp"}'), isA<CloseAppMessage>());
      expect(HostMessage.parse('{"action":"importProject"}'),
          isA<ImportProjectMessage>());
      expect(HostMessage.parse('{"action":"download","url":"/x"}'),
          isA<DownloadMessage>());
    });

    test("the shell's settings messages parse", () {
      // doc/shell-redesign.md §7: the rows that moved from the host's options
      // menu into the page's Settings screen.
      expect(HostMessage.parse('{"action":"showNetworkAccess"}'),
          isA<ShowNetworkAccessMessage>());

      final awake = HostMessage.parse('{"action":"setKeepAwake","on":true}')
          as SetKeepAwakeMessage;
      expect(awake.on, isTrue);
      final unset =
          HostMessage.parse('{"action":"setKeepAwake"}') as SetKeepAwakeMessage;
      expect(unset.on, isFalse, reason: 'anything but true is off');

      final chrome = HostMessage.parse(
              '{"action":"setChrome","dark":true,"color":"#1a2224"}')
          as SetChromeMessage;
      expect(chrome.dark, isTrue);
      expect(chrome.color, 0xFF1A2224);
    });

    test('a chrome colour that is not #rrggbb is ignored', () {
      // The channel is reachable from any script, so the colour is parsed
      // strictly rather than handed to Color() as whatever arrived.
      for (final bad in ['"red"', '"#fff"', '"#1a2224ff"', '42', 'null']) {
        final chrome =
            HostMessage.parse('{"action":"setChrome","color":$bad}')
                as SetChromeMessage;
        expect(chrome.color, isNull, reason: bad);
        expect(chrome.dark, isFalse);
      }
    });

    test('malformed input is dropped rather than thrown', () {
      // The channel is reachable from any script the user writes.
      expect(HostMessage.parse('not json'), isNull);
      expect(HostMessage.parse('{"action":"nope"}'), isNull);
      expect(HostMessage.parse('{}'), isNull);
    });
  });

  group('navigation', () {
    test('pages inside the bundle are followed', () {
      for (final url in [
        'http://localhost:8123/system/index.html',
        'http://127.0.0.1:8123/user/Example/index.html',
        'http://localhost:8123/system/launcher.html?app=Demo',
      ]) {
        expect(decideNavigation(url), isA<AllowNavigation>(), reason: url);
      }
    });

    test('bridge data calls are followed, not diverted', () {
      // Only the download routes are special; everything else is xScript
      // fetching data and must reach the server.
      for (final url in [
        'http://localhost:8123/android.itf?opt=sql&action=getnextrow&cursor=1',
        'http://localhost:8123/android.itf?opt=file&action=fileread&handle=1',
        'http://localhost:8123/android.itf?opt=export&action=set&fname=a.csv',
      ]) {
        expect(decideNavigation(url), isA<AllowNavigation>(), reason: url);
      }
    });

    test('a file download is handed to the host', () {
      final outcome = decideNavigation(
          'http://localhost:8123/android.itf?opt=export&action=get&handle=3');
      expect(outcome, isA<DivertToHost>());
      expect((outcome as DivertToHost).message, isA<DownloadMessage>());
    });

    test('a project export is handed to the host', () {
      final outcome = decideNavigation(
          'http://localhost:8123/android.itf?opt=exportproject&action=export&project=Demo');
      expect((outcome as DivertToHost).message, isA<DownloadMessage>());
    });

    test('an external link opens outside the WebView', () {
      final outcome = decideNavigation('https://example.com/docs');
      expect(outcome, isA<DivertToHost>());
      expect((outcome as DivertToHost).message, isA<OpenExternalMessage>());
    });

    test('non-http schemes are left alone', () {
      // mailto:, tel: and friends are the platform's business.
      expect(decideNavigation('mailto:someone@example.com'),
          isA<AllowNavigation>());
      expect(decideNavigation('::::'), isA<AllowNavigation>());
    });
  });

  group('the injected shim', () {
    test('overrides every host-dependent entry point', () {
      for (final symbol in [
        'xRunUserApp',
        'xCloseApp',
        'xExportFile.prototype.get',
        'xExportProject.prototype.get',
        'xImportProject.prototype.get',
      ]) {
        expect(hostShim, contains(symbol), reason: symbol);
      }
    });

    test('posts to the channel the shell registers', () {
      expect(hostShim, contains('$hostChannelName.postMessage'));
    });

    test('is not named Android', () {
      // Registering that name would flip xscript.js onto its in-WebView branch,
      // where every data call expects a synchronous return value.
      expect(hostChannelName, isNot('Android'));
      expect(hostShim, isNot(contains('window.Android')));
    });

    test('is safe to inject twice', () {
      // onPageFinished fires again on reload and on in-page navigation.
      expect(hostShim, contains('__aCeleryHostShim'));
    });

    test('guards each override on the symbol existing', () {
      // launcher.html and errorlog.html load different subsets of xScript.
      expect("typeof xRunUserApp === 'function'", isNotNull);
      for (final guard in [
        "typeof xRunUserApp === 'function'",
        "typeof xCloseApp === 'function'",
        "typeof xExportFile === 'function'",
        "typeof xExportProject === 'function'",
        "typeof xImportProject === 'function'",
      ]) {
        expect(hostShim, contains(guard), reason: guard);
      }
    });
  });
}
