# Plan: write `doc/mcp-server.md` — implementing the aCelery MCP server

## Context

`doc/modernization-assessment.md` Addendum 3 proposed an MCP server so an AI
assistant can **create, run and debug** aCelery apps. `js-ui-framework-evaluation.md`
§9.2 confirmed it is on the roadmap. The addendum was written against the 2014
stack, and most of its specifics are now out of date:

- It proposes generating a reference from `xscript*.js`. Apps are now written
  in Preact, htm and the `acelery/*` modules.
- It assumes synchronous `filewrite` over xInterface.
- Its Topology B was to "reimplement `/android.itf` in Node/Dart". That work is
  no longer needed, because `tool/serve.dart` already runs the **real**
  `ACeleryServer` on a desktop with sqflite FFI.
- It says "implement §2 auth first". That is done: `AccessControl` provides
  pairing and a cookie token.

The request is an implementation plan, written as a document. This turn writes
only the document. The code comes afterwards, in the phases the document sets
out.

Findings from reading the current code, which shape the plan:

1. **The SQL bridge does not confine paths.** `SqlBridge._resolve`
   (`lib/src/bridge/sql_bridge.dart:96-99`) concatenates `bpath` and `path`
   without the `isInside` check `FileBridge` applies. `openDb` and `deleteDb`
   therefore take any path. `test/bridge_test.dart` tests traversal only for
   `opt=file` (:531) and `opt=exportproject` (:595). A paired LAN client, which
   is what an MCP server on another machine is, could delete any file the app
   can write.
2. **The token store is inside the file bridge's sandbox.** The store is
   `${paths.base}/.acelery-access.json` (`acelery_server.dart:37`). The file
   sandbox is `paths.base` (`file_bridge.dart:44`), so `opt=file` can read and
   rewrite every device's bearer token. The comment "deliberately outside www/"
   only accounts for static serving.
3. **Device console output goes nowhere a client can read.** On the device it
   only reaches `debugPrint` (`acelery_web_view.dart:63`). `errorlog.html`
   calls `xGetLogCatFormated`, and `ItfHandler` has no route for it, so the page
   is dead. Console capture has to come from a browser the MCP server owns.
4. **The bridge's file I/O is text-only.** `readAsString` and
   `writeAsStringSync` mean an MCP server can write JS, CSS, JSON and SVG, but
   not PNG.
5. **Apps already run in any browser.** `launcher.html` imports
   `/user/<app>/<entry>`, and its `fail()` renders an alert and calls
   `console.error("aCelery: …")` for load, entry and startup errors.
   `export.js` has browser fallbacks for `runApp` and `closeApp`;
   `importProject` throws.
6. **Loopback is trusted.** Both `adb forward` and a desktop `serve.dart` reach
   the server from 127.0.0.1, so neither needs pairing
   (`access_control.dart:71`, `serve.dart` header).
7. **The IDE saves over outside edits.** `CodeWorkspace` saves a dirty buffer on
   unmount and on Mod-S. If the model writes `main.js` while it is open in the
   IDE, the IDE's next save overwrites the model's change.

## Deliverable

- **Create** `doc/mcp-server.md`. It follows the house style: numbered §s,
  file:line references, claims marked as measured or not, and a closing
  Decisions section with recommendations.
- **Edit** `doc/modernization-assessment.md` Addendum 3: add a one-line
  "superseded by `doc/mcp-server.md`" note under its heading.

No product code and no commit unless asked.

## Document outline

**§0 Verdict.** The server is a thin, stdio MCP server in a new top-level `mcp/`
package. It is a plain HTTP client of `/android.itf` plus a Playwright-driven
browser, so it adds no second server implementation. By default it targets the
real server running locally through `tool/serve.dart`, and it can also point at
a device. Three server-side defects must be fixed first (findings 1, 2, 7).

**§1 What changed since Addendum 3.** The list in Context, including which of
the addendum's work items have disappeared.

**§2 Architecture.**

```
Claude Code ──stdio──▶ mcp/src/server.js ──HTTP──▶ ACeleryServer (/android.itf, /user, /system)
                             │                         ▲ local: dart run tool/serve.dart
                             └─ Playwright (Chrome) ───┘ device: adb forward | LAN + pairing
```

Modules:

| Module | Responsibility |
|---|---|
| `target.js` | Resolves the target, spawns and stops the local server, pairs over the LAN |
| `itf.js` | HTTP client for `/android.itf` with a cookie jar: file handles, SQL routes, `listfiles` |
| `apps.js` | Authoring tools |
| `data.js` | Database tools |
| `runner.js` | One Playwright page per app, with console and error ring buffers |
| `docs.js` | Resources and prompts |

