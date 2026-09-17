function pickFiles({ accept = "", multiple = false, capture } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.multiple = multiple;
    if (capture) input.setAttribute("capture", capture);
    input.hidden = true;
    const done = (files) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", () => done([...input.files ?? []]), { once: true });
    input.addEventListener("cancel", () => done([]), { once: true });
    document.body.append(input);
    input.click();
  });
}
function pickImages({ multiple = false, camera = false } = {}) {
  return pickFiles({
    accept: "image/*",
    multiple: multiple && !camera,
    capture: camera ? "environment" : void 0
  });
}
async function load(image) {
  if (image instanceof HTMLImageElement) {
    await image.decode();
    return { img: image, release: () => {
    } };
  }
  if (typeof image === "string") {
    const img2 = new Image();
    img2.src = image;
    try {
      await img2.decode();
    } catch {
      throw new Error("This picture could not be read");
    }
    return { img: img2, release: () => {
    } };
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
async function cropImage(image, area, { maxSide = 1024, type = "image/jpeg", quality = 0.85 } = {}) {
  const { img, release } = await load(image);
  try {
    const box = area ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
    const scale = Math.min(1, maxSide / Math.max(box.width, box.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
    const context = canvas.getContext("2d");
    if (type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(
      img,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const blob = await new Promise((r) => canvas.toBlob(r, type, quality));
    if (!blob) throw new Error("The picture could not be encoded");
    return blob;
  } finally {
    release();
  }
}
function shrinkImage(image, { maxSide = 1600, ...options } = {}) {
  return cropImage(image, null, { maxSide, ...options });
}
export {
  cropImage,
  pickFiles,
  pickImages,
  shrinkImage
};
//# sourceMappingURL=picker.js.map
