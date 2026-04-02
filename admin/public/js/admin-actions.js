/* Requirement ID: SPEC-UI-001
 * Purpose: delegated UI action dispatcher to replace inline onclick handlers.
 */
(function() {
  'use strict';

  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function init(resolve) {
    if (document.body.dataset.adminActionsBound) return;
    document.body.addEventListener('click', e => {
      const btn = e.target.closest('[data-admin-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-admin-action');
      if (!action) return;
      const api = resolve ? resolve() : {};

      switch (action) {
        case 'open-program-entry':
          return api.openProgramEntry && api.openProgramEntry(btn.getAttribute('data-key'), null);
        case 'save-adult-bookclub':
          return api.saveAdultBookClub && api.saveAdultBookClub();
        case 'save-library-chef':
          return api.saveLibraryChef && api.saveLibraryChef();
        case 'open-feature-modal': {
          const idxRaw = btn.getAttribute('data-idx');
          const idx = idxRaw == null ? null : toNumber(idxRaw);
          return api.openFeatureModal && api.openFeatureModal(idx);
        }
        case 'set-analytics-period':
          return api.setAnalyticsPeriod && api.setAnalyticsPeriod(btn.getAttribute('data-period'));
        case 'prune-analytics':
          return api.pruneAnalytics && api.pruneAnalytics();
        case 'clear-analytics':
          return api.clearAllAnalytics && api.clearAllAnalytics();
        case 'restart-service':
          return api.restartService && api.restartService();
        case 'download-backup':
          return api.downloadBackup && api.downloadBackup();
        case 'add-bookmobile-staff':
          return api.addBookmobileStaff && api.addBookmobileStaff();
        case 'add-branch-staff':
          return api.addBranchStaff && api.addBranchStaff();
        case 'open-img-upload':
          return api.openImgUpload && api.openImgUpload(btn.getAttribute('data-type'));
        case 'close-img-modal':
          return api.closeImgModal && api.closeImgModal();
        case 'submit-img-upload':
          return api.submitImgUpload && api.submitImgUpload();
        case 'open-job-modal': {
          const idxRaw = btn.getAttribute('data-idx');
          const idx = idxRaw == null ? null : toNumber(idxRaw);
          return api.openJobModal && api.openJobModal(idx);
        }
        case 'close-job-modal':
          return api.closeJobModal && api.closeJobModal();
        case 'save-job':
          return api.saveJob && api.saveJob();
        case 'close-feature-modal':
          return api.closeFeatureModal && api.closeFeatureModal();
        case 'save-feature':
          return api.saveFeature && api.saveFeature();
        case 'close-modal': {
          const id = btn.getAttribute('data-modal-id');
          const modal = id ? document.getElementById(id) : null;
          if (modal) modal.classList.remove('open');
          return;
        }
        case 'add-hours-row':
          return api.addHoursRow && api.addHoursRow();
        case 'remove-hours-row': {
          const rowId = toNumber(btn.getAttribute('data-row-id'));
          if (rowId == null) return;
          return api.removeHoursRow && api.removeHoursRow(rowId);
        }
        case 'save-branch':
          return api.saveBranch && api.saveBranch();
        case 'save-program-entry':
          return api.saveProgramEntry && api.saveProgramEntry();
        case 'save-resource':
          return api.saveResource && api.saveResource();
        case 'delete-feature': {
          const idx = toNumber(btn.getAttribute('data-idx'));
          if (idx == null) return;
          return api.deleteFeature && api.deleteFeature(idx);
        }
        case 'move-feature': {
          const idx = toNumber(btn.getAttribute('data-idx'));
          const dir = toNumber(btn.getAttribute('data-dir'));
          if (idx == null || dir == null) return;
          return api.moveFeature && api.moveFeature(idx, dir);
        }
        case 'delete-job': {
          const idx = toNumber(btn.getAttribute('data-idx'));
          if (idx == null) return;
          return api.deleteJob && api.deleteJob(idx);
        }
        case 'load-activity-log':
          return api.loadActivityLog && api.loadActivityLog();
        case 'load-backups':
          return api.loadBackups && api.loadBackups();
        case 'restore-backup': {
          const name = btn.getAttribute('data-backup');
          if (!name) return;
          return api.restoreBackup && api.restoreBackup(name);
        }
        default:
          return;
      }
    });

    document.body.dataset.adminActionsBound = '1';
  }

  window.FCPLAdminActions = { init };
})();
