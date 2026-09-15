/**
 * A database: its tables, one table, its structure, and a SQL scratchpad
 * (doc/shell-redesign.md §4.5).
 *
 *   #/data/:db                          Tables tab
 *   #/data/:db/sql                      SQL tab
 *   #/data/:db/table/:table             TableMaint
 *   #/data/:db/table/:table/structure   PRAGMA table_info
 *
 * The handle belongs to this component, which the shell keys by database name,
 * so it stays open across all four routes and closes when you leave the
 * database. Every statement is parameterised where a parameter is possible;
 * where it is not — an identifier — the name is validated instead. The SQL tab
 * is the one deliberate exception, for the reason given there.
 */

import {
  html, useState, useEffect, useCallback, useMemo,
  Button, Dropdown, Table, CheckBox, TableMaint,
} from "acelery/ui.js";
import { openDB, deleteDB } from "acelery/sql.js";

import { Screen } from "./frame.js";
import { useConfirm } from "./chrome.js";
import {
  ActionMenu, EmptyState, Icon, InlineError, ListRow, NotFound, Segmented,
  Skeleton, useToast,
} from "./parts.js";
import { navigate } from "./router.js";
import { databaseExists, identifier } from "./store.js";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Column types SQLite will hand back as numbers. */
const NUMERIC = ["INT", "DOU", "REA", "FLO", "NUM", "DEC", "BOO", "DAT"];

const CREATE_TEMPLATE = `create table new_table (
  id integer primary key,
  name text not null
)`;

/** How many result rows render before "Show all". */
const RESULT_LIMIT = 200;

export function DataWorkspace({ dbName, parts, settings, updateSettings }) {
  const [db, setDb] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | missing | ready
  const [error, setError] = useState(null);
  /* Lifted here, so switching Tables ↔ SQL keeps the statement, its result and
     the session's history. */
  const [sql, setSql] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    let live = true;
    let opened = null;
    (async () => {
      try {
        /* Checked first: opening a database that does not exist creates it,
           so a stale link would otherwise leave an empty file behind. */
        if (!(await databaseExists(dbName))) {
          if (live) setStatus("missing");
          return;
        }
        opened = await openDB(dbName);
        if (!live) return;
        setDb(opened);
        setStatus("ready");
        if (settings["recent.db"] !== dbName) updateSettings({ "recent.db": dbName });
      } catch (e) {
        if (!live) return;
        setError(e);
        setStatus("ready");
      }
    })();
    /* A handle left open holds a lock the next session has to wait for. */
    return () => {
      live = false;
      opened?.close().catch(() => {});
    };
  }, [dbName]);

  async function removeDatabase() {
    const yes = await confirm(
      `${dbName} and every table in it will be deleted. This cannot be undone.`,
      { title: `Delete ${dbName}?`, danger: true, confirmLabel: "Delete" },
    );
    if (!yes) return;
    try {
      await db?.close();
      await deleteDB(dbName);
      if (settings["recent.db"] === dbName) updateSettings({ "recent.db": "" });
      toast(`Deleted ${dbName}`);
      navigate(["data"], { replace: true });
    } catch (e) {
      setError(e);
    }
  }

  async function dropTable(name) {
    const yes = await confirm(
      `The table ${name} and all of its rows will be deleted. This cannot be undone.`,
      { title: `Drop ${name}?`, danger: true, confirmLabel: "Drop table" },
    );
    if (!yes) return false;
    try {
      await db.exec(`drop table ${identifier(name)}`);
      toast(`Dropped ${name}`);
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }

  const [view, table, sub] = parts;
  const errorBanner = html`<${InlineError} error=${error} onClose=${() => setError(null)} />`;

  if (status === "missing") {
    return html`
      <${Screen} title=${dbName} back=${["data"]}>
        <${NotFound} what="Database" action=${html`
          <${Button} variant="primary" onClick=${() => navigate(["data"], { replace: true })}>
            All databases
          <//>`} />
      <//>`;
  }

  /* ----------------------------------------------------------- table views */

  if (view === "table" && table) {
    const structure = sub === "structure";
    return html`
      <${TableScreen} db=${db} dbName=${dbName} table=${table} structure=${structure}
        error=${errorBanner} onError=${setError}
        onDrop=${async () => {
          if (await dropTable(table)) navigate(["data", dbName], { replace: true });
        }} />
      ${dialog}`;
  }

  /* --------------------------------------------------------- tables and SQL */

  const tab = view === "sql" ? "sql" : "tables";

  return html`
    <${Screen} title=${dbName} back=${["data"]}
      actions=${html`<${ActionMenu} title=${dbName} actions=${[{
        label: "Delete database", icon: "fa-solid fa-trash", danger: true,
        onSelect: removeDatabase,
      }]} />`}
      subbar=${html`
        <${Segmented} label="Database view" value=${tab}
          options=${[
            { value: "tables", label: "Tables", icon: "fa-solid fa-table" },
            { value: "sql", label: "SQL", icon: "fa-solid fa-terminal" },
          ]}
          onChange=${(next) =>
            navigate(next === "sql" ? ["data", dbName, "sql"] : ["data", dbName],
                     { replace: true })} />`}>
      ${errorBanner}
      ${!db
        ? status === "loading" ? html`<${Skeleton} rows=${3} />` : null
        : tab === "sql"
          ? html`<${SqlPanel} db=${db} sql=${sql} setSql=${setSql}
                   result=${result} setResult=${setResult}
                   history=${history} setHistory=${setHistory} />`
          : html`<${TablesList} db=${db} dbName=${dbName} onError=${setError}
                   onDrop=${dropTable}
                   onCreate=${() => {
                     setSql(CREATE_TEMPLATE);
                     setResult(null);
                     navigate(["data", dbName, "sql"], { replace: true });
                   }} />`}
    <//>
    ${dialog}`;
}

