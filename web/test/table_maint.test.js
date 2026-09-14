/**
 * TableMaint, against a stub database that behaves like the bridge.
 *
 * These pin *behaviour* — which SQL goes out, with which bound arguments, and
 * what each view offers — rather than markup, because the markup is
 * react-bootstrap's and the behaviour is the product (§3.5).
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

const ui = await import("../../bundle/www/tools/js/acelery/ui.js");
const { html, render, TableMaint } = ui;

/**
 * Lets the component settle.
 *
 * One tick is not enough: a click sets state, the re-render schedules an
 * effect, and the effect starts an async query whose result is another state
 * change. Three ticks covers click -> effect -> query -> render.
 */
const flush = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
};

/** Records every statement and answers selects from a fixed row list. */
function stubDb(rows = []) {
  const calls = [];
  let nextRowid = rows.length + 1;
  return {
    calls,
    rows,
    async select(sql, args = []) {
      calls.push({ op: "select", sql, args });
      return rows;
    },
    async selectOne(sql, args = []) {
      calls.push({ op: "selectOne", sql, args });
      return rows[0] ?? null;
    },
    async exec(sql, args = []) {
      calls.push({ op: "exec", sql, args });
      return 1;
    },
    async insert(sql, args = []) {
      calls.push({ op: "insert", sql, args });
      return nextRowid++;
    },
    last(op) {
      return [...calls].reverse().find((c) => c.op === op);
    },
  };
}

/** Sets a control's value the way a browser would, so preact/compat sees it. */
function type(host, selector, value) {
  const el = host.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  if (el.type === "checkbox") el.checked = value;
  else el.value = value;
  for (const kind of ["input", "change"]) {
    el.dispatchEvent(new dom.window.Event(kind, { bubbles: true }));
  }
  return flush();
}

const FIELDS = [
  { type: "string", title: "Name", name: "mname" },
  { type: "email", title: "Email", name: "email" },
  { type: "number", title: "Age", name: "age" },
];

const PEOPLE = [
  { rowid: 1, mname: "Ada", email: "ada@example.com", age: 36 },
  { rowid: 2, mname: "Grace", email: "grace@example.com", age: 45 },
];

async function mount(vnode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(vnode, host);
  await flush();
  await flush();
  return host;
}

/** Clicks the first element whose text matches. */
function click(host, text) {
  const target = [...host.querySelectorAll("button, a")].find(
    (el) => el.textContent.trim() === text,
  );
  assert.ok(target, `no clickable "${text}" (have: ${
    [...host.querySelectorAll("button")].map((b) => b.textContent.trim()).join(", ")
  })`);
  // A MouseEvent, not a bare Event: jsdom only runs a submit button's default
  // activation behaviour for one, so a plain click never submits the form.
  target.dispatchEvent(
    new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
  return flush();
}

test("the list view selects with bound arguments, never concatenation", async () => {
  const db = stubDb(PEOPLE);
  await mount(html`<${TableMaint} db=${db} title="Directory" table="person"
                                  fields=${FIELDS} />`);

  const select = db.last("select");
  assert.match(select.sql, /select rowid, \* from person/);
  assert.match(select.sql, /rowid >= \?/);
  assert.deepEqual(select.args, [0]);
  // The whole point of §3.3: no value is ever spliced into the statement.
  assert.ok(!/'/.test(select.sql), select.sql);
});

test("the list renders a row per record, keyed by rowid", async () => {
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  const bodyRows = host.querySelectorAll("tbody tr");
  assert.equal(bodyRows.length, 2);
  assert.match(host.textContent, /Ada/);
  assert.match(host.textContent, /grace@example\.com/);
});

test("the list offers the buttons xbTableMaint offered", async () => {
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  const labels = [...host.querySelectorAll("button")].map((b) => b.textContent.trim());
  for (const l of ["New", "First", "Prev.", "Next", "Last", "Search"]) {
    assert.ok(labels.includes(l), `${l} missing from ${labels.join(", ")}`);
  }
});

test("an empty table says so rather than showing a bare header", async () => {
  const db = stubDb([]);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  assert.match(host.textContent, /No records yet/);
});

test("opening a record fetches it by bound rowid", async () => {
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "1");

  const one = db.last("selectOne");
  assert.match(one.sql, /where rowid = \?/);
  assert.deepEqual(one.args, [1]);
  assert.match(host.textContent, /Directory - Record/);
  // Edit / Delete / Ok, as xbTableMaint.show offered.
  const labels = [...host.querySelectorAll("button")].map((b) => b.textContent.trim());
  assert.deepEqual(labels.filter((l) => ["Edit", "Delete", "Ok"].includes(l)).sort(),
    ["Delete", "Edit", "Ok"]);
});

test("saving an edit updates with placeholders and the rowid last", async () => {
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "1");
  await click(host, "Edit");

  assert.equal(host.querySelector("input[name=mname]").value, "Ada");
  await type(host, "input[name=mname]", "Ada L");

  await click(host, "Save");

  const update = db.last("exec");
  assert.match(update.sql, /^update person set /);
  assert.match(update.sql, /mname = \?/);
  assert.match(update.sql, /where rowid = \?$/);
  assert.equal(update.args[0], "Ada L");
  assert.equal(update.args[update.args.length - 1], 1);
});

