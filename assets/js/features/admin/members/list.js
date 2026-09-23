// SitePass STEP89 v731R3 - member list/render responsibility
(function(){
  'use strict';

  const state = window.SitePassAdminMembersState;
  const status = window.SitePassAdminMembersStatus;
  const search = window.SitePassAdminMembersSearch;
  const detail = window.SitePassAdminMembersDetail;

  if (!state || !status || !search || !detail) {
    throw new Error('STEP89_MEMBER_MODULE_DEPENDENCY_NOT_READY');
  }

  const SITEPASS_MEMBER_PAYMENT_DRILLDOWN_FOLDERS_V731R2 = status.PAYMENT_DRILLDOWN_FOLDERS.slice();

  const getAdminMemberFolderState = () => state.getMemberFolder();
  const setAdminMemberFolderState = value => state.setMemberFolder(value);
  const getAdminMemberSearchTextState = () => state.getMemberSearchText();
  const getAdminMemberPageState = () => state.getMemberPage();
  const setAdminMemberPageState = value => state.setMemberPage(value);
  const getAdminExpandedMemberIdState = () => state.getExpandedMemberId();
  const setAdminExpandedMemberIdState = value => state.setExpandedMemberId(value);
  const getAdminMemberSyncingState = () => state.getMemberSyncing();
  const getAdminMemberSyncedAtState = () => state.getMemberSyncedAt();
  const getAdminMemberSyncMessageState = () => state.getMemberSyncMessage();

  const isAdminAccountMember = member => status.isAdminAccountMember(member);
  const getAdminMemberCounts = (active, withdrawn) => status.getAdminMemberCounts(active, withdrawn);
  const getAdminFolderLabel = key => status.getAdminFolderLabel(key);
  const filterAdminMembersByFolder = (member, folder) => status.filterAdminMembersByFolder(member, folder);
  const adminMemberMatchesSearch = (member, q) => search.adminMemberMatchesSearch(member, q);
  const getAdminMemberActionId = member => detail.getAdminMemberActionId(member);

  let sitePassMemberEquipmentCountsRefreshScheduledV731R2 = false;

  function getMemberEquipmentCountsV731R2(member) {
    const api = window.SitePassAdminMembersApi || null;
    if (!api || typeof api.getForMember !== 'function') {
      return {
        ready:false,
        found:false,
        owned:0,
        linkedOut:0,
        linkedIn:0,
        error:'MEMBERS_API_NOT_READY'
      };
    }

    try {
      return api.getForMember(member) || {
        ready:false,
        found:false,
        owned:0,
        linkedOut:0,
        linkedIn:0,
        error:''
      };
    } catch (e) {
      return {
        ready:false,
        found:false,
        owned:0,
        linkedOut:0,
        linkedIn:0,
        error:e?.message || 'MEMBER_EQUIPMENT_COUNTS_LOOKUP_ERROR'
      };
    }
  }

  function formatMemberEquipmentCountV731R2(summary, key) {
    if (summary && summary.found === true) {
      const n = Number(summary[key] || 0);
      return (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0) + '대';
    }
    if (summary && summary.ready === true) return '0대';
    if (summary && summary.error) return '-';
    return '확인중';
  }

  function scheduleMemberEquipmentCountsRefreshV731R2(force) {
    const api = window.SitePassAdminMembersApi || null;
    if (!api || typeof api.refresh !== 'function' || typeof api.getState !== 'function') return false;

    const state = api.getState() || {};
    if (!force && (state.loading || (state.fetchedAt && Date.now() - state.fetchedAt < 15000))) {
      return false;
    }
    if (sitePassMemberEquipmentCountsRefreshScheduledV731R2) return false;

    sitePassMemberEquipmentCountsRefreshScheduledV731R2 = true;

    setTimeout(async function(){
      try {
        await api.refresh(!!force);
      } catch (e) {
        console.warn('STEP89 회원 장비연동 요약 조회 실패:', e);
      } finally {
        sitePassMemberEquipmentCountsRefreshScheduledV731R2 = false;
        try {
          if (typeof window.sitePassRequestAdminRender487 === 'function') {
            window.sitePassRequestAdminRender487(20);
          }
        } catch (e) {}
      }
    }, 0);

    return true;
  }

  async function refreshAdminMemberListV731R2(force) {
    try {
      if (typeof syncSupabaseMembersForAdmin === 'function') {
        await syncSupabaseMembersForAdmin(!!force);
      }
    } catch (e) {
      console.warn('STEP89 회원목록 새로고침 실패:', e);
    }

    const api = window.SitePassAdminMembersApi || null;
    if (api && typeof api.refresh === 'function') {
      try { await api.refresh(true); }
      catch (e) { console.warn('STEP89 회원 장비연동 요약 새로고침 실패:', e); }
    }

    try {
      if (typeof window.sitePassRequestAdminRender487 === 'function') {
        window.sitePassRequestAdminRender487(20);
      } else if (typeof renderAdmin === 'function') {
        renderAdmin();
      }
    } catch (e) {}

    return false;
  }

  function renderAdminStaffManager(members, viewMode) {
    const adminOnly = String(viewMode || 'members') === 'admins';

    if (!isSuperAdminLoggedIn()) {
      return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>' +
        (adminOnly ? '관리자관리' : '회원관리') +
        '</h3><div class="notice">이 관리 화면의 상세 조작은 최고관리자만 가능합니다.</div></div>';
    }

    const withdrawnMembers = getVisibleWithdrawnMembers().map(item => ({ ...item, withdrawn:true, status:'강제탈퇴' }));
    const activeMembers = dedupeAdminMembersForDisplay(getAdminAllMemberRows());
    const counts = getAdminMemberCounts(activeMembers, withdrawnMembers);

    if (!adminOnly) scheduleMemberEquipmentCountsRefreshV731R2(false);

    // 회원관리 화면에는 사람 중심 폴더만 노출합니다.
    // 신규결제/연장결제/환불은 결제관리 상위 폴더에서만 진입하며,
    // 그 드릴다운을 위해 내부 filter 함수/키는 기존 그대로 보존합니다.
    const memberFolders = ['all','normal','newSignup','suspended','withdrawn'];
    const validMemberFolders = memberFolders.concat(SITEPASS_MEMBER_PAYMENT_DRILLDOWN_FOLDERS_V731R2);
    const adminFolders = ['super','admin'];
    const folders = adminOnly ? adminFolders : memberFolders;
    const validFolders = adminOnly ? adminFolders : validMemberFolders;

    let currentFolder = getAdminMemberFolderState();
    if (!validFolders.includes(currentFolder)) {
      currentFolder = adminOnly ? 'admin' : 'all';
      setAdminMemberFolderState(currentFolder);
      setAdminMemberPageState(0);
      setAdminExpandedMemberIdState('');
    }

    const folderButtons = folders.map(key =>
      '<button type="button" class="' + (currentFolder === key ? 'active' : '') + '" onclick="setAdminMemberFolder(\'' + escapeJs(key) + '\')">' +
        escapeHtml(getAdminFolderLabel(key)) + ' ' + (counts[key] || 0) +
      '</button>'
    ).join('');

    const currentSearchText = getAdminMemberSearchTextState();
    let currentPage = getAdminMemberPageState();
    const source = currentFolder === 'withdrawn' ? withdrawnMembers : activeMembers;
    let filtered = source
      .filter(member => filterAdminMembersByFolder(member, currentFolder))
      .filter(member => adminMemberMatchesSearch(member, currentSearchText));

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage >= totalPages) {
      currentPage = totalPages - 1;
      setAdminMemberPageState(currentPage);
    }
    const pageItems = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

    const memberSummary = '<div class="admin-summary-rows sitepass-member-summary-r2b">' +
      '<div class="admin-summary-row">' +
        '<div class="line"><b>전체회원</b><span>' + counts.all + '명</span></div>' +
        '<div class="line"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +
        '<div class="line"><b>신규회원</b><span>' + counts.newSignup + '명</span></div>' +
        '<div class="line"><b>정지회원</b><span>' + counts.suspended + '명</span></div>' +
        '<div class="line"><b>강제탈퇴</b><span>' + counts.withdrawn + '명</span></div>' +
      '</div>' +
    '</div>';

    const adminSummary = '<div class="admin-summary-rows">' +
      '<div class="admin-summary-row">' +
        '<div class="line"><b>최고관리자</b><span>' + counts.super + '명</span></div>' +
        '<div class="line"><b>관리자</b><span>' + counts.admin + '명</span></div>' +
        '<div class="line"><b>관리자 합계</b><span>' + ((counts.super || 0) + (counts.admin || 0)) + '명</span></div>' +
      '</div>' +
    '</div>';

    const rows = pageItems.map(member => {
      const name = getMemberDisplayName(member);
      const role = member.withdrawn
        ? '강제탈퇴'
        : (['운영관리자','조회관리자'].includes(member.adminRole)
            ? '관리자'
            : (member.adminRole || '일반회원'));
      const plan = getMemberPlanInfo(member);
      const equipmentCountsV731R2 = getMemberEquipmentCountsV731R2(member);
      const ownedEquipmentTextV731R2 = formatMemberEquipmentCountV731R2(equipmentCountsV731R2, 'owned');
      const linkedOutEquipmentTextV731R2 = formatMemberEquipmentCountV731R2(equipmentCountsV731R2, 'linkedOut');
      const linkedInEquipmentTextV731R2 = formatMemberEquipmentCountV731R2(equipmentCountsV731R2, 'linkedIn');
      const status = getMemberStatusText(member);
      const roleBadge = '<span class="badge ' + getAdminRoleBadgeClass(role) + '">' + escapeHtml(role) + '</span>';
      const idText = getMemberMainId(member);
      const actionId = getAdminMemberActionId(member);

      if (adminOnly) {
        const protectedSuper = member.isSuperAdminVirtual || role === SUPER_ADMIN_ROLE_NAME;
        return '<div class="admin-member-row">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + ' · ' + escapeHtml(member.signupMethod || member.provider || '관리자계정') + '</div></div>' + roleBadge + '</div>' +
          '<div class="admin-member-summary">' +
            '<span><b>휴대폰</b>' + escapeHtml(member.phone || '-') + '</span>' +
            '<span><b>소셜계정</b>' + escapeHtml(getMemberSocialText(member)) + '</span>' +
            '<span><b>회원상태</b>' + escapeHtml(status) + '</span>' +
            '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
          '</div>' +
          '<div class="actions">' +
            (protectedSuper
              ? '<span class="small">최고관리자 보호계정 · 권한해제/정지/탈퇴 대상 아님</span>'
              : '<button class="ghost" onclick="resetAdminAccountPassword(\'' + escapeJs(actionId) + '\')">비밀번호 재설정</button>' +
                '<button class="dangerBtn" onclick="clearMemberAdminRole(\'' + escapeJs(actionId) + '\')">관리자해제</button>') +
          '</div>' +
        '</div>';
      }

      const detailOpen = getAdminExpandedMemberIdState() === actionId;
      return '<div class="admin-member-row sitepass-member-card-r2b">' +
        '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + '</div></div>' + roleBadge + '</div>' +
        '<div class="admin-member-summary sitepass-member-card-grid-r2b">' +
          '<span><b>전화번호</b>' + escapeHtml(member.phone || '-') + '</span>' +
          '<span><b>소셜계정</b>' + escapeHtml(getMemberSocialText(member)) + '</span>' +
          '<span><b>가입종류</b>미지정</span>' +
          '<span><b>결제여부</b>' + escapeHtml(plan.label || '-') + '</span>' +
          '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="ghost" onclick="toggleAdminMemberDetail(\'' + escapeJs(actionId) + '\')">' + (detailOpen ? '상세닫기' : '상세관리') + '</button>' +
        '</div>' +
        (detailOpen ? renderAdminMemberDetail(member) : '') +
      '</div>';
    }).join('') || '<div class="empty">' + (adminOnly ? '조건에 맞는 관리자 계정이 없습니다.' : '조건에 맞는 회원이 없습니다.') + '</div>';

    const pager = '<div class="admin-pager">' +
      '<button class="ghost" onclick="changeAdminMemberPage(-1)" ' + (currentPage <= 0 ? 'disabled' : '') + '>이전 20명</button>' +
      '<span class="small">' + (currentPage + 1) + ' / ' + totalPages + ' 페이지 · 검색결과 ' + filtered.length + '명</span>' +
      '<button class="ghost" onclick="changeAdminMemberPage(1)" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '>다음 20명</button>' +
    '</div>';

    const heading = adminOnly ? '관리자 계정 관리' : '회원관리';
    const notice = adminOnly
      ? '최고관리자와 직원 관리자 계정만 표시합니다. 일반회원·결제회원 목록은 회원관리에서 확인합니다.'
      : '일반회원만 표시합니다. 최고관리자와 직원 관리자 계정은 관리자관리에서 분리해 확인합니다.';

    const pageClass = adminOnly
      ? 'sitepass-admin-admins-page-v731'
      : 'sitepass-admin-members-page-v731';

    return '<div class="card ' + pageClass + '" style="box-shadow:none;margin-top:14px;">' +
      '<h3>' + heading + '</h3>' +
      '<div class="notice blue-note">' + notice + '</div>' +
      '<div class="actions" style="margin:8px 0 10px;"><button type="button" class="primary" onclick="' + (adminOnly ? 'syncSupabaseMembersForAdmin(true)' : 'refreshAdminMemberListV731R2(true)') + '" ' + (getAdminMemberSyncingState() ? 'disabled' : '') + '>' + (getAdminMemberSyncingState() ? '회원목록 불러오는 중' : '약관회원/가입통계 새로고침') + '</button><span class="small">' + escapeHtml(getAdminMemberSyncMessageState() || (getAdminMemberSyncedAtState() ? '마지막 동기화: ' + formatNullableDateTime(new Date(getAdminMemberSyncedAtState()).toISOString()) : '관리자 화면 진입 시 약관동의 active 회원을 확인합니다.')) + '</span></div>' +
      (adminOnly
        ? adminSummary + renderAdminCreateAccountPanel()
        : renderAdminSignupMethodBoard(activeMembers) + memberSummary) +
      '<div class="admin-member-toolbar"><div><input id="adminMemberSearchInput" type="text" placeholder="' + (adminOnly ? '관리자 이름 / 아이디 / 휴대폰번호 검색' : '회원 이름 / 아이디 / 휴대폰번호 / 카카오·네이버계정 검색') + '" value="' + escapeHtml(currentSearchText || '') + '" oncompositionstart="startAdminMemberSearchComposition()" oncompositionend="finishAdminMemberSearchComposition(this)" oninput="handleAdminMemberSearchInput(this)" onkeydown="if(event.key===\'Enter\' && !getAdminMemberSearchComposingForInline()){applyAdminMemberSearch();}" /></div><div class="actions admin-search-actions"><button type="button" class="primary" onclick="applyAdminMemberSearch()">검색</button><button type="button" class="ghost" onclick="clearAdminMemberSearch()">초기화</button></div><div class="small">현재 폴더: <b>' + escapeHtml(getAdminFolderLabel(currentFolder)) + '</b></div></div>' +
      '<div class="admin-folder-tabs">' + folderButtons + '</div>' +
      rows + pager +
    '</div>';
  }

  function renderAdminMemberManager(members) {
    return renderAdminStaffManager(members, 'members');
  }

  function renderAdminAccountManager(members) {
    return renderAdminStaffManager(members, 'admins');
  }

  window.SitePassAdminMembersList = Object.freeze({
    getMemberEquipmentCountsV731R2,
    formatMemberEquipmentCountV731R2,
    scheduleMemberEquipmentCountsRefreshV731R2,
    refreshAdminMemberListV731R2,
    renderAdminStaffManager,
    renderAdminMemberManager,
    renderAdminAccountManager
  });
})();
