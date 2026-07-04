// SitePass v23.7.298 - app-core-auth split continue (08/10)
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
