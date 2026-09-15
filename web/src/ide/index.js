/**
 * The aCelery system shell: Home, Apps, Code, Data and Settings, in one app
 * frame (doc/shell-redesign.md).
 *
 * This was 1,024 lines of `system/index.html` built on the 2014 widget layer,
 * then a component tree that kept the 2014 interaction model: a navbar per
 * screen, menus of verbs, and screens that opened on nothing until you found
 * the right item behind a hamburger. Each destination now opens on its own
 * content, and every screen has a route.
 *
 * The host calls two things by name, so they stay global:
 *   - `forceSaveFile()`, which the shell runs on pause and on back
 *     (lib/src/shell/host_bridge.dart), defined by the Code workspace;
 *   - `aceleryEditor`, which system/index.html assigns from acelery/editor.js.
 */

import {
  html, render, useState, useEffect, useCallback, Button, applyTheme, isDark,
} from "acelery/ui.js";
/* The theme list comes from the editor module rather than a second copy here,
   so adding a palette is the whole of adding a theme. Resolved through the
   import map at runtime; ide.js is bundled with acelery/* left external. */
import { EDITOR_THEMES } from "acelery/editor.js";

import { AppFrame, Screen } from "./frame.js";
import { NotFound, Skeleton, ToastProvider } from "./parts.js";
import { navigate, redirectLegacyQuery, useRoute } from "./router.js";
import { hasHost, hostPost, loadConfig, saveConfig } from "./store.js";

import { HomeScreen } from "./home_screen.js";
import { AppsScreen } from "./apps_screen.js";
import { CodeScreen } from "./code_screen.js";
import { CodeWorkspace } from "./code_workspace.js";
import { DataScreen } from "./data_screen.js";
import { DataWorkspace } from "./data_workspace.js";
import { SettingsScreen } from "./settings_screen.js";

/* Settings writes go one at a time. Each opens acelery.db, and two at once —
   a recent file and a theme change, say — would contend for its lock. */
let writes = Promise.resolve();
function queueSave(patch) {
  const run = writes.then(() => saveConfig(patch));
  writes = run.catch((e) => console.error("aCelery: could not save settings", e));
  return run;
}

/** `rgb(26, 34, 36)` → `#1a2224`, for the host, which has no CSS parser. */
function toHex(color) {
  const m = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return "#" + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

/**
 * Tells the host what colour the top of the page is, so the status bar above
 * it can match — the host owns that bar, and `theme-color` does not reach it
 * (§7). Measured from the page rather than from the palette, because under a
 * Bootswatch theme only the page knows.
 */
function tellHostChrome() {
  if (!hasHost()) return;
  requestAnimationFrame(() => {
    const bar = document.querySelector(".ac-appbar") ?? document.body;
    const color = toHex(getComputedStyle(bar).backgroundColor);
    hostPost({ action: "setChrome", dark: isDark(), ...(color ? { color } : {}) });
  });
}

function Shell() {
  const route = useRoute();
  const [settings, setSettings] = useState(null);
  const [, setThemeTick] = useState(0);

  useEffect(() => {
    loadConfig().then(
      (loaded) => {
        applyTheme(loaded.theme || "acelery", { mode: loaded["theme.mode"] || "system" });
        setSettings(loaded);
      },
      (e) => {
        console.error("aCelery: could not read settings", e);
        applyTheme("acelery", { mode: "system" });
        setSettings({});
      },
    );
  }, []);

  /* A theme or mode change — including the device switching to dark while
     aCelery is open — re-renders whatever reads it: the editor's "follow"
     scheme, the Settings screen, and the host's status bar. The theme's
     stylesheet loads after the attributes change, so the colour is measured
     again once it has. */
  useEffect(() => {
    const onChange = () => {
      setThemeTick((n) => n + 1);
      tellHostChrome();
    };
    document.addEventListener("acelery:themechange", onChange);
    const link = document.getElementById("xbtheme");
    link?.addEventListener("load", tellHostChrome);
    return () => {
      document.removeEventListener("acelery:themechange", onChange);
      link?.removeEventListener("load", tellHostChrome);
    };
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    queueSave(patch);
  }, []);

  if (!settings) {
    return html`
      <${AppFrame} section=${route.section}>
        <${Screen} title="aCelery"><${Skeleton} rows=${3} /><//>
      <//>`;
  }

  /* "" means follow the app, which is what someone who has just picked Dark
     wants; anything else is a scheme they chose deliberately. */
  const chosen = settings.editortheme;
  const editorTheme = chosen && EDITOR_THEMES.some((t) => t.value === chosen)
    ? chosen
    : isDark() ? "dark" : "light";

  const { section, parts } = route;
  const common = { settings, updateSettings };
  let screen;

  switch (section) {
    case "home":
      screen = html`<${HomeScreen} ...${common} />`;
      break;
    case "apps":
      screen = html`<${AppsScreen} ...${common} />`;
      break;
    case "code":
      screen = parts[0]
        ? html`<${CodeWorkspace} key=${parts[0]} project=${parts[0]} fileName=${parts[1]}
                 editorTheme=${editorTheme} ...${common} />`
        : html`<${CodeScreen} ...${common} />`;
      break;
    case "data":
      screen = parts[0]
        ? html`<${DataWorkspace} key=${parts[0]} dbName=${parts[0]}
                 parts=${parts.slice(1)} ...${common} />`
        : html`<${DataScreen} ...${common} />`;
      break;
    case "settings":
      screen = html`<${SettingsScreen} ...${common} />`;
      break;
    default:
      screen = html`
        <${Screen} title="Not found">
          <${NotFound} what="Page" action=${html`
            <${Button} variant="primary" onClick=${() => navigate([], { replace: true })}>
              Go home
            <//>`} />
        <//>`;
  }

  return html`
    <${ToastProvider}>
      <${AppFrame} section=${section}>${screen}<//>
    <//>`;
}

export default function start(root = document.body) {
  redirectLegacyQuery();
  render(html`<${Shell} />`, root);
}
