/**
 * The system shell, rendered from the BUILT acelery/ide.js against a fake host.
 *
 * The regression this suite exists for: the IDE and the DB Manager opened to a
 * hamburger and an empty page (doc/shell-redesign.md §1.1). Everything else
 * here pins a property of the redesign that would fail silently — a route that
 * no longer steps out on Back, an editor that loses work on the way out, a
 * database link that creates the file it points at.
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");
const aceleryDir = join(repo, "bundle/www/tools/js/acelery");

/* The import map, as a resolve hook — same arrangement as ui.test.js. */
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

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "http://localhost:8123/system/index.html",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  Element: dom.window.Element,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  KeyboardEvent: dom.window.KeyboardEvent,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
});

/* ------------------------------------------------------------- fake host */

const STORAGE = "/storage";

/**
 * Enough of the host's file and SQL routes to drive the shell: a directory
 * tree, handles, the config table, and a couple of databases.
 */
function makeHost({
  projects = {
    Example: {
      "acelery_app.json": JSON.stringify({
        name: "Example", description: "Shows the widgets", entry: "example.js",
      }),
      "example.js": "export default function main() {}\n",
    },
  },
  databases = {
    "acelery.db": {},
    "shop.db": {
      items: {
        columns: [
          { cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 },
          { cid: 1, name: "name", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
        ],
        rows: 3,
      },
    },
  },
} = {}) {
  const files = new Map();
  const dirs = new Set([`${STORAGE}/aCelery/www/user`, `${STORAGE}/aCelery/db`]);
  for (const [name, contents] of Object.entries(projects)) {
    dirs.add(`${STORAGE}/aCelery/www/user/${name}`);
    for (const [file, text] of Object.entries(contents)) {
      files.set(`${STORAGE}/aCelery/www/user/${name}/${file}`, text);
    }
  }
  const config = new Map();
  const handles = new Map();
  const dbHandles = new Map();
  let nextHandle = 1;
  const requests = [];

  const join = (base = "", path = "") =>
    `${base}/${path}`.replace(/\/+/g, "/").replace(/\/$/, "");
  const parentOf = (p) => p.slice(0, p.lastIndexOf("/"));

  function list(dir) {
    if (dir === `${STORAGE}/aCelery/db`) {
      return Object.keys(databases).map((fname) => ({
        fname, directory: false, length: 8192, lastmodified: 1_700_000_000_000,
      }));
    }
    if (!dirs.has(dir)) return [{}];
    const out = [];
    for (const d of dirs) {
      if (parentOf(d) === dir) out.push({ fname: d.slice(dir.length + 1), directory: true });
    }
    for (const [f, text] of files) {
      if (parentOf(f) === dir) {
        out.push({
          fname: f.slice(dir.length + 1), directory: false,
          length: text.length, lastmodified: 1_700_000_000_000,
        });
      }
    }
    return out;
  }

  function sql(action, { handle, sql: statement, args = [] }) {
    const name = dbHandles.get(Number(handle));
    const db = databases[name];
    if (/^create table if not exists config/i.test(statement)) return { changes: 0 };
    if (/^select cfg_key, cfg_value from config/i.test(statement)) {
      return { rows: [...config].map(([cfg_key, cfg_value]) => ({ cfg_key, cfg_value })) };
    }
    if (/^insert into config/i.test(statement)) {
      config.set(args[0], args[1]);
      return { changes: 1 };
    }
    if (/from sqlite_master/i.test(statement)) {
      return { rows: Object.keys(db).sort().map((n) => ({ name: n })) };
    }
    const pragma = statement.match(/^PRAGMA table_info\((\w+)\)/i);
    if (pragma) return { rows: db[pragma[1]]?.columns ?? [] };
    const count = statement.match(/^select count\(\*\) as n from (\w+)/i);
    if (count) return { rows: [{ n: db[count[1]]?.rows ?? 0 }] };
    if (action === "query") return { rows: [] };
    if (action === "insertrow") return { rowid: 1 };
    return { changes: 0 };
  }

  async function fetch(url, init = {}) {
    const parsed = new URL(url, "http://localhost:8123");
    const params = Object.fromEntries(parsed.searchParams);
    const { opt, action } = params;
    const body = typeof init.body === "string" ? init.body : null;
    // Which database a handle belongs to, so a test can tell the settings
    // database's opens and closes apart from the one it is looking at.
    const db = params.handle ? dbHandles.get(Number(params.handle)) : undefined;
    requests.push({ ...params, body, db });

    let payload = {};
    let text = null;

    if (parsed.pathname.startsWith("/system/scaffold/")) {
      // Static files the shell fetches: served from the bundle, as the host does.
      const body = readFileSync(`${repo}/bundle/www${parsed.pathname}`, "utf8");
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) };
    }

    if (opt === "file") {
      switch (action) {
        case "getextpath": payload = { extpath: STORAGE }; break;
        case "listfiles": payload = list(join(params.bpath, params.path)); break;
        case "mkdir": dirs.add(join(params.bpath, params.path)); break;
        case "openfile": {
          const id = nextHandle++;
          handles.set(id, join(params.bpath, params.path));
          payload = { handle: String(id) };
          break;
        }
        case "fileread": text = files.get(handles.get(Number(params.handle))) ?? ""; break;
        case "filewrite": files.set(handles.get(Number(params.handle)), body ?? ""); break;
        case "deletefile": {
          const path = handles.get(Number(params.handle));
          files.delete(path);
          dirs.delete(path);
          for (const f of [...files.keys()]) if (f.startsWith(`${path}/`)) files.delete(f);
          break;
        }
        default: break;
      }
    } else if (opt === "sql") {
      switch (action) {
        case "opendb": {
          databases[params.path] ??= {}; // opening creates, as SQLite does
          const id = nextHandle++;
          dbHandles.set(id, params.path);
          payload = { handle: String(id) };
          break;
        }
        case "closedb": break;
        case "deletedb": delete databases[params.path]; break;
        default: payload = sql(action, JSON.parse(body));
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => text ?? JSON.stringify(payload),
    };
  }

  return { fetch, files, config, databases, requests };
}

