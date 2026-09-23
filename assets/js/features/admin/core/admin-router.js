// SitePass STEP87 - admin section router facade
(function(){
  'use strict';

  function isAllowed(section){
    var permissions = window.SitePassAdminPermissions || null;
    if (!permissions || typeof permissions.canAccess !== 'function') {
      return false;
    }

    try {
      return permissions.canAccess(String(section || 'dashboard')) === true;
    } catch (e) {
      return false;
    }
  }

  function setSection(section){
    var key = String(section || 'dashboard');
    if (!isAllowed(key)) return false;

    var fn = window.sitePassSetAdminSectionV578;
    if (typeof fn !== 'function') return false;

    try { return fn(key); }
    catch (e) { return false; }
  }

  function renderSection(context){
    if (!isAllowed('dashboard')) return null;

    var fn = window.sitePassRenderAdminSectionV578;
    if (typeof fn !== 'function') return null;

    try { return fn(context || {}); }
    catch (e) { return null; }
  }

  window.SitePassAdminRouter = Object.freeze({
    isAllowed: isAllowed,
    setSection: setSection,
    renderSection: renderSection
  });
})();
