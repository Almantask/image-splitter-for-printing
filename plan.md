# Plan — Image Splitter for Printing

A single-page website in the spirit of [rasterbator.net](https://rasterbator.net/), stripped to the essentials: load an image, choose paper settings, see a live preview of the image split across sheets, and download a print-ready multi-page PDF. Print the pages on any printer at 100% scale, trim the margins, assemble the poster.

## Scope

**In:**
- Image input via drag & drop, file picker, or URL.
- Settings: A-series paper format (default A4), sheet orientation (default portrait), margin in mm (default 0), poster width in sheets.
- Live preview: full image with the sheet grid overlaid, plus total poster dimensions and sheet count.
- Output: one multi-page PDF, one sheet per page, in reading order (left→right, top→bottom).
- Both steps and the preview on one page. No wizard, no navigation.

**Out (explicitly, per requirements):**
- No color/rasterization/dither effects, no output styling.
- No backend, no accounts, no upload — everything runs client-side in the browser.
- No overlap/glue flaps or crop marks in v1 (margins are plain white borders to trim).

## UX — one page, two steps

```
┌─────────────────────────────────────────────────┐
│  Image Splitter for Printing                    │
│                                                 │
│  1. Image                                       │
│     [   drop image here or Browse…   ]          │
│     [ https://…            ] [ Load ]           │
│     photo.jpg — 4000 × 3000 px                  │
│                                                 │
│  2. Layout                                      │
│     Paper [A4 ▾]   Orientation (•) P  ( ) L     │
│     Margin [0] mm  Width [3] sheets             │
│                                                 │
│  Preview          63.0 cm × 47.3 cm             │
│     ┌───┬───┬───┐  3 × 2 = 6 sheets, A4 portrait│
│     │   │   │   │  ~161 DPI                     │
│     ├───┼───┼───┤                               │
│     └───┴───┴───┘                               │
│                                                 │
│     [ Download PDF ]                            │
│     Print at 100% scale (disable fit-to-page).  │
└─────────────────────────────────────────────────┘
```

### Step 1 — Image input
- Drop zone accepting drag & drop; a Browse button (hidden `<input type="file">`) inside it.
- URL field + Load button as the alternative path.
- Accepted formats: JPEG, PNG, WebP, GIF (first frame), BMP.
- After load: show filename and pixel dimensions. Replacing the image keeps current settings.

### Step 2 — Layout settings
| Setting | Control | Values | Default |
|---|---|---|---|
| Paper format | select | A0–A6 | A4 |
| Sheet orientation | radio/toggle | portrait / landscape | portrait |
| Margin | number (mm) | 0–25 | 0 |
| Poster width | number (sheets) | 1–20, integer | 3 |

Controls are always visible; preview and Download activate once an image is loaded. Every change re-renders the preview immediately.

### Preview
- Scaled-to-fit rendering of the full poster: the image with sheet boundaries drawn as a grid. The last row/column usually isn't fully covered by the image — show the empty remainder as white/hatched so the user understands what will print.
- Info line: poster dimensions (cm/m), grid and sheet count ("3 × 2 = 6 sheets, A4 portrait"), effective print resolution ("~161 DPI") with a visible warning below ~60 DPI.

### Output
- "Download PDF" generates the file client-side with a progress state on the button.
- Filename: `poster-3x2-A4.pdf`.
- Hint under the button: print at 100% / actual size, not fit-to-page.

## Tech stack

- **Plain HTML + CSS + JS (ES modules).** One page, ~6 small modules — no framework or build step needed. Trivial to develop and host anywhere.
- **Canvas API** for preview and for slicing tiles out of the source image.
- **jsPDF** (pinned UMD build, vendored in `vendor/`) for PDF assembly — its mm-based page API matches ISO paper sizes naturally.
- Dev: any static server (`npx serve .`) — needed because ES modules don't run from `file://`.
- Deploy: any static host (GitHub Pages works as-is).

## File structure

```
index.html          markup: both steps, preview, download button
styles.css
src/main.js         state + event wiring; re-render on any change
src/paper.js        ISO A sizes (mm); orientation + margin → printable area
src/layout.js       pure tiling math (poster size, grid, per-tile source rects)
src/imageInput.js   file / drop / URL loading → ImageBitmap
src/preview.js      preview canvas (image + grid overlay) + info line
src/pdfExport.js    per-tile canvas rendering at capped DPI → jsPDF pages
vendor/jspdf.umd.min.js
test/layout.test.js node:test for the pure math in layout.js / paper.js
```

## Core math (all in mm)

```
paper:        A4 = 210 × 297, A(n) = A(n−1) halved on the long side; swap w/h if landscape
printable:    printW = paperW − 2·margin,  printH = paperH − 2·margin   (validate > 0)
poster:       posterW = sheetsWide · printW
scale:        s = posterW / imgWpx                      (mm per source pixel)
              posterH = imgHpx · s
grid:         sheetsTall = ceil(posterH / printH)
tile (r, c):  source rect in px:
                x = c·printW/s      y = r·printH/s
                w = printW/s        h = min(printH/s, imgHpx − y)   (last row partial)
PDF page:     paper-sized; tile image placed at (margin, margin), width printW,
              height h·s — partial tiles leave the rest of the page white
```

Tile rendering for the PDF: one reusable offscreen canvas per tile, sized to
`min(300 DPI, native source density)` — never upscale beyond source pixels, cap at
300 DPI to bound memory (A4 tile at 300 DPI ≈ 8.7 MP). Each tile: `drawImage`
of the source region → JPEG (quality ~0.92) → `jsPDF.addImage`. Loop yields to the
event loop between tiles so the UI stays responsive.

## Edge cases & constraints

- **URL images / CORS:** load via `fetch(url)` → blob → `createImageBitmap`. If the host blocks CORS, show a clear message ("this site doesn't allow direct loading — save the image and drop it here"). No third-party proxy.
- **EXIF rotation:** `createImageBitmap(blob, { imageOrientation: 'from-image' })`.
- **Tainted canvas:** avoided by design — only blob-sourced bitmaps are drawn, never cross-origin `<img>` elements.
- **Margin vs. paper:** margin capped so printable area stays positive (25 mm cap already guarantees this for A6+).
- **Runaway output:** hard cap on total sheets (e.g. 200) with an inline warning instead of generating.
- **Huge sources:** if the decoded image exceeds ~120 MP, downscale on load to that budget and note it in the UI.
- **Low quality:** effective DPI shown in the info line; warning below ~60 DPI. Upscaling small images is allowed (it's the point of the tool), just made visible.

## Milestones

1. **Scaffold** — `index.html` + `styles.css` with the full static layout of both steps, preview area, and disabled Download button.
2. **Math** — `paper.js` + `layout.js` as pure functions, plus `node:test` coverage (A-size table, landscape swap, margins, grid counts, partial last row/column rects).
3. **Image input** — file picker, drag & drop, URL fetch with CORS error handling; loaded image reflected in the UI.
4. **Live preview** — grid overlay, empty-remainder rendering, info line with dimensions/sheets/DPI; re-render on every setting change.
5. **PDF export** — tile loop, progress state, filename, 100%-scale hint. Verify a printed pair of adjacent pages aligns when trimmed and butted.
6. **Polish** — input validation, low-DPI and sheet-cap warnings, error states, favicon, README update.

## Testing

- Unit tests (node:test) for `layout.js`/`paper.js` — the only non-trivial logic.
- Manual checklist: all three input paths; URL with and without CORS; portrait/landscape; A0 and A6; margin 0 and 10; width 1 and 20; extreme aspect ratios (panorama, tall scan); PDF page count, order, and page size; print-and-trim alignment test on 2 adjacent sheets.

## Future enhancements (not in v1)

- Overlap/glue flaps and crop marks for easier assembly.
- Tiny corner labels (`r2c3`) in the margin area, off by default.
- Paste image from clipboard.
- US paper sizes (Letter/Tabloid).
- PNG-per-page ZIP export as an alternative to PDF.
