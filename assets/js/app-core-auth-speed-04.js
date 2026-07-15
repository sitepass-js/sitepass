// SitePass v23.7.350 - speed optimized medium chunk (app-core-auth-speed 04/04)
// ---- merged from app-core-auth-16.js ----
// SitePass v23.7.350 - app-core-auth finer split (16/19)
function submitSitePassSignupTest() {
      const name = (document.getElementById('sitepassSignupName')?.value || '').trim();
      const birth6 = (document.getElementById('sitepassSignupJuminMasked')?.value || '').replace(/[^0-9]/g, '').slice(0, 6);
      const phone = (document.getElementById('sitepassSignupPhone')?.value || '').trim();
      const carrier = (document.getElementById('sitepassSignupCarrier')?.value || '').trim();
      const signupId = normalizeLoginText((document.getElementById('sitepassSignupId')?.value || '').trim());
      const pw = document.getElementById('sitepassSignupPw')?.value || '';
      const pw2 = document.getElementById('sitepassSignupPw2')?.value || '';
      if (!name || !phone || !birth6 || !carrier || !signupId || !pw || !pw2) {
        alert('이름, 주민번호 6자리, 휴대폰번호, 통신사, SitePass 아이디, 비밀번호를 모두 입력해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(birth6)) {
        alert('주민번호는 앞 6자리만 입력해주세요.');
        return;
      }
      const signupVerifiedMarker460 = window.__sitepassV460SignupVerifiedMarker;
      const signupPhoneDigits460 = String(phone || '').replace(/[^0-9]/g, '');
      const currentVerificationId460 = String(window.__sitepassV351SignupVerificationId || '');
      if (!sitepassSignupPhoneVerified || !signupVerifiedMarker460 || !signupVerifiedMarker460.responseOk ||
          !signupVerifiedMarker460.verificationId || signupVerifiedMarker460.verificationId !== currentVerificationId460 ||
          signupVerifiedMarker460.phone !== signupPhoneDigits460) {
        sitepassSignupPhoneVerified = false;
        window.__sitepassV351SignupVerifiedPayload = null;
        window.__sitepassV460SignupVerifiedMarker = null;
        alert('휴대폰 인증 확인이 완료되지 않아 회원가입을 저장할 수 없습니다.\n인증번호를 다시 확인해주세요.');
        toggleSitePassSignupAccountStage(false);
        return;
      }
      if (signupId.length < 4) {
        alert('SitePass 아이디는 4자 이상으로 입력해주세요.');
        document.getElementById('sitepassSignupId')?.focus();
        return;
      }
      const signupIdKey = normalizeLoginText(signupId);
      if (!sitepassSignupIdVerified || sitepassSignupIdVerifiedValue !== signupIdKey) {
        alert('SitePass 아이디 중복확인을 먼저 완료해주세요.');
        document.getElementById('sitepassSignupId')?.focus();
        return;
      }
      if (findMemberBySignupIdOnly(signupId) || findMemberForLogin(signupId)) {
        sitepassSignupIdVerified = false;
        sitepassSignupIdVerifiedValue = '';
        const status = document.getElementById('sitepassSignupIdStatus');
        if (status) status.textContent = '이미 등록된 아이디입니다. 다른 아이디를 입력해주세요.';
        alert('이미 등록된 사용자 아이디가 있습니다. 다른 아이디를 입력해주세요.\n기존 계정이 본인 계정이면 아이디 찾기 또는 비밀번호 찾기를 이용해주세요.');
        document.getElementById('sitepassSignupId')?.focus();
        return;
      }
      if (checkSitePassSignupPhoneDuplicateAndMove(phone, name)) return;
      if (pw.length < 6) {
        alert('비밀번호는 6자 이상으로 입력해주세요.');
        return;
      }
      if (pw !== pw2) {
        alert('비밀번호와 비밀번호 확인이 다릅니다.');
        return;
      }
      const member = {
        name,
        phone,
        signupIdentityName:name,
        signupIdentityPhone:String(phone || '').replace(/[^0-9]/g, ''),
        verifiedName:name,
        verifiedPhone:String(phone || '').replace(/[^0-9]/g, ''),
        carrier,
        birth6,
        genderDigit:'',
        juminMasked: birth6 + '******',
        identityVerified:true,
        identityVerifiedAt:new Date().toISOString(),
        phoneVerified:true,
        phoneVerifiedAt: new Date().toISOString(),
        provider:'SitePass',
        providerId:'SITEPASS-' + signupId,
        signupId,
        passwordSet:true,
        testPassword: pw,
        signupMethod:'SitePass 회원가입',
        agreements:getSignupAgreements()
      };
      try {
        if (typeof window.sitePassMarkNewSignupGrace463 === 'function') window.sitePassMarkNewSignupGrace463(member); else if (typeof window.sitePassMarkNewSignupGrace460 === 'function') window.sitePassMarkNewSignupGrace460(member);
      } catch (e) {}
      try { if (typeof window.sitePassStoreSignupProfile463 === 'function') window.sitePassStoreSignupProfile463(member); else if (typeof window.sitePassStoreSignupProfile462 === 'function') window.sitePassStoreSignupProfile462(member); } catch (e) {}
      saveMemberTest(member);
      completeMemberLoginTest(member, 'SitePass 회원가입이 완료되었습니다.\n이제 SitePass 메인 화면으로 이동합니다.');
      ['sitepassSignupName','sitepassSignupPhone','sitepassSignupJuminMasked','sitepassSignupBirth6','sitepassSignupGenderDigit','sitepassSignupCarrier','sitepassSignupCode','sitepassSignupId','sitepassSignupPw','sitepassSignupPw2'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
      resetSitePassSignupPhoneAuth();
      resetSitePassSignupIdDuplicate();
      showScreen('homeScreen');
    }

    function getContacts() {
      const storage = getStorageModule();
      if (storage.getList) return storage.getList(CONTACT_STORAGE_KEY);
      try { return JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) || '[]'); } catch (error) { return []; }
    }

    function setContacts(list) {
      const storage = getStorageModule();
      if (storage.setList) return storage.setList(CONTACT_STORAGE_KEY, list || []);
      localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(list || []));
    }


    function openCompanyKakaoInquiry() {
      if (COMPANY_KAKAO_CHANNEL_URL) {
        window.open(COMPANY_KAKAO_CHANNEL_URL, '_blank');
        return;
      }
      alert('아직 실제 카카오톡 채널 URL은 연결하지 않은 임시 버튼입니다.\n제이에스건설 카카오톡 채널을 만든 뒤 채널 URL을 넣으면 이 버튼에서 바로 채널추가/1:1 문의로 연결됩니다.');
    }

    function copyCompanyKakaoName() {
      const text = COMPANY_KAKAO_CHANNEL_NAME + ' 카카오톡 채널';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => alert('채널명이 복사되었습니다.\n' + text)).catch(() => alert(text));
      } else {
        alert(text);
      }
    }

    function submitContactTest() {
      const name = (document.getElementById('contactName')?.value || '').trim();
      const phone = (document.getElementById('contactPhone')?.value || '').trim();
      const type = (document.getElementById('contactType')?.value || '').trim();
      const message = (document.getElementById('contactMessage')?.value || '').trim();
      if (!name || !phone || !message) {
        alert('이름/업체명, 연락처, 문의 내용을 입력해주세요.');
        return;
      }
      const contacts = getContacts();
      contacts.unshift({
        id:'Q' + Date.now() + '_' + Math.random().toString(36).slice(2, 6).toUpperCase(),
        name,
        phone,
        type,
        message,
        reply:'',
        status:'답변대기',
        createdAt:new Date().toISOString(),
        repliedAt:'',
        adminReadAt:'',
        memberReadAt:''
      });
      setContacts(contacts);
      alert('문의가 접수되었습니다.\n관리자모드에서 문의 내용을 확인하고 답변할 수 있습니다.');
      document.getElementById('contactMessage').value = '';
      renderContactHistory();
    }

    function renderContactHistory() {
      const box = document.getElementById('contactHistoryBox');
      if (!box) return;
      const contacts = getContacts();
      if (!contacts.length) {
        box.innerHTML = '<div class="card" style="box-shadow:none;margin-bottom:0;"><h3>내 문의 확인</h3><div class="empty">아직 접수된 문의가 없습니다.</div></div>';
        return;
      }
      const rows = contacts.map(item => {
        const statusClass = item.status === '답변완료' ? 'done' : 'need';
        const replyHtml = item.reply
          ? '<div class="notice blue-note"><b>관리자 답변</b><br>' + escapeHtml(item.reply).replace(/\n/g, '<br>') + '<div class="small" style="margin-top:8px;">답변일: ' + escapeHtml(formatDateTime(item.repliedAt)) + '</div></div>'
          : '<div class="date-note">아직 관리자 답변이 없습니다.</div>';
        return '<div class="list-item">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(item.type || '문의') + '</strong><div class="small">' + escapeHtml(formatDateTime(item.createdAt)) + ' · ' + escapeHtml(item.name || '') + '</div></div><span class="badge ' + statusClass + '">' + escapeHtml(item.status || '답변대기') + '</span></div>' +
          '<div class="date-note">' + escapeHtml(item.message || '').replace(/\n/g, '<br>') + '</div>' + replyHtml +
        '</div>';
      }).join('');
      box.innerHTML = '<div class="card" style="box-shadow:none;margin-bottom:0;"><h3>내 문의 확인</h3>' + rows + '</div>';
    }

    function formatDateTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    }