test("a new record inserts with one placeholder per column", async () => {
  const db = stubDb([]);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "New");

  await type(host, "input[name=mname]", "Alan");

  await click(host, "Save");

  const insert = db.last("insert");
  assert.match(insert.sql, /^insert into person \(mname, email, age\)/);
  assert.match(insert.sql, /values \(\?, \?, \?\)$/);
  assert.equal(insert.args[0], "Alan");
});

test("a number column binds a number, and an empty one binds null", async () => {
  const db = stubDb([]);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "New");

  await type(host, "input[name=age]", "41");
  await click(host, "Save");

  const insert = db.last("insert");
  assert.equal(insert.args[2], 41);
  assert.equal(insert.args[1], "", "an untouched text column stays a string");
});

test("a validator blocks the save and says why", async () => {
  const db = stubDb([]);
  const fields = [
    { type: "string", title: "Name", name: "mname", validate: [ui.notEmpty("Name required")] },
  ];
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${fields} />`);
  await click(host, "New");
  await click(host, "Save");

  assert.equal(db.last("insert"), undefined);
  assert.match(host.textContent, /Name required/);
});

test("search builds a parameterised WHERE, prefix-matching text", async () => {
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "Search");

  await type(host, "#mname_x", true);
  await type(host, "#mname_s1", "Ad");

  await click(host, "Search");

  const select = db.last("select");
  assert.match(select.sql, /\(mname like \?\)/);
  assert.ok(select.args.includes("Ad%"), JSON.stringify(select.args));
});

test("a numeric range search binds both ends — the case that never worked", async () => {
  // xbTableMaint.findResult interpolated `fld.getName` — the function object,
  // not its result — into both range branches, so this produced SQL like
  // "age >= 30 and function (){...} <= 50".
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "Search");

  await type(host, "#age_x", true);
  await type(host, "#age_s1", "30");
  await type(host, "#age_s2", "50");

  await click(host, "Search");

  const select = db.last("select");
  assert.match(select.sql, /\(age >= \? and age <= \?\)/);
  assert.ok(select.args.includes(30), JSON.stringify(select.args));
  assert.ok(select.args.includes(50), JSON.stringify(select.args));
  assert.ok(!/function/.test(select.sql), select.sql);
});

test("a search can be cleared", async () => {
  const db = stubDb(PEOPLE);
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  await click(host, "Search");
  await type(host, "#mname_x", true);
  await type(host, "#mname_s1", "Ad");
  await click(host, "Search");

  const labels = [...host.querySelectorAll("button")].map((b) => b.textContent.trim());
  assert.ok(labels.includes("Clear Search"));
  await click(host, "Clear Search");
  assert.ok(!/mname like/.test(db.last("select").sql));
});

test("money formats as xScript's formatMoney did", async () => {
  const db = stubDb([{ rowid: 1, cost: 1234567.891 }]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Costs" table="cost"
      fields=${[{ type: "money", title: "Cost", name: "cost" }]} />`);
  assert.match(host.textContent, /1,234,567\.89/);
});

test("money right-aligns and text does not", async () => {
  const db = stubDb([{ rowid: 1, cost: 10, note: "x" }]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Costs" table="cost"
      fields=${[
        { type: "money", title: "Cost", name: "cost" },
        { type: "string", title: "Note", name: "note" },
      ]} />`);
  const cells = [...host.querySelectorAll("tbody td")];
  assert.ok(cells.some((c) => c.className.includes("text-end")));
  assert.ok(cells.some((c) => c.className.includes("text-start")));
});

test("a checkbox column stores its on/off values, not true/false", async () => {
  const db = stubDb([]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Tasks" table="task"
      fields=${[{ type: "checkbox", title: "Done", name: "done", onValue: "Y", offValue: "N" }]} />`);
  await click(host, "New");

  await type(host, "input[type=checkbox][name=done]", true);
  await click(host, "Save");

  assert.deepEqual(db.last("insert").args, ["Y"]);
});

