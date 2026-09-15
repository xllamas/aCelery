/**
 * Home: pick up where you left off, or start something (doc/shell-redesign.md
 * §4.2). Replaces the main menu, which was five headings in a list.
 */

import { html, useState, useEffect, Button } from "acelery/ui.js";
import { runApp } from "acelery/export.js";

import { Screen } from "./frame.js";
import { Icon, InlineError, ProjectTile, Skeleton } from "./parts.js";
import { href, navigate, setIntent } from "./router.js";
import { listDatabases, listProjects, formatSize } from "./store.js";

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A same-page link that goes through the router, so the guard gets a say. */
const link = (path) => (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(path);
};

export function HomeScreen({ settings, updateSettings }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [projects, databases] = await Promise.all([listProjects(), listDatabases()]);
        if (!live) return;
        setData({ projects, databases });

        // A recent item whose target has gone is dropped quietly (§4.2).
        const stale = {};
        const project = settings["recent.project"];
        if (project && !projects.some((p) => p.name === project)) {
          stale["recent.project"] = "";
          stale["recent.file"] = "";
        }
        const db = settings["recent.db"];
        if (db && !databases.some((d) => d.name === db)) stale["recent.db"] = "";
        if (Object.keys(stale).length) updateSettings(stale);
      } catch (e) {
        if (!live) return;
        setError(e);
        setData({ projects: [], databases: [] });
      }
    })();
    return () => { live = false; };
  }, []);

  const project = data?.projects.find((p) => p.name === settings["recent.project"]);
  const file = project ? settings["recent.file"] : "";
  const db = data?.databases.find((d) => d.name === settings["recent.db"]);
  const example = data?.projects.find((p) => p.name === "Example");

  const newApp = () => {
    setIntent("new-project");
    navigate(["code"]);
  };
  const newDb = () => {
    setIntent("new-db");
    navigate(["data"]);
  };

  let continuing;
  if (!data) {
    continuing = html`<${Skeleton} rows=${2} />`;
  } else if (project || db) {
    continuing = html`
      <div class="ac-continue">
        ${project
          ? html`
              <div class="ac-continue-card">
                <${ProjectTile} name=${project.name} icon=${project.icon} />
                <div class="ac-row-body">
                  <div class="ac-row-title">${project.name}</div>
                  <div class="ac-row-meta">${file || project.description || "Project"}</div>
                </div>
                <div class="ac-button-row">
                  <${Button} variant="outline-primary"
                    onClick=${() => navigate(file ? ["code", project.name, file] : ["code", project.name])}>
                    Open
                  <//>
                  <${Button} variant="primary"
                    onClick=${() => runApp(project.name, project.name, true)}>
                    <${Icon} name="fa-solid fa-play" /> Run
                  <//>
                </div>
              </div>`
          : null}
        ${db
          ? html`
              <div class="ac-continue-card">
                <div class="ac-row-icon" aria-hidden="true">
                  <${Icon} name="fa-solid fa-database" />
                </div>
                <div class="ac-row-body">
                  <div class="ac-row-title">${db.name}</div>
                  <div class="ac-row-meta">Database · ${formatSize(db.length)}</div>
                </div>
                <div class="ac-button-row">
                  <${Button} variant="outline-primary" onClick=${() => navigate(["data", db.name])}>
                    Open
                  <//>
                </div>
              </div>`
          : null}
      </div>`;
  } else {
    continuing = html`
      <div class="ac-welcome">
        <h2>Welcome to aCelery</h2>
        <p>
          An aCelery app is a few JavaScript files you write on this device and
          run straight away. Try the example, or start your own.
        </p>
        <div class="ac-button-row">
          ${example
            ? html`<${Button} variant="primary"
                     onClick=${() => runApp(example.name, example.name, false)}>
                <${Icon} name="fa-solid fa-play" /> Run the Example app
              <//>`
            : null}
          <${Button} variant=${example ? "outline-primary" : "primary"} onClick=${newApp}>
            Create your first app
          <//>
        </div>
      </div>`;
  }

  const count = (list) => (list ? String(list.length) : "–");

  return html`
    <${Screen} title=${html`
      <span class="ac-brand-inline">
        <span class="ac-brand-mark" aria-hidden="true"><${Icon} name="fa-solid fa-seedling" /></span>
        aCelery
      </span>`}>
      <${InlineError} error=${error} onClose=${() => setError(null)} />
      <div class="ac-home">
        <div>
          <div class="ac-hero">
            <h2>${greeting()}</h2>
            <p>Build and run your own JavaScript apps.</p>
          </div>
          <section class="ac-section" aria-label=${project || db ? "Continue" : "Get started"}>
            <h2 class="ac-section-title">${project || db ? "Continue" : "Get started"}</h2>
            ${continuing}
          </section>
        </div>
        <div>
          <section class="ac-section">
            <h2 class="ac-section-title">Create</h2>
            <div class="ac-quick">
              <button type="button" class="ac-quick-btn" onClick=${newApp}>
                <span class="ac-quick-icon"><${Icon} name="fa-solid fa-code" /></span>
                New app
              </button>
              <button type="button" class="ac-quick-btn" onClick=${newDb}>
                <span class="ac-quick-icon"><${Icon} name="fa-solid fa-database" /></span>
                New database
              </button>
            </div>
          </section>
          <section class="ac-section">
            <h2 class="ac-section-title">On this device</h2>
            <div class="ac-stats">
              <a class="ac-stat" href=${href(["apps"])} onClick=${link(["apps"])}>
                <span class="ac-stat-value">${count(data?.projects)}</span>
                <span class="ac-stat-label">${data?.projects.length === 1 ? "app" : "apps"}</span>
              </a>
              <a class="ac-stat" href=${href(["data"])} onClick=${link(["data"])}>
                <span class="ac-stat-value">${count(data?.databases)}</span>
                <span class="ac-stat-label">
                  ${data?.databases.length === 1 ? "database" : "databases"}
                </span>
              </a>
            </div>
          </section>
        </div>
      </div>
    <//>`;
}
