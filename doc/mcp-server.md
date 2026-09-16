# aCelery — an MCP server inside the app

Supersedes `doc/modernization-assessment.md` Addendum 3, which proposed a
separate program on a developer's machine driving the phone over HTTP.

## 0. Verdict

The MCP server is **a route on the server aCelery already runs**: `/mcp`, on
port 8123, behind the same access gate as everything else. An assistant on the
same network connects to the phone directly and creates, inspects, runs and
debugs mini-apps. Nothing is installed on a computer, and nothing is exposed to
the internet.

This is Addendum 3's option C, which it dismissed because "MCP is
conventionally a separate process". That reasoning predates the Streamable HTTP
transport: a server reachable over HTTP is now ordinary, and for aCelery it is
the only shape that keeps the product self-contained — the app is the product,
and a phone that needs a desktop helper to be programmable is not.

The cost is stated plainly in §2: **Claude Desktop cannot reach a phone on a
home network without a small local bridge**, because its connectors come from
Anthropic's cloud.

## 1. What changed since Addendum 3

- Apps are Preact + htm + the `acelery/*` modules, not xScript. The
  "auto-generate a framework reference from `xscript*.js`" work item is gone
  (`js-ui-framework-evaluation.md` §6.1).
- Access control exists: pairing, per-device tokens, and an off-by-default
  network switch (`lib/src/server/access_control.dart`).
- Its Topology A and B both put the server on a desktop. Both are dropped.
- `tool/serve.dart` runs the real server on a desktop, which is now a **test
  harness**, not a product topology.
- M0 landed (§14): database paths are confined, the token store moved out of
  the served tree, and handles can be opened read-only.

## 2. Reach: which clients can connect

Verified against Anthropic's documentation on 2026-09-15.

| Client | Path to the phone | Works |
|---|---|---|
| Claude Code | `claude mcp add --transport http aCelery http://<phone>:8123/mcp --header "Authorization: Bearer <token>"` | Yes, directly |
| Editors and harnesses that dial out from the machine | the same URL | Expected; untested |
| A browser-based tool on the same LAN | the same URL, plus the Origin rule in §3 | Yes |
| Claude Desktop | its config accepts only local programs, so `npx mcp-remote http://<phone>:8123/mcp` | Yes, through that bridge |
| claude.ai, Claude mobile, Cowork | connectors originate in Anthropic's cloud and need a public address | **No** |

Anthropic's help article states it directly: "Claude connects to your remote MCP
server from Anthropic's cloud infrastructure, rather than from your local
device", and that this holds for Claude Desktop too. A tunnel or a forwarded
port would close that gap, and both are rejected: they are not viable for
someone who just wants to make a small app for themselves, and they would put a
phone holding personal databases on the public internet.

So aCelery supports clients that connect from the same network, and documents
the one-line `mcp-remote` bridge for Claude Desktop. Nothing in the tool surface
changes if a public path is ever added; only the way in would.

## 3. Transport

`/mcp` on the existing shelf server (`lib/src/server/acelery_server.dart:113`),
so there is one socket, one gate, and one address to tell a client about.

- **Streamable HTTP.** `POST /mcp` carries one JSON-RPC request and returns one
  JSON response. `GET /mcp` answers 405 until something needs to push.
- **No SSE at first.** Nothing in the tool surface is server-initiated. Adding
  a stream later changes the transport, not the tools.
- **Session.** `Mcp-Session-Id` is issued on `initialize` and required
  afterwards, so a dropped client cannot resume into another's state.
- **`MCP-Protocol-Version`** is echoed and checked.
- **Origin.** A request carrying an `Origin` header is refused. A page in the
  WebView, or any site the user happens to visit, must not be able to drive the
  MCP server; this is the DNS-rebinding defence the MCP specification calls
  for, and the gate's cookie would otherwise be enough to pass.

Methods: `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`,
`resources/read`, `resources/templates/list`, `prompts/list`, `prompts/get`.
Notifications are accepted and ignored.

Implementation lives in `lib/src/mcp/`: `transport.dart` (JSON-RPC over shelf),
`server.dart` (method dispatch, capabilities), `tools/*.dart`, `resources.dart`.

## 4. Authorization

