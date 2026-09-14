# aCelery — Web Bundle Port Plan (Flutter)

**Date:** 2026-09-11
**Scope:** porting `original/assets/aCelery.zip` (the actual aCelery product) onto the
new Flutter host, and upgrading xScript from Bootstrap 3 to the Bootstrap 5
version in `xscript5/`.
**Companion doc:** `doc/modernization-assessment.md` (native host assessment).

---

## 1. What the bundle actually is

`aCelery.zip` — 1.7 MB compressed, **5.8 MB / 690 entries** expanded — is the
whole product. Extracted to `original/assets/extracted/` (verified
byte-identical to the pre-existing `original/aCelery_content/`).

```
aCelery/
├── db/                      runtime: user SQLite databases      (empty in zip)
├── files/                   runtime: user files                 (empty in zip)
├── log/                     runtime: logs                       (empty in zip)
└── www/                     document root served on :8123
    ├── index.html           redirect → /system/index.html
    ├── system/              the IDE
    │   ├── index.html       36 KB — the entire IDE (project/file/db manager, editor)
    │   ├── launcher.html    loads + runs one user app
    │   ├── errorlog.html    logcat viewer
    │   └── style/acelery.css
    ├── tools/               vendored libraries + xScript
    │   ├── js/  xscript.js · xscript_bootstrap.js · xscript_crud.js
    │   │         jquery 1.8 · bootstrap 3.2 · jquery.mobile · modernizr · lazyload
    │   ├── css/ bootstrap 3 + 19 bootswatch themes + font-awesome 4 + jquery.mobile
    │   ├── fonts/ icomoon
    │   └── codemirror/  v4.6.0 (2.6 MB, ~500 of the 690 files)
    └── user/                user projects; ships one `Example`
        └── Example/ acelery_app.json · example.js · example.css · icon.png
```

**Size by area:** codemirror 2.6 MB · css 3.3 MB · fonts 604 KB · js 432 KB ·
system 48 KB · user 20 KB.

### The programming model

A user app is a folder under `www/user/<Name>/` containing an
`acelery_app.json` manifest plus loose `.js`/`.css` files. `launcher.html`
lists the folder over the native bridge, LazyLoads every `.js`/`.css` it finds,
and calls `main()`. Apps build their UI by instantiating widget classes rather
than writing HTML:

```js
function main(){
   db = new xSQL(); db.openDB("xtest.db");
   var nav = new xbNavBar("aCelery","acelery_navbar");
   nav.addItem(new xbNavBarItem("Widgets").bindFunction(widgetTest));
   topLayout = new xbLayout(2,1).addElement(nav,0,0).setToTop();
}
```

Three layers: `xscript.js` (`x*` — DOM primitives + native bridge),
`xscript_bootstrap.js` (`xb*` — Bootstrap widgets), `xscript_crud.js`
(`xbTableMaint`, `xbField`, validators — declarative DB forms).

---

## 2. The load-bearing discovery: every native call already has an HTTP fallback

Each of the 28 bridge methods in `xscript.js` is written twice:

```js
xSQL.prototype.sqlExec = function(q){
   if (typeof Android != "undefined"){
      Android.xSqlExec(this.dbHandle,q);          // in-WebView JS interface
   } else {
      this.getRemoteInterface(                     // synchronous XHR to the
        "opt=sql&action=exec&handle=" + this.dbHandle + "&query=" + btoa(q));
   }                                               // embedded HTTP server
};
```

The second path exists because aCelery deliberately serves on the LAN so a user
can run their app from a browser on another device. **That path is a complete,
already-shipping, bridge-free implementation of the entire API** — including the
UI calls (`xAlertDialog` → `alert()`, `xRunUserApp` → `window.open`).

