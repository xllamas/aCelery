import 'dart:async';

/// A tool call that could not do what was asked.
///
/// Reported to the model as a tool result with `isError`, not as a protocol
/// error, so the model reads the message and can correct itself — a stale
/// `expected_mtime`, a name already taken, a typo in a WHERE clause.
class ToolFailure implements Exception {
  ToolFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// A tool result that is a picture: sent as MCP image content, followed by
/// [details] as JSON text.
class ToolImage {
  const ToolImage(this.png, this.details);

  final List<int> png;
  final Map<String, Object?> details;
}

/// One MCP tool: what `tools/list` says about it, and what `tools/call` runs.
class McpTool {
  const McpTool({
    required this.name,
    required this.title,
    required this.description,
    required this.properties,
    this.required = const [],
    this.readOnly = false,
    this.destructive = false,
    this.idempotent = false,
    required this.run,
    this.target,
  });

  final String name;
  final String title;
  final String description;

  /// JSON Schema for each argument.
  final Map<String, Map<String, Object?>> properties;
  final List<String> required;

  final bool readOnly;
  final bool destructive;
  final bool idempotent;

  /// Runs the tool. Returns text, or a JSON-encodable result, or throws
  /// [ToolFailure].
  final FutureOr<Object?> Function(ToolArgs args) run;

  /// What the call acts on, for `log/mcp.log`: an app, a file, a database.
  final String Function(ToolArgs args)? target;

  Map<String, Object?> describe() => {
        'name': name,
        'title': title,
        'description': description,
        'inputSchema': {
          'type': 'object',
          'properties': properties,
          if (required.isNotEmpty) 'required': required,
          'additionalProperties': false,
        },
        'annotations': {
          'title': title,
          'readOnlyHint': readOnly,
          // The hints below are only meaningful for a tool that writes.
          if (!readOnly) 'destructiveHint': destructive,
          if (!readOnly) 'idempotentHint': idempotent,
          // Everything happens on this device; nothing reaches the internet.
          'openWorldHint': false,
        },
      };
}

/// A tool's arguments, checked as they are read.
///
/// Clients are expected to validate against the input schema, but nothing
/// makes them, so each read checks its own type and fails as a [ToolFailure]
/// the model can act on.
class ToolArgs {
  ToolArgs(this._values);

  final Map<String, Object?> _values;

  String string(String name) {
    final value = _values[name];
    if (value is String) return value;
    throw ToolFailure(value == null
        ? '"$name" is required'
        : '"$name" must be a string');
  }

  String? optionalString(String name) {
    final value = _values[name];
    if (value == null || value is String) return value as String?;
    throw ToolFailure('"$name" must be a string');
  }

  int? optionalInt(String name) {
    final value = _values[name];
    if (value == null) return null;
    if (value is int) return value;
    // JSON has one number type; a client may send 1.0 for 1.
    if (value is double && value == value.truncateToDouble()) {
      return value.toInt();
    }
    throw ToolFailure('"$name" must be an integer');
  }

  bool optionalBool(String name, {required bool fallback}) {
    final value = _values[name];
    if (value == null) return fallback;
    if (value is bool) return value;
    throw ToolFailure('"$name" must be true or false');
  }

  List<Object?> optionalList(String name) {
    final value = _values[name];
    if (value == null) return const [];
    if (value is List) return value;
    throw ToolFailure('"$name" must be an array');
  }
}