An MCP client is not a browser, so the pairing flow in
`access_control.dart` — a page, a code, a cookie — does not fit it.

- **A token is always required on `/mcp`,** including over loopback. Everything
  else keeps today's rule that loopback is trusted. A user app running in the
  WebView can already reach the file and SQL bridges, so this is not an
  escalation, but a page has no business driving the MCP server and the check
  is one line.
- **`Authorization: Bearer <token>`.** `AccessControl` learns to read a bearer
  token as well as its cookie, into the same device table, with each entry
  recording whether it is a browser or a client.
- **Minted in the app.** Network access (`network_access_sheet.dart`) gains
  "Connect an assistant": it shows the URL and a freshly minted token once, to
  copy, and lists it afterwards with the paired devices, revocable with the
  same button.
- **Sharing must be on** for a client on the network, exactly as for a browser.
- Over `adb forward`, the request is loopback but the token still applies: copy
  it once from the sheet.

## 5. Tool surface

Tools call the bridges in-process — `FileBridge`, `SqlBridge` — rather than
looping back through HTTP. Every tool declares its annotations
(`readOnlyHint`, `destructiveHint`), and writes are confined to `www/user/` and
`db/` on top of the bridge's own confinement.

**Authoring**

| Tool | Behaviour |
|---|---|
| `list_apps` | every folder under `www/user/` with its manifest |
| `read_app` | manifest, file list with size and mtime, text contents capped at 200 KB per file |
| `create_app` | the shared scaffold (§7, P5) |
| `write_file` | text only — the bridge reads and writes strings, so no PNGs — with an `expected_mtime` precondition, returning the new mtime |
| `delete_file`, `delete_app` | destructive |

**Run and debug**

The old plan ran apps in a headless Chrome on the developer's machine. On the
phone they run where they will actually run, in the device WebView, which is
better evidence and harder plumbing (§7, P3 and P4).

| Tool | Behaviour |
|---|---|
| `run_app` | opens the app on the device, as `RunAppMessage` does today, and returns once loaded with whatever the console produced |
| `console` | the ring buffer for the current run, with stacks |
| `eval` | `runJavaScriptReturningResult` in the running app's WebView |
| `dom` | `outerHTML` or an element's text, capped — the stand-in for a screenshot until §13.4 is settled |
| `close_app` | returns to the shell |

`launcher.html`'s `fail()` already reports the three startup failures — the
module would not load, it exports no entry function, it threw — through
`console.error` and a visible alert, so `run_app` can classify a failed start
without new instrumentation.

**Data**

| Tool | Behaviour |
|---|---|
| `list_databases` | `db/`, journals excluded |
| `query_db` | read-only handle (M0, S3), 200 rows, bound parameters |
| `exec_db` | destructive; bound parameters |

## 6. Resources and prompts

- `acelery://guide` — how to write an aCelery app: the folder layout, the
  manifest, `export default main`, the import-map names, the async capability
  API, theming, and what a browser on the network cannot do. Shipped as a file
  in the bundle, so it is edited with everything else and served from the
  installed tree.
- `acelery://api/{module}` — the reference for aCelery's own layer, generated
  at build time and committed like the other build output. Preact and
  react-bootstrap need no reference; `openDB`, `Form`, `Input`, `TableMaint`,
  `Panel`, `useDismiss` and `applyTheme` do.
- `acelery://apps/{app}/{file}` — live project files; the Example app is the
  worked template.
- Prompt `create_acelery_app(idea)` — pins the contract and points at both.

## 7. What the app must gain

- **P1. The transport and the route** (§3), with the Origin and session rules.
- **P2. Client tokens** (§4): `AccessControl` reads bearer tokens, and Network
  access mints, shows and revokes them.
- **P3. Console capture.** Today a page's console reaches only `debugPrint`
  (`acelery_web_view.dart:63`), and `errorlog.html` calls `xGetLogCatFormated`,
  for which no route exists — the page is dead. Extend `hostShim`
  (`host_bridge.dart:129`) to forward `console.*`, `window.onerror` and
  `unhandledrejection` to the host channel, into a bounded ring buffer per run.
  That works on both platforms, unlike the Android-only console callback, and
  it gives `errorlog.html` something real to show.
