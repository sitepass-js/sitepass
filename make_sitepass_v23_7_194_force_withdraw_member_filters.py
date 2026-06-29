#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SitePass v23.7.194 patcher
- 강제탈퇴 회원이 카카오/네이버/SitePass 로그인으로 즉시 재접속되는 문제 차단
- 카카오 OAuth 시작 시 기존 Supabase 세션을 먼저 끊고 prompt=login으로 계정 확인 유도
- 최고관리자 회원목록에 일반/SitePass, 카카오가입자, 네이버가입자, 강제탈퇴 분류 추가

사용:
  python make_sitepass_v23_7_194_force_withdraw_member_filters.py \
    /mnt/data/sitepass_v23_7_193_admin_single_role_no_reset.html \
    /mnt/data/sitepass_v23_7_194_force_withdraw_member_filters.html
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

SRC_DEFAULT = Path('/mnt/data/sitepass_v23_7_193_admin_single_role_no_reset.html')
OUT_DEFAULT = Path('/mnt/data/sitepass_v23_7_194_force_withdraw_member_filters.html')
HELPER_PATH = Path('/mnt/data/sitepass_v23_7_194_force_withdraw_member_filters_patch.js')


def find_function_span(text: str, name: str):
    pattern = re.compile(r'(async\s+function\s+' + re.escape(name) + r'\s*\([^)]*\)\s*\{|function\s+' + re.escape(name) + r'\s*\([^)]*\)\s*\{)')
    m = pattern.search(text)
    if not m:
        return None
    start = m.start()
    brace = text.find('{', m.start())
    depth = 0
    i = brace
    in_str = None
    escape = False
    in_line_comment = False
    in_block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i+1] if i + 1 < len(text) else ''
        if in_line_comment:
            if ch == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if ch == '*' and nxt == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            in_line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            in_block_comment = True
            i += 2
            continue
        if ch in ('"', "'", '`'):
            in_str = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    return None


def replace_function(text: str, name: str, replacement: str) -> str:
    span = find_function_span(text, name)
    if not span:
        raise RuntimeError(f'Cannot find function {name}')
    start, end = span
    return text[:start] + replacement.strip() + text[end:]


HELPERS = HELPER_PATH.read_text(encoding='utf-8')

SUBMIT_SOCIAL_LOGIN = r"""
function submitSocialLoginTest(provider) {
      const providerLabel = provider === '네이버' ? '네이버' : provider;
      const member = {
        name: providerLabel + ' 사용자',
        phone: '',
        provider,
        providerId: provider + '-LOGIN-' + Date.now(),
        signupMethod: providerLabel + ' 계정 로그인'
      };
      if (sp194ProviderHasGenericWithdrawn(provider)) {
        alert(providerLabel + ' 계정 강제탈퇴 기록이 있습니다.\n\n임시 테스트 소셜 로그인은 실제 계정 식별값을 확인할 수 없어 자동 접속을 막았습니다.\n정식 OAuth 계정 확인 또는 최고관리자 복구 후 다시 진행해주세요.');
        return;
      }
      if (sp194BlockIfWithdrawn(member, providerLabel + ' 로그인', { blockGenericProvider:true })) return;
      saveMemberTest(member);
      if (sp194BlockIfWithdrawn(member, providerLabel + ' 로그인', { blockGenericProvider:true })) return;
      completeMemberLoginTest(member, providerLabel + ' 계정으로 로그인되었습니다.\nSitePass 메인 화면으로 이동합니다.');
    }
"""

