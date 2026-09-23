(function(global){
  'use strict';

  function api(){
    return global.SitePassRealtimeV664 || null;
  }

  global.SitePassChatRealtimeV39 = Object.freeze({
    isReady: function(){
      var target = api();
      return !!target &&
        typeof target.start === 'function' &&
        typeof target.stop === 'function';
    },

    start: function(force){
      var target = api();
      if (!target || typeof target.start !== 'function') return Promise.resolve(false);
      return Promise.resolve(target.start(!!force));
    },

    stop: function(){
      var target = api();
      if (!target || typeof target.stop !== 'function') return false;
      return target.stop();
    },

    getState: function(){
      var target = api();
      if (!target || typeof target.getState !== 'function') {
        return { ready:false, connected:false, channelKey:'', status:'idle', generation:0, pendingTopics:[] };
      }
      var state = target.getState() || {};
      return {
        ready:true,
        connected:!!state.connected,
        channelKey:String(state.channelKey || ''),
        status:String(state.status || 'idle'),
        generation:Number(state.generation || 0),
        pendingTopics:Array.isArray(state.pendingTopics) ? state.pendingTopics.slice() : []
      };
    },

    emitForTest: function(topic, payload){
      var target = api();
      if (!target || typeof target.emitForTest !== 'function') return false;
      return target.emitForTest(topic, payload);
    }
  });
})(window);
