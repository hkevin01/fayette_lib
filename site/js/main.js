/**
 * FCPL Main JS — loads content.json, renders nav, announcements, etc.
 */
(function() {
  'use strict';

  let siteData = null;

  /* ---- Storage Abstraction (Fallback for cookie-less browsers) ---- */
  const Storage = (function() {
    let _useLocalStorage = true;
    let _useSessionStorage = false;

    // Test if localStorage is available and writable
    function testLocalStorage() {
      try {
        const key = '__test__';
        localStorage.setItem(key, 'test');
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }

    // Test if sessionStorage is available
    function testSessionStorage() {
      try {
        const key = '__test__';
        sessionStorage.setItem(key, 'test');
        sessionStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }

    // Determine which storage to use
    if (!testLocalStorage()) {
      if (testSessionStorage()) {
        _useSessionStorage = true;
        console.log('[storage] localStorage blocked, falling back to sessionStorage');
      } else {
        console.warn('[storage] Both localStorage and sessionStorage blocked, using memory fallback');
      }
      _useLocalStorage = false;
    }

    const memoryStorage = {};

    return {
      getItem: function(key) {
        if (_useLocalStorage) return localStorage.getItem(key);
        if (_useSessionStorage) return sessionStorage.getItem(key);
        return memoryStorage[key] || null;
      },
      setItem: function(key, value) {
        try {
          if (_useLocalStorage) localStorage.setItem(key, value);
          else if (_useSessionStorage) sessionStorage.setItem(key, value);
          else memoryStorage[key] = value;
        } catch (e) {
          console.warn('[storage] Failed to store:', key, e.message);
        }
      },
      removeItem: function(key) {
        try {
          if (_useLocalStorage) localStorage.removeItem(key);
          else if (_useSessionStorage) sessionStorage.removeItem(key);
          else delete memoryStorage[key];
        } catch (e) {
          console.warn('[storage] Failed to remove:', key);
        }
      },
    };
  })();

  // Re-export as window.Storage for global access if needed
  window.FCPLStorage = Storage;


  /* ---- Path helpers ---- */
  const isSubpage = () => window.location.pathname.includes('/pages/');
  const basePath = () => isSubpage() ? '../' : '';
  const pageBase = () => isSubpage() ? '' : 'pages/';

  /* ---- Nav active state ---- */
  function setActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href && href !== '/' && href !== '#' && (path.endsWith(href) || path.includes(href.replace('../', '')))) {
        link.classList.add('active');
      }
    });
    // Always mark home active on root
    if (path === '/' || path.endsWith('index.html')) {
      const homeLink = document.querySelector('.nav-link[data-page="home"]');
      if (homeLink) homeLink.classList.add('active');
    }
  }

  /* ---- Mobile hamburger ---- */
  function initHamburger() {
    const btn = document.getElementById('hamburgerBtn');
    const nav = document.getElementById('siteNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('nav-open', !open);
    });
  }

  /* ---- Load and inject content ---- */
  async function loadContent() {
    try {
      const resp = await fetch(basePath() + 'data/content.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: Failed to fetch content`);
      siteData = await resp.json();
      
      if (!siteData || typeof siteData !== 'object') {
        throw new Error('Invalid content data format');
      }
      
      // Try to render each component, gracefully handling failures
      try {
        renderHeroQuote();
      } catch(e) {
        console.error('Failed to render hero quote:', e);
      }

      try {
        renderAnnouncements();
      } catch(e) {
        console.error('Failed to render announcements:', e);
        const container = document.getElementById('announcements');
        if (container && container.parentElement) {
          container.parentElement.style.display = 'none';
        }
      }

      try {
        renderFeatureBanners();
      } catch(e) {
        console.error('Failed to render feature banners:', e);
      }
      
      try {
        renderHoursBar();
      } catch(e) {
        console.error('Failed to render hours bar:', e);
        const bar = document.getElementById('hoursBar');
        if (bar) {
          bar.innerHTML = '<p class="error">Unable to load hours information. <a href="' + pageBase() + 'locations.html">View locations</a></p>';
        }
      }
      
      try {
        renderQuickLinks();
      } catch(e) {
        console.error('Failed to render quick links:', e);
        const container = document.getElementById('quickLinks');
        if (container) {
          container.innerHTML = '<p class="error" style="grid-column: 1/-1;">Unable to load quick links</p>';
        }
      }
      
      try {
        renderSidebarLinks();
      } catch(e) {
        console.error('Failed to render sidebar links:', e);
        const container = document.getElementById('sidebarLinks');
        if (container) {
          container.innerHTML = '<p class="error">Unable to load sidebar links</p>';
        }
      }
      
      try {
        renderEmailSubscribe();
      } catch(e) {
        console.error('Failed to render email subscribe:', e);
        const container = document.getElementById('emailSubscribe');
        if (container) {
          container.style.display = 'none';
        }
      }
    } catch(e) {
      console.error('Failed to load content.json:', e);
      // Show error message to user but keep page functional
      const mainContent = document.querySelector('main');
      if (mainContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-banner';
        errorDiv.innerHTML = '<p>⚠️ Some content failed to load. Please <a href="">refresh the page</a> or contact us at <a href="tel:+13044650121">304-465-0121</a>.</p>';
        errorDiv.style.cssText = 'background:#fff3cd;border:1px solid #ffc107;padding:12px;margin:12px;border-radius:6px;color:#664d03;';
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
      }
    }
  }

  /* ---- Hero Quote Strip ---- */
  function renderHeroQuote() {
    const strip = document.getElementById('heroQuoteStrip');
    const text  = document.getElementById('heroQuoteText');
    if (!strip || !text || !siteData) return;
    const site   = siteData.site || {};
    const quote  = site.tagline  || '';
    const author = site.tagline_author || '';
    if (!quote) return;
    text.innerHTML =
      '<span class="hero-quote-mark" aria-hidden="true">\u201c</span>' +
      quote +
      '<span class="hero-quote-mark" aria-hidden="true">\u201d</span>' +
      (author ? '<cite class="hero-quote-author">\u2014 ' + author + '</cite>' : '');
  }

  /* ---- Announcements ---- */
  function renderAnnouncements() {
    const container = document.getElementById('announcements');
    if (!container || !siteData) return;
    const list = siteData.announcements || [];
    if (!list.length) { container.parentElement.style.display = 'none'; return; }
    container.innerHTML = list.map(a => `
      <div class="announcement-item">
        <h3>${a.title}</h3>
        ${a.body ? `<p>${a.body}</p>` : ''}
        ${a.link ? `<a href="${a.link}" ${a.link.startsWith('http') ? 'target="_blank" rel="noopener"':''}>Learn more →</a>` : ''}
        ${a.date ? `<p class="meta">${a.date}</p>` : ''}
      </div>`).join('');
  }

  /* ---- Homepage Feature Banners ---- */
  function renderFeatureBanners() {
    const container = document.getElementById('featureBannersContainer');
    if (!container || !siteData) return;
    const features = siteData.homepage_features || [];
    if (!features.length) { container.style.display = 'none'; return; }

    const styleMap = {
      default: '',
      blue:    'background:linear-gradient(135deg,var(--blue-50,#dbeafe),var(--white,#fff));border-color:var(--blue-100,#bfdbfe)',
      green:   'background:linear-gradient(135deg,#dcfce7,var(--white,#fff));border-color:#bbf7d0',
      gold:    'background:linear-gradient(135deg,#fef3c7,var(--white,#fff));border-color:#fde68a',
      red:     'background:linear-gradient(135deg,#fee2e2,var(--white,#fff));border-color:#fecaca',
    };

    container.innerHTML = features.map(f => {
      const extraStyle = styleMap[f.style || 'default'] || '';
      const isExt = f.link && f.link.startsWith('http');
      const linkHtml = f.link
        ? `<a href="${f.link}"${isExt ? ' target="_blank" rel="noopener"' : ''}>${f.link_label || f.link}</a>`
        : '';
      return `
        <div class="feature-banner"${extraStyle ? ` style="${extraStyle}"` : ''}>
          <div class="feature-icon">${f.icon || '📌'}</div>
          <div>
            <h2>${f.title || ''}</h2>
            ${f.body ? `<p>${f.body}${linkHtml ? ' ' + linkHtml : ''}</p>` : (linkHtml ? `<p>${linkHtml}</p>` : '')}
          </div>
        </div>`;
    }).join('');
  }

  /* ---- Hours Bar ---- */
  function renderHoursBar() {
    const bar = document.getElementById('hoursBar');
    if (!bar || !siteData) return;
    // Use the main Oak Hill branch (id: oak-hill) or fall back to first branch
    const branches = siteData.branches || [];
    const branch = branches.find(b => b.id === 'oak-hill') || branches.find(b => b.id !== 'admin') || branches[0];
    if (!branch) return;

    const now = new Date();
    // Day abbreviations matching the "Mon–Fri", "Sat", "Sun" format in content.json
    const dayAbbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];

    // Find the hours entry whose "days" range covers today
    let openTime = null, closeTime = null, isClosedToday = false;
    const hoursList = Array.isArray(branch.hours) ? branch.hours : [];
    for (const entry of hoursList) {
      const days = entry.days || '';
      // Match ranges like "Mon–Fri", "Mon-Fri", single days "Sat", "Sun", "Sat–Sun"
      const parts = days.split(/[–\-]/).map(s => s.trim());
      const abbrs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const startIdx = abbrs.findIndex(a => parts[0].startsWith(a));
      const endIdx   = parts[1] ? abbrs.findIndex(a => parts[1].startsWith(a)) : startIdx;
      const todayIdx = now.getDay();
      const inRange  = startIdx !== -1 && (
        startIdx <= endIdx
          ? todayIdx >= startIdx && todayIdx <= endIdx
          : todayIdx >= startIdx || todayIdx <= endIdx  // wraps around (e.g. Fri–Sun)
      );
      if (inRange) {
        if (entry.open === 'Closed' || entry.close === 'Closed') {
          isClosedToday = true;
        } else {
          openTime  = entry.open;
          closeTime = entry.close;
        }
        break;
      }
    }

    const branchName = branch.name || 'Library';
    const locLink    = `<a href="${pageBase()}locations.html" class="text-sm">View all locations →</a>`;

    if (openTime && closeTime && !isClosedToday) {
      bar.innerHTML = `<span class="open-badge">Open Today</span>
        <p><strong>${branchName}</strong> is open <strong>${openTime} – ${closeTime}</strong> today.</p>
        ${locLink}`;
    } else {
      bar.innerHTML = `<span class="open-badge closed">Closed Today</span>
        <p><strong>${branchName}</strong> is closed today.</p>
        ${locLink}`;
    }
  }

  /* ---- Quick Links ---- */
  function renderQuickLinks() {
    const container = document.getElementById('quickLinks');
    if (!container) return;
    const links = [
      { icon: '📚', label: 'My Account', href: pageBase() + 'myaccount.html' },
      { icon: '🔍', label: 'Catalog', href: pageBase() + 'catalog.html' },
      { icon: '📱', label: 'Libby App', href: 'https://libbyapp.com/', ext: true },
      { icon: '🎵', label: 'Hoopla', href: 'https://www.hoopladigital.com/', ext: true },
      { icon: '📅', label: 'Programs', href: pageBase() + 'programs.html' },
      { icon: '📍', label: 'Locations', href: pageBase() + 'locations.html' },
      { icon: '🚌', label: 'Bookmobile', href: pageBase() + 'bookmobile.html' },
      { icon: '🏠', label: 'Homebound', href: pageBase() + 'homebound.html' },
    ];
    container.innerHTML = links.map(l => `
      <a class="quick-link-card" href="${l.href}" ${l.ext ? 'target="_blank" rel="noopener"' : ''}>
        <span class="ql-icon">${l.icon}</span>
        <span>${l.label}</span>
      </a>`).join('');
  }

  /* ---- Sidebar Links ---- */
  function renderSidebarLinks() {
    const container = document.getElementById('sidebarLinks');
    if (!container) return;
    const links = [
      { icon: '📰', label: 'New Materials', href: 'https://www.wowbrary.org/nu.aspx?p=WV_FCPL', ext: true },
      { icon: '📱', label: 'LibAnywhere Mobile', href: 'https://www.libanywhere.com/m/#1HKgRREtUrRu', ext: true },
      { icon: '📖', label: 'eBooks & Audiobooks', href: pageBase() + 'ebooks.html' },
      { icon: '🎓', label: 'Research & Homework', href: pageBase() + 'research.html' },
      { icon: '🚌', label: 'Bookmobile Schedule', href: pageBase() + 'bookmobile.html' },
      { icon: '💼', label: 'Jobs', href: pageBase() + 'jobs.html' },
    ];
    container.innerHTML = links.map(l => `
      <a class="sidebar-link" href="${l.href}" ${l.ext ? 'target="_blank" rel="noopener"' : ''}>
        <span class="sl-icon">${l.icon}</span>${l.label}
      </a>`).join('');
  }

  /* ---- Email Subscribe ---- */
  function renderEmailSubscribe() {
    const form = document.getElementById('subscribeForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = form.querySelector('input[type=email]').value.trim();
      if (!email) return;
      // Redirect to Wowbrary subscribe — no external API needed
      window.open(`https://www.wowbrary.org/nu.aspx?p=WV_FCPL`, '_blank', 'noopener');
      form.querySelector('input[type=email]').value = '';
      const msg = form.querySelector('.subscribe-msg');
      if (msg) { msg.textContent = 'Thank you! Redirecting to sign-up page...'; msg.style.display = 'block'; }
    });
  }

  /* ---- Branch Tabs — keyboard accessible + persistent ---- */
  function initBranchTabs() {
    const tabs = document.querySelectorAll('.branch-tab');
    if (!tabs.length) return;

    function activateTab(tab) {
      const target = tab.dataset.branch;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      document.querySelectorAll('.branch-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      const panel = document.getElementById('branch-' + target);
      if (panel) panel.classList.add('active');
      
      // Save to storage (localStorage, sessionStorage, or memory) for persistence
      try {
        Storage.setItem('fcpl_selected_branch', target);
      } catch(e) {
        console.warn('Could not save to storage:', e);
      }
      
      // Update URL hash for shareable links
      window.location.hash = target;
    }

    tabs.forEach((tab, i) => {
      tab.setAttribute('tabindex', i === 0 ? '0' : '-1');
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', e => {
        let idx = Array.from(tabs).indexOf(document.activeElement);
        if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(idx - 1 + tabs.length) % tabs.length].focus(); }
        if (e.key === 'Home')       { e.preventDefault(); tabs[0].focus(); }
        if (e.key === 'End')        { e.preventDefault(); tabs[tabs.length - 1].focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateTab(tab); }
      });
    });

    // Restore state: 1) from URL hash, 2) from localStorage, 3) default to first tab
    let selectedBranch = null;
    
    // Check URL hash first
    if (window.location.hash) {
      selectedBranch = window.location.hash.substring(1);
    }
    
    // Fall back to Storage (localStorage/sessionStorage/memory)
    if (!selectedBranch) {
      try {
        selectedBranch = Storage.getItem('fcpl_selected_branch');
      } catch(e) {
        console.warn('Could not read from storage:', e);
      }
    }
    
    // Find and activate the tab
    if (selectedBranch) {
      const tab = Array.from(tabs).find(t => t.dataset.branch === selectedBranch);
      if (tab) {
        activateTab(tab);
        return;
      }
    }
    
    // Default to first tab if nothing found
    if (tabs[0]) activateTab(tabs[0]);
    
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const tab = Array.from(tabs).find(t => t.dataset.branch === hash);
        if (tab) {
          // Don't call activateTab here to avoid infinite loop
          tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
            t.setAttribute('tabindex', '-1');
          });
          document.querySelectorAll('.branch-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          tab.setAttribute('tabindex', '0');
          const panel = document.getElementById('branch-' + hash);
          if (panel) panel.classList.add('active');
          try {
            Storage.setItem('fcpl_selected_branch', hash);
          } catch(e) {}
        }
      }
    });
  }

  /* ---- Program Tabs — keyboard accessible ---- */
  function initProgramTabs() {
    const tabs = document.querySelectorAll('.prog-tab');
    if (!tabs.length) return;

    function activateProgTab(tab) {
      const target = tab.dataset.prog;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      document.querySelectorAll('.prog-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      // Handle both prog- and arch- panel prefixes
      const panel = document.getElementById('prog-' + target) || document.getElementById('arch-' + target);
      if (panel) panel.classList.add('active');
    }

    tabs.forEach((tab, i) => {
      tab.setAttribute('tabindex', i === 0 ? '0' : '-1');
      tab.addEventListener('click', () => activateProgTab(tab));
      tab.addEventListener('keydown', e => {
        let idx = Array.from(tabs).indexOf(document.activeElement);
        if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(idx - 1 + tabs.length) % tabs.length].focus(); }
        if (e.key === 'Home')       { e.preventDefault(); tabs[0].focus(); }
        if (e.key === 'End')        { e.preventDefault(); tabs[tabs.length - 1].focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateProgTab(tab); }
      });
    });
    if (tabs[0]) activateProgTab(tabs[0]);
  }

  /* ---- Digital Resources (research + ebooks pages) ---- */
  async function renderResources(containerId, filterFn) {
    const container = document.getElementById(containerId);
    if (!container || !siteData) return;
    const all = siteData.digital_resources || [];
    const resources = filterFn ? all.filter(filterFn) : all;
    container.innerHTML = resources.map(r => `
      <a class="resource-card" href="${r.url}" target="_blank" rel="noopener">
        <h3>${r.name}</h3>
        <p>${r.description || ''}</p>
        <span>Visit →</span>
      </a>`).join('');
  }

  /* ---- Page Guidance Banners ---- */
  // Plain-language help banner injected at top of <main> on every page.
  // Elderly / first-time users see a clear explanation of what the page does.
  function injectPageGuide() {
    const main = document.getElementById('main');
    if (!main) return;

    const page = window.location.pathname;

    const guides = {
      'index':       { icon: '👋', title: 'Welcome to Fayette County Public Libraries!',
                       tips: ['Use the menu at the top to explore our pages.',
                              'Click "Programs & Events" to see upcoming events and the calendar.',
                              'Click "My Account" to renew books or check due dates.',
                'Need help? Use the orange "Call Us" button at the bottom of the screen.'] },
      'locations':   { icon: '📍', title: 'Finding Your Branch',
                       tips: ['Click one of the gray buttons below (Oak Hill, Fayetteville, etc.) to see that branch\'s hours, address, and map.',
                              'The highlighted button shows which branch you are currently viewing.',
                              'Click "Get Directions" to open a map — this will open in a new window.',
                              'Click any phone number to call that branch directly from your phone.'] },
      'programs':    { icon: '📅', title: 'Programs & Events Calendar',
                       tips: ['Click a colored tab (Children, Adults, Teens…) below to see programs for that group.',
                              'Use the calendar to see events — click any colored dot to get details.',
                              'Click "Add to Google Calendar" or "Download .ics" to save an event to your own calendar.',
                              'Use the Month / List buttons to switch how you view events.'] },
      'archives':    { icon: '🗂️', title: 'Using the Archives',
                       tips: ['Click a tab below (Microfilm, Yearbooks, Newspapers…) to browse that collection.',
                              'Most archive materials are at the Oak Hill Branch — please call before visiting.',
                              'Click any blue button to download a collection guide or contact us for help.',
                              'Need genealogy help? Ask a librarian — we love helping with family research!'] },
      'catalog':     { icon: '🔍', title: 'Searching the Library Catalog',
                       tips: ['Type a book title, author name, or topic into the search box and press Enter or click Search.',
                              'Select "Title", "Author", or "Subject" to narrow your search.',
                              'Click "Sign In to My Account" to renew books, place holds, or check fines.',
                              'Don\'t have a card yet? See the "Get a Library Card" section below — it\'s free!'] },
      'myaccount':   { icon: '👤', title: 'Your Library Account',
                       tips: ['Click "Sign In to My Account" to log in with your library card number and PIN.',
                              'Once logged in you can renew items, place holds on books, and see any fines.',
                              'Your PIN is usually the last 4 digits of your phone number.',
                              'Forgot your PIN or lost your card? Call any branch and we\'ll help you.'] },
      'ebooks':      { icon: '📱', title: 'Borrowing eBooks & Digital Media',
                       tips: ['All services on this page are FREE with your FCPL library card.',
                              'Click any service card to open it — it will open in a new window in your browser.',
                              'Libby is great for eBooks and audiobooks on your phone or tablet.',
                              'Hoopla has movies, music, and comics — no waitlist, borrow up to 10 items a month.'] },
      'research':    { icon: '📚', title: 'Research & Homework Databases',
                       tips: ['All databases on this page are FREE — no extra password needed, just your library card.',
                              'Click any card to open that database — it will open in a new window.',
                              'Not sure which to use? Call us at 304-465-0121 and a librarian will guide you.',
                              'Students: check the "Homework Help" section for school-focused resources.'] },
      'bookmobile':  { icon: '🚌', title: 'The FCPL Bookmobile',
                       tips: ['The Bookmobile visits schools and communities throughout Fayette County.',
                              'Scroll down to see the current schedule and stop locations.',
                              'Call 304-465-0121 to find out if the Bookmobile comes near you.',
                              'You can borrow books, DVDs, and more — just bring your library card.'] },
      'homebound':   { icon: '🏠', title: 'Homebound Delivery Service',
                       tips: ['If you are unable to visit a branch, we will deliver library materials to your home — FREE.',
                              'Fill out the request form below, or call 304-465-0121 to sign up.',
                              'Deliveries are made by library volunteers on a regular schedule.',
                              'Books, audiobooks, large-print books, and more are available for delivery.'] },
      'about':       { icon: 'ℹ️', title: 'About Fayette County Public Libraries',
                       tips: ['Learn about our mission, history, and the communities we serve.',
                              'Scroll down to find our branch locations, services we offer, and board information.',
                              'Have a question? See the FAQ section or call us at 304-465-0121.'] },
      'jobs':        { icon: '💼', title: 'Job Openings at FCPL',
                       tips: ['Current job openings are listed below.',
                              'Click "Apply Now" or the job title to see details and how to apply.',
                              'Questions about a position? Call 304-465-0121 or email us.'] },
      'news':        { icon: '📰', title: 'News & Announcements',
                       tips: ['This page has the latest news, announcements, and new materials from your library.',
                              'Sign up for email alerts below to get new materials updates sent to your inbox.',
                              'Have a question about any announcement? Call us at 304-465-0121.'] },
    };

    // Match page name
    let key = 'index';
    for (const k of Object.keys(guides)) {
      if (page.includes(k)) { key = k; break; }
    }

    const g = guides[key];
    if (!g) return;

    const el = document.createElement('div');
    el.className = 'page-guide';
    el.setAttribute('role', 'note');
    el.setAttribute('aria-label', 'Page guide: ' + g.title);
    el.innerHTML = `
      <div class="page-guide-icon" aria-hidden="true">${g.icon}</div>
      <div>
        <strong>${g.title}</strong>
        <ul>${g.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>`;

    // Insert after breadcrumb if present, else at top of main
    const breadcrumb = main.querySelector('.breadcrumb');
    const heading = main.querySelector('.page-heading');
    const anchor = breadcrumb || heading || main.firstElementChild;
    if (anchor && anchor.parentNode === main.querySelector('main')) {
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    } else {
      const mainEl = main.querySelector('main') || main;
      const firstChild = mainEl.firstElementChild;
      if (firstChild) mainEl.insertBefore(el, firstChild.nextSibling);
      else mainEl.appendChild(el);
    }
  }

  /* ---- Staff Login Link ---- */
  // Injects a small "Staff Login" link into the footer-bottom on every page.
  // Opens the admin portal at /admin/
  function injectStaffLink() {
    const fb = document.querySelector('.footer-bottom');
    if (!fb) return;
    const link = document.createElement('a');
    link.href = '/admin/';
    link.textContent = 'Staff Login';
    link.style.cssText = 'margin-left:.75rem; color:rgba(255,255,255,.35); font-size:.78rem;';
    link.setAttribute('aria-label', 'Staff login portal');
    fb.appendChild(document.createTextNode(' · '));
    fb.appendChild(link);
  }

  /* ---- New Materials Book Strip ---- */
  async function loadNewMaterials() {
    const container = document.getElementById('newMaterialsStrip');
    if (!container) return;

    const LT_URL = 'https://ltfl.librarything.com/forlibraries/run_ltfl_widget.php?lsa_id=7332&id=33235';
    const FALLBACK_HREF = 'https://mlnapp.raleigh.lib.wv.us/search~S16?/ftlistbib28%2C1%2C0%2C722/mode=2';

    try {
      const resp = await fetch(LT_URL);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const html = await resp.text();

      // Parse widget HTML for book entries
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const anchors = doc.querySelectorAll('li a.LTFL_Book');
      if (!anchors.length) throw new Error('no books found');

      const books = [];
      anchors.forEach(a => {
        const img = a.querySelector('img');
        if (!img || !img.src) return;
        const rawUrl = a.dataset.url || '';
        books.push({
          title:  a.dataset.title  || img.alt || 'New Book',
          author: a.dataset.author || '',
          img:    img.src,
          href:   rawUrl ? decodeURIComponent(rawUrl) : FALLBACK_HREF,
        });
      });
      if (!books.length) throw new Error('empty book list');

      // Pre-load every image so there are no layout shifts after scroll starts
      await Promise.allSettled(books.map(b => new Promise(res => {
        const i = new Image();
        i.onload = i.onerror = res;
        i.src = b.img;
        // Don't wait more than 4 s per image
        setTimeout(res, 4000);
      })));

      // Build the marquee — duplicate the list for a seamless infinite loop
      const makeItem = b =>
        `<a class="book-cover-item" href="${b.href}" target="_blank" rel="noopener noreferrer"
            title="${b.title.replace(/"/g, '&quot;')}${b.author ? ' — ' + b.author.replace(/"/g, '&quot;') : ''}">
          <img src="${b.img}" alt="${b.title.replace(/"/g, '&quot;')}" width="73" height="110" loading="eager">
        </a>`;

      const trackHtml = [...books, ...books].map(makeItem).join('');
      container.innerHTML = `<div class="book-strip-track" role="list">${trackHtml}</div>`;

      // Set scroll duration: ~1.4 s per book, minimum 60 s, maximum 180 s
      const dur = Math.min(180, Math.max(60, books.length * 1.4));
      container.querySelector('.book-strip-track').style.setProperty('--book-scroll-dur', dur + 's');
      container.querySelector('.book-strip-track').style.animationDuration = dur + 's';

    } catch (err) {
      console.warn('New materials strip failed, falling back to iframe:', err.message);
      container.innerHTML =
        `<iframe src="${LT_URL}"
          class="book-strip-iframe" title="Fayette County Public Libraries — New Materials"
          sandbox="allow-scripts allow-same-origin allow-popups"
          aria-label="Scrolling new materials book covers"></iframe>`;
    }
  }

  /* ---- DOMContentLoaded ---- */
  document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    initHamburger();
    initBranchTabs();
    initProgramTabs();
    injectPageGuide();
    injectStaffLink();

    /* ── Sticky nav: track header height so nav sticks right below it ── */
    function updateHeaderHeight() {
      const h = document.querySelector('.site-header');
      if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
    }
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    // Re-measure after a11y toolbar may have injected and reflowed
    setTimeout(updateHeaderHeight, 300);

    loadContent().then(() => {
      // Page-specific rendering after data loads
      const page = window.location.pathname;
      if (page.includes('research')) renderResources('resourceGrid', r => r.type !== 'ebooks');
      if (page.includes('ebooks')) renderResources('resourceGrid');
    });

    // New materials book strip — fires in parallel with loadContent
    if (document.getElementById('newMaterialsStrip')) {
      loadNewMaterials();
    }

    // Calendar: init if container present
    if (document.getElementById('calContainer') && typeof FCPLCalendar !== 'undefined') {
      FCPLCalendar.init('calContainer');
    }
  });
})();