This matters because Flutter's `webview_flutter` `JavaScriptChannel` is
**one-way and asynchronous** (`postMessage(String) → void`). It physically
cannot implement `Android.xSqlGetNextRow()`, which xScript calls for its return
value inside a `while` loop. `flutter_inappwebview`'s handlers are likewise
promise-based. A JS-interface port would require rewriting every xScript call
site as async — a rewrite of the whole product.

**Therefore: drop the `Android` interface entirely and always take the HTTP
path.** `typeof Android != "undefined"` is then permanently false, and
`xscript.js` needs **zero bridge changes**. The Dart side implements only the
24 `/android.itf` routes.

### Bridge surface to implement in Dart (24 routes)

| `opt` | `action` | Dart implementation |
|---|---|---|
| `sql` | `opendb` `closedb` `deletedb` `exec` `insert` `select` `getnextrow` `getprevrow` `getrowcount` `gotolastrow` `closecursor` | `sqflite` + an int→handle table, int→cursor table |
| `file` | `openfile` `closefile` `fileread` `filewrite` `deletefile` `mkdir` `listfiles` `getextpath` | `dart:io` under the app documents dir |
| `http` | `get` (+ POST body) | `package:http` — the outbound proxy |
| `export` | `set` `get` `getwv` | `share_plus` / save-to-Downloads |
| `exportproject` | `export` | `archive` — zip a `www/user/<app>` folder |

Import project (`xSelectImportProjectFile`) is UI-initiated: `file_picker` →
`archive` unzip, with the existing zip-slip guard from `aCeleryUnzip.java`
carried over.

**Two caveats to design around, not around which to design:**

1. **Synchronous XHR.** Every bridge call blocks the WebView's main thread.
   Chromium still supports sync XHR on the main thread (console-warned, not
   removed), so this works today — but it is the port's biggest long-term
   risk and the reason to keep the Dart server fast and in-process. Do not
   plan to remove it in this port; plan to *notice* if Chromium ever drops it.
2. **Cleartext localhost.** Android needs a network-security-config permitting
   cleartext to `127.0.0.1`; iOS needs `NSAllowsLocalNetworking`. Bind the
   server to `127.0.0.1` by default and make LAN exposure an explicit,
   off-by-default setting — the original bound it wide open.

---

## 3. xscript5 — the Bootstrap 5 upgrade

`xscript5/` holds the upgraded library. It is a **strict functional superset**
and a drop-in at the API level.

| | bundled (2014) | `xscript5/` | |
|---|---|---|---|
| core | `xscript.js` 38 KB | `xscript.js` 45 KB | +12 classes |
| widgets | `xscript_bootstrap.js` 20 KB | **`xscript_bs5.js` 41 KB** | renamed; +21 classes, −2 |
| CRUD | `xscript_crud.js` 22 KB | `xscript_crud.js` 21 KB | **API identical** |

- Header declares **Bootstrap 5.3.8**; uses `data-bs-*` and the native
  `bootstrap.Modal` / `bootstrap.Offcanvas` JS API.
- **jQuery is gone.** The old `xscript_bootstrap.js` had 4 jQuery call sites;
  `xscript5` has zero across all three files. `jquery.min.js` (1.8.x, 2012) and
  `jquery.mobile` can be dropped from `tools/js`.
- Bridge surface is **byte-for-byte the same** 28 `Android.*` methods and 24
  `opt=/action=` routes. Nothing in §2 changes.
- **New classes:** `xbSideBar`/`xbSideBarDropdown`/`xbSideBarItem` (offcanvas
  nav), `xbCarousel`/`xbSlide`, `xbDatePicker`/`xbTimePicker`/`xbDateTimePicker`,
  `xbColorPicker`, `xbFileInput`/`xbMultiFileInput`, `xbMultiSelect`,
  `xbPasswordInput`, `xbProgressBar`, `xbRadioBtn`/`xbRadioBtnGrp`,
  `xbRangeInput`, `xbMediaList`/`xbMediaItem`; core gains `xHiddenInput`,
  `xRadioBtn(Grp)`, `xRangeInput` and the validator hierarchy
  (`xValidator`, `xNotEmptyValidator`, `xNotZeroValidator`, `xTelValidator`).
