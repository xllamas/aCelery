# aCelery

Build and run your own JavaScript mini-apps on your phone — or have an AI
assistant build them for you.

aCelery is a pocket app-maker for Android and iOS. An app is a folder of plain
files — a manifest, an entry module, whatever CSS and assets you want. You can
write one in the built-in editor, or point an AI assistant at the phone and
describe what you want: it creates the app, runs it on the device, reads the
console and the rendered page, and fixes what is broken. Apps talk to SQLite, the
filesystem, the camera and gallery, and the network through a small capability
API. No build step, no bundler, no account.

Originally an Android app (2014, GPLv3, Xavier Llamas Rolland), now one Flutter
codebase for Android and iOS.

---

## Build apps by describing them

aCelery runs an **MCP server inside the app**, at `http://<phone>:8123/mcp`. Any
MCP client on the same network can connect to the phone directly — nothing is
installed on the computer and nothing is exposed to the internet.

> *Using the aCelery MCP create an aCelery app that will manage my cooking
> recipes. Each recipe should show as a tabbed view with tabs for ingredients,
> procedure, photos, notes and source…*

Given that prompt, Claude Desktop (Pro plan) created, ran and tested a working
recipes app on the phone in about four minutes. A second test asked DeepSeek
V4.1 Flash, through the Jan harness, for a books-read tracker that fills in
bibliographic data and the cover photo from the Open Library API by ISBN. It
delivered a working app for about US$ 0.13 of tokens
([`doc/app_creation_test.md`](doc/app_creation_test.md); the two apps are in
[`doc/AI_Created_Apps/`](doc/AI_Created_Apps/), as project zips).

What the assistant can do, as MCP tools:

| | Tools |
|---|---|
| **Author** | `list_apps`, `read_app`, `read_file`, `create_app`, `write_file`, `delete_file`, `delete_app` |
| **Run and observe** | `run_app`, `read_console`, `read_dom`, `take_screenshot` *(Android)*, `eval_js`, `close_app` |
| **Data** | `list_databases`, `query_db` (read-only, bound parameters), `exec_db` |

It also gets the material it needs to write correct code the first time: a
written guide to the aCelery API (`acelery://guide`), the live project files
(`acelery://apps/…`), a `create_acelery_app` prompt, and the Example app as a
worked template. `run_app` reports whether the app started or failed — with the
file, line and column of a syntax error — together with what the console said.
The assistant sees the same evidence you would, on the real device WebView, and
iterates until it works.

**Connecting.** Settings → Network access → *Connect an assistant* mints a key
and shows a ready-made command for Claude Code and a configuration block for
Claude Desktop:

```sh
claude mcp add --transport http aCelery http://<phone>:8123/mcp \
  --header "Authorization: Bearer <key>"
```

- Works with clients that connect from your network: Claude Code, Claude
  Desktop (through the small `mcp-remote` bridge the app generates the
  configuration for) and harnesses such as Jan. Other clients that dial out
  from your machine should work too.
- Claude on the web and mobile cannot reach a phone on a home network; those
  connectors originate in Anthropic's cloud.
- Keys are per client, shown once, listed in the app and revocable. A key is
  always required on `/mcp`, requests carrying a browser `Origin` are refused,
  and writes are confined to your apps and databases.
- Sharing must be switched on. On Android it keeps working with the screen off.
  On iOS the connection lasts while aCelery is on screen.

Details: [`doc/mcp-server.md`](doc/mcp-server.md).

## What you get on the phone

- **Home, Apps, Code, Data, Settings** — a *Continue* card that picks up where
  you left off; every app as a card you can run, export or pin to the home
  screen *(Android)*.
- **A real code editor** — CodeMirror 6, with highlighting, folding, search,
  autocomplete and undo, designed for touch. Run saves first and launches the
  app on the device; a debug run adds an error log.
- **App management** — *App details* sets an app's icon (picked and cropped on
  the device), name and description; *Add files* copies pictures, data or
  scripts from the device into a project.
- **A database manager** — browse and edit tables built from their real
  columns, see their structure, or run SQL.
- **Share on your network** — the same server answers a browser on your
  computer, so you can use the full IDE and your apps from a desktop. New
  devices must be approved on the phone, and each gets its own revocable key.
- **Back up and restore** — databases, app files and the apps themselves in one
  zip; export and import single projects.
- **Themes** — 18, with light and dark, applied to your apps as well as the
  shell.

## Writing an app by hand

Two bare-name imports, resolved by an import map. htm compiles its templates at
runtime, so the file you write is the file that runs.

