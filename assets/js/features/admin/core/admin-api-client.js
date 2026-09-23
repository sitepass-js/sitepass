// SitePass STEP87 - admin API adapter over the locked common API client
(function(){
  'use strict';

  function base(){
    return window.SitePassSupabaseApi || null;
  }

  function isAdminAuthenticated(){
    var auth = window.SitePassAdminAuth || null;
    if (!auth || typeof auth.isLoggedIn !== 'function') return false;
    try { return auth.isLoggedIn() === true; }
    catch (e) { return false; }
  }

  function unavailable(message){
    return { data: null, error: { message: message || 'SitePass 관리자 API 연결 없음' } };
  }

  function invoke(name, args){
    if (!isAdminAuthenticated()) {
      return Promise.resolve(unavailable('SitePass 관리자 인증 필요'));
    }

    var api = base();
    if (!api || typeof api[name] !== 'function') {
      return Promise.resolve(unavailable('SitePassSupabaseApi.' + name + ' 연결 없음'));
    }
    try { return Promise.resolve(api[name].apply(api, args || [])); }
    catch (e) { return Promise.resolve({ data: null, error: e }); }
  }

  window.SitePassAdminApi = Object.freeze({
    hasClient: function(){
      if (!isAdminAuthenticated()) return false;
      var api = base();
      return !!(api && typeof api.hasClient === 'function' && api.hasClient());
    },
    hasRpc: function(){
      if (!isAdminAuthenticated()) return false;
      var api = base();
      return !!(api && typeof api.hasRpc === 'function' && api.hasRpc());
    },
    getClient: function(){
      if (!isAdminAuthenticated()) return null;
      var api = base();
      return api && typeof api.getClient === 'function' ? api.getClient() : null;
    },
    rpc: function(name, params){
      return invoke('rpc', [name, params]);
    },
    select: function(table, columns, buildQuery){
      return invoke('select', [table, columns, buildQuery]);
    },
    upsert: function(table, row, options){
      return invoke('upsert', [table, row, options]);
    },
    update: function(table, values, buildQuery){
      return invoke('update', [table, values, buildQuery]);
    }
  });
})();
