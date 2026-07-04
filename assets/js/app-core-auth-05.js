    function formatSitePassSignupJuminDisplay() {
      const input = document.getElementById('sitepassSignupJuminMasked');
      if (!input) return;
      const parsed = parseSitePassSignupJumin();
      if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) {
        input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
      }
    }


    // v23.7.281 - 주민번호 입력칸 공통 보정
    // 모바일/PC에서 붙여넣기 또는 빠른 입력 시 8405071111111처럼 길게 남는 것을 막고
    // 항상 앞 6자리 + 뒷자리 첫 숫자까지만 840507-1 형식으로 제한합니다.
    function setupJuminLimitDelegates() {
      if (window.__sitePassJuminLimitDelegates) return;
      window.__sitePassJuminLimitDelegates = true;
      document.addEventListener('input', function(event) {
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('#sitepassSignupJuminMasked, [data-person-auth-jumin], #paymentOwnerJuminMasked')) {
          limitJuminInputToBirthAndGender(input);
        }
      }, true);
      document.addEventListener('blur', function(event) {
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('#sitepassSignupJuminMasked, [data-person-auth-jumin], #paymentOwnerJuminMasked')) {
          const parsed = parseMaskedJuminText(input.value, '', '');
          if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) {
            input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
          }
        }
      }, true);
    }

    function getSitePassSignupIdentity() {
      const jumin = parseSitePassSignupJumin();
      return {
        name: (document.getElementById('sitepassSignupName')?.value || '').trim(),
        phone: (document.getElementById('sitepassSignupPhone')?.value || '').trim(),
        birth6: jumin.birth6,
        genderDigit: jumin.genderDigit,
        juminMasked: jumin.masked,
        carrier: (document.getElementById('sitepassSignupCarrier')?.value || '').trim()
      };
    }

    function resetSitePassSignupPhoneAuth() {
      sitepassSignupPhoneVerified = false;
      sitepassSignupPhoneRequestSent = false;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.add('hidden');
      const codeInput = document.getElementById('sitepassSignupCode');
      if (codeInput) codeInput.value = '';
      const requestButton = document.getElementById('sitepassSignupRequestButton');
      if (requestButton) requestButton.textContent = '인증요청';
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = '이름, 주민번호, 휴대폰번호, 통신사를 입력한 뒤 인증요청을 눌러주세요. 주민번호는 840507-1까지만 입력하면 840507-1******로 표시됩니다. 임시 인증번호는 123456입니다.';
    }

    function findMemberBySignupPhone(phone) {
      const phoneKey = normalizePhoneDigits(phone);
      if (!phoneKey) return null;
      return getMembers().find(member => normalizePhoneDigits(member.phone) === phoneKey) || null;
    }

    function findMemberBySignupIdOnly(signupId) {
      const key = normalizeLoginText(signupId).toLowerCase();
      if (!key) return null;
      return getMembers().find(member => {
        const signupKey = normalizeLoginText(member.signupId).toLowerCase();
        const providerKey = normalizeLoginText(member.providerId).toLowerCase();
        const idKey = normalizeLoginText(member.id).toLowerCase();
        return signupKey === key || providerKey === key || idKey === key;
      }) || null;
    }

    function openIdFindForExistingPhone(phone, name) {
      const signupBox = document.getElementById('sitepassSignupBox');
      if (signupBox) signupBox.classList.add('hidden');
      const joinBox = document.getElementById('joinChoiceBox');
      if (joinBox) joinBox.classList.add('hidden');
      openAccountFindPanel('id');
      const idName = document.getElementById('findIdName');
      const idPhone = document.getElementById('findIdPhone');
      if (idName) idName.value = name || '';
      if (idPhone) idPhone.value = phone || '';
      const result = document.getElementById('accountFindResult');
      if (result) {
        result.textContent = '이미 등록된 휴대폰번호입니다. 기존 계정의 사용자 아이디를 찾으려면 이름/업체명과 휴대폰번호를 확인한 뒤 인증번호 받기를 눌러주세요.';
      }
      setTimeout(() => {
        if (idName && !idName.value) idName.focus();
        else if (idPhone) idPhone.focus();
      }, 120);
    }

    function resetSitePassSignupIdDuplicate() {
      sitepassSignupIdVerified = false;
      sitepassSignupIdVerifiedValue = '';
      const status = document.getElementById('sitepassSignupIdStatus');
      if (status) status.textContent = '아이디 입력 후 중복확인을 눌러주세요.';
    }

    function checkSitePassSignupIdDuplicate() {
      const input = document.getElementById('sitepassSignupId');
      const signupId = input?.value || '';
      const key = normalizeLoginText(signupId);
      if (!key) return false;
      const existing = findMemberBySignupIdOnly(key) || findMemberForLogin(key);
      if (existing) {
        const status = document.getElementById('sitepassSignupIdStatus');
        if (status) status.textContent = '이미 등록된 아이디입니다. 다른 아이디를 입력해주세요.';
        alert('이미 등록된 사용자 아이디가 있습니다. 다른 아이디를 입력해주세요.\n기존 계정이 본인 계정이면 아이디 찾기 또는 비밀번호 찾기를 이용해주세요.');
        setTimeout(() => input?.focus(), 80);
        return true;
      }
      return false;
    }

    function verifySitePassSignupIdDuplicate() {
      const input = document.getElementById('sitepassSignupId');
      const signupId = (input?.value || '').trim();
      const key = normalizeLoginText(signupId);
      const status = document.getElementById('sitepassSignupIdStatus');
      sitepassSignupIdVerified = false;
      sitepassSignupIdVerifiedValue = '';
      if (!key) {
        alert('사용할 SitePass 아이디를 먼저 입력해주세요.');
        input?.focus();
        return false;
      }
      if (signupId.length < 4) {
        alert('SitePass 아이디는 4자 이상으로 입력해주세요.');
        input?.focus();
        return false;
      }
      if (checkSitePassSignupIdDuplicate()) return false;
      sitepassSignupIdVerified = true;
      sitepassSignupIdVerifiedValue = key;
      if (status) status.textContent = '사용 가능한 아이디입니다. 이 아이디로 가입할 수 있습니다.';
      alert('사용 가능한 아이디입니다.');
      return true;
    }

    function checkSitePassSignupPhoneDuplicateAndMove(phone, name) {
      const existing = findMemberBySignupPhone(phone);
      if (!existing) return false;
      alert('이미 등록된 휴대폰번호가 있습니다.\n새로 가입하지 말고 아이디 찾기로 이동해서 기존 계정을 확인해주세요.');
      openIdFindForExistingPhone(phone, name || existing.name || '');
      return true;
    }

    function sendSitePassSignupPhoneCodeTest() {
      if (!requireSignupTerms()) return;
      formatSitePassSignupJuminDisplay();
      const identity = getSitePassSignupIdentity();
      if (!identity.name || !identity.phone || !identity.birth6 || !identity.genderDigit || !identity.carrier) {
        alert('이름/업체명, 주민번호, 휴대폰번호, 통신사를 먼저 입력해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(identity.birth6) || !/^[1-8]$/.test(identity.genderDigit)) {
        alert('주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.');
        return;
      }
      if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(identity.phone)) {
        alert('휴대폰번호 형식을 확인해주세요. 예: 010-0000-0000');
        return;
      }
      if (checkSitePassSignupPhoneDuplicateAndMove(identity.phone, identity.name)) return;
      sitepassSignupPhoneRequestSent = true;
      sitepassSignupPhoneVerified = false;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.remove('hidden');
      const requestButton = document.getElementById('sitepassSignupRequestButton');
      if (requestButton) requestButton.textContent = '인증번호 재전송';
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = identity.carrier + ' 본인확인 문자 발송 완료. 이름·주민번호·휴대폰번호 일치 확인 후 임시 인증번호 123456을 입력해주세요.';
      const codeInput = document.getElementById('sitepassSignupCode');
      if (codeInput) setTimeout(() => codeInput.focus(), 80);
      alert('[SitePass 인증]\n' + identity.name + '님 휴대폰으로 6자리 인증번호를 보냈습니다.\n임시 인증번호: 123456\n\n정식 서비스에서는 통신사/PASS 본인확인 API로 이름·주민번호·전화번호·통신사 일치 여부를 확인합니다.');
    }

    function confirmSitePassSignupPhoneCodeTest() {
      if (!sitepassSignupPhoneRequestSent) {
        alert('먼저 인증요청을 눌러주세요.');
        return;
      }
      const code = (document.getElementById('sitepassSignupCode')?.value || '').trim();
      if (code !== '123456') {
        alert('인증번호가 맞지 않습니다. 임시 번호는 123456입니다.');
        return;
      }
      sitepassSignupPhoneVerified = true;
      const identity = getSitePassSignupIdentity();
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = '본인확인 완료: ' + identity.name + ' / ' + identity.juminMasked + ' / ' + identity.carrier + ' / ' + identity.phone;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.add('hidden');
      alert('휴대폰 본인확인이 완료되었습니다. 이제 SitePass 회원가입을 완료할 수 있습니다.');
    }

    function submitSitePassSignupTest() {
      if (!requireSignupTerms()) return;
      formatSitePassSignupJuminDisplay();
      const identity = getSitePassSignupIdentity();
      const name = identity.name;
      const phone = identity.phone;
      const carrier = identity.carrier;
      const birth6 = identity.birth6;
      const genderDigit = identity.genderDigit;
      const signupId = (document.getElementById('sitepassSignupId')?.value || '').trim();
      const pw = (document.getElementById('sitepassSignupPw')?.value || '').trim();
      const pw2 = (document.getElementById('sitepassSignupPw2')?.value || '').trim();
      if (!name || !phone || !birth6 || !genderDigit || !carrier || !signupId || !pw || !pw2) {
        alert('이름/업체명, 주민번호, 휴대폰번호, 통신사, SitePass 아이디, 비밀번호를 모두 입력해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(birth6) || !/^[1-8]$/.test(genderDigit)) {
        alert('주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.');
        return;
      }
      if (!sitepassSignupPhoneVerified) {
        alert('SitePass 회원가입은 휴대폰 본인확인 후 완료할 수 있습니다. 인증요청 후 6자리 인증번호를 확인해주세요.');
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
        carrier,
        birth6,
        genderDigit,
        juminMasked: birth6 + '-' + genderDigit + '******',
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
      saveMemberTest(member);
      completeMemberLoginTest(member, 'SitePass 회원가입이 완료되었습니다.\n이제 SitePass 메인 화면으로 이동합니다.\n정식 서비스에서는 통신사 본인확인 결과값을 서버에 저장합니다.');
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
        repliedAt:''
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

    function renderAdminContactManager() {
      const contacts = getContacts();
      const waiting = contacts.filter(x => x.status !== '답변완료').length;
      if (!contacts.length) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>문의관리</h3><div class="notice blue-note">관리자는 제이에스건설 회사 계정으로 운영하고, 정식 서비스에서는 앱 문의와 회사 카카오톡 채널 문의를 같이 확인하는 구조로 연결합니다.</div><div class="empty">접수된 문의가 없습니다.</div></div>';
      }
      const rows = contacts.map(item => {
        const statusClass = item.status === '답변완료' ? 'done' : 'need';
        return '<div class="list-item" data-contact-id="' + escapeHtml(item.id) + '">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(item.type || '문의') + ' · ' + escapeHtml(item.name || '') + '</strong><div class="small">연락처: ' + escapeHtml(item.phone || '') + '<br>접수일: ' + escapeHtml(formatDateTime(item.createdAt)) + '</div></div><span class="badge ' + statusClass + '">' + escapeHtml(item.status || '답변대기') + '</span></div>' +
          '<div class="date-note"><b>문의내용</b><br>' + escapeHtml(item.message || '').replace(/\n/g, '<br>') + '</div>' +
          '<div class="field" style="margin-top:10px;"><label>관리자 답변</label><textarea id="reply_' + escapeHtml(item.id) + '" rows="4" style="min-height:96px; resize:vertical;" placeholder="답변 내용을 입력하세요.">' + escapeHtml(item.reply || '') + '</textarea></div>' +
          '<div class="actions"><button class="primary" onclick="saveContactReply(\'' + escapeJs(item.id) + '\')">답변 저장</button><button class="okBtn" onclick="markContactDone(\'' + escapeJs(item.id) + '\')">처리완료</button><button class="dangerBtn" onclick="deleteContact(\'' + escapeJs(item.id) + '\')">문의 삭제</button></div>' +
        '</div>';
      }).join('');
      return '<div id="adminContactManagerCard" class="card" style="box-shadow:none;margin-top:14px;"><h3>문의관리</h3><div class="notice blue-note">관리자는 제이에스건설 회사 계정으로 운영합니다. 정식 서비스에서는 회사 카카오톡 채널 1:1 채팅 문의도 이 관리자 문의관리와 연결하는 방향입니다.</div><div class="line"><b>답변대기</b><span>' + waiting + '건</span></div>' + rows + '</div>';
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
      return hash.startsWith('#pay=') || hash.startsWith('#manager=') || hash.startsWith('#qr=');
    }

    function rememberSitePassScreen(id, options) {
      if (!id || !window.history || !window.history.replaceState) return;
      if (sitePassHandlingPopState || isSitePassHashRouteActive()) return;
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
      if (sitePassCurrentScreenId === 'registerScreen' && id !== 'registerScreen') saveRegistrationDraftNow();
      const memberProtectedScreens = ['homeScreen','usageGuideScreen','registerScreen','listScreen','pricingScreen','contactScreen','detailScreen'];
      if (memberProtectedScreens.includes(id) && !isMemberLoggedIn() && !isAdminLoggedIn()) {
        id = 'signupScreen';
      }
      if (id === 'adminScreen' && !isAdminLoggedIn()) {
        id = 'signupScreen';
      }
      const managerOnlyScreens = ['managerAccessScreen', 'managerPrintScreen', 'publicScreen'];
      document.body.classList.toggle('manager-view-mode', managerOnlyScreens.includes(id));
      document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
      const target = document.getElementById(id);
      if (target) target.classList.remove('hidden');
      // v23.7.216: 새로고침 때 로그인창이 먼저 보였다가 사라지는 깜빡임 방지.
      // 세션/소셜 콜백 확인이 끝난 뒤 최종 화면을 정한 다음에만 화면을 공개합니다.
      document.body.classList.remove('sitepass-booting');
      if (id === 'homeScreen') updateHomeRegistrationButton();
      if (id === 'installScreen') updateHomeInstallButtonState();
      if (id === 'listScreen') renderList();
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
      if (id === 'managerAccessScreen') { setTimeout(() => document.getElementById('managerCodeInput')?.focus(), 80); }
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

    function adminLogout() {
      removeSessionValue(ADMIN_SESSION_KEY);
      removeSessionValue(ADMIN_SESSION_KEY + '_role');
      removeSessionValue(ADMIN_SESSION_KEY + '_id');
      removeSessionValue(ADMIN_SESSION_KEY + '_name');
      clearPwaAutoMemberTest();
      refreshAdminUi();
      alert('로그아웃했습니다.');
      showScreen('signupScreen');
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
      alert(title + '는 6자리 인증 전에는 파일선택/사진찍기를 사용할 수 없습니다.\n' + getPrivateDocLockTargetText(card) + '\n현재 임시 6자리 번호는 123456입니다.');
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

