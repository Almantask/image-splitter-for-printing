/**
 * ISO 216 standard paper sizes in millimeters (width x height in portrait).
 */
export const ISO_A_SIZES = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 },
};

/**
 * Returns the dimensions of a given paper format and orientation in millimeters.
 * @param {string} format - e.g. 'A4'
 * @param {'portrait'|'landscape'} orientation
 * @returns {{ width: number, height: number }}
 */
export function getPaperDimensions(format = 'A4', orientation = 'portrait') {
  const base = ISO_A_SIZES[format] || ISO_A_SIZES.A4;
  if (orientation === 'landscape') {
    return {
      width: Math.max(base.width, base.height),
      height: Math.min(base.width, base.height),
    };
  }
  return {
    width: Math.min(base.width, base.height),
    height: Math.max(base.width, base.height),
  };
}

/**
 * Computes printable area within margins (in mm).
 * @param {{ width: number, height: number }} paperDimensions
 * @param {number} marginMm
 * @returns {{ width: number, height: number, margin: number }}
 */
export function getPrintableArea(paperDimensions, marginMm = 0) {
  const safeMargin = Math.max(0, Math.min(25, Number(marginMm) || 0));
  const printW = paperDimensions.width - 2 * safeMargin;
  const printH = paperDimensions.height - 2 * safeMargin;

  if (printW <= 0 || printH <= 0) {
    throw new Error(`Margin of ${safeMargin}mm exceeds paper dimensions (${paperDimensions.width}x${paperDimensions.height}mm)`);
  }

  return {
    width: printW,
    height: printH,
    margin: safeMargin,
  };
}