START_KAKAO = r"""
async function startSupabaseKakaoOAuth(mode) {
      try {
        if (!window.sitepassSupabase || !window.sitepassSupabase.auth) {
          alert('Supabase 연결을 찾지 못했습니다. 임시 테스트 로그인으로 진행합니다.');
          submitSocialLoginTest('카카오톡');
          return;
        }
        if (mode === 'signup' && !requireSignupTerms()) return;
        setSessionValue(SITEPASS_OAUTH_PENDING_KEY, JSON.stringify({ provider:'kakao', mode:mode || 'login', startedAt:new Date().toISOString() }));

        // v23.7.194: 강제탈퇴 직후 기존 카카오/Supabase 세션이 남아 자동 재접속되는 것을 막습니다.
        try { await window.sitepassSupabase.auth.signOut({ scope:'local' }); } catch (signOutError) {
          try { await window.sitepassSupabase.auth.signOut(); } catch (e) {}
        }

        const { error } = await window.sitepassSupabase.auth.signInWithOAuth({
          provider:'kakao',
          options:{
            redirectTo:getOAuthRedirectUrl(),
            // 카카오 계정 선택/로그인 화면을 다시 띄워 “묻지도 않고 접속”되는 현상을 줄입니다.
            queryParams:{ prompt:'login' }
          }
        });
        if (error) {
          removeSessionValue(SITEPASS_OAUTH_PENDING_KEY);
          alert('카카오 로그인 시작에 실패했습니다.\n' + (error.message || 'Supabase/Kakao 설정을 확인해주세요.'));
        }
      } catch (e) {
        removeSessionValue(SITEPASS_OAUTH_PENDING_KEY);
        alert('카카오 로그인 연결 중 오류가 났습니다. Supabase Kakao 설정을 확인해주세요.');
      }
    }
"""

HANDLE_KAKAO_RETURN = r"""
async function handleSupabaseKakaoOAuthReturn() {
      if (!window.sitepassSupabase || !window.sitepassSupabase.auth) return false;
      let pending = null;
      try { pending = JSON.parse(getSessionValue(SITEPASS_OAUTH_PENDING_KEY) || 'null'); } catch (e) { pending = null; }
      if (!pending && !hasSupabaseKakaoReturnParams()) return false;
      try {
        const { data, error } = await window.sitepassSupabase.auth.getSession();
        if (error) {
          alert('카카오 로그인 확인 중 오류가 났습니다.\n' + (error.message || ''));
          return false;
        }
        const user = data?.session?.user;
        if (!user) return false;
        const member = makeMemberFromSupabaseKakaoUser(user, pending || { mode:'login' });
        const blocked = sp194FindWithdrawnMember(member, { blockGenericProvider:false });
        if (blocked) {
          try { await window.sitepassSupabase.auth.signOut({ scope:'local' }); } catch (e) { try { await window.sitepassSupabase.auth.signOut(); } catch (ignore) {} }
          removeSessionValue(SITEPASS_OAUTH_PENDING_KEY);
          removeSessionValue(CURRENT_MEMBER_KEY);
          if (hasSupabaseKakaoReturnParams()) {
            try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (e) {}
          }
          sp194BlockedAlert(blocked, '카카오 로그인');
          showScreen('signupScreen');
          return true;
        }
        saveMemberTest(member);
        removeSessionValue(SITEPASS_OAUTH_PENDING_KEY);
        if (hasSupabaseKakaoReturnParams()) {
          try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (e) {}
        }
        completeMemberLoginTest(member, '카카오 로그인이 완료되었습니다.\n처음 이용하는 경우 SitePass 추가정보는 회원정보/본인확인 단계에서 이어서 보완합니다.');
        return true;
      } catch (e) {
        alert('카카오 로그인 처리 중 오류가 났습니다.');
        return false;
      }
    }
"""

