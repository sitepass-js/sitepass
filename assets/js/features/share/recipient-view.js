// SitePass STEP83 V34 - share/recipient-view 책임 분리
// 외부 수신자 링크 생성·검증·QR 표시·수신자 화면 이동만 담당합니다.
(function(){
  'use strict';

  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

  function makeRecipientShareLink(rawToken, trackingToken) {
    const token = String(rawToken || '').trim();
    if (!TOKEN_PATTERN.test(token)) return '';

    const url = new URL('./recipient-share.html', window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('token', token);

    const sid = String(trackingToken || '').trim();
    if (sid) url.searchParams.set('sid', sid);

    return url.toString();
  }

  function parseRecipientShareLink(link) {
    try {
      const target = new URL(String(link || ''), window.location.href);
      if (
        target.origin !== window.location.origin ||
        !/\/recipient-share\.html$/.test(target.pathname) ||
        !TOKEN_PATTERN.test(String(target.searchParams.get('token') || ''))
      ) {
        return null;
      }
      return target;
    } catch (e) {
      return null;
    }
  }

  function paintMemberRecipientQrResult(itemCode, equipmentId, result, deps) {
    deps = deps || {};

    const currentDetailCode =
      typeof deps.getCurrentDetailCode === 'function'
        ? deps.getCurrentDetailCode()
        : '';

    if (String(currentDetailCode || '') !== String(itemCode || '')) return;

    const currentScreenId =
      typeof deps.getCurrentScreenId === 'function'
        ? deps.getCurrentScreenId()
        : '';

    if (currentScreenId && currentScreenId !== 'detailScreen') return;

    const box = document.querySelector(
      '[data-sitepass-member-recipient-qr-v574="' +
      String(equipmentId || '').replace(/"/g, '') +
      '"]'
    );

    if (!box) return;

    const escapeHtml =
      typeof deps.escapeHtml === 'function'
        ? deps.escapeHtml
        : function(value){ return String(value || ''); };

    if (!result || !result.ok || !result.link || !result.qrUrl) {
      if (typeof deps.setCurrentDetailLink === 'function') {
        deps.setCurrentDetailLink('');
      }

      const message = result && result.blocked
        ? '현재 서비스 상태에서는 담당자 QR을 사용할 수 없습니다.'
        : '담당자 QR을 준비하지 못했습니다. 이 칸을 눌러 다시 준비해주세요.';

      box.innerHTML =
        '<div style="min-height:180px;display:flex;align-items:center;justify-content:center;padding:16px;text-align:center;">' +
          '<span class="small">' + escapeHtml(message) + '</span>' +
        '</div>' +
        '<div class="qr-hint">QR 누르면 회원 미리보기 화면이 열립니다.</div>';

      if (result && result.message) {
        console.warn(
          '[SitePass 42] member recipient QR Token V2 failed',
          result.message
        );
      }
      return;
    }

    if (typeof deps.setCurrentDetailLink === 'function') {
      deps.setCurrentDetailLink(result.link);
    }

    box.innerHTML =
      '<img alt="통합 QR" src="' + escapeHtml(result.qrUrl) + '">' +
      '<div class="qr-hint">QR 누르면 회원 미리보기 화면이 열립니다.</div>';
  }

  function prepareMemberRecipientQr(item, itemCode, deps) {
    deps = deps || {};

    const equipmentId =
      typeof deps.resolveEquipmentId === 'function'
        ? deps.resolveEquipmentId(item, itemCode)
        : '';

    if (!equipmentId) {
      paintMemberRecipientQrResult(
        itemCode,
        '',
        { ok:false, message:'장비 식별정보 없음' },
        deps
      );
      return;
    }

    const safeItem = Object.assign(
      {},
      item || {},
      { equipment_id:equipmentId, equipmentId:equipmentId }
    );

    const getOrCreate =
      typeof deps.getOrCreateRecipientQr === 'function'
        ? deps.getOrCreateRecipientQr
        : null;

    if (!getOrCreate) {
      paintMemberRecipientQrResult(
        itemCode,
        equipmentId,
        { ok:false, message:'Token V2 QR 준비 모듈 없음' },
        deps
      );
      return;
    }

    Promise.resolve(getOrCreate(safeItem)).then(function(result){
      paintMemberRecipientQrResult(itemCode, equipmentId, result, deps);
    }).catch(function(error){
      paintMemberRecipientQrResult(itemCode, equipmentId, {
        ok:false,
        message:error && error.message
          ? error.message
          : String(error || 'Token V2 QR 준비 오류')
      }, deps);
    });
  }

  async function openMemberRecipientQr(code, deps) {
    deps = deps || {};
    const targetCode = String(code || '').trim();

    if (!targetCode) {
      alert('담당자 QR에 필요한 장비 정보를 확인하지 못했습니다.');
      return false;
    }

    const item =
      (typeof deps.buildStableDetailItem === 'function'
        ? deps.buildStableDetailItem(targetCode)
        : null) ||
      (typeof deps.getInstantLinkItem === 'function'
        ? deps.getInstantLinkItem(targetCode)
        : null) ||
      (typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(targetCode)
        : null);

    if (!item) {
      alert('장비 정보를 확인하지 못했습니다. 보관함에서 상세보기를 다시 열어주세요.');
      return false;
    }

    let link =
      typeof deps.getCurrentDetailLink === 'function'
        ? String(deps.getCurrentDetailLink() || '').trim()
        : '';

    if (!parseRecipientShareLink(link)) link = '';

    if (!link) {
      const equipmentId =
        typeof deps.resolveEquipmentId === 'function'
          ? deps.resolveEquipmentId(item, targetCode)
          : '';

      if (!equipmentId) {
        alert('담당자 QR에 필요한 장비 식별자를 확인하지 못했습니다. 보관함 목록을 새로고침한 뒤 다시 눌러주세요.');
        return false;
      }

      const safeItem = Object.assign(
        {},
        item,
        { equipment_id:equipmentId, equipmentId:equipmentId }
      );

      const getOrCreate =
        typeof deps.getOrCreateRecipientQr === 'function'
          ? deps.getOrCreateRecipientQr
          : null;

      if (!getOrCreate) {
        alert('담당자 QR 준비 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
        return false;
      }

      const result = await getOrCreate(safeItem);

      if (!result || result.ok !== true || !result.link) {
        alert(String(
          result && result.message ||
          '담당자 QR을 준비하지 못했습니다. 잠시 후 다시 눌러주세요.'
        ));
        return false;
      }

      link = String(result.link || '').trim();

      if (typeof deps.setCurrentDetailLink === 'function') {
        deps.setCurrentDetailLink(link);
      }
    }

    const target = parseRecipientShareLink(link);

    if (!target) {
      console.warn(
        '[SitePass v609] 상세보기 QR 열기 실패',
        new Error('RECIPIENT_QR_LINK_INVALID')
      );
      alert('담당자 QR 링크 형식을 확인하지 못했습니다. 보관함에서 다시 열어주세요.');
      return false;
    }

    window.location.assign(target.toString());
    return false;
  }

  window.SitePassShareRecipientView = Object.freeze({
    makeRecipientShareLink,
    parseRecipientShareLink,
    paintMemberRecipientQrResult,
    prepareMemberRecipientQr,
    openMemberRecipientQr
  });
})();
