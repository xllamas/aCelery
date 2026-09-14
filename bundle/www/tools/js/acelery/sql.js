import { get, postJson } from "./bridge.js";
class Database {
  /** @param {number} handle from the host's handle table */
  constructor(handle) {
    this.handle = handle;
    this.closed = false;
  }
  #require() {
    if (this.closed) throw new Error("database is closed");
    return this.handle;
  }
  /**
   * Runs a SELECT and resolves to every row.
   *
   * Columns keep their SQLite types — an INTEGER arrives as a number, NULL as
   * null. The cursor API stringified everything because Cursor did; nothing
   * carries that contract forward.
   *
   * @returns {Promise<Object[]>}
   */
  async select(sql, args = []) {
    const { rows } = await postJson(
      { opt: "sql", action: "query" },
      { handle: this.#require(), sql, args }
    );
    return rows;
  }
  /**
   * Runs a SELECT and resolves to its first row, or null.
   * The commonest shape in the IDE, and it saves the caller an index.
   */
  async selectOne(sql, args = []) {
    const rows = await this.select(sql, args);
    return rows.length ? rows[0] : null;
  }
  /** Runs a statement that returns no rows; resolves to the rows changed. */
  async exec(sql, args = []) {
    const { changes } = await postJson(
      { opt: "sql", action: "run" },
      { handle: this.#require(), sql, args }
    );
    return changes;
  }
  /** Runs an INSERT; resolves to the new rowid. */
  async insert(sql, args = []) {
    const { rowid } = await postJson(
      { opt: "sql", action: "insertrow" },
      { handle: this.#require(), sql, args }
    );
    return rowid;
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    await get({ opt: "sql", action: "closedb", handle: this.handle });
  }
}
async function openDB(path, basePath) {
  const { handle } = await get({
    opt: "sql",
    action: "opendb",
    path,
    bpath: basePath
  });
  return new Database(Number(handle));
}
async function deleteDB(path, basePath) {
  await get({ opt: "sql", action: "deletedb", path, bpath: basePath });
}
export {
  Database,
  deleteDB,
  openDB
};
//# sourceMappingURL=sql.js.map