- **Removed:** `xbButtonPopOver`, `xbModalOpenLink`.

### Compatibility check — already done

Every widget the shipped content instantiates was cross-checked against the
xscript5 API:

> 46 distinct `new x*` classes used across `system/index.html`,
> `launcher.html`, `errorlog.html` and `user/Example/example.js`;
> 119 provided by xscript5; **0 missing.** Neither removed class is used.

So the IDE and the Example app need **no rewrite** — only the changes in §4.

### New third-party dependencies to vendor

xscript5 assumes three globals that are not in the 2014 bundle:

| Global | Library | Needed by |
|---|---|---|
| `bootstrap.*` | **Bootstrap 5.3.8** bundle JS + CSS | modals, dropdowns, offcanvas |
| `TempusDominus` / `tempusDominus.*` | **Tempus Dominus 6** | the three date/time pickers |
| `fa-solid …` classes | **Font Awesome 6** | picker icons, `xbButtonIcon` |

Font Awesome 6 also replaces glyphicons, which Bootstrap 5 removed — the IDE
uses 7 (`cloud cog edit file hdd list th`) at 10 call sites in
`system/index.html`.

---

## 4. Work plan

Ordered so that something runs end-to-end as early as possible.

### Phase 0 — asset strategy

Ship the tree as **one zip asset, unzipped to the app documents dir on first
run**, exactly as the original did. The tree is mutable at runtime (users create
projects, files and databases inside `www/user`, `db/`, `files/`), so it cannot
live read-only in the Flutter asset bundle.

- `assets/aCelery.zip` in `pubspec.yaml`.
- On launch: compare a version stamp; unzip with `archive` if absent or stale.
  **Never** clobber `www/user/`, `db/`, `files/` — the original's unzip was
  unconditional over the whole tree, which is a data-loss bug worth not
  reproducing.
- Port `aCeleryPaths.java` verbatim to a Dart `ACeleryPaths`; it already
  documents the scoped-storage fix (`getFilesDir()`, not `/sdcard`).
- Port the zip-slip guard from `aCeleryUnzip.java` — it guards user-supplied
  project imports, not just the shipped bundle.

### Phase 1 — Dart HTTP server + bridge

- `shelf` + `shelf_static` on `127.0.0.1:8123`, document root = `…/aCelery/www/`.
- Route `/android.itf` to a handler implementing the 24 routes in §2.
- Handles: `Map<int, Database>` and `Map<int, List<Map>>+index` for cursors,
  mirroring `aCeleryAndroidInterface.java`'s handle semantics
  (`getnextrow`/`getprevrow`/`gotolastrow`/`getrowcount` are a *scrollable*
  cursor — `sqflite` returns a full list, so this gets simpler, not harder).
- Base64 in/out on the `query=` parameter, matching `btoa()` on the JS side.
- **Do not** register a `JavaScriptChannel` named `Android`.

### Phase 2 — Flutter shell ✅ done

- `webview_flutter` loading `http://localhost:8123/system/index.html`.
- `IdeScreen` replaces `ACeleryActivity`; `UserAppScreen` replaces
  `ACeleryUserAppActivity`, as a pushed route rather than a second Activity.
- Back → `forceSaveFile()`, then page history, then pop. App lifecycle
  `paused`/`inactive` also flushes, as `onPause` did.
- `ACeleryBackground` is gone — the server runs in-process.

**One correction to §2.** Registering *no* JavaScript channel turned out to be
too strong. Four xScript entry points ask the host to *do* something rather
than return data, and each one's browser fallback is a dead end in a Flutter
WebView: `xRunUserApp` calls `window.open` (needs a WebChromeClient window
callback that webview_flutter does not expose — it hard-codes
`setSupportMultipleWindows(true)`), `xCloseApp` calls `window.close` (a no-op
on a top-level page), `xImportProject.get` has a literally empty else branch,
and the two `.get()` download helpers submit a form whose `Content-Disposition`
response a Flutter WebView cannot save.

