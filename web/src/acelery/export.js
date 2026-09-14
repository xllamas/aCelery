/**
 * Handing a file to the user, and importing one back.
 *
 * These four are the only calls that ask the host to *do* something rather
 * than return data, and each one's plain-browser form is a dead end inside a
 * Flutter WebView: `window.open`, `window.close`, an empty else branch, and a
 * form submit relying on Content-Disposition. The shell registers a one-way
 * channel for exactly them (port plan §4, Phase 2), so they are fire-and-forget
 * and there is nothing to await.
 */

import { postText } from "./bridge.js";

const BASE = "/android.itf?";

/**
 * Stages a file with the host and asks it to offer it to the user — on the
 * device, through the system share sheet.
 *
 * @param {string} mime
 * @param {string} filename
 * @param {string} data
 * @returns {Promise<number>} the export handle, mostly for tests
 */
export async function saveFile(mime, filename, data) {
  const body = await postText(
    { opt: "export", action: "set", mime, fname: filename },
    data,
  );
  const handle = JSON.parse(body).handle;
  download(`${BASE}opt=export&action=get&handle=${handle}`);
  return Number(handle);
}

/** Zips a project under `www/user/` and offers it to the user. */
export function exportProject(name) {
  download(
    `${BASE}opt=exportproject&action=export&project=${encodeURIComponent(name)}`,
  );
}

/** Opens the system file picker so the user can import a project zip. */
export function importProject() {
  post({ action: "importProject" });
}

/** Opens one of the user's apps. */
export function runApp(title, app, debug = false) {
  post({ action: "runApp", title, app, debug: !!debug });
}

/** Leaves the running app and goes back to the IDE. */
export function closeApp() {
  post({ action: "closeApp" });
}

function download(url) {
  post({ action: "download", url });
}

/**
 * Outside the app — a browser on the LAN — there is no host channel. Navigating
 * to the same URL is what a remote user wants anyway: the browser saves the
 * Content-Disposition response itself.
 */
function post(payload) {
  const host = globalThis.ACeleryHost;
  if (host) {
    host.postMessage(JSON.stringify(payload));
  } else if (payload.action === "download") {
    globalThis.location.href = payload.url;
  } else {
    throw new Error(`${payload.action} is only available inside aCelery`);
  }
}
