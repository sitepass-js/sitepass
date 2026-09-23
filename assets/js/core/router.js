// SitePass v23.7.710 Step78 - common router facade
(function(){
  'use strict';

  function currentHash(){
    try { return String(window.location.hash || ''); } catch(e) { return ''; }
  }

  function replaceHash(hash){
    var value = String(hash || '');
    try {
      var base = window.location.pathname + window.location.search;
      window.history.replaceState(window.history.state || null, '', base + value);
      return true;
    } catch(e) { return false; }
  }

  function pushHash(hash){
    var value = String(hash || '');
    try {
      var base = window.location.pathname + window.location.search;
      window.history.pushState(window.history.state || null, '', base + value);
      return true;
    } catch(e) { return false; }
  }

  function subscribe(listener){
    if (typeof listener !== 'function') return function(){};
    var handler = function(){ try { listener(currentHash()); } catch(e) {} };
    window.addEventListener('hashchange', handler);
    return function(){ try { window.removeEventListener('hashchange', handler); } catch(e) {} };
  }

  window.SitePassCoreRouter = Object.freeze({
    currentHash:currentHash,
    replaceHash:replaceHash,
    pushHash:pushHash,
    subscribe:subscribe
  });
})();