/* ------------------------------------------------------------------ tables */

function TablesList({ db, dbName, onError, onDrop, onCreate }) {
  const [tables, setTables] = useState(null);
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    try {
      const rows = await db.select(
        "select name from sqlite_master where type = ? order by name",
        ["table"],
      );
      setTables(rows.map((r) => r.name));
    } catch (e) {
      onError(e);
      setTables([]);
    }
  }, [db]);

  useEffect(() => { load(); }, [load]);

  /* Names first, counts after, one table at a time: a slow count never holds
     the list up. A name that is not a plain identifier gets no counts rather
     than a concatenated statement. */
  useEffect(() => {
    if (!tables) return;
    let live = true;
    (async () => {
      for (const name of tables) {
        if (!live) return;
        try {
          identifier(name);
          const columns = await db.select(`PRAGMA table_info(${name})`);
          const row = await db.selectOne(`select count(*) as n from ${name}`);
          if (live) {
            setCounts((c) => ({ ...c, [name]: { columns: columns.length, rows: row?.n ?? 0 } }));
          }
        } catch {
          // Leave the meta line empty.
        }
      }
    })();
    return () => { live = false; };
  }, [tables]);

  if (tables === null) return html`<${Skeleton} rows=${3} />`;

  if (!tables.length) {
    return html`
      <${EmptyState} icon="fa-solid fa-table" title="No tables yet"
        action=${html`<${Button} variant="primary" onClick=${onCreate}>Create a table<//>`}>
        Start from a template in the SQL tab.
      <//>`;
  }

  return html`
    <div class="ac-list">
      ${tables.map((name) => {
        const c = counts[name];
        return html`
          <${ListRow} key=${name} icon="fa-solid fa-table" title=${name}
            meta=${c ? `${plural(c.columns, "column")} · ${plural(c.rows, "row")}` : " "}
            onOpen=${() => navigate(["data", dbName, "table", name])}
            actions=${[
              { label: "Structure", icon: "fa-solid fa-table-columns",
                onSelect: () => navigate(["data", dbName, "table", name, "structure"]) },
              { label: "Drop table", icon: "fa-solid fa-trash", danger: true,
                onSelect: async () => { if (await onDrop(name)) load(); } },
            ]} />`;
      })}
    </div>`;
}

/* ------------------------------------------------------------------- table */

