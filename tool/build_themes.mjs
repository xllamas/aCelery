/**
 * Generates bundle/www/tools/css/themes/ — one small delta stylesheet per
 * aCelery theme, over a single stock Bootstrap.
 *
 * Every theme used to be a self-contained 228 KB Bootswatch build, 18 of them
 * for 4.1 MB. §3.4 proposed replacing the lot with CSS custom properties and
 * `data-bs-theme`, which measured at 66 KB for all 18.
 *
 * That does not work, and the device says so plainly: Bootstrap 5.3 compiles
 * `.btn-primary` to `--bs-btn-bg:#0d6efd`, a literal, not `var(--bs-primary)`.
 * Overriding `--bs-primary` therefore retints nothing a user can see — the
 * aCelery theme's Save button stayed stock blue. Variables carry the palette
 * tokens; the component rules that consume them are already baked.
 *
 * So a theme is the set of rules where its Bootswatch build differs from stock
 * Bootstrap, scoped under a `[data-acelery-theme]` attribute so it layers
 * rather than replaces. Measured: ~30-60 KB per theme against 228 KB, and the
 * result is what Bootswatch actually renders rather than an approximation of
 * it.
 *
 * @font-face rules and anything else fetching a url() are dropped: they point
 * at Google Fonts, which cannot load on an offline device (C3) and would only
 * cost a failed request per theme. Themes fall back to the system font stack,
 * which is the better choice on a phone regardless.
 *
 * Sources come from the bootswatch npm package, so the 4.1 MB of theme builds
 * lives in neither the repo nor the install.
 *
 * Run: node tool/build_themes.mjs   (or via tool/build_js.sh)
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "web/node_modules/bootswatch/dist");
const outDir = join(root, "bundle/www/tools/css/themes");
const stockPath = join(root, "bundle/www/tools/css/bootstrap.min.css");

/**
 * The 18 values xbTheme offers, mapped to their Bootswatch source.
 *
 * `default` is stock Bootstrap, so its delta is empty by definition.
 * `acelery` is stock plus the palette carried over from the Bootstrap 3 theme
 * (#586d72 primary, #86a0a4 brand). Its #283b41 navbar is not carried:
 * xbNavBar hard-codes bg-body-tertiary, so that colour has been inert since
 * Phase 3 and reinstating it would be a visual change, not a migration.
 *
 * Bootswatch renamed two themes at Bootstrap 4 — Paper→Materia and
 * Readable→Litera. Phase 3 kept the old names so every value xbTheme offers
 * resolves; that mapping is preserved here.
 */
const THEMES = {
  acelery: null,
  default: null,
  cerulean: "cerulean",
  cosmo: "cosmo",
  cyborg: "cyborg",
  darkly: "darkly",
  flatly: "flatly",
  journal: "journal",
  lumen: "lumen",
  paper: "materia",
  readable: "litera",
  sandstone: "sandstone",
  simplex: "simplex",
  slate: "slate",
  spacelab: "spacelab",
  superhero: "superhero",
  united: "united",
  yeti: "yeti",
};

/** Themes that ask Bootstrap for its dark colour mode. */
const DARK = ["cyborg", "darkly", "slate", "superhero"];

/**
 * The aCelery palette, in light and dark (doc/shell-redesign.md §5.1).
 *
 * Every text pairing below was measured for WCAG AA contrast; the ratios are in
 * the design doc. `--ac-celery` fails as text (2.87:1 on white) and is only
 * ever decoration. The old brand colour, #86a0a4, measured 2.63:1 against the
 * navbar it sat on, so the brand now uses the primary.
 *
 * Unlike the Bootswatch deltas this palette sets Bootstrap's surface and text
 * tokens too, because it has a dark mode of its own: the tokens are what carry
 * both modes into every component that reads them.
 *
 * Component rules are scoped with :where() for the reason `scope()` documents:
 * a scoped rule must keep the specificity it would have had unscoped.
 */
