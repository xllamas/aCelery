/**
 * The yes/no question every destructive action asks.
 *
 * This file used to hold the whole IDE chrome: `IdeNavbar`, the verb-first
 * `Picker`, and `useNotice` banners. The navbar became the app frame
 * (frame.js), the picker became each destination's own list, and notices
 * became toasts and inline errors (parts.js) — doc/shell-redesign.md §4.7.
 */

import { html, useState, useCallback, Modal, Button } from "acelery/ui.js";

/**
 * `window.confirm` blocks the WebView's main thread and, in a Flutter WebView,
 * has to be handled host-side or it hangs the page outright — which is why the
 * shell intercepts `alert` at all. This is a component instead.
 *
 * The title names the object and the confirm button repeats the verb
 * ("Delete"), rather than asking "aCelery?" with an OK.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);

  /* `dismissValue` is what closing the dialog without choosing answers. It is
     false — "no" — unless a caller needs to tell "no" apart from "never mind":
     the unsaved-changes prompt, where "no" discards work and a stray tap on
     the backdrop must not. */
  const confirm = useCallback(
    (message, {
      title = "aCelery",
      danger = false,
      confirmLabel = "OK",
      cancelLabel = "Cancel",
      dismissValue = false,
    } = {}) =>
      new Promise((resolve) =>
        setRequest({
          message, title, danger, confirmLabel, cancelLabel, dismissValue, resolve,
        })),
    [],
  );

  const answer = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  const dialog = request
    ? html`
        <${Modal} show onHide=${() => answer(request.dismissValue)} centered>
          <${Modal.Header} closeButton>
            <${Modal.Title} as="h2" className="fs-5">${request.title}<//>
          <//>
          <${Modal.Body}>${request.message}<//>
          <${Modal.Footer}>
            <${Button} variant="outline-secondary" onClick=${() => answer(false)}>
              ${request.cancelLabel}
            <//>
            <${Button} variant=${request.danger ? "danger" : "primary"}
                       onClick=${() => answer(true)}>
              ${request.confirmLabel}
            <//>
          <//>
        <//>`
    : null;

  return { confirm, dialog };
}
