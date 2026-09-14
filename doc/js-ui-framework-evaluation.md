# aCelery — JS UI Framework Evaluation & UI Modernization Plan

**Date:** 2026-09-12 (revision 2 — clean-slate premise)
**Scope:** the web bundle's UI layer — `bundle/www/tools/js/xscript*.js`, the vendored
libraries under `bundle/www/tools/`, and the three shipped pages under
`bundle/www/system/`. The Dart host and `/android.itf` are in scope only where
they constrain the UI.
**Companion docs:** `doc/web-bundle-port-plan.md` (Phases 0–3, done),
`doc/modernization-assessment.md` (native host).

> **Revision note.** Revision 1 of this document rested on a constraint that does
> not exist: backward compatibility with user apps in the wild. **aCelery was
> never launched. There is no user base and no app corpus.** That single fact
> inverts the conclusion, so this is a redo rather than an amendment. What
> changed and why is set out in §1; the measurements are unchanged and now point
> the other way.

---

## 0. Verdict

**Replace xScript's widget layer. Keep its bridge and its CRUD engine.**

The library splits cleanly into commodity and crown jewels, and measurement makes
the line obvious:

| Layer | Lines | What it is | Decision |
|---|---|---|---|
| `xscript.js` widgets (1–1409) + all of `xscript_bs5.js` | **3,042** (70%) | a 2014 reimplementation of rendering, components, and events | **Replace** |
| `xscript.js` bridge (1410–1941) | 532 | `xSQL`/`xFile`/`xHTTP`/`xExport` — device capabilities | **Keep, rewrite async** |
| `xscript_crud.js` | 781 | `xbTableMaint` — declarative SQLite CRUD forms | **Keep the design, rebuild it** |

So this is not "throw away xScript." It is: **keep the 30% that is actually
aCelery, and stop hand-maintaining the 70% that Preact does better in 5 KB.**

**Recommended stack:** Preact 10 + htm (5 KB gzipped, measured, no build step),
ES modules with an import map for user apps, Bootstrap 5.3 retained for CSS, an
async `fetch` bridge, and `TableMaint` rebuilt as a Preact component.

**Chosen 2026-09-14** (§9): that stack, **plus `react-bootstrap` on
`preact/compat`** for the component set (§3.1a), and all 18 themes resolving
through CSS variables (§3.4).

Three measurements drive it:

- **73 of 119 xScript classes are used by nothing.** Only 46 are instantiated
  anywhere in the tree; the IDE alone uses 33. With no users, the other 73 are
  speculative API written for an audience that never arrived — pure maintenance
  liability.
- **Preact 10 + htm is 12 KB raw / 5 KB gzipped** (measured from the UMD dists),
  against ~91 KB raw for the xScript widget layer it replaces — and it adds
  components, keyed diffing, and hooks.
- **Everything written against xScript is 1,301 lines**, all authored by you:
  the IDE (1,024), `launcher.html` (59), `errorlog.html` (59), and the Example
  app (159). That is the entire migration surface. It is a few weeks of work, not
  a product orphaning.

**The window for this decision is open exactly now and never reopens.** The
moment aCelery has users, revision 1's reasoning becomes correct again and the
widget layer is frozen for good.

**Two decisions in the port plan are now void** and should be revisited before
Phase 4 — see §2.

---

## 1. What the clean slate changes

Revision 1 evaluated seven candidates against five constraints. Only one
constraint actually died, but it was the one carrying the verdict.

| Constraint | Status now |
|---|---|
| **C1** No build step for *user apps* | **Survives, and is now the dominant constraint.** Apps are authored on-device in CodeMirror. This is intrinsic to the product, not legacy. |
| **C2** Backward compatibility with 119 classes | **Void.** No users, no apps. |
| **C3** Fully offline, vendored, no CDN | **Survives.** Still every kilobyte is an install kilobyte. |
| **C4** The bridge is synchronous | **Was a constraint; is now an opportunity.** See below. |
| **C5** Two runtimes, touch-first, phone-sized | **Survives, and now constrains the *product*, not just the CSS.** See §2.2. |

### 1.1 C2's death changes every verdict that depended on it

Revision 1 declined Preact, Vue, and Lit with the same sentence: they replace the
authoring API, and the authoring API is the product. That sentence was load-bearing
for six of the seven declines. With nothing to be compatible with, replacing the
authoring API costs **1,301 lines of your own code** — and buys a library that
someone else maintains.

### 1.2 C4 flips from constraint to opportunity — the biggest single change

The port plan's §5 states its central principle:

> **No rewrite of xScript's synchronous model.** Async-ifying 28 bridge methods
> would force every user app ever written to be rewritten.

There are no user apps. **The rationale is void, and with it the whole reason
aCelery's UI freezes during every database call.** `xInterface`
(`xscript5/xscript.js:1420`) is `open("GET", query, false)`, and
`xbTableMaint.list()` makes one blocking round-trip *per row*.

Revision 1 recommended adding async siblings alongside the sync methods for
compatibility. That hedge is now pointless: **go async-only.** `fetch` +
`async`/`await`, one implementation, no sync path to maintain, and the
deprecation warning in the console disappears along with the frozen frames.

That also retires a risk-register entry. "Chromium drops sync XHR" was rated
**High**; it should now read **not applicable** — aCelery won't use sync XHR.
(For the record it was over-rated anyway: Chromium's removal programme stalled
after the Chrome 80 page-dismissal restriction, and the WHATWG issue tracking it
is titled *"Abandon hope of removing sync XHR from the web platform?"*.)

