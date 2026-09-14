/**
 * Pieces every IDE screen shares.
 *
 * The 2014 IDE had one `navBar` global that each screen rebuilt, and menu
 * enable/disable was 40 lines of `navBar.getNavItem(1).getElement(2)` indexing
 * — position-dependent, so inserting a menu item silently rewired the logic.
 * Here a menu item declares its own `disabled`, and the screen that owns the
 * state decides it.
 */

import {
  html, useState, useCallback, useRef, useDismiss,
  Navbar, Nav, NavDropdown, Container, Alert, Button, Modal, ListGroup,
} from "acelery/ui.js";

/**
 * The IDE chrome: brand, and a list of items or dropdowns.
 *
 * `items` is `{label, onSelect, disabled}` or
 * `{label, items: [...]}` for a dropdown.
 */
export function IdeNavbar({ title, items }) {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const nav = useRef(null);

  /* The collapsed menu is an overlay (tools/css/acelery.css), so it covers
     what is under it and has to be dismissable without choosing anything. */
  const close = useCallback(() => {
    setOpen(false);
    setOpenMenu(null);
  }, []);
  useDismiss(nav, close, open);

  /* Choosing anything closes both the collapse and any open dropdown. On a
     phone the collapse covers the screen, so leaving it open hides the thing
     you just asked for. */
  const choose = (fn) => () => {
    setOpen(false);
    setOpenMenu(null);
    fn?.();
  };

  /* One dropdown open at a time, controlled, so that choosing an item can
     close both it and the collapse in one go. */

  return html`
    <${Navbar} expand="lg" className="bg-body-tertiary mb-3"
               expanded=${open} onToggle=${setOpen}>
      <${Container} fluid ref=${nav}>
        <${Navbar.Toggle} aria-controls="ide-nav" />
        <${Navbar.Brand} className="h4 mb-0">${title}<//>
        <${Navbar.Collapse} id="ide-nav">
          <${Nav} className="ms-auto">
            ${items.map((item) =>
              item.items
                ? html`
                    <${NavDropdown} key=${item.label} title=${item.label}
                                    id=${`nav-${item.label}`}
                                    disabled=${!!item.disabled}
                                    show=${openMenu === item.label}
                                    onToggle=${(next) =>
                                      setOpenMenu(next ? item.label : null)}>
                      ${item.items.map((sub) =>
                        sub.divider
                          ? html`<${NavDropdown.Divider} key=${sub.key} />`
                          : html`<${NavDropdown.Item} key=${sub.label}
                                   disabled=${!!sub.disabled}
                                   onClick=${choose(sub.onSelect)}>
                              ${sub.label}
                            <//>`,
                      )}
                    <//>`
                : html`<${Nav.Link} key=${item.label} disabled=${!!item.disabled}
                          onClick=${choose(item.onSelect)}>
                    ${item.label}
                  <//>`,
            )}
          <//>
        <//>
      <//>
    <//>`;
}

/**
 * "Select a project to open" and its six siblings — the same list with a
 * different verb, which is what it always was.
 */
export function Picker({ prompt, entries, icon = "fa-solid fa-file", onPick, empty }) {
  if (!entries.length) {
    return html`<${Alert} variant="secondary">
      ${empty ?? "Nothing here yet."}
    <//>`;
  }
  return html`
    <${Alert} variant="success">${prompt}<//>
    <${ListGroup}>
      ${entries.map(
        (e) => html`
          <${ListGroup.Item} key=${e.name} action
                             onClick=${() => onPick(e.name)}>
            <div class="h5 mb-1"><i class=${icon}></i> ${" " + e.name}</div>
            ${e.description
              ? html`<p class="mb-0 text-body-secondary">${e.description}</p>`
              : null}
          <//>`,
      )}
    <//>`;
}

/**
 * A yes/no question.
 *
 * `window.confirm` blocks the WebView's main thread and, in a Flutter WebView,
 * has to be handled host-side or it hangs the page outright — which is why the
 * shell intercepts `alert` at all. This is a component instead.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    (message, { title = "aCelery", danger = false } = {}) =>
      new Promise((resolve) => setRequest({ message, title, danger, resolve })),
    [],
  );

  const answer = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  const dialog = request
    ? html`
        <${Modal} show onHide=${() => answer(false)} centered>
          <${Modal.Header} closeButton>
            <${Modal.Title}>${request.title}<//>
          <//>
          <${Modal.Body}>${request.message}<//>
          <${Modal.Footer}>
            <${Button} variant="secondary" onClick=${() => answer(false)}>
              Cancel
            <//>
            <${Button} variant=${request.danger ? "danger" : "primary"}
                       onClick=${() => answer(true)}>
              OK
            <//>
          <//>
        <//>`
    : null;

  return { confirm, dialog };
}

/** A transient message, where xAlertDialog used to interrupt with a dialog. */
export function useNotice() {
  const [notice, setNotice] = useState(null);

  const banner = notice
    ? html`<${Alert} variant=${notice.variant ?? "info"} dismissible
                     onClose=${() => setNotice(null)}>
        ${notice.text}
      <//>`
    : null;

  return {
    banner,
    notify: (text, variant = "info") => setNotice({ text, variant }),
    fail: (e) => setNotice({ text: e?.message ?? String(e), variant: "danger" }),
    clear: () => setNotice(null),
  };
}
