/* SitePass v23.7.354 - 네이버 SENS 문자 인증/동의 후 코드표시 실제 연동 보조 모듈
 * - API Key/Secret은 절대 GitHub에 넣지 않습니다.
 * - 브라우저는 Supabase Edge Function만 호출합니다.
 * - Edge Function이 Supabase Secrets의 SENS 키로 네이버 SENS를 호출합니다.
 */
(function(){
  'use strict';

  const VERSION = 'v23.7.354';

  function cleanPhone(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function formatPhone(value) {
    const phone = cleanPhone(value);
    if (phone.length === 11) return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (phone.length === 10) return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return String(value || '');
  }

  function safeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseBirthFromInput(raw) {
    const text = String(raw || '');
    const digits = text.replace(/\D/g, '');
    const birth6 = digits.slice(0, 6);
    const genderDigit = digits.slice(6, 7);
    return { birth6, genderDigit };
  }

  function birth6GenderToDate(birth6, genderDigit) {
    const b = String(birth6 || '').replace(/\D/g, '').slice(0, 6);
    const g = String(genderDigit || '').replace(/\D/g, '').slice(0, 1);
    if (!/^\d{6}$/.test(b)) return '';
    let century = '19';
    if (/[34]/.test(g)) century = '20';
    if (/[56]/.test(g)) century = '19';
    if (/[78]/.test(g)) century = '20';
    const yy = b.slice(0, 2);
    const mm = b.slice(2, 4);
    const dd = b.slice(4, 6);
    const date = `${century}${yy}-${mm}-${dd}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
    const d = new Date(date + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '';
    if (String(d.getFullYear()).padStart(4, '0') !== date.slice(0, 4)) return '';
    if (String(d.getMonth() + 1).padStart(2, '0') !== mm) return '';
    if (String(d.getDate()).padStart(2, '0') !== dd) return '';
    return date;
  }

  function nowKoText(iso) {
    try { return new Date(iso || Date.now()).toLocaleString('ko-KR'); }
    catch (e) { return safeText(iso); }
  }

  function getConfig() {
    const cfg = window.SITEPASS_DB_CONFIG || window.SITEPASS_CONFIG || window.sitepassConfig || window.SUPABASE_CONFIG || {};
    return {
      supabaseUrl: cfg.supabaseUrl || cfg.SUPABASE_URL || window.SUPABASE_URL || '',
      supabaseAnonKey: cfg.supabaseAnonKey || cfg.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || ''
    };
  }

  async function invokeFunction(name, body) {
    const client = window.sitepassSupabase || window.supabaseClient || null;
    if (client && client.functions && typeof client.functions.invoke === 'function') {
      const result = await client.functions.invoke(name, { body: body || {} });
      if (result.error) {
        const err = new Error(result.error.message || String(result.error));
        err.data = result.data;
        throw err;
      }
      if (result.data && result.data.ok === false) {
        const err = new Error(result.data.error || 'function_error');
        err.data = result.data;
        throw err;
      }
      return result.data;
    }
    const cfg = getConfig();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error('Supabase 설정을 찾지 못했습니다. assets/js/config.js를 확인하세요.');
    }
    const res = await fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1/' + name, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apikey': cfg.supabaseAnonKey,
        'authorization': 'Bearer ' + cfg.supabaseAnonKey
      },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(function(){ return {}; });
    if (!res.ok || data.ok === false) {
      const err = new Error(data.error || ('function_failed_' + name));
      err.data = data;
      throw err;
    }
    return data;
  }

  function koreanError(err) {
    const key = (err && err.data && err.data.error) || (err && err.message) || String(err || '');
    const map = {
      invalid_subject_type: '인증 대상이 올바르지 않습니다.',
      name_required: '이름을 입력해야 합니다.',
      birth_date_required: '생년월일을 확인해야 합니다.',
      invalid_phone: '휴대폰번호 형식이 올바르지 않습니다.',
      required_terms_not_agreed: '필수 약관/개인정보/문자 발송 동의가 필요합니다.',
      terms_url_required: '약관 및 개인정보 동의 링크가 필요합니다.',
      consent_required: '약관/개인정보 동의가 먼저 필요합니다. 문자 링크에서 동의 후 표시된 인증번호를 입력하세요.',
      consent_token_invalid: '동의 링크가 올바르지 않습니다. 새로 발송해주세요.',
      required_consent_checks_missing: '필수 동의 항목을 모두 체크해야 인증번호가 표시됩니다.',
      resend_limited: '재발송 제한 중입니다. 60초 뒤 다시 시도하세요.',
      verification_id_required: '인증 요청 정보가 없습니다. 인증번호를 다시 발송하세요.',
      invalid_code: '인증번호 6자리를 입력하세요.',
      verification_not_found: '인증 요청을 찾지 못했습니다. 다시 발송하세요.',
      code_expired: '인증번호가 만료되었습니다. 다시 발송하세요.',
      too_many_attempts: '인증번호 입력 횟수를 초과했습니다. 다시 발송하세요.',
      code_mismatch: '인증번호가 맞지 않습니다.',
      send_phone_code_failed: '문자 발송에 실패했습니다. Supabase Secrets와 SENS 발신번호를 확인하세요.',
      verify_phone_code_failed: '인증번호 확인에 실패했습니다.',
      reveal_phone_code_failed: '동의 확인 및 인증번호 표시 처리에 실패했습니다.'
    };
    return map[key] || key || '처리 중 오류가 발생했습니다.';
  }

  async function sendPhoneCode(payload) {
    const body = Object.assign({ termsVersion: VERSION }, payload || {});
    body.phone = cleanPhone(body.phone);
    return await invokeFunction('send-phone-code', body);
  }

  async function verifyPhoneCode(verificationId, code) {
    return await invokeFunction('verify-phone-code', {
      verificationId: verificationId,
      code: cleanPhone(code)
    });
  }

  async function revealPhoneCode(payload) {
    return await invokeFunction('reveal-phone-code', payload || {});
  }

  async function prepareIdentityCheck(payload) {
    return await invokeFunction('prepare-identity-check', payload || {});
  }

  function renderVerifiedFooter(data) {
    data = data || {};
    const name = data.name || data.personName || data.authPersonName || '-';
    const phone = data.phone || data.authPhone || '';
    const last4 = data.phoneLast4 || '';
    const phoneText = phone ? formatPhone(phone) : (last4 ? '***-****-' + last4 : '-');
    const verifiedAt = data.verifiedAt || data.authVerifiedAt || data.phoneVerifiedAt || '';
    const identityText = data.identityVerifiedAt ? '완료' : '미완료';
    return '<div class="id-extra-strip sp351-id-extra-strip">' +
      '<div><b>이름</b>: ' + escapeHtml(name) + '</div>' +
      '<div><b>휴대폰</b>: ' + escapeHtml(phoneText) + '</div>' +
      '<div><b>휴대폰 인증</b>: 완료' + (verifiedAt ? ' / ' + escapeHtml(nowKoText(verifiedAt)) : '') + '</div>' +
      '<div><b>본인확인</b>: ' + escapeHtml(identityText) + '</div>' +
      '<div class="small">※ 위 이름과 첨부 신분증 이름이 일치하는지 확인하세요.</div>' +
    '</div>';
  }

  function lockElements(elements) {
    (elements || []).forEach(function(el){
      if (!el) return;
      if (el.tagName === 'SELECT' || el.tagName === 'BUTTON' || el.type === 'checkbox') el.disabled = true;
      else el.readOnly = true;
      el.classList.add('sp351-locked');
    });
  }

  function installStyle() {
    if (document.getElementById('sp351-sens-style')) return;
    const style = document.createElement('style');
    style.id = 'sp351-sens-style';
    style.textContent = [
      '.sp351-locked{background:#f8fafc!important;color:#475569!important}',
      '.sp351-id-extra-strip{border-top:1px dashed #cbd5e1;margin-top:8px;padding:8px 10px;background:#f8fafc;border-radius:10px;text-align:left;font-size:12px;line-height:1.45;color:#172033}',
      '.sp351-id-extra-strip b{color:#475569}',
      '.sp351-id-extra-strip .small{font-size:11px;color:#b86400;margin-top:4px}',
      '.sp351-sens-note{font-size:12px;color:#2457d6;line-height:1.45;margin-top:4px}'
    ].join('\n');
    document.head.appendChild(style);
  }

  installStyle();

  window.SitePassSens351 = {
    version: VERSION,
    cleanPhone,
    formatPhone,
    escapeHtml,
    safeText,
    parseBirthFromInput,
    birth6GenderToDate,
    nowKoText,
    sendPhoneCode,
    verifyPhoneCode,
    revealPhoneCode,
    prepareIdentityCheck,
    koreanError,
    renderVerifiedFooter,
    lockElements
  };
})();
