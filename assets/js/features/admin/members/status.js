// SitePass STEP89 v731R3 - member status/folder responsibility
(function(){
  'use strict';

  const state = window.SitePassAdminMembersState;
  if (!state) throw new Error('STEP89_MEMBERS_STATE_NOT_READY');

  const SITEPASS_MEMBER_PAYMENT_DRILLDOWN_FOLDERS_V731R2 = [
    'newPay',
    'extensionPay',
    'refundRequest',
    'refund'
  ];

  const getAdminMemberFolderState = () => state.getMemberFolder();
  const setAdminMemberFolderState = value => state.setMemberFolder(value);
  const setAdminMemberPageState = value => state.setMemberPage(value);
  const setAdminExpandedMemberIdState = value => state.setExpandedMemberId(value);

  function isAdminAccountMember(member) {
    const role = member?.adminRole || supabaseRoleToAdminRole(member?.role);
    return member?.isSuperAdminVirtual || [SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role);
  }

  function getAdminMemberCounts(activeMembers, withdrawnMembers) {
    // v23.7.241: 초기화 후 최고관리자 1명만 남아 있어도
    // 전체회원/신규회원/일반회원 숫자에 최고관리자를 포함하지 않습니다.
    // 최고관리자는 별도 '최고관리자' 폴더에서만 셉니다.
    const userMembers = (activeMembers || []).filter(m => !m?.withdrawn && !isAdminAccountMember(m));
    const adminMembers = (activeMembers || []).filter(m => !m?.withdrawn && isAdminAccountMember(m));
    const providerCounts = getAdminSignupProviderCounts(userMembers);
    const counts = {
      all: userMembers.length,
      normal: userMembers.filter(m => !m.suspended).length,
      newSignup: countTodaySignups(userMembers),
      free: userMembers.filter(m => String(getMemberPlanInfo(m).label).includes('무료')).length,
      monthly: userMembers.filter(m => String(getMemberPlanInfo(m).label).includes('1개월') || String(getMemberPlanInfo(m).label).includes('monthly')).length,
      due: userMembers.filter(isMemberPaymentDueSoon).length,
      grace14: userMembers.filter(isMemberGrace14Over).length,
      super: adminMembers.filter(m => (m.adminRole || supabaseRoleToAdminRole(m.role)) === SUPER_ADMIN_ROLE_NAME).length,
      admin: adminMembers.filter(m => ['관리자','운영관리자','조회관리자'].includes(m.adminRole || supabaseRoleToAdminRole(m.role))).length,
      suspended: userMembers.filter(m => m.suspended || m.status === '정지').length,
      withdrawn: withdrawnMembers.length,
      newPay: userMembers.filter(m => String(m.paymentStatus || m.status || '').includes('신규결제')).length,
      extensionPay: userMembers.filter(m => String(m.paymentStatus || m.status || '').includes('연장결제')).length,
      refundRequest: userMembers.filter(m => m.refundRequestPending || String(m.paymentStatus || '').includes('환불요청')).length,
      refund: userMembers.filter(m => String(m.paymentStatus || m.status || '').includes('환불처리')).length,
      signupTotal: providerCounts.total,
      signupKakao: providerCounts.kakao,
      signupNaver: providerCounts.naver,
      signupSitepass: providerCounts.sitepass
    };
    return counts;
  }

  function getAdminFolderLabel(key) {
    const labels = {
      all:'전체회원',
      normal:'일반회원',
      newSignup:'신규회원',
      free:'베타',
      monthly:'기존 1개월권',
      due:'만료예정',
      grace14:'유예14일 이상',
      super:'최고관리자',
      admin:'관리자',
      suspended:'정지회원',
      newPay:'신규결제',
      extensionPay:'연장결제',
      refundRequest:'환불요청',
      refund:'환불처리',
      withdrawn:'강제탈퇴'
    };
    return labels[key] || '전체회원';
  }

  function filterAdminMembersByFolder(member, folder) {
    if (folder === 'withdrawn') return !!member.withdrawn;
    if (member.withdrawn) return false;
    const isAdminAccount = isAdminAccountMember(member);
    if (folder === 'super') return (member.adminRole || supabaseRoleToAdminRole(member.role)) === SUPER_ADMIN_ROLE_NAME;
    if (folder === 'admin') return ['관리자','운영관리자','조회관리자'].includes(member.adminRole || supabaseRoleToAdminRole(member.role));
    // v23.7.241: 전체회원/신규회원/일반회원/결제 폴더에는 최고관리자와 관리자를 섞지 않습니다.
    if (isAdminAccount) return false;
    if (folder === 'all') return true;
    if (folder === 'normal') return !member.suspended;
    if (folder === 'newSignup') return getLocalDateKey(member?.createdAt) === getLocalDateKey();
    if (folder === 'free') return String(getMemberPlanInfo(member).label).includes('무료');
    if (folder === 'monthly') return String(getMemberPlanInfo(member).label).includes('1개월') || String(getMemberPlanInfo(member).label).includes('monthly');
    if (folder === 'due') return isMemberPaymentDueSoon(member);
    if (folder === 'grace14') return isMemberGrace14Over(member);
    if (folder === 'suspended') return member.suspended || member.status === '정지';
    if (folder === 'newPay') return String(member.paymentStatus || member.status || '').includes('신규결제');
    if (folder === 'extensionPay') return String(member.paymentStatus || member.status || '').includes('연장결제');
    if (folder === 'refundRequest') return member.refundRequestPending || String(member.paymentStatus || '').includes('환불요청');
    if (folder === 'refund') return String(member.paymentStatus || member.status || '').includes('환불처리');
    return true;
  }

  function setAdminMemberFolder(folder) {
    if (folder === 'free') folder = 'all';
    setAdminMemberFolderState(folder || 'all');
    setAdminMemberPageState(0);
    setAdminExpandedMemberIdState('');
    renderAdmin();
  }

  function normalizeDirectMemberFolderV731R2() {
    const current = getAdminMemberFolderState();
    if (!SITEPASS_MEMBER_PAYMENT_DRILLDOWN_FOLDERS_V731R2.includes(current)) return false;

    // 결제관리에서 회원목록으로 들어온 경우에만 숨은 결제 filter를 사용합니다.
    // 상단의 "회원관리"를 직접 열면 결제업무 filter를 남기지 않습니다.
    setAdminMemberFolderState('all');
    setAdminMemberPageState(0);
    setAdminExpandedMemberIdState('');
    return true;
  }

  window.SitePassAdminMembersStatus = Object.freeze({
    PAYMENT_DRILLDOWN_FOLDERS: SITEPASS_MEMBER_PAYMENT_DRILLDOWN_FOLDERS_V731R2.slice(),
    isAdminAccountMember,
    getAdminMemberCounts,
    getAdminFolderLabel,
    filterAdminMembersByFolder,
    setAdminMemberFolder,
    normalizeDirectMemberFolderV731R2
  });
})();
