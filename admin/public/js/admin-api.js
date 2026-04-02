/* Requirement ID: SPEC-UI-001
 * Purpose: shared API + UI utility helpers for admin modules.
 */
(function() {
  'use strict';

  function createApiContext(getToken) {
    function api(method, url, body, isForm) {
      const token = getToken();
      const opts = { method, headers: { Authorization: 'Bearer ' + token } };
      if (body && isForm) {
        opts.body = body;
      } else if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      return fetch('/admin' + url, opts).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    }

    return { api };
  }

  function toast(msg, ms) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, ms || 2800);
  }

  function showErr(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  }

  window.FCPLAdminApi = {
    createApiContext,
    toast,
    showErr,
  };
})();
