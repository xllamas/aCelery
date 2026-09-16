// Runs the real aCelery server on this machine, for driving the web bundle
// from a desktop browser, or its MCP server from an assistant.
//
//     dart run tool/serve.dart            # loopback only, throwaway tree
//     dart run tool/serve.dart --share    # and on this machine's LAN address
//
// Options:
//
//     --root <dir>        Keep the tree in <dir> across runs instead of a temp
//                         directory. Projects and databases survive; the
//                         shipped bundle is refreshed whenever
//                         assets/aCelery.zip changes.
//     --port <n>          Listen on <n> (default 8123). 0 lets the OS pick.
//     --mint-token        Mint an MCP client token, as "Connect an assistant"
//                         does in the app, and print how to connect with it.
//                         Written to the ready file too, as "token".
//     --ready-file <f>    Once listening, write {"url", "port", "root"} as JSON
//                         to <f>, atomically. A parent process waits for the
//                         file rather than parsing stdout, which `dart run`
//                         shares with its own progress output ("Running build
//                         hooks..."), printed without a newline.
//
// Why this exists: `adb forward tcp:8123 tcp:8123` reaches the emulator, but
// adbd connects from 127.0.0.1 *inside* it, so the gate treats the request as
// loopback and skips pairing entirely. That is correct behaviour and it is
// useful for driving the UI with DevTools — but it cannot exercise the pairing
// flow, because nothing ever arrives from a non-loopback address.
//
// Running the server here does. Browse to this machine's own LAN address and
// the request arrives from that address, which is exactly the case the gate is
// for.
//
// Without --root it serves a throwaway copy of the bundle in a temp directory,
// so nothing it does can touch the tree on a device or in the repo.
//
// Do not leave an `adb forward tcp:8123 tcp:8123` in place while this runs on
// the default port. Both can bind at once — adb takes 127.0.0.1:8123 and this
// takes *:8123 — and macOS prefers the more specific one, so `localhost`
// silently reaches the emulator while the LAN address reaches this. Everything
// appears to work and you are talking to two different servers.
// `adb forward --remove-all` first.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/bundle_installer.dart';
import 'package:acelery/src/mcp/connect.dart';
import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

