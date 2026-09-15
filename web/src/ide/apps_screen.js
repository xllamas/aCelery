/**
 * Apps: everything you can run, as cards (doc/shell-redesign.md §4.3).
 */

import { html, useState, useEffect, useCallback, Button } from "acelery/ui.js";
import { runApp, exportProject } from "acelery/export.js";

import { Screen } from "./frame.js";
import { useConfirm } from "./chrome.js";
import {
  EmptyState, Icon, InlineError, ProjectCard, Skeleton, useToast,
} from "./parts.js";
import { navigate, setIntent } from "./router.js";
import { deleteProject, listProjects } from "./store.js";

/** Shown once a list is long enough that scanning it is slower than typing. */
export const SEARCH_THRESHOLD = 6;

export function SearchField({ value, onChange, label }) {
  return html`
    <div class="ac-search" role="search">
      <${Icon} name="fa-solid fa-magnifying-glass" />
      <input type="search" class="form-control" aria-label=${label}
             placeholder=${label} value=${value}
             onInput=${(e) => onChange(e.currentTarget.value)} />
    </div>`;
}

export function matches(project, query) {
  const q = query.trim().toLowerCase();
  return !q
    || project.name.toLowerCase().includes(q)
    || project.description.toLowerCase().includes(q);
}

/** The confirm every project delete asks, from Apps and from Code. */
export async function confirmDeleteProject(confirm, name) {
  return confirm(
    `${name} and all of its files will be deleted. This cannot be undone.`,
    { title: `Delete ${name}?`, danger: true, confirmLabel: "Delete" },
  );
}

export function AppsScreen({ settings, updateSettings }) {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      setApps(await listProjects());
    } catch (e) {
      setError(e);
      setApps([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(app) {
    if (!(await confirmDeleteProject(confirm, app.name))) return;
    try {
      await deleteProject(app.name);
      if (settings["recent.project"] === app.name) {
        updateSettings({ "recent.project": "", "recent.file": "" });
      }
      toast(`Deleted ${app.name}`);
      await load();
    } catch (e) {
      setError(e);
    }
  }

  let body;
  if (apps === null) {
    body = html`<${Skeleton} rows=${4} grid />`;
  } else if (!apps.length) {
    body = html`
      <${EmptyState} icon="fa-solid fa-table-cells" title="No apps yet"
        action=${html`
          <${Button} variant="primary"
            onClick=${() => { setIntent("new-project"); navigate(["code"]); }}>
            Create an app
          <//>`}>
        An app is a folder of JavaScript you write in Code.
      <//>`;
  } else {
    const shown = apps.filter((a) => matches(a, query));
    body = html`
      ${apps.length > SEARCH_THRESHOLD
        ? html`<div class="ac-toolbar">
            <${SearchField} label="Search apps" value=${query} onChange=${setQuery} />
          </div>`
        : null}
      ${shown.length
        ? html`
            <div class="ac-grid">
              ${shown.map((app) => html`
                <${ProjectCard} key=${app.name} project=${app} verb="Run"
                  onOpen=${() => runApp(app.name, app.name, false)}
                  actions=${[
                    { label: "Edit in Code", icon: "fa-solid fa-pen-to-square",
                      onSelect: () => navigate(["code", app.name]) },
                    { label: "Export", icon: "fa-solid fa-file-export",
                      onSelect: () => exportProject(app.name) },
                    { label: "Delete", icon: "fa-solid fa-trash", danger: true,
                      onSelect: () => remove(app) },
                  ]} />`)}
            </div>`
        : html`<p class="text-body-secondary px-1">Nothing matches “${query}”.</p>`}`;
  }

  return html`
    <${Screen} title="Apps">
      <${InlineError} error=${error} onClose=${() => setError(null)} />
      ${body}
    <//>
    ${dialog}`;
}
