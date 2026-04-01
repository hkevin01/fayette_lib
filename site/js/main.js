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
      if (path.endsWith(href) || (href !== '#' && href !== '' && path.includes(href.replace('../', '')))) {
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
        renderAnnouncements();
      } catch(e) {
        console.error('Failed to render announcements:', e);
        const container = document.getElementById('announcements');
        if (container && container.parentElement) {
          container.parentElement.style.display = 'none';
        }
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

  /* ---- Hours Bar ---- */
  function renderHoursBar() {
    const bar = document.getElementById('hoursBar');
    if (!bar || !siteData) return;
    const branch = siteData.branches ? siteData.branches[0] : null;
    if (!branch) return;
    const now = new Date();
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const today = days[now.getDay()];
    const hours = branch.hours ? branch.hours[today] : null;
    if (hours && hours !== 'Closed') {
      bar.innerHTML = `<span class="open-badge">Open Today</span>
        <p><strong>${branch.name}</strong> is open <strong>${hours}</strong> today.</p>
        <a href="${pageBase()}locations.html" class="text-sm">View all locations →</a>`;
    } else {
      bar.innerHTML = `<span class="open-badge closed">Closed Today</span>
        <p><strong>${branch.name}</strong> is closed today.</p>
        <a href="${pageBase()}locations.html" class="text-sm">View all locations →</a>`;
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

    // Calendar: init if container present
    if (document.getElementById('calContainer') && typeof FCPLCalendar !== 'undefined') {
      FCPLCalendar.init('calContainer');
    }
  });
})();
