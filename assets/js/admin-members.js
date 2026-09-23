// SitePass STEP89 v731R3 - member-management compatibility facade
// Actual responsibilities live under assets/js/features/admin/members/.
(function(){
  'use strict';

  const state = window.SitePassAdminMembersState;
  const status = window.SitePassAdminMembersStatus;
  const search = window.SitePassAdminMembersSearch;
  const detail = window.SitePassAdminMembersDetail;
  const list = window.SitePassAdminMembersList;

  if (!state || !status || !search || !detail || !list) {
    throw new Error('STEP89_MEMBER_FOLDER_SPLIT_NOT_READY');
  }

  window.getAdminMemberSearchComposingForInline =
    state.getMemberSearchComposingForInline;

  window.refreshAdminMemberListV731R2 =
    list.refreshAdminMemberListV731R2;

  window.SitePassAdminMembers = Object.freeze({
    isAdminAccountMember: status.isAdminAccountMember,
    getAdminMemberCounts: status.getAdminMemberCounts,
    getAdminFolderLabel: status.getAdminFolderLabel,
    filterAdminMembersByFolder: status.filterAdminMembersByFolder,

    adminMemberMatchesSearch: search.adminMemberMatchesSearch,
    setAdminMemberFolder: status.setAdminMemberFolder,
    startAdminMemberSearchComposition: search.startAdminMemberSearchComposition,
    handleAdminMemberSearchInput: search.handleAdminMemberSearchInput,
    finishAdminMemberSearchComposition: search.finishAdminMemberSearchComposition,
    setAdminMemberSearch: search.setAdminMemberSearch,
    applyAdminMemberSearch: search.applyAdminMemberSearch,
    clearAdminMemberSearch: search.clearAdminMemberSearch,
    changeAdminMemberPage: search.changeAdminMemberPage,

    getAdminMemberActionId: detail.getAdminMemberActionId,
    getAdminMemberActionTokens: detail.getAdminMemberActionTokens,
    isSameAdminActionMember: detail.isSameAdminActionMember,

    normalizeDirectMemberFolderV731R2:
      status.normalizeDirectMemberFolderV731R2,

    getMemberEquipmentCountsV731R2:
      list.getMemberEquipmentCountsV731R2,

    renderAdminStaffManager: list.renderAdminStaffManager,
    renderAdminMemberManager: list.renderAdminMemberManager,
    renderAdminAccountManager: list.renderAdminAccountManager
  });
})();
