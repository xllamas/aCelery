import { get, getText, postText } from "./bridge.js";
class FileHandle {
  constructor(handle) {
    this.handle = handle;
    this.closed = false;
  }
  #require() {
    if (this.closed) throw new Error("file is closed");
    return this.handle;
  }
  /** @returns {Promise<string>} the whole file */
  read() {
    return getText({ opt: "file", action: "fileread", handle: this.#require() });
  }
  /** @param {boolean} [append] append rather than truncate */
  async write(data, append = false) {
    await postText(
      {
        opt: "file",
        action: "filewrite",
        handle: this.#require(),
        append: append ? "true" : "false"
      },
      data
    );
  }
  async delete() {
    await get({ opt: "file", action: "deletefile", handle: this.#require() });
    this.closed = true;
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    await get({ opt: "file", action: "closefile", handle: this.handle });
  }
}
async function open(path, basePath) {
  const { handle } = await get({
    opt: "file",
    action: "openfile",
    path,
    bpath: basePath
  });
  return new FileHandle(Number(handle));
}
async function listFiles(path, basePath) {
  const entries = await get({
    opt: "file",
    action: "listfiles",
    path,
    bpath: basePath
  });
  if (entries.length === 1 && Object.keys(entries[0]).length === 0) return [];
  return entries;
}
async function mkdir(path, basePath) {
  await get({ opt: "file", action: "mkdir", path, bpath: basePath });
}
async function externalStoragePath() {
  const { extpath } = await get({ opt: "file", action: "getextpath" });
  return extpath;
}
export {
  FileHandle,
  externalStoragePath,
  listFiles,
  mkdir,
  open
};
//# sourceMappingURL=file.js.map
