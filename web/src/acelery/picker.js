/**
 * Choosing files and photos, and preparing pictures before they are stored
 * (doc/pickers-evaluation.md).
 *
 * Every picker here is the page's own `<input type="file">`, so a file comes
 * from wherever the user is: the phone's gallery, camera or documents inside
 * the aCelery app, and the other computer's disk in a browser on the network.
 * What comes back is a `File` either way; `file.writeBytes` stores it on the
 * phone.
 *
 * Browsers only open a picker in answer to a tap or a click, so call these
 * from an event handler, not from `main` or an effect.
 *
 * Prefer `FileButton` from acelery/ui.js where the picker opens from a
 * button. These functions click an input from script, and on iOS WebKit then
 * opens its Photo Library / Take Photo / Choose File menu in the page's
 * top-left corner rather than beside the button.
 */

/**
 * Opens a file picker.
 *
 * @param {object} [options]
 * @param {string} [options.accept] as the input's attribute: ".csv,text/csv",
 *   "image/*", …
 * @param {boolean} [options.multiple]
 * @param {"environment"|"user"} [options.capture] asks for the camera
 *   ("environment" is the back one) where there is one
 * @returns {Promise<File[]>} empty when the user cancels
 */
export function pickFiles({ accept = "", multiple = false, capture } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.multiple = multiple;
    if (capture) input.setAttribute("capture", capture);
    // In the document, because WebKit ignores a click on a detached input.
    input.hidden = true;

    const done = (files) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", () => done([...(input.files ?? [])]), { once: true });
    input.addEventListener("cancel", () => done([]), { once: true });

    document.body.append(input);
    input.click();
  });
}

/**
 * Opens the photo picker, or with `camera: true` the camera.
 *
 * @param {object} [options]
 * @param {boolean} [options.multiple]
 * @param {boolean} [options.camera] take a photo instead of choosing one. A
 *   browser on a computer has no camera to offer and shows its file dialog.
 * @returns {Promise<File[]>}
 */
export function pickImages({ multiple = false, camera = false } = {}) {
  return pickFiles({
    accept: "image/*",
    multiple: multiple && !camera,
    capture: camera ? "environment" : undefined,
  });
}

/** Loads a picture the way the page shows it: an <img> honours EXIF rotation. */
async function load(image) {
  if (image instanceof HTMLImageElement) {
    await image.decode();
    return { img: image, release: () => {} };
  }
  if (typeof image === "string") {
    const img = new Image();
    img.src = image;
    try {
      await img.decode();
    } catch {
      throw new Error("This picture could not be read");
    }
    return { img, release: () => {} };
  }
  const src = URL.createObjectURL(image);
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(src);
    throw new Error(`This picture could not be read${image.type ? ` (${image.type})` : ""}`);
  }
  return { img, release: () => URL.revokeObjectURL(src) };
}

/**
 * Cuts `area` out of a picture and scales it to fit `maxSide`.
 *
 * @param {Blob|HTMLImageElement|string} image a picked File, a loaded image,
 *   or its URL
 * @param {{x:number,y:number,width:number,height:number}|null} area in the
 *   picture's pixels, as ImageCropper reports it; null for the whole picture
 * @param {object} [options]
 * @param {number} [options.maxSide] the longer side of the result. Default 1024
 * @param {string} [options.type] "image/jpeg" (default), "image/png" or
 *   "image/webp". PNG keeps transparency; JPEG is far smaller for photos
 * @param {number} [options.quality] 0 to 1, for JPEG and WebP. Default 0.85
 * @returns {Promise<Blob>}
 */
export async function cropImage(
  image,
  area,
  { maxSide = 1024, type = "image/jpeg", quality = 0.85 } = {},
) {
  const { img, release } = await load(image);
  try {
    const box = area ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
    const scale = Math.min(1, maxSide / Math.max(box.width, box.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));

    const context = canvas.getContext("2d");
    if (type === "image/jpeg") {
      // JPEG has no transparency; without this a PNG's clear parts turn black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(img, box.x, box.y, box.width, box.height,
      0, 0, canvas.width, canvas.height);

    const blob = await new Promise((r) => canvas.toBlob(r, type, quality));
    if (!blob) throw new Error("The picture could not be encoded");
    return blob;
  } finally {
    release();
  }
}

/**
 * Makes a picture small enough to store: the whole picture, at most `maxSide`
 * on its longer side. A photo from a phone's camera is often 3–12 MB; at the
 * default 1600 it is a few hundred KB.
 *
 * @param {Blob} image
 * @param {object} [options] as `cropImage`, with `maxSide` defaulting to 1600
 * @returns {Promise<Blob>}
 */
export function shrinkImage(image, { maxSide = 1600, ...options } = {}) {
  return cropImage(image, null, { maxSide, ...options });
}
