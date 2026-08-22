import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ISO_A_SIZES, getPaperDimensions, getPrintableArea } from '../src/paper.js';
import { calculateLayout, MAX_SAFE_SHEETS, LOW_DPI_THRESHOLD } from '../src/layout.js';

describe('Paper geometry and ISO standards', () => {
  it('should contain valid A0-A6 dimensions in mm', () => {
    assert.deepEqual(ISO_A_SIZES.A4, { width: 210, height: 297 });
    assert.deepEqual(ISO_A_SIZES.A3, { width: 297, height: 420 });
    assert.deepEqual(ISO_A_SIZES.A5, { width: 148, height: 210 });
    assert.deepEqual(ISO_A_SIZES.A0, { width: 841, height: 1189 });
    assert.deepEqual(ISO_A_SIZES.A6, { width: 105, height: 148 });
  });

  it('should swap width and height for landscape orientation', () => {
    const portrait = getPaperDimensions('A4', 'portrait');
    const landscape = getPaperDimensions('A4', 'landscape');

    assert.equal(portrait.width, 210);
    assert.equal(portrait.height, 297);
    assert.equal(landscape.width, 297);
    assert.equal(landscape.height, 210);
  });

  it('should calculate printable area subtracting margins correctly', () => {
    const paper = getPaperDimensions('A4', 'portrait');
    const printableNoMargin = getPrintableArea(paper, 0);
    assert.equal(printableNoMargin.width, 210);
    assert.equal(printableNoMargin.height, 297);
    assert.equal(printableNoMargin.margin, 0);

    const printableWithMargin = getPrintableArea(paper, 10);
    assert.equal(printableWithMargin.width, 190); // 210 - 20
    assert.equal(printableWithMargin.height, 277); // 297 - 20
    assert.equal(printableWithMargin.margin, 10);
  });

  it('should throw or clamp if margin exceeds paper bounds', () => {
    const paper = { width: 30, height: 30 };
    // 25mm margin on 30mm paper would leave -20mm printable area
    assert.throws(() => getPrintableArea(paper, 25), /Margin of 25mm exceeds paper dimensions/);
  });
});

describe('Poster tiling and layout calculation', () => {
  it('should calculate exact 3x2 grid matching plan.md example (4000x3000px, 3 sheets wide, A4 portrait, 0 margin)', () => {
    const layout = calculateLayout({
      imgWidth: 4000,
      imgHeight: 3000,
      paperFormat: 'A4',
      orientation: 'portrait',
      marginMm: 0,
      sheetsWide: 3,
    });

    // 3 sheets of 210mm = 630mm = 63.0cm
    assert.equal(layout.posterWidthMm, 630);
    // scale = 630 / 4000 = 0.1575 mm/px
    assert.equal(layout.scale, 0.1575);
    // posterH = 3000 * 0.1575 = 472.5mm = 47.25cm ≈ 47.3cm
    assert.equal(layout.posterHeightMm, 472.5);
    // sheetsTall = ceil(472.5 / 297) = ceil(1.5909) = 2
    assert.equal(layout.sheetsTall, 2);
    assert.equal(layout.totalSheets, 6);

    // DPI = 25.4 / 0.1575 ≈ 161.27 DPI
    assert.equal(layout.effectiveDpi, 161);
    assert.equal(layout.isLowDpi, false);
    assert.equal(layout.isExceedingSheetCap, false);

    assert.equal(layout.tiles.length, 6);

    // Tile 1 (row 0, col 0): full height and width
    const tile0 = layout.tiles[0];
    assert.equal(tile0.row, 0);
    assert.equal(tile0.col, 0);
    assert.equal(tile0.pageNumber, 1);
    assert.equal(tile0.sx, 0);
    assert.equal(tile0.sy, 0);
    assert.equal(tile0.destW, 210);
    assert.equal(tile0.destH, 297);
    assert.equal(tile0.isPartial, false);

    // Tile 4 (row 1, col 0): partial height (bottom row)
    const tile3 = layout.tiles[3];
    assert.equal(tile3.row, 1);
    assert.equal(tile3.col, 0);
    assert.equal(tile3.pageNumber, 4);
    assert.equal(tile3.sx, 0);
    // sy = 1 * 297 / 0.1575 = 1885.714... px
    assert.ok(Math.abs(tile3.sy - (297 / 0.1575)) < 0.001);
    // Remaining height: 3000 - sy = 1114.2857 px
    // destH = 1114.2857 * 0.1575 = 175.5 mm (297 * 2 - 472.5 remaining = 175.5 mm)
    assert.ok(Math.abs(tile3.destH - 175.5) < 0.001);
    assert.equal(tile3.isPartial, true);
  });

  it('should detect low DPI when image is too small for the poster size', () => {
    const layout = calculateLayout({
      imgWidth: 300,
      imgHeight: 200,
      paperFormat: 'A4',
      orientation: 'portrait',
      marginMm: 0,
      sheetsWide: 3, // 630mm wide poster from 300px
    });

    // scale = 630 / 300 = 2.1 mm/px
    // DPI = 25.4 / 2.1 ≈ 12.1 DPI
    assert.ok(layout.effectiveDpi < LOW_DPI_THRESHOLD);
    assert.equal(layout.isLowDpi, true);
  });

  it('should detect when total sheets exceed safety limit', () => {
    const layout = calculateLayout({
      imgWidth: 1000,
      imgHeight: 10000, // Very tall panorama/strip
      paperFormat: 'A4',
      orientation: 'portrait',
      marginMm: 0,
      sheetsWide: 20,
    });

    assert.ok(layout.totalSheets > MAX_SAFE_SHEETS);
    assert.equal(layout.isExceedingSheetCap, true);
  });

  it('should handle margins correctly across tiles', () => {
    const layout = calculateLayout({
      imgWidth: 1000,
      imgHeight: 1000,
      paperFormat: 'A4',
      orientation: 'portrait',
      marginMm: 15,
      sheetsWide: 2,
    });

    // Printable width = 210 - 30 = 180mm
    // Poster width = 2 * 180 = 360mm
    assert.equal(layout.printable.margin, 15);
    assert.equal(layout.posterWidthMm, 360);
    assert.equal(layout.tiles[0].destX, 15);
    assert.equal(layout.tiles[0].destY, 15);
  });

  it('should handle square and extreme aspect ratios (wide panorama and tall vertical)', () => {
    const widePanorama = calculateLayout({
      imgWidth: 10000,
      imgHeight: 1000,
      paperFormat: 'A4',
      orientation: 'landscape',
      marginMm: 5,
      sheetsWide: 5,
    });
    assert.equal(widePanorama.sheetsTall, 1);
    assert.equal(widePanorama.totalSheets, 5);

    const tallScan = calculateLayout({
      imgWidth: 1000,
      imgHeight: 10000,
      paperFormat: 'A4',
      orientation: 'portrait',
      marginMm: 0,
      sheetsWide: 1,
    });
    // 1 sheet wide = 210mm posterW -> scale = 0.21 -> posterH = 2100mm -> ceil(2100 / 297) = 8 sheets tall
    assert.equal(tallScan.sheetsWide, 1);
    assert.equal(tallScan.sheetsTall, 8);
    assert.equal(tallScan.totalSheets, 8);
  });
});