FORCE_WITHDRAW = r"""
function forceWithdrawMember(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('회원 강제탈퇴는 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) {
        alert('회원을 찾을 수 없습니다.');
        return;
      }
      const targetName = getMemberDisplayName(target);
      if (!confirm(targetName + '님을 강제탈퇴 처리할까요?\n\n회원 목록에서 삭제되고 관리자 권한도 함께 해제됩니다.')) return;
      if (!confirm('정말 삭제할까요?\n강제탈퇴 기록은 관리자관리의 강제탈퇴 폴더에 남기고, 같은 계정의 재로그인을 차단합니다.')) return;

      syncMemberAdminRoleMap(target, '');
      const withdrawnList = getWithdrawnMembers();
      const providerKind = sp194ProviderKind(target);
      const loginKeys = sp194StableKeys(target);
      withdrawnList.unshift({
        ...target,
        withdrawn:true,
        status:'강제탈퇴',
        adminRole:'',
        providerKind,
        withdrawnLoginKeys:loginKeys,
        withdrawnProviderLock:sp194IsGenericSocialMember(target),
        withdrawnAt:new Date().toISOString(),
        withdrawnBy:getSessionValue(ADMIN_SESSION_KEY + '_id') || SUPER_ADMIN_ROLE_NAME
      });
      setWithdrawnMembers(withdrawnList.slice(0, 500));

      const remained = members.filter(member => String(member.id) !== String(memberId));
      setMembers(remained);

      try {
        const current = JSON.parse(getSessionValue(CURRENT_MEMBER_KEY) || 'null');
        const sameCurrent = current && (
          String(current.id || '') === String(target.id || '') ||
          String(current.signupId || '').toLowerCase() === String(target.signupId || '').toLowerCase() ||
          String(current.providerId || '').toLowerCase() === String(target.providerId || '').toLowerCase() ||
          String(current.phone || '').replace(/[^0-9]/g, '') === String(target.phone || '').replace(/[^0-9]/g, '')
        );
        if (sameCurrent) removeSessionValue(CURRENT_MEMBER_KEY);
      } catch (e) {}

      // 같은 브라우저에서 테스트 중이면 남아있는 Kakao/Supabase 세션도 끊어 자동 재접속을 막습니다.
      try {
        if (window.sitepassSupabase && window.sitepassSupabase.auth && (providerKind === 'kakao' || providerKind === 'naver')) {
          window.sitepassSupabase.auth.signOut({ scope:'local' }).catch(function(){ try { window.sitepassSupabase.auth.signOut(); } catch (e) {} });
        }
      } catch (e) {}

      alert(targetName + '님을 강제탈퇴 처리했습니다.\n같은 계정의 자동 재로그인도 차단했습니다.');
      refreshMemberUi();
      renderAdmin();
    }
"""

GET_COUNTS = r"""
function getAdminMemberCounts(activeMembers, withdrawnMembers) {
      const counts = {
        all: activeMembers.length,
        normal: activeMembers.filter(m => !m.adminRole && !m.suspended).length,
        sitepassSelf: activeMembers.filter(m => !m.adminRole && !m.suspended && sp194IsSitePassMember(m)).length,
        kakaoMembers: activeMembers.filter(m => !m.adminRole && !m.suspended && sp194IsKakaoMember(m)).length,
        naverMembers: activeMembers.filter(m => !m.adminRole && !m.suspended && sp194IsNaverMember(m)).length,
        newSignup: countTodaySignups(activeMembers),
        free: activeMembers.filter(m => String(getMemberPlanInfo(m).label).includes('무료')).length,
        monthly: activeMembers.filter(m => String(getMemberPlanInfo(m).label).includes('1개월') || String(getMemberPlanInfo(m).label).includes('monthly')).length,
        due: activeMembers.filter(isMemberPaymentDueSoon).length,
        grace14: activeMembers.filter(isMemberGrace14Over).length,
        super: activeMembers.filter(m => m.adminRole === SUPER_ADMIN_ROLE_NAME).length,
        admin: activeMembers.filter(m => m.adminRole === '관리자').length,
        operator: activeMembers.filter(m => m.adminRole === '운영관리자').length,
        viewer: activeMembers.filter(m => m.adminRole === '조회관리자').length,
        suspended: activeMembers.filter(m => m.suspended || m.status === '정지').length,
        withdrawn: withdrawnMembers.length,
        withdrawnKakao: withdrawnMembers.filter(sp194IsKakaoMember).length,
        withdrawnNaver: withdrawnMembers.filter(sp194IsNaverMember).length,
        withdrawnSitePass: withdrawnMembers.filter(sp194IsSitePassMember).length,
        newPay: activeMembers.filter(m => String(m.paymentStatus || m.status || '').includes('신규결제')).length,
        extensionPay: activeMembers.filter(m => String(m.paymentStatus || m.status || '').includes('연장결제')).length,
        refundRequest: activeMembers.filter(m => m.refundRequestPending || String(m.paymentStatus || '').includes('환불요청')).length,
        refund: activeMembers.filter(m => String(m.paymentStatus || m.status || '').includes('환불처리')).length
      };
      return counts;
    }
"""

