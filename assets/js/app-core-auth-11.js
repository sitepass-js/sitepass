// SitePass v23.7.299 - app-core-auth split continue (11/11)
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
      if (sendButton) sendButton.textContent = show ? '문자 재전송' : '약관/동의 문자보내기';
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
        '약관/동의 내용을 확인한 뒤 동의하시면 6자리 번호를 등록자에게 알려주세요.\n' +
        '약관/동의 확인 링크: ' + link + '\n' +
        '6자리 동의번호: 123456\n' +
        '동의하지 않거나 요청한 내용이 아니면 번호를 알려주지 말고 문자를 무시하세요.';
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

    function sendPersonAuthCode(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const personAuth = getPersonAuthModule();
      const validation = personAuth.validateSendValues ? personAuth.validateSendValues(kind, values) : null;
      if (validation && !validation.ok) {
        alert(validation.message);
        values.panel.querySelector(validation.focusSelector || '[data-person-auth-name]')?.focus();
        return;
      }
      if (!validation) {
        if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); values.panel.querySelector('[data-person-auth-name]')?.focus(); return; }
        if (!values.birth6 || !/^\d{6}$/.test(values.birth6) || !values.genderDigit || !/^[1-8]$/.test(values.genderDigit)) { alert((kind === 'driver' ? '기사' : '인부') + ' 주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.'); values.panel.querySelector('[data-person-auth-jumin]')?.focus(); return; }
        if (!values.carrier) { alert((kind === 'driver' ? '기사' : '인부') + ' 통신사를 선택해주세요.'); values.panel.querySelector('[data-person-auth-carrier]')?.focus(); return; }
        if (!values.phone) { alert((kind === 'driver' ? '기사' : '인부') + ' 휴대폰번호를 입력해주세요.'); values.panel.querySelector('[data-person-auth-phone]')?.focus(); return; }
      }
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
      togglePersonAuthCodeInput(values.panel, true);
      renderPersonSmsPreview(kind);
      setPersonAuthStatus(kind, '약관/동의 안내 문자와 6자리 번호를 보냈습니다. 기사/인부가 동의하면 그 번호를 등록자에게 알려주고, 등록자는 아래 입력칸에 입력합니다.', 'pending');
      values.panel.querySelector('[data-person-auth-code]')?.focus();
      alert('현재 임시 6자리 번호는 123456입니다.\n정식 서비스에서는 ' + values.carrier + ' / ' + values.phone + ' 번호로 통신사 본인확인 후 약관/동의 링크와 6자리 번호가 발송됩니다. 기사/인부가 동의하면 그 번호를 등록자에게 알려주는 방식입니다.');
    }

    function verifyPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const personAuth = getPersonAuthModule();
      const validation = personAuth.validateVerifyValues ? personAuth.validateVerifyValues(kind, values, values.panel.dataset.authCodeSent, TEST_PRIVATE_DOC_CODE) : null;
      if (validation && !validation.ok) {
        alert(validation.message);
        if (validation.focusSelector) values.panel.querySelector(validation.focusSelector)?.focus();
        return;
      }
      if (!validation) {
        if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); return; }
        if (!values.phone) { alert('휴대폰번호를 먼저 입력해주세요.'); return; }
        if (values.panel.dataset.authCodeSent !== 'true') { alert('먼저 약관/동의 문자보내기 버튼을 눌러주세요.'); return; }
        if (values.code !== TEST_PRIVATE_DOC_CODE) { alert('6자리 번호가 맞지 않습니다. 현재 임시 번호 123456을 입력해주세요.'); values.panel.querySelector('[data-person-auth-code]')?.focus(); return; }
      }
      const meta = personAuth.buildVerifiedMeta ? personAuth.buildVerifiedMeta(values) : {
        personName: values.name,
        phone: values.phone,
        type: values.type || '',
        verifiedAt: new Date().toISOString()
      };
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => setDocCardAuthVerified(card, meta));
        values.panel.dataset.authVerified = 'true';
        values.panel.dataset.authVerifiedAt = meta.verifiedAt;
        setPersonAuthStatus(kind, '기사 본인 동의/인증 완료 · 기사서류 전체 파일선택/사진찍기가 열렸습니다.', 'verified');
        values.panel.querySelectorAll('input, select, button').forEach(el => { if (!el.matches('[data-person-auth-reset]')) el.disabled = true; });
        const driverPhone = document.querySelector('.doc-card[data-doc-key="driverIdCard"] [data-extra-phone-key="driverPhone"]');
        if (driverPhone && !driverPhone.value) driverPhone.value = values.phone;
        alert('기사 본인 인증이 완료되었습니다.\n기사서류 전체 업로드가 열렸습니다.');
        return;
      }
      values.panel.dataset.pendingVerified = 'true';
      values.panel.dataset.pendingName = values.name;
      values.panel.dataset.pendingPhone = values.phone;
      values.panel.dataset.pendingType = values.type || 'normal';
      values.panel.dataset.pendingVerifiedAt = meta.verifiedAt;
      setPersonAuthStatus(kind, '인부 동의/인증 완료 · 이제 아래 버튼으로 이 인부의 서류함을 추가할 수 있습니다.', 'verified');
      setWorkerAddButtonsEnabled(true);
      alert('인부 동의/인증이 완료되었습니다.\n이제 보통인부 추가 또는 특수인부 추가 버튼으로 서류함을 추가하세요.\n이 인증은 해당 인부 서류 등록 동의용이며, 현장 링크를 보낼 때마다 다시 받지 않습니다.');
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
      setPersonAuthStatus(kind, kind === 'driver' ? '기사 문자 동의안내와 6자리 인증을 완료하면 기사서류 전체가 열립니다.' : '인부 1명마다 문자 동의안내와 6자리 인증 후 추가 버튼이 열립니다.', 'pending');
    }
