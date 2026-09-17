/**
 * ImageCropper: a frame over a picture that the user drags and pinches until
 * the part they want is inside it (doc/pickers-evaluation.md §10).
 *
 * react-easy-crop does the interaction, through preact/compat like
 * react-bootstrap. The cut itself is `cropImage` from acelery/picker.js, so
 * an app can also crop without the dialog.
 *
 *     const [photo, setPhoto] = useState(null);
 *     …
 *     <${Button} onClick=${async () => setPhoto((await pickImages())[0])}>Photo<//>
 *     <${ImageCropper} image=${photo} shape="round"
 *       onDone=${async (blob) => { await file.writeBytes("App/me.jpg", blob); setPhoto(null); }}
 *       onCancel=${() => setPhoto(null)} />
 */

import { html } from "htm/preact";
import { useEffect, useState } from "preact/hooks";
import Cropper from "react-easy-crop";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import FormRange from "react-bootstrap/FormRange";
import Modal from "react-bootstrap/Modal";
import { cropImage } from "acelery/picker.js";

const MAX_ZOOM = 4;

/**
 * @param {object} props
 * @param {Blob|string|null} props.image a picked File, or a URL. The dialog is
 *   open while this is set.
 * @param {"rect"|"round"} [props.shape] the frame. A round frame still gives
 *   a square picture; show it round with CSS.
 * @param {number} [props.aspect] width / height of the frame. Default 1
 * @param {number} [props.maxSide] the longer side of the result. Default 1024
 * @param {string} [props.type] as cropImage. Default "image/jpeg"
 * @param {number} [props.quality] as cropImage
 * @param {string} [props.title]
 * @param {string} [props.confirmLabel]
 * @param {(blob: Blob) => void} props.onDone
 * @param {() => void} props.onCancel
 */
export function ImageCropper({
  image,
  shape = "rect",
  aspect = 1,
  maxSide = 1024,
  type,
  quality,
  title = "Crop the picture",
  confirmLabel = "Use",
  onDone,
  onCancel,
}) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError(null);
    if (!image) {
      setSrc(null);
      return undefined;
    }
    if (typeof image === "string") {
      setSrc(image);
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function use() {
    if (!area || busy) return;
    setBusy(true);
    setError(null);
    try {
      onDone?.(await cropImage(src, area, { maxSide, type, quality }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return html`
    <${Modal} show=${!!image} onHide=${() => !busy && onCancel?.()}
              centered fullscreen="sm-down" className="ac-cropper">
      <${Modal.Header} closeButton=${!busy}>
        <${Modal.Title}>${title}<//>
      <//>
      <${Modal.Body}>
        <div class="ac-cropper-area"
             style="position:relative;height:min(60vh,420px);background:#111;border-radius:.5rem;overflow:hidden">
          ${src
            ? html`<${Cropper}
                image=${src} crop=${crop} zoom=${zoom} aspect=${aspect}
                minZoom=${1} maxZoom=${MAX_ZOOM}
                cropShape=${shape === "round" ? "round" : "rect"}
                showGrid=${shape !== "round"}
                onCropChange=${setCrop} onZoomChange=${setZoom}
                onCropComplete=${(_, pixels) => setArea(pixels)}
                onMediaError=${() => setError("This picture could not be opened")} />`
            : null}
        </div>
        <label class="form-label mt-3 mb-1" for="ac-cropper-zoom">Zoom</label>
        <${FormRange} id="ac-cropper-zoom" min=${1} max=${MAX_ZOOM} step=${0.01}
          value=${zoom} onInput=${(e) => setZoom(Number(e.currentTarget.value))} />
        ${error ? html`<${Alert} variant="danger" className="mt-3 mb-0">${error}<//>` : null}
      <//>
      <${Modal.Footer}>
        <${Button} variant="secondary" disabled=${busy} onClick=${() => onCancel?.()}>
          Cancel
        <//>
        <${Button} variant="primary" disabled=${busy || !area} onClick=${use}>
          ${busy ? "Saving…" : confirmLabel}
        <//>
      <//>
    <//>`;
}