- **P4. Events from server to shell.** Messages flow page → host today. A
  `run_app` tool needs the reverse: a stream on `ACeleryRuntime` the app root
  listens to, pushing `UserAppScreen`, plus a registry holding the active
  `ACeleryWebViewState` so `eval` and `dom` can reach it.
- **P5. One scaffold, two languages.** `web/src/ide/scaffold.js` was made
  import-free so Node could load it; the server is Dart, so that no longer
  helps. The templates and rules move to files in the bundle
  (`www/system/scaffold/`), read by the Dart tool from the installed tree and
  by the IDE over HTTP, with a test that both produce the same app.
- **P6. Availability.** The server dies with the app. On Android a foreground
  service would keep a session alive while the screen is off (M4); on iOS it
  cannot, so an MCP session lasts only while aCelery is on screen. That is the
  background-serving question, unchanged.

## 8. Phasing

- **M1 — authoring.** P1, the authoring and data tools, and the guide resource.
  *Done, 2026-09-16 (§15). M1 also took P5 and the token half of P2.*
  Usable from Claude Code over `adb forward`, with a token.
- **M2 — the network.** P2, the Network access UI, and the documented
  `mcp-remote` line for Claude Desktop.
- **M3 — run and debug.** P3, P4, and the run tools. The screenshot spike
  (§13.4) is decided here.
- **M4 — optional.** The Android foreground service, the generated API
  reference, the IDE's "changed outside the editor" guard, and the revived
  error log.

## 9. Tests

- **Transport:** the `initialize` handshake, `tools/list`, a successful and a
  failing `tools/call`, an unknown method, a malformed body, a missing session.
- **Authorization:** no token is 401; a cookie alone is 401; a request with an
  `Origin` header is refused; a revoked token stops working.
- **Tools:** against a temporary tree, as `bridge_test.dart` does — create,
  read back, the mtime precondition refusing a stale write, deletion, and the
  SQL tools refusing a `../` database name.
- **Console:** the shim, in jsdom, forwarding an error with its stack.
- **Scaffold:** one app from the Dart tool and one from the IDE, compared.

## 10. Verification

1. `flutter test test/`, `cd web && npm test`, `flutter analyze`.
2. Emulator, `adb forward tcp:8123 tcp:8123`, Claude Code with the token:
   create an app, run it, read the console, fix an error from the stack.
3. A real phone over Wi-Fi with sharing on: the same loop, then revoke the
   token in Network access and confirm the next call fails.
4. Claude Desktop through `npx mcp-remote`, once, to confirm the documented
   line works.
5. iOS simulator, when iOS is first exercised: the Mac reaches the simulator on
   loopback, so no pairing should be needed. Untested, like everything on iOS.

## 11. Security model

- A client token is a full key to the tree: files, databases and JavaScript in
  the app's WebView. It is minted, shown once and revoked in the app, on the
  device the user is holding.
- The Origin rule keeps pages out of `/mcp`; `eval` runs only in aCelery's own
  WebView.
- The HTTP proxy (`opt=http`) is not exposed as a tool.
- Every tool call is appended to `log/mcp.log` with its time, tool and target,
  so the user can see afterwards what was done.
- Tool results — file contents, rows, console text — are untrusted data
  returned to a model. The guide says so.

## 12. Non-goals

- Public connectors, tunnels, forwarded ports and OAuth (§2).
- Running while the phone is locked, or on iOS in the background.
- Binary asset writes.
- Screenshots, until §13.4 says otherwise.
- A published npm package; the `mcp-remote` bridge is someone else's.

## 13. Decisions (open, with recommendations)

1. **Transport: hand-rolled on shelf, or `mcp_dart`?** `mcp_dart` (pub.dev,
   leehack.com, 2.4.2) has a Streamable HTTP server transport and supports
   Flutter, but it expects to own an HTTP server, and `/mcp` must sit inside
   the existing one, behind the gate. *Recommended: hand-roll the JSON-RPC
   layer on shelf; revisit if `mcp_dart` exposes a request-level entry point.*
   Google's `dart_mcp` does not support HTTP at all.
2. **Require a token even on loopback?** *Recommended: yes.*
3. **Console capture through the injected shim, or the platform callback?**
   *Recommended: the shim — it works on iOS too and carries stacks.*
