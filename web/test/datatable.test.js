/**
 * acelery/datatable.js: the DataTable component and the SQLite adapter.
 *
 * The adapter is run against a real SQLite database (node:sqlite), not a stub:
 * a stub agrees with whatever SQL it is sent, and whether the SQL is right is
 * the thing to test. The component is tested through the built bundle, the
 * way an app loads it.
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { JSDOM } from "jsdom";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

import { sqlSource, searchTerms, isColumnName } from "../src/ui/datatable_sql.js";

/* The import map, as a resolve hook: datatable.js imports preact through
   acelery/ui.js by its bare name, exactly as it does in the launcher. */
const aceleryDir = join(dirname(fileURLToPath(import.meta.url)),
  "../../bundle/www/tools/js/acelery");
registerHooks({
  resolve(specifier, context, next) {
    return specifier.startsWith("acelery/")
      ? {
          url: pathToFileURL(join(aceleryDir, specifier.slice("acelery/".length))).href,
          shortCircuit: true,
        }
      : next(specifier, context);
  },
});

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>",
  { url: "http://localhost/", pretendToBeVisual: true });
const alerts = [];
dom.window.alert = (message) => alerts.push(message);
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  location: dom.window.location,
  HTMLElement: dom.window.HTMLElement,
  HTMLTableElement: dom.window.HTMLTableElement,
  Node: dom.window.Node,
  Element: dom.window.Element,
  Event: dom.window.Event,
  KeyboardEvent: dom.window.KeyboardEvent,
  CustomEvent: dom.window.CustomEvent,
  DocumentFragment: dom.window.DocumentFragment,
  Option: dom.window.Option,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
});

const { html, render } = await import("acelery/ui.js");
const { DataTable, DataTables } = await import("acelery/datatable.js");

const flush = async (ticks = 5) => {
  for (let i = 0; i < ticks; i++) await new Promise((r) => setTimeout(r, 0));
};

/* ------------------------------------------------------------ the database */

/**
 * The bridge's Database, over node:sqlite: same method, same row shape
 * (plain objects keyed by column name, NULL as null).
 */
function sqliteDb(setup) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(setup);
  const statements = [];
  return {
    sqlite,
    statements,
    async select(sql, args = []) {
      statements.push({ sql, args });
      return sqlite.prepare(sql).all(...args).map((r) => ({ ...r }));
    },
  };
}

/** 50 people: "Person 01".."Person 50", amounts cycling 0..9 × 10, two groups. */
function people() {
  const inserts = [];
  for (let i = 1; i <= 50; i++) {
    const name = `Person ${String(i).padStart(2, "0")}`;
    inserts.push(`('${name}', ${(i % 10) * 10}, '${i % 2 ? "odd" : "even"}')`);
  }
  return sqliteDb(`
    create table person (mname text, amount integer, grp text);
    insert into person values ${inserts.join(", ")};
    insert into person values ('Fifty percent', 50, 'pct'), ('Fifty X', 5, 'pct');
    create table grp (id integer primary key, name text);
    insert into grp (name) values ('odd'), ('even');
    create view big as select mname, amount from person where amount >= 50;
  `);
}

/** A DataTables request, as the library builds one. */
function request({ start = 0, length = 10, order = [], search = "",
                   columns = ["mname", "amount", "grp"], draw = 1 } = {}) {
  return {
    draw,
    start,
    length,
    order,
    search: { value: search, regex: false },
    columns: columns.map((c) => (typeof c === "string"
      ? { data: c, searchable: true, orderable: true, search: { value: "" } }
      : { searchable: true, orderable: true, search: { value: "" }, ...c })),
  };
}

test("a table source pages, counts and keeps the draw number", async () => {
  const db = people();
  const res = await sqlSource(db, "person").fetch(
    request({ start: 10, length: 10, order: [{ column: 0, dir: "asc" }], draw: 7 }));
  assert.equal(res.draw, 7);
  assert.equal(res.recordsTotal, 52);
  assert.equal(res.recordsFiltered, 52);
  assert.equal(res.data.length, 10);
  // "Fifty X" and "Fifty percent" sort first, so the second page starts at 09.
  assert.equal(res.data[0].mname, "Person 09");
});

test("rows carry their rowid under that name, even beside an INTEGER PRIMARY KEY",
  async () => {
    const db = people();
    const res = await sqlSource(db, "grp").fetch(request({ columns: ["name"] }));
    assert.deepEqual(res.data.map((r) => [r.rowid, r.name]),
      [[1, "odd"], [2, "even"]]);
  });

