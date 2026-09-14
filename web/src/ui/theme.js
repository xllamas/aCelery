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

const THEME_DIR = "/tools/css/themes/";
const LINK_ID = "acelery-theme";

/**
 * Applies a theme: points the theme <link> at its delta and sets the attributes
 * the delta is scoped by. Idempotent, and safe to call before the stylesheet
 * has loaded.
 *
 * @returns {string} the theme actually applied
 */
export function applyTheme(name) {
  const theme = THEMES.includes(name) ? name : "acelery";
  const root = document.documentElement;

  let link = document.getElementById(LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `${THEME_DIR}${theme}.css`;

  root.setAttribute("data-acelery-theme", theme);
  root.setAttribute("data-bs-theme", DARK.has(theme) ? "dark" : "light");
  return theme;
}

/** The theme currently applied. */
export function currentTheme() {
  return document.documentElement.getAttribute("data-acelery-theme") ?? "acelery";
}

/** True when the active theme asks Bootstrap for its dark colour mode. */
export function isDark(name = currentTheme()) {
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