const ACELERY = `
:root[data-acelery-theme="acelery"] {
  --bs-primary: #3d6b63;
  --bs-primary-rgb: 61, 107, 99;
  --bs-link-color: #3d6b63;
  --bs-link-color-rgb: 61, 107, 99;
  --bs-link-hover-color: #2f534d;
  --bs-link-hover-color-rgb: 47, 83, 77;
  --bs-body-color: #1b2426;
  --bs-body-color-rgb: 27, 36, 38;
  --bs-secondary-color: #5a676a;
  --bs-secondary-bg: #eef2f1;
  --bs-tertiary-bg: #f5f7f6;
  --bs-border-color: #dde4e3;
  --bs-focus-ring-color: rgba(61, 107, 99, .25);
  --ac-primary-tint: #e3eeeb;
  --ac-on-primary: #ffffff;
  --ac-celery: #6aa84f;
}
:root[data-acelery-theme="acelery"][data-bs-theme="dark"] {
  --bs-primary: #7fc1b3;
  --bs-primary-rgb: 127, 193, 179;
  --bs-link-color: #7fc1b3;
  --bs-link-color-rgb: 127, 193, 179;
  --bs-link-hover-color: #a6d5cb;
  --bs-link-hover-color-rgb: 166, 213, 203;
  --bs-body-bg: #1a2224;
  --bs-body-bg-rgb: 26, 34, 36;
  --bs-body-color: #e6ecea;
  --bs-body-color-rgb: 230, 236, 234;
  --bs-secondary-color: #9aa8a6;
  --bs-secondary-bg: #222c2e;
  --bs-tertiary-bg: #111718;
  --bs-border-color: #2f3b3d;
  --bs-focus-ring-color: rgba(127, 193, 179, .3);
  --ac-primary-tint: #24363a;
  --ac-on-primary: #0d1f1b;
  --ac-celery: #9ad17f;
}
:where(:root[data-acelery-theme="acelery"]) .btn-primary {
  --bs-btn-color: #ffffff;
  --bs-btn-bg: #3d6b63;
  --bs-btn-border-color: #3d6b63;
  --bs-btn-hover-color: #ffffff;
  --bs-btn-hover-bg: #345b54;
  --bs-btn-hover-border-color: #315650;
  --bs-btn-focus-shadow-rgb: 90, 129, 122;
  --bs-btn-active-color: #ffffff;
  --bs-btn-active-bg: #2f534d;
  --bs-btn-active-border-color: #2c4e48;
  --bs-btn-disabled-color: #ffffff;
  --bs-btn-disabled-bg: #3d6b63;
  --bs-btn-disabled-border-color: #3d6b63;
}
:where(:root[data-acelery-theme="acelery"][data-bs-theme="dark"]) .btn-primary {
  --bs-btn-color: #0d1f1b;
  --bs-btn-bg: #7fc1b3;
  --bs-btn-border-color: #7fc1b3;
  --bs-btn-hover-color: #0d1f1b;
  --bs-btn-hover-bg: #93cbbf;
  --bs-btn-hover-border-color: #93cbbf;
  --bs-btn-focus-shadow-rgb: 127, 193, 179;
  --bs-btn-active-color: #0d1f1b;
  --bs-btn-active-bg: #a6d5cb;
  --bs-btn-active-border-color: #a6d5cb;
  --bs-btn-disabled-color: #0d1f1b;
  --bs-btn-disabled-bg: #7fc1b3;
  --bs-btn-disabled-border-color: #7fc1b3;
}
:where(:root[data-acelery-theme="acelery"]) .btn-outline-primary {
  --bs-btn-color: var(--bs-primary);
  --bs-btn-border-color: var(--bs-primary);
  --bs-btn-hover-color: var(--ac-on-primary);
  --bs-btn-hover-bg: var(--bs-primary);
  --bs-btn-hover-border-color: var(--bs-primary);
  --bs-btn-active-color: var(--ac-on-primary);
  --bs-btn-active-bg: var(--bs-primary);
  --bs-btn-active-border-color: var(--bs-primary);
  --bs-btn-disabled-color: var(--bs-primary);
  --bs-btn-disabled-border-color: var(--bs-primary);
}
/* Bootstrap compiles these to literal #0d6efd on the component, where a root
   token cannot reach, so each is pointed back at the palette. */
:where(:root[data-acelery-theme="acelery"]) .dropdown-menu {
  --bs-dropdown-link-active-bg: var(--bs-primary);
  --bs-dropdown-link-active-color: var(--ac-on-primary);
}
:where(:root[data-acelery-theme="acelery"]) .list-group {
  --bs-list-group-active-bg: var(--bs-primary);
  --bs-list-group-active-border-color: var(--bs-primary);
  --bs-list-group-active-color: var(--ac-on-primary);
}
:where(:root[data-acelery-theme="acelery"]) .nav-pills {
  --bs-nav-pills-link-active-bg: var(--bs-primary);
  --bs-nav-pills-link-active-color: var(--ac-on-primary);
}
:where(:root[data-acelery-theme="acelery"]) .pagination {
  --bs-pagination-active-bg: var(--bs-primary);
  --bs-pagination-active-border-color: var(--bs-primary);
  --bs-pagination-active-color: var(--ac-on-primary);
}
:where(:root[data-acelery-theme="acelery"]) .form-check-input:checked {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
}
/* The navbar sets its own brand colour on .navbar, below the root, so the
   token alone would not reach the brand. */
:where(:root[data-acelery-theme="acelery"]) .navbar-brand,
:where(:root[data-acelery-theme="acelery"]) .navbar-brand:hover {
  color: var(--bs-primary);
}
:where(:root[data-acelery-theme="acelery"]) .form-control:focus,
:where(:root[data-acelery-theme="acelery"]) .form-select:focus,
:where(:root[data-acelery-theme="acelery"]) .form-check-input:focus {
  border-color: rgba(var(--bs-primary-rgb), .6);
  box-shadow: 0 0 0 .25rem rgba(var(--bs-primary-rgb), .25);
}
`;

