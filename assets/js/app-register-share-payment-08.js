// SitePass v23.7.298 - app-register-share-payment split continue (08/09)
function cssEscapeValue(value) {
      if (window.CSS && CSS.escape) return CSS.escape(String(value || ''));
      return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }


    function getShortcutName(item) {
      const name = String(item?.equipmentName || '장비명없음').replace(/\s+/g, '');
      const no = String(item?.equipmentNo || '장비번호없음').replace(/\s+/g, '');
      return name + '_' + no + '_서류';
    }

    function getManagerExpireAt(item) {
      if (!item) return Date.now() + (7 * 24 * 60 * 60 * 1000);
      return item.managerExpireAt ? new Date(item.managerExpireAt).getTime() : new Date(addDaysIso(item.createdAt || new Date().toISOString(), 7)).getTime();
    }

    function getManagerExpireText(itemOrExpireAt) {
      const time = typeof itemOrExpireAt === 'number' ? itemOrExpireAt : getManagerExpireAt(itemOrExpireAt);
      return new Date(time).toLocaleString('ko-KR');
    }

    function isManagerExpired(item, expireAt) {
      const time = expireAt ? Number(expireAt) : getManagerExpireAt(item);
      return Date.now() > time;
    }

    function makeManagerShareToken() {
      const qrShare = getQrShareModule();
      if (qrShare.makeManagerShareToken) return qrShare.makeManagerShareToken();
      return 'MST-' + Date.now().toString(36).toUpperCase() + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4);
    }

    function getOrCreateManagerShareToken(code) {
      const items = getItems();
      const idx = items.findIndex(x => String(x.code || '') === String(code || ''));
      if (idx < 0) return '';
      if (!items[idx].managerShareToken) {
        items[idx].managerShareToken = makeManagerShareToken();
        items[idx].updatedAt = new Date().toISOString();
        setItems(items);
      }
      return items[idx].managerShareToken || '';
    }

    function makeManagerLinkSignature(code, expireAt, token) {
      const qrShare = getQrShareModule();
      if (qrShare.makeManagerLinkSignatureRaw) return qrShare.makeManagerLinkSignatureRaw(code, expireAt, token);
      const seed = String(code || '') + '|' + String(expireAt || '') + '|' + String(token || '');
      let hash = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8);
    }

    function getManagerLinkSignature(code, expireAt) {
      const token = getOrCreateManagerShareToken(code);
      if (!token) return '';
      return makeManagerLinkSignature(code, expireAt, token);
    }

    function isManagerLinkSignatureValid(item, expireAt, sig) {
      if (!item) return false;
      if (!expireAt) return true;
      const token = item.managerShareToken || getOrCreateManagerShareToken(item.code || '');
      if (!token || !sig) return false;
      const expected = makeManagerLinkSignature(item.code || '', expireAt, token);
      return String(expected) === String(sig || '');
    }

    function makeManagerLink(code, expireAt) {
      const qrShare = getQrShareModule();
      if (qrShare.makeManagerLink) return qrShare.makeManagerLink(code, expireAt, getManagerLinkSignature);
      const baseUrl = window.location.href.split('#')[0];
      const exp = expireAt || getSevenDaysFromNowMs();
      const sig = getManagerLinkSignature(code, exp);
      return baseUrl + '#manager=' + encodeURIComponent(code || '') + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(sig);
    }

    function parseManagerHash(hash) {
      const qrShare = getQrShareModule();
      if (qrShare.parseManagerHash) return qrShare.parseManagerHash(hash);
      const value = String(hash || window.location.hash || '');
      if (!value.startsWith('#manager=')) return { code:'', exp:undefined, sig:'' };
      const raw = value.replace('#manager=', '');
      const parts = raw.split('&');
      const code = decodeURIComponent(parts.shift() || '');
      let exp;
      let sig = '';
      parts.forEach(part => {
        const pair = part.split('=');
        const key = decodeURIComponent(pair[0] || '');
        const val = decodeURIComponent(pair.slice(1).join('=') || '');
        if (key === 'exp') exp = Number(val);
        if (key === 'sig') sig = val;
      });
      return { code, exp, sig };
    }

    function refreshManagerShare(code) {
      const items = getItems();
      const idx = items.findIndex(x => x.code === code);
      if (idx < 0) { alert('갱신할 코드를 찾을 수 없습니다.'); return; }
      items[idx].managerExpireAt = addDaysIso(new Date().toISOString(), 7);
      items[idx].updatedAt = new Date().toISOString();
      setItems(items);
      alert('담당자용 QR·링크 유효기간을 오늘부터 7일로 다시 갱신했습니다.\n만료일: ' + getManagerExpireText(items[idx]));
      renderDetail(code);
    }

    function renderShortcutPanel(item) {
      if (!item) return '';
      const name = getShortcutName(item);
      const expireAt = getManagerExpireAt(item);
      const managerLink = makeManagerLink(item.code || '', expireAt);
      return '<div class="shortcut-panel">' +
        '<b>담당자용 직접공유 7일 접속</b>' +
        '<div class="small">담당자 PC 바탕화면이나 휴대폰 홈화면에 보일 이름</div>' +
        '<div class="shortcut-name">' + escapeHtml(name) + '</div>' +
        '<div class="manager-expire-box">담당자 QR·링크 만료일: ' + escapeHtml(getManagerExpireText(expireAt)) + '<br>7일 후에는 담당자 다운로드/프린트 창만 열리지 않습니다. 장비업자 원본코드는 유지됩니다.</div>' +
        '<div class="actions">' +
          '<button type="button" class="primary" onclick="downloadShortcutFile(\'' + escapeJs(item.code || '') + '\')">담당자 바탕화면 파일</button>' +
          '<button type="button" class="okBtn" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 열기</button>' +
          '<button type="button" class="ghost" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">담당자 링크 복사</button>' +
          '<button type="button" class="secondary" onclick="refreshManagerShare(\'' + escapeJs(item.code || '') + '\')">7일 갱신</button>' +
        '</div>' +
        '<div class="small">담당자에게 주는 카톡 링크·문자 링크·QR은 코드 입력 없이 바로 열리고 7일 유효입니다. 담당자는 다운로드·프린트 전용 화면만 봅니다.</div>' +
      '</div>';
    }

    function getShortcutItem(code) {
      const item = getItemByCode(code);
      if (!item) alert('바로가기를 만들 코드를 찾을 수 없습니다.');
      return item;
    }

    function downloadShortcutFile(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      const name = getShortcutName(item);
      const expireAt = getManagerExpireAt(item);
      const link = makeManagerLink(item.code, expireAt);
      const expireDateText = new Date(expireAt).toLocaleString('ko-KR');
      const safeName = escapeHtml(name);
      const safeCode = escapeHtml(item.code || '');
      const shortcutScript = `
        (function(){
          var expireAt = ${expireAt};
          var link = ${JSON.stringify(link)};
          var now = Date.now();
          var card = document.getElementById('card');
          var content = document.getElementById('content');
          if (now > expireAt) {
            card.className += ' expired';
            content.innerHTML = '<div class="warn"><b>만료된 담당자 바로가기입니다.</b><br>이 파일은 발급 후 7일이 지나 더 이상 다운로드/프린트 창을 열 수 없습니다.<br>장비업자에게 새 QR·링크를 다시 받아주세요.</div>';
            return;
          }
          var p = document.createElement('p');
          p.className = 'muted';
          p.textContent = '자동으로 담당자 다운로드/프린트 창을 엽니다. 7일 후에는 이 바로가기 접속이 차단됩니다. 자동으로 열리지 않으면 아래 버튼을 누르세요.';
          var a = document.createElement('a');
          a.className = 'btn';
          a.href = link;
          a.textContent = '다운로드/프린트 창 열기';
          content.innerHTML = '';
          content.appendChild(p);
          content.appendChild(a);
          setTimeout(function(){ location.href = link; }, 450);
        })();
      `;
      const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + safeName + '</title>' +
        '<style>' +
          'body{margin:0;font-family:Arial,\'Noto Sans KR\',sans-serif;background:#f3f6fb;color:#172033;line-height:1.6}' +
          '.wrap{max-width:520px;margin:0 auto;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px}' +
          '.card{width:100%;background:white;border:1px solid #d7dfed;border-radius:20px;box-shadow:0 10px 28px rgba(23,32,51,.10);padding:22px}' +
          'h1{font-size:24px;margin:0 0 10px;letter-spacing:-.6px}.muted{color:#667085;font-size:14px}.code{padding:12px;border-radius:14px;background:#f8fbff;border:1px dashed #b9c9f3;font-weight:900;margin:14px 0;word-break:break-all}' +
          '.btn{display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;padding:12px 16px;border-radius:14px;background:#2457d6;color:#fff;text-decoration:none;font-weight:900}' +
          '.expired .btn{background:#eef2f8;color:#667085;pointer-events:none}.warn{padding:12px;border-radius:14px;background:#fff7e6;border:1px solid #ffd591;color:#694000;font-size:14px;margin-top:12px}' +
        '</style></head><body>' +
        '<div class="wrap"><div id="card" class="card"><h1>' + safeName + '</h1><p class="muted">SitePass 담당자 다운로드/프린트 바로가기입니다.</p><div class="code">유효기간: ' + escapeHtml(expireDateText) + '까지<br>7일 후 담당자 접속 차단</div><div id="content">확인중입니다.</div></div></div>' +
        '<script>' + shortcutScript + '</scr' + 'ipt></body></html>';
      const blob = new Blob([html], { type:'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizeFileName(name) + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      alert('담당자용 7일 바탕화면 파일을 내려받았습니다.\n파일 이름: ' + name + '.html\n만료일: ' + expireDateText + '\n\n담당자는 이 파일로 다운로드/프린트 창만 열 수 있습니다. 7일 후에는 담당자 QR·링크·바로가기 접속만 만료됩니다.');
    }

    function showPhoneHomeGuide(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      const name = getShortcutName(item);
      copyTextFallback(name);
      alert('휴대폰 홈화면 추가 방법\n\n1. 카톡 공유 또는 문자 공유로 받은 담당자 링크를 휴대폰에서 엽니다.\n2. 브라우저 메뉴(⋮ 또는 공유 버튼)를 누릅니다.\n3. [홈 화면에 추가]를 누릅니다.\n4. 이름을 아래처럼 넣으면 됩니다.\n\n' + name + '\n\n이름은 복사해두었습니다.');
    }

    function copyShortcutName(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      const name = getShortcutName(item);
      copyTextFallback(name, '바탕화면/홈화면 이름을 복사했습니다.\n' + name);
    }

    function copyTextFallback(text, successMessage) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (successMessage) alert(successMessage);
        }).catch(() => prompt('아래 내용을 복사하세요.', text));
      } else {
        prompt('아래 내용을 복사하세요.', text);
      }
    }

    function sanitizeFileName(name) {
      return String(name || 'SitePass 장비서류').replace(/[\\/:*?"<>|]/g, '_').trim() || 'SitePass 장비서류';
    }

    function copyCodeText(code) {
      alert('담당자에게는 코드를 보내지 않고, 카톡 공유/문자 공유로 7일 만료 QR·링크를 보내면 됩니다.');
    }

    function copyQrLink() {
      if (!currentDetailLink) { alert('복사할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      copyTextFallback('SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크: ' + freshLink + '\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.', '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 됩니다.');
    }

    function getFreshCurrentManagerLink() {
      const code = getCodeFromManagerLink(currentDetailLink);
      if (!code) return currentDetailLink;
      const item = getItemByCode(code);
      if (item && !canUseQrShareItems([item], '담당자 QR·링크 보내기')) return '';
      const items = refreshManagerExpiryForCodes([code]);
      if (!items.length) return currentDetailLink;
      currentDetailLink = makeManagerLink(items[0].code, getManagerExpireAt(items[0]));
      return currentDetailLink;
    }

    function shareQrLink() {
      if (!currentDetailLink) { alert('공유할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.';
      if (navigator.share) {
        navigator.share({ title:'SitePass 담당자 서류', text, url: freshLink }).catch(() => {});
      } else {
        copyTextFallback(text + '\n' + freshLink, '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 됩니다.');
      }
    }

    function shareSmsLink() {
      if (!currentDetailLink) { alert('공유할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n' + freshLink;
      openSmsShare(text);
    }

    function shareEmailLink() {
      if (!currentDetailLink) { alert('공유할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n' + freshLink;
      const item = getItemByCode(getCodeFromManagerLink(currentDetailLink));
      openEmailShare(text, item ? [item] : []);
    }


    function getPendingRegistration() {
      if (pendingRegistrationItemMemory && pendingRegistrationItemMemory.item) return normalizePendingRegistrationTier(pendingRegistrationItemMemory);
      try {
        const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY) || localStorage.getItem(PENDING_REGISTRATION_KEY) || '';
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.item) {
          pendingRegistrationItemMemory = normalizePendingRegistrationTier(parsed);
          return pendingRegistrationItemMemory;
        }
      } catch (e) {}
      return null;
    }

    function setPendingRegistration(pending) {
      pendingRegistrationItemMemory = pending || null;
      let saved = false;
      try { sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending || null)); saved = true; } catch (e) {}
      try { localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending || null)); saved = true; } catch (e) {}
      return saved || !!pendingRegistrationItemMemory;
    }

    function clearPendingRegistration() {
      pendingRegistrationItemMemory = null;
      try { sessionStorage.removeItem(PENDING_REGISTRATION_KEY); } catch (e) {}
      try { localStorage.removeItem(PENDING_REGISTRATION_KEY); } catch (e) {}
    }

    function openPendingRegistrationPaymentScreen(pending) {
      // v23.7.298: 테스트 기간에는 결제화면을 열지 않고 등록완료 처리합니다.
      if (pending && pending.item) pendingRegistrationItemMemory = pending;
      if (window.SITEPASS_TEST_NO_PAYMENT_MODE && pending && pending.item) {
        try { completePendingRegistrationPayment('test-free'); } catch (e) { console.warn('테스트 무료등록 처리 실패:', e); }
        return;
      }
      // v23.7.152 - 휴대폰/PWA에서 추가등록 저장 후 결제화면으로 안 넘어가는 문제 보강
      // 결제 대기정보는 메모리에도 유지하고, 화면 전환이 막히면 수동으로 pricingScreen을 열어줍니다.
      try { restorePwaAutoMemberSession(); } catch (e) {}

      const forceOpenPricing = function() {
        const pricing = document.getElementById('pricingScreen');
        if (!pricing) return false;
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        pricing.classList.remove('hidden');
        try { renderPricingScreen(); } catch (e) { console.warn('결제화면 렌더링 보강 처리:', e); }
        try { refreshAdminUi(); } catch (e) {}
        sitePassCurrentScreenId = 'pricingScreen';
        try { rememberSitePassScreen('pricingScreen', { replace:true }); } catch (e) {}
        try { window.scrollTo({ top:0, behavior:'smooth' }); } catch (e) { window.scrollTo(0, 0); }
        return true;
      };

      try {
        showScreen('pricingScreen');
      } catch (e) {
        console.warn('결제화면 이동 실패, 강제 이동 처리:', e);
        forceOpenPricing();
      }

      setTimeout(function() {
        const pricing = document.getElementById('pricingScreen');
        const visible = pricing && !pricing.classList.contains('hidden');
        if (!visible && (isMemberLoggedIn() || isAdminLoggedIn() || getPendingRegistration())) {
          forceOpenPricing();
        }
      }, 80);
    }

    function isActivePaidEquipmentForRegistrationCount(item) {
      if (!item || !item.code) return false;
      const raw = [item.serviceStatus, item.paymentStatus, item.paymentPlan, item.basicPlan, item.saveReason].map(v => String(v || '').toLowerCase()).join(' ');
      if (item.isDeleted || item.is_deleted || item.deletedAt || item.withdrawnAt) return false;
      if (raw.indexOf('orphan_deleted') >= 0 || raw.indexOf('withdrawn') >= 0 || raw.indexOf('deleted') >= 0 || raw.indexOf('탈퇴') >= 0 || raw.indexOf('삭제') >= 0) return false;
      if (raw.indexOf('결제대기') >= 0 || raw.indexOf('pending') >= 0 || raw.indexOf('미결제') >= 0) return false;
      return raw.indexOf('등록결제완료') >= 0 || raw.indexOf('결제완료') >= 0 || raw.indexOf('유료사용') >= 0 || !!item.paidAt || !!item.trialEndsAt;
    }

    function isSameEquipmentOwnerForRegistrationCount(item, member) {
      if (!member) return true;
      const memberKeys = [member.id, member.signupId, member.providerId, member.supabaseLoginId, member.authUserId, member.phone, member.name]
        .map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
      if (!memberKeys.length) return true;
      const ownerKeys = [item.ownerMemberId, item.ownerSignupId, item.ownerProviderId, item.ownerName, item.ownerPhone]
        .map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
      if (!ownerKeys.length) return true; // 기존 저장자료는 소유자 키가 없을 수 있어 기존 사용자를 위해 포함합니다.
      return ownerKeys.some(k => memberKeys.includes(k));
    }

    function getActivePaidRegistrationItemsForCurrentOwner(member, excludeCode) {
      const code = String(excludeCode || '');
      return getItems().filter(item => {
        if (code && String(item.code || '') === code) return false;
        return isActivePaidEquipmentForRegistrationCount(item) && isSameEquipmentOwnerForRegistrationCount(item, member || null);
      });
    }

