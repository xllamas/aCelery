/**
 * The aCelery system shell: main menu, app launcher, IDE, DB Manager, config.
 *
 * This was 1,024 lines of `system/index.html` built on the 2014 widget layer,
 * with every screen's state in globals and menu enable/disable done by
 * positional indexing into the navbar. It is now a component tree on
 * acelery/ui.js, and the page that hosts it carries no classic scripts at all —
 * no xscript.js, no bootstrap.bundle.min.js, no Tempus Dominus.
 *
 * The host calls two of these things by name, so they stay global:
 *   - `forceSaveFile()`, which the shell runs on pause and on back
 *     (lib/src/shell/host_bridge.dart), defined by the IDE screen;
 *   - `aceleryEditor`, which system/index.html assigns from acelery/editor.js.
 */

import {
  html, render, useState, useEffect, useCallback,
  Container, ListGroup, Button, ButtonGroup, Alert,
  Panel, Select, ThemeSelect, applyTheme, currentTheme, isDark,
} from "acelery/ui.js";
import * as file from "acelery/file.js";
import { openDB } from "acelery/sql.js";
import { runApp } from "acelery/export.js";
/* The theme list comes from the editor module rather than a second copy here,
   so adding a palette is the whole of adding a theme. Resolved through the
   import map at runtime; ide.js is bundled with acelery/* left external. */
import { EDITOR_THEMES, isDarkTheme } from "acelery/editor.js";

import { IdeNavbar, useNotice } from "./chrome.js";
import { IdeScreen } from "./ide_screen.js";
import { DbScreen } from "./db_screen.js";

/* ----------------------------------------------------------------- config */

/**
 * Settings live in `acelery.db`, as they always have.
 *
 * The table has a unique key and the 2014 code wrote it with an
 * "insert or ignore" followed by an "update", both concatenated. One
 * parameterised upsert does the same job and cannot be broken by an apostrophe.
 */
async function loadConfig() {
  const db = await openDB("acelery.db");
  await db.exec(
    "create table if not exists config (cfg_key text unique, cfg_value text)",
  );
  const rows = await db.select("select cfg_key, cfg_value from config");
  await db.close();
  return Object.fromEntries(rows.map((r) => [r.cfg_key, r.cfg_value]));
}

async function saveConfig(settings) {
  const db = await openDB("acelery.db");
  for (const [key, value] of Object.entries(settings)) {
    await db.exec(
      "insert into config (cfg_key, cfg_value) values (?, ?)" +
        " on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",
      [key, value],
    );
  }
  await db.close();
}

/* -------------------------------------------------------------- main menu */

const MENU = [
  { key: "apps", icon: "fa-solid fa-table-cells", title: "My Apps",
    blurb: "List and run your aCelery apps" },
  { key: "ide", icon: "fa-solid fa-pen-to-square", title: "aCelery IDE",
    blurb: "Integrated Development Environment for aCelery apps" },
  { key: "db", icon: "fa-solid fa-hard-drive", title: "DB Manager",
    blurb: "Manage your SQL databases" },
  { key: "config", icon: "fa-solid fa-gear", title: "Configure",
    blurb: "Configure aCelery" },
  { key: "site", icon: "fa-solid fa-cloud", title: "Visit Website",
    blurb: "Visit www.acelery.com", href: "http://www.acelery.com/" },
];

function MainMenu({ onGo }) {
  return html`
    <${Container} fluid className="p-0">
      <${ListGroup}>
        ${MENU.map((item) =>
          item.href
            ? html`
                <${ListGroup.Item} key=${item.key} action href=${item.href}
                                   target="_blank" rel="noopener">
                  <${MenuBody} item=${item} />
                <//>`
            : html`
                <${ListGroup.Item} key=${item.key} action
                                   onClick=${() => onGo(item.key)}>
                  <${MenuBody} item=${item} />
                <//>`,
        )}
      <//>
    <//>`;
}

const MenuBody = ({ item }) => html`
  <div class="h3 mb-1"><i class=${item.icon}></i> ${" " + item.title}</div>
  <p class="mb-0 text-body-secondary">${item.blurb}</p>`;

/* ------------------------------------------------------------------- apps */

