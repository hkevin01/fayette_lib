/**
 * FCPL Accessibility Toolbar — a11y.js
 * WCAG 2.1 AA compliant accessibility controls
 *
 * Features:
 *  - Font size toggle (normal / large / extra-large)
 *  - High contrast mode toggle
 *  - Dyslexia-friendly font toggle (OpenDyslexic / system sans)
 *  - Reduced motion preference support
 *  - Persistent preferences via localStorage
 *  - Screen reader announcements via aria-live
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'fcpl_a11y';
  const LIVE_REGION_ID = 'a11yLiveRegion';

  /* ── Load saved preferences ──────────────────────── */
  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }

  /* ── Announce changes to screen readers ─────────── */
  function announce(msg) {
    let region = document.getElementById(LIVE_REGION_ID);
    if (!region) {
      region = document.createElement('div');
      region.id = LIVE_REGION_ID;
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    // Clear then set to ensure screen readers re-announce
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = msg; });
  }

  /* ── Font size controls ───────────────────────────
     Three levels stored on <html> as data-font-size attribute.
     CSS targets: [data-font-size="lg"] and [data-font-size="xl"]
  */
  const FONT_SIZES = ['normal', 'lg', 'xl'];
  const FONT_LABELS = { normal: 'Normal text size', lg: 'Large text size', xl: 'Extra large text size' };

  function applyFontSize(size) {
    document.documentElement.setAttribute('data-font-size', size);
  }

  /* ── High contrast ────────────────────────────────
     Stored on <html> as data-high-contrast="on"
  */
  function applyHighContrast(on) {
    document.documentElement.setAttribute('data-high-contrast', on ? 'on' : 'off');
  }

  /* ── Dyslexia-friendly font ───────────────────────
     Loads OpenDyslexic from a CDN fallback; stored on <html>
  */
  function applyDyslexiaFont(on) {
    document.documentElement.setAttribute('data-dyslexia', on ? 'on' : 'off');
    if (on && !document.getElementById('dyslexicFontLink')) {
      const link = document.createElement('link');
      link.id = 'dyslexicFontLink';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.cdnfonts.com/css/opendyslexic';
      document.head.appendChild(link);
    }
  }

  /* ── Build the toolbar HTML ───────────────────────
     Injected into the <header> element after DOMContentLoaded
  */
  function buildToolbar(prefs) {
    const toolbar = document.createElement('div');
    toolbar.className = 'a11y-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Accessibility options');

    const currentSize = prefs.fontSize || 'normal';
    const hcOn = prefs.highContrast || false;
    const dyslexiaOn = prefs.dyslexia || false;

    toolbar.innerHTML = `
      <span class="a11y-label" aria-hidden="true">Accessibility:</span>

      <div class="a11y-group" role="group" aria-label="Text size">
        <button class="a11y-btn" id="a11yFontDecrease" aria-label="Decrease text size" title="Smaller text">A<sup>−</sup></button>
        <button class="a11y-btn a11y-btn--active-indicator" id="a11yFontCurrent" aria-label="Current text size: ${FONT_LABELS[currentSize]}" aria-live="polite" disabled>${currentSize === 'normal' ? 'A' : currentSize === 'lg' ? 'A+' : 'A++'}</button>
        <button class="a11y-btn" id="a11yFontIncrease" aria-label="Increase text size" title="Larger text">A<sup>+</sup></button>
      </div>

      <button class="a11y-btn a11y-toggle ${hcOn ? 'a11y-toggle--on' : ''}"
              id="a11yHighContrast"
              aria-pressed="${hcOn}"
              aria-label="${hcOn ? 'High contrast: on. Click to turn off' : 'High contrast: off. Click to turn on'}"
              title="Toggle high contrast">
        ◑ Contrast
      </button>

      <button class="a11y-btn a11y-toggle ${dyslexiaOn ? 'a11y-toggle--on' : ''}"
              id="a11yDyslexia"
              aria-pressed="${dyslexiaOn}"
              aria-label="${dyslexiaOn ? 'Dyslexia font: on. Click to turn off' : 'Dyslexia font: off. Click to turn on'}"
              title="Toggle dyslexia-friendly font">
        Aa Dyslexia
      </button>

      <button class="a11y-btn" id="a11yReset" aria-label="Reset all accessibility settings to default" title="Reset to defaults">
        ↺ Reset
      </button>
    `;

    return toolbar;
  }

  /* ── Wire up toolbar events ───────────────────────  */
  function wireToolbar(prefs) {
    const btnIncrease = document.getElementById('a11yFontIncrease');
    const btnDecrease = document.getElementById('a11yFontDecrease');
    const btnCurrent  = document.getElementById('a11yFontCurrent');
    const btnHC       = document.getElementById('a11yHighContrast');
    const btnDys      = document.getElementById('a11yDyslexia');
    const btnReset    = document.getElementById('a11yReset');

    function updateFontBtn(size) {
      if (!btnCurrent) return;
      const labels = { normal: 'A', lg: 'A+', xl: 'A++' };
      btnCurrent.textContent = labels[size];
      btnCurrent.setAttribute('aria-label', 'Current text size: ' + FONT_LABELS[size]);
    }

    if (btnIncrease) {
      btnIncrease.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-font-size') || 'normal';
        const idx = FONT_SIZES.indexOf(cur);
        const next = FONT_SIZES[Math.min(idx + 1, FONT_SIZES.length - 1)];
        applyFontSize(next);
        updateFontBtn(next);
        prefs.fontSize = next;
        savePrefs(prefs);
        announce(FONT_LABELS[next] + ' applied');
      });
    }

    if (btnDecrease) {
      btnDecrease.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-font-size') || 'normal';
        const idx = FONT_SIZES.indexOf(cur);
        const prev = FONT_SIZES[Math.max(idx - 1, 0)];
        applyFontSize(prev);
        updateFontBtn(prev);
        prefs.fontSize = prev;
        savePrefs(prefs);
        announce(FONT_LABELS[prev] + ' applied');
      });
    }

    if (btnHC) {
      btnHC.addEventListener('click', () => {
        const on = btnHC.getAttribute('aria-pressed') !== 'true';
        btnHC.setAttribute('aria-pressed', String(on));
        btnHC.classList.toggle('a11y-toggle--on', on);
        btnHC.setAttribute('aria-label', on ? 'High contrast: on. Click to turn off' : 'High contrast: off. Click to turn on');
        applyHighContrast(on);
        prefs.highContrast = on;
        savePrefs(prefs);
        announce(on ? 'High contrast mode enabled' : 'High contrast mode disabled');
      });
    }

    if (btnDys) {
      btnDys.addEventListener('click', () => {
        const on = btnDys.getAttribute('aria-pressed') !== 'true';
        btnDys.setAttribute('aria-pressed', String(on));
        btnDys.classList.toggle('a11y-toggle--on', on);
        btnDys.setAttribute('aria-label', on ? 'Dyslexia font: on. Click to turn off' : 'Dyslexia font: off. Click to turn on');
        applyDyslexiaFont(on);
        prefs.dyslexia = on;
        savePrefs(prefs);
        announce(on ? 'Dyslexia-friendly font enabled' : 'Default font restored');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        prefs = {};
        savePrefs(prefs);
        applyFontSize('normal');
        applyHighContrast(false);
        applyDyslexiaFont(false);
        updateFontBtn('normal');
        if (btnHC) { btnHC.setAttribute('aria-pressed', 'false'); btnHC.classList.remove('a11y-toggle--on'); }
        if (btnDys) { btnDys.setAttribute('aria-pressed', 'false'); btnDys.classList.remove('a11y-toggle--on'); }
        announce('Accessibility settings reset to defaults');
      });
    }
  }

  /* ── Inject toolbar into header ───────────────────
     We create a dedicated ".a11y-strip" row at the top of
     .site-header so the toolbar never competes with the logo /
     site title / hamburger button.  This keeps the main header
     row clean at all font sizes.
  */
  function injectToolbar() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const prefs = loadPrefs();

    // Apply saved preferences immediately (before paint)
    if (prefs.fontSize) applyFontSize(prefs.fontSize);
    if (prefs.highContrast) applyHighContrast(true);
    if (prefs.dyslexia) applyDyslexiaFont(true);

    const toolbar = buildToolbar(prefs);

    // Wrap toolbar in its own strip row and prepend to header
    const strip = document.createElement('div');
    strip.className = 'a11y-strip';
    strip.appendChild(toolbar);

    const headerInner = header.querySelector('.header-inner');
    if (headerInner) {
      header.insertBefore(strip, headerInner);
    } else {
      header.prepend(strip);
    }

    wireToolbar(prefs);
  }

  /* ── Respect prefers-reduced-motion ──────────────
     If the OS has reduced motion enabled, add class to html element
     so CSS can skip all transitions.
  */
  function checkReducedMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduce-motion');
    }
  }

  /* ── Focus trap utility for modals ───────────────
     Exported on window so calendar.js / main.js can call it.
  */
  window.fcplA11y = {
    trapFocus: function (modal) {
      const focusable = modal.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      function handler(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }

      modal.addEventListener('keydown', handler);
      first.focus();

      return function removeTrap() {
        modal.removeEventListener('keydown', handler);
      };
    },

    announce: announce
  };

  /* ── Init ─────────────────────────────────────────  */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      checkReducedMotion();
      injectToolbar();
    });
  } else {
    checkReducedMotion();
    injectToolbar();
  }

})();