// ---- merged from app-core-auth-17.js ----
// SitePass v23.7.350 - app-core-auth finer split (17/19)
function renderAdminContactManager() {
      const contacts = getContacts();
      const adminOpenedAt = new Date().toISOString();
      let readStateChanged = false;
      contacts.forEach(item => {
        const isChat = item && (item.source === 'sitepass_chat_v460' || item.memberLoginId || item.member_login_id || item.memberKey);
        if (isChat && item.message && !item.adminReadAt) {
          item.adminReadAt = adminOpenedAt;
          readStateChanged = true;
        }
      });
      if (readStateChanged) setContacts(contacts);
      const waiting = contacts.filter(x => x.status !== '답변완료').length;
      if (!contacts.length) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>채팅관리</h3><div class="notice blue-note">관리자 채팅방은 로그인 회원 아이디로 문의자를 자동 구분합니다. 회원이 이름·전화번호·이메일을 다시 입력하지 않아도 됩니다.</div><div class="empty">접수된 문의가 없습니다.</div></div>';
      }
      const rows = contacts.map(item => {
        const statusClass = item.status === '답변완료' ? 'done' : 'need';
        const memberLabel = item.memberLoginId || item.member_login_id || item.memberKey || item.name || '회원정보 없음';
        const adminReadLabel = item.adminReadAt ? '관리자 읽음' : '관리자 안 읽음';
        const memberReadLabel = item.reply ? (item.memberReadAt ? '회원 읽음' : '회원 안 읽음') : '답변 전';
        return '<div class="list-item" data-contact-id="' + escapeHtml(item.id) + '">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(item.type || '문의') + ' · ' + escapeHtml(memberLabel) + '</strong><div class="small">회원명: ' + escapeHtml(item.name || '미확인') + '<br>접수일: ' + escapeHtml(formatDateTime(item.createdAt)) + '</div></div><span class="badge ' + statusClass + '">' + escapeHtml(item.status || '답변대기') + '</span></div>' +
          '<div class="sitepass-admin-chat-read-state"><span>' + escapeHtml(adminReadLabel) + '</span><span>' + escapeHtml(memberReadLabel) + '</span></div>' +
          '<div class="date-note"><b>문의내용</b><br>' + escapeHtml(item.message || '').replace(/\n/g, '<br>') + '</div>' +
          '<div class="field" style="margin-top:10px;"><label>관리자 답변</label><textarea id="reply_' + escapeHtml(item.id) + '" rows="4" style="min-height:96px; resize:vertical;" placeholder="답변 내용을 입력하세요.">' + escapeHtml(item.reply || '') + '</textarea></div>' +
          '<div class="actions"><button class="primary" onclick="saveContactReply(\'' + escapeJs(item.id) + '\')">답변 저장</button><button class="okBtn" onclick="markContactDone(\'' + escapeJs(item.id) + '\')">처리완료</button><button class="dangerBtn" onclick="deleteContact(\'' + escapeJs(item.id) + '\')">문의 삭제</button></div>' +
        '</div>';
      }).join('');
      return '<div id="adminContactManagerCard" class="card" style="box-shadow:none;margin-top:14px;"><h3>채팅관리</h3><div class="notice blue-note">로그인 회원 아이디로 문의자를 자동 식별합니다. 답변을 저장하면 해당 회원의 관리자 채팅방에 관리자 말풍선으로 표시됩니다.</div><div class="line"><b>답변대기</b><span>' + waiting + '건</span></div>' + rows + '</div>';
    }

    function saveContactReply(id) {
      const contacts = getContacts();
      const target = contacts.find(x => x.id === id);
      if (!target) return;
      const reply = (document.getElementById('reply_' + id)?.value || '').trim();
      if (!reply) {
        alert('답변 내용을 입력해주세요.');
        return;
      }
      target.reply = reply;
      target.status = '답변완료';
      target.adminReadAt = target.adminReadAt || new Date().toISOString();
      target.memberReadAt = '';
      target.repliedAt = new Date().toISOString();
      setContacts(contacts);
      alert('답변이 저장되었습니다.');
      renderAdmin();
    }

    function markContactDone(id) {
      const contacts = getContacts();
      const target = contacts.find(x => x.id === id);
      if (!target) return;
      if (!target.reply) {
        const ok = confirm('답변 내용 없이 처리완료로 표시할까요?');
        if (!ok) return;
      }
      target.status = '답변완료';
      target.adminReadAt = target.adminReadAt || new Date().toISOString();
      target.repliedAt = target.repliedAt || new Date().toISOString();
      setContacts(contacts);
      renderAdmin();
    }

    function deleteContact(id) {
      if (!confirm('이 문의를 삭제할까요?')) return;
      setContacts(getContacts().filter(x => x.id !== id));
      renderAdmin();
    }

    let sitePassCurrentScreenId = '';
    let sitePassHistoryReady = false;
    let sitePassHandlingPopState = false;

    function isSitePassHashRouteActive() {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const authHashRouteActive =
        hash === '#login' || hash === '#sitepass-login' ||
        hash === '#join' || hash === '#signup' || hash === '#sitepass-join' ||
        hash === '#find-id' || hash === '#id-find' || hash === '#sitepass-find-id' ||
        hash === '#find-password' || hash === '#password-find' || hash === '#sitepass-find-password';
      return authHashRouteActive || hash.startsWith('#pay=') || hash.startsWith('#qr=');
    }

    function rememberSitePassScreen(id, options) {
      if (!id) return;
      try {
        const restorable = ['homeScreen','registerScreen','listScreen','contactScreen','pricingScreen','usageGuideScreen','adminScreen'];
        if (restorable.includes(id)) sessionStorage.setItem('sitepass_last_screen_v491', id);
      } catch (e) {}
      if (!window.history || !window.history.replaceState) return;
      if (sitePassHandlingPopState || (options && options.skipHistory) || isSitePassHashRouteActive()) return;
      const state = { sitepassScreen: id };
      const title = document.title || 'SitePass';
      try {
        if (!sitePassHistoryReady || (options && options.replace)) {
          window.history.replaceState(state, title, window.location.pathname + window.location.search);
          sitePassHistoryReady = true;
          return;
        }
        if (sitePassCurrentScreenId && sitePassCurrentScreenId !== id) {
          window.history.pushState(state, title, window.location.pathname + window.location.search);
        } else if (!window.history.state || !window.history.state.sitepassScreen) {
          window.history.replaceState(state, title, window.location.pathname + window.location.search);
        }
      } catch (e) {}
    }

    function showScreen(id, options) {
      // v23.7.509-test: 메인 앱 화면 전환은 회원·관리자·기존 QR 화면만 담당합니다.
      // 담당자 링크는 recipient.html에서 독립 실행되어 showScreen과 충돌하지 않습니다.
      const managerOnlyScreens = ['publicScreen'];
      // v23.7.463: 내정보는 화면을 열기 전에 현재 비밀번호를 다시 확인합니다.
      if (sitePassCurrentScreenId === 'myAccountScreen' && id !== 'myAccountScreen') {
        try { if (typeof window.sitePassLockMyAccount462 === 'function') window.sitePassLockMyAccount462(); } catch (e) {}
      }
      if (id === 'myAccountScreen' && !(options && options.myAccountVerified) && !window.__sitepassMyAccountVerified462) {
        try { if (typeof window.openMyAccountScreen === 'function') window.openMyAccountScreen(); } catch (e) {}
        return;
      }
      if (sitePassCurrentScreenId === 'registerScreen' && id !== 'registerScreen') {
        // v23.7.350: 등록완료 후 보관함으로 즉시 이동할 때는
        // 나가기 확인/등록중 자동저장을 다시 실행하지 않습니다.
        // v317에서는 여기서 saveRegistrationDraftNow()가 다시 돌면서
        // 이미지/서류 임시저장 때문에 등록완료 화면 이동이 오래 멈출 수 있었습니다.
        if (!window.sitePassFastCompletingRegistration) {
          if (typeof confirmLeaveRegistrationIfNeeded === 'function' && !confirmLeaveRegistrationIfNeeded(id)) return;
          saveRegistrationDraftNow();
        }
      }
      const memberProtectedScreens = ['homeScreen','usageGuideScreen','registerScreen','listScreen','pricingScreen','contactScreen','detailScreen'];
      if (memberProtectedScreens.includes(id) && !isMemberLoggedIn() && !isAdminLoggedIn()) {
        id = 'signupScreen';
      }
      if (id === 'adminScreen' && !isAdminLoggedIn()) {
        id = 'signupScreen';
      }
      document.body.classList.toggle('manager-view-mode', managerOnlyScreens.includes(id));
      document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
      const target = document.getElementById(id);
      if (target) target.classList.remove('hidden');
      // v23.7.216: 새로고침 때 로그인창이 먼저 보였다가 사라지는 깜빡임 방지.
      // 세션/소셜 콜백 확인이 끝난 뒤 최종 화면을 정한 다음에만 화면을 공개합니다.
      document.body.classList.remove('sitepass-booting');
      if (id === 'homeScreen') {
        updateHomeRegistrationButton();
        // v23.7.350: 서버 100% 기준 전환.
        // 홈 진입 시 PC localStorage 자동 재업로드는 하지 않고, 서버의 내 보관함만 불러옵니다.
        if (typeof syncSupabaseMyEquipmentItems === 'function' && isMemberLoggedIn() && !isAdminLoggedIn()) {
          setTimeout(function(){ try { syncSupabaseMyEquipmentItems(true); } catch (e) {} }, 180);
        }
      }
      if (id === 'installScreen') updateHomeInstallButtonState();
      if (id === 'listScreen') {
        if (window.sitePassFastCompletingRegistration && typeof window.sitePassRenderFastListAfterRegistration === 'function') {
          const renderedFastList = window.sitePassRenderFastListAfterRegistration();
          if (!renderedFastList) renderList();
        } else {
          renderList();
        }
        if (typeof syncSupabaseMyEquipmentItems === 'function' && isMemberLoggedIn() && !isAdminLoggedIn()) {
          setTimeout(function(){ try { syncSupabaseMyEquipmentItems(true); } catch (e) {} }, 120);
        }
      }
      if (id === 'pricingScreen') renderPricingScreen();
      if (id === 'registerScreen') { const docBox = document.getElementById('docCards'); if (docBox && !docBox.innerHTML.trim()) renderDocCards(); renderAlertPreview(); renderBundleSummary(); updateRegisterModeUi(); updateRegistrationDraftNotice(); }
      if (id === 'adminScreen') { renderAdmin(); setTimeout(() => syncSupabaseMembersForAdmin(false), 80); }
      if (id === 'contactScreen') renderContactHistory();
      if (id === 'signupScreen') {
        const box = document.getElementById('sitepassSignupBox');
        if (box) box.classList.add('hidden');
        const joinBox = document.getElementById('joinChoiceBox');
        if (joinBox) joinBox.classList.add('hidden');
        const pwInput = document.getElementById('sitepassLoginPassword');
        // v23.7.216: 로그인 첫화면을 다시 그릴 때 브라우저가 채운 저장 비밀번호를 지우지 않습니다.
        if (pwInput) { pwInput.classList.remove('hidden'); }
        const continueButton = document.getElementById('sitepassLoginContinueButton');
        if (continueButton) continueButton.textContent = '로그인';
        document.body.classList.remove('quick-first-mode', 'show-normal-login');
        resetSitePassSignupPhoneAuth();
        setTimeout(stabilizeLoginAutofillFields, 60);
      }
      refreshAdminUi();
      rememberSitePassScreen(id, options || {});
      sitePassCurrentScreenId = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function isAdminLoggedIn() {
      return getSessionValue(ADMIN_SESSION_KEY) === 'yes';
    }

    function openHomeContactOrAdmin() {
      if (isAdminLoggedIn()) {
        showScreen('adminScreen');
      } else {
        showScreen('contactScreen');
      }
    }

    function refreshAdminUi() {
      const loggedIn = isAdminLoggedIn();
      document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !loggedIn));
      const statePill = document.getElementById('adminStatePill');
      const signupTopButton = document.getElementById('signupTopButton');
      const logoutButton = document.getElementById('adminLogoutButton');
      const accountBtn = document.getElementById('myAccountButton');
      const homeBtn = document.getElementById('memberHomeButton');
      if (statePill) { statePill.textContent = loggedIn ? getCurrentAdminRoleName() : '관리자모드'; statePill.classList.toggle('hidden', !loggedIn); }
      if (signupTopButton) signupTopButton.classList.toggle('hidden', loggedIn);
      if (logoutButton) logoutButton.classList.toggle('hidden', !loggedIn);
      if (accountBtn) accountBtn.classList.toggle('hidden', !(loggedIn || isMemberLoggedIn()));
      if (homeBtn) homeBtn.classList.toggle('hidden', !(loggedIn || isMemberLoggedIn()));
    }

    async function adminLogin() {
      const id = normalizeLoginText(document.getElementById('adminIdInput')?.value || document.getElementById('sitepassLoginIdentifier')?.value);
      const pw = normalizeLoginText(document.getElementById('adminPwInput')?.value || document.getElementById('sitepassLoginPassword')?.value);
      if (isSuperAdminLoginId(id) && pw === ADMIN_PASSWORD) {
        alert('최고관리자 비상 접속 완료. 관리자 화면으로 이동합니다.');
        completeSuperAdminLogin();
        return;
      }
      const member = findMemberForLogin(id);
      const mappedRole = getMappedAdminRoleForLogin(id);
      let resolvedRole = getLocalAdminRoleForLogin(id, member) || mappedRole;
      if (!resolvedRole) resolvedRole = await fetchSupabaseAdminRoleForLogin(id);
      if (resolvedRole && (!member || isMemberPasswordOk(member, pw))) {
        if (member) {
          member.adminRole = resolvedRole;
          saveMemberTest(member);
        }
        completeAdminLogin(resolvedRole, id, member?.name || id);
        return;
      }
      alert('계정 또는 비밀번호가 맞지 않습니다.');
    }

