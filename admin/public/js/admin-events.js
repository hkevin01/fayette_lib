/* Requirement ID: SPEC-UI-001
 * Purpose: reusable event form helpers for admin Events & Calendar workflow.
 */
(function() {
  'use strict';

  function buildPayload(formValues) {
    return {
      title: (formValues.title || '').trim(),
      start: formValues.start ? new Date(formValues.start).toISOString() : '',
      end: formValues.end ? new Date(formValues.end).toISOString() : '',
      location: formValues.location || '',
      category: formValues.category || 'general',
      description: formValues.description || '',
      recurrence: formValues.recurrence || 'none',
      recurrence_day: formValues.recurrence_day || '',
      image: formValues.image || undefined,
    };
  }

  function validatePayload(payload) {
    if (!payload.title) return 'Event title is required.';
    if (!payload.start) return 'Start date/time is required.';
    return '';
  }

  window.FCPLAdminEvents = {
    buildPayload,
    validatePayload,
  };
})();