4. **Screenshots.** `webview_flutter` exposes no snapshot;
   `RepaintBoundary` over a platform view is uncertain on Android, and
   WKWebView's own `takeSnapshot` is not surfaced. *Recommended: a timeboxed
   spike in M3; ship `dom` meanwhile.*
5. **Scaffold as bundle templates** (P5). *Recommended: yes.*
6. **Android foreground service.** *Recommended: defer to M4.*
7. **Claude Desktop.** *Recommended: document the `mcp-remote` line; write no
   bridge of our own.*

## 14. M0: implemented (2026-09-15)

M0 predates the move into the app and stands unchanged: it is server hardening
the MCP work depends on either way. Commit `afe491e`. Each defect was
reproduced over HTTP by a failing test before it was fixed.

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
- **S3: read-only handles.** `opendb&readonly=true` maps to
  `OpenDatabaseOptions(readOnly: true)`. A write through such a handle gets a
  500 carrying SQLite's "readonly" message, and a missing file answers 500
  rather than being created. This is what `query_db` opens.
- **S4: `tool/serve.dart`.** `--root`, `--port` and `--ready-file`, plus
  SIGTERM shutdown. The ready signal is a file, written aside and renamed,
  because `dart run` prints "Running build hooks..." to stdout without a
  newline. A persistent root stamps the bundle with the zip's size and mtime,
  so it reinstalls only when the zip changes. Smoke-tested twice over one root:
  the bridge answered, an escaping `opendb` gave 500, SIGTERM exited 0 and
  removed the ready file, and the second start did not reinstall. This is now
  a desktop test harness rather than a topology.
- **Scaffold.** `web/src/ide/scaffold.js` holds `ENTRY`, `NAME_PATTERN`,
  `nameProblem`, `descriptionProblem`, `projectName`, `manifestText` and
  `entryModule`; `store.js` and `code_screen.js` use it, with the rules and
  messages unchanged. Its import-free shape was for Node, and P5 replaced it
  in M1 (§15).
- **Bundle.** `bundleVersion` is `1.6.3+mcp-m0`, with `ide.js` and
  `assets/aCelery.zip` rebuilt.
- **Results.** Dart 178 pass, node 105 pass, `flutter analyze` clean. Not
  checked on a device.

## 15. M1: implemented (2026-09-16)

`/mcp` serves MCP from inside the app. Claude Code connected to it on the
emulator over `adb forward`.

**Where M1 departed from the plan above:**

- **P5 moved into M1.** `create_app` needs the scaffold, so the scaffold is now
  in the bundle.
  - `www/system/scaffold/` holds two files: `scaffold.json`, with the entry,
    the name pattern, the description limit and the messages; and
    `main.js.template`, with a `{{name}}` placeholder.
  - `web/src/ide/scaffold.js` is `scaffoldFrom(rules, templates)` plus
    `loadScaffold()`. The IDE fetches the files over HTTP, and Code loads
    them before the New project sheet can open.
  - `lib/src/mcp/scaffold.dart` reads the same files from the installed tree.
- **The token half of P2 moved into M1.** M1 promised "with a token", and a
  token needs somewhere to come from.
  - `AccessControl.mintClient()` creates a token. `checkClient()` gates `/mcp`,
    and `bearerOf()` reads the header.
  - `PairedDevice` gained `kind` (`browser` or `client`) and `label`.
  - Network access gained a "Connect an assistant" row. It mints a key and
    shows the address, the key and the `claude mcp add` line once, each with a
    copy button. Clients appear in the device list and are revoked like
    browsers.
  - Still for M2: a real phone over Wi-Fi, the `mcp-remote` line for Claude
    Desktop, and naming a client.
- **Two extra tools.** `read_file` reads one file without the whole app.
  `get_guide` returns the guide to clients that cannot read resources.
- **File tools use `dart:io`, not `FileBridge`.** The bridge swallows failures
  into empty strings, as the Java original did, but a tool has to say why a
  write failed. The confinement is the same `ACeleryPaths.isInside` check,
  applied to the app's own folder. The SQL tools do go through `SqlBridge`.

**What the gate does** (`ACeleryServer._mcp`):

- It refuses any request with an `Origin` header (403), before looking at the
  token.