GET_LABEL = r"""
function getAdminFolderLabel(key) {
      const labels = {
        all:'전체회원',
        normal:'일반회원',
        sitepassSelf:'일반/SitePass',
        kakaoMembers:'카카오가입자',
        naverMembers:'네이버가입자',
        newSignup:'신규회원',
        free:'베타',
        monthly:'1개월권',
        due:'만료예정',
        grace14:'유예14일 이상',
        super:'최고관리자',
        admin:'관리자',
        operator:'운영관리자',
        viewer:'조회관리자',
        suspended:'정지회원',
        newPay:'신규결제',
        extensionPay:'연장결제',
        refundRequest:'환불요청',
        refund:'환불처리',
        withdrawn:'강제탈퇴',
        withdrawnKakao:'강제탈퇴-카카오',
        withdrawnNaver:'강제탈퇴-네이버',
        withdrawnSitePass:'강제탈퇴-일반'
      };
      return labels[key] || '전체회원';
    }
"""

FILTER_FOLDER = r"""
function filterAdminMembersByFolder(member, folder) {
      if (folder === 'withdrawn') return !!member.withdrawn;
      if (folder === 'withdrawnKakao') return !!member.withdrawn && sp194IsKakaoMember(member);
      if (folder === 'withdrawnNaver') return !!member.withdrawn && sp194IsNaverMember(member);
      if (folder === 'withdrawnSitePass') return !!member.withdrawn && sp194IsSitePassMember(member);
      if (member.withdrawn) return false;
      if (folder === 'all') return true;
      if (folder === 'normal') return !member.adminRole && !member.suspended;
      if (folder === 'sitepassSelf') return !member.adminRole && !member.suspended && sp194IsSitePassMember(member);
      if (folder === 'kakaoMembers') return !member.adminRole && !member.suspended && sp194IsKakaoMember(member);
      if (folder === 'naverMembers') return !member.adminRole && !member.suspended && sp194IsNaverMember(member);
      if (folder === 'newSignup') return getLocalDateKey(member?.createdAt) === getLocalDateKey();
      if (folder === 'free') return String(getMemberPlanInfo(member).label).includes('무료');
      if (folder === 'monthly') return String(getMemberPlanInfo(member).label).includes('1개월') || String(getMemberPlanInfo(member).label).includes('monthly');
      if (folder === 'due') return isMemberPaymentDueSoon(member);
      if (folder === 'grace14') return isMemberGrace14Over(member);
      if (folder === 'super') return member.adminRole === SUPER_ADMIN_ROLE_NAME;
      if (folder === 'admin') return member.adminRole === '관리자';
      if (folder === 'operator') return member.adminRole === '운영관리자';
      if (folder === 'viewer') return member.adminRole === '조회관리자';
      if (folder === 'suspended') return member.suspended || member.status === '정지';
      if (folder === 'newPay') return String(member.paymentStatus || member.status || '').includes('신규결제');
      if (folder === 'extensionPay') return String(member.paymentStatus || member.status || '').includes('연장결제');
      if (folder === 'refundRequest') return member.refundRequestPending || String(member.paymentStatus || '').includes('환불요청');
      if (folder === 'refund') return String(member.paymentStatus || member.status || '').includes('환불처리');
      return true;
    }
"""


