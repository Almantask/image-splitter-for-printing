# Map to Poster

[![Deploy to GitHub Pages](https://github.com/Almantask/image-splitter-for-printing/actions/workflows/deploy.yml/badge.svg)](https://github.com/Almantask/image-splitter-for-printing/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/Almantask/image-splitter-for-printing?color=blue)](https://github.com/Almantask/image-splitter-for-printing/releases)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> 🚀 **Live Application:** [https://almantask.github.io/image-splitter-for-printing/](https://almantask.github.io/image-splitter-for-printing/)

**Map to Poster** is a fast, client-side, single-page web application to split high-resolution maps, diagrams, and images across multiple standard paper sheets (A0–A6) and download print-ready multi-page PDFs.

Inspired by [rasterbator.net](https://rasterbator.net/), stripped to the essentials: load a map or image, choose paper and layout settings, see a live preview of the tiled poster with sheet boundaries and effective print DPI, and export a ready-to-print multi-page PDF.

<p align="center">
  <img src="docs/screenshots/layout-landscape-margin.jpg" alt="Map to Poster live preview: a battlemap tiled across a 3×3 landscape A4 grid with 10 mm trim margins, page numbers, and print DPI readout">
</p>
<p align="center"><em>Live tiled preview — landscape A4, 10 mm trim margins, numbered sheets, and print-quality warnings</em></p>

---

## Live Demo

Open the application directly in your browser with zero installation:  
👉 **[https://almantask.github.io/image-splitter-for-printing/](https://almantask.github.io/image-splitter-for-printing/)**

---

## Screenshots

### Upload, layout, and live preview

Drop a file, paste from the clipboard, load a URL, or click **Sample**. The left pane keeps map input and paper settings together; the right pane shows the poster grid, dimensions, sheet count, effective DPI, and a one-click PDF download.

<p align="center">
  <img src="docs/screenshots/preview-dark.jpg" alt="Dark-mode workspace after loading the sample battlemap: image summary card, A4 portrait layout, 3×2 sheet grid with remainder hatching, and a low-DPI warning">
</p>
<p align="center"><em>Dark mode with a loaded map — thumbnail summary, A4 portrait tiling, remainder hatching, and a low-resolution warning</em></p>

### Empty workspace

Before an image is loaded, the drop zone, URL field, paper controls, and empty preview are all visible on one page. Download stays disabled until a map is ready.

<p align="center">
  <img src="docs/screenshots/empty-dark.jpg" alt="Empty dark-mode workspace with drag-and-drop upload, URL loader, sample button, paper settings, and an empty live preview" width="48%">
  &nbsp;
  <img src="docs/screenshots/empty-light.jpg" alt="Empty light-mode workspace with the same upload and layout controls" width="48%">
</p>
<p align="center"><em>Empty state in dark and light themes — drag &amp; drop, URL load, built-in sample, and layout controls</em></p>

### Light mode

Theme preference is stored in the browser. Layout math, sheet badges, and remainder hatching stay the same in both themes.

<p align="center">
  <img src="docs/screenshots/preview-light.jpg" alt="Light-mode workspace with the sample battlemap tiled across six A4 portrait sheets">
</p>
<p align="center"><em>Light mode — same live preview, sheet badges, and download bar</em></p>

### Print & assembly guide

The in-app guide covers 100% scale printing, margin trimming, and left-to-right / top-to-bottom sheet order.

<p align="center">
  <img src="docs/screenshots/print-guide.jpg" alt="Poster Printing & Assembly Guide modal with three steps: print at actual size, trim margins, and assemble in reading order">
</p>
<p align="center"><em>Print Guide modal — actual-size printing, trim margins, assemble in reading order</em></p>

### Mobile layout

On narrower screens the controls stack above the preview so the same workflow works on a phone.

<p align="center">
  <img src="docs/screenshots/mobile-preview.jpg" alt="Mobile layout with stacked map input, layout settings, live preview, and download button" width="360">
</p>
<p align="center"><em>Stacked mobile layout</em></p>

---

## Features

- **Zero Server / 100% Client-Side**: All image/map manipulation and PDF generation happen directly inside your browser. No files are uploaded to any server.
- **Multiple Input Methods**:
  - Drag & drop maps and images onto the drop zone
  - Browse local files (`.jpg`, `.png`, `.webp`, `.gif`, `.bmp`, `.svg`)
  - Direct URL image loading with CORS error handling
  - Paste directly from clipboard (`Ctrl+V` / `Cmd+V`)
  - Instant built-in map demo sample
- **Image Summary Card**: Thumbnail, file name, pixel size, and aspect-ratio badge, plus Replace / Clear actions.
- **Comprehensive Layout Controls**:
  - Standard ISO 216 paper formats: **A0, A1, A2, A3, A4, A5, A6**
  - Orientation toggle: **Portrait** / **Landscape**
  - Custom page margins in millimeters (0–25 mm) with slider, steppers, and 0 / 5 / 10 mm quick tags
  - Poster width in sheets (1–20) with live auto-computed height and sheet count
- **Live Canvas Preview**:
  - Real-time scaled visualization of the tiled poster
  - Viewport toolbar with Zoom In (+), Zoom Out (−), Fit Reset, and Guides/Badges toggles
  - Interactive pointer hover inspection with sheet tooltips
  - Numbered page-order badges on each sheet
  - Diagonal hatching for partial/uncovered remainder areas
  - Live dimensional readout (cm / meters), total area in $m^2$, sheet count formula, and effective print DPI
  - Visual warning alerts for low print quality (<60 DPI) or large sheet volume (>200 sheets)
- **High-Quality PDF Export**:
  - One sheet per page in reading order (left-to-right, top-to-bottom)
  - Offscreen rendering capped at $\min(300\text{ DPI}, \text{native source density})$ to maximize print sharpness while keeping file size and memory bounded
  - Smooth animated progress bar during generation
  - Standard naming convention (`poster-3x2-A4.pdf`)
  - 100% scale print guidance
- **Accessibility & Design**:
  - **WCAG 2.1 AA Compliant**: Skip link, full keyboard operability, screen reader live announcements, and high-contrast colors.
  - **Dark & Light Mode**: Integrated theme switcher with persistent settings.
  - In-app poster printing and assembly guide modal.

---

## Quick Start

### Running Locally

Because the application uses native ES modules, serve it using any local static HTTP server:

```bash
# Using npm
npm start

# Or using npx serve directly
npx serve .

# Or using Python 3
python -m http.server 3000
```

Open `http://localhost:3000` in your web browser.

### Running Automated Tests

Pure layout and tiling mathematical formulas are verified using Node.js built-in test runner:

```bash
npm test
```

---

## File Structure

```
├── .github/
│   └── workflows/
│       ├── deploy.yml          # GitHub Pages CI/CD workflow
│       └── release.yml         # GitHub Release automated publisher
├── docs/
│   └── screenshots/            # README screenshots of current UI
├── index.html                  # Semantic single-page layout
├── styles.css                  # Modern design system & responsive styling
├── src/
│   ├── main.js                 # Application orchestration & DOM event wiring
│   ├── paper.js                # ISO A sizes (mm) & printable area math
│   ├── layout.js               # Pure tiling math, scale, DPI, and tile rects
│   ├── imageInput.js           # File, drop, paste, & URL image decoder (with CORS & EXIF)
│   ├── preview.js              # Live canvas renderer with hatching & page badges
│   └── pdfExport.js            # Multi-page PDF assembler using jsPDF
├── vendor/
│   └── jspdf.umd.min.js        # Vendored jsPDF UMD build
├── test/
│   └── layout.test.js          # Unit test suite for node:test
├── CHANGELOG.md                # Release notes and history
├── package.json
└── README.md
```

---

## Printing & Assembly Tips

1. Open the downloaded PDF in your preferred viewer (Chrome, Acrobat Reader, Preview, etc.).
2. In the Print dialog, select **Actual Size** or **100% Scale** (do **NOT** use "Fit to Printable Area" or "Shrink oversized pages").
3. Trim the margin borders if you specified a margin, or butt the pages together edge-to-edge.
4. Tape or mount the sheets in sequence using the page numbers.

---

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

---

## License

Apache-2.0 (Apache License, Version 2.0). See [LICENSE](LICENSE) for details.
