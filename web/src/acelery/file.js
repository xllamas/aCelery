/**
 * The device filesystem, confined to the aCelery tree by the host.
 *
 * Same routes as `xFile`, async and without the `Android` branch. The host
 * rejects any path that resolves outside the tree, so a traversal attempt
 * throws here rather than reading somewhere it should not.
 */

import { get, getText, postText } from "./bridge.js";

export class FileHandle {
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
        append: append ? "true" : "false",
      },
      data,
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

/**
 * Opens (creating if absent) a file under the aCelery files directory.
 * @param {string} path
 * @param {string} [basePath] overrides the files directory
 */
export async function open(path, basePath) {
  const { handle } = await get({
    opt: "file",
    action: "openfile",
    path,
    bpath: basePath,
  });
  return new FileHandle(Number(handle));
}

/**
 * Lists a directory.
 * @returns {Promise<Array<{path:string,fname:string,directory:boolean,
 *                          lastmodified:number,length:number}>>}
 */
export async function listFiles(path, basePath) {
  const entries = await get({
    opt: "file",
    action: "listfiles",
    path,
    bpath: basePath,
  });
  // The host answers a non-directory with `[{}]`, the shape xFile.listFiles
  // used to test for. Normalise it to the empty list it means.
  if (entries.length === 1 && Object.keys(entries[0]).length === 0) return [];
  return entries;
}

export async function mkdir(path, basePath) {
  await get({ opt: "file", action: "mkdir", path, bpath: basePath });
}

/** The root the host will accept as a `basePath`. */
export async function externalStoragePath() {
  const { extpath } = await get({ opt: "file", action: "getextpath" });
  return extpath;
}
