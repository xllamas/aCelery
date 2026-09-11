import 'package:http/http.dart' as http;

/// Implements the `opt=http` routes — aCelery's outbound HTTP proxy, used by
/// `xHTTP` so user apps can reach the network without CORS.
///
/// Replaces the `DefaultHttpClient` / `HttpGet` / `HttpPost` code flagged as
/// the top liability in doc/modernization-assessment.md.
class HttpBridge {
  HttpBridge({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// Returns the response body, or "" on any failure — `xHTTP.get` in
  /// xscript.js hands the result straight to `JSON.parse`, and the Java
  /// version likewise returned an empty string rather than an error.
  Future<String> get(String url) async {
    try {
      final response = await _client.get(Uri.parse(url));
      return response.body;
    } on Exception {
      return '';
    }
  }

  /// `xHTTPPost` sent a form-encoded body built from a JSON object of
  /// name/value pairs; anything else is posted verbatim.
  Future<String> post(String url, String body) async {
    try {
      final response = await _client.post(
        Uri.parse(url),
        headers: const {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body,
      );
      return response.body;
    } on Exception {
      return '';
    }
  }

  void dispose() => _client.close();
}
