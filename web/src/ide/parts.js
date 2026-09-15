/**
 * The pieces every shell screen is built from (doc/shell-redesign.md §5.4).
 *
 * All of it is react-bootstrap or plain markup under the shell's own classes in
 * system/style/acelery.css. None of it is exported to user apps.
 */

import {
  html, useState, useEffect, useCallback, useContext, useRef, createContext,
  Modal, Dropdown, Placeholder, Alert, Toast, Button,
} from "acelery/ui.js";

/** An icon. Pass the whole class, `fa-solid fa-plus`, so tool/build_icons.mjs
    can find the name in the source. */
export const Icon = ({ name }) => html`<i class=${name} aria-hidden="true"></i>`;

/* ------------------------------------------------------------------ media */

export const WIDE = "(min-width: 768px)";
export const SPLIT = "(min-width: 992px)";

/** Whether a media query matches, kept current. False where there is no
    matchMedia at all, which is the phone layout. */
export function useMedia(query) {
  const read = () => !!globalThis.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    const list = globalThis.matchMedia?.(query);
    if (!list?.addEventListener) return;
    const on = () => setMatches(list.matches);
    on();
    list.addEventListener("change", on);
    return () => list.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/* ---------------------------------------------------------------- buttons */

export function IconButton({ icon, label, onClick, disabled, primary, className }) {
  return html`
    <button type="button" aria-label=${label} title=${label}
      class=${`ac-iconbtn${primary ? " is-primary" : ""} ${className ?? ""}`}
      disabled=${!!disabled} onClick=${onClick}>
      <${Icon} name=${icon} />
    </button>`;
}

/* ------------------------------------------------------- empty and loading */

export function EmptyState({ icon, title, children, action }) {
  return html`
    <div class="ac-empty">
      <div class="ac-empty-icon"><${Icon} name=${icon} /></div>
      <h2>${title}</h2>
      ${children ? html`<p>${children}</p>` : null}
      ${action ?? null}
    </div>`;
}

/** Loading rows or cards at their final size, so nothing jumps on arrival. */
export function Skeleton({ rows = 3, grid = false }) {
  const line = (xs, size) => html`
    <${Placeholder} as="div" animation="glow">
      <${Placeholder} xs=${xs} size=${size} />
    <//>`;
  const items = Array.from({ length: rows }, (_, i) => i);
  if (grid) {
    return html`
      <div class="ac-grid ac-skeleton" aria-busy="true" aria-label="Loading">
        ${items.map((i) => html`
          <div class="ac-card" key=${i}>
            <div class="ac-tile" style=${{ background: "var(--ac-surface-2)" }}></div>
            ${line(8)}${line(10, "sm")}
          </div>`)}
      </div>`;
  }
  return html`
    <div class="ac-list ac-skeleton" aria-busy="true" aria-label="Loading">
      ${items.map((i) => html`
        <div class="ac-row" key=${i}>
          <div class="ac-row-icon"></div>
          <div class="ac-row-body">${line(6)}${line(4, "sm")}</div>
        </div>`)}
    </div>`;
}

/**
 * A failure, inline and next to what failed. Errors are not toasts: one that
 * disappears after four seconds on a phone is one nobody read (§4.7).
 */
export function InlineError({ error, onClose }) {
  if (!error) return null;
  return html`
    <${Alert} variant="danger" className="ac-error" dismissible=${!!onClose}
              onClose=${onClose}>
      <${Icon} name="fa-solid fa-triangle-exclamation" />
      <span>${error?.message ?? String(error)}</span>
    <//>`;
}

export function NotFound({ what, action }) {
  return html`
    <${EmptyState} icon="fa-solid fa-magnifying-glass" title=${`${what} not found`}
      action=${action}>
      It may have been deleted, or the link is out of date.
    <//>`;
}

/* ---------------------------------------------------------------- toasts */

const ToastContext = createContext(() => {});

/**
 * Success and info notices, where the IDE used to push a dismissible alert into
 * the page and leave it there.
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);

  const toast = useCallback((text) => {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-2), { id, text }]);
  }, []);
  const dismiss = (id) => setItems((list) => list.filter((t) => t.id !== id));

  return html`
    <${ToastContext.Provider} value=${toast}>
      ${children}
      <div class="ac-toasts">
        ${items.map((t) => html`
          <${Toast} key=${t.id} className="ac-toast" show autohide delay=${4000}
                    onClose=${() => dismiss(t.id)}
                    role="status" aria-live="polite">
            <div class="d-flex align-items-center">
              <div class="toast-body">${t.text}</div>
              <${IconButton} icon="fa-solid fa-xmark" label="Dismiss"
                onClick=${() => dismiss(t.id)} />
            </div>
          <//>`)}
      </div>
    <//>`;
}

export const useToast = () => useContext(ToastContext);

/* ----------------------------------------------------------------- sheets */

/**
 * A dialog: centred from 768 px, a bottom sheet below it. The same Modal either
 * way, so focus trapping and Escape behave identically — only the CSS differs.
 */
export function Sheet({ show, onHide, title, children }) {
  return html`
    <${Modal} show=${show} onHide=${onHide} centered dialogClassName="ac-sheet">
      ${title
        ? html`<${Modal.Header} closeButton>
            <${Modal.Title} as="h2" className="fs-5">${title}<//>
          <//>`
        : null}
      ${children}
    <//>`;
}

/**
 * The ⋮ on a row, a card or an app bar: a dropdown from 768 px, an action sheet
 * below it.
 *
 * `actions` is `{label, icon, onSelect, danger, disabled}`; falsy entries are
 * skipped, so a caller can write `hasHost() && {...}`.
 */
