/**
 * FileButton: a button that opens the file or photo picker and hands over what
 * was chosen (doc/pickers-evaluation.md).
 *
 * It is a <label> styled as a button around a real, visually hidden
 * <input type="file">, so the user's tap lands on the input itself. That
 * matters on iOS: WebKit anchors its Photo Library / Take Photo / Choose File
 * menu to the input the user touched, but opens it in the page's top-left
 * corner when a script clicks the input, as `pickFiles` has to.
 *
 *     <${FileButton} accept="image/*" onFiles=${([photo]) => setPhoto(photo)}>
 *       Choose a photo
 *     <//>
 */

import { html } from "htm/preact";
import { useRef } from "preact/hooks";

/**
 * @param {object} props
 * @param {(files: File[]) => void} props.onFiles called with what was chosen;
 *   not called when the user cancels
 * @param {string} [props.accept] as the input's attribute: "image/*", ".csv", …
 * @param {boolean} [props.multiple]
 * @param {"environment"|"user"} [props.capture] asks for the camera where
 *   there is one
 * @param {string} [props.variant] a Bootstrap button variant. Default "primary"
 * @param {"sm"|"lg"} [props.size]
 * @param {boolean} [props.disabled]
 */
export function FileButton({
  onFiles,
  accept,
  multiple = false,
  capture,
  variant = "primary",
  size,
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const input = useRef(null);

  const classes = [
    "btn",
    `btn-${variant}`,
    size ? `btn-${size}` : "",
    disabled ? "disabled" : "",
    "ac-file-button",
    className,
  ].filter(Boolean).join(" ");

  function changed(event) {
    const files = [...(event.currentTarget.files ?? [])];
    // Cleared, so choosing the same file again is still a change.
    event.currentTarget.value = "";
    if (files.length) onFiles?.(files);
  }

  return html`
    <label class=${classes} aria-disabled=${disabled ? "true" : undefined}
           style=${{ position: "relative" }} ...${rest}>
      ${children}
      <input ref=${input} type="file" class="visually-hidden"
        accept=${accept} multiple=${multiple} capture=${capture}
        disabled=${disabled} onChange=${changed} />
    </label>`;
}
