import { postText } from "./bridge.js";
const BASE = "/android.itf?";
async function saveFile(mime, filename, data) {
  const body = await postText(
    { opt: "export", action: "set", mime, fname: filename },
    data
  );
  const handle = JSON.parse(body).handle;
  download(`${BASE}opt=export&action=get&handle=${handle}`);
  return Number(handle);
}
function exportProject(name) {
  download(
    `${BASE}opt=exportproject&action=export&project=${encodeURIComponent(name)}`
  );
}
function importProject() {
  post({ action: "importProject" });
}
function runApp(title, app, debug = false) {
  post({ action: "runApp", title, app, debug: !!debug });
}
function closeApp() {
  post({ action: "closeApp" });
}
function download(url) {
  post({ action: "download", url });
}
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
export {
  closeApp,
  exportProject,
  importProject,
  runApp,
  saveFile
};
//# sourceMappingURL=export.js.map
