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

  global.SitePassMemberChatRoomV39 = Object.freeze({
    isReady: function(){
      var target = api();
      return !!target &&
        typeof target.sendMessage === 'function' &&
        typeof target.openRoom === 'function';
    },

    openRoom: function(roomId){
      roomId = String(roomId || '');
      if (!roomId) return false;
      return call('openRoom', [roomId], false);
    },

    backToList: function(){
      return call('backToList', [], false);
    },

    sendMessage: function(){
      return Promise.resolve(call('sendMessage', [], false));
    },

    toggleCurrentRoomPush: function(event){
      return call('toggleCurrentRoomPush', [event], false);
    },

    toggleRequestGroup: function(event){
      return call('toggleRequestGroup', [event], false);
    },
    toggleRequestSummary: function(event){
      return call('toggleRequestSummary', [event], false);
    },

    startDeleteMode: function(event){
      return call('startDeleteMode', [event], false);
    },
    cancelDeleteMode: function(event){
      return call('cancelDeleteMode', [event], false);
    },
    toggleDeleteMessage: function(event){
      return call('toggleDeleteMessage', [event], false);
    },
    confirmDelete: function(event){
      return Promise.resolve(call('confirmDelete', [event], false));
    },

    toggleAttachmentMenu: function(event){
      return call('toggleAttachmentMenu', [event], false);
    },
    openAttachmentPicker: function(event){
      return call('openAttachmentPicker', [event], false);
    },
    handleAttachmentFiles: function(event){
      return Promise.resolve(call('handleAttachmentFiles', [event], false));
    },
    removePendingAttachment: function(index){
      return call('removePendingAttachment', [index], false);
    },
    openAttachment: function(attachmentId){
      return Promise.resolve(call('openAttachment', [attachmentId], false));
    },
    downloadAttachment: function(attachmentId){
      return Promise.resolve(call('downloadAttachment', [attachmentId], false));
    },

    respondGroup: function(){
      return Promise.resolve(call('respondGroup', Array.prototype.slice.call(arguments), false));
    },

    getState: function(){
      var raw = call('getState', [], null) || {};
      return {
        ready:!!api(),
        currentRoomId:String(raw.currentRoomId || ''),
        detail:raw.detail || null,
        detailError:raw.detailError || null,
        pendingFileCount:Number(raw.pendingFileCount || 0),
        attachmentMenuOpen:!!raw.attachmentMenuOpen
      };
    }
  });
})(window);
