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
 * Outside the app — a browser on the LAN — there is no host channel, and each
 * of these has to mean something there too. Serving apps to another device is
 * the reason the embedded server is reachable at all (port plan §1.3); an
 * action that only works on the device quietly removes the point of it.
 *
 * Phase 4b got this wrong: every action but `download` threw, so `Run` in a
 * remote browser raised inside a click handler and looked like a dead menu
 * item. The 2014 library did `window.open("/system/launcher.html?app=…")`, and
 * that is still the right answer — the launcher works over HTTP like
 * everything else.
 */
function post(payload) {
  const host = globalThis.ACeleryHost;
  if (host) {
    host.postMessage(JSON.stringify(payload));
    return;
  }

  switch (payload.action) {
    case "download":
      // The browser saves the Content-Disposition response itself.
      globalThis.location.href = payload.url;
      return;

    case "runApp":
      // A new tab, so the IDE stays where it was — what window.open did.
      globalThis.open(
        `/system/launcher.html?app=${encodeURIComponent(payload.app)}`,
        "_blank",
      );
      return;

    case "closeApp":
      // The launcher is its own tab; closing it is the browser's business.
      // window.close() is a no-op on a tab the script did not open, so go back
      // rather than appear to do nothing.
      if (globalThis.history.length > 1) globalThis.history.back();
      else globalThis.close();
      return;

    default:
      // importProject needs the device's file picker and has no remote form.
      throw new Error(
        `${payload.action} needs the aCelery app; it is not available from a ` +
          "browser on the network.",
      );
  }
}
