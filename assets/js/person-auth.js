// SitePass v23.7.271 split step 15 - 기사/인부 본인 동의·인증 보조 파일
// 기사/인부 개인정보 서류 등록 전 동의/인증에 필요한 순수 보조 기능입니다.
// 실제 PASS/통신사 API 연동은 나중에 Supabase Edge Function + phone-verify.js로 붙입니다.
(function(){
  'use strict';

  const TEST_PRIVATE_DOC_CODE = '123456';

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function parseMaskedJuminText(raw, fallbackBirth, fallbackGender) {
    const digits = String(raw || '').replace(/\D/g, '');
    const birth6 = (digits.slice(0, 6) || String(fallbackBirth || '')).trim();
    const genderDigit = (digits.slice(6, 7) || String(fallbackGender || '')).trim();
    return {
      birth6,
      genderDigit,
      masked: birth6 && genderDigit ? birth6 + '-' + genderDigit + '******' : String(raw || '').trim()
    };
  }

  function getKindLabel(kind, values) {
    if (kind === 'driver') return '기사';
    const type = values && values.type ? values.type : 'normal';
    return type === 'special' ? '특수인부' : '보통인부';
  }

  function getDefaultName(kind) {
    return kind === 'driver' ? '기사님' : '인부님';
  }

  // v23.7.460: 이 링크는 회원가입용이 아니라 기사/인부 서류등록용입니다.
  function buildConsentLink(kind, code) {
    const role = kind === 'driver' ? 'driver' : 'worker';
    try {
      const url = new URL('./terms/person-consent.html', window.location.href);
      url.searchParams.set('role', role);
      if (code) url.searchParams.set('code', code);
      url.searchParams.set('v', '23.7.460');
      return url.href;
    } catch (e) {
      return './terms/person-consent.html?role=' + role + '&v=23.7.460';
    }
  }

  function buildSmsText(kind, values, context) {
    const safeValues = values || {};
    const safeContext = context || {};
    const name = normalizeText(safeValues.name) || getDefaultName(kind);
    const equipmentNo = normalizeText(safeContext.equipmentNo) || '등록장비';
    const equipmentName = normalizeText(safeContext.equipmentName) || '현장 장비';
    const link = buildConsentLink(kind, safeContext.consentCode || '예시코드');
    return '[SitePass] ' + name + '님, ' + equipmentName + ' ' + equipmentNo + ' 현장 반입서류 등록 요청입니다.\n' +
      '약관/개인정보 링크를 열고 필수 동의 체크를 하면 인증번호가 화면에 표시됩니다.\n' +
      '약관/개인정보 동의 링크: ' + link + '\n' +
      '동의하지 않거나 본인이 요청한 등록이 아니면 링크에서 동의하지 말고 창을 닫으세요.';
  }

  function buildConsentText(kind, values) {
    const safeValues = values || {};
    const role = getKindLabel(kind, safeValues);
    const name = normalizeText(safeValues.name) || getDefaultName(kind);
    return name + '님은 ' + role + ' 현장 반입서류 등록 대상자입니다.\n\n' +
      '동의하면 SitePass가 본인의 현장 반입서류를 등록·보관하고, 장비업자가 현장 담당자에게 서류 확인 링크를 보내는 데 사용할 수 있습니다. 담당자 확인 링크는 보안상 일정 기간 후 접속이 차단되지만, 최초 동의·인증은 현장 링크를 보낼 때마다 반복하지 않습니다.\n\n' +
      '수집·이용 항목: 이름, 휴대폰번호, 인증 및 동의 기록, 신분증, 면허증, 안전교육 이수증, 건강검진서류 등 본인이 직접 촬영·등록한 서류\n' +
      '이용 목적: 현장 장비 반입서류 보관, 현장 담당자 확인, 다운로드·프린트 제공, 서류 갱신 및 민원 대응\n' +
      '보유 기간: 회원의 서비스 이용기간 또는 서류 삭제 요청 시까지. 법령상 보관이 필요한 기록은 해당 기간 보관될 수 있음\n' +
      '거부권: 동의하지 않을 수 있으며, 거부 시 SitePass를 통한 해당 서류 등록·공유가 제한됩니다. 동의하지 않으면 링크에서 동의하지 말고 인증번호를 확인하지 마세요.\n\n' +
      '신분증의 주민등록번호 뒷자리, 주소, 면허번호 일부 등 불필요한 정보는 가림 처리하는 것을 원칙으로 합니다. 건강검진서류 등 민감정보가 포함되는 경우 별도 확인 후 필요한 경우에만 등록합니다.';
  }

  function validateSendValues(kind, values) {
    const label = kind === 'driver' ? '기사' : '인부';
    const safeValues = values || {};
    if (!normalizeText(safeValues.name)) return { ok:false, message:label + ' 이름을 입력해주세요.', focusSelector:'[data-person-auth-name]' };
    if (!safeValues.birth6 || !/^\d{6}$/.test(String(safeValues.birth6)) || !safeValues.genderDigit || !/^[1-8]$/.test(String(safeValues.genderDigit))) {
      return { ok:false, message:label + ' 생년월일은 840507-1처럼 앞 6자리와 성별확인 1자리까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.', focusSelector:'[data-person-auth-jumin]' };
    }
    if (!normalizeText(safeValues.carrier)) return { ok:false, message:label + ' 통신사를 선택해주세요.', focusSelector:'[data-person-auth-carrier]' };
    if (!normalizeText(safeValues.phone)) return { ok:false, message:label + ' 휴대폰번호를 입력해주세요.', focusSelector:'[data-person-auth-phone]' };
    return { ok:true };

  }

  function validateVerifyValues(kind, values, authCodeSent, expectedCode) {
    const label = kind === 'driver' ? '기사' : '인부';
    const safeValues = values || {};
    if (!normalizeText(safeValues.name)) return { ok:false, message:label + ' 이름을 입력해주세요.', focusSelector:'[data-person-auth-name]' };
    if (!normalizeText(safeValues.phone)) return { ok:false, message:'휴대폰번호를 먼저 입력해주세요.', focusSelector:'[data-person-auth-phone]' };
    if (authCodeSent !== 'true') return { ok:false, message:'먼저 약관/개인정보 동의 링크 문자를 발송해주세요.', focusSelector:'[data-person-auth-send-button]' };
    const code = normalizeText(safeValues.code);
    if (!/^\d{6}$/.test(code)) return { ok:false, message:'기사/인부가 동의 후 화면에서 확인한 6자리 인증번호를 입력해주세요.', focusSelector:'[data-person-auth-code]' };
    return { ok:true };
  }

  function buildSentDataset(values) {
    const safeValues = values || {};
    const parsed = parseMaskedJuminText(safeValues.juminMasked || '', safeValues.birth6, safeValues.genderDigit);
    return {
      authCodeSent:'true',
      authPhone: normalizeText(safeValues.phone),
      authName: normalizeText(safeValues.name),
      authBirth6: parsed.birth6,
      authGenderDigit: parsed.genderDigit,
      authJuminMasked: safeValues.juminMasked || parsed.masked || (parsed.birth6 && parsed.genderDigit ? parsed.birth6 + '-' + parsed.genderDigit + '******' : ''),
      authCarrier: normalizeText(safeValues.carrier),
      authType: normalizeText(safeValues.type)
    };
  }

  function buildVerifiedMeta(values, nowIso) {
    const safeValues = values || {};
    return {
      personName: normalizeText(safeValues.name),
      phone: normalizeText(safeValues.phone),
      type: normalizeText(safeValues.type),
      verifiedAt: String(nowIso || new Date().toISOString())
    };
  }

  window.SitePassPersonAuth = {
    TEST_PRIVATE_DOC_CODE,
    normalizeText,
    normalizePhone,
    parseMaskedJuminText,
    getKindLabel,
    buildConsentLink,
    buildSmsText,
    buildConsentText,
    validateSendValues,
    validateVerifyValues,
    buildSentDataset,
    buildVerifiedMeta
  };
})();
