import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'mcp/connect.dart';
import 'server/acelery_server.dart';

/// Keeps the server reachable with the screen off while network sharing is on,
/// through Android's `ServingService` (android/…/ServingService.kt).
///
/// Decided 2026-09-16, after a Xiaomi phone froze the app the moment its
/// screen went off: a foreground service runs exactly while "Share on this
/// network" is on. It is not tied to MCP sessions, because a frozen app cannot
/// start a service when a client arrives.
///
/// iOS has no equivalent, so there the server still stops with the screen, as
/// doc/mcp-server.md §7 P6 says.
class BackgroundServing {
  BackgroundServing(this.server) {
    // The notification's "Stop sharing" button.
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'stopSharing') {
        await server.setSharedOnNetwork(false);
      }
    });
  }

  final ACeleryServer server;

  static const MethodChannel _channel = MethodChannel('acelery/serving');

  /// Starts or stops the service to match [shared].
  Future<void> update(bool shared) async {
    if (!Platform.isAndroid) return;
    try {
      if (shared) {
        final address = await lanAddress();
        await _channel.invokeMethod<void>('start', {
          'address': address == null ? null : '$address:${server.boundPort}',
        });
      } else {
        await _channel.invokeMethod<void>('stop');
      }
    } on PlatformException catch (e) {
      // Sharing still works while the screen is on; failing to keep it alive
      // must not stop the app from starting, or the switch from switching.
      debugPrint('aCelery: background serving ${shared ? 'start' : 'stop'} '
          'failed: $e');
    }
  }
}