/* --------------------------------------------------------------- harness */

const editors = [];
globalThis.aceleryEditor = {
  createEditor(parent, options) {
    let value = options.value ?? "";
    const editor = {
      options,
      destroyed: false,
      getValue: () => value,
      type(text) {
        value = text;
        options.onChange?.(text);
      },
      setTheme() {},
      destroy() { this.destroyed = true; },
    };
    editors.push(editor);
    return editor;
  },
};

const { render } = await import("acelery/ui.js");
const { default: start } = await import("acelery/ide.js");
const router = await import("../src/ide/router.js");

let root = null;

/** Mounts the shell at a route, against a fresh fake host. */
async function open(hash, hostOptions) {
  if (root) {
    render(null, root);
    root.remove();
  }
  document.body.innerHTML = "";
  const host = makeHost(hostOptions);
  globalThis.fetch = host.fetch;
  editors.length = 0;
  window.history.replaceState(null, "", `/system/index.html${hash}`);
  root = document.createElement("div");
  document.body.appendChild(root);
  start(root);
  return host;
}

async function waitFor(check, what = "condition", timeout = 3000) {
  const began = Date.now();
  for (;;) {
    let result;
    try {
      result = check();
    } catch {
      result = null;
    }
    if (result) return result;
    if (Date.now() - began > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

const text = (el) => el?.textContent.replace(/\s+/g, " ").trim() ?? "";
const buttons = (scope = document) => [...scope.querySelectorAll("button")];
const byText = (label, scope = document) =>
  buttons(scope).find((b) => text(b) === label);
const byLabel = (label, scope = document) =>
  buttons(scope).find((b) => b.getAttribute("aria-label") === label);

/* ------------------------------------------------------------------ tests */

test("the IDE opens on its projects, not on a blank page", async () => {
  await open("#/code");
  // Not just any .ac-card: the loading skeleton draws cards too.
  const card = await waitFor(
    () => [...document.querySelectorAll(".ac-card")].find((c) => /Example/.test(text(c))),
    "the Example card",
  );
  assert.match(text(card), /Shows the widgets/);
  assert.equal(text(document.querySelector("h1")), "Code");
  assert.ok(byLabel("New project"), "the primary action is on the screen, not in a menu");
});

test("the DB Manager opens on its databases, not on a blank page", async () => {
  await open("#/data");
  await waitFor(() => document.querySelectorAll(".ac-row").length === 2, "two database rows");
  const titles = [...document.querySelectorAll(".ac-row-title")].map(text);
  assert.deepEqual(titles, ["acelery.db", "shop.db"]);
  assert.ok(byLabel("New database"));
});

test("with nothing to list, Code offers the thing that fills it", async () => {
  await open("#/code", { projects: {} });
  const empty = await waitFor(() => document.querySelector(".ac-empty"), "an empty state");
  assert.match(text(empty), /No projects yet/);
  assert.ok(byText("New project", empty), "the empty state has a button");
});

test("the frame has five destinations and marks exactly one", async () => {
  await open("#/data");
  const nav = document.querySelector(".ac-bottomnav");
  const items = [...nav.querySelectorAll("a")];
  assert.deepEqual(items.map(text), ["Home", "Apps", "Code", "Data", "Settings"]);
  const current = nav.querySelectorAll('[aria-current="page"]');
  assert.equal(current.length, 1);
  assert.equal(text(current[0]), "Data");
});

test("routes encode every segment and decode them back", () => {
  assert.equal(router.href(["code", "My App", "a/b.js"]), "#/code/My%20App/a%2Fb.js");
  assert.deepEqual(router.parse("#/code/My%20App/a%2Fb.js"), {
    section: "code", parts: ["My App", "a/b.js"],
  });
  assert.deepEqual(router.parse(""), { section: "home", parts: [] });
  assert.deepEqual(router.parse("#/"), { section: "home", parts: [] });
  // A stray % is a name, not an exception.
  assert.deepEqual(router.parse("#/code/100%"), { section: "code", parts: ["100%"] });
});

test("New project builds the app from the bundle's scaffold", async () => {
  // The rules and templates are fetched from /system/scaffold/, the files the
  // MCP server's create_app reads too (doc/mcp-server.md §7, P5).
  const host = await open("#/code");
  (await waitFor(() => byLabel("New project"), "the New project button")).click();
  const name = await waitFor(() => document.querySelector('input[name="name"]'), "the name field");

  // jsdom does not submit a form from a button click, so the submit is fired.
  const submit = async (value) => {
    name.value = value;
    name.dispatchEvent(new window.Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    name.form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  };

  await submit("my app");
  await waitFor(() => /Letters, numbers and underscore/.test(text(document.body)),
    "the scaffold's name rule");

  await submit("water");
  const base = `${STORAGE}/aCelery/www/user/Water`;
  await waitFor(() => host.files.get(`${base}/main.js`), "the entry module");

  assert.deepEqual(JSON.parse(host.files.get(`${base}/acelery_app.json`)), {
    name: "Water", description: "", entry: "main.js",
  });
  const template = readFileSync(join(repo, "bundle/www/system/scaffold/main.js.template"), "utf8");
  assert.equal(host.files.get(`${base}/main.js`), template.replaceAll("{{name}}", "Water"));
  await waitFor(() => window.location.hash === "#/code/Water/main.js", "the new entry module");
});

test("opening a project pushes history, and Back steps out one level", async () => {
  await open("#/code");
  const card = await waitFor(() => byLabel("Open Example"), "the Open Example button");
  card.click();
  await waitFor(() => window.location.hash === "#/code/Example", "the project route");
  assert.equal(window.history.state?.from, "#/code");

  await waitFor(() => document.querySelector(".ac-row-title"), "the file list");
  byLabel("Back").click();
  await waitFor(() => window.location.hash === "#/code", "Back to the projects");
  await waitFor(() => document.querySelector(".ac-card"), "the projects again");
});

test("a deep link's back arrow goes up without leaving a dead entry", async () => {
  await open("#/code/Example/example.js");
  await waitFor(() => editors.length === 1, "the editor");
  const before = window.history.length;
  byLabel("Back").click();
  await waitFor(() => window.location.hash === "#/code/Example", "the parent route");
  assert.equal(window.history.length, before, "replaced, not pushed");
});

test("opening a file records it for Home's Continue card", async () => {
  const host = await open("#/code/Example/example.js");
  await waitFor(() => host.config.get("recent.file") === "example.js", "recent.file");
  assert.equal(host.config.get("recent.project"), "Example");
});

test("leaving unsaved work asks first, and Save writes before leaving", async () => {
  const host = await open("#/code/Example/example.js");
  const editor = await waitFor(() => editors[0], "the editor");
  editor.type("export default function main() { /* edited */ }\n");
  await waitFor(() => document.querySelector(".ac-dirty"), "the dirty dot");

  document.querySelector('.ac-bottomnav a[href="#/"]').click();
  const modal = await waitFor(() => document.querySelector(".modal"), "the unsaved-changes dialog");
  assert.match(text(modal), /Unsaved changes/);
  assert.equal(window.location.hash, "#/code/Example/example.js", "not left yet");

  byText("Save", modal).click();
  await waitFor(() => window.location.hash === "#/", "Home");
  assert.match(host.files.get(`${STORAGE}/aCelery/www/user/Example/example.js`), /edited/);
});

test("dismissing the unsaved-changes dialog stays put and keeps the edits", async () => {
  const host = await open("#/code/Example/example.js");
  const editor = await waitFor(() => editors[0], "the editor");
  editor.type("changed\n");
  await waitFor(() => document.querySelector(".ac-dirty"), "the dirty dot");

  document.querySelector('.ac-bottomnav a[href="#/data"]').click();
  const modal = await waitFor(() => document.querySelector(".modal"), "the dialog");
  byLabel("Close", modal).click();
  await new Promise((r) => setTimeout(r, 50));

  assert.equal(window.location.hash, "#/code/Example/example.js");
  assert.ok(document.querySelector(".ac-dirty"), "still dirty");
  assert.doesNotMatch(host.files.get(`${STORAGE}/aCelery/www/user/Example/example.js`), /changed/);
});

test("host Back is not asked, so the buffer is saved on the way out", async () => {
  const host = await open("#/code/Example");
  (await waitFor(() => byText("example.js"), "the example.js row")).click();
  const editor = await waitFor(() => editors[0], "the editor");
  editor.type("typed before Back\n");

  window.history.back(); // what the host's goBack() does
  await waitFor(() => window.location.hash === "#/code/Example", "the project route");
  await waitFor(
    () => /typed before Back/.test(host.files.get(`${STORAGE}/aCelery/www/user/Example/example.js`)),
    "the buffer to be written",
  );
  assert.ok(editor.destroyed);
});

test("forceSaveFile flushes a dirty buffer, as the host expects", async () => {
  const host = await open("#/code/Example/example.js");
  const editor = await waitFor(() => editors[0], "the editor");
  assert.equal(typeof globalThis.forceSaveFile, "function");
  editor.type("paused mid-edit\n");
  globalThis.forceSaveFile();
  await waitFor(
    () => /paused mid-edit/.test(host.files.get(`${STORAGE}/aCelery/www/user/Example/example.js`)),
    "the write",
  );
});

test("a link to a database that does not exist does not create it", async () => {
  const host = await open("#/data/nope.db");
  await waitFor(() => /Database not found/.test(text(document.body)), "not found");
  assert.ok(!host.requests.some((r) => r.action === "opendb" && r.path === "nope.db"));
  assert.ok(!("nope.db" in host.databases));
});

test("moving between a database's tabs keeps one handle open", async () => {
  const host = await open("#/data/shop.db");
  await waitFor(() => /3 rows/.test(text(document.body)), "the table row counts");

  byText("SQL").click();
  await waitFor(() => window.location.hash === "#/data/shop.db/sql", "the SQL tab");
  await waitFor(() => document.querySelector("#ac-sql-input"), "the SQL input");
  byText("Tables").click();
  await waitFor(() => window.location.hash === "#/data/shop.db", "the Tables tab");

  const opens = host.requests.filter((r) => r.action === "opendb" && r.path === "shop.db");
  assert.equal(opens.length, 1);
  assert.ok(
    !host.requests.some((r) => r.action === "closedb" && r.db === "shop.db"),
    "not closed in between",
  );
});

test("a table opens straight away, with no column-chooser step", async () => {
  await open("#/data/shop.db");
  (await waitFor(() => byText("items"), "the items row")).click();
  await waitFor(() => window.location.hash === "#/data/shop.db/table/items", "the table route");
  await waitFor(() => document.querySelector(".card table"), "TableMaint's list");
  assert.ok(byLabel("Choose columns"), "columns are a menu, not a screen");
});

test("Settings shows device rows only when there is a host to act on them", async () => {
  delete globalThis.ACeleryHost;
  await open("#/settings");
  await waitFor(() => /Appearance/.test(text(document.body)), "Settings");
  assert.doesNotMatch(text(document.body), /Network access/);

  const posted = [];
  globalThis.ACeleryHost = { postMessage: (m) => posted.push(JSON.parse(m)) };
  try {
    await open("#/settings");
    (await waitFor(() => byText("Network access"), "the Network access row")).click();
    assert.ok(posted.some((m) => m.action === "showNetworkAccess"));

    document.querySelector("#settings-awake").click();
    assert.ok(posted.some((m) => m.action === "setKeepAwake" && m.on === true));
  } finally {
    delete globalThis.ACeleryHost;
  }
});

test("Add to home screen is offered only by the Android app", async () => {
  /* The menu item is read at render, so each case mounts afresh. */
  async function actionsFor(userAgent, host) {
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent }, configurable: true, writable: true,
    });
    if (host) globalThis.ACeleryHost = host;
    else delete globalThis.ACeleryHost;
    await open("#/apps");
    (await waitFor(() => byLabel("Actions for Example"), "the Example menu")).click();
    await waitFor(() => byText("Export"), "the open menu");
  }

  const saved = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const android = "Mozilla/5.0 (Linux; Android 16; Pixel 9a; wv) AppleWebKit/537.36";
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
  const posted = [];
  const host = { postMessage: (m) => posted.push(JSON.parse(m)) };
  try {
    await actionsFor(android, null);
    assert.equal(byText("Add to home screen"), undefined, "a browser on the network has no home screen to pin to");

    await actionsFor(iphone, host);
    assert.equal(byText("Add to home screen"), undefined, "iOS cannot pin shortcuts");

    await actionsFor(android, host);
    byText("Add to home screen").click();
    await waitFor(() => posted.some((m) => m.action === "addShortcut"), "the host message");
    assert.deepEqual(posted.find((m) => m.action === "addShortcut"), { action: "addShortcut", app: "Example" });
  } finally {
    delete globalThis.ACeleryHost;
    if (saved) Object.defineProperty(globalThis, "navigator", saved);
    else delete globalThis.navigator;
  }
});

test("choosing a mode applies it and saves it", async () => {
  const host = await open("#/settings");
  const dark = await waitFor(
    () => buttons().find((b) => b.getAttribute("role") === "radio" && text(b) === "Dark"),
    "the Dark option",
  );
  dark.click();
  await waitFor(() => host.config.get("theme.mode") === "dark", "the saved mode");
  assert.equal(document.documentElement.getAttribute("data-bs-theme"), "dark");
});

test("the host's old ?opt=apps address lands on Apps", async () => {
  if (root) {
    render(null, root);
    root.remove();
  }
  const host = makeHost();
  globalThis.fetch = host.fetch;
  window.history.replaceState(null, "", "/system/index.html?opt=apps");
  root = document.createElement("div");
  document.body.appendChild(root);
  start(root);
  await waitFor(() => window.location.hash === "#/apps", "the Apps route");
  await waitFor(() => text(document.querySelector("h1")) === "Apps", "the Apps title");
});