function TableScreen({ db, dbName, table, structure, error, onError, onDrop }) {
  const [columns, setColumns] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());

  useEffect(() => {
    if (!db) return;
    let live = true;
    (async () => {
      try {
        identifier(table);
        const info = await db.select(`PRAGMA table_info(${table})`);
        if (live) setColumns(info);
      } catch (e) {
        if (!live) return;
        onError(e);
        setColumns([]);
      }
    })();
    return () => { live = false; };
  }, [db, table]);

  /* The column chooser used to be a whole screen you passed through on the way
     to every table. Every column is listed by default, which is what that
     screen defaulted to, so it is now a menu you open only to change it. */
  const fields = useMemo(
    () => (columns ?? []).map((c) => ({
      type: NUMERIC.some((t) => String(c.type).toUpperCase().includes(t)) ? "number" : "string",
      title: c.name,
      name: c.name,
      inList: !hidden.has(c.name),
      inSearch: true,
    })),
    [columns, hidden],
  );

  const toggle = (name, shown) =>
    setHidden((set) => {
      const next = new Set(set);
      if (shown) next.delete(name);
      else next.add(name);
      return next;
    });

  const menu = html`<${ActionMenu} title=${table} actions=${[
    structure
      ? { label: "Browse rows", icon: "fa-solid fa-table",
          onSelect: () => navigate(["data", dbName, "table", table], { replace: true }) }
      : { label: "Structure", icon: "fa-solid fa-table-columns",
          onSelect: () => navigate(["data", dbName, "table", table, "structure"]) },
    { label: "Drop table", icon: "fa-solid fa-trash", danger: true, onSelect: onDrop },
  ]} />`;

  const chooser = !structure && columns?.length
    ? html`
        <${Dropdown} autoClose="outside" align="end" className="ac-over">
          <${Dropdown.Toggle} as="button" type="button" bsPrefix="ac-chip"
                              aria-label="Choose columns">
            <${Icon} name="fa-solid fa-table-columns" />
            <span class="d-none d-md-inline">Columns</span>
          <//>
          <${Dropdown.Menu} className="ac-columns-menu" popperConfig=${{ strategy: "fixed" }}>
            ${columns.map((c) => html`
              <${CheckBox} key=${c.name} label=${c.name} className="mb-2"
                checked=${!hidden.has(c.name)}
                onChange=${(v) => toggle(c.name, v)} />`)}
          <//>
        <//>`
    : null;

  let body;
  if (!db || columns === null) {
    body = html`<${Skeleton} rows=${4} />`;
  } else if (!columns.length) {
    body = html`
      <${NotFound} what="Table" action=${html`
        <${Button} variant="primary"
          onClick=${() => navigate(["data", dbName], { replace: true })}>
          All tables
        <//>`} />`;
  } else if (structure) {
    body = html`
      <div class="ac-results">
        <${Table} hover size="sm">
          <thead>
            <tr><th>Column</th><th>Type</th><th>Not null</th><th>Default</th><th>Key</th></tr>
          </thead>
          <tbody>
            ${columns.map((c) => html`
              <tr key=${c.name}>
                <td>${c.name}</td>
                <td>${c.type || html`<span class="ac-null">none</span>`}</td>
                <td>${c.notnull ? "yes" : ""}</td>
                <td>${c.dflt_value ?? html`<span class="ac-null">NULL</span>`}</td>
                <td>${c.pk ? "primary" : ""}</td>
              </tr>`)}
          </tbody>
        <//>
      </div>`;
  } else {
    body = html`
      <${TableMaint} key=${fields.filter((f) => f.inList).map((f) => f.name).join("|")}
        db=${db} title=${table} table=${table} fields=${fields} onError=${onError} />`;
  }

  return html`
    <${Screen} title=${table}
      subtitle=${structure ? `Structure · ${dbName}` : dbName}
      back=${structure ? ["data", dbName, "table", table] : ["data", dbName]}
      actions=${html`${chooser}${menu}`}>
      ${error}
      ${body}
    <//>`;
}

/* --------------------------------------------------------------------- SQL */

/**
 * The SQL scratchpad.
 *
 * Deliberately *not* parameterised: the whole point is to run whatever the
 * user typed. It is their database, on their device, and this is the tool for
 * reaching it directly.
 *
 * A textarea rather than the code editor: `createEditor` would highlight a
 * .sql name as HTML, which is worse than none, and SQL highlighting is a
 * separate, unmeasured dependency (doc/shell-redesign.md §12.5).
 */
