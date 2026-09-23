// SitePass STEP92 v775 - admin member-chat read-only operation API boundary
(function(){
  'use strict';

  var SUMMARY_RPC =
    'sitepass_get_admin_member_chat_operation_summary_v1';

  function normalizePayload(data){
    if (Array.isArray(data)) {
      return data[0] || {};
    }

    return data && typeof data === 'object'
      ? data
      : {};
  }

  function client(){
    var value = window.sitepassSupabase || null;
    return value && typeof value.rpc === 'function' ? value : null;
  }

  async function callRpc(name, args){
    var api = client();

    if (!api) {
      throw new Error('SUPABASE_CLIENT_NOT_READY');
    }

    var result = await api.rpc(name, args || {});

    if (!result) {
      throw new Error('EMPTY_RPC_RESULT');
    }

    if (result.error) {
      throw result.error;
    }

    return normalizePayload(result.data);
  }

  window.SitePassAdminMemberChatsApiV92 = Object.freeze({
    SUMMARY_RPC: SUMMARY_RPC,
    callRpc: callRpc,
    normalizePayload: normalizePayload
  });
})();
