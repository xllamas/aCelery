/**
 * Code: the projects list, which is the IDE's home state
 * (doc/shell-redesign.md §4.4).
 *
 * The IDE used to open on nothing, with Project → Open behind a hamburger. It
 * now opens on the projects, and the one thing an empty list needs — New
 * project — is a button on the screen.
 */

import {
  html, useState, useEffect, useCallback, Button, Modal, Form, Input, notEmpty,
} from "acelery/ui.js";
import { runApp, exportProject, importProject } from "acelery/export.js";

import { Screen } from "./frame.js";
import { useConfirm } from "./chrome.js";
import {
  EmptyState, IconButton, InlineError, ProjectCard, Sheet, Skeleton, useToast,
} from "./parts.js";
import { navigate, takeIntent } from "./router.js";
import { loadScaffold } from "./scaffold.js";
import { createProject, deleteProject, hasHost, listProjects } from "./store.js";
import {
  SearchField, SEARCH_THRESHOLD, confirmDeleteProject, matches,
} from "./apps_screen.js";

/** The scaffold's rules, plus a check for a name in use. */
function NewProjectSheet({ show, scaffold, existing, onClose, onCreate }) {
  const taken = (v) => {
    const wanted = (v ?? "").trim().toLowerCase();
    return existing.some((p) => p.name.toLowerCase() === wanted)
      ? "A project with that name already exists"
      : true;
  };

  return html`
    <${Sheet} show=${show} onHide=${onClose} title="New project">
      <${Form} initial=${{ name: "", description: "" }} onSubmit=${onCreate}>
        <${Modal.Body}>
          <${Input} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            autocapitalize="off" autocomplete="off" spellcheck=${false}
            validate=${[
              notEmpty("A name is required"),
              (v) => scaffold.nameProblem(v) ?? true,
              taken,
            ]} />
          <${Input} label="Description" name="description" as="textarea"
            placeholder="What it does, in a sentence (optional)"
            validate=${[(v) => scaffold.descriptionProblem(v) ?? true]} />
        <//>
        <${Modal.Footer}>
          <${Button} variant="outline-secondary" type="button" onClick=${onClose}>
            Cancel
          <//>
          <${Button} variant="primary" type="submit">Create project<//>
        <//>
      <//>
    <//>`;
}

export function CodeScreen({ settings, updateSettings }) {
  const [projects, setProjects] = useState(null);
  const [scaffold, setScaffold] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(() => takeIntent("new-project"));
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(e);
      setProjects([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The New project sheet validates against the scaffold's rules, so it is
  // fetched up front rather than when the sheet opens.
  useEffect(() => {
    loadScaffold().then(setScaffold, setError);
  }, []);

  async function create(values) {
    setCreating(false);
    try {
      const name = await createProject(values);
      toast(`Created ${name}`);
      // Straight into the scaffolded entry module, which already runs.
      navigate(["code", name, scaffold.entry]);
    } catch (e) {
      setError(e);
    }
  }

  async function remove(project) {
    if (!(await confirmDeleteProject(confirm, project.name))) return;
    try {
      await deleteProject(project.name);
      if (settings["recent.project"] === project.name) {
        updateSettings({ "recent.project": "", "recent.file": "" });
      }
      toast(`Deleted ${project.name}`);
      await load();
    } catch (e) {
      setError(e);
    }
  }

  let body;
  if (projects === null) {
    body = html`<${Skeleton} rows=${4} grid />`;
  } else if (!projects.length) {
    body = html`
      <${EmptyState} icon="fa-solid fa-folder" title="No projects yet"
        action=${html`
          <${Button} variant="primary" onClick=${() => setCreating(true)}>
            New project
          <//>`}>
        A project is a folder holding an app's JavaScript, CSS and manifest.
      <//>`;
  } else {
    const shown = projects.filter((p) => matches(p, query));
    body = html`
      ${projects.length > SEARCH_THRESHOLD
        ? html`<div class="ac-toolbar">
            <${SearchField} label="Search projects" value=${query} onChange=${setQuery} />
          </div>`
        : null}
      ${shown.length
        ? html`
            <div class="ac-grid">
              ${shown.map((project) => html`
                <${ProjectCard} key=${project.name} project=${project} verb="Open"
                  onOpen=${() => navigate(["code", project.name])}
                  actions=${[
                    { label: "Run", icon: "fa-solid fa-play",
                      onSelect: () => runApp(project.name, project.name, true) },
                    { label: "Export", icon: "fa-solid fa-file-export",
                      onSelect: () => exportProject(project.name) },
                    { label: "Delete", icon: "fa-solid fa-trash", danger: true,
                      onSelect: () => remove(project) },
                  ]} />`)}
            </div>`
        : html`<p class="text-body-secondary px-1">Nothing matches “${query}”.</p>`}`;
  }

  return html`
    <${Screen} title="Code"
      actions=${hasHost()
        ? html`<${IconButton} icon="fa-solid fa-file-import" label="Import project"
                 onClick=${importProject} />`
        : null}
      fab=${{ icon: "fa-solid fa-plus", label: "New project", onClick: () => setCreating(true) }}>
      <${InlineError} error=${error} onClose=${() => setError(null)} />
      ${body}
    <//>
    ${scaffold
      ? html`<${NewProjectSheet} show=${creating} scaffold=${scaffold}
          existing=${projects ?? []}
          onClose=${() => setCreating(false)} onCreate=${create} />`
      : null}
    ${dialog}`;
}
