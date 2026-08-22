import { calculateLayout } from './layout.js';
import { loadImageFromFile, loadImageFromUrl, loadImageFromBlob } from './imageInput.js';
import { renderPreview, formatDimension, formatDpi, formatArea } from './preview.js';
import { exportToPdf } from './pdfExport.js';

// Application State
const state = {
  loadedImage: null,
  paperFormat: 'A4',
  orientation: 'portrait',
  marginMm: 0,
  sheetsWide: 3,
  isExporting: false,
  layout: null,
  
  // UX Interaction State
  theme: localStorage.getItem('image-splitter-theme') || 'dark',
  zoomLevel: 1.0,
  showGuides: true,
  showBadges: true,
  hoveredPageIndex: null,
  previewRenderInfo: null,
};

// DOM Elements Cache
const elements = {
  html: document.documentElement,
  srAnnouncer: document.getElementById('sr-announcer'),
  toastContainer: document.getElementById('toast-container'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  openGuideBtn: document.getElementById('open-guide-btn'),
  instructionLinkBtn: document.getElementById('instruction-link-btn'),
  guideModal: document.getElementById('guide-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modalGotItBtn: document.getElementById('modal-got-it-btn'),

  // Step 1 Elements
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  urlInput: document.getElementById('url-input'),
  loadUrlBtn: document.getElementById('load-url-btn'),
  loadSampleBtn: document.getElementById('load-sample-btn'),
  imageSummaryCard: document.getElementById('image-summary-card'),
  imageThumbnail: document.getElementById('image-thumbnail'),
  summaryFileName: document.getElementById('summary-file-name'),
  summaryAspectBadge: document.getElementById('summary-aspect-badge'),
  summaryDimensions: document.getElementById('summary-dimensions'),
  replaceImageBtn: document.getElementById('replace-image-btn'),
  clearImageBtn: document.getElementById('clear-image-btn'),
  imageMeta: document.getElementById('image-meta'),
  imageMetaText: document.getElementById('image-meta-text'),
  errorMessage: document.getElementById('error-message'),
  errorText: document.getElementById('error-text'),
  errorClose: document.getElementById('error-close'),
  
  // Step 2 Settings
  presetPills: document.querySelectorAll('.preset-pill'),
  paperFormatSelect: document.getElementById('paper-format'),
  paperDimHint: document.getElementById('paper-dim-hint'),
  orientationRadios: document.querySelectorAll('input[name="orientation"]'),
  marginSlider: document.getElementById('margin-slider'),
  marginInput: document.getElementById('margin-input'),
  marginDecBtn: document.getElementById('margin-dec'),
  marginIncBtn: document.getElementById('margin-inc'),
  marginTagBtns: document.querySelectorAll('.tag-btn[data-margin]'),
  sheetsWideSlider: document.getElementById('sheets-wide-slider'),
  sheetsWideInput: document.getElementById('sheets-wide-input'),
  sheetsWideDecBtn: document.getElementById('sheets-wide-dec'),
  sheetsWideIncBtn: document.getElementById('sheets-wide-inc'),
  computedGridSize: document.getElementById('computed-grid-size'),

  // Preview & Viewport Toolbar
  previewSection: document.getElementById('preview-section'),
  previewCanvas: document.getElementById('preview-canvas'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
  interactiveHint: document.getElementById('interactive-hint'),
  tileHoverTooltip: document.getElementById('tile-hover-tooltip'),
  tooltipPageTitle: document.getElementById('tooltip-page-title'),
  tooltipDetails: document.getElementById('tooltip-details'),
  toggleGuidesBtn: document.getElementById('toggle-guides-btn'),
  toggleBadgesBtn: document.getElementById('toggle-badges-btn'),
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  zoomResetBtn: document.getElementById('zoom-reset-btn'),

  // Metric Badges
  infoDimensions: document.getElementById('info-dimensions'),
  infoArea: document.getElementById('info-area'),
  infoSheetCount: document.getElementById('info-sheet-count'),
  infoDpi: document.getElementById('info-dpi'),
  dpiWarningBadge: document.getElementById('dpi-warning-badge'),
  sheetWarningBadge: document.getElementById('sheet-warning-badge'),

  // Export
  downloadBtn: document.getElementById('download-btn'),
  downloadBtnText: document.getElementById('download-btn-text'),
  downloadProgress: document.getElementById('download-progress'),
  progressBar: document.getElementById('progress-bar'),
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.25s ease-out';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Announces message to screen readers (WCAG 4.1.3).
 */
function announceToScreenReader(message) {
  if (elements.srAnnouncer) {
    elements.srAnnouncer.textContent = '';
    setTimeout(() => {
      elements.srAnnouncer.textContent = message;
    }, 50);
  }
}

/**
 * Displays error message banner.
 */
function showError(msg) {
  if (elements.errorText && elements.errorMessage) {
    elements.errorText.textContent = msg;
    elements.errorMessage.classList.remove('hidden');
    announceToScreenReader(`Error: ${msg}`);
  }
}

/**
 * Clears error banner.
 */
function clearError() {
  if (elements.errorMessage) {
    elements.errorMessage.classList.add('hidden');
    elements.errorText.textContent = '';
  }
}

/**
 * Calculates human friendly aspect ratio string (e.g. "16:9", "4:3", "1:1", "3:2").
 */
function getAspectRatioLabel(width, height) {
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9 Wide';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3 Standard';
  if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2 Photo';
  if (Math.abs(ratio - 1) < 0.05) return '1:1 Square';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16 Tall';
  if (ratio > 2.0) return 'Panorama';
  return `${width} × ${height}`;
}

/**
 * Theme Management
 */
function applyTheme(theme) {
  state.theme = theme;
  elements.html.setAttribute('data-theme', theme);
  localStorage.setItem('image-splitter-theme', theme);
  if (state.loadedImage && state.layout) {
    renderCanvas();
  }
}

/**
 * Renders the preview canvas with current view options.
 */
function renderCanvas() {
  if (!state.loadedImage || !elements.previewCanvas) return;
  state.previewRenderInfo = renderPreview(
    elements.previewCanvas,
    state.loadedImage.bitmap,
    state.layout,
    {
      zoomLevel: state.zoomLevel,
      showGuides: state.showGuides,
      showBadges: state.showBadges,
      hoveredPageIndex: state.hoveredPageIndex,
    }
  );
}

/**
 * Recalculates layout and updates all UI stats, presets, and canvas.
 */
function updateLayoutAndPreview(options = { announce: false }) {
  if (!state.loadedImage) {
    if (elements.previewPlaceholder) elements.previewPlaceholder.classList.remove('hidden');
    if (elements.previewCanvas) elements.previewCanvas.classList.add('hidden');
    if (elements.interactiveHint) elements.interactiveHint.classList.add('hidden');
    if (elements.downloadBtn) elements.downloadBtn.disabled = true;
    return;
  }

  // Calculate pure tiling layout
  state.layout = calculateLayout({
    imgWidth: state.loadedImage.width,
    imgHeight: state.loadedImage.height,
    paperFormat: state.paperFormat,
    orientation: state.orientation,
    marginMm: state.marginMm,
    sheetsWide: state.sheetsWide,
  });

  // Display canvas
  if (elements.previewPlaceholder) elements.previewPlaceholder.classList.add('hidden');
  if (elements.previewCanvas) {
    elements.previewCanvas.classList.remove('hidden');
    if (elements.interactiveHint) elements.interactiveHint.classList.remove('hidden');
    renderCanvas();

    elements.previewCanvas.setAttribute(
      'aria-label',
      `Visual preview: ${state.layout.totalSheets} sheets on ${state.layout.paperFormat} ${state.layout.orientation}, measuring ${formatDimension(state.layout.posterWidthMm)} by ${formatDimension(state.layout.posterHeightMm)}.`
    );
  }

  // Update info badges
  const {
    posterWidthMm,
    posterHeightMm,
    sheetsWide,
    sheetsTall,
    totalSheets,
    paperFormat,
    orientation,
    effectiveDpi,
    isLowDpi,
    isExceedingSheetCap,
  } = state.layout;

  const dimStr = `${formatDimension(posterWidthMm)} × ${formatDimension(posterHeightMm)}`;
  const areaStr = formatArea(posterWidthMm, posterHeightMm);
  const orientationName = orientation.charAt(0).toUpperCase() + orientation.slice(1);
  const sheetStr = `${sheetsWide} × ${sheetsTall} = ${totalSheets} sheets, ${paperFormat} ${orientationName}`;
  const dpiStr = formatDpi(effectiveDpi);

  if (elements.infoDimensions) elements.infoDimensions.textContent = dimStr;
  if (elements.infoArea) elements.infoArea.textContent = areaStr;
  if (elements.infoSheetCount) elements.infoSheetCount.textContent = sheetStr;
  if (elements.infoDpi) elements.infoDpi.textContent = dpiStr;
  if (elements.computedGridSize) elements.computedGridSize.textContent = `${sheetsWide} × ${sheetsTall} grid`;

  // Update input states
  if (elements.sheetsWideInput) elements.sheetsWideInput.value = sheetsWide;
  if (elements.sheetsWideSlider) elements.sheetsWideSlider.value = sheetsWide;
  if (elements.marginInput) elements.marginInput.value = state.marginMm;
  if (elements.marginSlider) elements.marginSlider.value = state.marginMm;

  if (elements.paperDimHint) {
    elements.paperDimHint.textContent = `${state.layout.paper.width} × ${state.layout.paper.height} mm`;
  }

  // Update preset pills active state
  elements.presetPills.forEach((pill) => {
    const pSheets = Number(pill.dataset.sheets);
    const pPaper = pill.dataset.paper;
    if (pSheets === state.sheetsWide && pPaper === state.paperFormat) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // Warnings
  if (elements.dpiWarningBadge) {
    if (isLowDpi) {
      elements.dpiWarningBadge.classList.remove('hidden');
      elements.dpiWarningBadge.textContent = 'Low print resolution (<60 DPI)';
    } else {
      elements.dpiWarningBadge.classList.add('hidden');
    }
  }

  if (elements.sheetWarningBadge) {
    if (isExceedingSheetCap) {
      elements.sheetWarningBadge.classList.remove('hidden');
      elements.sheetWarningBadge.textContent = `Warning: ${totalSheets} sheets exceeds safety cap (200)`;
    } else {
      elements.sheetWarningBadge.classList.add('hidden');
    }
  }

  // Download button state
  if (elements.downloadBtn && !state.isExporting) {
    elements.downloadBtn.disabled = isExceedingSheetCap;
  }

  if (options.announce) {
    let announcement = `Layout updated: ${sheetStr}, ${dimStr}, ${dpiStr}.`;
    if (isLowDpi) announcement += ' Warning: low print resolution.';
    if (isExceedingSheetCap) announcement += ' Error: exceeds maximum 200 sheets limit.';
    announceToScreenReader(announcement);
  }
}

/**
 * Handles loaded image data and generates miniature summary thumbnail.
 */
function handleImageLoaded(loadedImage) {
  clearError();
  if (state.loadedImage && state.loadedImage.bitmap) {
    state.loadedImage.bitmap.close();
  }
  state.loadedImage = loadedImage;

  // Create thumbnail canvas for image summary card
  const thumbCanvas = document.createElement('canvas');
  const thumbSize = 128;
  const aspect = loadedImage.width / loadedImage.height;
  thumbCanvas.width = aspect >= 1 ? thumbSize : Math.round(thumbSize * aspect);
  thumbCanvas.height = aspect >= 1 ? Math.round(thumbSize / aspect) : thumbSize;
  const tctx = thumbCanvas.getContext('2d');
  tctx.drawImage(loadedImage.bitmap, 0, 0, thumbCanvas.width, thumbCanvas.height);

  if (elements.imageThumbnail) {
    elements.imageThumbnail.src = thumbCanvas.toDataURL('image/png');
  }

  if (elements.summaryFileName) {
    elements.summaryFileName.textContent = loadedImage.fileName;
  }

  if (elements.summaryDimensions) {
    elements.summaryDimensions.textContent = `${loadedImage.originalWidth} × ${loadedImage.originalHeight} px`;
  }

  if (elements.summaryAspectBadge) {
    elements.summaryAspectBadge.textContent = getAspectRatioLabel(loadedImage.originalWidth, loadedImage.originalHeight);
  }

  // Swap Drop zone with Image summary card
  if (elements.dropZone) elements.dropZone.classList.add('hidden');
  if (elements.imageSummaryCard) elements.imageSummaryCard.classList.remove('hidden');

  updateLayoutAndPreview({ announce: false });

  showToast(`Loaded ${loadedImage.fileName} (${loadedImage.originalWidth}×${loadedImage.originalHeight}px)`, 'success');

  announceToScreenReader(
    `Image loaded: ${loadedImage.fileName}, ${loadedImage.originalWidth} by ${loadedImage.originalHeight} pixels. Poster layout calculated: ${state.layout.totalSheets} sheets.`
  );
}

/**
 * Clears current image and resets to drop state.
 */
function handleClearImage() {
  if (state.loadedImage && state.loadedImage.bitmap) {
    state.loadedImage.bitmap.close();
  }
  state.loadedImage = null;
  state.layout = null;

  if (elements.dropZone) elements.dropZone.classList.remove('hidden');
  if (elements.imageSummaryCard) elements.imageSummaryCard.classList.add('hidden');
  if (elements.previewPlaceholder) elements.previewPlaceholder.classList.remove('hidden');
  if (elements.previewCanvas) elements.previewCanvas.classList.add('hidden');
  if (elements.interactiveHint) elements.interactiveHint.classList.add('hidden');
  if (elements.downloadBtn) elements.downloadBtn.disabled = true;

  if (elements.infoDimensions) elements.infoDimensions.textContent = '0.0 cm × 0.0 cm';
  if (elements.infoArea) elements.infoArea.textContent = '0.00 m²';
  if (elements.infoSheetCount) elements.infoSheetCount.textContent = '0 sheets';
  if (elements.infoDpi) elements.infoDpi.textContent = '~0 DPI';

  showToast('Image cleared', 'info');
  announceToScreenReader('Image removed.');
}

/**
 * Loads default colorful demo image.
 */
function loadSampleImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 3000;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 3000, 2000);
  grad.addColorStop(0, '#3b82f6');
  grad.addColorStop(0.5, '#8b5cf6');
  grad.addColorStop(1, '#ec4899');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 3000, 2000);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(
      (i * 180 + 200) % 3000,
      ((i * 240 + 150) % 2000),
      120 + (i * 20),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 160px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POSTER ART DEMO', 1500, 900);

  ctx.font = '500 70px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('3000 × 2000 High-Res Artwork', 1500, 1100);

  canvas.toBlob((blob) => {
    if (blob) {
      loadImageFromBlob(blob, 'sample-poster.png')
        .then(handleImageLoaded)
        .catch((err) => showError(err.message));
    }
  }, 'image/png');
}

/**
 * Handles pointer hover inspection on preview canvas tiles.
 */
function handleCanvasPointerMove(e) {
  if (!state.previewRenderInfo || !elements.tileHoverTooltip || !state.layout) return;

  const rect = elements.previewCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const { tilesBounds } = state.previewRenderInfo;
  let hoveredTile = null;

  for (const tb of tilesBounds) {
    if (
      mouseX >= tb.x &&
      mouseX <= tb.x + tb.width &&
      mouseY >= tb.y &&
      mouseY <= tb.y + tb.height
    ) {
      hoveredTile = tb;
      break;
    }
  }

  if (hoveredTile) {
    if (state.hoveredPageIndex !== hoveredTile.pageNumber) {
      state.hoveredPageIndex = hoveredTile.pageNumber;
      renderCanvas();
    }

    elements.tileHoverTooltip.classList.remove('hidden');
    elements.tileHoverTooltip.style.left = `${e.clientX - elements.previewSection.getBoundingClientRect().left}px`;
    elements.tileHoverTooltip.style.top = `${e.clientY - elements.previewSection.getBoundingClientRect().top - 12}px`;

    if (elements.tooltipPageTitle) {
      elements.tooltipPageTitle.textContent = `Page ${hoveredTile.pageNumber} of ${state.layout.totalSheets}`;
    }
    if (elements.tooltipDetails) {
      const sliceInfo = hoveredTile.isPartial ? ' (Partial remainder)' : '';
      elements.tooltipDetails.textContent = `Row ${hoveredTile.row + 1}, Col ${hoveredTile.col + 1} • ${formatDimension(hoveredTile.destW)} × ${formatDimension(hoveredTile.destH)}${sliceInfo}`;
    }
  } else {
    if (state.hoveredPageIndex !== null) {
      state.hoveredPageIndex = null;
      renderCanvas();
    }
    elements.tileHoverTooltip.classList.add('hidden');
  }
}

/**
 * Initializes DOM event listeners.
 */
function setupEventListeners() {
  // Theme Toggle
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', () => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      showToast(`Switched to ${newTheme} mode`);
    });
  }

  // Print Guide Modal
  const openModal = () => {
    if (elements.guideModal && typeof elements.guideModal.showModal === 'function') {
      elements.guideModal.showModal();
    }
  };
  const closeModal = () => {
    if (elements.guideModal && typeof elements.guideModal.close === 'function') {
      elements.guideModal.close();
    }
  };

  if (elements.openGuideBtn) elements.openGuideBtn.addEventListener('click', openModal);
  if (elements.instructionLinkBtn) elements.instructionLinkBtn.addEventListener('click', openModal);
  if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeModal);
  if (elements.modalGotItBtn) elements.modalGotItBtn.addEventListener('click', closeModal);

  if (elements.guideModal) {
    elements.guideModal.addEventListener('click', (e) => {
      if (e.target === elements.guideModal) closeModal();
    });
  }

  // Drag & Drop & Keyboard Support on Drop Zone
  if (elements.dropZone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('drag-over');
      });
    });

    elements.dropZone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        try {
          const img = await loadImageFromFile(files[0]);
          handleImageLoaded(img);
        } catch (err) {
          showError(err.message);
        }
      }
    });

    elements.dropZone.addEventListener('click', (e) => {
      if (e.target !== elements.fileInput) {
        elements.fileInput.click();
      }
    });

    elements.dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elements.fileInput.click();
      }
    });
  }

  // File Picker
  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const img = await loadImageFromFile(file);
          handleImageLoaded(img);
        } catch (err) {
          showError(err.message);
        }
      }
      elements.fileInput.value = '';
    });
  }

  // Replace & Clear Buttons
  if (elements.replaceImageBtn) {
    elements.replaceImageBtn.addEventListener('click', () => {
      elements.fileInput.click();
    });
  }

  if (elements.clearImageBtn) {
    elements.clearImageBtn.addEventListener('click', handleClearImage);
  }

  // URL Input
  const handleUrlLoad = async () => {
    const url = elements.urlInput.value.trim();
    if (!url) {
      showError('Please enter an image URL');
      return;
    }
    elements.loadUrlBtn.disabled = true;
    elements.loadUrlBtn.textContent = 'Loading...';
    try {
      const img = await loadImageFromUrl(url);
      handleImageLoaded(img);
    } catch (err) {
      showError(err.message);
    } finally {
      elements.loadUrlBtn.disabled = false;
      elements.loadUrlBtn.textContent = 'Load';
    }
  };

  if (elements.loadUrlBtn) elements.loadUrlBtn.addEventListener('click', handleUrlLoad);
  if (elements.urlInput) {
    elements.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUrlLoad();
      }
    });
  }

  // Sample Demo Load
  if (elements.loadSampleBtn) elements.loadSampleBtn.addEventListener('click', loadSampleImage);

  // Global Paste
  window.addEventListener('paste', async (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'url') return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          try {
            const img = await loadImageFromBlob(blob, 'clipboard-image.png');
            handleImageLoaded(img);
          } catch (err) {
            showError(err.message);
          }
          break;
        }
      }
    }
  });

  // Presets Pills
  elements.presetPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const sheets = Number(pill.dataset.sheets) || 3;
      const paper = pill.dataset.paper || 'A4';
      state.sheetsWide = sheets;
      state.paperFormat = paper;
      if (elements.paperFormatSelect) elements.paperFormatSelect.value = paper;
      updateLayoutAndPreview({ announce: true });
      showToast(`Applied preset: ${sheets} sheets wide (${paper})`);
    });
  });

  // Settings: Paper Format
  if (elements.paperFormatSelect) {
    elements.paperFormatSelect.addEventListener('change', (e) => {
      state.paperFormat = e.target.value;
      updateLayoutAndPreview({ announce: true });
    });
  }

  // Settings: Orientation
  elements.orientationRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.orientation = e.target.value;
        updateLayoutAndPreview({ announce: true });
      }
    });
  });

  // Settings: Margin (Slider + Number input sync)
  const setMargin = (val) => {
    let num = Number(val);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 25) num = 25;
    state.marginMm = num;
    if (elements.marginInput) elements.marginInput.value = num;
    if (elements.marginSlider) elements.marginSlider.value = num;
    updateLayoutAndPreview({ announce: true });
  };

  if (elements.marginSlider) {
    elements.marginSlider.addEventListener('input', (e) => setMargin(e.target.value));
  }
  if (elements.marginInput) {
    elements.marginInput.addEventListener('input', (e) => setMargin(e.target.value));
    elements.marginInput.addEventListener('change', (e) => setMargin(e.target.value));
  }

  if (elements.marginDecBtn) {
    elements.marginDecBtn.addEventListener('click', () => {
      if (state.marginMm > 0) setMargin(state.marginMm - 1);
    });
  }
  if (elements.marginIncBtn) {
    elements.marginIncBtn.addEventListener('click', () => {
      if (state.marginMm < 25) setMargin(state.marginMm + 1);
    });
  }

  elements.marginTagBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.margin) || 0;
      setMargin(val);
      showToast(`Margin set to ${val}mm`);
    });
  });

  // Settings: Poster Width (Slider + Stepper sync)
  const setSheetsWide = (val) => {
    let num = Math.floor(Number(val));
    if (isNaN(num) || num < 1) num = 1;
    if (num > 20) num = 20;
    state.sheetsWide = num;
    if (elements.sheetsWideInput) elements.sheetsWideInput.value = num;
    if (elements.sheetsWideSlider) elements.sheetsWideSlider.value = num;
    updateLayoutAndPreview({ announce: true });
  };

  if (elements.sheetsWideSlider) {
    elements.sheetsWideSlider.addEventListener('input', (e) => setSheetsWide(e.target.value));
  }
  if (elements.sheetsWideInput) {
    elements.sheetsWideInput.addEventListener('input', (e) => setSheetsWide(e.target.value));
    elements.sheetsWideInput.addEventListener('change', (e) => setSheetsWide(e.target.value));
  }
  if (elements.sheetsWideDecBtn) {
    elements.sheetsWideDecBtn.addEventListener('click', () => {
      if (state.sheetsWide > 1) setSheetsWide(state.sheetsWide - 1);
    });
  }
  if (elements.sheetsWideIncBtn) {
    elements.sheetsWideIncBtn.addEventListener('click', () => {
      if (state.sheetsWide < 20) setSheetsWide(state.sheetsWide + 1);
    });
  }

  // Viewport Toolbar Controls
  if (elements.toggleGuidesBtn) {
    elements.toggleGuidesBtn.addEventListener('click', () => {
      state.showGuides = !state.showGuides;
      elements.toggleGuidesBtn.classList.toggle('active', state.showGuides);
      elements.toggleGuidesBtn.setAttribute('aria-pressed', state.showGuides);
      renderCanvas();
      showToast(state.showGuides ? 'Cut guides enabled' : 'Cut guides hidden');
    });
  }

  if (elements.toggleBadgesBtn) {
    elements.toggleBadgesBtn.addEventListener('click', () => {
      state.showBadges = !state.showBadges;
      elements.toggleBadgesBtn.classList.toggle('active', state.showBadges);
      elements.toggleBadgesBtn.setAttribute('aria-pressed', state.showBadges);
      renderCanvas();
      showToast(state.showBadges ? 'Page badges enabled' : 'Page badges hidden');
    });
  }

  if (elements.zoomInBtn) {
    elements.zoomInBtn.addEventListener('click', () => {
      if (state.zoomLevel < 3.0) {
        state.zoomLevel = Math.min(3.0, +(state.zoomLevel + 0.25).toFixed(2));
        renderCanvas();
      }
    });
  }

  if (elements.zoomOutBtn) {
    elements.zoomOutBtn.addEventListener('click', () => {
      if (state.zoomLevel > 0.5) {
        state.zoomLevel = Math.max(0.5, +(state.zoomLevel - 0.25).toFixed(2));
        renderCanvas();
      }
    });
  }

  if (elements.zoomResetBtn) {
    elements.zoomResetBtn.addEventListener('click', () => {
      state.zoomLevel = 1.0;
      renderCanvas();
      showToast('Zoom reset to fit');
    });
  }

  // Canvas Hover Inspection
  if (elements.previewCanvas) {
    elements.previewCanvas.addEventListener('mousemove', handleCanvasPointerMove);
    elements.previewCanvas.addEventListener('mouseleave', () => {
      if (state.hoveredPageIndex !== null) {
        state.hoveredPageIndex = null;
        renderCanvas();
      }
      if (elements.tileHoverTooltip) elements.tileHoverTooltip.classList.add('hidden');
    });
  }

  // Error Banner Close
  if (elements.errorClose) elements.errorClose.addEventListener('click', clearError);

  // Resize Listener
  window.addEventListener('resize', () => {
    if (state.loadedImage && state.layout) {
      renderCanvas();
    }
  });

  // Download PDF Action
  if (elements.downloadBtn) {
    elements.downloadBtn.addEventListener('click', async () => {
      if (!state.loadedImage || !state.layout || state.isExporting) return;

      state.isExporting = true;
      elements.downloadBtn.disabled = true;
      if (elements.downloadProgress) elements.downloadProgress.classList.remove('hidden');

      announceToScreenReader(`Starting PDF export of ${state.layout.totalSheets} pages...`);
      showToast('Generating print-ready PDF...');

      try {
        await exportToPdf(state.loadedImage.bitmap, state.layout, {
          onProgress: ({ current, total, percentage }) => {
            const statusText = `Building PDF: page ${current} of ${total} (${percentage}%)`;
            if (elements.downloadBtnText) {
              elements.downloadBtnText.textContent = `Building PDF (${current}/${total})...`;
            }
            if (elements.progressBar) {
              elements.progressBar.style.width = `${percentage}%`;
            }
            if (elements.downloadProgress) {
              elements.downloadProgress.setAttribute('aria-valuenow', percentage);
              elements.downloadProgress.setAttribute('aria-valuetext', statusText);
            }
          },
        });
        showToast('PDF ready and downloaded!', 'success');
        announceToScreenReader('PDF generation complete. Download started.');
      } catch (err) {
        showError(`PDF Generation Error: ${err.message}`);
      } finally {
        state.isExporting = false;
        if (elements.downloadBtnText) elements.downloadBtnText.textContent = 'Download Print-Ready PDF';
        if (elements.downloadProgress) elements.downloadProgress.classList.add('hidden');
        if (elements.progressBar) elements.progressBar.style.width = '0%';
        elements.downloadBtn.disabled = state.layout?.isExceedingSheetCap || false;
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  setupEventListeners();
  updateLayoutAndPreview();
});
