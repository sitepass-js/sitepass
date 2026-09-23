// SitePass STEP87 - admin UI permission facade
(function(){
  'use strict';

  var COMMON_SECTIONS = Object.freeze([
    'dashboard','members','equipment','shares',
    'contacts','payments','push','errors'
  ]);
  var SUPER_ONLY_SECTIONS = Object.freeze([
    'admins','settings','audit'
  ]);

  function isLoggedIn(){
    if (window.SitePassAdminAuth &&
        typeof window.SitePassAdminAuth.isLoggedIn === 'function') {
      return window.SitePassAdminAuth.isLoggedIn() === true;
    }
    var fn = window.isAdminLoggedIn;
    return typeof fn === 'function' && fn() === true;
  }

  function canAccess(section){
    if (!isLoggedIn()) return false;
    var fn = window.sitePassAdminSectionAllowedV578;
    if (typeof fn !== 'function') return false;
    try { return fn(String(section || 'dashboard')) === true; }
    catch (e) {
      console.warn('[SitePass STEP87 permissions] check failed:', e);
      return false;
    }
  }

  function getRole(){
    if (window.SitePassAdminAuth && typeof window.SitePassAdminAuth.getRole === 'function') {
      return window.SitePassAdminAuth.getRole();
    }
    var fn = window.getCurrentAdminRoleName;
    return typeof fn === 'function' ? String(fn() || '') : '';
  }

  function isSuperAdmin(){
    if (window.SitePassAdminAuth && typeof window.SitePassAdminAuth.isSuperAdmin === 'function') {
      return window.SitePassAdminAuth.isSuperAdmin() === true;
    }
    var fn = window.isSuperAdminLoggedIn;
    return typeof fn === 'function' && fn() === true;
  }

  window.SitePassAdminPermissions = Object.freeze({
    COMMON_SECTIONS: COMMON_SECTIONS,
    SUPER_ONLY_SECTIONS: SUPER_ONLY_SECTIONS,
    canAccess: canAccess,
    getRole: getRole,
    isSuperAdmin: isSuperAdmin
  });
})();
