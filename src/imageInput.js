const MAX_MEGAPIXELS = 120;
const MAX_PIXELS = MAX_MEGAPIXELS * 1_000_000;

/**
 * Result returned after successfully loading and processing an image.
 * @typedef {Object} LoadedImage
 * @property {ImageBitmap} bitmap
 * @property {string} fileName
 * @property {number} originalWidth
 * @property {number} originalHeight
 * @property {number} width
 * @property {number} height
 * @property {boolean} wasDownscaled
 * @property {string} [format]
 */

/**
 * Decodes an image Blob/File into an ImageBitmap with EXIF correction and MP budget safeguard.
 * @param {Blob} blob
 * @param {string} [fileName='image']
 * @returns {Promise<LoadedImage>}
 */
export async function loadImageFromBlob(blob, fileName = 'image') {
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Invalid image file or blob provided');
  }

  let rawBitmap;
  try {
    rawBitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (err) {
    // Fallback if browser doesn't support imageOrientation option
    try {
      rawBitmap = await createImageBitmap(blob);
    } catch (fallbackErr) {
      throw new Error(`Unable to decode image format: ${fallbackErr.message || err.message}`);
    }
  }

  const originalWidth = rawBitmap.width;
  const originalHeight = rawBitmap.height;
  const totalPixels = originalWidth * originalHeight;

  // Check if image exceeds our safety budget (~120 MP)
  if (totalPixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / totalPixels);
    const targetW = Math.max(1, Math.round(originalWidth * scale));
    const targetH = Math.max(1, Math.round(originalHeight * scale));

    const offscreen = document.createElement('canvas');
    offscreen.width = targetW;
    offscreen.height = targetH;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(rawBitmap, 0, 0, targetW, targetH);
    rawBitmap.close(); // Clean up memory

    const downscaledBitmap = await createImageBitmap(offscreen);
    return {
      bitmap: downscaledBitmap,
      fileName,
      originalWidth,
      originalHeight,
      width: targetW,
      height: targetH,
      wasDownscaled: true,
      format: blob.type || 'image',
    };
  }

  return {
    bitmap: rawBitmap,
    fileName,
    originalWidth,
    originalHeight,
    width: originalWidth,
    height: originalHeight,
    wasDownscaled: false,
    format: blob.type || 'image',
  };
}

/**
 * Loads an image from a user-selected File.
 * @param {File} file
 * @returns {Promise<LoadedImage>}
 */
export async function loadImageFromFile(file) {
  if (!file) {
    throw new Error('No file selected');
  }
  return loadImageFromBlob(file, file.name);
}

/**
 * Loads an image from an external URL via fetch with CORS detection.
 * @param {string} url
 * @returns {Promise<LoadedImage>}
 */
export async function loadImageFromUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    throw new Error('Please enter an image URL');
  }

  let response;
  try {
    response = await fetch(trimmed);
  } catch (err) {
    throw new Error(
      'This website does not allow direct loading (CORS restricted). Please right-click and save the image to your computer, then drag & drop or browse for it here.'
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to download image (HTTP ${response.status}: ${response.statusText})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/') && !trimmed.match(/\.(jpe?g|png|webp|gif|bmp|svg)($|\?)/i)) {
    // Proceed with blob, but warn if not recognized
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('Downloaded image file is empty');
  }

  let fileName = 'web-image';
  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    const pathname = parsed.pathname;
    const base = pathname.substring(pathname.lastIndexOf('/') + 1);
    if (base) {
      fileName = decodeURIComponent(base.split('?')[0]);
    }
  } catch (_) {}

  return loadImageFromBlob(blob, fileName);
}
