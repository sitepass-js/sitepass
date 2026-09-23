// SitePass STEP89 v731R3 - member detail adapter / identity only
// Payment/refund processing remains in the existing payment/detail implementation.
(function(){
  'use strict';

  function getAdminMemberActionId(member) {
    if (!member) return '';
    return String(member.id || getAdminMemberCanonicalPrimaryKey(member) || member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.name || '').trim();
  }

  function getAdminMemberActionTokens(member) {
    if (!member) return [];
    const raw = [
      getAdminMemberActionId(member),
      member.id,
      member.supabaseLoginId,
      member.providerId,
      member.signupId,
      member.kakaoUserId,
      member.naverUserId,
      member.phone,
      member.email,
      getAdminMemberCanonicalPrimaryKey(member),
      getAdminMemberNameProviderKey(member)
    ];
    try { getAdminLocalMemberKeys(member).forEach(v => raw.push(v)); } catch (e) {}
    try { getMemberAdminIdentifiers(member).forEach(v => raw.push(v)); } catch (e) {}
    try { getMemberLoginKeys(member).forEach(v => raw.push(v)); } catch (e) {}
    return Array.from(new Set(raw.map(normalizeAdminRoleKey).filter(Boolean)));
  }

  function isSameAdminActionMember(member, memberId) {
    if (!member) return false;
    const q = normalizeAdminRoleKey(memberId);
    if (!q) return false;
    return getAdminMemberActionTokens(member).includes(q);
  }

  function detailRuntime() {
    return window.SitePassAdminDetail || {};
  }

  function toggle(memberId) {
    const mod = detailRuntime();
    if (typeof mod.toggleAdminMemberDetail !== 'function') {
      throw new Error('ADMIN_DETAIL_NOT_READY');
    }
    return mod.toggleAdminMemberDetail(memberId);
  }

  function render(member) {
    const mod = detailRuntime();
    if (typeof mod.renderAdminMemberDetail !== 'function') {
      return '';
    }
    return mod.renderAdminMemberDetail(member);
  }

  function isReady() {
    const mod = detailRuntime();
    return typeof mod.toggleAdminMemberDetail === 'function' &&
      typeof mod.renderAdminMemberDetail === 'function';
  }

  window.SitePassAdminMembersDetail = Object.freeze({
    getAdminMemberActionId,
    getAdminMemberActionTokens,
    isSameAdminActionMember,
    toggle,
    render,
    isReady
  });
})();
