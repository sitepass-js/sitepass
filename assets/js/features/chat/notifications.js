(function(global){
  'use strict';

  function api(){
    return global.SitePassChatFeatureBridgeV39 &&
      global.SitePassChatFeatureBridgeV39.notifications || null;
  }

  global.SitePassChatNotificationsV39 = Object.freeze({
    isReady: function(){
      var target = api();
      return !!target && typeof target.refresh === 'function';
    },

    refresh: function(force){
      var target = api();
      if (!target || typeof target.refresh !== 'function') return Promise.resolve(false);
      return Promise.resolve(target.refresh(!!force));
    },

    open: function(){
      var target = api();
      if (!target || typeof target.open !== 'function') return false;
      return target.open();
    },

    getUnread: function(){
      var target = api();
      if (!target || typeof target.unread !== 'function') return 0;
      return Number(target.unread() || 0);
    },

    getState: function(){
      var target = api();
      if (!target || typeof target.getState !== 'function') {
        return { ready:false, currentRoomId:'', open:false, loaded:false, unread:0 };
      }
      var state = target.getState() || {};
      return {
        ready:true,
        currentRoomId:String(state.currentRoomId || ''),
        open:!!state.open,
        loaded:!!state.loaded,
        unread:Number(state.unread || 0)
      };
    }
  });
})(window);