- The package is plain ESM with JSDoc, like `web/`, and is tested with
  `node:test`.
- Scaffolding is shared, not copied: the project name rule, manifest and
  `main.js` template move out of `web/src/ide/store.js` into a pure
  `web/src/ide/scaffold.js`. `store.js` and the MCP server both import it, so an
  app created by the model is identical to one the IDE creates.

**§3 Targets.**

- **`local` (default).** The MCP server spawns
  `dart run tool/serve.dart --root <workspace> --port 0 --ready-file <path>`.
  - The workspace is persistent (`~/.acelery-mcp/workspace`).
    `BundleInstaller` keeps user data across bundle upgrades.
  - Requests arrive over loopback, so there is no pairing.
  - It warns when `assets/aCelery.zip` is older than the newest file under
    `bundle/` (the stale-bundle trap).
- **`url` (emulator or USB phone).** `ACELERY_TARGET=http://localhost:8123`
  after `adb forward tcp:8123 tcp:8123`. This is also loopback on the device,
  so there is no pairing. Created apps show up in the device's Apps screen.
- **`url` over the LAN.** Sharing is on, so pairing applies.
  - A request with `Accept: application/json` gets a 401 carrying
    `{pairing, code}`.
  - The `acelery_pair` tool returns the code for the user to match on the
    device, then polls `/acelery.pair/status?id=` until the `Set-Cookie`
    arrives.
  - The token is saved per host in `~/.acelery-mcp/tokens.json` with mode 0600.
  - A later 401 means the device was revoked: the saved token is dropped and
    the tool asks the user to pair again.
  - Playwright gets the same cookie through `context.addCookies`.

**§4 Tool surface.** For each tool, the document gives its input schema, the
bridge calls behind it, output limits, and MCP annotations
(`readOnlyHint`/`destructiveHint`).

- **Authoring**
  - `acelery_list_apps`: `listfiles` on `www/user` plus each manifest.
  - `acelery_read_app(app)`: the manifest, the file list with size and mtime,
    and text contents capped at 200 KB per file.
  - `acelery_create_app(name, description)`: uses the shared scaffold.
  - `acelery_write_file(app, path, content, expected_mtime?)`: an optimistic
    precondition that returns the new mtime. Text only (finding 4). It refuses
    paths outside the app folder on the client side, and the server check
    stays authoritative.
  - `acelery_delete_file(app, path)` and `acelery_delete_app(app)`: marked
    destructive.
- **Run and debug**
  - `acelery_run_app(app, {viewport})`: opens `/system/launcher.html?app=`,
    then waits for load plus network idle or a timeout. It returns
    `status: started | load_failed | no_entry | threw`, read from the
    launcher's `fail()` alert. It also returns console output, page errors
    with stacks, failed requests, and a screenshot as image content.
  - `acelery_console(app, since?)`, `acelery_screenshot(app, selector?)`,
    `acelery_interact(app, click | fill | press, selector, value?)`,
    `acelery_eval(app, expression)`, `acelery_reload(app)`,
    `acelery_close_app(app)`.
  - Browser behaviour: without `ACeleryHost`, `runApp` opens a tab (the runner
    follows popups), `closeApp` goes back, and `importProject` throws. This
    matches a LAN browser exactly.
- **Data**
  - `acelery_list_databases`.
  - `acelery_query_db(db, sql, args)`: opens the database read-only (a new
    `readonly=true` option on `opendb`), queries, closes, and caps at 200 rows.
  - `acelery_exec_db(db, sql, args)`: marked destructive.

**§5 Resources and prompts.**

- `acelery://guide`: a hand-written authoring guide covering:
  - the app folder layout and manifest schema (`name`, `description`,
    `entry`, `icon`);
  - the `export default main` contract;
  - the import map names (`acelery/ui.js`, `sql.js`, `file.js`, `http.js`,
    `export.js`, `chart.js`);
  - async-only APIs with bound parameters, and themes;
  - what is unavailable in a browser run.
- `acelery://api/{module}`: `.d.ts` files generated by
  `tsc --allowJs --declaration --emitDeclarationOnly` over the public entry
  points. The generation runs in `tool/build_js.sh`, and the output is
  committed under `mcp/generated/`, like the vendored JS.
  - Preact and react-bootstrap need no reference, because the model already
    knows them (evaluation §6.1).
  - aCelery's own layer does need one: `Form`/`Input`/`TableMaint`/`Panel`/
    `useDismiss`/`applyTheme`/`openDB`.
