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
    return;
  }
  switch (payload.action) {
    case "download":
      globalThis.location.href = payload.url;
      return;
    case "runApp":
      globalThis.open(
        `/system/launcher.html?app=${encodeURIComponent(payload.app)}`,
        "_blank"
      );
      return;
    case "closeApp":
      if (globalThis.history.length > 1) globalThis.history.back();
      else globalThis.close();
      return;
    default:
      throw new Error(
        `${payload.action} needs the aCelery app; it is not available from a browser on the network.`
      );
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
