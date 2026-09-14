/**
 * The DB Manager: databases, tables, and a SQL scratchpad.
 *
 * Every statement here is parameterised where a parameter is possible. Where
 * it is not — `PRAGMA table_info(t)`, `drop table t` — SQLite has no
 * placeholder for an identifier, so the name is checked against an identifier
 * pattern instead. The 2014 version concatenated table names into both.
 */

import {
  html, useState, useEffect, useCallback,
  Button, ButtonGroup, Table, Form, Input, TextArea, Modal, Alert, CheckBox,
  TableMaint, notEmpty,
} from "acelery/ui.js";
import * as file from "acelery/file.js";
import { openDB, deleteDB } from "acelery/sql.js";

import { IdeNavbar, Picker, useConfirm, useNotice } from "./chrome.js";

/** SQLite cannot bind an identifier, so identifiers are validated instead. */
function identifier(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`"${name}" is not a usable table name`);
  }
  return name;
}

/** Column types SQLite will hand back as numbers. */
const NUMERIC = ["INT", "DOU", "REA", "FLO", "NUM", "DEC", "BOO", "DAT"];

export function DbScreen({ onExit }) {
  const [dbRoot, setDbRoot] = useState(null);
  const [dbName, setDbName] = useState("");
  const [db, setDb] = useState(null);
  const [table, setTable] = useState("");
  const [view, setView] = useState({ kind: "blank" });
  const [dialog, setDialog] = useState(false);

  const { confirm, dialog: confirmDialog } = useConfirm();
  const { banner, notify, fail } = useNotice();

  useEffect(() => {
    file.externalStoragePath().then((p) => setDbRoot(p + "/aCelery/"), fail);
  }, []);

  /* Closing the database when the screen goes away matters: a handle left open
     holds a file lock the next session has to wait for. */
  useEffect(() => () => { db?.close(); }, [db]);

  /* ------------------------------------------------------------- databases */

  const listDbs = useCallback(
    async (mode) => {
      try {
        const entries = await file.listFiles("db", dbRoot);
        setView({
          kind: "pick-db",
          mode,
          entries: entries
            // A -journal file is SQLite's, not the user's.
            .filter((e) => !e.directory && !e.fname.includes("journal"))
            .map((e) => ({ name: e.fname })),
        });
      } catch (e) {
        fail(e);
      }
    },
    [dbRoot],
  );

  async function open(name) {
    try {
      await db?.close();
      const opened = await openDB(name);
      setDb(opened);
      setDbName(name);
      setTable("");
      setView({ kind: "blank" });
    } catch (e) {
      fail(e);
    }
  }

  async function closeDb() {
    await db?.close();
    setDb(null);
    setDbName("");
    setTable("");
    setView({ kind: "blank" });
  }

  async function removeDb(name) {
    if (!(await confirm(`Delete database ${name}?`, { danger: true }))) return;
    try {
      if (name === dbName) await closeDb();
      await deleteDB(name);
      await listDbs("delete");
      notify(`Deleted ${name}.`);
    } catch (e) {
      fail(e);
    }
  }

  /* ---------------------------------------------------------------- tables */

  const listTables = useCallback(
    async (mode) => {
      if (!db) return;
      try {
        const rows = await db.select(
          "select name from sqlite_master where type = ? order by name",
          ["table"],
        );
        setView({
          kind: "pick-table",
          mode,
          entries: rows.map((r) => ({ name: r.name })),
        });
      } catch (e) {
        fail(e);
      }
    },
    [db],
  );

  async function tableInfo(name) {
    try {
      const columns = await db.select(`PRAGMA table_info(${identifier(name)})`);
      setView({ kind: "info", table: name, columns });
    } catch (e) {
      fail(e);
    }
  }

  /** Step one of opening a table: which columns belong in the list view. */
  async function chooseColumns(name) {
    try {
      const columns = await db.select(`PRAGMA table_info(${identifier(name)})`);
      setView({ kind: "columns", table: name, columns });
    } catch (e) {
      fail(e);
    }
  }

  function openTable(name, columns, inList) {
    setTable(name);
    setView({
      kind: "table",
      table: name,
      fields: columns.map((c) => ({
        type: NUMERIC.some((t) => String(c.type).toUpperCase().includes(t))
          ? "number"
          : "string",
        title: c.name,
        name: c.name,
        inList: inList[c.name] ?? true,
        inSearch: true,
      })),
    });
  }

  async function removeTable(name) {
    if (!(await confirm(`Delete table ${name}?`, { danger: true }))) return;
    try {
      await db.exec(`drop table ${identifier(name)}`);
      if (name === table) setTable("");
      await listTables("delete");
      notify(`Dropped ${name}.`);
    } catch (e) {
      fail(e);
    }
  }

  /* ------------------------------------------------------------------ menu */

  const hasDb = dbName !== "";
  const hasTable = table !== "";

  const menu = [
    {
      label: "Database",
      items: [
        { label: "New", disabled: hasDb, onSelect: () => setDialog(true) },
        { label: "Open", disabled: hasDb, onSelect: () => listDbs("open") },
        { label: "Close", disabled: !hasDb, onSelect: closeDb },
        { label: "Delete", onSelect: () => listDbs("delete") },
      ],
    },
    {
      label: "Table",
      disabled: !hasDb,
      items: [
        { label: "Info", disabled: hasTable,
          onSelect: () => listTables("info") },
        { label: "Open", disabled: hasTable,
          onSelect: () => listTables("open") },
        { label: "Close", disabled: !hasTable,
          onSelect: () => { setTable(""); setView({ kind: "blank" }); } },
        { label: "Delete", disabled: hasTable,
          onSelect: () => listTables("delete") },
      ],
    },
    { label: "SQL", disabled: !hasDb,
      onSelect: () => setView({ kind: "sql" }) },
    { label: "Main Menu", onSelect: async () => { await closeDb(); onExit(); } },
  ];

  /* ------------------------------------------------------------------ view */

  let body = null;
  if (!dbRoot) {
    body = html`<p class="text-body-secondary">Starting…</p>`;
  } else if (view.kind === "pick-db") {
    body = html`
      <${Picker} prompt=${`Select database to ${view.mode}`}
        entries=${view.entries} icon="fa-solid fa-hard-drive"
        empty="No databases yet."
        onPick=${(name) => (view.mode === "open" ? open(name) : removeDb(name))} />`;
  } else if (view.kind === "pick-table") {
    body = html`
      <${Picker} prompt=${`Select table to ${view.mode}`}
        entries=${view.entries} icon="fa-solid fa-list"
        empty="This database has no tables yet."
        onPick=${(name) =>
          view.mode === "info" ? tableInfo(name)
          : view.mode === "open" ? chooseColumns(name)
          : removeTable(name)} />`;
  } else if (view.kind === "info") {
    body = html`<${TableInfo} name=${view.table} columns=${view.columns} />`;
  } else if (view.kind === "columns") {
    body = html`
      <${ColumnChooser} name=${view.table} columns=${view.columns}
        onOpen=${(inList) => openTable(view.table, view.columns, inList)} />`;
  } else if (view.kind === "table") {
    body = html`
      <${TableMaint} db=${db} title=${view.table} table=${view.table}
                     fields=${view.fields} onError=${fail} />`;
  } else if (view.kind === "sql") {
    body = html`<${SqlScratchpad} db=${db}
                  onClose=${() => setView({ kind: "blank" })} />`;
  }

  return html`
    <${IdeNavbar} title=${hasDb ? `DB Manager: ${dbName}` : "DB Manager"}
                  items=${menu} />
    <div class="container-fluid">
      ${banner}
      ${body}
    </div>
    <${NewDbDialog} show=${dialog} onClose=${() => setDialog(false)}
      onCreate=${({ name }) => { setDialog(false); open(name.trim() + ".db"); }} />
    ${confirmDialog}`;
}

