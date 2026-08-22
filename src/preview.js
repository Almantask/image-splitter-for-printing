/**
 * Enhanced Canvas-based live preview renderer with zoom, hover inspection, and toggle guides.
 */

// Helper to create diagonal hatching pattern for uncovered sheet areas
function createHatchPattern(ctx, isDark = true) {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 16;
  patternCanvas.height = 16;
  const pctx = patternCanvas.getContext('2d');

  pctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
  pctx.fillRect(0, 0, 16, 16);

  pctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.25)';
  pctx.lineWidth = 1.5;
  pctx.beginPath();
  pctx.moveTo(0, 16);
  pctx.lineTo(16, 0);
  pctx.moveTo(-8, 8);
  pctx.lineTo(8, -8);
  pctx.moveTo(8, 24);
  pctx.lineTo(24, 8);
  pctx.stroke();

  return ctx.createPattern(patternCanvas, 'repeat');
}

/**
 * Formats millimeter length to a friendly human-readable string (cm or m).
 * @param {number} mm
 * @returns {string}
 */
export function formatDimension(mm) {
  if (mm >= 1000) {
    return `${(mm / 1000).toFixed(2)} m`;
  }
  return `${(mm / 10).toFixed(1)} cm`;
}

/**
 * Formats poster surface area in square meters.
 * @param {number} widthMm
 * @param {number} heightMm
 * @returns {string}
 */
export function formatArea(widthMm, heightMm) {
  const sqMeters = (widthMm / 1000) * (heightMm / 1000);
  return `${sqMeters.toFixed(2)} m²`;
}

/**
 * Formats pixel / DPI info.
 * @param {number} dpi
 * @returns {string}
 */
export function formatDpi(dpi) {
  return `~${dpi} DPI`;
}

/**
 * Draws the poster preview on the given canvas element with interactive zoom & highlights.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {ImageBitmap} bitmap
 * @param {Object} layout - Layout object from calculateLayout()
 * @param {Object} [renderOptions]
 * @param {number} [renderOptions.zoomLevel=1]
 * @param {boolean} [renderOptions.showGuides=true]
 * @param {boolean} [renderOptions.showBadges=true]
 * @param {number|null} [renderOptions.hoveredPageIndex=null]
 * @returns {Object} Calculated render metadata for pointer interaction
 */
export function renderPreview(canvas, bitmap, layout, renderOptions = {}) {
  if (!canvas || !bitmap || !layout) return null;

  const {
    zoomLevel = 1.0,
    showGuides = true,
    showBadges = true,
    hoveredPageIndex = null,
  } = renderOptions;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  const displayW = Math.max(280, rect.width || 600);
  const displayH = Math.max(200, rect.height || 450);

  canvas.width = Math.floor(displayW * dpr);
  canvas.height = Math.floor(displayH * dpr);

  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear canvas
  ctx.clearRect(0, 0, displayW, displayH);

  // Total paper grid dimensions in mm
  const totalPaperGridWidthMm = layout.sheetsWide * layout.paper.width;
  const totalPaperGridHeightMm = layout.sheetsTall * layout.paper.height;

  // Base fit scale with margin padding
  const padding = 28;
  const baseFitScale = Math.min(
    (displayW - padding * 2) / totalPaperGridWidthMm,
    (displayH - padding * 2) / totalPaperGridHeightMm
  );

  const fitScale = baseFitScale * zoomLevel;

  const gridPixelW = totalPaperGridWidthMm * fitScale;
  const gridPixelH = totalPaperGridHeightMm * fitScale;

  const originX = Math.round((displayW - gridPixelW) / 2);
  const originY = Math.round((displayH - gridPixelH) / 2);

  const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
  const hatchPattern = createHatchPattern(ctx, isDarkTheme);

  // 1. Draw subtle drop shadow behind paper sheets
  ctx.save();
  ctx.shadowColor = isDarkTheme ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(originX, originY, gridPixelW, gridPixelH);
  ctx.restore();

  // 2. Iterate through each sheet and tile
  const sheetPixelW = layout.paper.width * fitScale;
  const sheetPixelH = layout.paper.height * fitScale;
  const marginPixelW = layout.printable.margin * fitScale;
  const marginPixelH = layout.printable.margin * fitScale;

  const renderedTilesBounds = [];

  for (const tile of layout.tiles) {
    const sheetX = originX + tile.col * sheetPixelW;
    const sheetY = originY + tile.row * sheetPixelH;
    const isHovered = hoveredPageIndex === tile.pageNumber;

    renderedTilesBounds.push({
      pageNumber: tile.pageNumber,
      row: tile.row,
      col: tile.col,
      x: sheetX,
      y: sheetY,
      width: sheetPixelW,
      height: sheetPixelH,
      destW: tile.destW,
      destH: tile.destH,
      isPartial: tile.isPartial,
    });

    // Sheet background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sheetX, sheetY, sheetPixelW, sheetPixelH);

    // Printable area coordinates
    const printAreaX = sheetX + marginPixelW;
    const printAreaY = sheetY + marginPixelH;
    const printAreaW = sheetPixelW - marginPixelW * 2;
    const printAreaH = sheetPixelH - marginPixelH * 2;

    // Hatching pattern for uncovered remainder
    if (hatchPattern) {
      ctx.fillStyle = hatchPattern;
      ctx.fillRect(printAreaX, printAreaY, printAreaW, printAreaH);
    }

    // Draw the image slice onto the printable area
    if (tile.hasContent && tile.sw > 0 && tile.sh > 0) {
      const tileDestW = tile.destW * fitScale;
      const tileDestH = tile.destH * fitScale;

      ctx.drawImage(
        bitmap,
        tile.sx,
        tile.sy,
        tile.sw,
        tile.sh,
        printAreaX,
        printAreaY,
        tileDestW,
        tileDestH
      );
    }

    // Margin guide (dashed printable boundary)
    if (showGuides && layout.printable.margin > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(printAreaX, printAreaY, printAreaW, printAreaH);
      ctx.restore();
    }

    // Sheet boundary outline
    ctx.strokeStyle = isHovered ? '#3b82f6' : 'rgba(30, 41, 59, 0.25)';
    ctx.lineWidth = isHovered ? 2.5 : 1;
    ctx.strokeRect(sheetX, sheetY, sheetPixelW, sheetPixelH);

    // Sheet page badge pill (Page number)
    if (showBadges) {
      ctx.save();
      const badgeText = `${tile.pageNumber}`;
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = Math.max(18, textMetrics.width + 10);
      const badgeH = 18;
      const badgeX = sheetX + 6;
      const badgeY = sheetY + 6;

      ctx.fillStyle = isHovered ? '#2563eb' : 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
      ctx.restore();
    }

    // Sheet hover glow overlay
    if (isHovered) {
      ctx.save();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.fillRect(sheetX, sheetY, sheetPixelW, sheetPixelH);
      ctx.restore();
    }
  }

  // Overall poster outer boundary
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(originX, originY, gridPixelW, gridPixelH);

  ctx.restore();

  return {
    originX,
    originY,
    gridPixelW,
    gridPixelH,
    tilesBounds: renderedTilesBounds,
    displayW,
    displayH,
  };
}