These are all **fire-and-forget**, so a one-way async channel suits them. The
shell registers one named `ACeleryHost` — never `Android`, which would flip
xscript.js onto its synchronous branch — and injects a shim at
`onPageFinished` that overrides exactly those five functions. The bundle itself
stays untouched, so the Bootstrap 5 swap in Phase 3 carries no host-specific
edits.

Downloads are resolved **in-process**: the shell reads the pending export
straight out of `ExportBridge` rather than re-fetching over HTTP, then hands it
to the system share sheet (`DownloadManager` into `Downloads/` is a
scoped-storage permission dance now, and the share sheet lets the user choose).

`window.alert` is also handled — an unhandled JS dialog blocks a WebView
permanently — and so are external links, which would otherwise replace a
running user app with a web page and strip it of its bridge.

### Phase 3 — Bootstrap 5 migration of the bundle ✅ done

The bundle is now a **source tree at `bundle/`**, packed into
`assets/aCelery.zip` by `tool/build_bundle.sh`. Editing a binary zip was not
reviewable; the zip is a build artifact and a test fails if it goes stale.
Bump `ACeleryRuntime.bundleVersion` after a rebuild so installed devices
refresh.

1. `tools/js/`: dropped jQuery 1.8, jQuery Mobile, Bootstrap 3 JS, Modernizr
   and `xscript_bootstrap.js`; added `bootstrap.bundle.min.js` 5.3.8 (carries
   Popper), Tempus Dominus 6.10.4 and Font Awesome 6.7.2 (woff2 only — every
   `src` lists woff2 first, so the ttf files were never fetched).
2. `tools/css/`: all 18 themes replaced with **Bootswatch 5.3.8**. Bootswatch
   renamed two themes at Bootstrap 4 — Paper→Materia, Readable→Litera — so
   those ship under their old directory names and every value `xbTheme` offers
   still resolves. `default` is stock Bootstrap; `acelery` is stock Bootstrap
   plus the palette carried over from the Bootstrap 3 theme (`#283b41`
   navbar, `#586d72` primary, `#86a0a4` brand). Dropped the glyphicon
   webfonts, jQuery Mobile CSS, Font Awesome 4, and `acelery.min.css`,
   `dlmenu.css`, `css/images/` and `fonts/icomoon/`, none of which anything
   had referenced since 2014.
3. `xscript.js`, `xscript_crud.js` swapped; `xscript_bootstrap.js` →
   `xscript_bs5.js`.
4. The four `<script>`/`<link>` blocks rewritten across `system/index.html`,
   `launcher.html` and `errorlog.html`.
5. All 11 glyphicons replaced with Font Awesome 6 equivalents.
6. Visual pass done on a device — see the findings below.

Net: **690 files → 464, 5.8 MB → 7.3 MB expanded** (1.72 MB zipped, unchanged).
The tree grew because Bootstrap 5 themes are larger than Bootstrap 3 ones;
compressed size did not move.

#### The class-level compatibility check in §3 was not sufficient

§3 reported "46 classes used, 119 provided, 0 missing" and concluded the IDE
needed no rewrite. That compared **class names only**. At method level
xscript5 had dropped 8 methods, 5 of them called by the shipped pages, and the
Example app failed at load with `nav.addDropdown is not a function`.

Restored in `xscript5/` (so the library and the bundle do not drift), each
re-expressed in Bootstrap 5 rather than copied:

