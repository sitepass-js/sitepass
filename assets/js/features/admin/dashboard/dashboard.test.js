// SitePass STEP88 - dashboard contract test helpers (not loaded by production index)
(function(){
  'use strict';

  function inspect(){
    var api = window.SitePassAdminDashboardApi || null;
    return {
      apiPresent: !!api,
      rpcName: api && api.RPC_NAME || null,
      rawEquipmentRpcReferenced:
        String(api && api.RPC_NAME || '').indexOf('list_equipment') >= 0,
      rawInquiryRpcReferenced:
        String(api && api.RPC_NAME || '').indexOf('inquiry_rooms') >= 0,
      rawShareHistoryRpcReferenced:
        String(api && api.RPC_NAME || '').indexOf('recipient_share_events') >= 0
    };
  }

  window.SitePassAdminDashboardTest = Object.freeze({
    inspect: inspect
  });
})();
