// SitePass STEP90 R2 - driver/worker read-only status card
(function(){
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function yesNo(value) {
    return value === true ? '확인' : '미확인';
  }

  function fmt(value) {
    if (!value) return '-';
    try {
      var d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleString('ko-KR');
    } catch (e) {
      return String(value || '-');
    }
  }

  function render(item) {
    item = item && typeof item === 'object' ? item : {};
    var roleLabel = item.subjectType === 'worker' ? '인부' : '기사';
    var phone = item.phoneLast4 ? '***-' + esc(item.phoneLast4) : '미표시';

    return '<article class="sitepass-admin-person-card-r2">' +
      '<div class="sitepass-admin-person-card-head-r2">' +
        '<div><strong>' + esc(item.displayName || '-') + '</strong>' +
          '<span>' + roleLabel + ' · 휴대폰 ' + phone + '</span></div>' +
        '<b class="' + (item.authBound ? 'ok' : 'wait') + '">' + (item.authBound ? '서버연결' : '연결확인필요') + '</b>' +
      '</div>' +
      '<div class="sitepass-admin-person-grid-r2">' +
        '<div><b>휴대폰 인증</b><span>' + yesNo(item.phoneVerified) + '</span><small>' + esc(fmt(item.phoneVerifiedAt)) + '</small></div>' +
        '<div><b>SENS 증거</b><span>' + yesNo(item.sensEvidence) + '</span><small>' + esc(item.phonePurpose || '-') + '</small></div>' +
        '<div><b>약관 동의</b><span>' + yesNo(item.consented) + '</span><small>' + esc(fmt(item.consentedAt)) + '</small></div>' +
        '<div><b>동의 링크</b><span>' + yesNo(item.consentLinkOpened) + ' / 공개 ' + yesNo(item.consentRevealed) + '</span><small>' + esc(item.consentMethod || '-') + '</small></div>' +
        '<div><b>본인인증</b><span>' + esc(item.identityStatus || 'not_configured') + '</span><small>' + esc(item.identityProvider || 'none') + '</small></div>' +
        '<div><b>본인인증 완료</b><span>' + (item.identityVerifiedAt ? '확인' : '미확인') + '</span><small>' + esc(fmt(item.identityVerifiedAt)) + '</small></div>' +
      '</div>' +
      '<details class="sitepass-admin-person-meta-r2"><summary>서버 식별·약관 버전</summary>' +
        '<div><b>subject_id</b><span>' + esc(item.subjectId || '-') + '</span></div>' +
        '<div><b>이용약관</b><span>' + esc(item.termsVersion || '-') + '</span></div>' +
        '<div><b>개인정보</b><span>' + esc(item.privacyVersion || '-') + '</span></div>' +
        '<div><b>SMS약관</b><span>' + esc(item.smsTermsVersion || '-') + '</span></div>' +
        '<div><b>본인인증약관</b><span>' + esc(item.identityTermsVersion || '-') + '</span></div>' +
      '</details>' +
    '</article>';
  }

  window.SitePassAdminEquipmentPersonnelDetail = Object.freeze({
    render: render
  });
})();
