import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:shelf/shelf.dart';

/// Who may talk to the embedded server.
///
/// The Android original bound to `0.0.0.0` and authenticated nothing, so any
/// device on the same Wi-Fi could reach `/android.itf` and, through it, the
/// SQLite and filesystem bridges. `doc/modernization-assessment.md` §2 verified
/// that live and set out the model implemented here:
///
///  1. **Loopback is trusted implicitly.** The app's own WebView is the common
///     case and must not be made to pair with itself.
///  2. **Everything else pairs first.** An unknown device gets a page telling
///     it to seek approval, and a prompt appears on the device with the peer's
///     address and a short code.
///  3. **Approval issues a token**, which every later request must carry. The
///     address alone is not the credential: DHCP reassigns it, and anything on
///     the network can claim it.
///  4. **Paths are confined** — done separately, in `FileBridge`.
///
/// The code exists so that two devices asking at once cannot be confused for
/// each other: the prompt names one, and only that one is approved.
class AccessControl {
  AccessControl({required this.storeFile, Random? random})
      : _random = random ?? Random.secure();

  /// Where pairings and the sharing setting persist.
  ///
  /// Deliberately outside the aCelery tree ([ACeleryPaths.accessStore]): it
  /// holds bearer tokens. Outside `www/` was not enough — static serving is
  /// only one way out, and the file bridge reads anything under the tree.
  final File storeFile;

  final Random _random;
  final Map<String, PairedDevice> _devices = {};
  final Map<String, PendingPairing> _pending = {};
  final StreamController<PendingPairing> _requests =
      StreamController<PendingPairing>.broadcast();

  /// Whether the server should listen beyond loopback.
  ///
  /// Off by default. The original was always on, which is what made the
  /// missing authentication a live exposure rather than a latent one.
  bool sharedOnNetwork = false;

  /// Raised when an unknown device asks to pair, for the shell to prompt on.
  Stream<PendingPairing> get requests => _requests.stream;

  /// Devices that may connect, most recently seen first.
  List<PairedDevice> get devices {
    final all = _devices.values.toList()
      ..sort((a, b) => b.lastSeen.compareTo(a.lastSeen));
    return List.unmodifiable(all);
  }

  /// Pairings still waiting on the user.
  ///
  /// Settled ones linger until the browser has collected the answer, so they
  /// are filtered out here: the shell must not re-prompt for a decision that
  /// has already been made.
  List<PendingPairing> get pending =>
      List.unmodifiable(_pending.values.where((p) => !p.isSettled));

  // ------------------------------------------------------------- decisions

  /// What should happen to [request], from peer [address].
  Access check(Request request, InternetAddress address) {
    if (address.isLoopback) return const Access.allowed();
    if (!sharedOnNetwork) return const Access.refused();

    final token = _tokenOf(request);
    final device = token == null ? null : _devices[token];
    if (device != null) {
      device.lastSeen = DateTime.now();
      return const Access.allowed();
    }

    return Access.pairingRequired(_pendingFor(address));
  }

  /// The pairing this address is already waiting on, or a new one.
  ///
  /// Reusing it matters: a browser loading a page makes many requests at once,
  /// and one prompt per subresource would be unusable. A *settled* pairing is
  /// never reused, or a device that was just denied would be handed its own
  /// refusal instead of a fresh request.
  PendingPairing _pendingFor(InternetAddress address) {
    for (final p in _pending.values) {
      if (p.address == address.address && !p.isSettled) return p;
    }
    final pairing = PendingPairing(
      id: _secret(9),
      address: address.address,
      code: (_random.nextInt(9000) + 1000).toString(),
    );
    _pending[pairing.id] = pairing;
    _requests.add(pairing);
    return pairing;
  }

  String? _tokenOf(Request request) {
    final header = request.headers['cookie'];
    if (header == null) return null;
    for (final part in header.split(';')) {
      final pair = part.trim().split('=');
      if (pair.length == 2 && pair.first == cookieName) return pair.last;
    }
    return null;
  }

  // ---------------------------------------------------------------- pairing

  /// Approves a waiting device and mints its token.
  ///
  /// The pairing is resolved but *kept*: the browser is polling for the answer
  /// and has to be able to read it. Removing it here was a real defect — the
  /// next poll saw "unknown", reloaded, and raised a fresh pairing request, so
  /// an approved device could never get in. [collect] clears it afterwards.
  Future<String?> approve(String pendingId) async {
    final pairing = _pending[pendingId];
    if (pairing == null || pairing.isSettled) return null;

    final token = _secret(32);
    _devices[token] = PairedDevice(
      token: token,
      address: pairing.address,
      pairedAt: DateTime.now(),
      lastSeen: DateTime.now(),
    );
    pairing.resolve(token);
    await save();
    return token;
  }

  Future<void> deny(String pendingId) async {
    _pending[pendingId]?.resolve(null);
  }

