// SitePass STEP92 v775 - notification operation module contract test
(function(){
  'use strict';

  function runContract(){
    var api = window.SitePassAdminNotificationsApiV92 || null;
    var operation = window.SitePassAdminNotificationsOperationV92 || null;

    var result = {
      marker: 'STEP92_V775_ADMIN_NOTIFICATIONS_MODULE_CONTRACT',
      apiReady: !!api,
      operationReady: !!operation,
      summaryRpcExact:
        !!api &&
        api.SUMMARY_RPC ===
          'sitepass_get_admin_notification_operation_summary_v1',
      issuesRpcExact:
        !!api &&
        api.ISSUES_RPC ===
          'sitepass_list_admin_push_operation_issues_v1',
      renderReady:
        !!operation && typeof operation.render === 'function',
      refreshReady:
        !!operation && typeof operation.refresh === 'function',
      loadMoreReady:
        !!operation && typeof operation.loadMore === 'function',
      clearReady:
        !!operation && typeof operation.clear === 'function',
      stateReady:
        !!operation && typeof operation.getState === 'function',
      pass: false
    };

    result.pass = Object.keys(result)
      .filter(function(key){
        return key !== 'marker' && key !== 'pass';
      })
      .every(function(key){
        return result[key] === true;
      });

    return result;
  }

  window.SitePassAdminNotificationsTest = Object.freeze({
    runContract: runContract
  });
})();
