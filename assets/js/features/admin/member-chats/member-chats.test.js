// SitePass STEP92 v775 - member-chat operation module contract test
(function(){
  'use strict';

  function runContract(){
    var api = window.SitePassAdminMemberChatsApiV92 || null;
    var operation = window.SitePassAdminMemberChatsOperationV92 || null;

    var result = {
      marker: 'STEP92_V775_ADMIN_MEMBER_CHATS_RESPONSIBILITY_CONTRACT',
      apiReady: !!api,
      operationReady: !!operation,
      summaryRpcExact:
        !!api &&
        api.SUMMARY_RPC ===
          'sitepass_get_admin_member_chat_operation_summary_v1',
      issuesRpcRemoved:
        !!api &&
        !Object.prototype.hasOwnProperty.call(api, 'ISSUES_RPC'),
      renderReady:
        !!operation && typeof operation.render === 'function',
      scheduleLoadReady:
        !!operation && typeof operation.scheduleLoad === 'function',
      refreshReady:
        !!operation && typeof operation.refresh === 'function',
      issuePagingRemoved:
        !!operation && typeof operation.loadMore !== 'function',
      toggleReady:
        !!operation && typeof operation.toggle === 'function',
      invalidateReady:
        !!operation && typeof operation.invalidate === 'function',
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

  window.SitePassAdminMemberChatsTest = Object.freeze({
    runContract: runContract
  });
})();