  /// Reads a settled pairing's answer and forgets it.
  ///
  /// Called once the browser has been told, so the record does not outlive its
  /// purpose. Abandoned pairings are swept by [expire].
  PendingPairing? collect(String pendingId) {
    final pairing = _pending[pendingId];
    if (pairing != null && pairing.isSettled) _pending.remove(pendingId);
    return pairing;
  }

  /// Drops pairings nobody answered or collected.
  ///
  /// A device that asked and was ignored should have to ask again rather than
  /// sit in the list forever, and a prompt the user dismissed by walking away
  /// should not reappear an hour later.
  void expire({Duration after = const Duration(minutes: 10)}) {
    final cutoff = DateTime.now().subtract(after);
    _pending.removeWhere((_, p) => p.requestedAt.isBefore(cutoff));
  }

  /// Withdraws a device's access. It pairs again, or does not.
  Future<void> revoke(String token) async {
    _devices.remove(token);
    await save();
  }

  Future<void> revokeAll() async {
    _devices.clear();
    await save();
  }

  Future<void> setShared(bool shared) async {
    sharedOnNetwork = shared;
    await save();
  }

  /// The state of a pairing, for the waiting browser to poll.
  PendingPairing? pendingById(String id) => _pending[id];

  PairedDevice? deviceByToken(String token) => _devices[token];

  // ------------------------------------------------------------ persistence

  Future<void> load() async {
    if (!await storeFile.exists()) return;
    try {
      final json =
          jsonDecode(await storeFile.readAsString()) as Map<String, Object?>;
      sharedOnNetwork = json['sharedOnNetwork'] == true;
      _devices.clear();
      for (final entry in (json['devices'] as List? ?? const [])) {
        final device = PairedDevice.fromJson(entry as Map<String, Object?>);
        _devices[device.token] = device;
      }
    } on FormatException {
      // A corrupt store means nobody is paired and sharing is off, which is
      // the safe reading of "we do not know who is allowed".
      sharedOnNetwork = false;
      _devices.clear();
    }
  }

  Future<void> save() async {
    await storeFile.parent.create(recursive: true);
    await storeFile.writeAsString(jsonEncode({
      'sharedOnNetwork': sharedOnNetwork,
      'devices': _devices.values.map((d) => d.toJson()).toList(),
    }));
  }

  void dispose() => _requests.close();

  String _secret(int bytes) => base64Url
      .encode(List<int>.generate(bytes, (_) => _random.nextInt(256)))
      .replaceAll('=', '');

  /// The cookie the token travels in. HttpOnly, so page scripts cannot read
  /// it and a cross-site request cannot borrow it.
  static const String cookieName = 'acelery_token';
}

/// What [AccessControl.check] decided.
sealed class Access {
  const Access();

  const factory Access.allowed() = AccessAllowed;
  const factory Access.refused() = AccessRefused;
  const factory Access.pairingRequired(PendingPairing pairing) =
      AccessPairingRequired;
}

class AccessAllowed extends Access {
  const AccessAllowed();
}

/// Sharing is off, so a non-loopback peer has nothing to pair with.
class AccessRefused extends Access {
  const AccessRefused();
}

class AccessPairingRequired extends Access {
  const AccessPairingRequired(this.pairing);

  final PendingPairing pairing;
}

/// A device waiting on the user.
class PendingPairing {
  PendingPairing({
    required this.id,
    required this.address,
    required this.code,
  }) : requestedAt = DateTime.now();

  final String id;
  final String address;

  /// Shown on both the device and the waiting browser, so that approving one
  /// of two simultaneous requests cannot approve the other by accident.
  final String code;

  final DateTime requestedAt;

  final Completer<String?> _settled = Completer<String?>();

  /// The token once approved, or null if denied. Completes once.
  Future<String?> get settled => _settled.future;

  bool get isSettled => _settled.isCompleted;

  void resolve(String? token) {
    if (!_settled.isCompleted) _settled.complete(token);
  }
}

/// A device that has been approved.
class PairedDevice {
  PairedDevice({
    required this.token,
    required this.address,
    required this.pairedAt,
    required this.lastSeen,
  });

  final String token;

  /// The address it paired from — a label, not the credential.
  final String address;

  final DateTime pairedAt;
  DateTime lastSeen;

  Map<String, Object?> toJson() => {
        'token': token,
        'address': address,
        'pairedAt': pairedAt.toIso8601String(),
        'lastSeen': lastSeen.toIso8601String(),
      };

  static PairedDevice fromJson(Map<String, Object?> json) => PairedDevice(
        token: json['token'] as String,
        address: json['address'] as String? ?? 'unknown',
        pairedAt: DateTime.parse(json['pairedAt'] as String),
        lastSeen: DateTime.parse(json['lastSeen'] as String),
      );
}
