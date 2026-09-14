/**
 * SQLite, as one round-trip per statement.
 *
 * `xSQL` mimicked android.database.Cursor: select, then getNextRow() in a loop,
 * one blocking HTTP call per row. The host materialises the whole result list
 * anyway, so this returns it in one call — the largest real-world speedup
 * available in the bundle (doc/js-ui-framework-evaluation.md §3.3).
 *
 * Statements take bound parameters. There is no unparameterised shape on
 * purpose: the old API built SQL by concatenation and base64-encoded it, which
 * is transport encoding, not escaping.
 *
 *     const db = await openDB("xtest.db");
 *     const rows = await db.select("select * from person where grp = ?", [g]);
 */

import { get, postJson } from "./bridge.js";

export class Database {
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
      { handle: this.#require(), sql, args },
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
      { handle: this.#require(), sql, args },
    );
    return changes;
  }

  /** Runs an INSERT; resolves to the new rowid. */
  async insert(sql, args = []) {
    const { rowid } = await postJson(
      { opt: "sql", action: "insertrow" },
      { handle: this.#require(), sql, args },
    );
    return rowid;
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    await get({ opt: "sql", action: "closedb", handle: this.handle });
  }
}

/**
 * Opens (creating if absent) a database under the aCelery db directory.
 * @param {string} path file name, e.g. "xtest.db"
 * @param {string} [basePath] overrides the db directory
 */
export async function openDB(path, basePath) {
  const { handle } = await get({
    opt: "sql",
    action: "opendb",
    path,
    bpath: basePath,
  });
  return new Database(Number(handle));
}

export async function deleteDB(path, basePath) {
  await get({ opt: "sql", action: "deletedb", path, bpath: basePath });
}
