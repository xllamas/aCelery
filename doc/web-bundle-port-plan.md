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

### Phase 2 — Flutter shell

- `webview_flutter` loading `http://localhost:8123/system/index.html`.
- Replaces `ACeleryActivity` + `ACeleryUserAppActivity`: one `WebViewWidget`,
  routed by URL rather than two Activities.
- Back button → `forceSaveFile()` via `runJavaScript` before pop, as the
  original did.
- `ACeleryBackground` (the foreground `Service`) **disappears** — the server is
  now an isolate inside the app. Reassess whether background serving is still
  wanted; if so it becomes a foreground-service plugin decision, not a
  requirement.

### Phase 3 — Bootstrap 5 migration of the bundle

1. `tools/js/`: drop `jquery.min.js`, `jquery.mobile.min.js`, `bootstrap.min.js`
   (3.x), `modernizr.custom.js`; add `bootstrap.bundle.min.js` 5.3.8,
   Tempus Dominus 6, Font Awesome 6.
2. `tools/css/`: replace Bootstrap 3 + the 19 bootswatch themes with their
   Bootstrap 5 equivalents; drop `jquery.mobile.*.css` and `font-awesome` 4.
   Re-derive `bootstrap_themes/acelery/` against BS5.
3. Swap `xscript.js` / `xscript_crud.js` and replace
   `xscript_bootstrap.js` → `xscript_bs5.js` from `xscript5/`.
4. Update the four `<script>`/`<link>` blocks — `system/index.html`,
   `launcher.html`, `errorlog.html`, `user/Example/example.*` — to the new file
   names and the BS5 asset set.
5. Replace the 7 glyphicons in `system/index.html` with Font Awesome 6.
6. Visual pass on the IDE. API compatibility is proven (§3), but BS3→BS5
   renamed a lot of *classes* — `.panel`→`.card`, `.form-group`→`.mb-3`,
   `.pull-left`→`.float-start`, `.btn-default`→`.btn-secondary`,
   `.col-xs-*`→`.col-*`. `xscript_bs5.js` emits the new ones internally, but
   any class string passed by hand as a `clss` argument in `system/index.html`
   or `example.js` needs auditing.

### Phase 4 — optional, decide separately

- **CodeMirror 4.6.0 (2014) → CodeMirror 6.** It is 2.6 MB and ~500 of the 690
  files — by far the largest single item, and a full rewrite (CM6 has a wholly
  different API). Worth doing eventually; not required for the port. Keeping
  CM4 works.
- The 19 bootswatch themes are 3.3 MB for a feature (`xbTheme`) exercised once
  in the Example app. Consider shipping 3–4.
- `Example/example.js`'s `jsonNews()` calls the Google Feed API, **dead since
  2016**. Replace the demo or drop that menu item.

---

## 5. What this plan deliberately does not do

- **No rewrite of xScript's synchronous model.** Async-ifying 28 bridge methods
  would force every user app ever written to be rewritten. The HTTP fallback
  preserves the contract exactly.
- **No Dart port of the widget layer.** The product *is* the JS API; users'
  apps are written against it. It stays JS.
- **No change to the on-disk layout.** `aCelery/{db,files,log,www}` and
  `acelery_app.json` stay as they are, so existing exported projects still
  import.

---

## 6. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Chromium drops sync XHR on the main thread | **High** — kills the bridge | No action now; it is still supported. Knowing this is the single point of failure is the mitigation. |
| WebView blocks cleartext to localhost | Medium | Android network-security-config + iOS `NSAllowsLocalNetworking`; verify on both early in Phase 2. |
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
