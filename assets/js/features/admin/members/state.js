// SitePass STEP89 v731R3 - member-management state bridge only
(function(){
  'use strict';

  function adminRuntime() {
    return window.SitePassAdminRuntime || {};
  }

  function getMemberFolder() {
    const rt = adminRuntime();
    return rt.getMemberFolder ? rt.getMemberFolder() : 'all';
  }

  function setMemberFolder(value) {
    const rt = adminRuntime();
    if (rt.setMemberFolder) rt.setMemberFolder(value || 'all');
  }

  function getMemberSearchText() {
    const rt = adminRuntime();
    return rt.getMemberSearchText ? rt.getMemberSearchText() : '';
  }

  function setMemberSearchText(value) {
    const rt = adminRuntime();
    if (rt.setMemberSearchText) rt.setMemberSearchText(value || '');
  }

  function getMemberSearchComposing() {
    const rt = adminRuntime();
    return rt.getMemberSearchComposing ? !!rt.getMemberSearchComposing() : false;
  }

  function setMemberSearchComposing(value) {
    const rt = adminRuntime();
    if (rt.setMemberSearchComposing) rt.setMemberSearchComposing(!!value);
  }

  function getMemberPage() {
    const rt = adminRuntime();
    return rt.getMemberPage ? Math.max(0, Number(rt.getMemberPage() || 0)) : 0;
  }

  function setMemberPage(value) {
    const rt = adminRuntime();
    if (rt.setMemberPage) rt.setMemberPage(Math.max(0, Number(value || 0)));
  }

  function getExpandedMemberId() {
    const rt = adminRuntime();
    return rt.getExpandedMemberId ? String(rt.getExpandedMemberId() || '') : '';
  }

  function setExpandedMemberId(value) {
    const rt = adminRuntime();
    if (rt.setExpandedMemberId) rt.setExpandedMemberId(value || '');
  }

  function getMemberSyncing() {
    const rt = adminRuntime();
    return rt.getMemberSyncing ? !!rt.getMemberSyncing() : false;
  }

  function getMemberSyncedAt() {
    const rt = adminRuntime();
    return rt.getMemberSyncedAt ? Number(rt.getMemberSyncedAt() || 0) : 0;
  }

  function getMemberSyncMessage() {
    const rt = adminRuntime();
    return rt.getMemberSyncMessage ? String(rt.getMemberSyncMessage() || '') : '';
  }

  function getMemberSearchComposingForInline() {
    return getMemberSearchComposing();
  }

  window.SitePassAdminMembersState = Object.freeze({
    getMemberFolder,
    setMemberFolder,
    getMemberSearchText,
    setMemberSearchText,
    getMemberSearchComposing,
    setMemberSearchComposing,
    getMemberPage,
    setMemberPage,
    getExpandedMemberId,
    setExpandedMemberId,
    getMemberSyncing,
    getMemberSyncedAt,
    getMemberSyncMessage,
    getMemberSearchComposingForInline
  });
})();
