/**
 * The transport every capability module talks through.
 *
 * One implementation serves both runtimes. Inside the app's WebView this is a
 * loopback round-trip to the Dart server; from a browser on the LAN it is the
 * same request over the network. Keeping one transport is why the remote-access
 * feature works for free — see doc/js-ui-framework-evaluation.md §1.3.
 *
 * The 2014 library wrote every call twice, once against an `Android` JS
 * interface and once over HTTP. The Flutter host never registers that
 * interface, so only this path exists now.
 */

const BASE = "/android.itf";

/** A bridge call the host refused. */
export class BridgeError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "BridgeError";
    this.status = status;
  }
}

function url(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) q.set(k, String(v));
  }
  return `${BASE}?${q}`;
}

/** Reads the host's error message out of a failed response, if it sent one. */
async function fail(response) {
  let detail = "";
  try {
    const body = await response.text();
    detail = JSON.parse(body).error ?? body;
  } catch {
    // Not JSON, or an empty body. The status alone has to do.
  }
  return new BridgeError(
    detail || `bridge call failed with ${response.status}`,
    response.status,
  );
}

/** GET a route that answers with JSON. */
export async function get(params) {
  const response = await fetch(url(params), { cache: "no-store" });
  if (!response.ok) throw await fail(response);
  return response.json();
}

/** GET a route that answers with an unparsed body (file reads, the proxy). */
export async function getText(params) {
  const response = await fetch(url(params), { cache: "no-store" });
  if (!response.ok) throw await fail(response);
  return response.text();
}

/** POST a JSON body to a route that answers with JSON. */
export async function postJson(params, body) {
  const response = await fetch(url(params), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await fail(response);
  return response.json();
}

/** POST a raw body (file writes, the HTTP proxy's form data). */
export async function postText(params, body) {
  const response = await fetch(url(params), {
    method: "POST",
    cache: "no-store",
    body,
  });
  if (!response.ok) throw await fail(response);
  return response.text();
}