```js
import { openDB } from "acelery/sql.js";
import { html, render, Panel, Input, Form, notEmpty } from "acelery/ui.js";

export default async function main() {
  const db = await openDB("notes.db");
  await db.exec("create table if not exists note (body text)");

  render(html`
    <${Panel} title="Notes">
      <${Form} onSubmit=${(v) => db.insert("insert into note (body) values (?)",
                                           [v.body])}>
        <${Input} label="Note" name="body" validate=${[notEmpty()]} />
      <//>
    <//>`, document.body);
}
```

`acelery_app.json` names the entry module (`main.js` if it does not say). The
capability modules an app can import:

| Module | For |
|---|---|
| `acelery/ui.js` | Preact, Bootstrap-based widgets, forms with validation, and `TableMaint` — declare fields and get a working list / record / edit / search screen over a SQLite table, with linked child tables |
| `acelery/sql.js` | SQLite with bound parameters |
| `acelery/file.js` | files in the app's sandbox, including binary |
| `acelery/picker.js` | files and photos from the camera or gallery, with cropping and shrinking |
| `acelery/http.js` | the network |
| `acelery/export.js` | sharing files and leaving the app |
| `acelery/chart.js` | Chart.js charts (opt-in) |
| `acelery/datatable.js` | sortable, searchable, paged tables, answered from SQLite (opt-in) |

The full guide is [`doc/user-guide.md`](doc/user-guide.md), printed into the app
as a PDF under Settings → About; the Example app is the reference
implementation.

## How it fits together

The Flutter side is a thin host. The product is the web bundle.

```
Flutter shell  ──►  WebView  ──►  http://127.0.0.1:8123
  (lib/)                             │
                                     ├─ static:  bundle/www/…
                                     ├─ /android.itf:  the capability bridge
                                     │    sqflite · dart:io · http · archive
                                     └─ /mcp:  the assistant's tools
```

Everything a user app can do goes through that one HTTP origin, local and
remote alike. That is why a browser on another machine gets the same IDE and the
same apps, and why an assistant sees exactly what the app sees.

| Directory | What it is |
|---|---|
| `lib/` | the Dart host: server, `/android.itf` bridge, `/mcp` server, WebView shell |
| `bundle/` | the web bundle — source of truth, packed into `assets/aCelery.zip` |
| `bundle/www/system/` | the shell: Home, Apps, Code, Data, Settings, and the launcher |
| `bundle/www/user/Example/` | the sample app, and the reference for writing one |
| `web/` | JS/CSS sources built into `bundle/www/tools/` |
| `doc/` | the user's guide, the MCP server notes, and design records |
| `tool/` | the build scripts |

Built on Preact 10 + htm, react-bootstrap, Bootstrap 5.3, CodeMirror 6, Chart.js
and DataTables, as ES modules with an import map.

## Running it

```sh
flutter pub get
flutter run                      # Flutter 3.41+ / Dart 3.11+
```

After editing anything under `web/` or `bundle/`:

```sh
(cd web && npm install)          # once
sh tool/build_js.sh              # web/src → bundle/www/tools/
sh tool/build_bundle.sh          # bundle/ → assets/aCelery.zip
```

After editing `doc/user-guide.md`, reprint the PDF that Settings → About links
to. It needs Chrome, Chromium or Edge on the machine; the output is committed,
so a checkout without one still packs a working bundle.

```sh
node tool/build_guide.mjs        # doc/user-guide.md → bundle/www/system/doc/
```

Then bump `ACeleryRuntime.bundleVersion` so installed devices pick the change
up. A test fails if the zip goes stale, another if the built JS does, and
another if the guide PDF was never reprinted.

```sh
flutter test                     # the host, the bridge, and the bundle's shape
(cd web && npm test)             # the widget layer, against the built bundle
```

**Hot reload will not do it.** The bundle is unzipped on launch and the JS is
vendored, so a full rebuild and reinstall is the only way to see a bundle
change on a device.

### In a desktop browser

Two ways, and they test different things.

```sh
adb forward tcp:8123 tcp:8123     # then open http://localhost:8123/
```

Reaches the app on a device or emulator, with DevTools. `adbd` connects from
`127.0.0.1` *inside* the device, so the request counts as loopback and skips
pairing. That makes it the quick way to drive the UI — and it exercises the
remote JavaScript path, because a browser has no `ACeleryHost`, so `Run` opens
the launcher in a tab rather than pushing a Flutter route.

```sh
dart run tool/serve.dart --share  # then open http://<this machine>:8123/
```

Runs the real server here, against a throwaway copy of the bundle in a temp
directory. Reaching it by this machine's own LAN address means the request
arrives from a non-loopback address, which is the only way to exercise pairing
from one machine. The approval prompt that would appear on the device is
printed to the terminal and answered there.

Do not leave the `adb forward` in place while `tool/serve.dart` runs: both can
bind at once — adb takes `127.0.0.1:8123`, the script takes `*:8123` — and
macOS prefers the more specific one, so `localhost` quietly reaches the
emulator while the LAN address reaches the script.

## Status

Verified on Android (emulator and device). **Not yet verified on iOS** — in
particular the native date pickers. The design records behind the port and the
web bundle are in `doc/` (`web-bundle-port-plan.md`,
`js-ui-framework-evaluation.md`, `shell-redesign.md`).

## A note on `original/`

The 2014 Android app, its `aCelery_content/` tree and the source
`aCelery.zip` live in `original/`, which is **not in this repository** — it is
listed in `.gitignore`. The documents in `doc/` cite it throughout
(`aCeleryAndroidInterface.java`, `aCeleryUnzip.java`, `original/assets/`), so
those references will not resolve from a fresh clone.

## Licence

GNU General Public License v3.0 — see [`LICENSE`](LICENSE). This is the licence
the 2014 sources were released under, and the headers in `xscript5/` and the
original Android app carry it; the file makes it explicit rather than implied.

The `LICENSE` file is the verbatim FSF text. Its closing section is the
standard "How to Apply These Terms" appendix, so the `<year>` and
`<name of author>` placeholders in it are instructions, not blanks to fill in.