- `acelery://apps/{app}/{file}`: live files. The Example app is the template.
- Prompt `create_acelery_app(idea)`: pins the contract and points at the guide
  and the Example app.

**§6 Server-side prerequisites (Dart, this repo).**

- **S1. Confine the SQL bridge.** `_resolve` then `ACeleryPaths.isInside(base)`
  on `opendb` and `deletedb`, returning 500 as the file routes do. Tests mirror
  `bridge_test.dart:531`.
- **S2. Move the token store outside `paths.base`**, to
  `${paths.root}/.acelery/access.json`. There is no migration, because the app
  was never launched. Test: `opt=file` cannot open the store.
- **S3. Add `readonly=true` to `opendb`**, through
  `OpenDatabaseOptions(readOnly: true)`. Test: a write through a read-only
  handle fails with a 500 carrying the error.
- **S4. Extend `tool/serve.dart`.**
  - `--root` persists and is not deleted on exit.
  - `--port`, where 0 is allowed.
  - `--ready-file <path>` prints `{"url": …}` once listening.
  - It stops cleanly on SIGTERM as well as SIGINT.
- **S5. Guard the IDE against outside edits.** Before saving, `CodeWorkspace`
  compares the file's `lastmodified` with the value at load. If they differ it
  asks "Changed outside the editor: Reload / Overwrite" through `useConfirm`.
  Test in `web/test/ide_shell.test.js`. Rebuild `ide.js` and bump
  `bundleVersion`.

**§7 Security model.**

- An MCP client is a paired peer with full bridge access. The server enforces
  confinement (S1, S2), and the client enforces app-folder scoping as defence
  in depth.
- `eval` and `interact` run only in the browser the MCP server owns, never in
  the device WebView.
- The HTTP proxy (`opt=http`) is not exposed as a tool.
- Tokens are stored with mode 0600.
- Tool output (file contents, rows, console text) is untrusted data returned to
  the model. The guide says so.

**§8 Phasing.** Each phase ends usable.

- **M0. Prerequisites.** S1–S4, plus the `scaffold.js` extraction.
- **M1. Authoring MVP.**
  - The `mcp/` package, the `local` and `url` targets, and the authoring and
    data tools.
  - The guide resource, the Example resource and the prompt.
  - `.mcp.json` at the repo root, registering the server for Claude Code.
- **M2. Run and debug.** The Playwright runner and its tools.
- **M3. Devices.** LAN pairing, S5, and the generated `.d.ts` API resources.
- **M4. Optional.**
  - A device console ring buffer (`opt=log`, fed by `setOnConsoleMessage`),
    which also revives `errorlog.html`.
  - A "show on device" event from server to shell.

**§9 Tests.**

- **Dart:** S1–S3 in `test/bridge_test.dart` and
  `test/access_control_test.dart`.
- **Web:** S5 and the scaffold equality check in `web/test/`.
- **MCP:**
  - `mcp/test/` unit tests against a fake `/android.itf`.
  - Integration tests that spawn the real `serve.dart --port 0`. They create
    an app, write a deliberate `throw`, and assert that `run_app` reports
    `threw` with the right file and line. They fix the error, rerun, assert
    `started`, and check that the screenshot is non-empty.
  - A test that the SQL tools refuse a `../` database name.

**§10 Verification (manual, end to end).**

1. `flutter test test/`, `cd web && npm test`, `cd mcp && npm test`.
2. From Claude Code with `.mcp.json`: "create an app that logs water intake to a
   database". Run it and read the screenshot. Inject an error and confirm the
   model fixes it from the stack trace.
3. Emulator: `adb forward`, then `ACELERY_TARGET=http://localhost:8123`.
   Confirm the created app appears in the device's Apps screen and runs there.
   Open it in the IDE, write through the MCP server, save in the IDE, and check
   that the S5 prompt appears.
4. LAN: turn sharing on, pair by code, and restart the MCP server to confirm the
   token persists. Revoke the device and check that the next call asks to pair
   again.

**§11 Non-goals.**

- Binary asset writes.
- Running or debugging inside the device WebView (until M4).
- Publishing to npm.
- Exposing the HTTP proxy.
- An MCP server embedded in the app.

**§12 Decisions (open, each with a recommendation).**

1. **Implementation language.** Recommended: Node ESM with the official
   `@modelcontextprotocol/sdk` and `playwright-core`. The alternative is Dart
   (`dart_mcp` plus puppeteer-dart), which could embed `ACeleryServer`
   in-process but has less mature MCP and browser libraries.
2. **Default target.** Recommended: the local desktop server.
3. **Browser.** Recommended: the installed Chrome through
   `channel: "chrome"`, falling back to Playwright's Chromium download.
