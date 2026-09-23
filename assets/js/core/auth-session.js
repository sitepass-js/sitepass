// SitePass v23.7.710 Step78 - common auth-session core
(function(){
  'use strict';

  var listeners = [];
  var authBound = false;
  var authSubscription = null;

  function getClient(){
    if (window.SitePassCoreSupabase && typeof window.SitePassCoreSupabase.getClient === 'function') {
      return window.SitePassCoreSupabase.getClient();
    }
    return window.sitepassSupabase || null;
  }

  async function getSession(){
    var client = getClient();
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return { data:{ session:null }, error:{ message:'SUPABASE_AUTH_CLIENT_UNAVAILABLE' } };
    }
    try {
      return await client.auth.getSession();
    } catch (e) {
      return { data:{ session:null }, error:e };
    }
  }

  async function getUser(){
    var client = getClient();
    if (!client || !client.auth || typeof client.auth.getUser !== 'function') {
      return { data:{ user:null }, error:{ message:'SUPABASE_AUTH_CLIENT_UNAVAILABLE' } };
    }
    try {
      return await client.auth.getUser();
    } catch (e) {
      return { data:{ user:null }, error:e };
    }
  }

  async function getUserId(){
    var result = await getSession();
    var user = result && result.data && result.data.session && result.data.session.user;
    return user && user.id ? String(user.id) : '';
  }

  async function getAccessToken(){
    var result = await getSession();
    return String(
      result && result.data && result.data.session &&
      result.data.session.access_token || ''
    );
  }

  function dispatch(event, session){
    listeners.slice().forEach(function(listener){
      try { listener(event, session); } catch (e) {
        try { console.warn('[SitePass Step78] auth listener failed', e); } catch(ignore) {}
      }
    });
  }

  function ensureBound(){
    if (authBound) return true;
    var client = getClient();
    if (!client || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return false;
    try {
      var result = client.auth.onAuthStateChange(function(event, session){
        dispatch(event, session);
      });
      authSubscription =
        result && result.data && result.data.subscription
          ? result.data.subscription
          : null;
      authBound = true;
      return true;
    } catch(e) {
      return false;
    }
  }

  function subscribe(listener){
    if (typeof listener !== 'function') return function(){};
    if (listeners.indexOf(listener) < 0) listeners.push(listener);
    ensureBound();
    return function(){
      var index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  function getState(){
    return {
      clientReady: !!getClient(),
      authBound: authBound,
      listenerCount: listeners.length,
      hasLowLevelSubscription: !!authSubscription
    };
  }

  window.SitePassAuthSession = Object.freeze({
    getClient:getClient,
    getSession:getSession,
    getUser:getUser,
    getUserId:getUserId,
    getAccessToken:getAccessToken,
    subscribe:subscribe,
    ensureBound:ensureBound,
    getState:getState
  });
})();
