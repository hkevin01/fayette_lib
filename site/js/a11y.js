/**
 * Requirement ID: SPEC-A11Y-001
 * Purpose: provide accessibility controls for typography, contrast, readability,
 *          text-to-speech, and keyboard navigation guidance.
 * Rationale: maintain WCAG-friendly adjustments without external dependencies.
 * Inputs: user toggle actions, stored preferences, DOM availability.
 * Outputs: document-level accessibility state and screen-reader announcements.
 * Preconditions: script loaded after DOM and browser storage available (or fail-soft).
 * Postconditions: selected accessibility options persist and apply consistently.
 * Assumptions: CSS selectors for data attributes exist in style sheet.
 * Side Effects: updates localStorage and mutates html/body attributes/classes.
 * Failure Modes: blocked storage, missing toolbar mount point, CDN font unavailable.
 * Error Handling: silent fallback for storage failures and resilient DOM checks.
 * Constraints: must remain dependency-free and compatible with static delivery.
 * Verification: keyboard-only toggle test, reload persistence test, screen-reader announcements.
 * References: docs/FILE_LEVEL_SPECIFICATIONS.md (SPEC-A11Y-001)
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

  /* ── Text-to-Speech ──────────────────────────────────────────────────────
     Uses the Web Speech API (speechSynthesis) — no external dependencies.
     Reads the <main> area text aloud with pause / resume / stop support.
     Falls back gracefully on browsers without SpeechSynthesis support.
  ─────────────────────────────────────────────────────────────────────── */
  var TTS_SUPPORTED = 'speechSynthesis' in window;
  var _ttsState = 'idle'; // 'idle' | 'speaking' | 'paused'
  var _ttsChunkIndex = 0;
  var _ttsChunks = [];

  /* Extract human-readable text from the main content area */
  function ttsGetText() {
    var root = document.getElementById('main') ||
               document.querySelector('main') ||
               document.body;
    var clone = root.cloneNode(true);
    // Strip elements that should not be read aloud
    var noRead = [
      'script', 'style', 'noscript', 'svg',
      '[aria-hidden="true"]', '.sr-only', '.a11y-toolbar',
      '.skip-link', '.slider-dots', '.img-slider-track',
      '.slider-prev', '.slider-next', '#sliderDots'
    ];
    noRead.forEach(function (sel) {
      clone.querySelectorAll(sel).forEach(function (el) { el.remove(); });
    });
    var raw = (clone.textContent || clone.innerText || '').replace(/\s+/g, ' ').trim();
    return raw;
  }

  /* Split long text into sentence-boundary chunks (some browsers cut off long utterances) */
  function ttsChunkText(text) {
    var MAX = 200;
    var chunks = [];
    var remaining = text;
    while (remaining.length > MAX) {
      var cut = remaining.lastIndexOf('. ', MAX);
      if (cut < 40) cut = remaining.lastIndexOf(' ', MAX);
      if (cut < 40) cut = MAX;
      chunks.push(remaining.slice(0, cut + 1).trim());
      remaining = remaining.slice(cut + 1).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  /* Speak one chunk and chain to the next */
  function ttsSpeakChunk(prefs) {
    if (_ttsState === 'idle' || _ttsChunkIndex >= _ttsChunks.length) {
      if (_ttsChunkIndex >= _ttsChunks.length && _ttsState !== 'idle') {
        _ttsState = 'idle';
        updateTtsControls();
        announce('Finished reading page');
      }
      return;
    }
    var utt = new SpeechSynthesisUtterance(_ttsChunks[_ttsChunkIndex]);
    utt.rate = parseFloat(prefs.ttsRate) || 1.0;
    utt.lang = document.documentElement.getAttribute('lang') || 'en-US';
    utt.onend = function () {
      _ttsChunkIndex++;
      ttsSpeakChunk(prefs);
    };
    utt.onerror = function (e) {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        _ttsState = 'idle';
        updateTtsControls();
      }
    };
    window.speechSynthesis.speak(utt);
  }

  /* Start TTS from the beginning */
  function ttsStart(prefs) {
    if (!TTS_SUPPORTED) {
      announce('Text to speech is not supported in this browser');
      return;
    }
    window.speechSynthesis.cancel();
    var text = ttsGetText();
    if (!text) {
      announce('No content to read on this page');
      return;
    }
    _ttsChunks = ttsChunkText(text);
    _ttsChunkIndex = 0;
    _ttsState = 'speaking';
    updateTtsControls();
    announce('Reading page aloud. Press Pause to pause, Stop to stop.');
    ttsSpeakChunk(prefs);
  }

  /* Pause TTS */
  function ttsPause() {
    if (!TTS_SUPPORTED || _ttsState !== 'speaking') return;
    window.speechSynthesis.pause();
    _ttsState = 'paused';
    updateTtsControls();
    announce('Reading paused');
  }

  /* Resume TTS */
  function ttsResume() {
    if (!TTS_SUPPORTED || _ttsState !== 'paused') return;
    window.speechSynthesis.resume();
    _ttsState = 'speaking';
    updateTtsControls();
    announce('Resuming reading');
  }

  /* Stop TTS completely */
  function ttsStop() {
    if (!TTS_SUPPORTED) return;
    window.speechSynthesis.cancel();
    _ttsState = 'idle';
    _ttsChunks = [];
    _ttsChunkIndex = 0;
    updateTtsControls();
    announce('Reading stopped');
  }

  /* Update the TTS buttons to reflect current state */
  function updateTtsControls() {
    var btnRead = document.getElementById('a11yTtsRead');
    var btnStop = document.getElementById('a11yTtsStop');
    if (!btnRead) return;

    if (_ttsState === 'idle') {
      btnRead.innerHTML = '&#128266; Read';
      btnRead.setAttribute('aria-label', 'Read page aloud');
      btnRead.setAttribute('aria-pressed', 'false');
      btnRead.classList.remove('a11y-toggle--on');
      if (btnStop) { btnStop.style.display = 'none'; btnStop.setAttribute('aria-hidden', 'true'); }
    } else if (_ttsState === 'speaking') {
      btnRead.innerHTML = '&#9646;&#9646; Pause';
      btnRead.setAttribute('aria-label', 'Pause reading');
      btnRead.setAttribute('aria-pressed', 'true');
      btnRead.classList.add('a11y-toggle--on');
      if (btnStop) { btnStop.style.display = ''; btnStop.setAttribute('aria-hidden', 'false'); }
    } else if (_ttsState === 'paused') {
      btnRead.innerHTML = '&#9654; Resume';
      btnRead.setAttribute('aria-label', 'Resume reading');
      btnRead.setAttribute('aria-pressed', 'true');
      btnRead.classList.add('a11y-toggle--on');
      if (btnStop) { btnStop.style.display = ''; btnStop.setAttribute('aria-hidden', 'false'); }
    }
  }

  /* ── Keyboard Navigation Help Modal ──────────────────────────────────────
     An accessible dialog listing keyboard shortcuts and screen reader tips.
  ─────────────────────────────────────────────────────────────────────── */
  var _keysModalRemoveTrap = null;

  function buildKeysModal() {
    var modal = document.createElement('div');
    modal.id = 'fcplKeysModal';
    modal.className = 'fcpl-keys-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'keysModalTitle');
    modal.hidden = true;

    modal.innerHTML = [
      '<div class="fcpl-keys-modal-backdrop" id="keysModalBackdrop"></div>',
      '<div class="fcpl-keys-modal-box" role="document">',
      '  <div class="fcpl-keys-modal-header">',
      '    <h2 id="keysModalTitle" class="fcpl-keys-modal-title">&#9000; Keyboard &amp; Navigation Help</h2>',
      '    <button class="fcpl-keys-modal-close" id="keysModalClose" aria-label="Close keyboard help dialog">&#10005;</button>',
      '  </div>',
      '  <div class="fcpl-keys-modal-body">',

      '  <section class="fcpl-keys-section">',
      '    <h3>Basic Keyboard Navigation</h3>',
      '    <ul>',
      '      <li><kbd>Tab</kbd> — Move forward through links, buttons, and controls</li>',
      '      <li><kbd>Shift + Tab</kbd> — Move backward</li>',
      '      <li><kbd>Enter</kbd> or <kbd>Space</kbd> — Activate a focused button or link</li>',
      '      <li><kbd>Escape</kbd> — Close a dialog or dismiss a menu</li>',
      '      <li><kbd>Arrow keys</kbd> — Navigate within menus, sliders, and calendars</li>',
      '    </ul>',
      '  </section>',

      '  <section class="fcpl-keys-section">',
      '    <h3>Screen Reader Shortcuts (NVDA &amp; JAWS)</h3>',
      '    <ul>',
      '      <li><kbd>H</kbd> — Jump to next heading &nbsp;|&nbsp; <kbd>Shift+H</kbd> — Previous heading</li>',
      '      <li><kbd>1</kbd>–<kbd>6</kbd> — Jump to heading of that level</li>',
      '      <li><kbd>D</kbd> — Jump to next landmark/region</li>',
      '      <li><kbd>B</kbd> — Jump to next button</li>',
      '      <li><kbd>F</kbd> — Jump to next form field</li>',
      '      <li><kbd>L</kbd> — Jump to next list</li>',
      '      <li><kbd>T</kbd> — Jump to next table</li>',
      '      <li><kbd>G</kbd> — Jump to next graphic/image</li>',
      '      <li><kbd>Insert + F7</kbd> (JAWS) — List all links on the page</li>',
      '      <li><kbd>NVDA + F7</kbd> — Elements list (links, headings, landmarks)</li>',
      '    </ul>',
      '  </section>',

      '  <section class="fcpl-keys-section">',
      '    <h3>VoiceOver (macOS / iOS)</h3>',
      '    <ul>',
      '      <li><kbd>VO + U</kbd> — Open the Rotor (navigate by headings, links, landmarks)</li>',
      '      <li><kbd>VO + A</kbd> — Read from current position</li>',
      '      <li><kbd>VO + Space</kbd> — Activate focused item</li>',
      '      <li><kbd>VO + Arrow</kbd> — Move through content</li>',
      '    </ul>',
      '  </section>',

      '  <section class="fcpl-keys-section">',
      '    <h3>TalkBack (Android)</h3>',
      '    <ul>',
      '      <li>Swipe right/left — Move to next/previous item</li>',
      '      <li>Double tap — Activate focused item</li>',
      '      <li>Swipe up then down — Open local context menu</li>',
      '    </ul>',
      '  </section>',

      '  <section class="fcpl-keys-section">',
      '    <h3>This Site\'s Landmarks</h3>',
      '    <ul>',
      '      <li>&#11088; <strong>Accessibility toolbar</strong> — first focusable area at the top of every page; use Tab to reach it</li>',
      '      <li>&#128279; <strong>Skip to content</strong> — press Tab once on any page; then Enter to jump to main content</li>',
      '      <li>&#128209; <strong>Main navigation</strong> — landmark: <code>navigation</code></li>',
      '      <li>&#128196; <strong>Page content</strong> — landmark: <code>main</code></li>',
      '      <li>&#128712; <strong>Footer</strong> — landmark: <code>contentinfo</code></li>',
      '    </ul>',
      '  </section>',

      '  <section class="fcpl-keys-section">',
      '    <h3>Read Page Aloud (built-in)</h3>',
      '    <p>Use the <strong>&#128266; Read</strong> button in the accessibility toolbar at the top of the page to have the site read its content to you. Works in Chrome, Edge, Firefox, and Safari.</p>',
      '  </section>',

      '  </div>', // .fcpl-keys-modal-body
      '</div>'   // .fcpl-keys-modal-box
    ].join('\n');

    document.body.appendChild(modal);
    return modal;
  }

  function openKeysModal() {
    var modal = document.getElementById('fcplKeysModal') || buildKeysModal();
    modal.hidden = false;
    document.body.classList.add('fcpl-modal-open');
    if (window.fcplA11y && window.fcplA11y.trapFocus) {
      _keysModalRemoveTrap = window.fcplA11y.trapFocus(modal);
    }
    // Wire close button and backdrop
    var closeBtn = document.getElementById('keysModalClose');
    var backdrop = document.getElementById('keysModalBackdrop');
    if (closeBtn) closeBtn.onclick = closeKeysModal;
    if (backdrop) backdrop.onclick = closeKeysModal;

    modal.addEventListener('keydown', function modalKeydown(e) {
      if (e.key === 'Escape') {
        closeKeysModal();
        modal.removeEventListener('keydown', modalKeydown);
      }
    });
    announce('Keyboard navigation help dialog opened');
  }

  function closeKeysModal() {
    var modal = document.getElementById('fcplKeysModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('fcpl-modal-open');
    if (typeof _keysModalRemoveTrap === 'function') {
      _keysModalRemoveTrap();
      _keysModalRemoveTrap = null;
    }
    // Return focus to the Keys button
    var btn = document.getElementById('a11yKeysHelp');
    if (btn) btn.focus();
    announce('Keyboard help dialog closed');
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
    const ttsRate = prefs.ttsRate || '1';

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
        &#9680; Contrast
      </button>

      <button class="a11y-btn a11y-toggle ${dyslexiaOn ? 'a11y-toggle--on' : ''}"
              id="a11yDyslexia"
              aria-pressed="${dyslexiaOn}"
              aria-label="${dyslexiaOn ? 'Dyslexia font: on. Click to turn off' : 'Dyslexia font: off. Click to turn on'}"
              title="Toggle dyslexia-friendly font">
        Aa Dyslexia
      </button>

      <div class="a11y-group a11y-tts-group" role="group" aria-label="Read page aloud">
        <button class="a11y-btn a11y-toggle" id="a11yTtsRead"
                aria-pressed="false"
                aria-label="Read page aloud"
                title="Read page content aloud using text-to-speech">
          &#128266; Read
        </button>
        <button class="a11y-btn a11y-tts-stop" id="a11yTtsStop"
                aria-label="Stop reading"
                aria-hidden="true"
                title="Stop reading"
                style="display:none">
          &#9646; Stop
        </button>
      </div>

      <div class="a11y-group a11y-rate-group" role="group" aria-label="Reading speed">
        <label class="sr-only" for="a11yTtsRate">Reading speed</label>
        <select class="a11y-select" id="a11yTtsRate" title="Reading speed" aria-label="Reading speed">
          <option value="0.7"  ${ttsRate === '0.7'  ? 'selected' : ''}>Slow</option>
          <option value="1"    ${ttsRate === '1'    ? 'selected' : ''}>Normal</option>
          <option value="1.4"  ${ttsRate === '1.4'  ? 'selected' : ''}>Fast</option>
        </select>
      </div>

      <button class="a11y-btn" id="a11yKeysHelp"
              aria-label="Keyboard navigation help"
              aria-haspopup="dialog"
              title="Keyboard shortcuts and screen reader guide">
        &#9000; Keys
      </button>

      <button class="a11y-btn" id="a11yReset" aria-label="Reset all accessibility settings to default" title="Reset to defaults">
        &#8635; Reset
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
    const btnTtsRead  = document.getElementById('a11yTtsRead');
    const btnTtsStop  = document.getElementById('a11yTtsStop');
    const selRate     = document.getElementById('a11yTtsRate');
    const btnKeys     = document.getElementById('a11yKeysHelp');

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
        // Stop any active TTS
        ttsStop();
        // Reset rate selector
        if (selRate) selRate.value = '1';
        announce('Accessibility settings reset to defaults');
      });
    }

    /* ── TTS Read / Pause / Resume button ── */
    if (btnTtsRead) {
      btnTtsRead.addEventListener('click', () => {
        if (!TTS_SUPPORTED) {
          announce('Sorry, text-to-speech is not supported in this browser. Try Chrome, Edge, Firefox, or Safari.');
          return;
        }
        if (_ttsState === 'idle') {
          ttsStart(prefs);
        } else if (_ttsState === 'speaking') {
          ttsPause();
        } else if (_ttsState === 'paused') {
          ttsResume();
        }
      });
    }

    /* ── TTS Stop button ── */
    if (btnTtsStop) {
      btnTtsStop.addEventListener('click', () => {
        ttsStop();
      });
    }

    /* ── TTS rate selector ── */
    if (selRate) {
      // Apply saved rate immediately
      selRate.value = prefs.ttsRate || '1';
      selRate.addEventListener('change', () => {
        prefs.ttsRate = selRate.value;
        savePrefs(prefs);
        const rateLabels = { '0.7': 'Slow', '1': 'Normal', '1.4': 'Fast' };
        announce('Reading speed set to ' + (rateLabels[selRate.value] || selRate.value));
      });
    }

    /* ── Keyboard help modal button ── */
    if (btnKeys) {
      btnKeys.addEventListener('click', () => {
        openKeysModal();
      });
    }

    /* ── Stop TTS on page navigation (popstate / unload) ── */
    window.addEventListener('beforeunload', function () {
      if (_ttsState !== 'idle') ttsStop();
    });
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

    announce: announce,
    ttsStart: ttsStart,
    ttsStop: ttsStop,
    ttsPause: ttsPause,
    ttsResume: ttsResume,
    openKeysModal: openKeysModal,
    closeKeysModal: closeKeysModal
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