function NewDbDialog({ show, onClose, onCreate }) {
  return html`
    <${Modal} show=${show} onHide=${onClose} centered>
      <${Modal.Header} closeButton><${Modal.Title}>New Database<//><//>
      <${Form} initial=${{ name: "" }} onSubmit=${onCreate}>
        <${Modal.Body}>
          <${Input} label="Name" name="name"
            placeholder="Database name without extension"
            validate=${[
              notEmpty("A name is required"),
              (v) => (/^[\w-]+$/.test(v ?? "") ? true
                : "Letters, numbers, dash and underscore only"),
            ]} />
        <//>
        <${Modal.Footer}>
          <${Button} variant="secondary" type="button" onClick=${onClose}>
            Close
          <//>
          <${Button} variant="primary" type="submit">Create Database<//>
        <//>
      <//>
    <//>`;
}

function TableInfo({ name, columns }) {
  return html`
    <h5>Table: ${name}</h5>
    <div class="table-responsive">
      <${Table} striped size="sm">
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Not Null</th><th>Default</th><th>PK</th>
          </tr>
        </thead>
        <tbody>
          ${columns.map(
            (c) => html`
              <tr key=${c.name}>
                <td>${c.name}</td>
                <td>${c.type}</td>
                <td>${c.notnull}</td>
                <td>${c.dflt_value ?? ""}</td>
                <td>${c.pk}</td>
              </tr>`,
          )}
        </tbody>
      <//>
    </div>`;
}

