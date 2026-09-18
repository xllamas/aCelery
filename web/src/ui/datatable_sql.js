/**
 * DataTables' server-side protocol, answered from SQLite.
 *
 * In server-side mode DataTables asks for one page at a time — `{start, length,
 * order, search, columns}` — and expects `{recordsTotal, recordsFiltered, data}`
 * back. This turns each request into two parameterised statements over the
 * bridge: one for both counts, one for the page. A table of 50,000 rows never
 * crosses the bridge in full; only the ten being looked at do.
 *
 *     <${DataTable} source=${sqlSource(db, "person")} columns=${[...]} />
 *     sqlSource(db, { table: "person", where: "grp = ?", args: [g] })
 *     sqlSource(db, { query: "select p.mname, g.name as grp from person p" +
 *                            " join grp g on g.rowid = p.grp" })
 *
 * Kept free of DataTables and of the DOM, so it can be tested against a real
 * SQLite database rather than a stub that agrees with whatever it is sent.
 *
 * Values are always bound. Identifiers cannot be, so the names that reach the
 * SQL — the table, and the columns a request sorts or searches on — must be
 * plain identifiers, the same rule TableMaint and the IDE apply. The request
 * comes from the page, so a crafted one is refused rather than trusted.
 */

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Whether a column's `data` can be sorted and searched on in SQL. */
export const isColumnName = (name) =>
  typeof name === "string" && IDENTIFIER.test(name);

function quote(name, what) {
  if (!isColumnName(name)) {
    throw new Error(`"${name}" is not a usable ${what} name`);
  }
  // Quoted as well as checked, so a column called "group" or "order" works.
  return `"${name}"`;
}

/** `LIKE` treats % and _ as wildcards; a search for "50%" means the text. */
const likeTerm = (text) => `%${String(text).replace(/[\\%_]/g, "\\$&")}%`;
const LIKE = `like ? escape '\\'`;

/**
 * Splits a global search the way DataTables' own smart search does: every
 * word must match some column, and "a quoted phrase" is one word.
 */
export function searchTerms(value) {
  const terms = [];
  for (const m of String(value ?? "").matchAll(/"([^"]*)"|(\S+)/g)) {
    const term = m[1] ?? m[2];
    if (term) terms.push(term);
  }
  return terms;
}

/**
 * @param {{select(sql: string, args?: unknown[]): Promise<object[]>}} db
 *   an open database from `acelery/sql.js`
 * @param {string | {table?: string, query?: string, where?: string,
 *                   args?: unknown[], rowid?: boolean}} from
 *   a table name, or an object naming a `table` or a `query`. `where` narrows
 *   either, and `args` binds the `?`s in `query` then `where`, in that order.
 *   A table's rows carry their `rowid` unless `rowid: false` (a view, or a
 *   WITHOUT ROWID table); a query returns exactly the columns it selects.
 */
export function sqlSource(db, from) {
  const spec = typeof from === "string" ? { table: from } : { ...from };
  if (!db || typeof db.select !== "function") {
    throw new Error("sqlSource needs an open database");
  }
  if (!spec.table === !spec.query) {
    throw new Error("sqlSource needs a table or a query, not both");
  }

  const base = spec.table
    ? quote(spec.table, "table")
    : `(${spec.query}) as source`;
  const baseWhere = spec.where ? [`(${spec.where})`] : [];
  const baseArgs = [...(spec.args ?? [])];
  // `as rowid` keeps the name: a table with an INTEGER PRIMARY KEY would
  // otherwise report the rowid under that column's name instead.
  const select = spec.table && spec.rowid !== false ? "rowid as rowid, *" : "*";

  return {
    /** Identifies the data, so the table rebuilds when it changes and not
        on every render that happens to build a new source object. */
    key: JSON.stringify([spec.table ?? null, spec.query ?? null,
                         spec.where ?? null, baseArgs, select]),

    /**
     * Answers one DataTables request.
     * @param {object} request what DataTables passes to an `ajax` function
     */
    async fetch(request) {
      const columns = request.columns ?? [];

      /* The search: global terms across every searchable column, then any
         per-column searches. */
      const where = [];
      const args = [];
      const searchable = columns
        .filter((c) => c.searchable !== false && isColumnName(c.data))
        .map((c) => quote(c.data, "column"));
      const terms = searchTerms(request.search?.value);
      if (terms.length && !searchable.length) {
        // Nothing to search in means nothing can match — not "ignore it".
        where.push("0");
      }
      for (const term of searchable.length ? terms : []) {
        where.push(`(${searchable.map((c) => `${c} ${LIKE}`).join(" or ")})`);
        for (let i = 0; i < searchable.length; i++) args.push(likeTerm(term));
      }
      for (const c of columns) {
        const value = c.search?.value;
        if (!value || c.searchable === false) continue;
        where.push(`${quote(c.data, "column")} ${LIKE}`);
        args.push(likeTerm(value));
      }

      const all = baseWhere.length ? ` where ${baseWhere.join(" and ")}` : "";
      const filtered = [...baseWhere, ...where];
      const matching = filtered.length ? ` where ${filtered.join(" and ")}` : "";

      /* Both counts in one round trip. When nothing is searched for they are
         the same number, and the second count is not worth running. */
      const counts = where.length
        ? await db.select(
            `select (select count(*) from ${base}${all}) as total,` +
              ` (select count(*) from ${base}${matching}) as filtered`,
            [...baseArgs, ...baseArgs, ...args],
          )
        : await db.select(`select count(*) as total from ${base}${all}`,
            baseArgs);
      const total = Number(counts[0]?.total ?? 0);
      const matched = where.length ? Number(counts[0]?.filtered ?? 0) : total;

      const order = (request.order ?? [])
        .map((o) => {
          const column = columns[o.column];
          if (!column || column.orderable === false) return null;
          const dir = String(o.dir).toLowerCase() === "desc" ? "desc" : "asc";
          return `${quote(column.data, "column")} ${dir}`;
        })
        .filter(Boolean);

      // Integers, not bound: a limit is a count, and -1 is "show all".
      const length = Number(request.length) | 0;
      const start = Math.max(0, Number(request.start) | 0);
      const page = length > 0 ? ` limit ${length} offset ${start}` : "";

      const data = await db.select(
        `select ${select} from ${base}${matching}` +
          (order.length ? ` order by ${order.join(", ")}` : "") + page,
        [...baseArgs, ...args],
      );

      return {
        draw: request.draw,
        recordsTotal: total,
        recordsFiltered: matched,
        data,
      };
    },
  };
}
