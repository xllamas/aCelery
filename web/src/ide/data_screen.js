/**
 * Data: the databases list, which is the DB Manager's home state
 * (doc/shell-redesign.md §4.5). Like Code, it used to open on nothing.
 */

import {
  html, useState, useEffect, useCallback, Button, Modal, Form, Input, notEmpty,
} from "acelery/ui.js";
import { openDB, deleteDB } from "acelery/sql.js";

import { Screen } from "./frame.js";
import { useConfirm } from "./chrome.js";
import {
  EmptyState, InlineError, ListRow, Sheet, Skeleton, useToast,
} from "./parts.js";
import { navigate, takeIntent } from "./router.js";
import { formatDate, formatSize, listDatabases } from "./store.js";

function NewDatabaseSheet({ show, existing, onClose, onCreate }) {
  return html`
    <${Sheet} show=${show} onHide=${onClose} title="New database">
      <${Form} initial=${{ name: "" }} onSubmit=${onCreate}>
        <${Modal.Body}>
          <${Input} label="Name" name="name" placeholder="Database name without extension"
            autocapitalize="off" autocomplete="off" spellcheck=${false}
            help="Saved as a SQLite file ending in .db."
            validate=${[
              notEmpty("A name is required"),
              (v) => (/^[\w-]+$/.test((v ?? "").trim()) ? true
                : "Letters, numbers, dash and underscore only"),
              (v) => (existing.some((d) => d.name === `${(v ?? "").trim()}.db`)
                ? "A database with that name already exists" : true),
            ]} />
        <//>
        <${Modal.Footer}>
          <${Button} variant="outline-secondary" type="button" onClick=${onClose}>
            Cancel
          <//>
          <${Button} variant="primary" type="submit">Create database<//>
        <//>
      <//>
    <//>`;
}

export function DataScreen({ settings, updateSettings }) {
  const [databases, setDatabases] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(() => takeIntent("new-db"));
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      setDatabases(await listDatabases());
    } catch (e) {
      setError(e);
      setDatabases([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create({ name }) {
    setCreating(false);
    const fname = `${name.trim()}.db`;
    try {
      // Opening creates the file; the workspace opens its own handle.
      const db = await openDB(fname);
      await db.close();
      toast(`Created ${fname}`);
      navigate(["data", fname]);
    } catch (e) {
      setError(e);
    }
  }

  async function remove(name) {
    const yes = await confirm(
      `${name} and every table in it will be deleted. This cannot be undone.`,
      { title: `Delete ${name}?`, danger: true, confirmLabel: "Delete" },
    );
    if (!yes) return;
    try {
      await deleteDB(name);
      if (settings["recent.db"] === name) updateSettings({ "recent.db": "" });
      toast(`Deleted ${name}`);
      await load();
    } catch (e) {
      setError(e);
    }
  }

  let body;
  if (databases === null) {
    body = html`<${Skeleton} rows=${3} />`;
  } else if (!databases.length) {
    body = html`
      <${EmptyState} icon="fa-solid fa-database" title="No databases yet"
        action=${html`
          <${Button} variant="primary" onClick=${() => setCreating(true)}>
            New database
          <//>`}>
        A database is a SQLite file your apps read and write.
      <//>`;
  } else {
    body = html`
      <div class="ac-list">
        ${databases.map((d) => html`
          <${ListRow} key=${d.name} icon="fa-solid fa-database" title=${d.name}
            meta=${[formatSize(d.length), formatDate(d.modified)].filter(Boolean).join(" · ")}
            badge=${d.name === "acelery.db" ? "settings" : null}
            onOpen=${() => navigate(["data", d.name])}
            actions=${[{
              label: "Delete", icon: "fa-solid fa-trash", danger: true,
              onSelect: () => remove(d.name),
            }]} />`)}
      </div>`;
  }

  return html`
    <${Screen} title="Data"
      fab=${{ icon: "fa-solid fa-plus", label: "New database", onClick: () => setCreating(true) }}>
      <${InlineError} error=${error} onClose=${() => setError(null)} />
      ${body}
    <//>
    <${NewDatabaseSheet} show=${creating} existing=${databases ?? []}
      onClose=${() => setCreating(false)} onCreate=${create} />
    ${dialog}`;
}
