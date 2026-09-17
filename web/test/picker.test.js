/**
 * acelery/picker.js: pickers are the page's own file input, so a file comes
 * from wherever the user is (doc/pickers-evaluation.md).
 *
 * jsdom has no file dialog and no canvas, so this pins the input's lifecycle;
 * cropping is verified in a real WebView.
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>");
globalThis.document = dom.window.document;

const { pickFiles, pickImages } = await import("../src/acelery/picker.js");

/** Runs a pick, capturing the input it opened before `respond` answers it. */
async function pick(start, respond) {
  let opened = null;
  const click = dom.window.HTMLInputElement.prototype.click;
  dom.window.HTMLInputElement.prototype.click = function () {
    opened = this;
  };
  try {
    const result = start();
    assert.ok(opened, "no input was clicked");
    const seen = {
      accept: opened.accept,
      multiple: opened.multiple,
      capture: opened.getAttribute("capture"),
      inDocument: opened.isConnected,
      hidden: opened.hidden,
    };
    respond(opened);
    const files = await result;
    return { files, seen, removed: !opened.isConnected };
  } finally {
    dom.window.HTMLInputElement.prototype.click = click;
  }
}

function choose(input, files) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new dom.window.Event("change"));
}

test("pickFiles opens an input as asked and resolves with the chosen files", async () => {
  const csv = new dom.window.File(["a,b"], "rows.csv", { type: "text/csv" });
  const { files, seen, removed } = await pick(
    () => pickFiles({ accept: ".csv,text/csv", multiple: true }),
    (input) => choose(input, [csv]),
  );
  assert.deepEqual(seen, {
    accept: ".csv,text/csv", multiple: true, capture: null,
    inDocument: true, hidden: true,
  });
  assert.deepEqual(files.map((f) => f.name), ["rows.csv"]);
  assert.ok(removed, "the input does not linger in the page");
});

test("cancelling resolves with no files", async () => {
  const { files, removed } = await pick(
    () => pickFiles(),
    (input) => input.dispatchEvent(new dom.window.Event("cancel")),
  );
  assert.deepEqual(files, []);
  assert.ok(removed);
});

test("pickImages asks for images, and for the back camera when told to", async () => {
  const gallery = await pick(() => pickImages({ multiple: true }), (i) => choose(i, []));
  assert.equal(gallery.seen.accept, "image/*");
  assert.equal(gallery.seen.multiple, true);
  assert.equal(gallery.seen.capture, null);

  const camera = await pick(() => pickImages({ camera: true, multiple: true }), (i) => choose(i, []));
  assert.equal(camera.seen.capture, "environment");
  assert.equal(camera.seen.multiple, false, "a camera takes one photo");
});
