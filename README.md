# aCelery

Build and run your own JavaScript mini-apps on your phone.

An app is a folder of plain files — a manifest, an entry module, whatever CSS
and assets you want. You write it on the device in the built-in editor, run it,
and it talks to SQLite, the filesystem and the network through a small
capability API. No build step, no bundler, no account.

Originally an Android app (2014, GPLv3, Xavier Llamas Rolland). This repository
is its port to Flutter — Android and iOS from one codebase — and the
modernisation of the web bundle that *is* the product.

---

## How it fits together

The Flutter side is a thin host. The product is the web bundle.

```
Flutter shell  ──►  WebView  ──►  http://127.0.0.1:8123
  (lib/)                             │
                                     ├─ static:  bundle/www/…
                                     └─ /android.itf:  the capability bridge
                                          sqflite · dart:io · http · archive
```

Everything a user app can do goes through that one HTTP origin, local and
remote alike. That is why aCelery can serve your apps to a browser on another
machine over the LAN: it is the same transport, not a second implementation.

| Directory | What it is |
|---|---|
| `lib/` | the Dart host: server, `/android.itf` bridge, WebView shell |
| `bundle/` | the web bundle — source of truth, packed into `assets/aCelery.zip` |
| `bundle/www/system/` | the shell: main menu, IDE, DB manager, launcher |
| `bundle/www/user/Example/` | the sample app, and the reference for writing one |
| `web/` | JS/CSS sources built into `bundle/www/tools/` |
| `xscript5/` | the 2014 widget library, still used by `launcher.html` |
| `doc/` | the assessments and the port plan — read these first |
| `tool/` | the build scripts |

## Writing an app

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

`acelery_app.json` names the entry module (`main.js` if it does not say).
`acelery/ui.js` also ships `TableMaint` — declare fields and validators, get a
working list / record / edit / search screen over a SQLite table, with linked
child tables. `acelery/chart.js` is a separate import because Chart.js is
68 KB gzipped and most apps never draw one.

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

Then bump `ACeleryRuntime.bundleVersion` so installed devices pick the change
up. A test fails if the zip goes stale, and another if the built JS does.

```sh
flutter test                     # the host, the bridge, and the bundle's shape
(cd web && npm test)             # the widget layer, against the built bundle
```

**Hot reload will not do it.** The bundle is unzipped on launch and the JS is
vendored, so a full rebuild and reinstall is the only way to see a bundle
change on a device.

## The stack

Chosen in `doc/js-ui-framework-evaluation.md`, which records the measurements
and the alternatives that lost.

- **Preact 10 + htm** and **react-bootstrap** on `preact/compat` — 45 KB gzipped
  for the whole widget layer, and no build step for user apps
- **Bootstrap 5.3** for CSS, with all 18 themes as deltas over one base
- **CodeMirror 6** for the on-device editor — the only one of the major editors
  with practical touch support
- **Chart.js 4**, opt-in
- ES modules with an import map; an async `fetch` bridge with bound SQL
  parameters

## State

The Flutter port and the bundle modernisation are complete: phases 0–4 of
`doc/web-bundle-port-plan.md`. The bundle went from 7.3 MB and 690 files to
2.1 MB and 70.

Verified on an Android API 36 emulator. **Not yet verified on iOS** — in
particular the native date pickers (`doc/js-ui-framework-evaluation.md` §9.9).

Open questions, none of which block anything, are in that document's §9.

## A note on `original/`

The 2014 Android app, its `aCelery_content/` tree and the source
`aCelery.zip` live in `original/`, which is **not in this repository** — it is
listed in `.gitignore`. The documents in `doc/` cite it throughout
(`aCeleryAndroidInterface.java`, `aCeleryUnzip.java`, `original/assets/`), so
those references will not resolve from a fresh clone.

## Licence

GPLv3, per the headers carried by `xscript5/` and the original sources.