| Method | Why it matters | Bootstrap 5 form |
|---|---|---|
| `xbNavBar.addDropdown` | every app with a menu | append the dropdown's own `li.nav-item.dropdown` |
| `xbNavBar.getNavItem` | the IDE's enable/disable logic | track added items in `this.elements` |
| `xbNavBarDropdown.addTitleWrapper` | the IDE wraps titles in `<h4>` | rewrite the toggle anchor |
| `xbNavBarDropdown.disabled` | greys out whole menus | `.disabled` on the link, drop `data-bs-toggle` |
| `xbNavBarItem.disabled` | greys out single items | `.nav-link.disabled`, handler saved on bind |
| `xbTabs.removePane` | public API | the Bootstrap 3 version indexed `this.elements` with an undeclared `i`, so it always threw; this is what it documented |
| `xbModal.setAutoRemove` | public API | `addEventListener` instead of jQuery |

`xbTabs.removeAuxElement` was **not** restored: nothing in either library ever
added an aux element, so it could only ever remove something that could not
exist.

A test now cross-references every method the shipped pages call against the
library, which is the check §3 should have been.

#### Two defects found in `xscript5` and fixed

- **`xbCarousel` was never migrated.** It still emitted Bootstrap 3 markup —
  `left carousel-control`, `data-slide`, `data-slide-to` and glyphicon
  chevrons. Now `carousel-control-prev/next`, `data-bs-slide*` and Bootstrap's
  own control-icon spans. (`xscript_crud.js` also still asked for
  `glyphicon-info-sign`.)
- **The navbar hamburger did nothing, and menus stacked down the page.**
  `xbNavBar` put its items in no collapse wrapper and hard-coded the toggler
  at `#sidebar-nav`, which only `xbSideBar` creates — and `xbSideBar` carries
  only a close button, so it depends on that toggler. An app that puts items
  straight on the navbar (both the IDE and the Example app) therefore got a
  dead button and a menu eating a quarter of a phone screen. The toggler now
  resolves its target on click: the offcanvas if a sidebar exists, otherwise
  the navbar's own collapse. Both designs work; Bootstrap 3 behaviour is
  restored.

#### Verified on an API 36 emulator

IDE main menu, My Apps, launching the Example app, its navbar and dropdown,
`bootstrap.Modal`, and the IDE's `Project` dropdown with per-item enable and
disable states all render and behave correctly, with a clean console.

### Phase 4 — the UI layer

Planned in full in `doc/js-ui-framework-evaluation.md` §8. Progress:

**Phase 4a — foundations ✅ done (2026-09-14)**

1. All four pages got `<!DOCTYPE html>`, a charset, and `lang="en"`, so they
   leave quirks mode; `maximum-scale=1, user-scalable=no` dropped from the three
   system pages (evaluation §7.1, §7.2).
2. Unreferenced vendored mass deleted: CodeMirror's 51 addons, 228 KB of
   keymaps, 78 of 84 modes and all 89 demo `index.html` pages the embedded
   server was exposing to the LAN, plus the dead top-level
   `tools/css/bootstrap.min.css`. **2.6 MB → 592 KB** of CodeMirror; the bundle
   as a whole **7.3 MB → 5.4 MB**, 464 files → 122.
3. `tool/build_js.sh` added: an esbuild pass over `web/src/` producing the
   vendored `acelery/*` modules, wired into `tool/build_bundle.sh` and stamped
   so a stale build fails a test. Node is needed to *rebuild*, never to pack.

**Phase 4b — the bridge ✅ done (2026-09-14)**

4. `web/src/acelery/{bridge,sql,file,http,export}.js`: async ES modules on
   `fetch`. `db.select(sql, args)` returns the whole result set in one call and
   binds its parameters, replacing the per-row cursor walk and the `btoa`
   transport encoding. Errors carry SQLite's message rather than returning -1.
5. Dart side: `opt=sql&action=query|run|insertrow` accept a JSON body
   `{handle, sql, args}`. The cursor routes stay until Phase 4d retires the
   legacy library with the IDE rewrite.