function AppsScreen({ onExit }) {
  const [apps, setApps] = useState(null);
  const { banner, fail } = useNotice();

  useEffect(() => {
    (async () => {
      try {
        const root = (await file.externalStoragePath()) + "/aCelery/www/";
        const entries = await file.listFiles("user", root);
        const found = [];
        for (const entry of entries) {
          if (!entry.directory) continue;
          let description = "";
          try {
            const handle = await file.open(
              "acelery_app.json", `${root}user/${entry.fname}`,
            );
            const text = await handle.read();
            await handle.close();
            if (text) description = JSON.parse(text).description ?? "";
          } catch {
            // An app without a readable manifest is still runnable.
          }
          found.push({ name: entry.fname, description });
        }
        setApps(found.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        fail(e);
        setApps([]);
      }
    })();
  }, []);

  return html`
    <${IdeNavbar} title="aCelery Apps"
      items=${[{ label: "Main Menu", onSelect: onExit }]} />
    <${Container} fluid>
      ${banner}
      ${apps === null
        ? html`<p class="text-body-secondary">Looking for apps…</p>`
        : apps.length
          ? html`
              <${ListGroup}>
                ${apps.map(
                  (app) => html`
                    <${ListGroup.Item} key=${app.name} action
                      onClick=${() => runApp(app.name, app.name, false)}>
                      <div class="h3 mb-1">
                        <i class="fa-solid fa-table-cells"></i>
                        ${" " + app.name}
                      </div>
                      <p class="mb-0 text-body-secondary">${app.description}</p>
                    <//>`,
                )}
              <//>`
          : html`<${Alert} variant="secondary">
              No apps yet. Make one in the IDE.
            <//>`}
    <//>`;
}

/* ----------------------------------------------------------------- config */

function ConfigScreen({ settings, onChange, onExit }) {
  const [editorTheme, setEditorTheme] = useState(settings.editortheme ?? "");
  const { banner, notify, fail } = useNotice();

  async function save() {
    try {
      await saveConfig({
        theme: currentTheme(),
        editortheme: editorTheme,
      });
      onChange({ theme: currentTheme(), editortheme: editorTheme });
      notify("Configuration saved.", "success");
    } catch (e) {
      fail(e);
    }
  }

  return html`
    <${IdeNavbar} title="aCelery Configuration"
      items=${[{ label: "Main Menu", onSelect: onExit }]} />
    <${Container} fluid>
      ${banner}
      <${Panel} title="aCelery Configuration">
        <${ThemeSelect} label="aCelery Theme" />
        <${Select} label="Editor Theme" value=${editorTheme}
          onChange=${setEditorTheme} options=${EDITOR_THEMES}
          help=${editorTheme
            ? `${isDarkTheme(editorTheme) ? "A dark" : "A light"} scheme, ` +
              "regardless of the aCelery theme."
            : "Tracks whichever aCelery theme is active."} />
        <${ButtonGroup}>
          <${Button} variant="primary" onClick=${save}>Save<//>
          <${Button} variant="secondary" onClick=${onExit}>Exit<//>
        <//>
      <//>
    <//>`;
}

/* ------------------------------------------------------------------ shell */

function Shell() {
  const [screen, setScreen] = useState(
    new URLSearchParams(location.search).get("opt") === "apps" ? "apps" : "menu",
  );
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadConfig().then(
      (loaded) => {
        if (loaded.theme) applyTheme(loaded.theme);
        setSettings(loaded);
      },
      () => setSettings({}),
    );
  }, []);

  /**
   * "" means follow the aCelery theme, which is what a user who has just
   * picked Darkly wants; anything else is a scheme they chose deliberately.
   */
  const editorTheme = useCallback(() => {
    const chosen = settings?.editortheme;
    if (chosen && EDITOR_THEMES.some((t) => t.value === chosen)) return chosen;
    return isDark() ? "dark" : "light";
  }, [settings])();

  const home = () => setScreen("menu");

  if (!settings) {
    return html`<${Container} fluid className="pt-3">
      <p class="text-body-secondary">Starting…</p>
    <//>`;
  }

  switch (screen) {
    case "apps":
      return html`<${AppsScreen} onExit=${home} />`;
    case "ide":
      return html`<${IdeScreen} onExit=${home} editorTheme=${editorTheme} />`;
    case "db":
      return html`<${DbScreen} onExit=${home} />`;
    case "config":
      return html`<${ConfigScreen} settings=${settings}
        onChange=${(next) => setSettings({ ...settings, ...next })}
        onExit=${home} />`;
    default:
      return html`<${Container} fluid className="pt-3">
        <${MainMenu} onGo=${setScreen} />
      <//>`;
  }
}

export default function start(root = document.body) {
  render(html`<${Shell} />`, root);
}
