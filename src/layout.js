import { getPaperDimensions, getPrintableArea } from './paper.js';

export const MAX_SAFE_SHEETS = 200;
export const LOW_DPI_THRESHOLD = 60;

/**
 * Computes the tiling and poster layout.
 *
 * @param {Object} options
 * @param {number} options.imgWidth - Source image width in pixels
 * @param {number} options.imgHeight - Source image height in pixels
 * @param {string} [options.paperFormat='A4'] - e.g. 'A4'
 * @param {'portrait'|'landscape'} [options.orientation='portrait']
 * @param {number} [options.marginMm=0] - Margin in mm (0-25)
 * @param {number} [options.sheetsWide=3] - Target poster width in sheets (1-20)
 * @returns {Object} Layout computation results
 */
export function calculateLayout({
  imgWidth,
  imgHeight,
  paperFormat = 'A4',
  orientation = 'portrait',
  marginMm = 0,
  sheetsWide = 3,
}) {
  if (!imgWidth || imgWidth <= 0 || !imgHeight || imgHeight <= 0) {
    throw new Error('Valid image dimensions (imgWidth and imgHeight) are required');
  }

  const safeSheetsWide = Math.max(1, Math.min(50, Math.floor(Number(sheetsWide) || 1)));
  const paper = getPaperDimensions(paperFormat, orientation);
  const printable = getPrintableArea(paper, marginMm);

  // Poster width in mm based on requested sheet columns
  const posterWidthMm = safeSheetsWide * printable.width;

  // Scale: millimeters per source pixel
  const scale = posterWidthMm / imgWidth;

  // Poster height in mm based on natural aspect ratio
  const posterHeightMm = imgHeight * scale;

  // Number of sheet rows needed to cover the poster height
  const sheetsTall = Math.max(1, Math.ceil(posterHeightMm / printable.height));
  const totalSheets = safeSheetsWide * sheetsTall;

  // Effective print resolution in Dots Per Inch (1 inch = 25.4 mm)
  const effectiveDpi = scale > 0 ? (25.4 / scale) : 0;
  const roundedDpi = Math.round(effectiveDpi);

  // Tile slicing for each sheet
  const tiles = [];
  let pageNumber = 1;

  for (let r = 0; r < sheetsTall; r++) {
    for (let c = 0; c < safeSheetsWide; c++) {
      // Source rect in source image pixels
      const sx = c * (printable.width / scale);
      const sy = r * (printable.height / scale);

      // Remaining source dimensions for this tile
      const sw = Math.max(0, Math.min(printable.width / scale, imgWidth - sx));
      const sh = Math.max(0, Math.min(printable.height / scale, imgHeight - sy));

      // Placed at (margin, margin) on the paper sheet
      const dw = sw * scale;
      const dh = sh * scale;

      const nominalTileWpx = printable.width / scale;
      const nominalTileHpx = printable.height / scale;

      const isPartial =
        sw < nominalTileWpx - 0.001 ||
        sh < nominalTileHpx - 0.001;

      tiles.push({
        pageNumber,
        row: r,
        col: c,
        // Source crop rect in image pixels
        sx,
        sy,
        sw,
        sh,
        // Target drawing rect on paper (in mm)
        destX: printable.margin,
        destY: printable.margin,
        destW: dw,
        destH: dh,
        // Nominal printable dimensions for this sheet in mm
        sheetPrintW: printable.width,
        sheetPrintH: printable.height,
        isPartial,
        hasContent: sw > 0 && sh > 0,
      });

      pageNumber++;
    }
  }

  return {
    imgWidth,
    imgHeight,
    paperFormat,
    orientation,
    marginMm: printable.margin,
    paper,
    printable,
    sheetsWide: safeSheetsWide,
    sheetsTall,
    totalSheets,
    posterWidthMm,
    posterHeightMm,
    scale,
    effectiveDpi: roundedDpi,
    isLowDpi: roundedDpi < LOW_DPI_THRESHOLD,
    isExceedingSheetCap: totalSheets > MAX_SAFE_SHEETS,
    tiles,
  };
}