export function ActionMenu({ label = "More actions", title, actions }) {
  const wide = useMedia(WIDE);
  const [open, setOpen] = useState(false);
  /* A sheet action often opens a dialog of its own. Running it after the sheet
     has finished leaving keeps two modals from animating over each other. */
  const pending = useRef(null);
  const items = actions.filter(Boolean);
  if (!items.length) return null;

  if (wide) {
    return html`
      <${Dropdown} align="end" className="ac-over">
        <${Dropdown.Toggle} as="button" type="button" bsPrefix="ac-iconbtn"
                            aria-label=${label} title=${label}>
          <${Icon} name="fa-solid fa-ellipsis-vertical" />
        <//>
        <${Dropdown.Menu} popperConfig=${{ strategy: "fixed" }}>
          ${items.map((a) => html`
            <${Dropdown.Item} as="button" key=${a.label} disabled=${!!a.disabled}
                              className=${a.danger ? "is-danger" : ""}
                              onClick=${a.onSelect}>
              ${a.icon ? html`<${Icon} name=${a.icon} />` : null}
              <span>${a.label}</span>
            <//>`)}
        <//>
      <//>`;
  }

  return html`
    <span class="ac-over">
      <${IconButton} icon="fa-solid fa-ellipsis-vertical" label=${label}
        onClick=${() => setOpen(true)} />
      <${Modal} show=${open} onHide=${() => setOpen(false)} centered
                dialogClassName="ac-sheet"
                onExited=${() => {
                  const run = pending.current;
                  pending.current = null;
                  run?.();
                }}>
        ${title ? html`<div class="ac-sheet-title">${title}</div>` : null}
        <div class="ac-actions" role="menu" aria-label=${label}>
          ${items.map((a) => html`
            <button key=${a.label} type="button" role="menuitem"
                    class=${`ac-action${a.danger ? " is-danger" : ""}`}
                    disabled=${!!a.disabled}
                    onClick=${() => {
                      pending.current = a.onSelect;
                      setOpen(false);
                    }}>
              ${a.icon ? html`<${Icon} name=${a.icon} />` : null}
              <span>${a.label}</span>
            </button>`)}
        </div>
      <//>
    </span>`;
}

/* ------------------------------------------------------------- segmented */

/**
 * Two to four mutually exclusive choices. `role="tablist"` when it switches
 * views, `"radiogroup"` when it sets a value.
 */
export function Segmented({ label, value, options, onChange, role = "tablist" }) {
  const itemRole = role === "tablist" ? "tab" : "radio";
  const stateAttr = role === "tablist" ? "aria-selected" : "aria-checked";
  return html`
    <div class="ac-segmented" role=${role} aria-label=${label}>
      ${options.map((o) => html`
        <button key=${o.value} type="button" role=${itemRole} class="ac-segment"
                ...${{ [stateAttr]: value === o.value ? "true" : "false" }}
                disabled=${!!o.disabled} onClick=${() => onChange(o.value)}>
          ${o.icon ? html`<${Icon} name=${o.icon} />` : null}
          <span>${o.label}</span>
        </button>`)}
    </div>`;
}

/* ------------------------------------------------------- projects and rows */

/* Eight hues, each measured at 5.1:1 or better against the white letter drawn
   on it, so a monogram is legible whichever one a name lands on. */
const HUES = [
  "#3d6b63", "#1f6f8b", "#6b4fa0", "#a14a2b",
  "#2e7d32", "#8a5a00", "#9c2f5e", "#45617d",
];

function hue(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** The manifest's icon if it names one that loads; a monogram otherwise. */
export function ProjectTile({ name, icon }) {
  const [broken, setBroken] = useState(false);
  if (icon && !broken) {
    return html`
      <div class="ac-tile">
        <img src=${icon} alt="" onError=${() => setBroken(true)} />
      </div>`;
  }
  return html`
    <div class="ac-tile" style=${{ background: hue(name) }} aria-hidden="true">
      ${([...name][0] ?? "?").toUpperCase()}
    </div>`;
}

export function ProjectCard({ project, verb, onOpen, actions }) {
  return html`
    <div class="ac-card">
      <div class="ac-card-head">
        <${ProjectTile} name=${project.name} icon=${project.icon} />
        <${ActionMenu} title=${project.name} label=${`Actions for ${project.name}`}
          actions=${actions} />
      </div>
      <h3 class="ac-card-title">
        <button type="button" class="ac-stretch"
                aria-label=${`${verb} ${project.name}`} onClick=${onOpen}>
          ${project.name}
        </button>
      </h3>
      ${project.description
        ? html`<p class="ac-card-text">${project.description}</p>`
        : null}
    </div>`;
}

export function ListRow({ icon, title, meta, onOpen, selected, actions, badge }) {
  return html`
    <div class=${`ac-row${onOpen ? " is-action" : ""}${selected ? " is-selected" : ""}`}>
      <div class="ac-row-icon" aria-hidden="true"><${Icon} name=${icon} /></div>
      <div class="ac-row-body">
        ${onOpen
          ? html`<button type="button" class="ac-stretch ac-row-title"
                   aria-current=${selected ? "true" : undefined}
                   onClick=${onOpen}>${title}</button>`
          : html`<div class="ac-row-title">${title}</div>`}
        ${meta ? html`<div class="ac-row-meta">${meta}</div>` : null}
      </div>
      ${badge ? html`<span class="ac-badge">${badge}</span>` : null}
      ${actions
        ? html`<${ActionMenu} title=${title} label=${`Actions for ${title}`}
                 actions=${actions} />`
        : null}
    </div>`;
}

/** A labelled row of primary buttons under a form, a card, a result. */
export const ButtonRow = ({ children }) => html`<div class="ac-button-row">${children}</div>`;

export { Button };