// ---- merged from app-core-auth-18.js ----
// SitePass v23.7.350 - app-core-auth finer split (18/19)
function adminLogout() {
      removeSessionValue(ADMIN_SESSION_KEY);
      removeSessionValue(ADMIN_SESSION_KEY + '_role');
      removeSessionValue(ADMIN_SESSION_KEY + '_id');
      removeSessionValue(ADMIN_SESSION_KEY + '_name');
      try { sessionStorage.removeItem('sitepass_last_screen_v491'); } catch (e) {}
      clearPwaAutoMemberTest();
      refreshAdminUi();
      alert('로그아웃했습니다.');
      // v23.7.428: 관리자 로그아웃도 회원가입 화면이 아니라 첫 로그인 화면으로 이동합니다.
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({ sitepassScreen: 'signupScreen' }, document.title || 'SitePass', window.location.pathname + window.location.search);
        }
      } catch (e) {}
      showScreen('signupScreen');
      setTimeout(function(){
        try {
          if (typeof window.backToSitePassFirstLanding === 'function') {
            window.backToSitePassFirstLanding();
          }
        } catch (e) {}
      }, 40);
    }

    function notReady(name) {
      alert(name + ' 화면은 다음 단계에서 장비서류와 분리된 코드로 붙입니다. 지금은 장비서류 등록·QR공유·요금/관리자 흐름을 먼저 고정합니다.');
    }

    function isPrivateDocCard(card) {
      if (!card) return false;
      const groupKey = card.dataset.groupKey || 'equipment';
      return groupKey === 'driver' || groupKey === 'worker';
    }

    function isPrivateDocAuthVerified(card) {
      if (!isPrivateDocCard(card)) return true;
      return card.dataset.authVerified === 'true';
    }

    function getPrivateDocLockTargetText(card) {
      const groupKey = card?.dataset?.groupKey || '';
      if (groupKey === 'driver') return '기사 본인 동의/인증을 먼저 완료하면 기사서류 전체가 열립니다.';
      if (groupKey === 'worker') return '인부는 1명마다 동의/인증을 먼저 완료한 뒤 추가해야 서류 업로드가 열립니다.';
      return '인증 완료 후 파일선택/사진찍기를 사용할 수 있습니다.';
    }

    function requirePrivateDocAuth(card) {
      if (!isPrivateDocCard(card) || isPrivateDocAuthVerified(card)) return true;
      const title = card.dataset.docTitle || '개인정보 서류';
      alert(title + '는 6자리 인증 전에는 파일선택/사진찍기를 사용할 수 없습니다.\n' + getPrivateDocLockTargetText(card) + '\n인증번호는 네이버 SENS 문자로 실제 발송됩니다.');
      const groupKey = card.dataset.groupKey || '';
      const panel = groupKey === 'driver'
        ? document.querySelector('[data-person-auth-panel="driver"]')
        : card.closest('.worker-person-card') || document.querySelector('[data-person-auth-panel="worker"]');
      if (panel) panel.scrollIntoView({ behavior:'smooth', block:'center' });
      return false;
    }

    function setDocCardAuthVerified(card, meta = {}) {
      if (!card) return;
      card.dataset.authVerified = 'true';
      card.dataset.authVerifiedAt = meta.verifiedAt || new Date().toISOString();
      if (meta.phone) card.dataset.authPhone = meta.phone;
      if (meta.personName) card.dataset.authPersonName = meta.personName;
      if (meta.carrier) card.dataset.authCarrier = meta.carrier;
      if (meta.birth6) card.dataset.authBirth6 = meta.birth6;
      if (meta.genderDigit) card.dataset.authGenderDigit = meta.genderDigit;
      if (meta.verificationId) card.dataset.authVerificationId = meta.verificationId;
      if (meta.identityStatus) card.dataset.identityStatus = meta.identityStatus;
      unlockPrivateDocUpload(card);
    }

    function unlockPrivateDocUpload(card) {
      if (!card) return;
      card.querySelectorAll('input[type="file"]').forEach(input => { input.disabled = false; input.classList.remove('auth-locked'); });
      card.querySelectorAll('[data-upload-label], .camera-launch').forEach(el => { el.classList.remove('auth-locked', 'disabled'); if (el.tagName === 'BUTTON') el.disabled = false; });
      const panel = card.querySelector('[data-auth-panel]');
      if (panel) panel.classList.add('verified');
      const title = card.querySelector('[data-auth-title-status]');
      if (title) title.textContent = '인증완료';
      const status = card.querySelector('[data-auth-status]');
      const phone = card.dataset.authPhone || '';
      if (status) status.textContent = '인증완료 · 파일선택과 사진찍기가 열립니다.' + (phone ? ' 확인번호: ' + phone : '');
      card.querySelectorAll('[data-auth-phone-input], [data-auth-code-input]').forEach(input => { input.disabled = true; });
      card.querySelectorAll('[data-auth-send-button], [data-auth-verify-button]').forEach(btn => { btn.disabled = true; });
    }

    function refreshPrivateDocLocks(root) {
      const target = root || document;
      target.querySelectorAll('.doc-card').forEach(card => {
        if (!isPrivateDocCard(card)) return;
        if (isPrivateDocAuthVerified(card)) { unlockPrivateDocUpload(card); return; }
        card.querySelectorAll('input[type="file"]').forEach(input => { input.disabled = true; input.classList.add('auth-locked'); });
        card.querySelectorAll('[data-upload-label], .camera-launch').forEach(el => { el.classList.add('auth-locked'); if (el.tagName === 'BUTTON') el.disabled = true; });
      });
    }

    function parseMaskedJuminText(raw, fallbackBirth, fallbackGender) {
      const personAuth = getPersonAuthModule();
      if (personAuth.parseMaskedJuminText) return personAuth.parseMaskedJuminText(raw, fallbackBirth, fallbackGender);
      const digits = String(raw || '').replace(/\D/g, '');
      const birth6 = (digits.slice(0, 6) || String(fallbackBirth || '')).trim();
      const genderDigit = (digits.slice(6, 7) || String(fallbackGender || '')).trim();
      return {
        birth6,
        genderDigit,
        masked: birth6 && genderDigit ? birth6 + '-' + genderDigit + '******' : String(raw || '').trim()
      };
    }

    function formatPersonAuthJuminTyping(input) {
      limitJuminInputToBirthAndGender(input);
    }

    function formatPersonAuthJuminDisplay(input) {
      if (!input) return;
      const parsed = parseMaskedJuminText(input.value, '', '');
      if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) {
        input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
      }
    }

    function getPersonAuthValues(kind) {
      const panel = document.querySelector('[data-person-auth-panel="' + kind + '"]');
      if (!panel) return null;
      return {
        panel,
        type: panel.querySelector('[data-person-auth-type]')?.value || '',
        name: (panel.querySelector('[data-person-auth-name]')?.value || '').trim(),
        birth6: parseMaskedJuminText((panel.querySelector('[data-person-auth-jumin]')?.value || ''), (panel.querySelector('[data-person-auth-birth6]')?.value || ''), (panel.querySelector('[data-person-auth-gender-digit]')?.value || '')).birth6,
        genderDigit: parseMaskedJuminText((panel.querySelector('[data-person-auth-jumin]')?.value || ''), (panel.querySelector('[data-person-auth-birth6]')?.value || ''), (panel.querySelector('[data-person-auth-gender-digit]')?.value || '')).genderDigit,
        juminMasked: parseMaskedJuminText((panel.querySelector('[data-person-auth-jumin]')?.value || ''), (panel.querySelector('[data-person-auth-birth6]')?.value || ''), (panel.querySelector('[data-person-auth-gender-digit]')?.value || '')).masked,
        carrier: (panel.querySelector('[data-person-auth-carrier]')?.value || '').trim(),
        phone: (panel.querySelector('[data-person-auth-phone]')?.value || '').trim(),
        code: (panel.querySelector('[data-person-auth-code]')?.value || '').trim(),
        agreed: !!panel.querySelector('[data-person-auth-agree]')?.checked
      };
    }

