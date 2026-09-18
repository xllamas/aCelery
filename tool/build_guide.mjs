/**
 * Builds doc/user-guide.md into bundle/www/system/doc/aCelery-guide.pdf, the
 * copy Settings -> About links to.
 *
 * Like the JS under bundle/www/tools/js/acelery, the PDF is a build artifact
 * that is committed: tool/build_bundle.sh must be able to pack a working zip
 * on a checkout that has neither node nor a browser. This script is the
 * deliberate rebuild, run after editing the guide.
 *
 * Markdown -> HTML is `marked`; HTML -> PDF is the browser already on the
 * machine, in headless mode. Nothing else on the shelf renders a table, a
 * fenced code block and a working internal link into one paginated document,
 * and a print stylesheet is a thing this project already knows how to write.
 *
 *     node tool/build_guide.mjs [--chrome /path/to/browser]
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, mkdtempSync, openSync, closeSync, readSync,
  readFileSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "../web/node_modules/marked/lib/marked.esm.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "doc/user-guide.md");
const OUT = join(root, "bundle/www/system/doc/aCelery-guide.pdf");
const STAMP = join(root, "bundle/www/system/doc/.source.sha256");

/* The browsers that can be asked to print, in the order they are tried. The
   flag overrides the lot, for a machine that keeps one somewhere else. */
const BROWSERS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
];

function findBrowser() {
  const flag = process.argv.indexOf("--chrome");
  if (flag !== -1 && process.argv[flag + 1]) {
    const named = process.argv[flag + 1];
    if (!existsSync(named)) {
      fail(`--chrome ${named} is not there`);
    }
    return named;
  }
  const found = BROWSERS.find((b) => existsSync(b));
  if (!found) {
    fail(
      "no Chrome, Chromium or Edge found to print with.\n" +
      "  Install one, or pass --chrome /path/to/browser.\n" +
      "  The committed PDF is still packed, so this is only needed to rebuild it.",
    );
  }
  return found;
}

function fail(message) {
  console.error(`tool/build_guide.mjs: ${message}`);
  process.exit(1);
}

/* ------------------------------------------------------------------- html */

/* Page furniture and type. Sized for A4, which is also within US Letter's
   printable width, so one file reads correctly on either paper.

   Colours are literal rather than Bootstrap's variables: this is printed
   once, by a browser that never loads the theme stylesheets, and paper has no
   dark mode. */
const STYLE = `
@page { size: A4; margin: 18mm 16mm 20mm; }

* { box-sizing: border-box; }

body {
  font: 10.5pt/1.55 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
        sans-serif;
  color: #1f2426;
  margin: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

h1, h2, h3 { color: #12181a; line-height: 1.25; }
h1 { font-size: 22pt; margin: 0 0 .6em; }
h2 { font-size: 15pt; margin: 1.8em 0 .5em; }
h3 { font-size: 11.5pt; margin: 1.4em 0 .4em; }

/* A part title starts its own page; a section does not, so the document does
   not turn into one heading per sheet. */
h1 + p { margin-top: 0; }
body > h1:not(:first-of-type) { break-before: page; }
h2, h3 { break-after: avoid; }
p, li, tr, pre, blockquote { break-inside: avoid; }

p { margin: 0 0 .7em; }
ul { margin: 0 0 .7em; padding-left: 1.4em; }
/* Wider than a ul: the contents run past ten, and a tight indent clips the
   first digit of every entry after it. */
ol { margin: 0 0 .7em; padding-left: 2.2em; }
li { margin: .2em 0; }

a { color: #1a6a72; text-decoration: none; }

hr { border: 0; border-top: 1px solid #d8dee0; margin: 1.6em 0; }

code {
  font: 9.5pt/1.4 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  background: #f1f4f5;
  border-radius: 3px;
  padding: .1em .32em;
}

pre {
  background: #f7f9f9;
  border: 1px solid #e3e9ea;
  border-left: 3px solid #4f9aa2;
  border-radius: 4px;
  padding: .7em .9em;
  margin: 0 0 1em;
  overflow: visible;
  white-space: pre-wrap;
  word-wrap: break-word;
}
pre code { background: none; padding: 0; font-size: 9pt; }

blockquote {
  margin: 0 0 1em;
  padding: .6em .9em;
  background: #fbf7ec;
  border-left: 3px solid #d8b45a;
  border-radius: 4px;
}
blockquote p:last-child { margin-bottom: 0; }

table {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 1em;
  font-size: 9.5pt;
}
th, td {
  border: 1px solid #dfe5e7;
  padding: .4em .6em;
  text-align: left;
  vertical-align: top;
}
th { background: #eef3f3; font-weight: 600; }
td code, th code { font-size: 8.8pt; white-space: nowrap; }

/* The title page: the one place the document is allowed to be decorative. */
.cover { break-after: page; padding-top: 34mm; }
.cover h1 { font-size: 34pt; margin-bottom: .1em; letter-spacing: -.5px; }
.cover .tagline { font-size: 13pt; color: #4a5558; margin: 0 0 2.4em; }
.cover .meta { font-size: 9.5pt; color: #6a7679; }
.cover .rule {
  width: 64px; height: 4px; background: #4f9aa2; border-radius: 2px;
  margin: 0 0 1.6em;
}
`;

