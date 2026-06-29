/* SitePass v23.7.194 - 강제탈퇴 재로그인 차단 + 회원목록 가입경로 분류
   적용 위치: v23.7.193 HTML의 기존 <script> 내부, 로그인/관리자 함수들과 함께 사용합니다. */

function sp194Text(value) {
  return String(value || '').trim();
}

function sp194Lower(value) {
  return sp194Text(value).toLowerCase();
}

function sp194Digits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function sp194ProviderKind(memberOrProvider) {
  const raw = typeof memberOrProvider === 'string'
    ? memberOrProvider
    : [
        memberOrProvider?.provider,
        memberOrProvider?.signupMethod,
        memberOrProvider?.providerId,
        memberOrProvider?.kakaoUserId,
        memberOrProvider?.naverUserId,
        memberOrProvider?.email
      ].join(' ');
  const text = sp194Lower(raw);
  if (text.includes('kakao') || text.includes('카카오')) return 'kakao';
  if (text.includes('naver') || text.includes('네이버')) return 'naver';
  if (text.includes('sitepass') || text.includes('자체') || text.includes('일반') || text.includes('휴대폰')) return 'sitepass';
  if (memberOrProvider && typeof memberOrProvider === 'object' && (memberOrProvider.signupId || memberOrProvider.testPassword)) return 'sitepass';
  return 'sitepass';
}

function sp194IsKakaoMember(member) {
  return sp194ProviderKind(member) === 'kakao';
}

function sp194IsNaverMember(member) {
  return sp194ProviderKind(member) === 'naver';
}

function sp194IsSitePassMember(member) {
  const kind = sp194ProviderKind(member);
  return kind !== 'kakao' && kind !== 'naver';
}

function sp194StableKeys(member) {
  const out = [];
  if (!member) return out;
  const id = sp194Lower(member.id);
  const signupId = sp194Lower(member.signupId);
  const providerId = sp194Lower(member.providerId);
  const email = sp194Lower(member.email);
  const phone = sp194Digits(member.phone);
  const kakaoId = sp194Lower(member.kakaoUserId);
  const naverId = sp194Lower(member.naverUserId);
  if (id) out.push('id:' + id);
  if (signupId) out.push('signup:' + signupId);
  if (providerId) out.push('provider:' + providerId);
  if (email) out.push('email:' + email);
  if (phone) out.push('phone:' + phone);
  if (kakaoId) out.push('kakao:' + kakaoId);
  if (naverId) out.push('naver:' + naverId);
  return Array.from(new Set(out));
}

function sp194LoginKeysFromText(value) {
  const text = sp194Lower(value);
  const digits = sp194Digits(value);
  const out = [];
  if (text) {
    out.push('id:' + text, 'signup:' + text, 'provider:' + text, 'email:' + text);
  }
  if (digits) out.push('phone:' + digits);
  return Array.from(new Set(out));
}

function sp194IsGenericSocialMember(member) {
  if (!member) return false;
  const providerId = sp194Lower(member.providerId);
  const name = sp194Lower(member.name);
  const hasStable = !!(sp194Lower(member.email) || sp194Digits(member.phone) || sp194Lower(member.kakaoUserId) || sp194Lower(member.naverUserId));
  return /-(login|beta|test)-\d+/.test(providerId) || (!hasStable && (name.includes('사용자') || name.includes('임시')) && (sp194IsKakaoMember(member) || sp194IsNaverMember(member)));
}

function sp194GetWithdrawnRows() {
  try {
    return (typeof getWithdrawnMembers === 'function' ? getWithdrawnMembers() : JSON.parse(localStorage.getItem(ADMIN_WITHDRAWN_MEMBERS_KEY) || '[]')) || [];
  } catch (e) {
    return [];
  }
}

function sp194FindWithdrawnMember(member, options) {
  options = options || {};
  if (!member) return null;
  const memberKeys = sp194StableKeys(member);
  const providerKind = sp194ProviderKind(member);
  const generic = sp194IsGenericSocialMember(member);
  const withdrawn = sp194GetWithdrawnRows();
  for (const row of withdrawn) {
    const w = { ...row, withdrawn:true, status:row.status || '강제탈퇴' };
    const wKeys = sp194StableKeys(w);
    if (memberKeys.some(key => wKeys.includes(key))) return w;
    const sameProvider = sp194ProviderKind(w) === providerKind;
    if (sameProvider && (w.withdrawnProviderLock || w.providerOnlyBlock) && options.blockGenericProvider) return w;
    if (sameProvider && generic && sp194IsGenericSocialMember(w) && sp194Lower(w.name) === sp194Lower(member.name)) return w;
  }
  return null;
}

function sp194FindWithdrawnByLoginText(loginText) {
  const keys = sp194LoginKeysFromText(loginText);
  if (!keys.length) return null;
  return sp194GetWithdrawnRows().find(row => {
    const rowKeys = sp194StableKeys(row);
    return keys.some(key => rowKeys.includes(key));
  }) || null;
}

function sp194ProviderHasGenericWithdrawn(provider) {
  const kind = sp194ProviderKind(provider);
  return sp194GetWithdrawnRows().some(row => sp194ProviderKind(row) === kind && (row.withdrawnProviderLock || row.providerOnlyBlock || sp194IsGenericSocialMember(row)));
}

function sp194BlockedAlert(row, label) {
  const name = row ? (row.name || row.signupId || row.providerId || '해당 회원') : '해당 회원';
  alert((label || '로그인') + '이 차단되었습니다.\n\n' + name + ' 계정은 최고관리자가 강제탈퇴 처리한 기록이 있습니다.\n최고관리자가 복구하기 전에는 같은 계정으로 다시 접속할 수 없습니다.');
}

function sp194BlockIfWithdrawn(member, label, options) {
  const hit = sp194FindWithdrawnMember(member, options || {});
  if (hit) {
    sp194BlockedAlert(hit, label);
    return true;
  }
  return false;
}

function sp194MemberSocialLabel(member) {
  if (sp194IsKakaoMember(member)) return '카카오가입자';
  if (sp194IsNaverMember(member)) return '네이버가입자';
  return '일반/SitePass회원';
}
