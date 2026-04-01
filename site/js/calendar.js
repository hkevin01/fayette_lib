/**
 * FCPL Calendar — pure JS, no dependencies
 * Reads events.json, renders month/list view,
 * ICS export, Google Calendar URL links
 */
const FCPLCalendar = (function() {
  'use strict';

  let events = [];
  let categories = {};
  let currentDate = new Date();
  let activeCategory = 'all';
  let activeView = 'month';
  let selectedEvent = null;
  let _removeTrap = null;
  let _lastFocused = null;
  let _quickMenuBound = false;

  /* ---- Helpers ---- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const pad = n => String(n).padStart(2, '0');

  function formatDate(d) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function formatTime(dateStr) {
    if (!dateStr || !dateStr.includes('T')) return '';
    const d = new Date(dateStr);
    let h = d.getHours(), m = d.getMinutes(), ampm = 'AM';
    if (h >= 12) { ampm = 'PM'; if (h > 12) h -= 12; }
    if (h === 0) h = 12;
    return `${h}:${pad(m)} ${ampm}`;
  }

  function toISOLocal(dateStr) {
    // Convert to format YYYYMMDDTHHMMSS
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}` +
           `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  /* ---- ICS Generation (RFC 5545) ---- */
  function makeICS(ev) {
    const uid = `fcpl-${ev.id}-${Date.now()}@fayette.lib.wv.us`;
    const now = toISOLocal(new Date().toISOString());
    const start = toISOLocal(ev.start);
    const end = toISOLocal(ev.end || ev.start);
    const summary = ev.title.replace(/,/g, '\\,').replace(/;/g, '\\;');
    const desc = (ev.description || '').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
    const loc = (ev.location || '').replace(/,/g, '\\,');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Fayette County Public Libraries//FCPL//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      desc ? `DESCRIPTION:${desc}` : '',
      loc ? `LOCATION:${loc}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }

  function downloadICS(ev) {
    const blob = new Blob([makeICS(ev)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fcpl-${ev.title.toLowerCase().replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---- Google Calendar URL (no API) ---- */
  function gcalURL(ev) {
    const enc = encodeURIComponent;
    const start = toISOLocal(ev.start);
    const end = toISOLocal(ev.end || ev.start);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE` +
           `&text=${enc(ev.title)}` +
           `&dates=${start}/${end}` +
           `&details=${enc(ev.description || '')}` +
           `&location=${enc(ev.location || '')}`;
  }

  /* ---- Outlook Calendar URL ---- */
  function outlookURL(ev) {
    const enc = encodeURIComponent;
    const startDate = new Date(ev.start);
    const endDate = new Date(ev.end || ev.start);
    const rfc3339Start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const rfc3339End = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${enc(ev.title)}` +
           `&startTime=${rfc3339Start}` +
           `&endTime=${rfc3339End}` +
           `&body=${enc(ev.description || '')}` +
           `&location=${enc(ev.location || '')}`;
  }

  /* ---- Yahoo Calendar URL ---- */
  function yahooURL(ev) {
    const enc = encodeURIComponent;
    const startDate = new Date(ev.start);
    const endDate = new Date(ev.end || ev.start);
    const startStr = `${startDate.getFullYear()}${pad(startDate.getMonth()+1)}${pad(startDate.getDate())}`;
    const endStr = `${endDate.getFullYear()}${pad(endDate.getMonth()+1)}${pad(endDate.getDate())}`;
    return `https://calendar.yahoo.com/?v=60&title=${enc(ev.title)}` +
           `&st=${startStr}&et=${endStr}` +
           `&desc=${enc(ev.description || '')}` +
           `&in_loc=${enc(ev.location || '')}`;
  }

  /* ---- Filter events ---- */
  function filteredEvents() {
    if (activeCategory === 'all') return events;
    return events.filter(e => e.category === activeCategory);
  }

  function eventsOnDate(dateStr) {
    return filteredEvents().filter(e => e.start.startsWith(dateStr));
  }

  /* ---- Modal ---- */
  function openModal(ev) {
    selectedEvent = ev;
    const overlay = $('#eventModalOverlay');
    if (!overlay) return;
    const cat = categories[ev.category] || { color: '#666', label: ev.category };
    overlay.querySelector('#modalTitle').textContent = ev.title;
    overlay.querySelector('#modalDate').textContent = `\u{1F4C5}  ${formatDate(new Date(ev.start))}`;
    overlay.querySelector('#modalTime').textContent = formatTime(ev.start) ?
      `\u{1F550}  ${formatTime(ev.start)}${ev.end ? ' \u2013 ' + formatTime(ev.end) : ''}` : '';
    overlay.querySelector('#modalLocation').textContent = ev.location ? `\u{1F4CD}  ${ev.location}` : '';
    overlay.querySelector('#modalDesc').textContent = ev.description || '';
    overlay.querySelector('#modalCat').textContent = cat.label || ev.category;
    overlay.querySelector('#modalCat').style.color = cat.color;
    overlay.querySelector('#gcalBtn').href = gcalURL(ev);

    // Show event image if available
    let imgEl = overlay.querySelector('#modalImage');
    if (!imgEl) {
      // Create img element and inject into modal body before meta section
      imgEl = document.createElement('img');
      imgEl.id = 'modalImage';
      imgEl.alt = '';
      imgEl.style.cssText = 'width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:1rem;display:none;';
      const modalBody = overlay.querySelector('.event-modal-body');
      if (modalBody) modalBody.insertBefore(imgEl, modalBody.firstChild);
    }
    if (ev.image) {
      imgEl.src = ev.image;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
      imgEl.src = '';
    }

    // Save focus so we can restore it when modal closes
    _lastFocused = document.activeElement;
    overlay.classList.add('open');
    // Apply focus trap via a11y.js if loaded
    if (window.fcplA11y && typeof window.fcplA11y.trapFocus === 'function') {
      const modal = overlay.querySelector('.event-modal');
      if (modal) _removeTrap = window.fcplA11y.trapFocus(modal);
    } else {
      const closeBtn = overlay.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus();
    }
  }

  function closeModal() {
    const overlay = $('#eventModalOverlay');
    if (overlay) overlay.classList.remove('open');
    if (_removeTrap) { _removeTrap(); _removeTrap = null; }
    if (_lastFocused && typeof _lastFocused.focus === 'function') {
      _lastFocused.focus();
      _lastFocused = null;
    }
  }

  /* ---- Month View ---- */
  function renderMonth() {
    const container = $('#calContainer');
    if (!container) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}-${pad(new Date().getDate())}`;

    let html = '<div class="cal-grid-header">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      html += `<span>${d}</span>`;
    });
    html += '</div><div class="cal-grid-body">';

    // Previous month filler
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="cal-day other-month"><div class="cal-day-num">${prevDays - i}</div></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
      const dayEvs = eventsOnDate(dateStr);
      const isToday = dateStr === todayStr;
      html += `<div class="cal-day${isToday ? ' today' : ''}" data-date="${dateStr}">`;
      html += `<div class="cal-day-num">${d}</div>`;
      dayEvs.slice(0, 2).forEach(ev => {
        const cat = categories[ev.category] || { color: '#999' };
        html += `<div class="cal-event-dot" role="button" tabindex="0"
          aria-label="${ev.title}${ev.location ? ', ' + ev.location : ''}"
          style="background:${cat.color}" data-id="${ev.id}">${ev.title}</div>`;
      });
      if (dayEvs.length > 2) html += `<div class="cal-more" role="button" tabindex="0"
        aria-label="${dayEvs.length - 2} more events on this date">+${dayEvs.length - 2} more</div>`;
      html += '</div>';
    }

    // Next month filler
    const totalCells = firstDay + daysInMonth;
    const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= trailing; i++) {
      html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
    }
    html += '</div>';

    container.innerHTML = `<div class="cal-grid">${html}</div>`;

    // Update header label
    const label = $('#calMonthLabel');
    if (label) label.textContent = `${monthNames[month]} ${year}`;

    // Events — click and keyboard activation
    $$('.cal-event-dot, .cal-more, .cal-day', container).forEach(el => {
      const activate = (e) => {
        e.stopPropagation();
        if (el.classList.contains('cal-event-dot')) {
          const id = el.dataset.id;
          const ev = events.find(x => String(x.id) === String(id));
          if (ev) openModal(ev);
        } else if (el.classList.contains('cal-day')) {
          const dateStr = el.dataset.date;
          const dayEvs = eventsOnDate(dateStr);
          if (dayEvs.length === 1) openModal(dayEvs[0]);
        }
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e); }
      });
    });
  }

  /* ---- List View ---- */
  function renderList() {
    const container = $('#calContainer');
    if (!container) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

    const label = $('#calMonthLabel');
    if (label) label.textContent = `${monthNames[month]} ${year}`;

    const monthEvs = filteredEvents().filter(e => {
      const d = new Date(e.start);
      return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));

    if (monthEvs.length === 0) {
      container.innerHTML = '<div class="cal-list"><p class="text-muted text-sm" style="padding:1rem">No events this month.</p></div>';
      return;
    }

    // Group by day
    const byDay = {};
    monthEvs.forEach(ev => {
      const key = ev.start.split('T')[0];
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(ev);
    });

    let html = '<div class="cal-list">';
    Object.keys(byDay).sort().forEach(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      html += `<div class="cal-list-day"><div class="cal-list-day-header">${formatDate(d)}</div>`;
      byDay[dateStr].forEach(ev => {
        const cat = categories[ev.category] || { color: '#999' };
        html += `<div class="cal-event-row" role="button" tabindex="0"
          aria-label="${ev.title}${ev.location ? ', ' + ev.location : ''}, ${formatTime(ev.start) || 'All day'}"
          data-id="${ev.id}">
          <div class="cal-event-time">${formatTime(ev.start) || 'All day'}</div>
          <div class="cal-event-bar" style="background:${cat.color}"></div>
          <div class="cal-event-info">
            <h4>${ev.title}</h4>
            <p>${ev.location || ''}</p>
          </div>
        </div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    $$('.cal-event-row', container).forEach(row => {
      const activate = () => {
        const ev = events.find(x => String(x.id) === row.dataset.id);
        if (ev) openModal(ev);
      };
      row.addEventListener('click', activate);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
  }

  /* ---- Legends & Filters ---- */
  function renderFilters() {
    const legendEl = $('#calLegend');
    const filterEl = $('#calFilter');
    if (!legendEl || !filterEl) return;

    let legendHtml = '';
    let filterHtml = '<button class="cal-filter-btn active" data-cat="all">All</button>';
    Object.entries(categories).forEach(([key, val]) => {
      legendHtml += `<div class="cal-legend-item">
        <div class="cal-legend-dot" style="background:${val.color}"></div>
        <span>${val.label}</span>
      </div>`;
      filterHtml += `<button class="cal-filter-btn" data-cat="${key}" style="--dot:${val.color}">${val.label}</button>`;
    });
    legendEl.innerHTML = legendHtml;
    filterEl.innerHTML = filterHtml;

    $$('.cal-filter-btn', filterEl).forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        $$('.cal-filter-btn', filterEl).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });
  }

  function render() {
    if (activeView === 'month') renderMonth();
    else renderList();
    renderQuickAdd();
  }

  function nextUpcomingEvents(limit) {
    const now = new Date();
    return filteredEvents()
      .filter(e => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, limit || 4);
  }

  function renderQuickAdd() {
    const container = $('#calContainer');
    if (!container || !container.parentElement) return;

    let quick = document.getElementById('calQuickAdd');
    if (!quick) {
      quick = document.createElement('div');
      quick.id = 'calQuickAdd';
      quick.style.cssText = 'margin-top:1rem;padding:.9rem;border:1px solid #dbe6f5;border-radius:10px;background:#f8fbff;';
      container.parentElement.appendChild(quick);
    }

    const items = nextUpcomingEvents(3);
    if (!items.length) {
      quick.innerHTML = '<strong style="display:block;margin-bottom:.4rem">Add to Your Calendar</strong><p style="margin:0;color:#4b5563;font-size:.9rem">No upcoming events in the feed yet.</p>';
      return;
    }

    quick.innerHTML = '<strong style="display:block;margin-bottom:.6rem">Add to Your Calendar</strong>' + items.map(ev => {
      const d = new Date(ev.start);
      return '<div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between;margin:.45rem 0;padding:.5rem 0;border-top:1px solid #e5e7eb">'
        + '<span style="min-width:220px;font-size:.9rem"><strong>' + ev.title + '</strong> • ' + d.toLocaleDateString() + '</span>'
        + '<details style="position:relative">'
        + '<summary class="ics-btn" style="cursor:pointer;list-style:none;font-size:.8rem;padding:.35rem .65rem">Add to Calendar</summary>'
        + '<div style="position:absolute;right:0;z-index:2500;min-width:190px;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.12);padding:.35rem;margin-top:.35rem">'
        + '<a href="' + gcalURL(ev) + '" target="_blank" rel="noopener" style="display:block;padding:.35rem .45rem;font-size:.85rem;text-decoration:none;color:#111827">Google Calendar</a>'
        + '<a href="' + outlookURL(ev) + '" target="_blank" rel="noopener" style="display:block;padding:.35rem .45rem;font-size:.85rem;text-decoration:none;color:#111827">Outlook</a>'
        + '<a href="' + yahooURL(ev) + '" target="_blank" rel="noopener" style="display:block;padding:.35rem .45rem;font-size:.85rem;text-decoration:none;color:#111827">Yahoo</a>'
        + '<button type="button" data-quick-ics="' + ev.id + '" style="display:block;width:100%;text-align:left;background:none;border:none;padding:.35rem .45rem;font-size:.85rem;color:#111827;cursor:pointer">Apple / iPhone (.ics)</button>'
        + '</div>'
        + '</details>'
        + '</div>';
    }).join('');

    quick.querySelectorAll('[data-quick-ics]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ev = events.find(e => String(e.id) === String(btn.getAttribute('data-quick-ics')));
        if (ev) downloadICS(ev);
      });
    });

    if (!_quickMenuBound) {
      document.addEventListener('click', e => {
        const root = document.getElementById('calQuickAdd');
        if (!root) return;
        root.querySelectorAll('details[open]').forEach(d => {
          if (!d.contains(e.target)) d.removeAttribute('open');
        });
      });
      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const root = document.getElementById('calQuickAdd');
        if (!root) return;
        root.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
      });
      _quickMenuBound = true;
    }
  }

  /* ---- Public Init ---- */
  async function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      let basePath = '';
      // detect if we are in /pages/ subfolder
      if (window.location.pathname.includes('/pages/')) basePath = '../';
      const resp = await fetch(basePath + 'data/events.json');
      
      // Check HTTP response status
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: Failed to fetch events`);
      
      const data = await resp.json();
      
      // Validate data structure
      if (!data || typeof data !== 'object') throw new Error('Invalid events data format');
      
      // Safely extract events array
      events = Array.isArray(data.events) ? data.events : [];
      
      // Validate and extract categories
      categories = {};
      if (Array.isArray(data.categories)) {
        data.categories.forEach(c => { 
          if (c && c.id) categories[c.id] = c; 
        });
      }
      
      // Filter out invalid events
      events = events.filter(e => e && e.id && e.title);
    } catch(e) {
      console.error('Failed to load events.json:', e);
      events = [];
      categories = {};
      
      // Show error message in the calendar container
      container.innerHTML = `
        <div style="padding:20px;background:#f8d7da;border:1px solid #f5c6cb;border-radius:6px;color:#721c24;">
          <h3 style="margin-top:0;">Unable to Load Events</h3>
          <p>We couldn't load the events calendar right now. Please try again later or contact us at <a href="tel:+13044650121" style="color:#721c24;text-decoration:underline;">304-465-0121</a>.</p>
        </div>`;
      return;
    }

    // Continue with rendering even if no events loaded
    try {
      renderFilters();
      render();
    } catch(renderErr) {
      console.error('Error rendering calendar:', renderErr);
      container.innerHTML = '<p style="color:#721c24;padding:20px;">Error displaying calendar. Please refresh the page.</p>';
      return;
    }

    // Nav buttons
    try {
      const prev = $('#calPrev'), next = $('#calNext');
      if (prev) prev.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        render();
      });
      if (next) next.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        render();
      });
    } catch(e) {
      console.warn('Error setting up calendar nav:', e);
    }

    // View tabs
    try {
      $$('.cal-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeView = btn.dataset.view;
          $$('.cal-view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          render();
        });
      });
    } catch(e) {
      console.warn('Error setting up view buttons:', e);
    }

    // Modal close handlers (single source of truth — calendar.js owns the modal)
    try {
      const overlay = $('#eventModalOverlay');
      if (overlay) {
        const closeBtn = overlay.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        
        // ICS Download
        const icsBtn = overlay.querySelector('#icsDownloadBtn');
        if (icsBtn) icsBtn.addEventListener('click', () => { if (selectedEvent) downloadICS(selectedEvent); });
        
        // Apple Calendar (uses ICS file)
        const appleBtn = overlay.querySelector('#appleCalendarBtn');
        if (appleBtn) appleBtn.addEventListener('click', () => { if (selectedEvent) downloadICS(selectedEvent); });
        
        // iPhone (uses ICS file)
        const iphoneBtn = overlay.querySelector('#iphoneBtn');
        if (iphoneBtn) iphoneBtn.addEventListener('click', () => { if (selectedEvent) downloadICS(selectedEvent); });
        
        // Outlook Calendar
        const outlookBtn = overlay.querySelector('#outlookBtn');
        if (outlookBtn) outlookBtn.addEventListener('click', () => {
          if (selectedEvent) {
            const url = outlookURL(selectedEvent);
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
        
        // Yahoo Calendar
        const yahooBtn = overlay.querySelector('#yahooBtn');
        if (yahooBtn) yahooBtn.addEventListener('click', () => {
          if (selectedEvent) {
            const url = yahooURL(selectedEvent);
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
      }
      // Global Escape key — close modal if open
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeModal();
      });
    } catch(e) {
      console.warn('Error setting up modal handlers:', e);
    }
  }

  return { init };
})();