/** Which columns appear in the list view of the table being opened. */
function ColumnChooser({ name, columns, onOpen }) {
  const [inList, setInList] = useState(() =>
    Object.fromEntries(columns.map((c) => [c.name, true])),
  );
  return html`
    <h5>Columns to list — ${name}</h5>
    ${columns.map(
      (c) => html`
        <${CheckBox} key=${c.name} label=${c.name} checked=${inList[c.name]}
          onChange=${(v) => setInList((s) => ({ ...s, [c.name]: v }))} />`,
    )}
    <${Button} variant="primary" onClick=${() => onOpen(inList)}>Open Table<//>`;
}

/**
 * The SQL scratchpad.
 *
 * Deliberately *not* parameterised: the whole point is to run whatever the
 * user typed. It is their database, on their device, and this is the tool for
 * reaching it directly.
 */
function SqlScratchpad({ db, onClose }) {
  const [sql, setSql] = useState("");
  const [result, setResult] = useState(null);

  async function exec() {
    const statement = sql.trim();
    if (!statement) return;
    try {
      if (/^select\b/i.test(statement)) {
        const rows = await db.select(statement);
        setResult({ kind: "rows", rows });
      } else if (/^insert\b/i.test(statement)) {
        setResult({ kind: "text", text: `Inserted row id: ${await db.insert(statement)}` });
      } else {
        setResult({ kind: "text", text: `${await db.exec(statement)} row(s) changed.` });
      }
    } catch (e) {
      setResult({ kind: "error", text: e.message });
    }
  }

  const columns = result?.rows?.length ? Object.keys(result.rows[0]) : [];

  return html`
    <h5>SQL Query</h5>
    <${TextArea} label="Query" name="query" rows=${5} value=${sql}
                 onChange=${setSql} />
    <${ButtonGroup} size="sm" className="mb-3">
      <${Button} variant="primary" onClick=${exec}>Exec<//>
      <${Button} variant="secondary" onClick=${() => { setSql(""); setResult(null); }}>
        Clear
      <//>
      <${Button} variant="secondary" onClick=${onClose}>Close<//>
    <//>

    ${result?.kind === "error"
      ? html`<${Alert} variant="danger">${result.text}<//>`
      : null}
    ${result?.kind === "text"
      ? html`<${Alert} variant="info">${result.text}<//>`
      : null}
    ${result?.kind === "rows" && !result.rows.length
      ? html`<${Alert} variant="secondary">Zero rows returned<//>`
      : null}
    ${result?.kind === "rows" && result.rows.length
      ? html`
          <div class="table-responsive">
            <${Table} striped size="sm">
              <thead>
                <tr>${columns.map((c) => html`<th key=${c}>${c}</th>`)}</tr>
              </thead>
              <tbody>
                ${result.rows.map(
                  (row, i) => html`
                    <tr key=${i}>
                      ${columns.map(
                        (c) => html`<td key=${c}>${row[c] ?? ""}</td>`,
                      )}
                    </tr>`,
                )}
              </tbody>
            <//>
          </div>`
      : null}`;
}