def patch_text(html: str) -> str:
    # version labels only, no storage key reset
    html = html.replace('v23.7.193', 'v23.7.194')
    html = html.replace('admin-single-role-no-reset', 'force-withdraw-member-filters')
    html = html.replace("appVersion: 'v23.7.193'", "appVersion: 'v23.7.194'")
    html = html.replace('sitepass.webmanifest?v=23.7.193', 'sitepass.webmanifest?v=23.7.194')

    # Insert helper functions before submitSocialLoginTest if not already inserted
    if 'function sp194ProviderKind' not in html:
        marker = 'function submitSocialLoginTest(provider)'
        idx = html.find(marker)
        if idx == -1:
            raise RuntimeError('Cannot find submitSocialLoginTest marker for helper insert')
        html = html[:idx] + HELPERS + '\n\n' + html[idx:]

    # Add early SitePass login block inside submitSitePassLoginTest
    if 'sp194FindWithdrawnByLoginText(loginId)' not in html:
        html = html.replace(
            "if (!loginId) {\n        alert('아이디 / 휴대폰번호 / 이메일을 입력해주세요.');",
            "if (sp194FindWithdrawnByLoginText(loginId)) {\n        sp194BlockedAlert(sp194FindWithdrawnByLoginText(loginId), 'SitePass 로그인');\n        return;\n      }\n\n      if (!loginId) {\n        alert('아이디 / 휴대폰번호 / 이메일을 입력해주세요.');",
            1
        )

    replacements = {
        'submitSocialLoginTest': SUBMIT_SOCIAL_LOGIN,
        'startSupabaseKakaoOAuth': START_KAKAO,
        'handleSupabaseKakaoOAuthReturn': HANDLE_KAKAO_RETURN,
        'forceWithdrawMember': FORCE_WITHDRAW,
        'getAdminMemberCounts': GET_COUNTS,
        'getAdminFolderLabel': GET_LABEL,
        'filterAdminMembersByFolder': FILTER_FOLDER,
    }
    for name, code in replacements.items():
        html = replace_function(html, name, code)

    # Add new member folders to the existing hard-coded folder button list in renderAdminStaffManager.
    html = re.sub(
        r"const folders = \[[^\]]*'withdrawn'[^\]]*\];",
        "const folders = ['super','admin','all','normal','sitepassSelf','kakaoMembers','naverMembers','newSignup','monthly','due','grace14','suspended','newPay','extensionPay','refundRequest','refund','withdrawn','withdrawnKakao','withdrawnNaver','withdrawnSitePass'];",
        html,
        count=1,
        flags=re.S
    )

    # Show social category summary near existing normal member line if the exact old block exists.
    if '<b>카카오가입자</b>' not in html:
        html = html.replace(
            "'<div class=\"line\"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +",
            "'<div class=\"line\"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +\n          '<div class=\"line\"><b>일반/SitePass</b><span>' + counts.sitepassSelf + '명</span></div>' +\n          '<div class=\"line\"><b>카카오가입자</b><span>' + counts.kakaoMembers + '명</span></div>' +\n          '<div class=\"line\"><b>네이버가입자</b><span>' + counts.naverMembers + '명</span></div>' +",
            1
        )

    # Patch save and complete login defensively by inserting wrappers near the end of main script.
    wrapper = r'''

    // v23.7.194 defensive wrappers: any route that tries to save/login a withdrawn member is stopped.
    if (typeof saveMemberTest === 'function' && !saveMemberTest.__sp194Wrapped) {
      const __sp194SaveMemberTest = saveMemberTest;
      saveMemberTest = function(member) {
        if (sp194BlockIfWithdrawn(member, '회원 저장', { blockGenericProvider:false })) {
          window.__SITEPASS_SP194_SAVE_BLOCKED = true;
          return null;
        }
        window.__SITEPASS_SP194_SAVE_BLOCKED = false;
        return __sp194SaveMemberTest(member);
      };
      saveMemberTest.__sp194Wrapped = true;
    }
    if (typeof completeMemberLoginTest === 'function' && !completeMemberLoginTest.__sp194Wrapped) {
      const __sp194CompleteMemberLoginTest = completeMemberLoginTest;
      completeMemberLoginTest = function(member, message) {
        if (window.__SITEPASS_SP194_SAVE_BLOCKED || sp194BlockIfWithdrawn(member, '로그인', { blockGenericProvider:false })) {
          window.__SITEPASS_SP194_SAVE_BLOCKED = false;
          removeSessionValue(CURRENT_MEMBER_KEY);
          return;
        }
        return __sp194CompleteMemberLoginTest(member, message);
      };
      completeMemberLoginTest.__sp194Wrapped = true;
    }
'''
    if '__SITEPASS_SP194_SAVE_BLOCKED' not in html:
        insert_at = html.rfind('</script>')
        if insert_at == -1:
            raise RuntimeError('Cannot find final </script>')
        html = html[:insert_at] + wrapper + html[insert_at:]

    return html


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC_DEFAULT
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT_DEFAULT
    if not src.exists():
        print(f'원본 파일을 찾을 수 없습니다: {src}', file=sys.stderr)
        print('v23.7.193 HTML을 /mnt/data에 올린 뒤 다시 실행해주세요.', file=sys.stderr)
        return 2
    html = src.read_text(encoding='utf-8')
    patched = patch_text(html)
    out.write_text(patched, encoding='utf-8')
    print(f'완료: {out}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
