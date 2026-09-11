# aCelery — Modernization & Deprecation Assessment

**Date:** 2026-09-10
**Scope:** Android host app only (`src/com/microtux/acelery/*`, build config, manifest).
**Method:** deprecation-annotated compile (`-Xlint:deprecation`), Android lint (`lintDebug`),
and live probing of the running app on an API 36 emulator.

> **Note on scope.** aCelery's actual application logic is *not* in this Android
> project. The host app is a thin shell: a `WebView` + a JavaScript bridge
> (`aCeleryAndroidInterface`) + an embedded HTTP server. The product — a
> platform for users to build and run their own JavaScript mini-apps — lives in
> the web bundle at `assets/aCelery.zip`, which this assessment does **not**
> cover. Everything below concerns the native host only.

---

## Architecture recap (as verified)

- `ACeleryActivity` / `ACeleryUserAppActivity` host a `WebView` that loads
  `http://localhost:8123/...`.
- `ACeleryBackground` is a foreground `Service` running an embedded HTTP server
  (`aCeleryResponseThread`) on port **8123**.
- The server does two jobs: (a) serve the static web bundle extracted from
  `assets/aCelery.zip` into internal storage, and (b) expose an API at
  `/android.itf` that bridges to native capabilities — SQLite, filesystem,
  HTTP proxy, project import/export, wake-lock.
- **By design**, the server is reachable from other machines on the network so a
  user can run their created apps from a browser on a different device.

---

## Findings, ordered by impact

### 1. `org.apache.http.*` — the single biggest liability

This accounts for ~80+ of the deprecation warnings. The **entire networking
layer, both client and server, is built on it**:

| Location | Apache API used | Role |
|---|---|---|
| `aCeleryResponseThread` | `DefaultHttpServerConnection`, `BasicHttpParams`, `HttpEntityEnclosingRequest` | the embedded HTTP **server** |
| `aCeleryAndroidInterface`, `ACeleryActivity` | `DefaultHttpClient`, `HttpGet`, `HttpPost`, `UrlEncodedFormEntity`, `BasicNameValuePair` | the HTTP **client** (proxy/fetch feature) |

Apache HTTP was **removed from the Android framework at API 23** (2015). It only
compiles today because the Gradle migration added `useLibrary
'org.apache.http.legacy'`. That legacy library is an *optional, unmaintained*
system component and is the piece most likely to be dropped in a future Android
release — when it goes, this code stops compiling *and* running, with no
migration path left.

**Recommendation**
- *Client side* (easy): replace `DefaultHttpClient` / `HttpGet` / `HttpPost`
  with `HttpURLConnection` (no dependency) or OkHttp. ~3 methods.
- *Server side* (harder): the app embeds a hand-rolled HTTP/1.0 server on
  `DefaultHttpServerConnection`. Either reimplement request parsing on raw
  sockets, or adopt **NanoHTTPD** — a single-file embedded server that fits this
  "serve local files + handle API routes" pattern almost exactly.

---

### 2. Network exposure needs access control (security) — *intentional feature, currently unauthenticated*

The open-to-the-network server is a **deliberate feature** (remote access to
user apps), so the goal is not to close it but to gate it. As it stands it is
ungated, which I verified live:

- `new ServerSocket(8123)` binds to **`0.0.0.0`**. Confirmed reachable from the
  device's LAN address `10.0.2.15`, not only `localhost`.
- The `/android.itf` API has **no authentication**. Over the LAN interface,
  `action=opendb` returned a live handle `{"handle": "1"}` into the SQLite
  layer. The same router exposes `exec` (arbitrary base64-encoded SQL) and a
  file interface.
- The file interface accepts a caller-supplied `bpath`
  (`path = bpath + "/" + path`) with no confinement — an absolute `bpath`
  reads/writes anywhere the app's UID can.

So today, any device on the same Wi-Fi can reach this app's database and files.

