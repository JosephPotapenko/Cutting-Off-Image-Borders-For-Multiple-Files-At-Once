# Smart Image Border Cropper

Client-side tool to batch-remove solid borders, enhance, resize, and download up to 200 images at once. Everything runs in the browser; no uploads to a server.

## Features
- Drag-and-drop or file input for up to 200 PNG/JPEG/WEBP images
- Detects and trims solid-color borders on any combination of sides (tolerance slider for noisy/compressed edges)
- Optional 2x enhancement (high-quality upscale + contrast/brightness tweak)
- Outputs resized images at 500px height while preserving aspect ratio
- One-click ZIP download of all processed images

## Quick Start
1. Open [index.html](index.html) in a modern browser (Chrome/Edge/Firefox/Safari).
2. Drag images into the drop zone or pick files.
3. Adjust controls (tolerance, format, quality, enhancement).
4. Click **Process Images**, preview results, then **Download ZIP**.

## Controls
- **Border Tolerance (5–100, default 50):** Higher values catch noisy/white borders; lower values are stricter.
- **Output Format:** PNG, JPEG, or WebP.
- **JPEG/WebP Quality:** Applied when using those formats.
- **Image Enhancement:** Off, or On for 2x upscale + mild sharpening/contrast.

## How It Works
1. Read each image to a canvas.
2. Detect border color from corners, scan edges with per-channel tolerance, allow small noise, then shave an extra 10px when any side was trimmed to catch thin remnants.
3. (Optional) Enhance at 2x with high-quality canvas scaling and light sharpening.
4. Resize to 500px height (width scales to preserve aspect).
5. Collect outputs and bundle into a ZIP for download.

## Notes
- Processing is entirely local; large batches depend on your device memory/CPU.
- For stubborn borders, raise tolerance (60–80). For over-cropping, lower it (15–30).

## Project Structure
- [index.html](index.html) – UI layout, controls, and includes.
- [assets/css/style.css](assets/css/style.css) – Visual styling and layout.
- [assets/js/script.js](assets/js/script.js) – Border detection, enhancement, resize, ZIP creation.
- Favicon is served online via Iconify (Tabler `crop`).

## Development
- No build step required; open [index.html](index.html) directly.
- Keep assets under `assets/css` and `assets/js` for clarity.
- Formatting is standardized via [.editorconfig](.editorconfig).