test("rowid: false reads a view", async () => {
  const db = people();
  const res = await sqlSource(db, { table: "big", rowid: false })
    .fetch(request({ columns: ["mname", "amount"] }));
  assert.equal(res.recordsTotal, 26);
  assert.equal("rowid" in res.data[0], false);
});

test("sorting follows the request, column by column", async () => {
  const db = people();
  const res = await sqlSource(db, "person").fetch(request({
    length: 3,
    order: [{ column: 1, dir: "desc" }, { column: 0, dir: "desc" }],
  }));
  assert.deepEqual(res.data.map((r) => [r.amount, r.mname]),
    [[90, "Person 49"], [90, "Person 39"], [90, "Person 29"]]);
});

test("a global search needs every word, in any searchable column", async () => {
  const db = people();
  const source = sqlSource(db, "person");
  const both = await source.fetch(request({ search: "person odd", length: -1 }));
  assert.equal(both.recordsTotal, 52);
  assert.equal(both.recordsFiltered, 25);
  assert.ok(both.data.every((r) => r.grp === "odd"));

  const phrase = await source.fetch(request({ search: '"fifty x"' }));
  assert.deepEqual(phrase.data.map((r) => r.mname), ["Fifty X"]);
});

test("a search for 50% means the text, not a wildcard", async () => {
  const db = sqliteDb(`create table t (v text);
    insert into t values ('50%'), ('500'), ('5_0'), ('a\\b');`);
  const source = sqlSource(db, "t");
  const pct = await source.fetch(request({ search: "50%", columns: ["v"] }));
  assert.deepEqual(pct.data.map((r) => r.v), ["50%"]);
  const under = await source.fetch(request({ search: "5_", columns: ["v"] }));
  assert.deepEqual(under.data.map((r) => r.v), ["5_0"]);
  const slash = await source.fetch(request({ search: "a\\b", columns: ["v"] }));
  assert.deepEqual(slash.data.map((r) => r.v), ["a\\b"]);
});

test("unsearchable columns are left out of the search", async () => {
  const db = people();
  const res = await sqlSource(db, "person").fetch(request({
    search: "odd",
    columns: ["mname", "amount", { data: "grp", searchable: false }],
  }));
  assert.equal(res.recordsFiltered, 0);
});

test("a search with nothing to search in matches nothing", async () => {
  const db = people();
  const res = await sqlSource(db, "person").fetch(request({
    search: "odd", columns: [{ data: null, searchable: false }],
  }));
  assert.equal(res.recordsFiltered, 0);
  assert.equal(res.data.length, 0);
});

test("a per-column search narrows that column only", async () => {
  const db = people();
  const res = await sqlSource(db, "person").fetch(request({
    length: -1,
    columns: ["mname", "amount", { data: "grp", search: { value: "pct" } }],
  }));
  assert.equal(res.recordsFiltered, 2);
});

test("where and args narrow a table, and the counts respect them", async () => {
  const db = people();
  const res = await sqlSource(db, { table: "person", where: "grp = ?", args: ["even"] })
    .fetch(request({ search: "Person 1" }));
  assert.equal(res.recordsTotal, 25);
  // 10, 12, 14, 16, 18.
  assert.equal(res.recordsFiltered, 5);
  assert.ok(db.statements.every((s) => !s.sql.includes("even")),
    "values are bound, never written into the SQL");
});

test("a query is a source: its args bind before the where's", async () => {
  const db = people();
  const source = sqlSource(db, {
    query: "select p.mname, p.amount, g.name as grp from person p" +
           " join grp g on g.name = p.grp where p.amount >= ?",
    where: "grp = ?",
    args: [80, "odd"],
  });
  const res = await source.fetch(request({ length: -1, order: [{ column: 0, dir: "asc" }] }));
  assert.equal(res.recordsTotal, 5);
  assert.deepEqual(res.data.map((r) => r.mname),
    ["Person 09", "Person 19", "Person 29", "Person 39", "Person 49"]);
  assert.equal("rowid" in res.data[0], false);
});

test("a crafted column name is refused, not written into SQL", async () => {
  const db = people();
  const source = sqlSource(db, "person");
  await assert.rejects(
    source.fetch(request({
      columns: [{ data: "mname; drop table person" }],
      order: [{ column: 0, dir: "asc" }],
    })),
    /not a usable column name/);
  await assert.rejects(
    source.fetch(request({ columns: [{ data: 'mname" or 1 --', search: { value: "x" } }] })),
    /not a usable column name/);
  // A direction that is not asc or desc is not passed through either.
  await source.fetch(request({ order: [{ column: 0, dir: "asc; drop table person" }] }));
  assert.equal(db.sqlite.prepare("select count(*) n from person").get().n, 52);
  assert.throws(() => sqlSource(db, "person; drop table person"),
    /not a usable table name/);
});

