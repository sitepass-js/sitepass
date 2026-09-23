(function(global){
  'use strict';

  var root = global.SitePassSupportV85 = global.SitePassSupportV85 || {};

  function client(){
    return global.sitepassSupabase || null;
  }

  function ready(){
    var target = client();
    return !!target && typeof target.rpc === 'function';
  }

  async function getMyRoom(limit){
    var target = client();
    if (!target || typeof target.rpc !== 'function') throw new Error('SUPPORT_RPC_UNAVAILABLE');
    return target.rpc('sitepass_get_my_admin_inquiry_room_v1', {
      p_limit: Math.max(1, Number(limit) || 200)
    });
  }

  async function markMyRead(){
    var target = client();
    if (!target || typeof target.rpc !== 'function') throw new Error('SUPPORT_RPC_UNAVAILABLE');
    return target.rpc('sitepass_mark_my_admin_inquiry_read_v1');
  }

  async function sendMyMessage(messageText, idempotencyKey){
    var target = client();
    if (!target || typeof target.rpc !== 'function') throw new Error('SUPPORT_RPC_UNAVAILABLE');
    return target.rpc('sitepass_send_my_admin_inquiry_message_v1', {
      p_message_text: String(messageText || ''),
      p_idempotency_key: idempotencyKey
    });
  }

  root.api = Object.freeze({
    ready: ready,
    getMyRoom: getMyRoom,
    markMyRead: markMyRead,
    sendMyMessage: sendMyMessage
  });
})(window);