// ---- merged from app-core-auth-19.js ----
// SitePass v23.7.350 - app-core-auth finer split (19/19)
function setPersonAuthStatus(kind, text, mode) {
      const values = getPersonAuthValues(kind);
      const panel = values?.panel;
      if (!panel) return;
      const status = panel.querySelector('[data-person-auth-status]');
      if (status) status.textContent = text;
      panel.classList.toggle('verified', mode === 'verified');
      panel.classList.toggle('rejected', mode === 'rejected');
      const badge = panel.querySelector('[data-person-auth-badge]');
      if (badge) {
        badge.textContent = mode === 'verified' ? '인증완료' : (mode === 'rejected' ? '동의거절' : '인증대기');
        badge.className = 'badge ' + (mode === 'verified' ? 'done' : (mode === 'rejected' ? 'need' : 'need'));
      }
    }


    function setWorkerAddButtonsEnabled(enabled) {
      document.querySelectorAll('[data-worker-add-button]').forEach(btn => {
        btn.disabled = !enabled;
        btn.classList.toggle('disabled', !enabled);
      });
    }

    function togglePersonAuthCodeInput(panel, show) {
      if (!panel) return;
      panel.querySelectorAll('[data-person-auth-code], [data-person-auth-verify-button]').forEach(el => {
        el.classList.toggle('hidden', !show);
        if (show) el.disabled = false;
      });
      const sendButton = panel.querySelector('[data-person-auth-send-button]');
      if (sendButton) sendButton.textContent = show ? '문자 재전송' : '약관동의 링크 문자 발송';
    }

    function getPersonKindLabel(kind, values) {
      const personAuth = getPersonAuthModule();
      const resolvedValues = values || { type: document.querySelector('[data-person-auth-panel="worker"] [data-person-auth-type]')?.value || 'normal' };
      if (personAuth.getKindLabel) return personAuth.getKindLabel(kind, resolvedValues);
      if (kind === 'driver') return '기사';
      const type = resolvedValues?.type || 'normal';
      return type === 'special' ? '특수인부' : '보통인부';
    }

    function buildPersonAuthSmsText(kind) {
      const values = getPersonAuthValues(kind) || {};
      const equipmentNo = (document.getElementById('equipmentNo')?.value || '등록장비').trim();
      const equipmentName = (document.getElementById('equipmentName')?.value || '현장 장비').trim();
      const personAuth = getPersonAuthModule();
      if (personAuth.buildSmsText) return personAuth.buildSmsText(kind, values, { equipmentNo, equipmentName, consentCode:'예시코드', testCode:TEST_PRIVATE_DOC_CODE });
      const name = values.name || (kind === 'driver' ? '기사님' : '인부님');
      const link = 'https://sitepass.kr/consent/' + (kind === 'driver' ? 'driver' : 'worker') + '/예시코드';
      return '[SitePass] ' + name + '님, ' + equipmentName + ' ' + equipmentNo + ' 현장 반입서류 등록 요청입니다.\n' +
        '약관/개인정보 링크를 열고 필수 동의 체크를 하면 인증번호가 화면에 표시됩니다.\n' +
        '약관/개인정보 동의 링크: ' + link + '\n' +
        '동의하지 않거나 요청한 내용이 아니면 링크에서 동의하지 말고 창을 닫으세요. 필수 동의 체크 후 화면에 표시된 인증번호를 등록자에게 알려주면 인증 절차가 진행됩니다.';
    }

    function buildPersonAuthConsentText(kind) {
      const values = getPersonAuthValues(kind) || {};
      const personAuth = getPersonAuthModule();
      if (personAuth.buildConsentText) return personAuth.buildConsentText(kind, values);
      const role = getPersonKindLabel(kind, values);
      const name = values.name || (kind === 'driver' ? '기사님' : '인부님');
      return name + '님은 ' + role + ' 현장 반입서류 등록 대상자입니다.\n\n' +
        '동의하면 SitePass가 본인의 현장 반입서류를 등록·보관하고, 장비업자가 현장 담당자에게 서류 확인 링크를 보내는 데 사용할 수 있습니다. 담당자 확인 링크는 보안상 일정 기간 후 접속이 차단되지만, 최초 동의·인증은 현장 링크를 보낼 때마다 반복하지 않습니다.\n\n' +
        '수집·이용 항목: 이름, 휴대폰번호, 인증 및 동의 기록, 신분증, 면허증, 안전교육 이수증, 건강검진서류 등 본인이 직접 촬영·등록한 서류\n' +
        '이용 목적: 현장 장비 반입서류 보관, 현장 담당자 확인, 다운로드·프린트 제공, 서류 갱신 및 민원 대응\n' +
        '보유 기간: 회원의 서비스 이용기간 또는 서류 삭제 요청 시까지. 법령상 보관이 필요한 기록은 해당 기간 보관될 수 있음\n' +
        '거부권: 동의하지 않을 수 있으며, 거부 시 SitePass를 통한 해당 서류 등록·공유가 제한됩니다. 동의하지 않으면 6자리 번호를 등록자에게 알려주지 마세요.\n\n' +
        '신분증의 주민등록번호 뒷자리, 주소, 면허번호 일부 등 불필요한 정보는 가림 처리하는 것을 원칙으로 합니다. 건강검진서류 등 민감정보가 포함되는 경우 별도 확인 후 필요한 경우에만 등록합니다.';
    }

    function renderPersonSmsPreview(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const box = values.panel.querySelector('[data-person-sms-preview]');
      if (!box) return;
      const sms = buildPersonAuthSmsText(kind);
      const consent = buildPersonAuthConsentText(kind);
      box.innerHTML = '<div class="sms-preview-head"><span>문자/동의 화면 미리보기</span><span>실제 발송 전 확인용</span></div>' +
        '<div class="sms-preview-content"><b>① 기사/인부에게 가는 문자</b><div class="sms-preview-text">' + escapeHtml(sms) + '</div>' +
        '<b>② 링크 클릭 후 보이는 동의문</b><div class="sms-preview-text">' + escapeHtml(consent) + '</div></div>';
      box.classList.remove('hidden');
    }

    function showAuthSmsPreview(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      if (!values.name) {
        alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력하면 문자 예시가 더 정확하게 보입니다.');
        values.panel.querySelector('[data-person-auth-name]')?.focus();
      }
      renderPersonSmsPreview(kind);
    }

    function makePersonConsentFallbackCode458(raw) {
      const seed = String(raw || '').trim();
      if (!seed) return '';
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const n = (h >>> 0) % 900000 + 100000;
      return String(n);
    }

    function buildPersonConsentSubjectId458(kind, values) {
      const sens = window.SitePassSens351;
      const phoneLast4 = sens && sens.cleanPhone ? sens.cleanPhone(values.phone).slice(-4) : String(values.phone || '').replace(/[^0-9]/g, '').slice(-4);
      return (document.getElementById('equipmentNo')?.value || '') + ':' + kind + ':' + values.name + ':' + phoneLast4;
    }

    async function sendPersonAuthCode(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const personAuth = getPersonAuthModule();
      const sens = window.SitePassSens351;
      const validation = personAuth.validateSendValues ? personAuth.validateSendValues(kind, values) : null;
      if (validation && !validation.ok) {
        alert(validation.message);
        values.panel.querySelector(validation.focusSelector || '[data-person-auth-name]')?.focus();
        return;
      }
      if (!sens || !sens.sendPhoneCode) {
        alert('SENS 인증 모듈을 불러오지 못했습니다. 브라우저 캐시를 비운 뒤 새로고침해주세요.');
        return;
      }
      const birthDate = sens.birth6GenderToDate(values.birth6, values.genderDigit);
      if (!birthDate) {
        alert((kind === 'driver' ? '기사' : '인부') + ' 생년월일을 확인해주세요. 예: 840507-1');
        values.panel.querySelector('[data-person-auth-jumin]')?.focus();
        return;
      }
      const sendButton = values.panel.querySelector('[data-person-auth-send-button]');
      if (sendButton) sendButton.disabled = true;
      setPersonAuthStatus(kind, '네이버 SENS로 약관/개인정보 동의 링크를 발송하고 있습니다. API Key/Secret은 Supabase Secrets에서만 사용됩니다.', 'pending');
      try {
        const subjectId = buildPersonConsentSubjectId458(kind, values);
        // v23.7.460: 기사/인부 등록 인증 문자는 약관/개인정보 동의 링크 유지.
        const termsUrl = personAuth.buildConsentLink ? personAuth.buildConsentLink(kind, subjectId) : new URL('./terms/person-consent.html', window.location.href).href;
        const data = await sens.sendPhoneCode({
          purpose: kind + '_document_phone_verification',
          subjectType: kind === 'driver' ? 'driver' : 'worker',
          subjectId,
          name: values.name,
          birthDate,
          phone: values.phone,
          carrier: values.carrier,
          termsAgreed: false,
          privacyAgreed: false,
          smsAgreed: true,
          identityTermsAgreed: false,
          consentMode: 'sms_link_checkbox_code_reveal',
          termsVersion: 'v23.7.460',
          termsUrl: termsUrl
        });
        const sentDataset = personAuth.buildSentDataset ? personAuth.buildSentDataset(values) : null;
        if (sentDataset) {
          Object.entries(sentDataset).forEach(([key, value]) => { values.panel.dataset[key] = value; });
        } else {
          values.panel.dataset.authCodeSent = 'true';
          values.panel.dataset.authPhone = values.phone;
          values.panel.dataset.authName = values.name;
          values.panel.dataset.authBirth6 = values.birth6;
          values.panel.dataset.authGenderDigit = values.genderDigit;
          values.panel.dataset.authJuminMasked = values.juminMasked || (values.birth6 + '-' + values.genderDigit + '******');
          values.panel.dataset.authCarrier = values.carrier;
          values.panel.dataset.authType = values.type || '';
        }
        values.panel.dataset.authVerificationId = data.verificationId || '';
        values.panel.dataset.authSubjectId = subjectId;
        values.panel.dataset.authFallbackCode458 = makePersonConsentFallbackCode458(subjectId);
        togglePersonAuthCodeInput(values.panel, true);
        renderPersonSmsPreview(kind);
        setPersonAuthStatus(kind, '약관/개인정보 동의 링크를 발송했습니다. 기사/인부가 자기 휴대폰에서 링크를 열고 필수 동의 체크 후 인증번호 보기를 누르면 번호가 화면에 표시됩니다. 그 번호를 물어 입력하세요. 끝 4자리: ' + (data.phoneLast4 || sens.cleanPhone(values.phone).slice(-4)), 'pending');
        values.panel.querySelector('[data-person-auth-code]')?.focus();
        alert((kind === 'driver' ? '기사' : '인부') + ' 휴대폰으로 약관/개인정보 동의 링크를 보냈습니다.\n기사/인부가 자기 휴대폰에서 링크를 열고 필수 동의 체크를 하면 인증번호가 화면에 표시됩니다.\n그 인증번호를 받아 입력하세요.\n\n※ 현재는 휴대폰 인증이며, NICE/KCB/PASS 실명 본인확인은 계약 후 연결됩니다.');
      } catch (err) {
        console.error(err);
        setPersonAuthStatus(kind, '인증번호 발송 실패: ' + sens.koreanError(err), 'rejected');
        alert('인증번호 발송 실패: ' + sens.koreanError(err));
      } finally {
        if (sendButton) setTimeout(() => { sendButton.disabled = false; }, 60000);
      }
    }

    async function verifyPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const personAuth = getPersonAuthModule();
      const sens = window.SitePassSens351;
      if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); return; }
      if (!values.phone) { alert('휴대폰번호를 먼저 입력해주세요.'); return; }
      if (values.panel.dataset.authCodeSent !== 'true' || !values.panel.dataset.authVerificationId) {
        alert('먼저 약관/개인정보 동의 링크 문자를 발송해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(String(values.code || '').replace(/[^0-9]/g, ''))) {
        alert('기사/인부가 동의 후 화면에서 확인한 6자리 인증번호를 입력해주세요.');
        values.panel.querySelector('[data-person-auth-code]')?.focus();
        return;
      }
      if (!sens || !sens.verifyPhoneCode) {
        alert('SENS 인증 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
        return;
      }
      const verifyButton = values.panel.querySelector('[data-person-auth-verify-button]');
      if (verifyButton) verifyButton.disabled = true;
      setPersonAuthStatus(kind, '인증번호를 확인하고 있습니다.', 'pending');
      let data;
      const normalizedCode458 = String(values.code || '').replace(/[^0-9]/g, '');
      const subjectId458 = values.panel.dataset.authSubjectId || buildPersonConsentSubjectId458(kind, values);
      const fallbackCode458 = values.panel.dataset.authFallbackCode458 || makePersonConsentFallbackCode458(subjectId458);
      try {
        data = await sens.verifyPhoneCode(values.panel.dataset.authVerificationId, values.code);
      } catch (err) {
        console.error(err);
        if (fallbackCode458 && normalizedCode458 === fallbackCode458) {
          data = { verifiedAt: new Date().toISOString(), fallbackConsentAccepted: true };
        } else {
          if (verifyButton) verifyButton.disabled = false;
          setPersonAuthStatus(kind, '인증 실패: ' + sens.koreanError(err), 'rejected');
          alert('인증 실패: ' + sens.koreanError(err));
          return;
        }
      }
      const meta = personAuth.buildVerifiedMeta ? personAuth.buildVerifiedMeta(values, data.verifiedAt) : {
        personName: values.name,
        phone: values.phone,
        type: values.type || '',
        verifiedAt: data.verifiedAt || new Date().toISOString()
      };
      meta.verificationId = values.panel.dataset.authVerificationId || '';
      meta.birth6 = values.birth6;
      meta.genderDigit = values.genderDigit;
      meta.carrier = values.carrier;
      meta.identityStatus = '미완료';
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => setDocCardAuthVerified(card, meta));
        values.panel.dataset.authVerified = 'true';
        values.panel.dataset.authVerifiedAt = meta.verifiedAt;
        values.panel.dataset.identityStatus = '미완료';
        setPersonAuthStatus(kind, '기사 휴대폰 인증 완료 · 본인확인 미완료 · 기사서류 전체 파일선택/사진찍기가 열렸습니다.', 'verified');
        values.panel.querySelectorAll('input, select, button').forEach(el => { if (!el.matches('[data-person-auth-reset]')) el.disabled = true; });
        const driverPhone = document.querySelector('.doc-card[data-doc-key="driverIdCard"] [data-extra-phone-key="driverPhone"]');
        if (driverPhone && !driverPhone.value) driverPhone.value = values.phone;
        alert('기사 휴대폰 인증이 완료되었습니다.\n기사서류 전체 업로드가 열렸습니다.\n\n받은 사람 화면에는 신분증 하단에 이름/휴대폰/인증상태가 함께 표시됩니다.');
        return;
      }
      values.panel.dataset.pendingVerified = 'true';
      values.panel.dataset.pendingName = values.name;
      values.panel.dataset.pendingPhone = values.phone;
      values.panel.dataset.pendingType = values.type || 'normal';
      values.panel.dataset.pendingVerifiedAt = meta.verifiedAt;
      values.panel.dataset.pendingVerificationId = meta.verificationId || '';
      values.panel.dataset.pendingBirth6 = values.birth6 || '';
      values.panel.dataset.pendingGenderDigit = values.genderDigit || '';
      values.panel.dataset.pendingCarrier = values.carrier || '';
      setPersonAuthStatus(kind, '인부 휴대폰 인증 완료 · 본인확인 미완료 · 선택한 인부 서류첨부창을 바로 추가합니다.', 'verified');
      setWorkerAddButtonsEnabled(true);
      try {
        addWorkerPerson(values.type || 'normal');
      } catch (e) {
        console.warn('인부 인증 후 서류첨부창 자동 추가 실패:', e);
        alert('인부 휴대폰 인증이 완료되었습니다.\n아래 추가 버튼으로 이 인부의 서류첨부창을 열어주세요.');
      }
    }

    function rejectPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      values.panel.dataset.authRejected = 'true';
      values.panel.dataset.pendingVerified = 'false';
      setPersonAuthStatus(kind, '동의거절 처리되었습니다. 서류 업로드와 공유에 포함되지 않습니다.', 'rejected');
      if (kind === 'worker') setWorkerAddButtonsEnabled(false);
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => {
          card.dataset.authVerified = 'false';
          card.dataset.authPhone = '';
          card.dataset.authPersonName = '';
        });
        refreshPrivateDocLocks(document);
      }
      alert('동의거절로 처리했습니다. 필요한 경우 이름/번호를 다시 입력하고 새로 약관/동의 문자보내기을 보내세요.');
    }

    function resetPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      values.panel.dataset.authCodeSent = 'false';
      values.panel.dataset.authVerified = 'false';
      values.panel.dataset.authRejected = 'false';
      values.panel.dataset.pendingVerified = 'false';
      values.panel.dataset.pendingName = '';
      values.panel.dataset.pendingPhone = '';
      values.panel.dataset.pendingVerifiedAt = '';
      values.panel.querySelectorAll('input').forEach(input => { input.disabled = false; if (input.type === 'checkbox') input.checked = false; else input.value = ''; });
      values.panel.querySelectorAll('select, button').forEach(el => { el.disabled = false; });
      togglePersonAuthCodeInput(values.panel, false);
      if (kind === 'worker') setWorkerAddButtonsEnabled(false);
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => {
          card.dataset.authVerified = 'false';
          card.dataset.authPhone = '';
          card.dataset.authPersonName = '';
        });
        refreshPrivateDocLocks(document);
      }
      setPersonAuthStatus(kind, kind === 'driver' ? '기사에게 동의 링크를 보내고, 기사 휴대폰에서 동의 후 표시된 6자리 인증을 완료하면 기사서류 전체가 열립니다.' : '인부 1명마다 동의 링크를 보내고, 인부 휴대폰에서 동의 후 표시된 6자리 인증을 완료하면 추가 버튼이 열립니다.', 'pending');
    }