- It requires a client token as a bearer header on loopback too. A browser's
  cookie does not count, and neither does a browser's token sent as a bearer.
- It gives a network peer 403 while sharing is off.
- It answers 401 with `WWW-Authenticate: Bearer`, and never raises a pairing
  prompt.
- A client token in a cookie is not a pairing either.

**What the transport does** (`lib/src/mcp/transport.dart`):

- **Requests.** It accepts one JSON response per POST. Batches get 400, a
  non-JSON content type gets 415, and a body over 8 MB gets 413.
- **Sessions.** `initialize` issues `Mcp-Session-Id`. A missing session gets
  400. An unknown session, or one opened with a different token, gets 404.
  `DELETE` ends a session.
- **Versions.** It supports `2025-11-25`, `2025-06-18` and `2025-03-26`, and
  refuses an unsupported `MCP-Protocol-Version` header.
- **Other messages.** GET gets 405. Notifications and client responses get
  202.
- **Lifetime.** Sessions live on the `ACeleryServer`, so they survive the
  rebind when sharing is toggled. At most 32 are kept, and the least recently
  used goes first.

**Tools and data.**

- **Stale writes.** `write_file` refuses to replace an existing file without
  `expected_mtime`, and refuses if the mtime moved.
- **Read-only queries.** `query_db` opens a read-only handle (M0, S3), returns
  at most 200 rows with `rowCount` and `truncated`, and describes BLOBs by
  size.
- **Change counts.** `exec_db` measures `total_changes()` and
  `last_insert_rowid()` before and after the statement. On Android, sqflite
  reported `CREATE TABLE` on a fresh database as one change with rowid 1. The
  desktop test engine never showed that, and the emulator did.
- **ATTACH.** Both SQL tools refuse `ATTACH` and `VACUUM INTO`, with literals
  and comments stripped first.
- **Tool failures** come back as `isError` results, and only an unknown tool
  is a protocol error.
- **The log.** Every call is appended to `log/mcp.log`, one tab-separated line
  each, rolling over at 1 MB.
- **Resources.** `acelery://guide` is `www/system/mcp/guide.md`.
  `acelery://apps/{app}/{+path}` reads any app file, up to 2 MB. Prompt
  `create_acelery_app(idea)` embeds the guide.

**Found, not fixed:**

- **ATTACH on the page bridge.** `/android.itf` still lets a page `ATTACH` a
  database by absolute path. Over HTTP on the desktop, `opt=sql&action=run`
  with `attach database '<tmp>/outside.db' as o` and then `create table o.t`
  both answered 200, and the file existed outside the tree. That gets around
  M0's S1. The MCP tools refuse it; the bridge does not.

**Tests.**

- `test/mcp_test.dart`, 51 tests: transport, authorization, the gate from a
  network peer, the authoring tools, the data tools, `refuseAttach`, and
  resources and prompts.
- `test/mcp_scaffold_test.dart` runs the same names and descriptions through
  Dart and through `scaffold.js` under node, and compares the apps they make.
  It is skipped without node.
- `web/test/ide_shell.test.js` creates a project through the sheet from the
  fetched scaffold.
- Two tests were confirmed to fail without their fix: the ATTACH test with
  the guard removed, and the scaffold comparison with Dart's description
  default changed.

**Bundle.** `bundleVersion` is `1.6.4+mcp-m1`. `ide.js` and
`assets/aCelery.zip` were rebuilt.

**Results.**

- Dart 230 pass, node 105 pass, and `flutter analyze` is clean.
- **Emulator** (Android API 36, a debug APK, `adb forward`):
  - Without a token, `/mcp` answered 401.
  - "Connect an assistant" showed the key.
  - With the key, `initialize` agreed `2025-06-18`, with version
    `1.6.4+mcp-m1`, and `tools/list` listed 11 tools.
  - `create_app`, `list_apps`, `read_file`, `exec_db` and `query_db` worked.
    `query_db` refused an INSERT with `SQLITE_READONLY`.
  - `resources/read acelery://guide` worked, and `log/mcp.log` recorded each
    call.
  - `claude mcp list` reported the server `✔ Connected`.
  - The test app and databases were deleted afterwards.
- **Not done:** a revoke on the device (it is covered in tests), a real phone
  over Wi-Fi, Claude Desktop, and iOS.
