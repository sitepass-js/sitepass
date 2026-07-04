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



    function renderAdmin() {
      if (!isAdminLoggedIn()) { showScreen('signupScreen'); return; }
      if (!sitePassEquipmentSyncing && (!sitePassEquipmentSyncedAt || Date.now() - sitePassEquipmentSyncedAt > 30000)) {
        try { syncSupabaseEquipmentItems(true); } catch (e) {}
      }
      const items = getAdminVisibleEquipmentItems();
      const members = ensureMemberIds();
      let rawEquipmentItems = getItems();
      try {
        if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') rawEquipmentItems = window.SitePassArchive.filterArchiveVisibleItems(rawEquipmentItems);
      } catch (e) {}
      const rawEquipmentCount = rawEquipmentItems.length;
      const total = items.length;
      const paused = items.filter(isQrPaused).length;
      const expiringDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료임박').length, 0);
      const expiredDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료').length, 0);
      const paymentDue = items.filter(item => {
        if (!item.trialEndsAt || item.serviceStatus === '유료사용') return false;
        const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      }).length;
      const grace14Items = items.filter(isServiceGrace14Over).length;
      const contacts = getContacts();
      const waitingContacts = contacts.filter(x => x.status !== '답변완료').length;
      const visitStats = getVisitStats();
      const todayKey = getLocalDateKey();
      const todayVisitors = Number((visitStats.daily || {})[todayKey] || 0);
      const totalVisitors = Number(visitStats.total || 0);
      const todaySignups = countTodaySignups(members);
      const totalEquipmentCount = total;
      const topSummary = '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>관리자 요약 현황</h3>' +
        '<div class="small">장비 서버동기화: ' + escapeHtml(sitePassEquipmentSyncMessage || (sitePassEquipmentSyncedAt ? '마지막 확인 ' + formatNullableDateTime(new Date(sitePassEquipmentSyncedAt).toISOString()) : '대기 중')) + ' · 원본장비 ' + rawEquipmentCount + '대 / 활성회원 연결장비 ' + totalEquipmentCount + '대</div>' +
        '<div class="actions" style="margin:8px 0 4px;"><button type="button" class="ghost" onclick="cleanupOrphanEquipmentForAdmin()">장비/큐알 정리</button></div>' +
        '<div class="admin-summary-rows">' +
          '<div class="admin-summary-row">' +
            '<div class="line"><b>오늘방문자수</b><span>' + todayVisitors + '명</span></div>' +
            '<div class="line"><b>토탈방문자수</b><span>' + totalVisitors + '명</span></div>' +
          '</div>' +
          '<div class="admin-summary-row">' +
            '<div class="line"><b>오늘가입자수</b><span>' + todaySignups + '명</span></div>' +
            renderAdminQuickLine('전체장비등록수', totalEquipmentCount + '대', 'openAdminListQuickFilter(\'all\')') +
          '</div>' +
        '</div>' +
      '</div>';
      document.getElementById('adminBox').innerHTML =
        '<div class="notice blue-note"><b>현재 권한: ' + escapeHtml(getCurrentAdminRoleName()) + '</b><br>' + (isSuperAdminLoggedIn() ? '대표이사 최고관리자는 모든 관리 기능을 사용할 수 있으며, 직원 관리자 아이디 생성/비밀번호 재설정/해제가 가능합니다.' : '직원 관리자는 관리자모드 접속 권한만 부여된 상태입니다. 관리자 아이디 생성/해제는 최고관리자만 가능합니다.') + '</div>' +
        topSummary +
        renderAdminTodoSummary({ waitingContacts, paymentDue, paused, expiringDocs, expiredDocs, grace14Items }) +
        renderAdminStaffManager(members) + renderAdminContactManager();
    }

    function deleteItem(code) {
      const archive = getArchiveModule();
      if (archive.deleteItem) return archive.deleteItem(code);
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function clearAll() {
      const archive = getArchiveModule();
      if (archive.clearAll) return archive.clearAll();
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function getDocStatus(doc) {
      if (!doc.fileName) return doc.required ? '미첨부' : '선택안함';
      if (!doc.expiry || !doc.expireDate) return '첨부됨';
      const today = new Date();
      today.setHours(0,0,0,0);
      const end = new Date(doc.expireDate);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) return '만료';
      if (diff <= 30) return '만료임박';
      return '정상';
    }

    function getDdayText(dateValue) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateValue);
      const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (Number.isNaN(diff)) return '';
      if (diff < 0) return '만료 ' + Math.abs(diff) + '일 지남';
      if (diff === 0) return '오늘 만료';
      return 'D-' + diff;
    }

    function makeAlertSummary(docs) {
      const targets = ['equipmentInspection','insurancePolicy','ndtInspection','driverLicense'];
      const parts = targets.map(key => docs[key]).filter(Boolean).filter(doc => doc.expireDate).map(doc => doc.title + ' ' + getDdayText(doc.expireDate));
      return parts.length ? parts.join(' / ') : '만료날짜 입력 없음';
    }

    function openPreviewModal(src) {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (frame) frame.src = '';
      modal.classList.remove('pdf');
      img.src = src;
      modal.classList.add('show');
    }

    function openPdfPreview(src) {
      if (!src) {
        alert('PDF 미리보기 파일이 없습니다. 파일선택으로 다시 첨부하면 바로 미리볼 수 있습니다.');
        return;
      }
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (img) img.src = '';
      if (frame) frame.src = src;
      modal.classList.add('pdf');
      modal.classList.add('show');
    }

    function closePreviewModal() {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      modal.classList.remove('show');
      modal.classList.remove('pdf');
      img.src = '';
      if (frame) frame.src = '';
    }


    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function escapeJs(value) {
      return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
    }

    function getActiveInstallGuidePanel() {
      const panels = Array.from(document.querySelectorAll('[data-install-manual-guide]'));
      return panels.find(panel => {
        const screen = panel.closest('.screen');
        return screen && !screen.classList.contains('hidden');
      }) || panels[0] || null;
    }

    function setHomeInstallStatus(message) {
      document.querySelectorAll('[data-install-status]').forEach(status => { status.innerHTML = message; });
    }

    function isHomeInstallGuidePanelOpen() {
      const guide = getActiveInstallGuidePanel();
      return !!(guide && !guide.classList.contains('hidden'));
    }

    function openHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (message) setHomeInstallStatus(message);
      if (guide) {
        guide.classList.remove('hidden');
        updateHomeInstallButtonState();
        try { guide.scrollIntoView({ behavior:'smooth', block:'center' }); } catch (e) {}
      }
    }

    function closeHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (guide) guide.classList.add('hidden');
      if (message) setHomeInstallStatus(message);
      updateHomeInstallButtonState();
    }

    function isSitePassStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function getSitePassInstallFallbackMessage() {
      const ua = navigator.userAgent || '';
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isKakao = /KAKAOTALK/i.test(ua);
      const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';

      if (isSitePassStandalone()) {
        return '이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.';
      }
      if (location.protocol === 'file:') {
        return '현재는 PC에서 파일을 직접 연 상태라 설치창이 뜨지 않습니다. 정식 https 주소에 올린 뒤 <b>홈화면에 설치하기</b> 버튼을 확인해야 합니다.';
      }
      if (!isSecure) {
        return '설치창을 띄우려면 https 보안주소가 필요합니다. 정식 도메인 또는 HTTPS 베타 주소에서 다시 눌러주세요.';
      }
      if (isKakao) {
        return '카카오톡 안에서는 설치창이 잘 안 뜰 수 있습니다. 먼저 <b>외부 브라우저로 열기</b>를 누른 뒤 설치해주세요.';
      }
      if (isIOS) {
        return '아이폰은 버튼 한 번으로 설치창을 강제로 열 수 없습니다. 공유 버튼(□↑)에서 <b>홈 화면에 추가</b>를 눌러 저장합니다.';
      }
      return '브라우저가 아직 설치 가능 신호를 보내지 않았습니다. 20~30초 정도 사용 후 다시 누르거나, 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러주세요.';
    }

    function updateHomeInstallButtonState(message) {
      const buttons = Array.from(document.querySelectorAll('[data-install-primary-button]'));
      buttons.forEach(btn => {
        if (isSitePassStandalone()) {
          btn.textContent = '이미 설치됨';
          btn.disabled = true;
        } else if (isHomeInstallGuidePanelOpen()) {
          btn.textContent = '설치 안내 접기';
          btn.disabled = false;
        } else if (deferredSitePassInstallPrompt) {
          btn.textContent = '홈화면에 설치하기';
          btn.disabled = false;
        } else {
          btn.textContent = '홈화면에 설치하기';
          btn.disabled = false;
        }
      });
      if (message) setHomeInstallStatus(message);
    }

    async function addSitePassToHomeScreen(event) {
      if (event && event.preventDefault) event.preventDefault();

      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다. 필요하면 다시 <b>홈화면에 설치하기</b>를 눌러주세요.');
        return false;
      }

      if (isSitePassStandalone()) {
        openHomeInstallGuidePanel('이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.');
        updateHomeInstallButtonState();
        return false;
      }

      if (deferredSitePassInstallPrompt) {
        try {
          deferredSitePassInstallPrompt.prompt();
          const choice = await deferredSitePassInstallPrompt.userChoice;
          deferredSitePassInstallPrompt = null;
          if (choice && choice.outcome === 'accepted') {
            closeHomeInstallGuidePanel('홈화면 추가가 진행되었습니다. 설치가 끝나면 현장서류패스 아이콘으로 들어오면 됩니다.');
          } else {
            openHomeInstallGuidePanel('설치창을 닫았습니다. 필요하면 아래 방법으로 직접 추가할 수 있습니다.');
          }
          updateHomeInstallButtonState();
        } catch (e) {
          deferredSitePassInstallPrompt = null;
          openHomeInstallGuidePanel('이 브라우저에서는 자동 설치창이 뜨지 않아 아래 방법으로 직접 추가하면 됩니다.');
          updateHomeInstallButtonState();
        }
        return false;
      }

      openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      return false;
    }

    function showHomeInstallGuide(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다.');
      } else {
        openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      }
      return false;
    }


    const SITEPASS_RECOMMEND_INSTALL_URL = 'https://sitepass-js.github.io/sitepass/recommend.html';

    function getSitePassQueryParam(name) {
      try { return new URLSearchParams(location.search || '').get(name) || ''; } catch (e) { return ''; }
    }

    function isSitePassRecommendInstallRequest() {
      const install = getSitePassQueryParam('install');
      const ref = getSitePassQueryParam('ref') || getSitePassQueryParam('from');
      return install === '1' || install === 'home' || install === 'app' || ref === 'recommend' || ref === 'invite';
    }

    function copyRecommendInstallLink() {
      copyTextFallback(SITEPASS_RECOMMEND_INSTALL_URL, '추천용 설치 링크를 복사했습니다.\n카카오톡/문자로 보내면 받은 사람이 설치화면으로 바로 들어옵니다.');
    }

    function openRecommendInstallLanding() {
      if (!isSitePassRecommendInstallRequest()) return false;
      if (isSitePassStandalone()) return false;
      showScreen('installScreen', { replace:true });
      const linkText = document.getElementById('recommendInstallLinkText');
      if (linkText) linkText.textContent = SITEPASS_RECOMMEND_INSTALL_URL;
      setHomeInstallStatus('추천링크로 접속했습니다. 아래 <b>홈화면에 설치하기</b>를 누르면 설치 가능한 브라우저는 설치창이 열리고, 안 뜨면 수동 방법을 따라 추가하면 됩니다.');
      setTimeout(function() {
        if (!deferredSitePassInstallPrompt && !isSitePassStandalone()) {
          openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
        } else {
          updateHomeInstallButtonState('설치 준비가 완료되면 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
        }
      }, 900);
      return true;
    }

    // v23.7.259: PWA 자동업데이트/서비스워커 등록은 assets/js/pwa-update.js로 분리했습니다.
    const SITEPASS_APP_VERSION = (window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.appVersion) || 'v23.7.282';
    const SITEPASS_FIXED_APP_URL = 'https://sitepass-js.github.io/sitepass/';

    window.SitePassPwaRuntime = window.SitePassPwaRuntime || {};
    Object.assign(window.SitePassPwaRuntime, {
      getAppVersion: function(){ return SITEPASS_APP_VERSION; },
      getFixedAppUrl: function(){ return SITEPASS_FIXED_APP_URL; },
      setHomeInstallStatus: function(message){ return setHomeInstallStatus(message); },
      isStandalone: function(){ return isSitePassStandalone(); },
      hasDeferredInstallPrompt: function(){ return !!deferredSitePassInstallPrompt; }
    });

    function getPwaUpdateModule() {
      return window.SitePassPwaUpdate || {};
    }

    async function checkSitePassAutoUpdate() {
      const mod = getPwaUpdateModule();
      if (mod.checkAutoUpdate) return mod.checkAutoUpdate();
    }

    function registerSitePassServiceWorker() {
      const mod = getPwaUpdateModule();
      if (mod.registerServiceWorker) return mod.registerServiceWorker();
      setHomeInstallStatus('PWA 업데이트 파일을 불러오지 못했습니다. assets/js/pwa-update.js 업로드를 확인해주세요.');
    }

    window.forceSitePassUpdateReload = function() {
      const mod = getPwaUpdateModule();
      if (mod.forceUpdateReload) return mod.forceUpdateReload(SITEPASS_APP_VERSION);
      location.reload();
    };

    window.addEventListener('load', function() {
      setTimeout(checkSitePassAutoUpdate, 600);
      setTimeout(openRecommendInstallLanding, 1100);
    });

    const DEMO_MANAGER_CODE = 'SP-DEMO-00BO0000';

    function makeDemoPreviewDataUrl(title, line1, line2) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1260" viewBox="0 0 900 1260">' +
        '<rect width="900" height="1260" fill="#ffffff"/>' +
        '<rect x="55" y="55" width="790" height="1150" rx="28" fill="#f8fbff" stroke="#c9d3e4" stroke-width="5"/>' +
        '<text x="450" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="#172033">' + escapeHtml(title) + '</text>' +
        '<rect x="125" y="220" width="650" height="4" fill="#2457d6"/>' +
        '<text x="130" y="320" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#26334d">' + escapeHtml(line1) + '</text>' +
        '<text x="130" y="395" font-family="Arial, sans-serif" font-size="34" fill="#667085">' + escapeHtml(line2) + '</text>' +
        '<text x="130" y="500" font-family="Arial, sans-serif" font-size="30" fill="#667085">SitePass 담당자 화면 데모용 미리보기입니다.</text>' +
        '<rect x="130" y="575" width="640" height="420" rx="18" fill="#ffffff" stroke="#d7dfed" stroke-width="4"/>' +
        '<text x="450" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#173f9f">첨부 서류 이미지</text>' +
        '<text x="450" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#667085">실제 서비스에서는 촬영/업로드 원본이 표시됩니다.</text>' +
        '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

