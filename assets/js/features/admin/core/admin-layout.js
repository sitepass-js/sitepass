// SitePass STEP87 - admin layout facade
(function(){
  'use strict';

  function router(){
    return window.SitePassAdminRouter || null;
  }

  function canUseAdminLayout(){
    var value = router();
    if (!value || typeof value.isAllowed !== 'function') return false;
    try { return value.isAllowed('dashboard') === true; }
    catch (e) { return false; }
  }

  function renderTopNav(){
    if (!canUseAdminLayout()) return '';

    var fn = window.sitePassRenderAdminTopNavV578;
    if (typeof fn !== 'function') return '';

    try { return fn(); }
    catch (e) { return ''; }
  }

  function renderSection(context){
    if (!canUseAdminLayout()) return null;

    var value = router();
    if (!value || typeof value.renderSection !== 'function') return null;

    try { return value.renderSection(context || {}); }
    catch (e) { return null; }
  }

  function openSection(section){
    if (!canUseAdminLayout()) return false;

    var value = router();
    if (!value || typeof value.setSection !== 'function') return false;

    try { return value.setSection(section); }
    catch (e) { return false; }
  }

  window.SitePassAdminLayout = Object.freeze({
    renderTopNav: renderTopNav,
    renderSection: renderSection,
    openSection: openSection
  });
})();
