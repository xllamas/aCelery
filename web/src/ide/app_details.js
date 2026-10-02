/**
 * App details: the name, the description and the icon of a project, in one
 * sheet. The name is the project's folder, so changing it renames the folder;
 * the description and the icon live in the manifest (acelery_app.json).
 *
 * The icon is cropped square in a dialog of its own. While that is open this
 * sheet is hidden but stays mounted, so what was typed is still there after.
 */

import {
  html, useState, useEffect, Button, Modal, Input, ImageCropper, FileButton,
} from "acelery/ui.js";

import { ProjectTile, Sheet } from "./parts.js";
import { loadScaffold } from "./scaffold.js";
import {
  listProjects, renameProject, updateManifest, writeProjectBytes,
} from "./store.js";

/** The picture a project keeps its icon in. */
export const ICON_FILE = "icon.png";

const ICON_SIZE = 512;

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * @param {object} props
 * @param {string} props.project the folder name
 * @param {{description: string, icon: string|null}} props.manifest as read
 * @param {(saved: {name: string, renamed: boolean}) => void} props.onSaved
 * @param {(error: Error) => void} props.onError
 */
export function AppDetailsSheet({ show, project, manifest, onClose, onSaved, onError }) {
  const [scaffold, setScaffold] = useState(null);
  const [taken, setTaken] = useState([]);
  const [name, setName] = useState(project);
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(null);        // a cropped Blob not yet saved
  const [iconUrl, setIconUrl] = useState(null);  // its preview
  const [removeIcon, setRemoveIcon] = useState(false);
  const [picked, setPicked] = useState(null);    // the file being cropped
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadScaffold().then(setScaffold, onError);
  }, []);

  /* Every time the sheet opens it starts from what is on disk now. */
  useEffect(() => {
    if (!show) return;
    setName(project);
    setDescription(manifest?.description ?? "");
    setIcon(null);
    setRemoveIcon(false);
    setPicked(null);
    setTouched(false);
    listProjects().then(
      (list) => setTaken(list.map((p) => p.name).filter((n) => n !== project)),
      onError,
    );
  }, [show]);

  useEffect(() => {
    if (!icon) {
      setIconUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(icon);
    setIconUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [icon]);

  const nameProblem = scaffold
    ? scaffold.nameProblem(name)
      ?? (taken.some((n) => sameName(n, name)) ? "A project with that name already exists" : null)
    : null;
  const descriptionProblem = scaffold ? scaffold.descriptionProblem(description) : null;

  async function save() {
    setTouched(true);
    if (!scaffold || nameProblem || descriptionProblem || saving) return;
    setSaving(true);
    try {
      const wanted = scaffold.projectName(name);
      const patch = { description: description.trim() };
      if (icon) {
        await writeProjectBytes(project, ICON_FILE, icon);
        patch.icon = ICON_FILE;
      } else if (removeIcon) {
        patch.icon = null;
      }
      await updateManifest(project, patch);

      // Last, so a refused rename leaves the other edits saved under the old
      // name rather than half-applied under a new one.
      const renamed = wanted !== project;
      if (renamed) {
        await renameProject(project, wanted);
        await updateManifest(wanted, { name: wanted });
      }
      onSaved({ name: wanted, renamed });
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  const shownIcon = removeIcon ? null : (iconUrl ?? manifest?.icon ?? null);
  const hasIcon = !!shownIcon;

  return html`
    <${Sheet} show=${show && !picked} onHide=${() => !saving && onClose()}
      title="App details">
      <${Modal.Body}>
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="ac-icon-preview">
            <${ProjectTile} key=${shownIcon ?? "none"} name=${name.trim() || project}
              icon=${shownIcon} />
          </div>
          <div class="d-flex flex-wrap gap-2">
            <${FileButton} variant="outline-primary" size="sm" accept="image/*"
              onFiles=${([file]) => setPicked(file)}>
              ${hasIcon ? "Change icon" : "Choose icon"}
            <//>
            ${hasIcon
              ? html`<${Button} variant="outline-secondary" size="sm" type="button"
                  onClick=${() => { setIcon(null); setRemoveIcon(true); }}>
                  Remove icon
                <//>`
              : null}
          </div>
        </div>
        <${Input} label="Name" value=${name}
          onChange=${(v) => { setName(v); setTouched(true); }}
          autocapitalize="off" autocomplete="off" spellcheck=${false}
          isInvalid=${touched && !!nameProblem}
          help=${touched && nameProblem
            ? html`<span class="text-danger">${nameProblem}</span>`
            : "Renaming the app also renames its folder. A home screen shortcut to it stops working."} />
        <${Input} label="Description" as="textarea" rows=${3} value=${description}
          onChange=${(v) => { setDescription(v); setTouched(true); }}
          placeholder="What it does, in a sentence (optional)"
          isInvalid=${touched && !!descriptionProblem}
          help=${touched && descriptionProblem
            ? html`<span class="text-danger">${descriptionProblem}</span>`
            : null} />
      <//>
      <${Modal.Footer}>
        <${Button} variant="outline-secondary" type="button" disabled=${saving}
          onClick=${onClose}>
          Cancel
        <//>
        <${Button} variant="primary" type="button" disabled=${saving || !scaffold}
          onClick=${save}>
          ${saving ? "Saving…" : "Save"}
        <//>
      <//>
    <//>
    <${ImageCropper} image=${picked} title="Crop the icon" confirmLabel="Use as icon"
      maxSide=${ICON_SIZE} type="image/png"
      onDone=${(blob) => { setIcon(blob); setRemoveIcon(false); setPicked(null); }}
      onCancel=${() => setPicked(null)} />`;
}
