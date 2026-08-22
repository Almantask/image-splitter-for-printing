# Changelog

All notable changes to **Map to Poster** are documented here.

---

## [v1.0.0] - Initial Release

**Live Deployment:** [https://almantask.github.io/image-splitter-for-printing/](https://almantask.github.io/image-splitter-for-printing/)

### Features
- **Map & Image Splitting**: Slice any map, photo, or artwork across a grid of standard ISO sheets (A0–A6) and export print-ready multi-page PDFs.
- **Multiple Image Sources**:
  - Drag and drop zone with interactive file browser.
  - Web URL loader with CORS error detection and user guidance.
  - Clipboard image paste (`Ctrl+V` / `Cmd+V`).
  - 1-click sample demo poster for instant testing.
- **Layout & Dimension Engine**:
  - Full ISO 216 paper format support (A0, A1, A2, A3, A4, A5, A6).
  - Portrait and Landscape orientation toggle.
  - Page margin adjustment (0–25 mm) with synchronized range slider and steppers.
  - Poster width control (1–20 sheets) with automated proportional height calculations.
  - Aspect ratio preservation and partial tile handling.
  - Effective print resolution (DPI) calculation with low-DPI warnings (<60 DPI) and sheet safety caps (>200 sheets).
- **Interactive Live Canvas Preview**:
  - Scaled-to-fit poster preview with high-DPR Retina support.
  - Numbered page order badges on each sheet.
  - Diagonal hatching for partial/uncovered remainder areas.
  - Viewport toolbar with Zoom In (+), Zoom Out (-), Fit Reset, and Guides/Badges toggles.
  - Interactive pointer hover inspection with sheet tooltips.
- **Print-Ready PDF Generation**:
  - Assembles multi-page PDFs in reading order using vendored `jsPDF`.
  - Offscreen canvas rendering capped at $\min(300\text{ DPI}, \text{source density})$.
  - Smooth progress bar updates during generation.
- **WCAG 2.1 AA Accessibility**:
  - Skip to main content link.
  - Full keyboard operability and visible focus rings.
  - ARIA live announcements for screen readers.
  - High-contrast color palette exceeding 4.5:1 / 7:1 ratios.
- **Modern User Experience**:
  - Dark mode and Light mode with persistent theme switcher.
  - Image summary card with auto-generated thumbnail and aspect ratio badge.
  - Quick poster size preset pills (2, 3, 4, 6 sheets).
  - In-app poster printing and assembly guide modal.
- **Automated CI/CD**:
  - GitHub Actions automated testing and deployment to GitHub Pages.