### 1.3 What a clean slate does *not* change

Two things that felt like legacy turn out to be load-bearing on independent
grounds, and they should survive untouched:

- **The UI stays web technology, not Dart.** The port plan justified this with
  "users' apps are written against the JS API" — void. But the **LAN
  remote-access feature independently forces it**: an app must render in a
  desktop browser over the network, which a Flutter widget tree cannot do. Same
  conclusion, sounder reason.
- **HTTP-only transport, for both local and remote.** With async permitted,
  `flutter_inappwebview`'s promise-based handlers become viable for local calls,
  and the port plan's reason for rejecting them (Flutter's channels can't
  implement a synchronous `getNextRow()`) evaporates. **Don't take that door.**
  Keeping one transport means local and remote behave identically, one bridge
  implementation serves both, and the LAN feature works for free. A loopback
  round-trip is cheap; a second bridge implementation is not. Stay on
  `webview_flutter`.

### 1.4 Dead code that can now simply go

- **The entire `Android` branch: 29 `typeof Android != "undefined"` checks and 28
  `Android.*` call sites.** The Flutter host deliberately never registers that
  channel, so this has been unreachable since Phase 2. It was retained as
  compatibility ballast. Delete it — roughly 230 lines, and the bridge stops
  being dual-mode.
- **`lazyload.js`, 390 lines / 13 KB.** Replaced by dynamic `import()` (§3.2).
- **73 unused widget classes.**

---

## 2. Two port-plan decisions to revisit before Phase 4

Flagging these explicitly because the port plan drives the work and both entries
now argue from a premise that is false.

**1. §5: "No rewrite of xScript's synchronous model."** Void (§1.2). Replace with:
*the bridge is async-only; there is no synchronous path.*

**2. §5: "No Dart port of the widget layer — the product *is* the JS API; users'
apps are written against it."** The conclusion holds but the reason must change
to the remote-browser requirement (§1.3), because as written it is now false —
and if it is left as written, the next person to read it will conclude the
widget layer is untouchable, which is exactly backwards.

§5's third item — "no change to the on-disk layout, so existing exported projects
still import" — is also moot (there are no exported projects), but the layout is
fine and there is no reason to churn it. One addition is worth making: an
`"entry"` field in `acelery_app.json` (§3.2).

---

## 3. The recommended stack

### 3.1 Preact 10 + htm for the widget layer

Measured from the shipped UMD dists, gzip -9:

| Library | raw | gzipped | npm downloads/wk |
|---|---|---|---|
| **preact 10.29.8 + htm 3.1.1** | **12 KB** | **5 KB** | 24.4M + 1.0M |
| `@preact/signals-core` 1.14.4 | 5 KB | 1 KB | 6.5M |
| lit 3.3.3 (`lit-all.min.js`) | 29 KB | 10 KB | 5.2M |
| alpinejs 3.17.2 (`cdn.min.js`) | 54 KB | **19 KB** | 531K |
| vue 3.5.42 (`runtime.global.prod`) | 106 KB | 39 KB | 11.3M |
| vue 3.5.42 (`global.prod`, w/ compiler) | 163 KB | 59 KB | — |
| xscript5, all three files, unminified | 110 KB | 19 KB | n/a |

`htm` is tagged template literals, so **it compiles at runtime — no build step**,
satisfying C1 outright. Both libraries ship UMD builds usable from a classic
`<script>`, so the stack works whether or not the ES-module move in §3.2 happens.

```js
import { html, render } from "acelery/ui";

export default function main() {
  render(html`
    <Panel title="Directory">
      <Input label="Name" name="mname" required />
      <Select label="Group" name="grp" options=${GROUPS} />
    </Panel>`, document.body);
}
```

Why Preact over the alternatives, on the measurements above:

- **Alpine is not the small option.** Its reputation says ~7 KB; the shipped
  `cdn.min.js` measures **19 KB gzipped** — nearly 4× Preact + htm — and it
  provides no component model. Revision 1 called Alpine a serious alternative on
  a quoted figure. Measured, it is hard to justify at all. It is also the least
  adopted candidate here by an order of magnitude (531 K/wk against Preact's
  24.4 M).
