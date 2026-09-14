/**
 * The shipped Example app, imported and rendered the way launcher.html does.
 *
 * It is the reference documentation for authors (§8 step 11), so "it still
 * runs" is a contract, not a nicety. This also catches the failure mode Phase 3
 * shipped, one level out: an author-facing name that the widget layer no longer
 * exports is silent until the app is opened on a device.
 *
 * Bare specifiers are rewritten to file URLs here, which is exactly what the
 * import map in launcher.html does at runtime.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../..");
const appDir = join(repo, "bundle/www/user/Example");
const aceleryDir = join(repo, "bundle/www/tools/js/acelery");

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  Element: dom.window.Element,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  requestAnimationFrame: (f) => setTimeout(f, 0),
  cancelAnimationFrame: (i) => clearTimeout(i),
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
});

/* Every bridge call the app makes, so the test can assert on them. */
const requests = [];
globalThis.fetch = async (url, init = {}) => {
  const parsed = new URL(url, "http://localhost");
  const body = init.body ? JSON.parse(init.body) : null;
  requests.push({ params: Object.fromEntries(parsed.searchParams), body });

  const action = parsed.searchParams.get("action");
  const payload =
    action === "opendb" ? { handle: "1" }
    : action === "query" ? { rows: [] }
    : action === "run" ? { changes: 0 }
    : action === "insertrow" ? { rowid: 1 }
    : {};
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
};

const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
};

/** Imports a user app the way the import map resolves it. */
async function importApp(file) {
  const source = readFileSync(join(appDir, file), "utf8").replace(
    /(["'])acelery\/([^"']+)\1/g,
    (_, q, rest) => `${q}${pathToFileURL(join(aceleryDir, rest)).href}${q}`,
  );
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

const manifest = JSON.parse(
  readFileSync(join(appDir, "acelery_app.json"), "utf8"),
);

test("the manifest names an entry file that exists and is importable", async () => {
  assert.ok(manifest.entry, "acelery_app.json needs an entry");
  const module = await importApp(manifest.entry);
  assert.equal(typeof module.default, "function");
});

test("every name the app imports is actually exported", async () => {
  // The Phase 3 failure, one level out: a missing export is silent until the
  // app runs on a device.
  const source = readFileSync(join(appDir, manifest.entry), "utf8");
  const imports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"acelery\/([^"]+)"/g)];
  assert.ok(imports.length, "the reference app should import by bare name");

  for (const [, names, file] of imports) {
    const module = await import(pathToFileURL(join(aceleryDir, file)).href);
    for (const raw of names.split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      assert.ok(name in module, `${name} is not exported by acelery/${file}`);
    }
  }
});

test("running it opens the database and creates its tables", async () => {
  requests.length = 0;
  const module = await importApp(manifest.entry);
  module.default();
  await flush();

  const opened = requests.find((r) => r.params.action === "opendb");
  assert.ok(opened, "the app never opened a database");
  assert.equal(opened.params.path, "xtest.db");

  const created = requests.filter((r) => /create table/.test(r.body?.sql ?? ""));
  assert.equal(created.length, 2, "person and person_tel");
  for (const r of created) {
    assert.match(r.body.sql, /if not exists/, "re-opening must not fail");
  }
});

test("it renders a navbar with every screen reachable", async () => {
  // A fresh <body>, not a cleared one: main() renders into document.body, and
  // wiping innerHTML leaves Preact's tree state pointing at removed nodes.
  document.body.replaceWith(document.createElement("body"));
  const module = await importApp(manifest.entry);
  module.default();
  await flush();

  const text = document.body.textContent;
  for (const label of ["aCelery", "Directory", "Tabs", "Widgets", "Modal", "Exit"]) {
    assert.match(text, new RegExp(label), `${label} missing from the navbar`);
  }
});

test("it does not call the Google Feed API, dead since 2016", async () => {
  const source = readFileSync(join(appDir, manifest.entry), "utf8");
  assert.ok(!/googleapis|ajax\.googleapis/.test(source));
});

test("it is written against the new API, not the 2014 globals", async () => {
  const source = readFileSync(join(appDir, manifest.entry), "utf8");
  for (const old of ["new xSQL", "new xbNavBar", "new xbTableMaint", "new xbLayout"]) {
    assert.ok(!source.includes(old), `${old} should be gone`);
  }
  assert.match(source, /export default function main/);
});