async function build() {
  if (!existsSync(SOURCE)) fail(`${SOURCE} is not there`);
  const markdown = readFileSync(SOURCE, "utf8");

  /* The guide's own first heading and strapline become the cover, so the
     printed document does not open on a heading and a repeat of it. */
  const body = markdown.replace(
    /^# aCelery — User's Guide\n\n\*\*(.+?)\*\*\n/,
    "",
  );
  if (body === markdown) {
    fail("the guide's title block has changed; update the cover extraction");
  }

  const version = readFileSync(join(root, "pubspec.yaml"), "utf8")
    .match(/^version:\s*(\S+)/m)?.[1] ?? "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>aCelery — User's Guide</title>
<style>${STYLE}</style>
</head>
<body>
<section class="cover">
  <div class="rule"></div>
  <h1>aCelery</h1>
  <p class="tagline">User's Guide</p>
  <p class="meta">
    Build and run your own JavaScript apps on your phone.<br>
    ${version ? `Version ${version.split("+")[0]} · ` : ""}GPLv3 ·
    www.acelery.com
  </p>
</section>
${marked.parse(body, { gfm: true, mangle: false, headerIds: true })}
</body>
</html>
`;

  const stage = mkdtempSync(join(tmpdir(), "acelery-guide-"));
  const page = join(stage, "guide.html");
  writeFileSync(page, html);

  mkdirSync(dirname(OUT), { recursive: true });

  rmSync(OUT, { force: true });
  mkdirSync(dirname(OUT), { recursive: true });

  const browser = findBrowser();
  try {
    writeFileSync(OUT, await print(browser, `file://${page}`, stage));
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }

  /* A stamp over the source, so a test can tell that the committed PDF was
     built from the guide next to it. The PDF itself cannot be compared:
     Chrome writes a creation date into it, so two prints of one file differ.
     Same arrangement as tool/build_js.sh and its .sources.sha256. */
  writeFileSync(STAMP, `${createHash("sha256").update(markdown).digest("hex")}\n`);

  const kb = Math.round(statSync(OUT).size / 1024);
  console.log(`${OUT.slice(root.length + 1)}: ${kb} KB`);
}

/* ------------------------------------------------------------------- print */

/**
 * Prints [url] and resolves to the PDF's bytes.
 *
 * Driven over the DevTools protocol rather than with `--print-to-pdf`, for two
 * reasons measured here:
 *
 *  - **The browser does not exit.** On macOS with Chrome 141, in both headless
 *    modes, `--print-to-pdf` writes the file in about a second and then sits
 *    there, so a build that waits for the process never finishes.
 *  - **It prints a tagged PDF**, and there is no switch to stop it. The
 *    accessibility tree is a third of the file — 238 KB of the 723 KB this
 *    guide first came to — and it is dead weight in a document nothing reads
 *    with a screen reader. `Page.printToPDF` takes `generateTaggedPDF: false`.
 *
 * Node's own WebSocket client is what talks to it, so this needs nothing from
 * npm beyond `marked`.
 */
async function print(browser, url, stage) {
  const profile = join(stage, "profile");
  const child = spawn(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    // 0 asks for a free port, which it then writes into the profile.
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    // Reading a file:// page needs a page to start from.
    "about:blank",
  ], { stdio: "ignore", detached: true });
  /* Or node keeps its own event loop alive waiting for a browser that, as
     above, may never exit. */
  child.unref();

  try {
    return await session(await devtools(profile), url);
  } finally {
    try {
      // The group, because Chrome's helpers are children of the one spawned.
      process.kill(-child.pid, "SIGKILL");
    } catch {
      // Already gone, which is the other half of the behaviour above.
    }
  }
}

/** Waits for the profile's DevToolsActivePort file and returns the ws:// URL. */
async function devtools(profile, timeoutMs = 30_000) {
  const portFile = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(portFile)) {
      // Two lines: the port, then the browser target's path.
      const [port, path] = readFileSync(portFile, "utf8").split("\n");
      if (port && path) return `ws://127.0.0.1:${port.trim()}${path.trim()}`;
    }
    await sleep(100);
  }
  throw new Error("the browser never opened a DevTools port");
}

/** Opens [url] in a new target and prints it. */
async function session(endpoint, url) {
  const ws = new WebSocket(endpoint);
  const pending = new Map();
  const waiting = new Map();
  let seq = 0;

  await new Promise((ok, no) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", () => no(new Error(`cannot reach ${endpoint}`)),
      { once: true });
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      const settle = pending.get(message.id);
      pending.delete(message.id);
      if (!settle) return;
      if (message.error) settle.no(new Error(message.error.message));
      else settle.ok(message.result);
      return;
    }
    const wake = waiting.get(message.method);
    if (wake) {
      waiting.delete(message.method);
      wake();
    }
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((ok, no) => {
      const id = ++seq;
      pending.set(id, { ok, no });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  const event = (method) => new Promise((ok) => waiting.set(method, ok));

  try {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget",
      { targetId, flatten: true });

    await send("Page.enable", {}, sessionId);
    const loaded = event("Page.loadEventFired");
    await send("Page.navigate", { url }, sessionId);
    /* `ref: false` so the timer does not hold node's event loop open for the
       full 30 s once the page has loaded and there is nothing left to wait
       for -- which looked exactly like the browser hanging. */
    await Promise.race([
      loaded,
      sleep(30_000, null, { ref: false })
        .then(() => { throw new Error("the page never loaded"); }),
    ]);

    const { data } = await send("Page.printToPDF", {
      printBackground: true,
      // @page in the stylesheet decides the paper and the margins.
      preferCSSPageSize: true,
      // The accessibility tree is a third of the file and nothing reads it.
      // The outline would need it back -- Chrome builds the bookmarks from the
      // tags -- and a sidebar of headings is not worth 320 KB on a device.
      generateTaggedPDF: false,
      generateDocumentOutline: false,
    }, sessionId);

    const pdf = Buffer.from(data, "base64");
    // Asked to go before it is killed, so the profile is not left locked.
    ws.send(JSON.stringify({ id: ++seq, method: "Browser.close", params: {} }));
    return pdf;
  } finally {
    ws.close();
  }
}

await build();
