// SitePass STEP89 v731R3 - member search/paging responsibility
(function(){
  'use strict';

  const state = window.SitePassAdminMembersState;
  if (!state) throw new Error('STEP89_MEMBERS_STATE_NOT_READY');

  const getAdminMemberSearchTextState = () => state.getMemberSearchText();
  const setAdminMemberSearchTextState = value => state.setMemberSearchText(value);
  const setAdminMemberSearchComposingState = value => state.setMemberSearchComposing(value);
  const getAdminMemberPageState = () => state.getMemberPage();
  const setAdminMemberPageState = value => state.setMemberPage(value);
  const setAdminExpandedMemberIdState = value => state.setExpandedMemberId(value);

  function adminMemberMatchesSearch(member, q) {
    if (!q) return true;
    const needle = normalizeLoginText(q).toLowerCase();
    const values = [
      getMemberDisplayName(member),
      getMemberMainId(member),
      member?.phone || '',
      member?.providerId || '',
      member?.signupId || '',
      member?.provider || '',
      member?.signupMethod || '',
      member?.adminMemo || '',
      getMemberSocialText(member),
      getMemberStatusText(member)
    ].join(' ').toLowerCase();
    return values.includes(needle);
  }

  function startAdminMemberSearchComposition() {
    setAdminMemberSearchComposingState(true);
  }

  function handleAdminMemberSearchInput(input) {
    // 입력 중에는 화면을 다시 그리지 않습니다.
    // 한글/숫자 입력 도중 renderAdmin()이 실행되면 글자가 분리되거나 커서가 튀는 문제가 있습니다.
    setAdminMemberSearchTextState(input?.value || '');
  }

  function finishAdminMemberSearchComposition(input) {
    setAdminMemberSearchComposingState(false);
    setAdminMemberSearchTextState(input?.value || '');
  }

  function setAdminMemberSearch(value) {
    setAdminMemberSearchTextState(value || '');
    setAdminMemberPageState(0);
    setAdminExpandedMemberIdState('');
    renderAdmin();
  }

  function applyAdminMemberSearch() {
    const input = document.getElementById('adminMemberSearchInput');
    setAdminMemberSearch(input?.value || getAdminMemberSearchTextState() || '');
  }

  function clearAdminMemberSearch() {
    setAdminMemberSearchTextState('');
    setAdminMemberPageState(0);
    setAdminExpandedMemberIdState('');
    renderAdmin();
  }

  function changeAdminMemberPage(delta) {
    setAdminMemberPageState(Math.max(0, getAdminMemberPageState() + Number(delta || 0)));
    renderAdmin();
  }

  window.SitePassAdminMembersSearch = Object.freeze({
    adminMemberMatchesSearch,
    startAdminMemberSearchComposition,
    handleAdminMemberSearchInput,
    finishAdminMemberSearchComposition,
    setAdminMemberSearch,
    applyAdminMemberSearch,
    clearAdminMemberSearch,
    changeAdminMemberPage
  });
})();
