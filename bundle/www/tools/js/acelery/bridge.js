const BASE = "/android.itf";
class BridgeError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "BridgeError";
    this.status = status;
  }
}
function url(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0 && v !== null) q.set(k, String(v));
  }
  return `${BASE}?${q}`;
}
async function fail(response) {
  let detail = "";
  try {
    const body = await response.text();
    detail = JSON.parse(body).error ?? body;
  } catch {
  }
  return new BridgeError(
    detail || `bridge call failed with ${response.status}`,
    response.status
  );
}
async function get(params) {
  const response = await fetch(url(params), { cache: "no-store" });
  if (!response.ok) throw await fail(response);
  return response.json();
}
async function getText(params) {
  const response = await fetch(url(params), { cache: "no-store" });
  if (!response.ok) throw await fail(response);
  return response.text();
}
async function postJson(params, body) {
  const response = await fetch(url(params), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw await fail(response);
  return response.json();
}
async function postText(params, body) {
  const response = await fetch(url(params), {
    method: "POST",
    cache: "no-store",
    body
  });
  if (!response.ok) throw await fail(response);
  return response.text();
}
async function postBytes(params, body) {
  const response = await fetch(url(params), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/octet-stream" },
    body
  });
  if (!response.ok) throw await fail(response);
  return response.json();
}
export {
  BridgeError,
  get,
  getText,
  postBytes,
  postJson,
  postText,
  url
};
//# sourceMappingURL=bridge.js.map
