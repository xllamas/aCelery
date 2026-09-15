/**
 * A project: its files and the editor (doc/shell-redesign.md §4.4).
 *
 *   #/code/:project          the file list (phone), or the split view (≥ 992 px)
 *   #/code/:project/:file    the editor
 *
 * The 2014 IDE kept `currentProject`, `currentFile`, `hasFileChanged` and
 * `editor` as globals, and the Phase 4 rewrite kept them as state. They are the
 * route now, so Back steps out of the editor, and the reload the host does
 * after Run lands back in the file you were editing.
 */

import {
  html, useState, useEffect, useRef, useCallback,
  Button, Modal, Form, Input, Select, notEmpty,
} from "acelery/ui.js";
import { runApp, exportProject } from "acelery/export.js";

import { Screen } from "./frame.js";
import { useConfirm } from "./chrome.js";
import {
  ActionMenu, EmptyState, IconButton, InlineError, ListRow, NotFound, Sheet,
  Skeleton, SPLIT, useMedia, useToast,
} from "./parts.js";
import { navigate, setGuard } from "./router.js";
import {
  deleteProject, deleteProjectFile, formatSize, listProjectFiles, projectExists,
  readManifest, readProjectFile, writeProjectFile,
} from "./store.js";
import { confirmDeleteProject } from "./apps_screen.js";

const extension = (name) =>
  name.includes(".") ? name.split(".").pop().toLowerCase() : "";

const LANGUAGE = {
  js: "JavaScript", mjs: "JavaScript", json: "JSON", css: "CSS", html: "HTML",
  htm: "HTML", xml: "XML", svg: "SVG", md: "Markdown", txt: "Text",
};

/* An image previews; anything else known to be binary says so. Reading either
   as text into the editor would show garbage, and saving it would destroy it. */
const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico"]);
const BINARY = new Set(["zip", "woff", "woff2", "ttf", "otf", "mp3", "mp4", "pdf", "db"]);

function fileIcon(name) {
  const ext = extension(name);
  if (IMAGE.has(ext)) return "fa-solid fa-file-image";
  if (["md", "txt"].includes(ext)) return "fa-solid fa-file-lines";
  if (LANGUAGE[ext]) return "fa-solid fa-file-code";
  return "fa-solid fa-file";
}

function kindOf(name) {
  const ext = extension(name);
  if (IMAGE.has(ext)) return "image";
  if (BINARY.has(ext)) return "binary";
  return "text";
}

/** The New File dialog. The IDE creates .js and .css, as it always has. */
function NewFileSheet({ show, project, existing, onClose, onCreate }) {
  return html`
    <${Sheet} show=${show} onHide=${onClose} title=${`New file in ${project}`}>
      <${Form} initial=${{ name: "", type: ".js" }} onSubmit=${onCreate}>
        <${Modal.Body}>
          <${Input} label="Name" name="name" placeholder="File name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${false}
            validate=${[
              notEmpty("A name is required"),
              (v) => (/^[\w.-]+$/.test((v ?? "").trim()) ? true
                : "Letters, numbers, dot, dash and underscore only"),
            ]} />
          <${Select} label="Type" name="type" options=${[
            { label: "JavaScript", value: ".js" },
            { label: "CSS", value: ".css" },
          ]} />
        <//>
        <${Modal.Footer}>
          <${Button} variant="outline-secondary" type="button" onClick=${onClose}>
            Cancel
          <//>
          <${Button} variant="primary" type="submit"
            onClick=${(e) => {
              // Checked here rather than as a field validator, because it
              // depends on two fields at once.
              const form = e.currentTarget.form;
              const name = `${form.elements.name.value.trim()}${form.elements.type.value}`;
              if (existing.some((f) => f.name === name)) {
                e.preventDefault();
                onCreate({ duplicate: name });
              }
            }}>
            Create file
          <//>
        <//>
      <//>
    <//>`;
}

