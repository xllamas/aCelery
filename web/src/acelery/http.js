/**
 * Outbound HTTP, proxied through the host.
 *
 * The WebView's own `fetch` is bound by the page's origin and by the
 * cleartext policy that permits only localhost; the host has neither
 * restriction, so app authors reach the network through here.
 */

import { getText, postText } from "./bridge.js";

/** @returns {Promise<string>} the response body, unparsed */
export function get(url) {
  return getText({ opt: "http", action: "get", url });
}

/**
 * @param {string} url
 * @param {string} data form-encoded body
 * @returns {Promise<string>} the response body, unparsed
 */
export function post(url, data) {
  return postText({ opt: "http", action: "post", url }, data);
}

/** Convenience: GET and parse. Throws if the body is not JSON. */
export async function getJson(url) {
  return JSON.parse(await get(url));
}
