// SitePass STEP90 R2 - equipment/personnel module contract
(function(){
  'use strict';

  function runContract() {
    var state = window.SitePassAdminEquipmentPersonnelState;
    var api = window.SitePassAdminEquipmentPersonnelApi;
    var detail = window.SitePassAdminEquipmentPersonnelDetail;
    var list = window.SitePassAdminEquipmentPersonnelList;
    var page = window.SitePassAdminEquipmentPersonnel;

    var result = {
      marker: 'STEP90_R2_ADMIN_EQUIPMENT_PERSONNEL_MODULE_CONTRACT_V1',
      stateReady: !!state,
      apiReady: !!api,
      detailReady: !!detail,
      listReady: !!list,
      pageReady: !!page,
      rpcExact: !!api && api.RPC_NAME === 'sitepass_admin_list_person_auth_status_v1',
      defaultEquipmentTab: !!page && page.getActiveTab() === 'equipment',
      noWriteApiSurface:
        !!api &&
        typeof api.refresh === 'function' &&
        typeof api.getState === 'function' &&
        typeof api.invalidate === 'function' &&
        typeof api.create === 'undefined' &&
        typeof api.update === 'undefined' &&
        typeof api.remove === 'undefined',
      pass: false
    };

    result.pass = Object.keys(result)
      .filter(function(key){ return key !== 'marker' && key !== 'pass'; })
      .every(function(key){ return result[key] === true; });

    return result;
  }

  window.SitePassAdminEquipmentPersonnelTest = Object.freeze({
    runContract: runContract
  });
})();
