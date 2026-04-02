/* Requirement ID: SPEC-UI-001
 * Purpose: shared helpers for hosting state merge and status text.
 */
(function() {
  'use strict';

  function mergeHostingSources(defaults, saved, discovered) {
    return {
      ...(defaults || {}),
      ...(saved || {}),
      ...(discovered || {}),
    };
  }

  function buildStatus(host, discovered) {
    if (discovered && discovered.checked_at) {
      return {
        text: 'Live data synced from ' + host + ' at ' + new Date(discovered.checked_at).toLocaleString(),
        color: 'var(--green)',
      };
    }
    return {
      text: 'Loaded saved hosting values. Live probe unavailable right now.',
      color: 'var(--gold)',
    };
  }

  window.FCPLAdminHosting = {
    mergeHostingSources,
    buildStatus,
  };
})();