export function CodeWorkspace({ project, fileName, editorTheme, settings, updateSettings }) {
  const split = useMedia(SPLIT);
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [status, setStatus] = useState("loading"); // loading | missing | ready
  const [files, setFiles] = useState([]);
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  /* The open document: {name, kind, text}, or kind "missing". */
  const [doc, setDoc] = useState(null);
  const [dirty, setDirtyState] = useState(false);
  const [saving, setSaving] = useState(false);

  const host = useRef(null);
  const editor = useRef(null);
  /* Refs mirror what the guard, forceSaveFile and effect cleanups read, since
     those run outside a render and would otherwise see a stale closure. The
     buffer itself lives in CodeMirror, not in state: mirroring it would
     re-render the whole screen on every keystroke. */
  const dirtyRef = useRef(false);
  const docRef = useRef(null);
  docRef.current = doc;
  const themeRef = useRef(editorTheme);
  themeRef.current = editorTheme;

  const setDirty = (value) => {
    dirtyRef.current = value;
    setDirtyState(value);
  };

  /* ---------------------------------------------------------------- project */

  const reloadFiles = useCallback(async () => {
    setFiles(await listProjectFiles(project));
  }, [project]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!(await projectExists(project))) {
          if (live) setStatus("missing");
          return;
        }
        const [list, m] = await Promise.all([listProjectFiles(project), readManifest(project)]);
        if (!live) return;
        setFiles(list);
        setManifest(m);
        setStatus("ready");
      } catch (e) {
        if (!live) return;
        setError(e);
        setStatus("ready");
      }
    })();
    return () => { live = false; };
  }, [project]);

  useEffect(() => {
    if (status === "ready" && !fileName && settings["recent.project"] !== project) {
      updateSettings({ "recent.project": project, "recent.file": "" });
    }
  }, [status, project, fileName]);

  /* ------------------------------------------------------------------- file */

  /* Load whatever the route names. Clearing `doc` first tears the previous
     editor down — saving it on the way if it is still dirty — before the next
     file arrives. */
  useEffect(() => {
    setDoc(null);
    if (status !== "ready" || !fileName) return;
    let live = true;
    (async () => {
      try {
        const list = await listProjectFiles(project);
        if (!live) return;
        if (!list.some((f) => f.name === fileName)) {
          setDoc({ name: fileName, kind: "missing" });
          return;
        }
        const kind = kindOf(fileName);
        const text = kind === "text" ? await readProjectFile(project, fileName) : null;
        if (!live) return;
        setDoc({ name: fileName, kind, text });
        updateSettings({ "recent.project": project, "recent.file": fileName });
      } catch (e) {
        if (live) setError(e);
      }
    })();
    return () => { live = false; };
  }, [project, fileName, status]);

  const save = useCallback(async () => {
    const instance = editor.current;
    const current = docRef.current;
    if (!instance || current?.kind !== "text") return true;
    const text = instance.getValue();
    setSaving(true);
    try {
      await writeProjectFile(project, current.name, text);
      // Typing while the write was in flight is still unsaved.
      if (editor.current === instance && instance.getValue() === text) setDirty(false);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setSaving(false);
    }
  }, [project]);

  const saveRef = useRef(save);
  saveRef.current = save;

  /* CodeMirror is not a component: it is created against a node this screen
     owns, and destroyed with it. */
  useEffect(() => {
    if (doc?.kind !== "text" || !host.current) return;
    const name = doc.name;
    const instance = globalThis.aceleryEditor.createEditor(host.current, {
      value: doc.text,
      filename: name,
      theme: themeRef.current,
      onChange: () => {
        if (!dirtyRef.current) setDirty(true);
      },
      onSave: () => saveRef.current(),
    });
    editor.current = instance;
    setDirty(false);

    return () => {
      /* Host Back and browser Back arrive as popstate, after the route has
         already changed, so there was no chance to ask. Save rather than lose
         the buffer — the same call forceSaveFile() makes. */
      if (dirtyRef.current) {
        writeProjectFile(project, name, instance.getValue()).catch((e) =>
          console.error(`aCelery: could not save ${name}`, e));
        dirtyRef.current = false;
      }
      instance.destroy();
      if (editor.current === instance) editor.current = null;
    };
  }, [doc]);

  useEffect(() => {
    editor.current?.setTheme(editorTheme);
  }, [editorTheme]);

  /**
   * Flushes an unsaved buffer on the way out.
   *
   * The Flutter shell calls `forceSaveFile()` when the app is paused or backed
   * out of, exactly as ACeleryActivity.onPause did, so this has to stay a
   * global however the IDE is built (see lib/src/shell/host_bridge.dart).
   */
  useEffect(() => {
    globalThis.forceSaveFile = () => {
      if (dirtyRef.current) saveRef.current();
    };
    return () => { delete globalThis.forceSaveFile; };
  }, []);

  /* In-page navigation away from unsaved work asks first. Dismissing the
     question stays put; only an explicit Discard throws the edits away. */
  useEffect(() => setGuard(async () => {
    if (!dirtyRef.current) return true;
    const answer = await confirm(
      `Save your changes to ${docRef.current?.name ?? "this file"} before leaving?`,
      {
        title: "Unsaved changes",
        confirmLabel: "Save",
        cancelLabel: "Discard",
        dismissValue: null,
      },
    );
    if (answer === null) return false;
    if (answer) return saveRef.current();
    setDirty(false);
    return true;
  }), [confirm]);

  /* ---------------------------------------------------------------- actions */

  async function run() {
    if (dirtyRef.current && !(await save())) return;
    runApp(project, project, true);
  }

  async function exportIt() {
    if (dirtyRef.current && !(await save())) return;
    exportProject(project);
  }

  async function createFile(values) {
    if (values.duplicate) {
      setError(new Error(`${values.duplicate} already exists in ${project}`));
      setCreating(false);
      return;
    }
    setCreating(false);
    const name = values.name.trim() + values.type;
    try {
      await writeProjectFile(project, name, "");
      await reloadFiles();
      navigate(["code", project, name], { replace: split && !!fileName });
    } catch (e) {
      setError(e);
    }
  }

  async function removeFile(name) {
    const yes = await confirm(
      `${name} will be deleted from ${project}. This cannot be undone.`,
      { title: `Delete ${name}?`, danger: true, confirmLabel: "Delete" },
    );
    if (!yes) return;
    try {
      if (name === fileName) setDirty(false);
      await deleteProjectFile(project, name);
      await reloadFiles();
      toast(`Deleted ${name}`);
      if (name === fileName) navigate(["code", project], { replace: true });
    } catch (e) {
      setError(e);
    }
  }

  async function removeProject() {
    if (!(await confirmDeleteProject(confirm, project))) return;
    try {
      setDirty(false);
      await deleteProject(project);
      if (settings["recent.project"] === project) {
        updateSettings({ "recent.project": "", "recent.file": "" });
      }
      toast(`Deleted ${project}`);
      navigate(["code"], { replace: true });
    } catch (e) {
      setError(e);
    }
  }

  /** Down from the list pushes; sideways between files in the split replaces. */
  const openFile = (name) =>
    navigate(["code", project, name], { replace: split && !!fileName });

  /* ------------------------------------------------------------------- view */

  if (status === "missing") {
    return html`
      <${Screen} title=${project} back=${["code"]}>
        <${NotFound} what="Project" action=${html`
          <${Button} variant="primary" onClick=${() => navigate(["code"], { replace: true })}>
            All projects
          <//>`} />
      <//>`;
  }

  if (status === "loading") {
    return html`
      <${Screen} title=${project} back=${["code"]}>
        <${Skeleton} rows=${4} />
      <//>`;
  }

  const fileOpen = !!fileName;
  const errorBanner = html`<${InlineError} error=${error} onClose=${() => setError(null)} />`;

  const fileList = files.length
    ? html`
        <div class="ac-list">
          ${files.map((f) => html`
            <${ListRow} key=${f.name} icon=${fileIcon(f.name)} title=${f.name}
              meta=${`${LANGUAGE[extension(f.name)] ?? "File"} · ${formatSize(f.length)}`}
              badge=${f.name === manifest?.entry ? "entry" : null}
              selected=${f.name === fileName}
              onOpen=${() => openFile(f.name)}
              actions=${[{
                label: "Delete", icon: "fa-solid fa-trash", danger: true,
                onSelect: () => removeFile(f.name),
              }]} />`)}
        </div>`
    : html`
        <${EmptyState} icon="fa-solid fa-file-code" title="No files yet"
          action=${html`<${Button} variant="primary" onClick=${() => setCreating(true)}>
            New file
          <//>`}>
          Add a JavaScript file for the app to run.
        <//>`;

  let pane;
  if (!fileOpen) {
    const entry = files.find((f) => f.name === manifest?.entry);
    pane = html`
      <${EmptyState} icon="fa-solid fa-file-code" title="Pick a file"
        action=${entry
          ? html`<${Button} variant="outline-primary" onClick=${() => openFile(entry.name)}>
              Open ${entry.name}
            <//>`
          : null}>
        Choose a file from the list to edit it.
      <//>`;
  } else if (!doc) {
    pane = html`<div class="ac-empty" aria-busy="true"><p>Opening ${fileName}…</p></div>`;
  } else if (doc.kind === "missing") {
    pane = html`
      <${NotFound} what="File" action=${html`
        <${Button} variant="primary"
          onClick=${() => navigate(["code", project], { replace: true })}>
          Back to ${project}
        <//>`} />`;
  } else if (doc.kind === "image") {
    pane = html`
      <div class="ac-preview">
        <img alt=${doc.name}
          src=${`/user/${encodeURIComponent(project)}/${encodeURIComponent(doc.name)}`} />
      </div>`;
  } else if (doc.kind === "binary") {
    pane = html`
      <${EmptyState} icon="fa-solid fa-file" title="Not a text file">
        ${doc.name} can't be edited here.
      <//>`;
  } else {
    pane = html`
      <div class="ac-editor-host"><div class="ac-editor-mount" ref=${host}></div></div>
      <div class="ac-status">
        <span>${LANGUAGE[extension(doc.name)] ?? "Text"}</span>
        <span role="status">${saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
      </div>`;
  }

  const title = fileOpen
    ? html`${fileName}${dirty
        ? html`<span class="ac-dirty" role="img" aria-label="unsaved changes"></span>`
        : null}`
    : project;

  const actions = html`
    ${doc?.kind === "text"
      ? html`<${IconButton} icon="fa-solid fa-floppy-disk" label="Save"
               disabled=${!dirty || saving} onClick=${save} />`
      : null}
    <${IconButton} icon="fa-solid fa-play" label=${`Run ${project}`} primary onClick=${run} />
    <${ActionMenu} title=${fileOpen ? fileName : project} actions=${[
      { label: "New file", icon: "fa-solid fa-plus", onSelect: () => setCreating(true) },
      { label: "Export project", icon: "fa-solid fa-file-export", onSelect: exportIt },
      fileOpen && { label: `Delete ${fileName}`, icon: "fa-solid fa-trash", danger: true,
                    onSelect: () => removeFile(fileName) },
      { label: "Delete project", icon: "fa-solid fa-trash", danger: true,
        onSelect: removeProject },
    ]} />`;

  const sheets = html`
    <${NewFileSheet} show=${creating} project=${project} existing=${files}
      onClose=${() => setCreating(false)} onCreate=${createFile} />
    ${confirmDialog}`;

  /* The phone file list scrolls with a FAB. Everything else — the editor on a
     phone, and the split view — fills the row, and keeps the pane at the same
     position in the tree either way, so resizing across the breakpoint does not
     tear the editor out of its node. */
  if (!split && !fileOpen) {
    return html`
      <${Screen} title=${title} subtitle=${manifest?.description || null} back=${["code"]}
        actions=${actions}
        fab=${{ icon: "fa-solid fa-plus", label: "New file", onClick: () => setCreating(true) }}>
        ${errorBanner}
        <h2 class="ac-section-title">Files</h2>
        ${fileList}
      <//>
      ${sheets}`;
  }

  return html`
    <${Screen} title=${title} subtitle=${fileOpen ? project : manifest?.description || null}
      back=${fileOpen ? ["code", project] : ["code"]} actions=${actions} fill>
      <div class="ac-split">
        ${split
          ? html`
              <aside class="ac-sidebar" aria-label="Files">
                <div class="ac-sidebar-head">
                  <h2 class="ac-section-title">Files</h2>
                  <${IconButton} icon="fa-solid fa-plus" label="New file"
                    onClick=${() => setCreating(true)} />
                </div>
                ${fileList}
              </aside>`
          : null}
        <div class="ac-pane">
          ${errorBanner}
          ${pane}
        </div>
      </div>
    <//>
    ${sheets}`;
}
