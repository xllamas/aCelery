/**
 * bundle/www/system/js/capture.js: what a running app says reaches the host
 * (doc/mcp-server.md §7 P3, §9 "Console").
 *
 * Each test loads the script into a fresh jsdom window with a fake host
 * channel, as launcher.html loads it before anything else.
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(join(repo, "bundle/www/system/js/capture.js"), "utf8");

/**
 * A page with capture.js loaded. `posted` is what reached the host, and
 * `logged` what reached the page's own console, which is kept out of the test
 * output.
 */
function page({ host = true } = {}) {
  const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only" });
  const { window } = dom;
  const posted = [];
  const logged = [];
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    window.console[level] = (...args) => logged.push([level, ...args]);
  }
  if (host) window.ACeleryHost = { postMessage: (m) => posted.push(JSON.parse(m)) };
  window.eval(source);
  return { window, posted, logged };
}

test("console calls are forwarded with their level, and still reach the console", () => {
  const { window, posted, logged } = page();
  window.console.warn("disk at", 91, "%", { free: "2 GB" });
  window.console.debug(undefined, null, true);
  assert.deepEqual(posted[0], {
    action: "console", level: "warn",
    text: 'disk at 91 % {\n  "free": "2 GB"\n}',
  });
  assert.equal(posted[1].text, "undefined null true");
  assert.deepEqual(logged[0], ["warn", "disk at", 91, "%", { free: "2 GB" }]);
  assert.equal(logged.length, 2);
});

test("an Error logged carries its stack", () => {
  const { window, posted } = page();
  window.eval("console.error('save failed:', new TypeError('db is null'))");
  const [entry] = posted;
  assert.equal(entry.level, "error");
  assert.equal(entry.text, "save failed: TypeError: db is null");
  assert.match(entry.stack, /TypeError: db is null/);
});

test("an uncaught error is reported with where it happened", () => {
  const { window, posted } = page();
  const error = new window.Error("boom");
  window.dispatchEvent(new window.ErrorEvent("error", {
    error, message: "Uncaught Error: boom",
    filename: "http://localhost:8123/user/Demo/main.js", lineno: 12, colno: 5,
  }));
  assert.equal(posted[0].text, "Uncaught Error: boom");
  assert.equal(posted[0].source, "http://localhost:8123/user/Demo/main.js:12:5");
  assert.match(posted[0].stack, /boom/);
});

test("an image that fails to load is reported, though its error does not bubble", () => {
  const { window, posted } = page();
  const img = window.document.createElement("img");
  img.src = "/user/Demo/missing.png";
  window.document.body.appendChild(img);
  img.dispatchEvent(new window.Event("error"));
  assert.equal(posted[0].level, "error");
  assert.match(posted[0].text, /^Could not load <img> .*\/user\/Demo\/missing\.png$/);
});

test("an unhandled rejection is reported", () => {
  const { window, posted } = page();
  const event = new window.Event("unhandledrejection");
  event.reason = new window.RangeError("page -1");
  window.dispatchEvent(event);
  const plain = new window.Event("unhandledrejection");
  plain.reason = { code: 404 };
  window.dispatchEvent(plain);
  assert.equal(posted[0].text, "Unhandled rejection: RangeError: page -1");
  assert.ok(posted[0].stack);
  assert.equal(posted[1].text, 'Unhandled rejection: {\n  "code": 404\n}');
});

test("values that JSON cannot hold are still described", () => {
  const { window } = page();
  const describe = window.__aCeleryCapture.describe;
  const loop = { name: "a" };
  loop.self = loop;
  assert.equal(describe(loop), '{\n  "name": "a",\n  "self": "[Circular]"\n}');
  assert.equal(describe(window.eval("10n")), "10");
  assert.equal(describe(function save() {}), "function save()");
  const p = window.document.createElement("p");
  p.textContent = "hi";
  assert.equal(describe(p), "<p>hi</p>");
  assert.equal(describe("x".repeat(50), 10), "xxxxxxxxxx… (50 characters)");
});

test("a page logging in a loop is cut off, and the gap is counted", async () => {
  const { window, posted } = page();
  window.eval("for (let i = 0; i < 250; i++) console.log(i)");
  assert.equal(posted.length, 200);
  await new Promise((r) => setTimeout(r, 1100));
  assert.deepEqual(posted.at(-1), { action: "consoleDropped", count: 50 });
});

test("the launcher's start and failure reach the host", () => {
  const { window, posted } = page();
  window.__aCeleryCapture.started();
  window.__aCeleryCapture.failed("main.js failed to load", "SyntaxError: x at 3:1");
  assert.deepEqual(posted, [
    { action: "appStarted" },
    { action: "appFailed", title: "main.js failed to load", detail: "SyntaxError: x at 3:1" },
  ]);
});

test("in a browser on the network there is no host, and nothing breaks", () => {
  const { window } = page({ host: false });
  window.eval("console.error(new Error('x')); __aCeleryCapture.started()");
});

test("launcher.html loads it before any other script", () => {
  const html = readFileSync(join(repo, "bundle/www/system/launcher.html"), "utf8");
  const first = html.match(/<script\b[^>]*>/)[0];
  assert.match(first, /src="\/system\/js\/capture\.js"/);
  assert.match(html, /__aCeleryCapture\?\.started\(\)/);
  assert.match(html, /__aCeleryCapture\?\.failed\(title, detail\)/);
});