4. **Token store location.** Recommended: move it outside `paths.base` (S2).
5. **Include `acelery_eval`?** Recommended: yes, since it runs only in the
   MCP-owned browser.
6. **Device console buffer (M4).** Recommended: defer.
7. **Distribution.** Recommended: a repo-local `.mcp.json` only.

## Files

- **Create:** `doc/mcp-server.md`
- **Edit:** `doc/modernization-assessment.md` (a one-line superseded note under
  Addendum 3)
- **Already read for accuracy:**
  - `lib/src/server/{acelery_server,access_control,itf_handler}.dart`
  - `lib/src/bridge/{file_bridge,sql_bridge}.dart`, `lib/src/paths.dart`
  - `lib/src/shell/{acelery_web_view,host_actions,user_app_screen}.dart`
  - `tool/serve.dart`, `tool/build_bundle.sh`
  - `bundle/www/system/{launcher,errorlog}.html`
  - `web/src/acelery/{index,sql,file,export}.js`, `web/src/ui/index.js`
  - the Example app, `test/bridge_test.dart`

## Verification of the document

- `grep -n` every file:line it cites against the tree.
- Read `web/src/ide/store.js` `createProject` before describing
  `scaffold.js`, so the extracted pieces are named correctly.
- Mark findings 1 and 2 as "read from the code; S1/S2 open with the failing
  test that proves each". They have not been exploited live.
- Check that nothing contradicts settled §9 decisions in the evaluation
  (parameterised SQL only, the Preact stack, and pairing semantics).

## M0: implemented (2026-09-15)

Each defect was reproduced over HTTP by a failing test before it was fixed.

- **S1: the SQL bridge is confined.**
  - `SqlBridge._resolve` returns null outside `paths.base`.
  - `openDb` then returns -1 and `deleteDb` returns false, and both routes
    answer 500.
  - Before the fix, `opendb` with `path=../../escape.db`, `opendb` with
    `bpath` outside the tree, and `deletedb` with `path=../../victim.db` all
    answered **200**.
  - Not observed: whether the victim file was actually deleted, because the
    test stopped at the status check.
  - Tests: `test/bridge_test.dart`, group `confinement`.
- **S2: the token store moved outside the tree.**
  - It is now `ACeleryPaths.accessStore`, which is `<root>/.acelery/access.json`.
  - Before the fix, `opt=file&action=openfile` on the old
    `<base>/.acelery-access.json` answered **200**, both by a relative path and
    by `bpath`. Now it answers 500.
  - `access_control_test.dart` asserts the store is outside `paths.base`, not
    only outside `www/`.
  - There is no migration, because the app was never launched. An installed
    build loses its pairings and its sharing setting: pair again and turn
    sharing back on. The old file stays where it was, unread.
- **S3: read-only handles.**
  - `opendb&readonly=true` maps to `OpenDatabaseOptions(readOnly: true)`.
  - A write through a read-only handle gets a 500 carrying SQLite's "readonly"
    message.
  - A missing file answers 500 and is not created.
- **S4: `tool/serve.dart`.**
  - New options `--root`, `--port`, and `--ready-file`, which replaces the
    planned `--ready-json`. `dart run` writes its own "Running build hooks..."
    to stdout, without a newline, before the program starts, so stdout cannot
    carry a machine-readable line. The ready file is written aside, then
    renamed into place, and deleted on shutdown.
  - It shuts down on SIGTERM as well as SIGINT.
  - A persistent root stamps the bundle with the zip's size and mtime, so it
    reinstalls only when `assets/aCelery.zip` changes.
  - Smoke test, run twice on one persistent root:
    - ready file present, bridge answering, and the Example app served;
    - escaping `opendb` answered 500 and no file was created;
    - SIGTERM exited 0 and removed the ready file;
    - the second start did not reinstall.
- **Scaffold.**
  - `web/src/ide/scaffold.js` imports nothing and exports `ENTRY`,
    `NAME_PATTERN`, `nameProblem`, `descriptionProblem`, `projectName`,
    `manifestText` and `entryModule`.
  - `store.js` and `code_screen.js` use it, and the rules and messages are
    unchanged.
  - Tests: `web/test/scaffold.test.js` loads it from source, as Node will.
- **Bundle.** `bundleVersion` is now `1.6.3+mcp-m0`, with `ide.js` and
  `assets/aCelery.zip` rebuilt.
- **Results.**
  - Dart: 178 pass.
  - Node: 105 pass.
  - `flutter analyze`: clean.
  - Not checked on a device.
