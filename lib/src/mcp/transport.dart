import 'dart:convert';
import 'dart:math';

import 'package:shelf/shelf.dart';

import 'server.dart';

/// A JSON-RPC error, raised anywhere below the transport and answered as one.
class McpError implements Exception {
  McpError(this.code, this.message);

  McpError.invalidRequest(String message) : this(-32600, message);
  McpError.methodNotFound(String method)
      : this(-32601, 'Method not found: $method');
  McpError.invalidParams(String message) : this(-32602, message);

  final int code;
  final String message;

  @override
  String toString() => 'McpError($code): $message';
}

/// One client's conversation, from `initialize` until it is deleted or evicted.
class McpSession {
  McpSession({
    required this.id,
    required this.token,
    required this.protocolVersion,
  }) : lastUsed = DateTime.now();

  final String id;

  /// The token that opened it. Another token cannot continue it, so a session
  /// id seen by one client is worthless to another.
  final String token;

  final String protocolVersion;
  DateTime lastUsed;
}

/// MCP's Streamable HTTP transport, as a shelf handler for `/mcp`
/// (doc/mcp-server.md §3).
///
/// Only the parts aCelery needs: every request gets one JSON response, and
/// nothing is pushed, so there is no event stream. Authorization and the Origin
/// rule are the gate's job and have already happened by the time a request
/// arrives here.
class McpTransport {
  McpTransport(this.server, {Random? random})
      : _random = random ?? Random.secure();

  final McpServer server;
  final Random _random;
  final Map<String, McpSession> _sessions = {};

  /// A tool writes whole files, so a body can be large; not unboundedly so.
  static const int maxBodyBytes = 8 * 1024 * 1024;

  /// Sessions are cheap but a client that never deletes one should not grow
  /// the map forever; the least recently used goes first.
  static const int maxSessions = 32;

  static const String sessionHeader = 'mcp-session-id';
  static const String versionHeader = 'mcp-protocol-version';

  int get sessionCount => _sessions.length;

  Future<Response> call(Request request, {required String token}) async {
    switch (request.method) {
      case 'POST':
        return _post(request, token);
      case 'DELETE':
        return _delete(request, token);
      default:
        // GET would open a stream for server-initiated messages, and there are
        // none. 405 is what the specification says to answer instead.
        return Response(405,
            body: 'aCelery sends no server-initiated messages.',
            headers: {'Allow': 'POST, DELETE'});
    }
  }

  Future<Response> _post(Request request, String token) async {
    final type = request.headers['content-type'] ?? '';
    if (!type.toLowerCase().startsWith('application/json')) {
      return _error(415, null, -32600, 'Content-Type must be application/json');
    }

    final String text;
    try {
      text = await _readBody(request);
    } on _TooLarge {
      return _error(413, null, -32600,
          'Request body exceeds $maxBodyBytes bytes');
    } on FormatException {
      return _error(400, null, -32700, 'Request body is not UTF-8');
    }

    final Object? message;
    try {
      message = jsonDecode(text);
    } on FormatException catch (e) {
      return _error(400, null, -32700, 'Parse error: ${e.message}');
    }

    if (message is List) {
      // Batching was removed from the protocol in 2025-06-18.
      return _error(400, null, -32600, 'Batched messages are not supported');
    }
    if (message is! Map<String, Object?> || message['jsonrpc'] != '2.0') {
      return _error(400, null, -32600, 'Not a JSON-RPC 2.0 message');
    }

    final method = message['method'];
    final hasId = message.containsKey('id');
    final id = message['id'];

    // A response or error from the client. Nothing here asks the client
    // anything, so there is nothing to match it to.
    if (method == null) return Response(202);

    if (method is! String) {
      return _error(400, id, -32600, 'method must be a string');
    }
    if (hasId && id is! String && id is! int) {
      return _error(400, null, -32600, 'id must be a string or an integer');
    }

    if (method == 'initialize') {
      if (!hasId) {
        return _error(400, null, -32600, 'initialize must be a request');
      }
      return _initialize(id, message['params'], token);
    }

    final (:session, :refusal) = _sessionOf(request, token);
    if (refusal != null) return refusal;

    final version = request.headers[versionHeader];
    if (version != null && !McpServer.supportedVersions.contains(version)) {
      return _error(400, id, -32600, 'Unsupported protocol version: $version');
    }

    // Notifications — `notifications/initialized`, cancellations — need no
    // answer and change nothing here.
    if (!hasId) return Response(202);

    try {
      final result = await server.request(method, message['params'], session!);
      return _result(id, result);
    } on McpError catch (e) {
      return _json(200, _errorBody(id, e.code, e.message));
    } catch (e) {
      return _json(200, _errorBody(id, -32603, 'Internal error: $e'));
    }
  }

  Response _initialize(Object? id, Object? params, String token) {
    try {
      final (result, version) = server.initialize(params);
      final session = McpSession(
        id: _secret(),
        token: token,
        protocolVersion: version,
      );
      _evictIfFull();
      _sessions[session.id] = session;
      return _result(id, result, headers: {'Mcp-Session-Id': session.id});
    } on McpError catch (e) {
      return _json(200, _errorBody(id, e.code, e.message));
    }
  }

  /// The session the request names, or the response refusing it.
  ///
  /// A revoked token never gets this far — the gate checks the token on every
  /// request — so a session outliving its token cannot be used.
  ({McpSession? session, Response? refusal}) _sessionOf(
      Request request, String token) {
    final id = request.headers[sessionHeader];
    if (id == null) {
      return (
        session: null,
        refusal: _error(400, null, -32600,
            'Mcp-Session-Id is required; call initialize first'),
      );
    }
    final session = _sessions[id];
    // 404 tells a client its session is gone and it should initialize again,
    // which is also the right advice for a session belonging to someone else.
    if (session == null || session.token != token) {
      return (
        session: null,
        refusal: _error(404, null, -32001, 'Session not found'),
      );
    }
    session.lastUsed = DateTime.now();
    return (session: session, refusal: null);
  }

  Future<Response> _delete(Request request, String token) async {
    final (:session, :refusal) = _sessionOf(request, token);
    if (refusal != null) return refusal;
    _sessions.remove(session!.id);
    return Response(204);
  }

  void _evictIfFull() {
    while (_sessions.length >= maxSessions) {
      final oldest = _sessions.values
          .reduce((a, b) => a.lastUsed.isBefore(b.lastUsed) ? a : b);
      _sessions.remove(oldest.id);
    }
  }

  static Future<String> _readBody(Request request) async {
    final bytes = <int>[];
    await for (final chunk in request.read()) {
      bytes.addAll(chunk);
      if (bytes.length > maxBodyBytes) throw _TooLarge();
    }
    return utf8.decode(bytes);
  }

  String _secret() => base64Url
      .encode(List<int>.generate(24, (_) => _random.nextInt(256)))
      .replaceAll('=', '');

  static Response _result(Object? id, Object? result,
          {Map<String, String> headers = const {}}) =>
      _json(200, {'jsonrpc': '2.0', 'id': id, 'result': result},
          headers: headers);

  static Response _error(int status, Object? id, int code, String message) =>
      _json(status, _errorBody(id, code, message));

  static Map<String, Object?> _errorBody(Object? id, int code, String message) =>
      {
        'jsonrpc': '2.0',
        'id': id,
        'error': {'code': code, 'message': message},
      };

  static Response _json(int status, Object? body,
          {Map<String, String> headers = const {}}) =>
      Response(
        status,
        body: jsonEncode(body),
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          ...headers,
        },
      );
}

class _TooLarge implements Exception {}
