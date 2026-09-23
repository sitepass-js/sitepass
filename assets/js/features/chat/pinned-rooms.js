(function(global){
  'use strict';

  var FIXED_ROOM_IDS = Object.freeze(['system', 'share', 'expiry', 'admin']);

  function api(){
    return global.SitePassChatFeatureBridgeV39 &&
      global.SitePassChatFeatureBridgeV39.pinnedRooms || null;
  }

  function validRoomId(roomId){
    roomId = String(roomId || '');
    return FIXED_ROOM_IDS.indexOf(roomId) >= 0 ? roomId : '';
  }

  global.SitePassChatPinnedRoomsV39 = Object.freeze({
    roomIds: FIXED_ROOM_IDS,

    isReady: function(){
      var target = api();
      return !!target &&
        typeof target.openRoom === 'function' &&
        typeof target.openInbox === 'function';
    },

    render: function(){
      var target = api();
      if (!target || typeof target.render !== 'function') return false;
      return target.render();
    },

    openRoom: function(roomId){
      var id = validRoomId(roomId);
      if (!id) return false;
      var target = api();
      if (!target || typeof target.openRoom !== 'function') return false;
      return target.openRoom(id);
    },

    openInbox: function(options){
      var target = api();
      if (!target || typeof target.openInbox !== 'function') return false;
      return target.openInbox(options || {});
    },

    backToList: function(){
      var target = api();
      if (!target || typeof target.backToList !== 'function') return false;
      return target.backToList();
    },

    getState: function(){
      var target = api();
      var state = target && typeof target.getState === 'function'
        ? (target.getState() || {})
        : {};
      return {
        ready:!!target,
        currentRoomId:String(state.currentRoomId || ''),
        roomIds:FIXED_ROOM_IDS.slice()
      };
    }
  });
})(window);