6. The 29 `typeof Android != "undefined"` branches deleted from `xscript.js`
   (1,941 → 1,793 lines). The host has never registered that channel, so they
   had been unreachable since Phase 2.

**Still open:** 4c (widget layer), 4d (TableMaint, IDE, CodeMirror 6),
4e (charts, native date inputs). Three product decisions gate 4c — see
`js-ui-framework-evaluation.md` §9.

Also still outstanding, independent of the above:

- The 18 bootswatch themes are 4.1 MB for a feature (`xbTheme`) exercised once
  in the Example app. Phase 4c replaces them with `data-bs-theme`.
- `Example/example.js`'s `jsonNews()` calls the Google Feed API, **dead since
  2016**. Replace the demo or drop that menu item.

---

## 5. What this plan deliberately does not do

> **Revised 2026-09-14.** The first two entries rested on backward compatibility
> with user apps in the wild. **aCelery was never launched; there are none.**
> `doc/js-ui-framework-evaluation.md` §1 sets this out, and §2 flagged both
> entries for revision before Phase 4. They are rewritten below. The original
> text is kept struck through, because the reasoning is what changed, not the
> measurements.

- ~~**No rewrite of xScript's synchronous model.** Async-ifying 28 bridge
  methods would force every user app ever written to be rewritten.~~
  **Void.** There are no user apps, so nothing is forced to be rewritten — and
  the sync model is why the UI freezes during every database call. **The bridge
  is async-only; there is no synchronous path.** Landed in Phase 4b: the new
  `acelery/*` modules use `fetch` and `await`, and the cursor protocol is
  replaced by one round-trip per statement with bound parameters.
- ~~**No Dart port of the widget layer.** The product *is* the JS API; users'
  apps are written against it.~~ **The conclusion holds; the reason does not.**
  The UI stays web technology because **LAN remote access requires it** — an app
  must render in a desktop browser over the network, which a Flutter widget tree
  cannot do. Stated the old way, the next person to read this would conclude the
  widget layer is untouchable, which is exactly backwards: it is being replaced
  in Phase 4c.
- **No change to the on-disk layout.** `aCelery/{db,files,log,www}` and
  `acelery_app.json` stay as they are. (The "so existing exported projects still
  import" rationale is moot, but the layout is fine and there is no reason to
  churn it. Phase 4c adds one optional `"entry"` field to the manifest.)

---

## 6. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| ~~Chromium drops sync XHR on the main thread~~ | **Not applicable** | **Retired in Phase 4b.** The `acelery/*` modules use `fetch`; no sync XHR remains in the new bridge. (It was over-rated anyway: Chromium's removal programme stalled after the Chrome 80 page-dismissal restriction.) The legacy `xscript.js` bridge still uses it until Phase 4d retires it with the IDE rewrite. |
| WebView blocks cleartext to localhost | Medium | **Done in Phase 2**: `android/app/src/main/res/xml/network_security_config.xml` permits cleartext to `localhost`/`127.0.0.1` only and blocks it everywhere else; iOS `Info.plist` carries `NSAllowsLocalNetworking`. Verified in the merged manifest. |
| BS3→BS5 class strings passed by hand | Medium | Phase 3.6 audit; contained to 2 files. |
| Unzip-on-upgrade destroying user projects | **High** — data loss | Phase 0: never overwrite `www/user`, `db`, `files`. Bug present in the original. |
| iOS has no precedent — app was Android-only | Medium | Bridge is pure Dart + HTTP, so it should port cleanly; `sqflite` and `path_provider` both support iOS. Validate in Phase 1. |

---

## 7. Dependencies (all resolved against Flutter 3.41.5 / Dart 3.11.3)

```yaml
webview_flutter: ^4.14.1     shelf: ^1.4.2         shelf_static: ^1.1.3
sqflite: ^2.4.2              path_provider: ^2.1.6 archive: ^4.2.0
file_picker: ^12.3.0         share_plus: ^13.3.0   http: ^1.6.0
```
