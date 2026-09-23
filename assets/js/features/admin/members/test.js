// SitePass STEP89 v731R3 - member module contract test helper
(function(){
  'use strict';

  function runContract() {
    const state = window.SitePassAdminMembersState;
    const api = window.SitePassAdminMembersApi;
    const status = window.SitePassAdminMembersStatus;
    const search = window.SitePassAdminMembersSearch;
    const detail = window.SitePassAdminMembersDetail;
    const list = window.SitePassAdminMembersList;
    const facade = window.SitePassAdminMembers;

    const result = {
      marker: 'STEP89_V731R3_MEMBER_MODULE_CONTRACT',
      stateReady: !!state,
      apiReady: !!api,
      statusReady: !!status,
      searchReady: !!search,
      detailReady: !!detail,
      listReady: !!list,
      facadeReady: !!facade,
      facadeListBridge:
        !!facade && !!list &&
        facade.renderAdminMemberManager === list.renderAdminMemberManager,
      facadeSearchBridge:
        !!facade && !!search &&
        facade.applyAdminMemberSearch === search.applyAdminMemberSearch,
      facadeStatusBridge:
        !!facade && !!status &&
        facade.filterAdminMembersByFolder === status.filterAdminMembersByFolder,
      facadeDetailIdentityBridge:
        !!facade && !!detail &&
        facade.isSameAdminActionMember === detail.isSameAdminActionMember,
      paymentActionsExcludedFromMemberDetail:
        !!detail &&
        typeof detail.processMemberNewPayment === 'undefined' &&
        typeof detail.processMemberPaymentExtension === 'undefined' &&
        typeof detail.processMemberRefund === 'undefined',
      pass: false
    };

    result.pass = Object.keys(result)
      .filter(key => key !== 'marker' && key !== 'pass')
      .every(key => result[key] === true);

    return result;
  }

  window.SitePassAdminMembersTest = Object.freeze({
    runContract
  });
})();