function SqlPanel({ db, sql, setSql, result, setResult, history, setHistory }) {
  async function run() {
    const statement = sql.trim();
    if (!statement) return;
    const started = performance.now();
    const elapsed = () => Math.max(0, Math.round(performance.now() - started));
    try {
      if (/^(select|pragma|with|explain)\b/i.test(statement)) {
        const rows = await db.select(statement);
        setResult({ kind: "rows", rows, ms: elapsed(), limit: RESULT_LIMIT });
      } else if (/^insert\b/i.test(statement)) {
        const id = await db.insert(statement);
        setResult({ kind: "text", text: `Inserted row ${id}`, ms: elapsed() });
      } else {
        const changed = await db.exec(statement);
        setResult({ kind: "text", text: `${plural(changed, "row")} changed`, ms: elapsed() });
      }
      setHistory((h) => [statement, ...h.filter((s) => s !== statement)].slice(0, 10));
    } catch (e) {
      setResult({ kind: "error", text: e.message ?? String(e) });
    }
  }

  let output = null;
  if (result?.kind === "error") {
    output = html`<${InlineError} error=${result.text} onClose=${() => setResult(null)} />`;
  } else if (result?.kind === "text") {
    output = html`<div class="ac-results-meta" role="status">${result.text} · ${result.ms} ms</div>`;
  } else if (result?.kind === "rows") {
    output = html`<${Results} result=${result}
      onShowAll=${() => setResult({ ...result, limit: Infinity })} />`;
  }

  return html`
    <div class="ac-sql">
      <label class="visually-hidden" for="ac-sql-input">SQL statement</label>
      <textarea id="ac-sql-input" class="form-control ac-sql-input"
        placeholder="select * from …" spellcheck="false" autocapitalize="off"
        autocomplete="off" autocorrect="off" value=${sql}
        onInput=${(e) => setSql(e.currentTarget.value)}
        onKeyDown=${(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            run();
          }
        }}></textarea>
      <div class="ac-button-row">
        <${Button} variant="primary" onClick=${run} disabled=${!sql.trim()}>
          <${Icon} name="fa-solid fa-play" /> Run
        <//>
        <${Button} variant="outline-secondary"
          onClick=${() => { setSql(""); setResult(null); }}>
          Clear
        <//>
        ${history.length
          ? html`
              <${Dropdown}>
                <${Dropdown.Toggle} variant="outline-secondary">
                  <${Icon} name="fa-solid fa-clock-rotate-left" /> History
                <//>
                <${Dropdown.Menu} popperConfig=${{ strategy: "fixed" }}>
                  ${history.map((s) => html`
                    <${Dropdown.Item} as="button" key=${s}
                      className="font-monospace text-truncate" style=${{ maxWidth: "22rem" }}
                      onClick=${() => setSql(s)}>${s}<//>`)}
                <//>
              <//>`
          : null}
      </div>
      ${output}
    </div>`;
}

function Results({ result, onShowAll }) {
  const { rows, ms, limit } = result;
  if (!rows.length) {
    return html`<div class="ac-results-meta" role="status">No rows · ${ms} ms</div>`;
  }
  /* Every key any row has, in first-seen order, so a sparse result still shows
     all of its columns. */
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const shown = rows.slice(0, limit);

  return html`
    <div class="ac-results-meta" role="status">
      ${plural(rows.length, "row")} · ${ms} ms
    </div>
    <div class="ac-results">
      <${Table} hover size="sm">
        <thead>
          <tr>${columns.map((c) => html`<th key=${c} scope="col">${c}</th>`)}</tr>
        </thead>
        <tbody>
          ${shown.map((row, i) => html`
            <tr key=${i}>
              ${columns.map((c) => {
                const v = row[c];
                return html`
                  <td key=${c} class=${typeof v === "number" ? "ac-num" : ""}
                      title=${v == null ? undefined : String(v)}>
                    ${v == null ? html`<span class="ac-null">NULL</span>` : String(v)}
                  </td>`;
              })}
            </tr>`)}
        </tbody>
      <//>
    </div>
    ${rows.length > shown.length
      ? html`<div>
          <${Button} variant="outline-secondary" onClick=${onShowAll}>
            Show all ${rows.length}
          <//>
        </div>`
      : null}`;
}
