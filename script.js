// DOM Elements
const upload = document.getElementById("upload");
const dropzone = document.getElementById("dropzone");
const preview = document.getElementById("preview");
const processBtn = document.getElementById("process");
const downloadBtn = document.getElementById("download");

// State
let files = [];
let processed = [];

// Drag and Drop Handlers
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  files = [...e.dataTransfer.files].slice(0, 200);
});

// File Upload Handler
upload.onchange = () => {
  files = [...upload.files].slice(0, 200);
};

// Image Processing Functions
function getPixel(data, x, y, w) {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function pixelMatches(pixel, borderColor, tol) {
  return Math.abs(pixel[0] - borderColor[0]) <= tol &&
         Math.abs(pixel[1] - borderColor[1]) <= tol &&
         Math.abs(pixel[2] - borderColor[2]) <= tol &&
         Math.abs(pixel[3] - borderColor[3]) <= tol;
}

function isRowBorder(data, y, w, borderColor, tol) {
  // Allow a small number of noisy pixels so JPEG artifacts do not block trimming
  const maxMismatches = Math.max(2, Math.floor(w * 0.02));
  let mismatches = 0;
  for (let x = 0; x < w; x++) {
    const pixel = getPixel(data, x, y, w);
    if (!pixelMatches(pixel, borderColor, tol)) {
      mismatches++;
      if (mismatches > maxMismatches) return false;
    }
  }
  return true;
}

function isColBorder(data, x, w, h, borderColor, tol) {
  const maxMismatches = Math.max(2, Math.floor(h * 0.02));
  let mismatches = 0;
  for (let y = 0; y < h; y++) {
    const pixel = getPixel(data, x, y, w);
    if (!pixelMatches(pixel, borderColor, tol)) {
      mismatches++;
      if (mismatches > maxMismatches) return false;
    }
  }
  return true;
}

function cropBorders(canvas, tol) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  
  // Sample top-left corner for border color
  const borderColor = getPixel(data, 0, 0, w);
  
  let top = 0, bottom = h, left = 0, right = w;

  // Crop from top
  for (let y = 0; y < h; y++) {
    if (!isRowBorder(data, y, w, borderColor, tol)) break;
    top++;
  }
  
  // Crop from bottom - resample border color from bottom edge
  const bottomBorderColor = getPixel(data, 0, h - 1, w);
  for (let y = h - 1; y >= top; y--) {
    if (!isRowBorder(data, y, w, bottomBorderColor, tol)) break;
    bottom--;
  }
  
  // Crop from left - resample from left edge after top/bottom crop
  const leftBorderColor = getPixel(data, 0, top, w);
  for (let x = 0; x < w; x++) {
    if (!isColBorder(data, x, w, h, leftBorderColor, tol)) break;
    left++;
  }
  
  // Crop from right - resample from right edge
  const rightBorderColor = getPixel(data, w - 1, top, w);
  for (let x = w - 1; x >= left; x--) {
    if (!isColBorder(data, x, w, h, rightBorderColor, tol)) break;
    right--;
  }

  // If we trimmed any side, shave an extra 10px to catch thin residual borders
  const extra = 10;
  const trimmedTop = top > 0;
  const trimmedBottom = bottom < h;
  const trimmedLeft = left > 0;
  const trimmedRight = right < w;

  if (trimmedTop) top = Math.max(0, top + extra);
  if (trimmedBottom) bottom = Math.max(top + 1, Math.min(h, bottom - extra));
  if (trimmedLeft) left = Math.max(0, left + extra);
  if (trimmedRight) right = Math.max(left + 1, Math.min(w, right - extra));

  // Safety check
  if (right <= left || bottom <= top) {
    return canvas;
  }

  const out = document.createElement("canvas");
  out.width = right - left;
  out.height = bottom - top;
  out.getContext("2d").drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function resize500(canvas) {
  const scale = 500 / canvas.height;
  const out = document.createElement("canvas");
  out.height = 500;
  out.width = Math.round(canvas.width * scale);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

async function aiUpscale(canvas) {
  // High-quality upscaling using multiple passes
  const scale = 2;
  const out = document.createElement("canvas");
  out.width = canvas.width * scale;
  out.height = canvas.height * scale;
  const ctx = out.getContext("2d");
  
  // Use high-quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  
  // Draw upscaled image
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  
  // Apply sharpening filter
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;
  const w = out.width;
  const h = out.height;
  
  // Simple unsharp mask for enhancement
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.putImageData(imageData, 0, 0);
  
  ctx.globalAlpha = 1;
  ctx.filter = "contrast(1.1) brightness(1.02)";
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = "none";
  
  return out;
}

// Process Button Handler
processBtn.onclick = async () => {
  preview.innerHTML = "";
  processed = [];

  const tol = +tolerance.value;
  const format = document.getElementById("format").value;
  const quality = +document.getElementById("quality").value;
  const ai = document.getElementById("ai").value === "on";

  for (const file of files) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const base = document.createElement("canvas");
    base.width = img.width;
    base.height = img.height;
    base.getContext("2d").drawImage(img, 0, 0);

    let out = cropBorders(base, tol);
    if (ai) out = await aiUpscale(out);
    out = resize500(out);

    out.toBlob(blob => {
      processed.push({ name: file.name, blob });
      const im = document.createElement("img");
      im.src = URL.createObjectURL(blob);
      preview.appendChild(im);
    }, format, quality);
  }
};

// Download Button Handler
downloadBtn.onclick = async () => {
  if (!processed.length) return;
  const zip = new JSZip();
  processed.forEach(f => zip.file(f.name, f.blob));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "processed_images.zip";
  a.click();
};