// SitePass STEP87 - admin-only element modal primitive
(function(){
  'use strict';

  function resolve(target){
    if (!target) return null;
    if (typeof target === 'string') return document.getElementById(target);
    return target && target.nodeType === 1 ? target : null;
  }

  function open(target){
    var el = resolve(target);
    if (!el) return false;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    return true;
  }

  function close(target){
    var el = resolve(target);
    if (!el) return false;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    return true;
  }

  function isOpen(target){
    var el = resolve(target);
    return !!(el && !el.hidden && el.getAttribute('aria-hidden') !== 'true');
  }

  window.SitePassAdminModal = Object.freeze({
    open: open,
    close: close,
    isOpen: isOpen
  });
})();
