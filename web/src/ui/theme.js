/**
 * Theming.
 *
 * `xbTheme.setTheme` swapped an entire 228 KB Bootswatch build per theme
 * change, from a directory of 18 totalling 4.1 MB. A theme is now a *delta*
 * over one stock Bootstrap — the rules where it differs, 30-80 KB — applied by
 * setting `data-acelery-theme` on the document and pointing one <link> at the
 * matching file (§3.4).
 *
 * §3.4 originally proposed custom properties alone, at 66 KB for all 18. That
 * does not work: Bootstrap 5.3 compiles `.btn-primary` to `--bs-btn-bg:#0d6efd`,
 * a literal rather than `var(--bs-primary)`, so overriding the palette tokens
 * retints nothing visible. tool/build_themes.mjs records the measurement.
 *
 * All 18 values xbTheme offered still resolve, which was the decision (§9.6),
 * and each is what Bootswatch actually renders rather than an approximation —
 * minus its webfonts, which fetch from Google Fonts and cannot load offline.
 *
 * A mode — light, dark, or following the system — applies to the two themes
 * that can render either way: aCelery's own palette, and stock Bootstrap. A
 * Bootswatch build is one or the other, so for those the theme decides
 * (doc/shell-redesign.md §5.2).
 */

import { html } from "htm/preact";
import { useEffect, useState } from "preact/hooks";

/** The 18 names xbTheme offered, in the order it offered them. */
export const THEMES = [
  "acelery", "default", "cerulean", "cosmo", "cyborg", "darkly", "flatly",
  "journal", "lumen", "paper", "readable", "sandstone", "simplex", "slate",
  "spacelab", "superhero", "united", "yeti",
];

/** Which of them Bootstrap should render in its dark colour mode. */
const DARK = new Set(["cyborg", "darkly", "slate", "superhero"]);

/** Themes that honour a light/dark/system mode rather than fixing one. */
const MODAL = new Set(["acelery", "default"]);

/** The modes a modal theme accepts. */
export const MODES = ["system", "light", "dark"];

const THEME_DIR = "/tools/css/themes/";

/* The same id the pages put on their initial <link>, and the same one
   xbTheme.setTheme uses in the legacy library. Using a different one left both
   stylesheets attached, so the theme being switched away from kept applying —
   which is only invisible while two themes happen to agree. */
const LINK_ID = "xbtheme";

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

function systemIsDark() {
  return !!globalThis.matchMedia?.(SYSTEM_DARK).matches;
}

function resolveDark(theme, mode) {
  if (!MODAL.has(theme)) return DARK.has(theme);
  if (mode === "dark") return true;
  if (mode === "system") return systemIsDark();
  return false;
}

/** Lets a page re-render whatever depends on the colour mode. */
function announce() {
  document.dispatchEvent(new CustomEvent("acelery:themechange"));
}

/* One listener for the page's lifetime, consulted only while the mode is
   "system", so switching modes back and forth does not stack them up. */
let watching = false;
function watchSystem() {
  if (watching) return;
  const query = globalThis.matchMedia?.(SYSTEM_DARK);
  if (!query?.addEventListener) return;
  watching = true;
  query.addEventListener("change", () => {
    const root = document.documentElement;
    if (root.getAttribute("data-acelery-mode") !== "system") return;
    root.setAttribute(
      "data-bs-theme",
      resolveDark(currentTheme(), "system") ? "dark" : "light",
    );
    announce();
  });
}

/**
 * Applies a theme: points the theme <link> at its delta and sets the attributes
 * the delta is scoped by. Idempotent, and safe to call before the stylesheet
 * has loaded.
 *
 * `mode` is optional and sticky: leave it out and the mode last applied stays,
 * so an app that only ever switches themes never has to know modes exist.
 *
 * @param {string} name
 * @param {{mode?: "system"|"light"|"dark"}} [options]
 * @returns {string} the theme actually applied
 */
export function applyTheme(name, { mode } = {}) {
  const theme = THEMES.includes(name) ? name : "acelery";
  const root = document.documentElement;
  const chosen = MODES.includes(mode) ? mode : currentMode();

  let link = document.getElementById(LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `${THEME_DIR}${theme}.css`;

  root.setAttribute("data-acelery-theme", theme);
  root.setAttribute("data-acelery-mode", chosen);
  root.setAttribute("data-bs-theme", resolveDark(theme, chosen) ? "dark" : "light");
  if (chosen === "system") watchSystem();
  announce();
  return theme;
}

/** The theme currently applied. */
export function currentTheme() {
  return document.documentElement.getAttribute("data-acelery-theme") ?? "acelery";
}

/** The mode last applied; "light" until one is chosen. */
export function currentMode() {
  const mode = document.documentElement.getAttribute("data-acelery-mode");
  return MODES.includes(mode) ? mode : "light";
}

/** Whether a theme honours the mode, or fixes its own. */
export function themeHasModes(name = currentTheme()) {
  return MODAL.has(name);
}

/** True when the theme renders in Bootstrap's dark colour mode. */
export function isDark(name = currentTheme()) {
  if (name === currentTheme()) {
    return document.documentElement.getAttribute("data-bs-theme") === "dark";
  }
  return DARK.has(name);
}

/**
 * xbTheme — a select that switches the theme. `onChange` fires after the theme
 * is applied, so a caller can persist it.
 */
export function ThemeSelect({ label = "Theme", value, onChange, className }) {
  const [theme, setTheme] = useState(value ?? currentTheme());

  useEffect(() => {
    if (value && value !== theme) {
      setTheme(applyTheme(value));
    }
  }, [value]);

  function pick(next) {
    const applied = applyTheme(next);
    setTheme(applied);
    onChange?.(applied);
  }

  return html`
    <div class=${`mb-3 ${className ?? ""}`}>
      <label class="form-label fw-bold" for="acelery_theme">${label}</label>
      <select class="form-select" id="acelery_theme" value=${theme}
              onChange=${(e) => pick(e.currentTarget.value)}>
        ${THEMES.map(
          (t) =>
            html`<option key=${t} value=${t}>
              ${t.charAt(0).toUpperCase() + t.slice(1)}
            </option>`,
        )}
      </select>
    </div>`;
}
