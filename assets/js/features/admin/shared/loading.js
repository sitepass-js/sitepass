// SitePass STEP87 - isolated loading guard helper
(function(){
  'use strict';

  function create(){
    var busy = false;
    return Object.freeze({
      isLoading: function(){ return busy; },
      start: function(){
        if (busy) return false;
        busy = true;
        return true;
      },
      finish: function(){
        busy = false;
        return true;
      },
      run: async function(task){
        if (busy) return { skipped: true, reason: 'already_loading' };
        if (typeof task !== 'function') return { skipped: true, reason: 'task_required' };
        busy = true;
        try {
          return { skipped: false, value: await task() };
        } finally {
          busy = false;
        }
      }
    });
  }

  window.SitePassAdminLoading = Object.freeze({ create: create });
})();
