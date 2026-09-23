// SitePass STEP92 v775 - admin notification operation API boundary
(function(){
  'use strict';

  var SUMMARY_RPC = 'sitepass_get_admin_notification_operation_summary_v1';
  var ISSUES_RPC = 'sitepass_list_admin_push_operation_issues_v1';

  function client(){
    var value = window.sitepassSupabase || null;
    return value && typeof value.rpc === 'function' ? value : null;
  }

  async function rpc(name, args){
    var api = client();
    if (!api) {
      return {
        data: null,
        error: { message: 'Supabase 클라이언트를 확인할 수 없습니다.' }
      };
    }

    try {
      return await api.rpc(name, args || {});
    } catch (error) {
      return { data: null, error: error };
    }
  }

  window.SitePassAdminNotificationsApiV92 = Object.freeze({
    SUMMARY_RPC: SUMMARY_RPC,
    ISSUES_RPC: ISSUES_RPC,
    rpc: rpc
  });
})();
