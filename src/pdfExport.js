/**
 * PDF generation module using jsPDF.
 * Slices image into tiles capped at min(300 DPI, native resolution) and builds multi-page PDF.
 */

/**
 * Generates and downloads the multi-page poster PDF.
 *
 * @param {ImageBitmap} bitmap - Source image bitmap
 * @param {Object} layout - Layout object from calculateLayout()
 * @param {Object} [options]
 * @param {function({ current: number, total: number, percentage: number }): void} [options.onProgress]
 * @param {string} [options.baseFileName]
 * @returns {Promise<void>}
 */
export async function exportToPdf(bitmap, layout, options = {}) {
  const { onProgress } = options;

  // Retrieve jsPDF constructor from global namespace
  const JsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
  if (!JsPDF) {
    throw new Error('jsPDF library is not loaded. Please ensure vendor/jspdf.umd.min.js is included.');
  }

  const { paperFormat, orientation, paper, printable, tiles, sheetsWide, sheetsTall } = layout;

  // Initialize jsPDF document in millimeters with exact paper dimensions
  const doc = new JsPDF({
    orientation: orientation === 'landscape' ? 'l' : 'p',
    unit: 'mm',
    format: [paper.width, paper.height],
    compress: true,
  });

  const offscreen = document.createElement('canvas');
  const ctx = offscreen.getContext('2d', { alpha: false, desynchronized: true });

  const totalTiles = tiles.length;

  for (let i = 0; i < totalTiles; i++) {
    const tile = tiles[i];

    // Add new page for subsequent tiles
    if (i > 0) {
      doc.addPage([paper.width, paper.height], orientation === 'landscape' ? 'l' : 'p');
    }

    if (tile.hasContent && tile.sw > 0 && tile.sh > 0) {
      // Calculate target render resolution capped at min(300 DPI, native source density)
      const tileWidthInches = tile.destW / 25.4;
      const tileHeightInches = tile.destH / 25.4;

      const nativeDpiX = tileWidthInches > 0 ? tile.sw / tileWidthInches : 300;
      const nativeDpiY = tileHeightInches > 0 ? tile.sh / tileHeightInches : 300;
      const nativeDpi = Math.max(nativeDpiX, nativeDpiY);

      const renderDpi = Math.min(300, Math.max(72, nativeDpi));

      const canvasW = Math.max(1, Math.round(tileWidthInches * renderDpi));
      const canvasH = Math.max(1, Math.round(tileHeightInches * renderDpi));

      offscreen.width = canvasW;
      offscreen.height = canvasH;

      // Fill background with white before drawing
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Draw source image crop slice onto offscreen canvas
      ctx.drawImage(
        bitmap,
        tile.sx,
        tile.sy,
        tile.sw,
        tile.sh,
        0,
        0,
        canvasW,
        canvasH
      );

      // Convert to JPEG data URL with high quality
      const imgData = offscreen.toDataURL('image/jpeg', 0.92);

      // Add image slice to current PDF page at (destX, destY) with dimensions (destW, destH)
      doc.addImage(
        imgData,
        'JPEG',
        tile.destX,
        tile.destY,
        tile.destW,
        tile.destH,
        undefined,
        'FAST'
      );
    }

    // Report progress
    if (typeof onProgress === 'function') {
      onProgress({
        current: i + 1,
        total: totalTiles,
        percentage: Math.round(((i + 1) / totalTiles) * 100),
      });
    }

    // Yield to the event loop so the UI updates smoothly
    await new Promise((resolve) => setTimeout(resolve, 8));
  }

  // Construct standard output filename: poster-3x2-A4.pdf
  const filename = `poster-${sheetsWide}x${sheetsTall}-${paperFormat.toUpperCase()}.pdf`;
  doc.save(filename);
}
