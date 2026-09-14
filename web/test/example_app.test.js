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
import { registerHooks } from "node:module";
import { JSDOM } from "jsdom";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../..");
const appDir = join(repo, "bundle/www/user/Example");
const aceleryDir = join(repo, "bundle/www/tools/js/acelery");

/**
 * The import map, as a resolve hook.
 *
 * Rewriting specifiers in the app's own source is not enough: the modules it
 * imports import each other by bare name too — acelery/chart.js pulls preact
 * through acelery/ui.js precisely so that only one copy exists at runtime. A
 * hook resolves the whole graph the way the browser's import map does.
 */
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("acelery/")) {
      return {
        url: pathToFileURL(join(aceleryDir, specifier.slice("acelery/".length)))
          .href,
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
});

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

/** Imports a user app the way launcher.html does. */
async function importApp(file) {
  return import(pathToFileURL(join(appDir, file)).href);
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
    const module = await import(`acelery/${file}`);
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

test("the chart demo is charted from a query, not hand-built data", () => {
  // fromRows is the step between a result set and a Chart.js config that would
  // otherwise be written once per app; the reference should show it (§3.8).
  const source = readFileSync(join(appDir, manifest.entry), "utf8");
  assert.match(source, /from "acelery\/chart\.js"/);
  assert.match(source, /fromRows\(/);
  assert.match(source, /group by/i);
});

test("charts are imported separately from the widget layer", async () => {
  // Chart.js is 68 KB gzipped and most apps never draw one, so it must not
  // arrive through acelery/ui.js.
  const ui = await import("acelery/ui.js");
  assert.equal(ui.Chart, undefined, "ui.js must not re-export Chart");
  const chart = await import("acelery/chart.js");
  assert.equal(typeof chart.Chart, "function");
  assert.equal(typeof chart.fromRows, "function");
});

test("fromRows shapes a result set into Chart.js data", async () => {
  const { fromRows } = await import("acelery/chart.js");
  const rows = [
    { grp: "work", people: 3 },
    { grp: "family", people: 1 },
  ];
  assert.deepEqual(fromRows(rows, "grp", "people"), {
    labels: ["work", "family"],
    datasets: [{ label: "people", data: [3, 1] }],
  });

  // Several series from one query.
  const wide = [{ month: "Jan", in: 2, out: 5 }];
  const shaped = fromRows(wide, "month", ["in", "out"]);
  assert.equal(shaped.datasets.length, 2);
  assert.deepEqual(shaped.datasets[1], { label: "out", data: [5] });
});

test("fromRows copes with nulls rather than charting NaN", async () => {
  const { fromRows } = await import("acelery/chart.js");
  const shaped = fromRows([{ g: null, n: null }], "g", "n");
  assert.deepEqual(shaped.labels, [""]);
  assert.deepEqual(shaped.datasets[0].data, [0]);
});

test("a chart renders a canvas and cleans up after itself", async () => {
  // Canvas is not a VDOM: the instance is created against a node the component
  // owns and destroyed with it, the same arrangement the editor uses.
  const { html, render } = await import("acelery/ui.js");
  const { Chart } = await import("acelery/chart.js");

  const host = document.createElement("div");
  document.body.appendChild(host);
  render(
    html`<${Chart} type="bar"
      data=${{ labels: ["a"], datasets: [{ label: "n", data: [1] }] }} />`,
    host,
  );
  await new Promise((r) => setTimeout(r, 0));

  assert.ok(host.querySelector("canvas"), "no canvas rendered");
  render(null, host);
  assert.equal(host.querySelector("canvas"), null);
});
