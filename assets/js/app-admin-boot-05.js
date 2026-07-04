// SitePass v23.7.299 - app-admin-boot split continue (05/08)
function getAdminMembersModule() {
      return window.SitePassAdminMembers || {};
    }

    function isAdminAccountMember(member) {
      const mod = getAdminMembersModule();
      return mod.isAdminAccountMember ? mod.isAdminAccountMember(member) : false;
    }

    function getAdminMemberCounts(activeMembers, withdrawnMembers) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberCounts ? mod.getAdminMemberCounts(activeMembers, withdrawnMembers) : {};
    }

    function getAdminFolderLabel(key) {
      const mod = getAdminMembersModule();
      return mod.getAdminFolderLabel ? mod.getAdminFolderLabel(key) : '전체회원';
    }


    function filterAdminMembersByFolder(member, folder) {
      const mod = getAdminMembersModule();
      return mod.filterAdminMembersByFolder ? mod.filterAdminMembersByFolder(member, folder) : true;
    }

    function adminMemberMatchesSearch(member, q) {
      const mod = getAdminMembersModule();
      return mod.adminMemberMatchesSearch ? mod.adminMemberMatchesSearch(member, q) : true;
    }

    function setAdminMemberFolder(folder) {
      const mod = getAdminMembersModule();
      if (mod.setAdminMemberFolder) return mod.setAdminMemberFolder(folder);
    }

    function startAdminMemberSearchComposition() {
      const mod = getAdminMembersModule();
      if (mod.startAdminMemberSearchComposition) return mod.startAdminMemberSearchComposition();
    }

    function handleAdminMemberSearchInput(input) {
      const mod = getAdminMembersModule();
      if (mod.handleAdminMemberSearchInput) return mod.handleAdminMemberSearchInput(input);
    }

    function finishAdminMemberSearchComposition(input) {
      const mod = getAdminMembersModule();
      if (mod.finishAdminMemberSearchComposition) return mod.finishAdminMemberSearchComposition(input);
    }

    function setAdminMemberSearch(value) {
      const mod = getAdminMembersModule();
      if (mod.setAdminMemberSearch) return mod.setAdminMemberSearch(value);
    }

    function applyAdminMemberSearch() {
      const mod = getAdminMembersModule();
      if (mod.applyAdminMemberSearch) return mod.applyAdminMemberSearch();
    }

    function clearAdminMemberSearch() {
      const mod = getAdminMembersModule();
      if (mod.clearAdminMemberSearch) return mod.clearAdminMemberSearch();
    }

    function changeAdminMemberPage(delta) {
      const mod = getAdminMembersModule();
      if (mod.changeAdminMemberPage) return mod.changeAdminMemberPage(delta);
    }

    function getAdminMemberActionId(member) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberActionId ? mod.getAdminMemberActionId(member) : '';
    }

    function getAdminMemberActionTokens(member) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberActionTokens ? mod.getAdminMemberActionTokens(member) : [];
    }

    function isSameAdminActionMember(member, memberId) {
      const mod = getAdminMembersModule();
      return mod.isSameAdminActionMember ? mod.isSameAdminActionMember(member, memberId) : false;
    }

    function renderAdminStaffManager(members) {
      const mod = getAdminMembersModule();
      if (mod.renderAdminStaffManager) return mod.renderAdminStaffManager(members);
      return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 회원목록 파일을 불러오지 못했습니다. assets/js/admin-members.js 업로드를 확인해주세요.</div></div>';
    }

    // v23.7.257: 관리자 상세관리/결제/탈퇴 조작 함수는 assets/js/admin-detail.js로 분리했습니다.

    function getAdminPaymentActionMembers(activeMembers, type) {
      return activeMembers.filter(member => {
        if (member.withdrawn || member.isSuperAdminVirtual) return false;
        const status = String(member.paymentStatus || member.status || '');
        if (type === 'newPay') return status.includes('신규결제');
        if (type === 'extensionPay') return status.includes('연장결제');
        if (type === 'refundRequest') return member.refundRequestPending || status.includes('환불요청');
        return false;
      });
    }

    function renderAdminPaymentStatusCard(title, folder, list, emptyText) {
      const names = list.length
        ? list.slice(0, 6).map(member => {
            const time = folder === 'refundRequest' ? member.refundRequestedAt : member.adminLastActionAt;
            return '· ' + escapeHtml(getMemberDisplayName(member)) + ' / ' + escapeHtml(getMemberMainId(member)) + (time ? ' / ' + escapeHtml(formatNullableDateTime(time)) : '');
          }).join('<br>')
        : '<span class="small">' + escapeHtml(emptyText || '해당 회원이 없습니다.') + '</span>';
      return '<div class="admin-payment-status-card">' +
        '<strong>' + escapeHtml(title) + '<span class="badge need">' + list.length + '명</span></strong>' +
        '<div class="small">' + names + '</div>' +
        '<div class="actions"><button class="ghost" onclick="setAdminMemberFolder(\'' + escapeJs(folder) + '\')">목록 보기</button></div>' +
      '</div>';
    }

    function renderAdminPaymentStatusBoard(activeMembers) {
      const newPayList = getAdminPaymentActionMembers(activeMembers, 'newPay');
      const extensionList = getAdminPaymentActionMembers(activeMembers, 'extensionPay');
      const refundRequestList = getAdminPaymentActionMembers(activeMembers, 'refundRequest');
      return '<div class="admin-payment-status-board">' +
        renderAdminPaymentStatusCard('신규결제 확인', 'newPay', newPayList, '신규결제 처리 회원 없음') +
        renderAdminPaymentStatusCard('연장결제 확인', 'extensionPay', extensionList, '연장결제 처리 회원 없음') +
        renderAdminPaymentStatusCard('환불요청 확인', 'refundRequest', refundRequestList, '환불요청 회원 없음') +
      '</div>';
    }

    function renderAdminCreateAccountPanel() {
      if (!isSuperAdminLoggedIn()) return '';
      return '<div class="admin-payment-section" style="margin-top:14px;">' +
        '<span class="admin-payment-section-title">관리자 아이디 만들기</span>' +
        '<div class="notice blue-note">이 창은 최고관리자모드에서만 보입니다. 최고관리자가 만든 직원 계정은 모두 <b>관리자</b>로 접속하며, 운영관리자/조회관리자 구분은 사용하지 않습니다. 최고관리자는 <b>' + escapeHtml(ADMIN_ID) + '</b> 1개로 고정합니다.</div>' +
        '<div class="admin-payment-input-grid">' +
          '<input id="newAdminLoginId" type="text" placeholder="관리자 아이디 또는 이메일" autocomplete="off" />' +
          '<input id="newAdminName" type="text" placeholder="관리자 이름/표시명" autocomplete="off" />' +
          '<input id="newAdminPhone" type="tel" placeholder="휴대폰번호 선택" autocomplete="off" />' +
          '<input id="newAdminPassword" type="password" placeholder="임시 비밀번호 6자 이상" autocomplete="new-password" />' +
          '<input id="newAdminPassword2" type="password" placeholder="임시 비밀번호 확인" autocomplete="new-password" />' +
        '</div>' +
        '<div class="actions"><button class="primary" onclick="createAdminAccountBySuper()">관리자 아이디 만들기</button><button class="ghost" onclick="clearNewAdminAccountForm()">입력 초기화</button></div>' +
        '<div class="small">직원 관리자는 일반 로그인 화면에서 만든 아이디와 임시 비밀번호로 접속합니다. 일반 관리자모드에는 이 생성창이 보이지 않습니다.</div>' +
      '</div>';
    }

    function clearNewAdminAccountForm() {
      ['newAdminLoginId','newAdminName','newAdminPhone','newAdminPassword','newAdminPassword2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }

    function createAdminAccountBySuper() {
      if (!isSuperAdminLoggedIn()) {
        alert('관리자 아이디 생성은 최고관리자만 가능합니다.');
        return;
      }
      const loginId = normalizeLoginText(document.getElementById('newAdminLoginId')?.value || '');
      const name = normalizeLoginText(document.getElementById('newAdminName')?.value || '') || loginId;
      const phone = normalizeLoginText(document.getElementById('newAdminPhone')?.value || '');
      const role = '관리자';
      const pw = normalizeLoginText(document.getElementById('newAdminPassword')?.value || '');
      const pw2 = normalizeLoginText(document.getElementById('newAdminPassword2')?.value || '');

      if (!loginId) { alert('관리자 아이디를 입력해주세요.'); return; }
      if (isSuperAdminLoginId(loginId)) { alert('최고관리자 아이디는 이미 고정되어 있습니다. 직원 관리자 아이디로는 사용할 수 없습니다.'); return; }
      if (!pw || pw.length < 6) { alert('임시 비밀번호는 6자 이상으로 입력해주세요.'); return; }
      if (pw !== pw2) { alert('비밀번호 확인이 맞지 않습니다.'); return; }

      const existing = findMemberForLogin(loginId);
      if (existing && !confirm('이미 같은 아이디/휴대폰으로 등록된 회원이 있습니다.\n이 회원을 관리자로 지정하고 비밀번호를 새로 설정할까요?')) return;

      const nowIso = new Date().toISOString();
      let member = existing || {
        id:'ADM-' + Date.now(),
        createdAt:nowIso,
        status:'관리자계정',
        paymentPlanLabel:'관리자계정',
        memberPlan:'관리자계정',
        paymentStartedAt:nowIso,
        paymentEndsAt:addDaysIso(nowIso, 3650)
      };
      member.name = name;
      member.phone = phone;
      member.signupId = loginId;
      member.provider = 'SitePass';
      member.providerId = 'SITEPASS-LOGIN-' + loginId;
      member.signupMethod = '최고관리자 생성 관리자';
      member.testPassword = pw;
      member.passwordSet = true;
      member.adminRole = role;
      member.adminRoleUpdatedAt = nowIso;
      member.adminRoleUpdatedBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
      member.adminCreatedBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
      member.adminCreatedAt = member.adminCreatedAt || nowIso;
      member.adminLastAction = existing ? '관리자 권한/비밀번호 재설정' : '관리자 아이디 생성';
      member.adminLastActionAt = nowIso;
      member.suspended = false;
      member.withdrawn = false;

      saveMemberTest(member);
      syncMemberAdminRoleMap(findMemberForLogin(loginId) || member, role);
      clearNewAdminAccountForm();
      alert('관리자 아이디를 만들었습니다.\n\n아이디: ' + loginId + '\n이제 일반 로그인 화면에서 이 아이디와 임시 비밀번호로 접속할 수 있습니다.');
      renderAdmin();
    }

    function renderAdminStaffManager(members) {
      if (!isSuperAdminLoggedIn()) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 지정/권한변경/해제, 회원 강제탈퇴, 무료권 지급은 최고관리자만 가능합니다.</div></div>';
      }

      const withdrawnMembers = getVisibleWithdrawnMembers().map(item => ({ ...item, withdrawn:true, status:'강제탈퇴' }));
      const activeMembers = dedupeAdminMembersForDisplay(getAdminAllMemberRows());
      const counts = getAdminMemberCounts(activeMembers, withdrawnMembers);
      const folders = ['super','admin','all','normal','newSignup','monthly','due','grace14','suspended','newPay','extensionPay','refundRequest','refund','withdrawn'];
      const folderButtons = folders.map(key =>
        '<button type="button" class="' + (adminMemberFolder === key ? 'active' : '') + '" onclick="setAdminMemberFolder(\'' + escapeJs(key) + '\')">' +
          escapeHtml(getAdminFolderLabel(key)) + ' ' + (counts[key] || 0) +
        '</button>'
      ).join('');

      const source = adminMemberFolder === 'withdrawn' ? withdrawnMembers : activeMembers;
      let filtered = source.filter(member => filterAdminMembersByFolder(member, adminMemberFolder)).filter(member => adminMemberMatchesSearch(member, adminMemberSearchText));
      const pageSize = 20;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (adminMemberPage >= totalPages) adminMemberPage = totalPages - 1;
      const pageItems = filtered.slice(adminMemberPage * pageSize, adminMemberPage * pageSize + pageSize);

      const summary = '<div class="admin-summary-rows">' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>전체회원</b><span>' + counts.all + '명</span></div>' +
          '<div class="line"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +
          '<div class="line"><b>관리자</b><span>' + ((counts.super || 0) + (counts.admin || 0)) + '명</span></div>' +
          '<div class="line"><b>강제탈퇴</b><span>' + counts.withdrawn + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>1개월권</b><span>' + counts.monthly + '명</span></div>' +
          '<div class="line"><b>만료예정</b><span>' + counts.due + '명</span></div>' +
          '<div class="line"><b>유예14일 이상</b><span>' + counts.grace14 + '명</span></div>' +
          '<div class="line"><b>정지회원</b><span>' + counts.suspended + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>신규결제</b><span>' + counts.newPay + '명</span></div>' +
          '<div class="line"><b>연장결제</b><span>' + counts.extensionPay + '명</span></div>' +
          '<div class="line"><b>환불요청</b><span>' + counts.refundRequest + '명</span></div>' +
          '<div class="line"><b>환불처리</b><span>' + counts.refund + '명</span></div>' +
        '</div>' +
      '</div>';

      const rows = pageItems.map(member => {
        const name = getMemberDisplayName(member);
        const role = member.withdrawn ? '강제탈퇴' : (['운영관리자','조회관리자'].includes(member.adminRole) ? '관리자' : (member.adminRole || '일반회원'));
        const plan = getMemberPlanInfo(member);
        const eqCount = getMemberEquipmentCount(member);
        const status = getMemberStatusText(member);
        const roleBadge = '<span class="badge ' + getAdminRoleBadgeClass(role) + '">' + escapeHtml(role) + '</span>';
        const idText = getMemberMainId(member);
        const actionId = getAdminMemberActionId(member);
        const detailOpen = adminExpandedMemberId === actionId;
        const quickRoleButtons = '';
        return '<div class="admin-member-row">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + ' · ' + escapeHtml(member.signupMethod || member.provider || '일반회원') + '</div></div>' + roleBadge + '</div>' +
          '<div class="admin-member-summary">' +
            '<span><b>휴대폰</b>' + escapeHtml(member.phone || '-') + '</span>' +
            '<span><b>소셜계정</b>' + escapeHtml(getMemberSocialText(member)) + '</span>' +
            '<span><b>결제여부</b>' + escapeHtml(plan.label || '-') + '</span>' +
            '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
            '<span><b>장비등록</b>' + eqCount + '대</span>' +
            '<span><b>회원상태</b>' + escapeHtml(status) + '</span>' +
            '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="ghost" onclick="toggleAdminMemberDetail(\'' + escapeJs(actionId) + '\')">' + (detailOpen ? '상세닫기' : '상세관리') + '</button>' +
            quickRoleButtons +
          '</div>' +
          (detailOpen ? renderAdminMemberDetail(member) : '') +
        '</div>';
      }).join('') || '<div class="empty">조건에 맞는 회원이 없습니다.</div>';

      const pager = '<div class="admin-pager">' +
        '<button class="ghost" onclick="changeAdminMemberPage(-1)" ' + (adminMemberPage <= 0 ? 'disabled' : '') + '>이전 20명</button>' +
        '<span class="small">' + (adminMemberPage + 1) + ' / ' + totalPages + ' 페이지 · 검색결과 ' + filtered.length + '명</span>' +
        '<button class="ghost" onclick="changeAdminMemberPage(1)" ' + (adminMemberPage >= totalPages - 1 ? 'disabled' : '') + '>다음 20명</button>' +
      '</div>';

      return '<div class="card" style="box-shadow:none;margin-top:14px;">' +
        '<h3>약관동의 회원 상세정보 / 관리자관리</h3>' +
        '<div class="notice blue-note">관리자 화면은 Table Editor 원본 행 수를 그대로 보여주지 않고, 약관동의 완료 후 active 상태인 실제 회원만 상세정보에 표시합니다. 로그인만 했거나 중복으로 남은 카카오/네이버 행은 회원목록 숫자에 넣지 않습니다. 카카오/네이버/사이트 약관회원, 오늘 가입, 탈퇴 누계를 따로 표시하고, 탈퇴회원은 현재 회원수에서 제외합니다.</div>' +
        '<div class="actions" style="margin:8px 0 10px;"><button type="button" class="primary" onclick="syncSupabaseMembersForAdmin(true)" ' + (adminSupabaseMemberSyncing ? 'disabled' : '') + '>' + (adminSupabaseMemberSyncing ? '회원목록 불러오는 중' : '약관회원/가입통계 새로고침') + '</button><span class="small">' + escapeHtml(adminSupabaseMemberSyncMessage || (adminSupabaseMemberSyncedAt ? '마지막 동기화: ' + formatNullableDateTime(new Date(adminSupabaseMemberSyncedAt).toISOString()) : '관리자 화면 진입 시 약관동의 active 회원을 확인합니다.')) + '</span></div>' +
        renderAdminSignupMethodBoard(activeMembers) +
        summary +
        renderAdminPaymentStatusBoard(activeMembers) +
        renderAdminCreateAccountPanel() +
        '<div class="admin-member-toolbar"><div><input id="adminMemberSearchInput" type="text" placeholder="이름 / 아이디 / 휴대폰번호 / 카카오·네이버계정 검색" value="' + escapeHtml(adminMemberSearchText || '') + '" oncompositionstart="adminMemberSearchComposing=true" oncompositionend="finishAdminMemberSearchComposition(this)" oninput="handleAdminMemberSearchInput(this)" onkeydown="if(event.key===\'Enter\' && !adminMemberSearchComposing){applyAdminMemberSearch();}" /></div><div class="actions admin-search-actions"><button type="button" class="primary" onclick="applyAdminMemberSearch()">검색</button><button type="button" class="ghost" onclick="clearAdminMemberSearch()">초기화</button></div><div class="small">현재 폴더: <b>' + escapeHtml(getAdminFolderLabel(adminMemberFolder)) + '</b></div></div>' +
        '<div class="admin-folder-tabs">' + folderButtons + '</div>' +
        rows + pager +
      '</div>';
    }
