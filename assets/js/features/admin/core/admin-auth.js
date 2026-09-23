// SitePass STEP87 - admin auth facade
(function(){
  'use strict';

  function call(name, args, fallback){
    var fn = window[name];
    if (typeof fn !== 'function') return fallback;
    try { return fn.apply(window, args || []); }
    catch (e) {
      console.warn('[SitePass STEP87 admin-auth] ' + name + ' failed:', e);
      return fallback;
    }
  }

  var api = {
    isLoggedIn: function(){
      return call('isAdminLoggedIn', [], false) === true;
    },
    login: function(){
      var fn = window.adminLogin;
      if (typeof fn !== 'function') return Promise.resolve(false);
      try { return Promise.resolve(fn.apply(window, arguments)); }
      catch (e) { return Promise.reject(e); }
    },
    logout: function(){
      var fn = window.adminLogout;
      if (typeof fn !== 'function') return false;
      return fn.apply(window, arguments);
    },
    getRole: function(){
      if (!api.isLoggedIn()) return '';
      return String(call('getCurrentAdminRoleName', [], '') || '');
    },
    isSuperAdmin: function(){
      return call('isSuperAdminLoggedIn', [], false) === true;
    },
    verifySession: function(){
      var fn = window.sitePassVerifyExistingAdminSessionV561;
      if (typeof fn !== 'function') return Promise.resolve(false);
      try { return Promise.resolve(fn()); }
      catch (e) { return Promise.reject(e); }
    },
    snapshot: function(){
      return {
        loggedIn: api.isLoggedIn(),
        role: api.getRole(),
        superAdmin: api.isSuperAdmin()
      };
    }
  };

  window.SitePassAdminAuth = Object.freeze(api);
})();
