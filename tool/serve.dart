// Runs the real aCelery server on this machine, for driving the web bundle
// from a desktop browser.
//
//     dart run tool/serve.dart            # loopback only
//     dart run tool/serve.dart --share    # and on this machine's LAN address
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
// It serves a throwaway copy of the bundle in a temp directory, so nothing it
// does can touch the tree on a device or in the repo.
//
// Do not leave an `adb forward tcp:8123 tcp:8123` in place while this runs.
// Both can bind at once — adb takes 127.0.0.1:8123 and this takes *:8123 —
// and macOS prefers the more specific one, so `localhost` silently reaches the
// emulator while the LAN address reaches this. Everything appears to work and
// you are talking to two different servers. `adb forward --remove-all` first.

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:acelery/src/bundle_installer.dart';
import 'package:acelery/src/paths.dart';
import 'package:acelery/src/server/acelery_server.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

Future<void> main(List<String> args) async {
  final share = args.contains('--share');
  sqfliteFfiInit();

  final root = await Directory.systemTemp.createTemp('acelery_serve');
  final paths = ACeleryPaths(root.path);

  stdout.writeln('Installing the bundle into ${root.path}…');
  await BundleInstaller(
    paths: paths,
    bundleVersion: 'dev',
    loadAsset: () => File('assets/aCelery.zip').readAsBytes(),
  ).install();

  final server = ACeleryServer(
    paths: paths,
    databaseFactory: databaseFactoryFfi,
    address: share ? InternetAddress.anyIPv4 : InternetAddress.loopbackIPv4,
  );
  await server.access.setShared(share);

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

  final lan = await _lanAddress();
  stdout
    ..writeln('')
    ..writeln('  aCelery is serving on:')
    ..writeln('      http://localhost:${server.boundPort}/       (no pairing — loopback is trusted)');
  if (share && lan != null) {
    stdout.writeln(
        '      http://$lan:${server.boundPort}/   (pairs, like a device on the network)');
  } else if (!share) {
    stdout.writeln('  Pass --share to also listen on this machine\'s LAN address.');
  }
  stdout
    ..writeln('')
    ..writeln('  Ctrl-C to stop. The temp tree is removed on exit.')
    ..writeln('');

  ProcessSignal.sigint.watch().listen((_) async {
    stdout.writeln('\nStopping…');
    await server.stop();
    server.access.dispose();
    await root.delete(recursive: true);
    exit(0);
  });

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

Future<String?> _lanAddress() async {
  final interfaces = await NetworkInterface.list(
    type: InternetAddressType.IPv4,
    includeLoopback: false,
  );
  for (final i in interfaces) {
    for (final a in i.addresses) {
      if (!a.isLoopback) return a.address;
    }
  }
  return null;
}