**Recommendation — add an authorization layer for *external* connections**

The natural model, matching the agreed "allow on first outside connection" idea:

1. **Distinguish local from remote.** Connections from the loopback address
   (the app's own WebView) are trusted implicitly. Only non-loopback peers go
   through the gate.
2. **First-connection approval.** On the first request from a new external
   client, show an in-app "Allow this device to connect?" dialog (show the
   peer IP). Remember the decision.
3. **Issue a token on approval.** Hand approved clients a session/pairing token
   (cookie or header) that must accompany subsequent requests, so approval
   can't be spoofed by another host once one is allowed.
4. **Confine the filesystem/SQL surface.** Reject absolute or `..`-escaping
   `bpath`/`path` values; resolve everything under the aCelery root and verify
   the canonical path stays inside it (the same guard already added to
   `aCeleryUnzip`). Path traversal via `..` in URLs is currently neutralized
   only incidentally, because `java.net.URL` normalizes it — not by design.
5. **Optional:** a user setting to disable remote access entirely (bind
   loopback-only) for users who only run apps on the device itself.

**Related architecture smell:** `ACeleryBackground` calls `responseThread.run()`
instead of `.start()`, so requests are handled **serially on the accept
thread** — the server is not actually concurrent. Worth fixing alongside any
server rework.

---

### 3. `targetSdk 28` — Google Play will reject it (lint: **Fatal** `ExpiredTargetSdkVersion`)

Set to 28 during the Gradle migration to get the app running without new
platform obligations. Fine for sideloading; Play currently requires ~34+.
Raising it is the real modernization work and pulls in, in order:

- **API 29 scoped storage** — largely handled (everything now lives in internal
  storage), but the `DownloadManager` paths and any `bpath` filesystem access
  need review.
- **API 33 `POST_NOTIFICATIONS`** — the foreground-service notification needs
  this permission requested at runtime.
- **API 34 foreground-service type** — `android:foregroundServiceType` plus a
  policy justification. This is the biggest new hurdle for an always-on local
  server.

---

### 4. Smaller deprecated APIs (low effort each)

| API | File | Modern replacement |
|---|---|---|
| `android.preference.PreferenceManager` | `ACeleryActivity:84` | `androidx.preference` or direct `getSharedPreferences` |
| `WebViewClient.shouldOverrideUrlLoading(WebView, String)` | `ACeleryWebViewClient:11` | the `WebResourceRequest` overload |
| `WebChromeClient.onConsoleMessage(String,int,String)` | both activities | the `ConsoleMessage` overload |
| `Intent.EXTRA_SHORTCUT_*` (home-screen shortcuts) | `ACeleryUserAppActivity` | `ShortcutManagerCompat` — the old broadcast **silently does nothing** on modern launchers |
| `DownloadManager.allowScanningByMediaScanner()` | both activities | no-op now; delete |
| `WakeLock` no tag / no timeout | `InvalidWakeLockTag`, `WakelockTimeout` | valid tag + timeout, or drop |
| `editor.commit()` on UI thread | `ApplySharedPref` | `apply()` |

---

### 5. Build / project hygiene

- **Java 8 language level** on AGP 8 / JDK 21 — can move to Java 11/17 for
  `try-with-resources`, `var`, etc.
- **`minSdk 21`** (2014) could rise to ~24+ to shed legacy paths; lint reports 5
  `ObsoleteSdkInt` checks for API levels below the current floor that can just
  be deleted.
- Manual notification / `PendingIntent` plumbing works but is verbose; AndroidX
  offers cleaner idioms.

---

## Lint summary (debug)

| Severity | Issue | Count |
|---|---|---|
| Fatal | `ExpiredTargetSdkVersion` | 1 |
| Error | `SuspiciousIndentation` | 9 |
| Error | `InvalidWakeLockTag` | 2 |
| Error | `MissingTranslation` | 2 |
| Warning | `NonConstantResourceId`, `ObsoleteSdkInt`, `RtlHardcoded`, `UnusedResources`, `ApplySharedPref`, others | ~50 |

`MissingTranslation` (2) and `RtlHardcoded` (2) are cosmetic; the indentation
errors are style-only (from the original Eclipse formatting).

---

## Suggested sequencing

1. **Now — low-risk, high-value:** add the external-connection authorization
   layer + filesystem confinement (#2), swap the *client* Apache calls to
   `HttpURLConnection` (#1), clear the trivial deprecations (#4). No behavior
   change for the end user; closes the open security gap.
2. **Next:** replace the Apache-based *server* with NanoHTTPD (#1) — the biggest
   single de-risking move; makes the concurrency fix and access-control
   integration natural.
3. **Then, if Play distribution is a goal:** the `targetSdk` climb to 34+ with
   its permission / foreground-service-type work (#3).

If distribution is not a goal and this stays a sideloaded tool, work can stop
after step 1 — the app is functional and the only *ticking* dependency is the
Apache legacy library.

## Caveats

- The network exposure and client/server Apache usage were verified directly on
  a running build. The ~2,200-line interface layer was **not** audited
  line-by-line for other injection points; the `exec` / `bpath` surface
  warrants a dedicated security pass before this faces untrusted networks.
- The JavaScript application inside `assets/aCelery.zip` is out of scope and
  unreviewed. Any auth/token model added on the native side must be matched by
  corresponding changes in that web bundle.

---

# Addendum — the JavaScript bundle (`assets/aCelery.zip`)

Examined from the extracted copy in `aCelery_content/`. This is the actual
product; the Android project is just its host. ~7 MB total, ~2.6 MB of which is
the CodeMirror editor and ~3.3 MB CSS/icon assets.

## Layout

| Path | Role |
|---|---|
| `www/index.html` | trampoline → redirects to `/system/index.html` |
| `www/system/index.html` | **the system shell**: aCelery IDE (code editor), app launcher, DB Manager, Configure — all in one 36 KB page |
| `www/tools/js/xscript.js` | **the framework core** — the `x*` widget/DOM library + the native-interface abstraction |
| `www/tools/js/xscript_bootstrap.js` | Bootstrap-flavoured widgets (`xb*`: navbars, modals, tabs, panels) |
| `www/tools/js/xscript_crud.js` | higher-level CRUD engine (`xbTableMaint`, `xbField`, validators) |
| `www/tools/codemirror/` | the in-app code editor for writing apps |
| `www/user/<AppName>/` | one folder per user app: `acelery_app.json` (name+description) + `.js` / `.css` / assets |
| `www/user/Example/` | the shipped sample app |

## How a user app is structured

An app is a folder under `www/user/` with:
- `acelery_app.json` — `{"name": ..., "description": ...}`
- a `.js` file exposing a **`main()`** entry point (see `Example/example.js`)
- optional `.css` and image assets

`main()` builds a UI by composing framework objects — e.g.
`new xbNavBar(...)`, `new xbLayout(2,1)`, `new xbTableMaint(db,...)` — and
talks to device capabilities through `new xSQL()`, `new xFile()`,
`new xHTTP()`, `new xExportFile()`. It's a fluent, jQuery-era builder API.

## The key architectural finding: a dual-mode native bridge

This is the crux, and it directly explains the network-server design. Every
capability call in `xscript.js` branches on whether the native bridge object is
present:

```js
xSQL.prototype.sqlExec = function(q){
   if (typeof Android != "undefined"){
      Android.xSqlExec(this.dbHandle, q);          // (a) running IN the WebView
   } else {
      var q = "opt=sql&action=exec&handle=" +      // (b) running in a REMOTE browser
              this.dbHandle + "&query=" + btoa(q);
      this.getRemoteInterface(q);                  // → XMLHttpRequest to /android.itf
   }
}
```

- **(a) Local mode:** inside the device WebView, `Android` (the
  `@JavascriptInterface` object) exists, so calls go straight through the fast
  in-process JVM bridge.
- **(b) Remote mode:** in a browser on another machine, `Android` is undefined,
  so the same call is re-encoded as an HTTP request to `/android.itf?opt=...`
  against the embedded server (`xInterface`, base URL `/android.itf?`).

**Both modes hit the identical native capability surface** — SQLite `exec`,
filesystem read/write, etc. The open HTTP server is not incidental; it *is* the
remote transport that lets `xSQL`/`xFile`/`xHTTP` work unchanged from an
off-device browser.

### Security consequence (ties back to §2 of the main assessment)

The remote `/android.itf` endpoint is the same SQLite/filesystem surface as the
in-process bridge, exposed to the network **with no authentication**. This
confirms why access control belongs at the server boundary, and clarifies the
shape any fix must take:

- The **first-connection approval + pairing token** model must be enforced in
  the native server (`aCeleryResponseThread`) for non-loopback peers.
- The **web bundle must cooperate**: `xInterface` (in `xscript.js`) is the one
  chokepoint through which every remote call flows, so a token only needs to be
  attached there — e.g. read it once from a cookie/localStorage after pairing
  and append it to every `/android.itf?` query. That's a small, localized change
  in exactly one place.
- `bpath` confinement (§2) applies equally here: `xFile`/`xSQL` forward a
  caller-supplied base path straight to native.

## Web-bundle modernization notes (separate from the Android host)

These are about the shipped web assets, not the APK. Lower urgency — the bundle
is self-contained and offline, so nothing "breaks" on its own — but relevant if
the framework is ever revived:

| Component | Bundled version | Status |
|---|---|---|
| jQuery | **1.8.3** (2012) | long EOL; many known XSS/prototype CVEs |
| jQuery Mobile | **1.4.3** | project discontinued (2021) |
| Bootstrap | **3.2.0** (2014) | EOL; v5 is current |
| Font Awesome | **4.0.3** | very old; v6 is current |
| CodeMirror | 5.x-era | superseded by CodeMirror 6 |

Observations on the framework itself:
- Pure prototype-based JS, no modules/bundler — fine for its era, but no
  dependency management or tree-shaking (ships the *entire* CodeMirror mode set).
- Remote calls use **synchronous** `XMLHttpRequest` (`open(..., false)`), which
  is deprecated in browsers and blocks the UI thread. A modern rewrite would use
  `fetch`/async.
- Uses `btoa()` to encode SQL — that's transport encoding, **not** escaping;
  queries are built by string concatenation, so app-authored SQL injection is
  possible within a user's own app (low risk — it's the author's own data — but
  worth noting if apps are ever shared between users).

**Bottom line:** the web bundle is coherent and well-structured for a 2014
jQuery-era framework, and it is the real application. It doesn't need to change
to keep the app working. If the platform is revived, the highest-value web-side
change is adding the pairing token in `xInterface` (small, security-critical);
a full library refresh (jQuery/Bootstrap/CodeMirror) is a larger, optional
modernization that only matters if the framework itself is actively developed.

---

# Addendum 2 — Feasibility of a Flutter port (Android + iOS)

Assesses reimplementing aCelery in Flutter to ship both an Android and an iOS
version. Short version: the WebView product ports almost for free and Flutter
would *retire the Apache-HTTP liability* as a side effect — but iOS imposes one
hard platform limit on the always-on server that **no framework choice can work
around** (a native Swift rewrite would hit the identical wall).

## Verdict at a glance

| Part of the app | Flutter feasibility |
|---|---|
| WebView + the entire JS framework (`xscript.js`, IDE, user apps) | **High** — runs essentially unchanged |
| Embedded HTTP server + SQLite/file/HTTP bridge (in Dart) | **High** — cleaner than today's Java; removes the Apache dependency |
| **Always-on server reachable from another machine** | **Android: yes. iOS: foreground / screen-on only** |
| Home-screen shortcuts to user apps | Android: yes. iOS: no equivalent |

The only genuine problem is remote access on iOS, and it is an **iOS platform
limitation, not a Flutter one** — so Flutter costs nothing versus native iOS.

## What ports easily

- **The ~7 MB web bundle is portable as-is.** `xscript.js`, the CodeMirror IDE,
  `xscript_crud.js`, and everything under `www/user/` are pure HTML/JS/CSS and
  run in any WebView. Flutter uses `webview_flutter` (official) or
  `flutter_inappwebview` (more capable); on iOS that is WKWebView. This is the
  bulk of the codebase and needs **no rewrite**.
- **The native shell reimplements cleanly in Dart and modernizes as it goes:**
  - HTTP server → `dart:io` `HttpServer`. **This eliminates the
    `org.apache.http.legacy` problem (§1) entirely** — Dart's server is
    first-class and cross-platform.
  - SQLite → `sqflite` (both platforms).
  - Filesystem → `path_provider` + `dart:io` (both platforms, sandboxed).
  - HTTP proxy (`xHTTP`) → Dart `HttpClient` / `package:http`.
  - The rewrite target is `aCeleryAndroidInterface.java` (728 lines) +
    `aCeleryResponseThread.java` (574 lines) → Dart. Moderate, bounded.

### Bridge friction, and why the existing design absorbs it

The current JS calls the native bridge **synchronously**
(`Android.xSqlOpen(...)` returns a handle immediately). Flutter's JS↔Dart
bridges are **asynchronous**. The dual-mode design (Addendum §"dual-mode native
bridge") sidesteps this: the framework already has a *remote* path that talks to
the local server over XHR. On Flutter, route **all** capability calls — even
local ones — through the local server at `127.0.0.1` and drop the JS bridge
entirely; you always take the existing `else` branch. (It uses synchronous XHR,
deprecated-but-functional; making `xInterface` async is the clean follow-up.)

## The real constraint: iOS background execution

On Android, `ACeleryBackground` is a **foreground service** that keeps the
server alive so remote browsers connect even when aCelery is not in front. **iOS
has no equivalent.** iOS suspends backgrounded apps within seconds; its
background modes (audio, location, VoIP, …) do not legitimately cover "run a TCP
server," and audio-trick workarounds get rejected at App Review.

**Consequence:** on iOS the server runs only while the app is **open and the
screen is on**. Lock or background the device and it stops. For "run your apps
from a browser on another machine," that is a serious limitation — and it is
intrinsic to iOS, not to Flutter.

Ways to live with it:
1. **Accept it** — on iOS, remote access is a foreground "session" mode (app
   open, screen kept awake via `wakelock_plus`). Honest and App-Store-safe.
2. **Local-only on iOS** — ship iOS as an on-device app runner; drop remote
   there. Clean but asymmetric.
3. **Move the server off-device** (companion/cloud) — changes the product's
   nature (data leaves the device); not recommended as the default.

## App Store risks to weigh before committing

- **User-authored code execution:** Apple restricts apps that download/run code,
  but there is an established carve-out for interpreted code running in a
  WebKit / JavaScriptCore context (how Scriptable, coding playgrounds, etc.
  exist). aCelery runs user JS inside a WebView, so it likely qualifies — but
  "programming environment" apps draw extra review scrutiny. A known risk, not a
  blocker.
- **Home-screen shortcuts:** the Android "install shortcut" feature has no iOS
  equivalent (iOS offers only Siri Shortcuts / App Clips, a different model).
  Minor feature loss.

## Effort shape

| Piece | Effort |
|---|---|
| Web bundle | ~0 (optional: async `xInterface`, refresh EOL libs — see Addendum) |
| Dart shell: server + SQLite/file/HTTP bridges + WebView host | a few weeks to Android parity |
| iOS | shared code; the work is background-limitation design + App Review, not Dart |

## Recommendation

Flutter is a **good fit** and arguably a better modernization path than staying
native-Android: it delivers iOS *and* retires the Apache-HTTP liability in one
move, while the real asset — the JS framework — carries over untouched. It also
subsumes most of the main assessment's Android modernization backlog (§1, §3,
§4) by replacing that layer wholesale.

The decision hinges on **one product question, not a technical one:** how
central is *remote-access-while-backgrounded* to aCelery on iOS?

- If remote access is a "while I'm actively using it" convenience → Flutter is a
  clear yes.
- If "always-on server that other machines rely on" is core to the iOS value
  proposition → **no** cross-platform *or* native-iOS approach can fully deliver
  it, and iOS would ship with a deliberately scoped-down remote feature.

If the platform is being actively revived for two-OS reach, Flutter is the
recommended direction, with the iOS remote-access scope decided up front.

---

# Addendum 3 — An MCP server for AI-authored aCelery mini-apps

Assesses adding a **Model Context Protocol (MCP)** server so an AI assistant can
**create, run, and debug** aCelery mini-apps. Verdict: **highly feasible, and
the existing architecture already provides most of the plumbing.** The same
remote-mode design discussed in Addenda 1–2 is what makes an off-device
author → run → debug loop possible.

## Why this fits aCelery unusually well

Three properties of the app make it close to an ideal MCP target:

1. **Apps are plain files in a fixed layout.** An app is a folder under
   `www/user/<Name>/` with `acelery_app.json` (name + description), a `.js`
   exposing **`main()`**, and optional `.css`/assets. Generating and editing
   apps is straightforward file I/O — no build step, no bundler.
2. **The capability surface is already a remote API.** The embedded server's
   `/android.itf` endpoint exposes full remote **file CRUD** — verified in the
   source: `action=openfile`, `filewrite` (with append), `read`, `mkdir`,
   `listfiles`, `delete` — plus `opt=sql` (`exec`/`select`/`insert`). An MCP
   server can create app files *and inspect a running app's database* through
   the interface that already ships. No app changes required for authoring.
3. **Apps run in any browser (remote mode).** Because the framework falls back
   to HTTP against the local server when the `Android` bridge is absent
   (Addendum: "dual-mode native bridge"), an app can be loaded and driven in a
   **headless browser** exactly as a remote user would — so run/debug needs no
   device UI automation.

## Proposed MCP surface

A standalone MCP server (TypeScript or Python via the official SDK) that talks to
a running aCelery server (device, emulator, or a desktop backend — see Topology).

**Tools — authoring**
| Tool | Action |
|---|---|
| `acelery_list_apps` | enumerate `www/user/*` with manifests |
| `acelery_read_app(name)` | return `acelery_app.json` + source files |
| `acelery_create_app(name, description)` | scaffold folder + manifest + `main()` stub |
| `acelery_write_file(app, file, content)` | write `.js` / `.css` / asset (→ `filewrite`) |
| `acelery_delete_file(app, file)` / `delete_app` | remove |

**Tools — run & debug**
| Tool | Action |
|---|---|
| `acelery_run_app(name)` | load the app in a headless browser against the server; return status |
| `acelery_get_console(name)` | captured `console.*` + uncaught exceptions **with stack traces** |
| `acelery_screenshot(name)` | rendered screenshot — visual feedback for the model |
| `acelery_eval(name, js)` | run JS in the app context (inspect DOM, call app functions) |
| `acelery_query_db(app, sql)` | run SQL against the app's DB (→ `opt=sql`) to inspect state |

**Resources — context the model needs to write valid apps**
- **Framework API reference** — the `x*`/`xb*` widget catalog plus
  `xSQL`/`xFile`/`xHTTP`/`xExportFile`. **This is the critical piece:** the model
  cannot author correct apps without knowing the framework. It can be
  **auto-generated** by parsing the `*.prototype.* = function(...)` definitions
  in `xscript*.js` (their structure is uniform and machine-readable).
- **The `Example` app** as a reference/template.
- **The manifest schema** for `acelery_app.json`.

**Prompts**
- A scaffolding prompt ("create an aCelery app that …") that pins the `main()`
  contract, the builder API, and `topLayout` conventions from `example.js`.

## Topology — where the MCP server runs and how it reaches aCelery

| Option | Description | Trade-off |
|---|---|---|
| **A. Dev-machine MCP → device server over HTTP** | MCP wraps `/android.itf` file+SQL calls; run/debug via headless browser pointed at `http://<device>:8123`. Native calls execute on the real device. | Highest fidelity; needs a device/emulator in the loop and must pass the §2 auth gate |
| **B. Dev-machine MCP → desktop backend** | Reimplement `/android.itf` (SQLite + fs) in Node/Dart so the whole loop runs on the dev machine, no device. | Fastest AI iteration; doubles as a CI/test harness; overlaps with the Flutter Dart-server work (Addendum 2) |
| **C. MCP embedded in the app** | Not recommended — MCP is conventionally a separate process. | — |

**Recommended:** start with **A** (works against today's server) and add **B**
as a deviceless fast path once a portable backend exists.

## The debug loop this enables

```
write files → run in headless browser → capture console + pageerror (stack) +
screenshot → model reads errors → edits files → re-run
```

A tight agentic loop. Debugging fidelity is good because the code is
**unbundled** — a `pageerror` stack maps directly to the user's `.js` file and
line, no source maps needed. `acelery_query_db` lets the model inspect app data
mid-run, and `acelery_eval` lets it probe the live DOM / call app functions.

## Feasibility summary

**Strong enablers (already present):**
- File + SQL CRUD is already a remote HTTP API.
- Apps are unbundled files with a fixed, documentable API surface.
- Remote-mode design → headless run/debug without device UI automation.
- MCP servers are small; the SDK does the protocol work.

**Work required:**
- The MCP server itself (thin wrapper over existing endpoints + a headless
  browser like Playwright).
- **Auto-generate the framework reference resource** from `xscript*.js` — the
  single highest-leverage task for authoring quality.
- **Structured error capture** — `page.on('console')` / `page.on('pageerror')`
  in the headless runner (the app already forwards console to `onConsoleMessage`
  / `errorlog.html`, but a browser run gives cleaner stacks).

**Dependencies / caveats:**
- **Ties to §2 (auth).** An MCP client is an "external" connection; it must go
  through whatever pairing/token access control gets added. Implement §2 first
  and issue the MCP server a token.
- **Confinement (§2).** The `bpath` surface the MCP would use needs the same
  root-confinement fix — an AI writing files is exactly the case where traversal
  must be blocked.
- Synchronous XHR (remote mode) still works in a real headless browser, so no
  blocker there; making `xInterface` async (Addendum) would still be the clean
  long-term move.

## Suggested phasing

1. **Authoring MVP:** MCP server exposing app-file CRUD (via `/android.itf`) +
   the auto-generated framework reference resource + the `Example` template.
   This alone lets an AI write competent aCelery apps.
2. **Run/debug:** add the Playwright-based headless runner (`run` / `console` /
   `screenshot` / `eval`) and `query_db`, closing the agentic loop.
3. **Deviceless backend (Topology B):** Node/Dart reimplementation of
   `/android.itf` for a fast, CI-friendly loop with no device — best combined
   with the Flutter Dart-server effort so one server implementation serves both.

**Bottom line:** this is one of the more natural MCP integrations possible for
an existing app — the capability API, the file-based app model, and the
browser-runnable framework are already in place. The main net-new work is a thin
MCP wrapper, an auto-generated API reference, and a headless run/debug harness;
the main dependency is landing the §2 access-control model first, since the MCP
client connects as an external peer.