/**
 * Splits a minified stylesheet into top-level rules, so two builds can be
 * compared rule by rule. Quote-aware, because selectors contain braces inside
 * attribute values.
 */
function rules(css) {
  const out = [];
  let depth = 0, start = 0, quote = null, parens = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    /* A block-less statement — Bootswatch opens with `@import url(…fonts…);` —
       ends at its semicolon. Without this it was glued to the front of the
       rule after it, which is the theme's `:root` variable block, and the
       webfont filter then dropped both: no theme carried its --bs-primary, so
       anything reading the token rather than a component's literal colour
       (the shell's whole palette, doc/shell-redesign.md §5.2) stayed stock
       blue. */
    /* Parentheses are tracked because that @import's URL is unquoted and
       carries its own semicolon (`wght@400;700`). Splitting there left a
       brace-less `700&display=swap);` in the delta, which the browser read as
       the start of the next selector — invalidating the very :root block this
       split exists to keep. */
    if (c === "(") { parens++; continue; }
    if (c === ")") { parens = Math.max(0, parens - 1); continue; }
    if (c === ";" && depth === 0 && parens === 0) {
      out.push(css.slice(start, i + 1));
      start = i + 1;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) { out.push(css.slice(start, i + 1)); start = i + 1; }
    }
  }
  return out;
}

/**
 * Scopes a rule to one theme *without changing its specificity*.
 *
 * The obvious way — prefixing `:root[data-acelery-theme="x"] ` — is wrong, and
 * wrong in a way that takes a while to find. Bootswatch ships
 * `.dropdown-menu{display:none}` and Bootstrap unhides it with
 * `.dropdown-menu.show{display:block}`. Prefixed, the theme's rule scores
 * (0,2,1) against the base's (0,2,0), so it wins and *every dropdown in the
 * product stops opening* under any Bootswatch theme — with no error anywhere,
 * because the markup is perfect and the click handler runs.
 *
 * `:where()` contributes zero specificity, so a scoped rule keeps exactly the
 * score it had inside its own stylesheet and the relationships Bootstrap
 * relies on survive intact. Source order still puts the theme after the base,
 * which is all the scoping needs to do.
 *
 * Selectors that describe the root element itself are a separate case: they
 * must keep at least their original weight, or the base `:root` block would
 * beat the theme's variables. Those get the attribute directly.
 */
