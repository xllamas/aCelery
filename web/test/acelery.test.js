/**
 * Unit tests for the capability modules, against a stubbed fetch.
 *
 * What these pin is the wire contract — route names, parameter names, body
 * shape — because that is the seam that broke during Phase 3: a class-level
 * check passed while a method-level mismatch shipped. The Dart side of the same
 * seam is pinned by test/bridge_test.dart, and test/bundle_migration_test.dart
 * cross-references the two.
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";

import * as sql from "../src/acelery/sql.js";
import * as file from "../src/acelery/file.js";
import * as http from "../src/acelery/http.js";
import { BridgeError } from "../src/acelery/bridge.js";

/** Installs a fetch stub; returns the log of calls it recorded. */
function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(url, "http://localhost");
    const call = {
      path: parsed.pathname,
      params: Object.fromEntries(parsed.searchParams),
      method: init.method ?? "GET",
      body: init.body,
    };
    calls.push(call);
    const result = await responder(call);
    return {
      ok: result.status === undefined || result.status < 400,
      status: result.status ?? 200,
      json: async () => result.json,
      text: async () => result.text ?? JSON.stringify(result.json),
    };
  };
  return calls;
}

test("openDB asks for a handle and keeps it", async () => {
  const calls = stubFetch(() => ({ json: { handle: "3" } }));
  const db = await sql.openDB("xtest.db");

  assert.equal(calls[0].path, "/android.itf");
  assert.deepEqual(calls[0].params, {
    opt: "sql",
    action: "opendb",
    path: "xtest.db",
  });
  assert.equal(db.handle, 3);
});

test("openDB passes a base path through when given one", async () => {
  const calls = stubFetch(() => ({ json: { handle: "1" } }));
  await sql.openDB("xtest.db", "/somewhere");
  assert.equal(calls[0].params.bpath, "/somewhere");
});

test("select posts sql and args as a JSON body", async () => {
  const calls = stubFetch(() => ({ json: { rows: [{ mname: "Ada" }] } }));
  const db = new sql.Database(1);
  const rows = await db.select("select * from person where grp = ?", ["a"]);

  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].params.action, "query");
  assert.deepEqual(JSON.parse(calls[0].body), {
    handle: 1,
    sql: "select * from person where grp = ?",
    args: ["a"],
  });
  assert.deepEqual(rows, [{ mname: "Ada" }]);
});

test("select defaults args to the empty list", async () => {
  const calls = stubFetch(() => ({ json: { rows: [] } }));
  await new sql.Database(1).select("select 1");
  assert.deepEqual(JSON.parse(calls[0].body).args, []);
});

test("selectOne yields the first row, or null", async () => {
  stubFetch(() => ({ json: { rows: [{ v: 1 }, { v: 2 }] } }));
  assert.deepEqual(await new sql.Database(1).selectOne("select v from t"), {
    v: 1,
  });

  stubFetch(() => ({ json: { rows: [] } }));
  assert.equal(await new sql.Database(1).selectOne("select v from t"), null);
});

test("exec and insert use their own routes", async () => {
  const calls = stubFetch((c) =>
    c.params.action === "run" ? { json: { changes: 2 } } : { json: { rowid: 9 } },
  );
  const db = new sql.Database(1);

  assert.equal(await db.exec("update t set v = 1"), 2);
  assert.equal(calls[0].params.action, "run");

  assert.equal(await db.insert("insert into t values (?)", [1]), 9);
  assert.equal(calls[1].params.action, "insertrow");
});

test("a closed database refuses further work", async () => {
  stubFetch(() => ({ json: {} }));
  const db = new sql.Database(1);
  await db.close();
  await assert.rejects(() => db.select("select 1"), /closed/);
});

test("closing twice makes one call", async () => {
  const calls = stubFetch(() => ({ json: {} }));
  const db = new sql.Database(1);
  await db.close();
  await db.close();
  assert.equal(calls.length, 1);
});

test("a host error surfaces its message, not an empty result", async () => {
  stubFetch(() => ({ status: 500, json: { error: "no such table: nope" } }));
  await assert.rejects(
    () => new sql.Database(1).select("select * from nope"),
    (e) => {
      assert.ok(e instanceof BridgeError);
      assert.match(e.message, /no such table: nope/);
      assert.equal(e.status, 500);
      return true;
    },
  );
});

test("an error with no JSON body still throws something readable", async () => {
  stubFetch(() => ({ status: 400, text: "" }));
  await assert.rejects(() => new sql.Database(1).select("select 1"), /400/);
});

test("file.writeBytes posts the bytes as they are, and url names the raw route", async () => {
  const calls = stubFetch(() => ({ json: { size: 3 } }));
  const bytes = new Uint8Array([0, 255, 128]);

  assert.equal(await file.writeBytes("Garden/rose 1.jpg", bytes), 3);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].params, {
    opt: "file", action: "upload", path: "Garden/rose 1.jpg",
  });
  assert.equal(calls[0].body, bytes, "not stringified or re-encoded");

  await file.writeBytes("icon.png", bytes, "/root/aCelery/www/user/");
  assert.equal(calls[1].params.bpath, "/root/aCelery/www/user/");

  const address = new URL(file.url("Garden/rose 1.jpg"), "http://phone");
  assert.equal(address.pathname, "/android.itf");
  assert.deepEqual(Object.fromEntries(address.searchParams), {
    opt: "file", action: "raw", path: "Garden/rose 1.jpg",
  });
});