- **Lit is disqualified by Bootstrap, specifically.** Lit's value is Shadow DOM
  encapsulation — and **global stylesheets do not pierce shadow roots**, so
  Bootstrap 5's CSS would not reach Lit components. The escape hatch,
  `createRenderRoot(){ return this; }`, renders to light DOM but then Lit's own
  `static styles` stop applying. Pairing Lit with a global CSS framework means
  switching off the feature you adopted Lit for. (Correction to revision 1: Lit
  ships an official prebuilt single-file bundle, so "ESM-only, needs a build
  step" was wrong. The Shadow DOM conflict is the real blocker, and it is worse.)
- **Vue costs 8–12× the bytes for no gain here.** 39 KB gzipped runtime, 59 KB
  with the in-browser compiler. The compiler path also turns user apps into
  runtime-compiled template strings, which degrades the IDE's error reporting —
  today a stack trace points straight at the user's `.js` line, and that is worth
  protecting (see §3.4).
- **Svelte and Solid remain disqualified by C1** — both need a compiler, and C1
  is intrinsic rather than legacy, so their position is unchanged. Shipping
  Svelte's in-browser compiler into the APK to compile code typed on a phone is
  not proportionate to any problem aCelery has.
- **React is the paradigm; Preact is the same paradigm at 5 KB.** react +
  react-dom is ~45 KB gzipped for an API Preact matches. React's 128 M/wk matters
  as *corpus*, not as a dependency — and Preact inherits that corpus.
- **htmx stays declined on architecture.** The bridge returns JSON capability
  results (`{"handle":"1"}`), not HTML fragments. Using htmx would move the whole
  UI layer into Dart, which §1.3 rules out on remote-access grounds.

### 3.1a A component toolkit over Preact: React Bootstrap

§3.1 assumes the ~33 components the IDE needs are hand-written. They need not be.
**`react-bootstrap` 2.10.10 runs on `preact/compat`** and is the only mainstream
toolkit that encapsulates what xScript's widget layer encapsulates *while keeping
the Bootstrap 5.3 CSS Phase 3 just landed*.

xScript's encapsulation has two halves, visible in `xbStringInput`
(`xscript_bs5.js:23`), `xbSelect` (`:279`), and `xbForm` (`:593`):

1. **Markup encapsulation.** The author writes `new xbStringInput("Name","mname")`
   and never types `mb-3`, `form-label`, or `form-control`. The widget owns its
   wrapper, label, control, and validation classes.
2. **Imperative instance identity.** `getValue()`, `validate()`, `setError()` live
   on a persistent object, and `xbForm` walks `this.elements` calling them.

React Bootstrap supplies (1) exactly. Rendered under `preact/compat` in jsdom,
`<Form.Group controlId="mname" className="mb-3">` + `<Form.Label>` +
`<Form.Control type="text" name="mname" required />` emits:

```html
<div class="mb-3">
  <label for="mname" class="fw-bold form-label">Name</label>
  <input name="mname" required type="text" id="mname" class="form-control">
</div>
```

That is `xbStringInput`'s markup, plus the `for`/`id` pairing §7.3 records as
missing across the whole library. The accessibility fix arrives by construction
rather than as a discipline to maintain across 33 hand-written components.

**Measured** (esbuild bundle, `gzip -9`, same method as §3.1):

| Bundle | raw | gzipped |
|---|---|---|
| preact + htm alone (§3.1 baseline) | 12 KB | 5 KB |
| + react-bootstrap, 20 components (Form, Card, Navbar, Nav, Modal, Offcanvas, Dropdown, Tabs, Table, ListGroup, Pagination, InputGroup, Alert, Spinner, Badge, Row/Col/Container) | 127 KB | 46 KB |
| `bootstrap.bundle.min.js`, then deletable | −80 KB | −24 KB |
| **Net against §3.1** | **+35 KB** | **+17 KB** |

react-bootstrap reimplements Modal, Dropdown, Offcanvas, Collapse, and Tabs in
React and vendors its own Popper, so Bootstrap's JS can go — *provided* every
imperative `bootstrap.Modal` / `bootstrap.Offcanvas` call site converts. 17 KB
gzipped against a bundle shedding 6 MB is noise.

It also compounds §6.1: react-bootstrap is 1.08 M downloads/wk, and its component
names sit inside the React corpus a model already has. An AI writing
`<Form.Group>` needs no generated reference at all — the argument that deletes a
roadmap item gets stronger, not weaker.

**What it does not supply is half (2).** There is no `form.getFormData()` or
`form.validateForm()`; in a VDOM, state lives in the parent. Keep those as a thin
local `<Form>` wrapper over react-bootstrap's `validated` prop and
`<Form.Control.Feedback>`, which map onto `validate()`/`setError()` directly.
`TableMaint` (§3.5) needs that wrapper regardless, so it is not extra work.

**One build trap, hit while measuring — and narrower than it first looked.**
Bundling can pull **two copies of preact core**, so the hooks module registers
its `options` hooks on a different instance than the one rendering and the first
render dies with `TypeError: Cannot read properties of undefined (reading
'context')` inside `useBootstrapPrefix`. The stack points nowhere near the cause.

Measured precisely afterwards: this happens under `--platform=node` and **not**
on esbuild's default browser platform, where `react-bootstrap`-via-`preact/compat`
and `htm/preact` both resolve to `preact.module.js`. So the shipping bundle was
never at risk, and `--main-fields=module,main` — the first fix tried — neither
causes nor cures it. The real rule is: **do not re-bundle the widget layer for
node.** A test harness should import the built browser bundle, which is what
`web/test/ui.test.js` does. `tool/build_js.sh` counts preact cores in esbuild's
metafile and fails the build at anything but one, so the property is pinned
rather than assumed.

**The runner-up, and why it loses.** **Shoelace** is the only candidate that
supplies *both* halves — `<sl-input label="Name">` with a real `.value` property
and `.reportValidity()` is xScript's object model almost exactly. But it is Shadow
DOM carrying its own design system: **248 KB raw / 59 KB gzipped for a
16-component subset** plus its theme CSS, and Bootstrap's stylesheet does not
reach inside it. That is the §3.1 disqualification for Lit and the §8 one for Web
Awesome, arriving a third time. At 95 K downloads/wk it is also the least adopted
option on the table. If the imperative instance API is what matters most, Shoelace
is the honest answer — and Bootstrap, the Bootswatch themes, and §3.4 all go with
it.

**If adopted, three things elsewhere in this document change:** §5 gains ~35 KB
raw (still ~1.2 MB total); §6's "~33 widget components" line shrinks to a
`<Form>` wrapper plus whatever react-bootstrap lacks; and §8's step 6 becomes
"vendor Preact + htm + react-bootstrap" with the resolution guard from above.

### 3.2 ES modules + an import map for user apps

`launcher.html` currently LazyLoads every loose `.js` in the app folder and calls
a global `main()`. With no convention to preserve, replace it with the platform:

```html
<script type="importmap">
{ "imports": { "acelery/": "/tools/js/acelery/" } }
</script>
```
```js
const app = await import(`/user/${name}/${manifest.entry ?? "main.js"}`);
await app.default();
```

Import maps are supported in Chrome 89+ and Safari 16.4+, which covers Android
System WebView (Play-updatable, so current on any live device) and iOS WKWebView.
This gives real module scope, bare-name imports of the vendored libraries, and a
single documented entry point — **with no bundler**, satisfying C1. `lazyload.js`
(390 lines) is deleted, and apps stop depending on global variable soup.

Add `"entry": "main.js"` to `acelery_app.json`, defaulting to `main.js` when
absent.

### 3.3 Async-only bridge, rewritten as ES modules

Rewrite the 532-line bridge as `acelery/sql`, `acelery/file`, `acelery/http`,
`acelery/export`:

```js
const db = await openDB("xtest.db");
const rows = await db.select("select rowid,* from person order by mname");
```

Three changes at once, all now free:

1. **`fetch` + `async`/`await`**, no sync XHR — the UI stops freezing.
2. **Delete the 28 `Android.*` branches** (§1.4).
3. **Return whole result sets.** The `getnextrow`/`getprevrow`/`gotolastrow`
   scrollable-cursor protocol exists to mimic Android's `Cursor`. The Dart side
   already materialises a full `List<Map>` from `sqflite` — so one `select`
   returning an array replaces N+1 round-trips per page. This is the largest
   real-world speedup available anywhere in the bundle, and the cursor routes can
   be dropped from `/android.itf` entirely.

Keep Phase 2's one-way `ACeleryHost` channel and its five-function shim. That
design is correct and unaffected.

**Also add a parameterised-query route.** `xbTableMaint` builds SQL by
concatenation (`xscript_crud.js:351–359`) and base64-encodes the result, which is
transport encoding, not escaping. `sqflite` supports bound parameters natively, so
`db.select(sql, args)` is nearly free to add — and with MCP/AI-authored apps in
the roadmap (`modernization-assessment.md` Addendum 3), it should be the only
shape offered rather than an option.

### 3.4 Keep Bootstrap 5.3.8

Retained, and unaffected by the framework change — Preact renders to light DOM, so
Bootstrap's classes just work (unlike Lit, §3.1). Phase 3's Bootstrap 5 migration
work is *not* wasted: the CSS, the Bootswatch themes, the Font Awesome 6 swap, and
the debugged navbar/offcanvas/modal behaviour all carry over. What gets discarded
is `xscript_bs5.js` — the JS wrapper around markup Preact emits directly.

Two Bootstrap 5.3 features remain shipped-but-unused, and the rewrite is the
moment to adopt both:

- **The grid.** `xbLayout` inherits `xLayout` unchanged (`xscript_bs5.js:791`),
  and `xLayout` builds an HTML `<table>` with percentage-width `<td>`s
  (`xscript.js:1094`). **aCelery has no responsive layout at all** — the biggest
  UI defect in the tree, on a phone-first product (C5). A `<Row>`/`<Col>`
  component pair on `row`/`col-12 col-md-*` fixes it and stacks on narrow screens
  for free.
- **`data-bs-theme`.** `xbTheme.setTheme` (`xscript_bs5.js:1555`) swaps an entire
  228 KB stylesheet per theme change, from an 18-theme directory totalling
  4.1 MB. Bootstrap 5.3 does this with CSS custom properties plus a
  `data-bs-theme="dark"` attribute: ~3.9 MB lighter (§5), no reflow, and a real
  dark mode.

  > **Corrected 2026-09-14, on the device.** *Custom properties alone do not
  > retheme Bootstrap 5.3.* `.btn-primary` compiles to `--bs-btn-bg:#0d6efd` —
  > a literal, not `var(--bs-primary)` — so overriding the palette tokens
  > retints nothing a user can see. Built that way, all 18 themes fit in 66 KB
  > and the aCelery theme's Save button stayed stock blue.
  >
  > What works is a **delta**: the rules where a Bootswatch build differs from
  > stock Bootstrap, scoped under `[data-acelery-theme]` so they layer rather
  > than replace. 30–80 KB per theme, **636 KB for all 18** against 4.1 MB, and
  > the result is what Bootswatch actually renders rather than an approximation
  > of it — so §9.6's "not pixel-identical" caveat is largely retired too.
  > Bootswatch's webfonts are dropped: they fetch from Google Fonts, which an
  > offline device cannot reach (C3), so they were only ever a failed request.
  >
  > `data-bs-theme` still carries the dark/light mode, and that part landed
  > exactly as described. It also exposed a latent bug: `xbNavBar` pinned
  > `data-bs-theme="light"` on itself, harmless while no theme was truly dark,
  > and a light navbar over a dark page the moment one was.
  >
  > Net: **−3.2 MB, not −3.9 MB.** §5 updated.

### 3.5 Rebuild `xbTableMaint` — this is the product

`xscript_crud.js` is aCelery's actual differentiator: declare fields and
validators, get a working list/detail/edit UI over a SQLite table, with linked
child tables. **No mainstream framework ships anything like it.** Preserve the
design; rebuild it as a Preact component.

```js
<TableMaint db=${db} title="Directory" table="person"
  fields=${[
    { type:"string", title:"Name",  name:"mname", validate:[notEmpty] },
    { type:"email",  title:"Email", name:"email", validate:[email] },
    { type:"list",   title:"Group", name:"grp", options:GROUPS },
  ]}
  linked=${[{ table: telephones, on: "person" }]} />
```

The rebuild fixes a real defect for free. Today five `this.clear()` sites
(`xscript_crud.js:364, 473, 517, 598, 679`) demolish and rebuild the whole card
body on every navigation, save, and drill-down, destroying scroll position,
focus, and in-progress input. That is what a VDOM exists to prevent; with keyed
rows it stops happening without anyone designing a fix.

**And it removes the need for a grid library.** Revision 1 recommended adding
Grid.js (16 KB gz) because xScript could not do sorted, filtered, incrementally
updated tables. Preact can, in ~100 lines of your own component that matches the
rest of the UI. Grid.js (31 K downloads/wk) and Tabulator (98 KB gz, 124 K/wk)
are both **declined** on this revision. Revisit Tabulator only if inline
spreadsheet-style editing becomes a product goal, which overlaps `TableMaint`'s
form-based editing and needs a product decision first.

### 3.6 Signals: not yet

`@preact/signals-core` is 1 KB gzipped and integrates with Preact directly.
Revision 1 made it a headline recommendation because it was the only way to get
fine-grained updates into a library that had none. **Preact's VDOM now covers
that need**, so signals become a targeted optimisation rather than a foundation.
Add them if a specific component needs to skip re-rendering its parent; don't
adopt them up front.

### 3.7 CodeMirror 6 — now do it

Revision 1 said defer, because a CM6 migration meant rewriting IDE integration
that otherwise worked. **The IDE is being rewritten regardless**, so that
objection is gone and the integration cost stops being incremental.

CM6 is also the right editor on the merits for this product: it is the only one
of CodeMirror/Monaco/Ace with practical touch support, and aCelery's primary form
factor is a phone. It is ~124 KB gzipped for a basic-setup equivalent versus
~69 KB for CM5, but it is tree-shakeable — and `tool/build_bundle.sh` gives you
exactly the build step needed to do that (see §4).

For scale, what CM4 currently ships versus uses, verified by grep across the
whole bundle: **84 modes of which 6 are loaded, 51 addons of which 0 are
referenced, 228 KB of keymaps of which 0 are referenced.** A tree-shaken CM6 with
6 languages should land near 400–500 KB raw against CM4's 2.6 MB.

### 3.8 Charts — the one genuinely new dependency

Nothing in 119 classes draws a chart, and aCelery apps are SQLite-backed; the
shipped Example's entire reporting story is `dirExport()` writing a CSV.
**Chart.js 4.5.1** — 203 KB raw / 68 KB gzipped, 9.2 M downloads/wk — wrapped as
a `<Chart>` component. uPlot (~8 KB) only if a use case appears that plots
thousands of points; Chart.js's API is far friendlier for hobbyist authors, and
68 KB against a bundle shedding 6 MB is noise.

### 3.9 Date pickers — use the platform

Tempus Dominus is 136 KB (88 KB JS + 48 KB CSS) for three picker widgets. On both
target runtimes `<input type="date">` and `<input type="datetime-local">` render
the **native OS picker** — bigger touch targets, familiar gestures, correct
locale, free accessibility. Drop the dependency. Verify on iOS WKWebView; if the
desktop-browser experience proves too thin, revisit for that path only.

---

## 4. The build step — available, and now worth using

C1 forbids a build step for **user apps**. It says nothing about the bundle, and
since Phase 3 the bundle is a source tree assembled by `tool/build_bundle.sh`.
Revision 1 noted this; with the widget layer in play it becomes central.

Extend the script with one `esbuild` pass that produces the vendored `acelery/*`
modules and a tree-shaken CM6. That gives you modern tooling for library code
while user apps stay plain files that need nothing — which is exactly the right
split. Keep the existing staleness test (`assets/aCelery.zip is not stale`)
green; it already guards this seam.

---

## 5. Weight: 7.7 MB → ~1.2 MB

Measured from this tree.

| Item | Now | Projected | As built | Δ |
|---|---|---|---|---|
| `css/bootstrap_themes/` (18 × 228 KB) | 4176 KB | ~250 KB | **908 KB** (232 base + 676 deltas) | **−3.2 MB** — §3.4, *corrected* |
| CodeMirror 4 → 6 modes, no addons/keymaps | 2600 KB | ~500 KB | **592 KB** ✅ 4a | **−2.0 MB** |
| …→ tree-shaken CM6 | 592 KB | ~500 KB | pending 4d | — |
| Dead `css/bootstrap.min.css` | 228 KB | 0 | **reinstated as the theme base** | 0 — §3.4 |
| CodeMirror demo pages served to the LAN | 89 files | — | **0** ✅ 4a | included above |
| Font Awesome 6, subset to icons used | 376 KB | ~60 KB | pending 4e | — |
| Tempus Dominus | 136 KB | 0 | pending 4e | — — §3.9 |
| `lazyload.js` | 13 KB | 0 | pending 4c.8 | — — §3.2 |
| xScript widget layer → Preact + htm + react-bootstrap | ~91 KB | ~50 KB | **127 KB** (45 KB gz) ✅ 4c | **+36 KB** — §3.1a |
| aCelery capability modules (added) | 0 | — | **60 KB** ✅ 4b | **+60 KB** |
| Chart.js (added) | 0 | 203 KB | pending 4e | — |
| **Total** | **7.7 MB** | **~1.2 MB** | **2.4 MB so far** | **−5.3 MB so far** |

The zipped asset went 1.72 MB → **764 KB**. Phases 4c.8, 4d and 4e still have
Tempus Dominus, Font Awesome, `lazyload.js` and the legacy `xscript*.js` to
remove, against Chart.js and CM6 to add.

The saving is in *expanded* size — install footprint, extraction time, and the
IDE's first paint. The zipped asset shrinks much less, since CSS and JS compress
well. Every deletion wants a guard test in `bundle_migration_test.dart` so a
future vendor refresh can't silently restore 2 MB.

---

## 6. What this costs, honestly

The work is real and delivers no new user-visible feature on its own.

| Piece | Shape |
|---|---|
| Bridge → async ES modules, batched selects, params, delete `Android` branches | ~532 lines rewritten; mostly mechanical |
| ~33 widget components (what the IDE uses) + `<Row>`/`<Col>` | the bulk of the new library; each is small |
| `TableMaint` rebuild | the delicate part — 781 lines of behaviour to preserve |
| IDE rewrite (`system/index.html`, 1,024 lines) | the largest single item |
| `launcher.html` + `errorlog.html` (118 lines) | small |
| Example app rewrite (159 lines) | small, and it is the reference doc for authors |
| CM6 integration + esbuild step in `tool/build_bundle.sh` | bounded |
| Test suite rewrite | `bundle_migration_test.dart` guards Bootstrap-3-era concerns; needs replacing |

Call it a few weeks. The `bundle_migration_test.dart` suite exists because a
*method-level* break (`nav.addDropdown is not a function`) shipped during Phase 3
after a class-level check passed — so the new stack needs equivalent guards from
day one, not afterwards.

**The counter-argument, stated fairly:** xScript works today, verified on an
API 36 emulator, with green tests. Rewriting a working system risks regressions
for no new features. If aCelery is being *preserved* as a functioning artifact
rather than *developed*, revision 1's plan — eleven targeted fixes inside
xScript, ~6 MB of pruning, no framework change — remains the better trade, and
§7 lists which of those fixes to take regardless.

Given that you have just landed a three-phase Flutter port toward iOS and
Android and have MCP/AI authoring in the roadmap, the balance falls clearly on
the side of replacing now. **But the honest framing is that this is a question
about your intent for the product, not a technical finding** — and it is the one
decision in this document I can't make from the code.

### 6.1 The argument that tips it: AI authorability

`modernization-assessment.md` Addendum 3 proposes an MCP server for AI-authored
aCelery apps, and identifies its hardest problem correctly:

> **Auto-generate the framework reference resource** from `xscript*.js` — the
> single highest-leverage task for authoring quality.

That task exists **only because the framework is bespoke.** A model writing
xScript must be fed a generated reference and will still guess wrong about
method names, ordering, and fluent-chain semantics — precisely the failure that
shipped during Phase 3. A model writing Preact needs nothing: React-family
idioms are the single largest UI corpus in existence (react 128 M downloads/wk,
preact 24.4 M).

So choosing a mainstream framework **deletes a roadmap item** and raises the
ceiling on AI-authored app quality at the same time. For a single-maintainer
product betting on AI authoring, this is the strongest argument on the list —
stronger than the bytes, and stronger than the 73 dead classes.

---

## 7. Fixes worth taking either way

These are independent of the framework decision. If the rewrite is deferred,
take them now; if it proceeds, fold them in.

1. **Add a doctype.** All four HTML files begin with `<html>` and no
   `<!DOCTYPE html>` (`index.html:1`, `system/index.html:1`, `launcher.html:1`,
   `errorlog.html:1`), so the pages render in **quirks mode** under a Bootstrap 5
   that assumes standards mode. Chromium quirks mode changes percentage-height
   resolution, table-cell style inheritance, and `vertical-align` — very likely
   contributing to layout oddities that would otherwise be blamed on §3.4's grid
   work. One line each; then a visual pass, because fixing quirks mode *shifts*
   existing layouts.
2. **Stop blocking pinch-zoom.** All three system pages carry
   `maximum-scale=1, user-scalable=no` (`system/index.html:3` and siblings) — an
   accessibility failure that buys nothing on a modern WebView. Reduce to
   `width=device-width, initial-scale=1`.
3. **Accessibility at the source.** `xscript.js` contains **zero** `aria-*`
   attributes; only 5 sites across both files wire a `<label for>` to its input,
   so inputs are largely unlabelled to screen readers and to autofill. Whatever
   renders the inputs — xScript or a Preact `<Input>` — should associate the
   label and id by construction, and put `aria-label` on icon-only buttons.
4. **Escape interpolated text.** `xbTitlePanel` builds its header as
   `"<div class='card-header'>" + title + "</div>"` (`xscript_bs5.js:809`; same
   shape at `xscript.js:1191`, across ~53 `innerHTML` sites). Low risk while it
   is the author's own data on their own device; not low once a title or cell
   carries `xHTTP` output, an imported project, or AI-generated content. In
   Preact this stops being possible by default, which is itself a reason to move.
5. **Parameterise SQL** (§3.3) — pull forward if MCP authoring or project import
   lands before the rewrite.
6. **Delete the dead 228 KB `tools/css/bootstrap.min.css`** and the unreferenced
   CodeMirror addons/keymaps/78 modes (§5) — ~2.1 MB for no behaviour change, and
   it removes dozens of vendored CodeMirror demo `index.html` pages that the
   embedded server currently exposes to the LAN for no benefit.

---

## 8. Phasing

Ordered so the system runs end-to-end at every step.

**Phase 4a — foundations, no visible change ✅ done (2026-09-14)**
1. Doctype and viewport fixes (§7.1, §7.2); visual pass on device. ✅
2. Delete unreferenced CodeMirror mass and the dead Bootstrap CSS (§7.6) — ~2.1 MB. ✅
   Actual: CodeMirror **2.6 MB → 592 KB** (51 addons, 228 KB of keymaps, 78 of
   84 modes, 89 demo pages); bundle **7.3 MB → 5.4 MB**, 464 → 122 files.
3. `esbuild` pass in `tool/build_bundle.sh` (§4). ✅ `tool/build_js.sh` builds
   `web/src/` → `bundle/www/tools/js/acelery/` and stamps the output with a hash
   of its inputs, so a stale build fails a test. The output is committed: node
   is needed to *rebuild*, never to pack.

**Phase 4b — the bridge ✅ done (2026-09-14)**
4. Async `fetch` bridge as ES modules; delete the 28 `Android.*` branches;
   batched `select`; bound parameters (§3.3). ✅ 29 branches removed (the count
   here was 28 `Android.*` call sites across 29 `typeof` guards); `xscript.js`
   1,941 → 1,793 lines.
5. Dart side: add the batched + parameterised routes, drop the cursor routes.
   ✅ **added**; the cursor routes **stay until 4d**. Dropping them now would
   break the IDE, the launcher and the Example app, which still run on the
   legacy library — and §8's own rule is that the system runs end-to-end at
   every step. They go with the IDE rewrite at step 10.

#### What the visual pass found

§7.1 warned that leaving quirks mode *shifts* layouts. It did, and it exposed a
second defect that had nothing to do with it:

- **`addTitleWrapper` put a block `<h4>` inside the dropdown's `<a>`.** An
  inline anchor containing a block child is split into anonymous boxes, so the
  heading's text fell outside the anchor's hit area: the IDE's `Project` and
  `File` menus opened only if you hit Bootstrap's `::after` caret, which had
  itself dropped to a line of its own. Invisible in quirks mode. Now a
  `<span class="h4 mb-0">` — Bootstrap ships `.h1`–`.h6` for exactly this.
- **`navBar.navA` did not exist.** The IDE set the navbar brand through
  `navBar.navA.node.innerHTML`, a *property* the Bootstrap 3 library exposed and
  `xscript5` does not, so opening a project, opening a database, or closing
  either threw `Cannot read properties of undefined (reading 'node')`. This
  shipped in Phase 3 and is the same failure as `nav.addDropdown is not a
  function`, one level down — which is why the method-level guard §6 describes
  did not catch it. The four call sites now use `setTitle(title, "h4")`, which
  also sets the title as text rather than markup (§7.4), and a new test pins
  *properties* the shipped pages read, not just methods.

**Phase 4c — the widget layer**
6. Vendor Preact + htm; build the ~33 components the IDE needs, plus
   `<Row>`/`<Col>` on the Bootstrap grid (§3.1, §3.4). ✅ **done (2026-09-14).**
   `web/src/ui/` → `acelery/ui.js`, 127 KB raw / 45 KB gzipped: Preact + htm +
   react-bootstrap (§3.1a), plus the parts react-bootstrap has no equivalent of —
   `<Form>` with `getFormData`/`validateForm` in one piece of state, labelled
   `<Input>`/`<Select>`/`<TextArea>`/`<CheckBox>` that own their `for`/`id`
   pairing, `<Panel>`, `<Row>`/`<Col>`, and validators as plain functions rather
   than xScript's class hierarchy. 33 node tests run against the *built* bundle.
7. `data-bs-theme` theming; drop 17 of 18 theme stylesheets (§3.4) — ~3.9 MB.
   ✅ **done (2026-09-14)**, by a different mechanism than planned and for
   −3.2 MB rather than −3.9 MB. See §3.4's correction: custom properties alone
   retint nothing in Bootstrap 5.3, so each theme became a rule *delta* over one
   stock Bootstrap. All 18 survive and are faithful rather than approximate.
8. Import map + module loading in `launcher.html`; delete `lazyload.js` (§3.2).
   **Next.**

**Phase 4d — the product**
9. `TableMaint` as a Preact component, with keyed rows (§3.5).
10. Rewrite the IDE on the new stack; CodeMirror 6 (§3.7).
11. Rewrite the Example app — it is the reference documentation for authors.
12. New test suite replacing the Bootstrap-3-era guards (§6).

**Phase 4e — additions**
13. `<Chart>` on Chart.js (§3.8).
14. Native date inputs; drop Tempus Dominus (§3.9).
15. Signals, only where a component demonstrably needs them (§3.6).

**Declined on this revision:** Alpine.js (19 KB measured, no component model,
least adopted), Lit (Shadow DOM vs Bootstrap), Vue (8–12× the bytes),
Svelte/Solid (C1), React (Preact is the same paradigm at a ninth the size),
htmx (wrong architecture), Tailwind (build step + restyle everything),
Web Awesome (beta, and a full widget-set replacement), Grid.js/Tabulator
(Preact removes the need), Bootstrap 6 (`6.0.0-alpha1`, not on npm, no date —
but note its ESM-only JS will need a shim wherever `bootstrap.Modal` /
`bootstrap.Offcanvas` are used).

---

## 9. Decisions

**Settled 2026-09-14** (1–6). The remaining open questions are 7 and 8.

1. **Is aCelery being developed toward launch, or preserved as working?**
   **Developed.** §6's counter-argument — that revision 1's eleven targeted
   fixes are the better trade if aCelery is being preserved rather than
   developed — does not apply. Phase 4 proceeds.
2. **Is AI/MCP authoring actually in the plan?** **Yes**, so §6.1 is decisive:
   choosing a mainstream framework deletes the "auto-generate the framework
   reference" roadmap item in `modernization-assessment.md` Addendum 3.
3. **Preact + htm, or plain Preact with `h()` calls?** **htm.** <1 KB, and the
   markup reads as markup.
4. **Does the widget API stay a fluent builder, or become components?**
   **Components.** A builder over Preact would keep the xScript feel but hide
   the framework from authors, forfeiting the §6.1 fluency argument — which is
   the strongest reason for doing any of this.
5. **Hand-written components, or `react-bootstrap` on `preact/compat`?**
   **`react-bootstrap`** (§3.1a). ~17 KB gzipped net once Bootstrap's own JS
   comes out; it deletes most of the "~33 components" line from §6 and fixes
   §7.3's missing `for`/`id` pairing by construction. Consequences to carry into
   Phase 4c:
   - every imperative `bootstrap.Modal` / `bootstrap.Offcanvas` call site must
     convert, or `bootstrap.bundle.min.js` cannot be dropped and the byte case
     evaporates;
   - the widget layer must not be re-bundled for `--platform=node`, or two
     copies of preact core come in and the first render dies inside
     `useBootstrapPrefix` (§3.1a). The browser build is safe; the build script
     counts cores in esbuild's metafile and fails at anything but one.
   - `getFormData`/`validateForm` have no equivalent and stay a local `<Form>`
     wrapper over `validated` + `<Form.Control.Feedback>`.
6. **How many themes survive?** **All 18** (§3.4). The accepted trade — that
   variable overrides would be approximations of the hand-tuned builds — turned
   out not to be the trade on offer: variables alone retint nothing, and the
   delta approach that does work is faithful rather than approximate. The real
   cost is bytes: **4.1 MB → 908 KB**, not the ~250 KB projected.

### Still open

7. **Native date pickers or Tempus Dominus?** Better on phones, 136 KB lighter,
   thinner on desktop. Needs an iOS WKWebView check. Decidable at Phase 4e.
8. **Does the threat model include untrusted app data?** Imported projects,
   `xHTTP` responses, and AI-authored apps all move §7.4 and §3.3's parameterised
   queries from housekeeping to prerequisite. Phase 4b shipped the parameterised
   routes regardless, so this now only governs how hard §7.4's escaping work is
   pushed — and decision 2 ("yes" to AI authoring) argues for treating it as a
   prerequisite.

---

## Sources

Library versions, download counts, and byte sizes measured 2026-09-12 from the
npm registry and the published UMD/prebuilt dists (`gzip -9`). §3.1a's figures
were measured 2026-09-14 from esbuild bundles of `react-bootstrap` 2.10.10 on
`preact/compat` and of a 16-component `@shoelace-style/shoelace` subset, with the
rendered markup verified under Preact in jsdom. Upstream status:

- [Bootstrap 6 release discussion (twbs)](https://github.com/orgs/twbs/discussions/41078) · [Bootstrap in 2026 — current 5.3.8](https://canvastemplate.com/blog/bootstrap-2026)
- [Preact releases](https://github.com/preactjs/preact/releases) · [What's new in Preact for 2026](https://blog.openreplay.com/whats-new-preact-2026/)
- [Lit: Working with Shadow DOM](https://lit.dev/docs/components/shadow-dom/) · [Attach light-DOM component styles (lit#3541)](https://github.com/lit/lit/issues/3541) · [Global styles in Shadow DOM](https://eisenbergeffect.medium.com/using-global-styles-in-shadow-dom-5b80e802e89d)
- [alpinejs on npm](https://www.npmjs.com/package/alpinejs)
- [React Bootstrap (Bootstrap 5 components)](https://react-bootstrap.github.io/) · [Preact: aliasing React to preact/compat](https://preactjs.com/guide/v10/getting-started#aliasing-in-webpack) · [Shoelace components](https://shoelace.style/)
- [Vue installation / global builds](https://vueframework.com/guide/installation.html)
- [Import maps supported cross-browser (web.dev)](https://web.dev/blog/import-maps-in-all-modern-browsers) · [caniuse: import maps](https://caniuse.com/import-maps)
- [CodeMirror 5→6 migration guide](https://codemirror.net/docs/migration/) · [CM6 bundle size (codemirror/dev#760)](https://github.com/codemirror/dev/issues/760) · [Monaco vs CodeMirror vs Ace, 2026](https://www.pistack.xyz/posts/2026-08-22-browser-code-editors-monaco-codemirror-ace-comparison/)
- [Getting rid of synchronous XHRs (Chrome)](https://developer.chrome.com/blog/getting-rid-of-synchronous-xhrs) · ["Abandon hope of removing sync XHR?" (whatwg/xhr#20)](https://github.com/whatwg/xhr/issues/20)