function scope(rule, theme) {
  const where = `:where(:root[data-acelery-theme="${theme}"])`;
  const attr = `[data-acelery-theme="${theme}"]`;
  const brace = rule.indexOf("{");
  const selector = rule.slice(0, brace);
  const body = rule.slice(brace);

  // At-rules wrap other rules; scope what is inside them instead.
  if (selector.trimStart().startsWith("@")) {
    const inner = body.slice(1, -1);
    return `${selector}{${rules(inner).map((r) => scope(r, theme)).join("")}}`;
  }

  const scoped = selector
    .split(",")
    .map((s) => {
      const t = s.trim();
      // Root-targeting selectors: keep their own weight, add the attribute.
      if (t === ":root") return `:root${attr}`;
      if (t.startsWith(":root")) return `:root${attr}${t.slice(5)}`;
      if (t.startsWith("[data-bs-theme")) return `:root${attr}${t}`;
      if (t === "html") return `:root${attr}`;
      // Everything else keeps its specificity exactly.
      return `${where} ${t}`;
    })
    .join(",");

  return scoped + body;
}

const stock = new Set(rules(readFileSync(stockPath, "utf8")));
const bootswatchVersion = JSON.parse(
  readFileSync(join(root, "web/node_modules/bootswatch/package.json"), "utf8"),
).version;

function banner(theme, note) {
  return `/*! aCelery theme "${theme}" — generated by tool/build_themes.mjs, do not edit.
 * ${note}
 * Layered over /tools/css/bootstrap.min.css; applied by setting
 * data-acelery-theme="${theme}" on <html>. */
`;
}

function build(theme) {
  if (theme === "default") {
    return banner(theme, "Stock Bootstrap 5.3.8: nothing to override.");
  }
  if (theme === "acelery") {
    return banner(theme, "Palette carried over from the Bootstrap 3 theme.") + ACELERY;
  }

  const source = THEMES[theme];
  const all = rules(readFileSync(join(dist, source, "bootstrap.min.css"), "utf8"));
  const delta = all.filter(
    (r) =>
      !stock.has(r) &&
      // A statement with no block — @charset, @import — has nothing to scope,
      // and a stray fragment would corrupt the rule after it.
      r.includes("{") &&
      !r.startsWith("@charset") &&
      !/@font-face|@import|url\(/.test(r),
  );
  if (delta.length === 0) throw new Error(`${theme}: empty delta`);

  const renamed = source === theme ? "" : ` (Bootswatch renamed it "${source}" at Bootstrap 4)`;
  return (
    banner(
      theme,
      `${delta.length} rules where bootswatch ${bootswatchVersion} differs from stock${renamed}.\n * Webfont rules dropped: they fetch from Google Fonts, which an offline device cannot reach.`,
    ) + delta.map((r) => scope(r, theme)).join("\n")
  );
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let total = 0;
for (const theme of Object.keys(THEMES)) {
  const css = build(theme);
  writeFileSync(join(outDir, `${theme}.css`), css);
  total += Buffer.byteLength(css);
}

// One tiny always-loaded file, so a page knows which themes want dark mode
// before any script runs.
const darkCss =
  `/*! Generated by tool/build_themes.mjs. */\n` +
  DARK.map((t) => `:root[data-acelery-theme="${t}"]`).join(",\n") +
  ` {\n  color-scheme: dark;\n}\n`;
writeFileSync(join(outDir, "_dark.css"), darkCss);

console.log(
  `bundle/www/tools/css/themes/: ${Object.keys(THEMES).length} themes, ` +
    `${(total / 1024).toFixed(0)} KB total ` +
    `(was 18 × 228 KB = 4.1 MB)`,
);