test("inList and inSearch are honoured", async () => {
  const db = stubDb(PEOPLE);
  const fields = [
    { type: "string", title: "Name", name: "mname" },
    { type: "string", title: "Secret", name: "secret", inList: false, inSearch: false },
  ];
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${fields} />`);
  const headers = [...host.querySelectorAll("thead th")].map((h) => h.textContent.trim());
  assert.ok(headers.includes("Name"));
  assert.ok(!headers.includes("Secret"));

  await click(host, "Search");
  assert.equal(host.querySelector("#secret_x"), null);
  assert.ok(host.querySelector("#mname_x"));
});

test("a date field uses the platform picker, not a vendored one", async () => {
  // §3.9: native <input type=date> renders the OS picker — bigger touch
  // targets, correct locale, free accessibility, 136 KB lighter.
  const db = stubDb([]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Events" table="event"
      fields=${[{ type: "date", title: "When", name: "when" }]} />`);
  await click(host, "New");
  assert.equal(host.querySelector("input[name=when]").type, "date");
});

test("slave mode filters by its link column and hides it", async () => {
  const db = stubDb([{ rowid: 9, person: 1, number: "555" }]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Phones" table="phone"
      fields=${[
        { type: "number", title: "Person", name: "person" },
        { type: "string", title: "Number", name: "number" },
      ]}
      linkField="person" linkId=${1} />`);

  const select = db.last("select");
  assert.match(select.sql, /person = \?/);
  assert.ok(select.args.includes(1));

  const headers = [...host.querySelectorAll("thead th")].map((h) => h.textContent.trim());
  assert.ok(headers.includes("Number"));
  assert.ok(!headers.includes("Person"), "the link column is implied, not shown");
  assert.ok(headers.includes("Details"), "slave rows open with a Details button");
});

test("slave mode drops the pagination buttons but keeps New", async () => {
  const db = stubDb([]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Phones" table="phone"
      fields=${[{ type: "string", title: "Number", name: "number" }]}
      linkField="person" linkId=${1} />`);
  const labels = [...host.querySelectorAll("button")].map((b) => b.textContent.trim());
  assert.ok(labels.includes("New"));
  for (const l of ["First", "Prev.", "Next", "Last", "Search"]) {
    assert.ok(!labels.includes(l), `${l} should not appear in slave mode`);
  }
});

test("a slave insert fills in the link column itself", async () => {
  const db = stubDb([]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Phones" table="phone"
      fields=${[
        { type: "number", title: "Person", name: "person" },
        { type: "string", title: "Number", name: "number" },
      ]}
      linkField="person" linkId=${7} />`);
  await click(host, "New");

  await type(host, "input[name=number]", "555");
  await click(host, "Save");

  const insert = db.last("insert");
  assert.match(insert.sql, /person/);
  assert.ok(insert.args.includes(7), JSON.stringify(insert.args));
});

test("every pre/post hook fires, in order, with the row id", async () => {
  const db = stubDb(PEOPLE);
  const seen = [];
  const host = await mount(html`
    <${TableMaint} db=${db} title="Directory" table="person" fields=${FIELDS}
      preNew=${() => seen.push("preNew")}
      postNew=${(id) => seen.push(`postNew:${id}`)}
      preEdit=${(id) => seen.push(`preEdit:${id}`)}
      postEdit=${(id) => seen.push(`postEdit:${id}`)} />`);

  await click(host, "1");
  await click(host, "Edit");
  await click(host, "Save");
  assert.deepEqual(seen, ["preEdit:1", "postEdit:1"]);
});

test("validateForm can veto a save", async () => {
  const db = stubDb([]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Directory" table="person" fields=${FIELDS}
      validateForm=${() => false} />`);
  await click(host, "New");
  await click(host, "Save");
  assert.equal(db.last("insert"), undefined);
});

test("specialActions adds a dropdown to the record view", async () => {
  const db = stubDb(PEOPLE);
  let acted = null;
  const host = await mount(html`
    <${TableMaint} db=${db} title="Directory" table="person" fields=${FIELDS}
      specialActions=${(id) => [{ label: "Export", bind: () => (acted = id) }]} />`);
  await click(host, "1");
  assert.match(host.textContent, /Special/);
  await click(host, "Special");
  await click(host, "Export");
  assert.equal(acted, 1);
});

test("a database error is shown, not swallowed", async () => {
  // The cursor API returned -1 and carried on. An app author needs the message.
  const db = {
    async select() { throw new Error("no such table: person"); },
    async selectOne() { throw new Error("no such table: person"); },
    async exec() {}, async insert() { return 1; },
  };
  const host = await mount(html`<${TableMaint} db=${db} title="Directory"
                                               table="person" fields=${FIELDS} />`);
  assert.match(host.textContent, /no such table: person/);
});

test("a column name that is not an identifier is refused", async () => {
  // Identifiers cannot be bound, so they are the one thing that must be checked
  // rather than parameterised.
  const db = stubDb([]);
  const host = await mount(html`
    <${TableMaint} db=${db} title="Bad" table="person; drop table person"
      fields=${FIELDS} />`);
  assert.match(host.textContent, /not a usable column or table name/);
});