test("a source names its data, for deciding when to rebuild", () => {
  const db = people();
  assert.equal(sqlSource(db, "person").key, sqlSource(db, { table: "person" }).key);
  assert.notEqual(
    sqlSource(db, { table: "person", where: "grp = ?", args: ["a"] }).key,
    sqlSource(db, { table: "person", where: "grp = ?", args: ["b"] }).key);
  assert.throws(() => sqlSource(db, { table: "a", query: "select 1" }), /not both/);
  assert.throws(() => sqlSource(null, "person"), /open database/);
});

test("search terms split the way DataTables splits them", () => {
  assert.deepEqual(searchTerms('  one "two three"  four '), ["one", "two three", "four"]);
  assert.deepEqual(searchTerms(""), []);
  assert.equal(isColumnName("mname"), true);
  assert.equal(isColumnName("a.b"), false);
  assert.equal(isColumnName(null), false);
});

/* -------------------------------------------------------------- component */

const COLUMNS = [
  { data: "mname", title: "Name" },
  { data: "amount", title: "Amount", className: "text-end" },
];

/** Renders into a fresh box; returns it and a way to take it down. */
function mount(vnode) {
  const box = document.createElement("div");
  document.body.append(box);
  render(vnode, box);
  return {
    box,
    rows: () => [...box.querySelectorAll("tbody tr")],
    info: () => box.querySelector(".dt-info")?.textContent,
    unmount() {
      render(null, box);
      box.remove();
    },
  };
}

const rowsOf = (n) => Array.from({ length: n }, (_, i) => ({
  rowid: i + 1, mname: `Person ${String(i + 1).padStart(2, "0")}`, amount: i * 10,
}));

test("rows passed in are sorted and paged in the page", async () => {
  const t = mount(html`<${DataTable} rows=${rowsOf(25)} columns=${COLUMNS}
                          options=${{ responsive: false }} />`);
  await flush();
  assert.equal(t.rows().length, 10);
  assert.equal(t.info(), "Showing 1 to 10 of 25 entries");
  assert.ok(t.box.querySelector(".dt-container.dt-bootstrap5"),
    "Bootstrap 5 styling is the renderer");
  assert.ok(t.box.querySelector(".dt-search input.form-control"));
  t.unmount();
});

test("cell data is text, not markup", async () => {
  const rows = [{ mname: '<img src=x onerror="window.PWNED=1">', amount: "<b>1</b>" }];
  const t = mount(html`<${DataTable} rows=${rows} columns=${COLUMNS}
                          options=${{ responsive: false }} />`);
  await flush();
  assert.equal(t.box.querySelectorAll("tbody img, tbody b").length, 0);
  assert.equal(t.rows()[0].cells[0].textContent, rows[0].mname);
  t.unmount();
});

test("a column's own renderer is the author's to escape", async () => {
  const columns = [{ data: "mname", title: "Name",
                     render: (v) => `<strong>${v}</strong>` }];
  const t = mount(html`<${DataTable} rows=${[{ mname: "Ada" }]} columns=${columns}
                          options=${{ responsive: false }} />`);
  await flush();
  assert.equal(t.box.querySelector("tbody strong")?.textContent, "Ada");
  t.unmount();
});

test("new rows update the table in place", async () => {
  let setRows;
  const { useState } = await import("acelery/ui.js");
  function App() {
    const [rows, set] = useState(rowsOf(25));
    setRows = set;
    return html`<${DataTable} rows=${rows} columns=${COLUMNS}
                  options=${{ responsive: false }} />`;
  }
  const t = mount(html`<${App} />`);
  await flush();
  const table = t.box.querySelector("table");
  setRows(rowsOf(3));
  await flush();
  assert.equal(t.info(), "Showing 1 to 3 of 3 entries");
  assert.equal(t.box.querySelector("table"), table, "the same table, not a rebuild");
  t.unmount();
});

