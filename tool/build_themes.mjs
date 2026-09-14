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

/** The aCelery palette, as both tokens and the component rules that use them. */
const ACELERY = `
:root[data-acelery-theme="acelery"] {
  --bs-primary: #586d72;
  --bs-primary-rgb: 88, 109, 114;
  --bs-link-color: #586d72;
  --bs-link-color-rgb: 88, 109, 114;
  --bs-link-hover-color: #465a5e;
  --bs-link-hover-color-rgb: 70, 90, 94;
  --bs-navbar-brand-color: #86a0a4;
  --bs-navbar-active-color: #86a0a4;
}
:root[data-acelery-theme="acelery"] .btn-primary {
  --bs-btn-bg: #586d72;
  --bs-btn-border-color: #586d72;
  --bs-btn-hover-bg: #4b5c60;
  --bs-btn-hover-border-color: #465a5e;
  --bs-btn-active-bg: #465a5e;
  --bs-btn-active-border-color: #3f5054;
  --bs-btn-disabled-bg: #586d72;
  --bs-btn-disabled-border-color: #586d72;
}
:root[data-acelery-theme="acelery"] .btn-outline-primary {
  --bs-btn-color: #586d72;
  --bs-btn-border-color: #586d72;
  --bs-btn-hover-bg: #586d72;
  --bs-btn-hover-border-color: #586d72;
  --bs-btn-active-bg: #586d72;
  --bs-btn-active-border-color: #586d72;
  --bs-btn-disabled-color: #586d72;
  --bs-btn-disabled-border-color: #586d72;
}
:root[data-acelery-theme="acelery"] .navbar-brand { color: #86a0a4; }
:root[data-acelery-theme="acelery"] .form-control:focus,
:root[data-acelery-theme="acelery"] .form-select:focus {
  border-color: #86a0a4;
  box-shadow: 0 0 0 .25rem rgba(88, 109, 114, .25);
}
`;

/**
 * Splits a minified stylesheet into top-level rules, so two builds can be
 * compared rule by rule. Quote-aware, because selectors contain braces inside
 * attribute values.
 */
function rules(css) {
  const out = [];
  let depth = 0, start = 0, quote = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) { out.push(css.slice(start, i + 1)); start = i + 1; }
    }
  }
  return out;
}

/** Raises a rule's specificity so the delta layers over the base stylesheet. */
function scope(rule, theme) {
  const attr = `:root[data-acelery-theme="${theme}"]`;
  const brace = rule.indexOf("{");
  const selector = rule.slice(0, brace);
  const body = rule.slice(brace);

  // At-rules wrap other rules; scope what is inside them instead.
  if (selector.trimStart().startsWith("@")) {
    const inner = body.slice(1, -1);
    return `${selector}{${rules(inner).map((r) => scope(r, theme)).join("")}}`;
  }

  // `:root` and `[data-bs-theme=…]` selectors describe the document, so the
  // attribute goes on them rather than in front of them.
  const scoped = selector
    .split(",")
    .map((s) => {
      const t = s.trim();
      if (t === ":root" || t.startsWith(":root")) return attr + t.slice(5);
      if (t.startsWith("[data-bs-theme")) return `${attr}${t}`;
      if (t === "html" || t === "body") return `${attr} ${t === "html" ? "" : t}`.trim() || attr;
      return `${attr} ${t}`;
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
