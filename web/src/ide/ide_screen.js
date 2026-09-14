/**
 * The IDE: projects, files, and the editor.
 *
 * The 2014 version kept `currentProject`, `currentFile`, `hasFileChanged` and
 * `editor` as globals, rebuilt the navbar per screen, and drove menu state
 * through 40 lines of positional `getNavItem(1).getElement(2)` indexing.
 * All of that is one component's state now.
 */

import {
  html, useState, useEffect, useRef, useCallback,
  Button, ButtonGroup, Form, Input, Select, Modal, Alert,
  notEmpty,
} from "acelery/ui.js";
import * as file from "acelery/file.js";
import { runApp, importProject as hostImport, exportProject as hostExport }
  from "acelery/export.js";

import { IdeNavbar, Picker, useConfirm, useNotice } from "./chrome.js";

const USER_ROOT = "/aCelery/www/user/";

/** Reads the manifests of every project folder. */
async function listProjects(base) {
  const entries = await file.listFiles("user", base.replace(/user\/$/, ""));
  const projects = [];
  for (const entry of entries) {
    if (!entry.directory) continue;
    let description = "";
    try {
      const handle = await file.open("acelery_app.json", base + entry.fname);
      const text = await handle.read();
      await handle.close();
      if (text) description = JSON.parse(text).description ?? "";
    } catch {
      // A project without a readable manifest is still a project.
    }
    projects.push({ name: entry.fname, description });
  }
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

/** The New Project dialog. Rules carried over from createProject(). */
function NewProjectDialog({ show, onClose, onCreate }) {
  return html`
    <${Modal} show=${show} onHide=${onClose} centered>
      <${Modal.Header} closeButton><${Modal.Title}>New Project<//><//>
      <${Form} initial=${{ name: "", description: "" }}
               onSubmit=${(v) => onCreate(v)}>
        <${Modal.Body}>
          <${Input} label="Name" name="name"
            placeholder="Letters and numbers, 16 max"
            validate=${[
              notEmpty("A name is required"),
              (v) => (/^\w{1,16}$/.test(v ?? "") ? true
                : "Letters, numbers and underscore only, 16 at most"),
            ]} />
          <${Input} label="Description" name="description" as="textarea"
            placeholder="Short description, 140 chars max"
            validate=${[
              (v) => ((v ?? "").length <= 140 ? true : "140 characters at most"),
            ]} />
        <//>
        <${Modal.Footer}>
          <${Button} variant="secondary" type="button" onClick=${onClose}>
            Close
          <//>
          <${Button} variant="primary" type="submit">Create App<//>
        <//>
      <//>
    <//>`;
}

/** The New File dialog. The IDE creates .js and .css, as it always has. */
function NewFileDialog({ show, project, onClose, onCreate }) {
  return html`
    <${Modal} show=${show} onHide=${onClose} centered>
      <${Modal.Header} closeButton>
        <${Modal.Title}>New File for ${project}<//>
      <//>
      <${Form} initial=${{ name: "", type: ".js" }} onSubmit=${onCreate}>
        <${Modal.Body}>
          <${Input} label="Name" name="name"
            placeholder="File name without extension"
            validate=${[
              notEmpty("A name is required"),
              (v) => (/^[\w.-]+$/.test(v ?? "") ? true
                : "Letters, numbers, dot, dash and underscore only"),
            ]} />
          <${Select} label="Type" name="type" options=${[
            { label: "JavaScript", value: ".js" },
            { label: "CSS", value: ".css" },
          ]} />
        <//>
        <${Modal.Footer}>
          <${Button} variant="secondary" type="button" onClick=${onClose}>
            Close
          <//>
          <${Button} variant="primary" type="submit">Create File<//>
        <//>
      <//>
    <//>`;
}

/** What the entry module of a brand-new project contains. */
const SCAFFOLD = (name) => `import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${name}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`;

export function IdeScreen({ onExit, editorTheme }) {
  const [base, setBase] = useState(null);
  const [project, setProject] = useState("");
  const [openFileName, setOpenFileName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState({ kind: "blank" });
  const [dialog, setDialog] = useState(null);

  const { confirm, dialog: confirmDialog } = useConfirm();
  const { banner, notify, fail } = useNotice();

  const host = useRef(null);
  const editor = useRef(null);
  /* The editor's text lives in CodeMirror, not in state: mirroring it would
     re-render the whole screen on every keystroke. */

  useEffect(() => {
    file.externalStoragePath().then(
      (p) => setBase(p + USER_ROOT),
      fail,
    );
  }, []);

  /* ----------------------------------------------------------------- files */

  const save = useCallback(async () => {
    if (!openFileName || !editor.current) return;
    try {
      const handle = await file.open(openFileName, base + project);
      await handle.write(editor.current.getValue());
      await handle.close();
      setDirty(false);
    } catch (e) {
      fail(e);
    }
  }, [base, project, openFileName]);

  /**
   * Flushes an unsaved buffer on the way out.
   *
   * The Flutter shell calls `forceSaveFile()` when the app is paused or backed
   * out of, exactly as ACeleryActivity.onPause did, so this has to stay a
   * global however the IDE is built (see lib/src/shell/host_bridge.dart).
   */
  useEffect(() => {
    globalThis.forceSaveFile = () => {
      if (openFileName && dirty) save();
    };
    return () => { delete globalThis.forceSaveFile; };
  }, [openFileName, dirty, save]);

  /** Asks about unsaved work before leaving a file. */
  const leaveFile = useCallback(async () => {
    if (openFileName && dirty) {
      if (await confirm(`Save changes to ${openFileName}?`)) await save();
    }
    editor.current?.destroy();
    editor.current = null;
    setOpenFileName("");
    setDirty(false);
    return true;
  }, [openFileName, dirty, save, confirm]);

  const openFile = useCallback(
    async (name) => {
      await leaveFile();
      try {
        const handle = await file.open(name, base + project);
        const text = await handle.read();
        await handle.close();
        setOpenFileName(name);
        setView({ kind: "editor", name, text });
      } catch (e) {
        fail(e);
      }
    },
    [base, project, leaveFile],
  );

  /* The editor is created against a DOM node the component owns, and torn down
     with it — CodeMirror is not a Preact component and should not pretend to
     be one. */
  useEffect(() => {
    if (view.kind !== "editor" || !host.current) return;
    editor.current?.destroy();
    editor.current = globalThis.aceleryEditor.createEditor(host.current, {
      value: view.text,
      filename: view.name,
      theme: editorTheme,
      onChange: () => setDirty(true),
    });
    return () => {
      editor.current?.destroy();
      editor.current = null;
    };
  }, [view.kind, view.name]);

  useEffect(() => {
    editor.current?.setTheme(editorTheme);
  }, [editorTheme]);

  /* --------------------------------------------------------------- actions */

  async function createProject({ name, description }) {
    const pName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
    setDialog(null);
    try {
      await file.mkdir(pName, base);
      const manifest = await file.open("acelery_app.json", base + pName);
      await manifest.write(
        JSON.stringify({ name: pName, description, entry: "main.js" }),
      );
      await manifest.close();

      /* Scaffold the entry module too. An empty project used to launch to a
         blank page with nothing in the console; now it runs. */
      const entry = await file.open("main.js", base + pName);
      await entry.write(SCAFFOLD(pName));
      await entry.close();

      setProject(pName);
      setView({ kind: "blank" });
    } catch (e) {
      fail(e);
    }
  }

  async function createFile({ name, type }) {
    setDialog(null);
    const fileName = name.trim() + type;
    try {
      const handle = await file.open(fileName, base + project);
      await handle.write("");
      await handle.close();
      await openFile(fileName);
    } catch (e) {
      fail(e);
    }
  }

  async function pick(mode) {
    try {
      const entries =
        mode.startsWith("project")
          ? await listProjects(base)
          : (await file.listFiles(project, base))
              .filter((e) => !e.directory)
              .map((e) => ({ name: e.fname }));
      setView({ kind: "pick", mode, entries });
    } catch (e) {
      fail(e);
    }
  }

  async function onPick(mode, name) {
    if (mode === "project-open") {
      await leaveFile();
      setProject(name);
      setView({ kind: "blank" });
    } else if (mode === "project-delete") {
      if (!(await confirm(`Delete project ${name} and all its files?`,
                          { danger: true }))) return;
      const handle = await file.open(name, base);
      await handle.delete();
      if (name === project) setProject("");
      await pick("project-delete");
      notify(`Deleted ${name}.`);
    } else if (mode === "project-export") {
      hostExport(name);
    } else if (mode === "file-open") {
      await openFile(name);
    } else if (mode === "file-delete") {
      if (!(await confirm(`Delete file ${name}?`, { danger: true }))) return;
      const handle = await file.open(name, base + project);
      await handle.delete();
      if (name === openFileName) await leaveFile();
      await pick("file-delete");
      notify(`Deleted ${name}.`);
    }
  }

  async function closeProject() {
    await leaveFile();
    setProject("");
    setView({ kind: "blank" });
  }

  async function exit() {
    await leaveFile();
    onExit();
  }

  /* ------------------------------------------------------------------ menu */

  const hasProject = project !== "";
  const hasFile = openFileName !== "";

  const menu = [
    {
      label: "Project",
      items: [
        { label: "New", disabled: hasProject,
          onSelect: () => setDialog("project") },
        { label: "Open", disabled: hasProject,
          onSelect: () => pick("project-open") },
        { label: "Close", disabled: !hasProject, onSelect: closeProject },
        { label: "Delete", disabled: hasProject,
          onSelect: () => pick("project-delete") },
        { divider: true, key: "d1" },
        { label: "Import", onSelect: hostImport },
        { label: "Export", onSelect: () => pick("project-export") },
      ],
    },
    {
      label: "File",
      disabled: !hasProject,
      items: [
        { label: "New", disabled: hasFile, onSelect: () => setDialog("file") },
        { label: "Open", disabled: hasFile, onSelect: () => pick("file-open") },
        { label: "Save", disabled: !dirty, onSelect: save },
        { label: "Close", disabled: !hasFile,
          onSelect: async () => { await leaveFile(); setView({ kind: "blank" }); } },
        { label: "Delete", disabled: hasFile,
          onSelect: () => pick("file-delete") },
      ],
    },
    { label: "Run", disabled: !hasProject,
      onSelect: () => runApp(project, project, true) },
    { label: "Main Menu", onSelect: exit },
  ];

  const title = hasProject ? `aCelery Project: ${project}` : "aCelery IDE";

  /* ------------------------------------------------------------------ view */

  let body = null;
  if (!base) {
    body = html`<p class="text-body-secondary">Starting…</p>`;
  } else if (view.kind === "pick") {
    const verb = view.mode.split("-")[1];
    const what = view.mode.startsWith("project") ? "project" : "file";
    body = html`
      <${Picker} prompt=${`Select ${what} to ${verb}`} entries=${view.entries}
        icon=${what === "project" ? "fa-solid fa-folder" : "fa-solid fa-file"}
        empty=${`No ${what}s yet.`}
        onPick=${(name) => onPick(view.mode, name)} />`;
  } else if (view.kind === "editor") {
    body = html`
      <div class="acelery-editor border rounded" ref=${host}></div>
      ${dirty
        ? html`<div class="mt-2">
            <${ButtonGroup} size="sm">
              <${Button} variant="primary" onClick=${save}>Save<//>
            <//>
          </div>`
        : null}`;
  }

  return html`
    <${IdeNavbar} title=${title} items=${menu} />
    <div class="container-fluid">
      ${banner}
      ${body}
    </div>
    <${NewProjectDialog} show=${dialog === "project"}
      onClose=${() => setDialog(null)} onCreate=${createProject} />
    <${NewFileDialog} show=${dialog === "file"} project=${project}
      onClose=${() => setDialog(null)} onCreate=${createFile} />
    ${confirmDialog}`;
}