test("a row click hands over the row's data, and Enter does too", async () => {
  const opened = [];
  const t = mount(html`<${DataTable} rows=${rowsOf(3)} columns=${COLUMNS}
                          onRowClick=${(row) => opened.push(row.rowid)}
                          options=${{ responsive: false }} />`);
  await flush();
  const [first, second] = t.rows();
  assert.ok(first.classList.contains("ac-dt-link"));
  assert.equal(first.tabIndex, 0);
  assert.ok(t.box.querySelector("table.table-hover"), "clickable rows hover");
  first.cells[1].dispatchEvent(new Event("click", { bubbles: true }));
  second.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  second.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
  assert.deepEqual(opened, [1, 2]);
  t.unmount();
});

test("a SQLite source shows one page and asks for the next", async () => {
  const db = people();
  let api;
  const t = mount(html`<${DataTable} source=${sqlSource(db, "person")}
                          columns=${[...COLUMNS, { data: null, title: "",
                                                   render: () => "edit" }]}
                          onInit=${(a) => { api = a; }}
                          options=${{ responsive: false }} />`);
  await flush();
  assert.equal(t.info(), "Showing 1 to 10 of 52 entries");
  assert.equal(t.rows().length, 10);

  // A computed column is not a column in SQL, so it cannot be sorted on.
  assert.equal(api.column(2).orderable(), false);

  api.page(2).draw("page");
  await flush();
  assert.equal(t.info(), "Showing 21 to 30 of 52 entries");
  const last = db.statements.at(-1);
  assert.match(last.sql, /limit 10 offset 20$/);

  // Searched in the columns shown: grp is in the table but not in this one.
  api.search("odd").draw();
  await flush();
  assert.equal(t.info(), "Showing 0 to 0 of 0 entries (filtered from 52 total entries)");
  api.search('"person 1"').draw();
  await flush();
  assert.equal(t.info(), "Showing 1 to 10 of 10 entries (filtered from 52 total entries)");
  t.unmount();
});

test("refresh re-queries the source without rebuilding it", async () => {
  const db = people();
  let setTick;
  const { useState } = await import("acelery/ui.js");
  function App() {
    const [tick, set] = useState(0);
    setTick = set;
    // A new source object each render, as an app would write it inline.
    return html`<${DataTable} source=${sqlSource(db, "person")} refresh=${tick}
                  columns=${COLUMNS} options=${{ responsive: false }} />`;
  }
  const t = mount(html`<${App} />`);
  await flush();
  const table = t.box.querySelector("table");
  db.sqlite.exec("insert into person values ('Newcomer', 1, 'odd')");
  setTick(1);
  await flush();
  assert.equal(t.info(), "Showing 1 to 10 of 53 entries");
  assert.equal(t.box.querySelector("table"), table);
  t.unmount();
});

test("a failing source shows its error in the page, not in alert()", async () => {
  const errors = [];
  const broken = {
    key: "broken",
    fetch: async () => { throw new Error("no such table: persn"); },
  };
  const t = mount(html`<${DataTable} source=${broken} columns=${COLUMNS}
                          onError=${(e) => errors.push(e.message)}
                          options=${{ responsive: false }} />`);
  await flush();
  assert.equal(t.box.querySelector(".alert-danger")?.textContent,
    "no such table: persn");
  assert.deepEqual(errors, ["no such table: persn"]);
  assert.deepEqual(alerts, []);
  t.unmount();
});

test("unmounting takes DataTables' nodes with it", async () => {
  const t = mount(html`<${DataTable} rows=${rowsOf(5)} columns=${COLUMNS}
                          options=${{ responsive: false }} />`);
  await flush();
  const box = t.box;
  render(null, box);
  assert.equal(box.innerHTML, "");
  box.remove();
});

test("the stylesheet goes in once, and Responsive is loaded", async () => {
  const a = mount(html`<${DataTable} rows=${rowsOf(2)} columns=${COLUMNS} />`);
  const b = mount(html`<${DataTable} rows=${rowsOf(2)} columns=${COLUMNS} />`);
  await flush();
  const styles = document.querySelectorAll("#acelery-datatable-css");
  assert.equal(styles.length, 1);
  assert.match(styles[0].textContent, /table\.dataTable/);
  assert.match(styles[0].textContent, /dtr-/);
  // Responsive's own dark switch is html[data-theme=dark], which aCelery never
  // sets; the control's colour follows the theme instead.
  assert.match(styles[0].textContent,
    /--dtr-control-triangle_color: rgba\(var\(--bs-body-color-rgb\), 0\.5\)/);
  assert.equal(typeof DataTables.Responsive, "function");
  assert.equal(typeof DataTables.render.text, "function");
  a.unmount();
  b.unmount();
});
