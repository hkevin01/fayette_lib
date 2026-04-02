/* Requirement ID: SPEC-UI-001
 * Purpose: auth/session bootstrap and startup orchestration for admin SPA.
 */
(function() {
  'use strict';

  function init(opts) {
    const cfg = opts || {};
    const loginForm = document.getElementById(cfg.loginFormId || 'loginForm');
    const passwordInput = document.getElementById(cfg.passwordInputId || 'staffPassword');
    const loginErrId = cfg.loginErrId || 'loginErr';
    const loginScreen = document.getElementById(cfg.loginScreenId || 'loginScreen');
    const appShell = document.getElementById(cfg.appShellId || 'appShell');
    const logoutBtn = document.getElementById(cfg.logoutBtnId || 'logoutBtn');
    const storageKey = cfg.storageKey || 'fcpl_staff_token';

    function showAuthedUI() {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appShell) appShell.style.display = 'flex';
    }

    function showLoggedOutUI() {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appShell) appShell.style.display = 'none';
    }

    async function tryResumeSession() {
      const token = sessionStorage.getItem(storageKey) || '';
      if (!token) return;
      if (typeof cfg.setToken === 'function') cfg.setToken(token);
      try {
        const res = await fetch('/admin/api/events', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) {
          showAuthedUI();
          if (typeof cfg.onAuthenticated === 'function') cfg.onAuthenticated();
          return;
        }
      } catch (_) {}
      if (typeof cfg.setToken === 'function') cfg.setToken('');
      sessionStorage.removeItem(storageKey);
      showLoggedOutUI();
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (typeof cfg.showErr === 'function') cfg.showErr(loginErrId, '');
        try {
          const pw = passwordInput ? passwordInput.value : '';
          const res = await fetch('/admin/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');
          if (typeof cfg.setToken === 'function') cfg.setToken(data.token || '');
          sessionStorage.setItem(storageKey, data.token || '');
          showAuthedUI();
          if (typeof cfg.onAuthenticated === 'function') cfg.onAuthenticated();
        } catch (_) {
          if (typeof cfg.showErr === 'function') {
            cfg.showErr(loginErrId, 'Incorrect password. Please try again.');
          }
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof cfg.setToken === 'function') cfg.setToken('');
        sessionStorage.removeItem(storageKey);
        showLoggedOutUI();
      });
    }

    tryResumeSession();
  }

  window.FCPLAdminAuth = { init };
})();