Future<void> main(List<String> args) async {
  final options = _Options.parse(args);
  if (options == null) {
    stderr.writeln('usage: dart run tool/serve.dart '
        '[--share] [--root <dir>] [--port <n>] [--mint-token] '
        '[--ready-file <path>]');
    exit(64);
  }

  sqfliteFfiInit();

  final zip = File('assets/aCelery.zip');
  if (!zip.existsSync()) {
    stderr.writeln('assets/aCelery.zip is missing; run tool/build_bundle.sh '
        'from the repository root.');
    exit(66);
  }

  final persistent = options.root != null;
  final root = persistent
      ? await Directory(options.root!).create(recursive: true)
      : await Directory.systemTemp.createTemp('acelery_serve');
  final paths = ACeleryPaths(root.absolute.path);

  final installer = BundleInstaller(
    paths: paths,
    // A persistent tree refreshes when the zip does, and only then: the stamp
    // is the zip's size and modification time, so rebuilding the bundle is
    // enough, and user projects are preserved as they are on a device.
    bundleVersion: persistent ? _zipStamp(zip) : 'dev',
    loadAsset: () => zip.readAsBytes(),
  );
  if (persistent) {
    if (await installer.installIfNeeded()) {
      stdout.writeln('Installed the bundle into ${root.path}');
    }
  } else {
    stdout.writeln('Installing the bundle into ${root.path}…');
    await installer.install();
  }

  final server = ACeleryServer(
    paths: paths,
    databaseFactory: databaseFactoryFfi,
    port: options.port,
    address:
        options.share ? InternetAddress.anyIPv4 : InternetAddress.loopbackIPv4,
  );
  // A persistent tree remembers its pairings, as the app does.
  await server.access.load();
  await server.access.setShared(options.share);

  // No Flutter UI here, so the prompt that would appear on the device is
  // printed instead, and answered from the keyboard.
  final pending = <String, String>{};
  server.access.requests.listen((pairing) {
    pending[pairing.code] = pairing.id;
    stdout
      ..writeln('')
      ..writeln('  ${pairing.address} wants in. It should be showing:')
      ..writeln('      code ${pairing.code}')
      ..writeln('  Type "a ${pairing.code}" to allow, "d ${pairing.code}" to deny.')
      ..writeln('');
  });

  await server.start();
  final port = server.boundPort;
  final lan = await lanAddress();
  final token = options.mintToken
      ? await server.access.mintClient(label: 'serve.dart')
      : null;

  final readyFile = options.readyFile;
  if (readyFile != null) {
    // Written aside and renamed, so a parent polling for the file never reads
    // half of it. 127.0.0.1 rather than localhost: Node resolves localhost to
    // ::1 first, and the socket is bound to IPv4.
    final partial = File('$readyFile.partial');
    await partial.writeAsString(jsonEncode({
      'url': 'http://127.0.0.1:$port/',
      'port': port,
      'root': paths.root,
      'token': ?token,
    }));
    await partial.rename(readyFile);
  }

  stdout
    ..writeln('')
    ..writeln('  aCelery is serving on:')
    ..writeln('      http://localhost:$port/       (no pairing — loopback is trusted)');
  if (options.share && lan != null) {
    stdout.writeln('      http://$lan:$port/   (pairs, like a device on the network)');
  } else if (!options.share) {
    stdout.writeln('  Pass --share to also listen on this machine\'s LAN address.');
  }
  stdout.writeln('');
  if (token != null) {
    final connection = AssistantConnection(
      url: 'http://${options.share && lan != null ? lan : '127.0.0.1'}:$port/mcp',
      token: token,
    );
    stdout
      ..writeln('  An MCP client token was minted. Claude Code:')
      ..writeln('      ${connection.claudeCode}')
      ..writeln('')
      ..writeln('  Claude Desktop (claude_desktop_config.json):')
      ..writeln(connection.claudeDesktop.replaceAll(RegExp('^', multiLine: true), '      '))
      ..writeln('');
  }
  stdout
    ..writeln(persistent
        ? '  Ctrl-C to stop. The tree in ${root.path} is kept.'
        : '  Ctrl-C to stop. The temp tree is removed on exit.')
    ..writeln('');

  var stopping = false;
  Future<void> stop(ProcessSignal signal) async {
    if (stopping) return;
    stopping = true;
    stdout.writeln('\nStopping…');
    await server.stop();
    server.access.dispose();
    if (!persistent) await root.delete(recursive: true);
    if (readyFile != null) {
      // Gone once the server is, so a stale file never advertises a dead port.
      final ready = File(readyFile);
      if (ready.existsSync()) await ready.delete();
    }
    exit(0);
  }

  ProcessSignal.sigint.watch().listen(stop);
  // What a parent process sends. Not deliverable to a Dart program on Windows.
  if (!Platform.isWindows) ProcessSignal.sigterm.watch().listen(stop);

  // Pairing answers come from the keyboard. A parent that gives this process
  // no stdin just ends the loop; the server keeps running until signalled.
  await for (final line in stdin
      .transform(SystemEncoding().decoder)
      .transform(const LineSplitter())) {
    final parts = line.trim().split(RegExp(r'\s+'));
    if (parts.length != 2) continue;
    final id = pending.remove(parts[1]);
    if (id == null) {
      stdout.writeln('  No request with code ${parts[1]}.');
      continue;
    }
    if (parts.first == 'a') {
      await server.access.approve(id);
      stdout.writeln('  Allowed.');
    } else if (parts.first == 'd') {
      await server.access.deny(id);
      stdout.writeln('  Denied.');
    }
  }
}

class _Options {
  _Options({
    required this.share,
    required this.root,
    required this.port,
    required this.readyFile,
    required this.mintToken,
  });

  final bool share;
  final String? root;
  final int port;
  final String? readyFile;
  final bool mintToken;

  /// Null when the arguments cannot be understood.
  static _Options? parse(List<String> args) {
    var share = false;
    var mintToken = false;
    String? root;
    String? readyFile;
    var port = ACeleryServer.defaultPort;

    for (var i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--share':
          share = true;
        case '--mint-token':
          mintToken = true;
        case '--root' when i + 1 < args.length:
          root = args[++i];
        case '--ready-file' when i + 1 < args.length:
          readyFile = args[++i];
        case '--port' when i + 1 < args.length:
          final n = int.tryParse(args[++i]);
          if (n == null || n < 0 || n > 65535) return null;
          port = n;
        default:
          return null;
      }
    }
    return _Options(
        share: share,
        root: root,
        port: port,
        readyFile: readyFile,
        mintToken: mintToken);
  }
}

String _zipStamp(File zip) {
  final stat = zip.statSync();
  return 'dev-${stat.size}-${stat.modified.millisecondsSinceEpoch}';
}
