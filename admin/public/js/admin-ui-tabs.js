/* Requirement ID: SPEC-UI-001
 * Purpose: centralize tab activation/lazy-load behavior for the admin SPA.
 */
(function() {
  'use strict';

  function init(opts) {
    const cfg = opts || {};
    const defaultTab = cfg.defaultTab || 'events';
    const lazyLoadMap = cfg.lazyLoadMap || {};

    function activateTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === ('tab-' + tabName));
      });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        activateTab(tabName);
        if (typeof lazyLoadMap[tabName] === 'function') {
          lazyLoadMap[tabName]();
        }
      });
    });

    if (defaultTab) activateTab(defaultTab);
  }

  window.FCPLAdminTabs = { init };
})();
