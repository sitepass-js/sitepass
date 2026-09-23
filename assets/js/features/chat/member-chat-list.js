(function(global){
  'use strict';

  function api(){
    return global.SitePassMemberLinkChatV566 || null;
  }

  function call(name, args, fallback){
    var target = api();
    var fn = target && target[name];
    if (typeof fn !== 'function') return fallback;
    return fn.apply(target, args || []);
  }

  global.SitePassMemberChatListV39 = Object.freeze({
    isReady: function(){
      var target = api();
      return !!target &&
        typeof target.refresh === 'function' &&
        typeof target.openRoom === 'function';
    },

    refresh: function(force){
      return Promise.resolve(call('refresh', [!!force], false));
    },

    openRoom: function(roomId){
      roomId = String(roomId || '');
      if (!roomId) return false;
      return call('openRoom', [roomId], false);
    },

    backToList: function(){
      return call('backToList', [], false);
    },

    openBulkSend: function(event){
      return call('openBulkSend', [event], false);
    },
    closeBulkSend: function(event){
      return call('closeBulkSend', [event], false);
    },
    handleBulkSearch: function(event){
      return call('handleBulkSearch', [event], false);
    },
    bulkPreviousPage: function(event){
      return call('bulkPreviousPage', [event], false);
    },
    bulkNextPage: function(event){
      return call('bulkNextPage', [event], false);
    },
    handleBulkTitle: function(event){
      return call('handleBulkTitle', [event], false);
    },
    handleBulkMessage: function(event){
      return call('handleBulkMessage', [event], false);
    },
    toggleBulkTarget: function(event){
      return call('toggleBulkTarget', [event], false);
    },
    toggleBulkSelectAll: function(event){
      return call('toggleBulkSelectAll', [event], false);
    },
    sendBulkMessage: function(event){
      return Promise.resolve(call('sendBulkMessage', [event], false));
    },

    getState: function(){
      var raw = call('getState', [], null) || {};
      return {
        ready:!!api(),
        list:Array.isArray(raw.list) ? raw.list : [],
        listError:raw.listError || null,
        currentRoomId:String(raw.currentRoomId || ''),
        bulkSendOpen:!!raw.bulkSendOpen,
        bulkEligibleCount:Number(raw.bulkEligibleCount || 0),
        bulkSelectedCount:Number(raw.bulkSelectedCount || 0),
        bulkSending:!!raw.bulkSending,
        bulkResult:raw.bulkResult || null,
        bulkTargetsSource:raw.bulkTargetsSource || null
      };
    }
  });
})(window);