test("a refused upload throws with the host's message", async () => {
  stubFetch(() => ({ status: 413, text: JSON.stringify({ error: "The file is larger than 25 MB" }) }));
  await assert.rejects(file.writeBytes("big.bin", new Uint8Array(1)), {
    name: "BridgeError", message: "The file is larger than 25 MB",
  });
});

test("file open, write, read and close hit their routes", async () => {
  const calls = stubFetch((c) =>
    c.params.action === "fileread"
      ? { text: "contents" }
      : { json: { handle: "5" } },
  );

  const f = await file.open("notes.txt");
  assert.equal(f.handle, 5);
  assert.equal(calls[0].params.action, "openfile");

  await f.write("hello", true);
  assert.equal(calls[1].params.action, "filewrite");
  assert.equal(calls[1].params.append, "true");
  assert.equal(calls[1].body, "hello");

  assert.equal(await f.read(), "contents");
  assert.equal(calls[2].params.action, "fileread");

  await f.close();
  assert.equal(calls[3].params.action, "closefile");
});

test("write defaults to truncating", async () => {
  const calls = stubFetch(() => ({ json: {} }));
  await new file.FileHandle(1).write("x");
  assert.equal(calls[0].params.append, "false");
});

test("listFiles normalises the host's not-a-directory marker", async () => {
  stubFetch(() => ({ json: [{}] }));
  assert.deepEqual(await file.listFiles("/nope"), []);

  stubFetch(() => ({ json: [{ fname: "a.js", directory: false }] }));
  assert.deepEqual(await file.listFiles("/user"), [
    { fname: "a.js", directory: false },
  ]);
});

test("the http proxy passes the url through untouched", async () => {
  const calls = stubFetch(() => ({ text: "{}" }));
  await http.get("https://example.com/a?b=c&d=e");
  assert.equal(calls[0].params.url, "https://example.com/a?b=c&d=e");
  assert.equal(calls[0].params.action, "get");

  await http.post("https://example.com/", "a=1");
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[1].body, "a=1");
});

test("every bridge call opts out of the http cache", async () => {
  let seen;
  globalThis.fetch = async (_url, init) => {
    seen = init;
    return { ok: true, json: async () => ({ rows: [] }), text: async () => "" };
  };
  await new sql.Database(1).select("select 1");
  assert.equal(seen.cache, "no-store");
});

/* ------------------------------------------------------- the host actions */

/** Installs a fake host channel and returns what it was sent. */
function stubHost() {
  const sent = [];
  globalThis.ACeleryHost = { postMessage: (m) => sent.push(JSON.parse(m)) };
  return sent;
}

test("on the device, host actions go to the channel", async () => {
  const sent = stubHost();
  const { runApp, closeApp, importProject } = await import("../src/acelery/export.js");

  runApp("Example", "Example", true);
  closeApp();
  importProject();

  assert.deepEqual(sent.map((m) => m.action),
    ["runApp", "closeApp", "importProject"]);
  assert.equal(sent[0].app, "Example");
  assert.equal(sent[0].debug, true);
  delete globalThis.ACeleryHost;
});

test("from a browser on the network, Run opens the launcher", async () => {
  // The regression Phase 4b shipped: every action but `download` threw, so Run
  // raised inside a click handler and looked like a dead menu item. Serving
  // apps to another device is the reason the server is reachable at all.
  delete globalThis.ACeleryHost;
  const opened = [];
  globalThis.open = (url, target) => opened.push({ url, target });

  const { runApp } = await import("../src/acelery/export.js");
  runApp("My App", "My App", false);

  assert.equal(opened.length, 1);
  assert.equal(opened[0].target, "_blank");
  assert.match(opened[0].url, /^\/system\/launcher\.html\?app=/);
  // A name with a space or an ampersand must survive the round trip.
  assert.match(opened[0].url, /app=My%20App$/);
});

test("closeApp goes back rather than appearing to do nothing", async () => {
  // window.close() is a no-op on a tab the script did not open.
  delete globalThis.ACeleryHost;
  let wentBack = 0;
  globalThis.history = { length: 3, back: () => wentBack++ };

  const { closeApp } = await import("../src/acelery/export.js");
  closeApp();
  assert.equal(wentBack, 1);
});

test("importProject says why it cannot work remotely", async () => {
  // It needs the device's file picker; there is no remote form of it. The
  // message has to say that rather than throw a bare failure.
  delete globalThis.ACeleryHost;
  const { importProject } = await import("../src/acelery/export.js");
  assert.throws(importProject, /needs the aCelery app/);
});

test("a download navigates when there is no host to hand it to", async () => {
  delete globalThis.ACeleryHost;
  const location = { href: "" };
  globalThis.location = location;

  stubFetch(() => ({ text: JSON.stringify({ handle: "7" }) }));
  const { saveFile } = await import("../src/acelery/export.js");
  await saveFile("text/csv", "x.csv", "a,b");

  assert.match(location.href, /opt=export&action=get&handle=7/);
});
