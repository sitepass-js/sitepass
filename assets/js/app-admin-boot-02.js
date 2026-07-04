// SitePass v23.7.298 - app-admin-boot split continue (02/07)
function isQrPaused(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isQrPaused) return payments.isQrPaused(item);
      if (!item) return false;
      if (item.serviceStatus === '정지') return true;
      if (!item.trialEndsAt) return false;
      return new Date(item.trialEndsAt).getTime() < Date.now();
    }


    function isServiceShareBlocked(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isServiceShareBlocked) return payments.isServiceShareBlocked(item);
      return isQrPaused(item);
    }

    function getServiceBlockReason(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getServiceBlockReason) return payments.getServiceBlockReason(item);
      if (!item) return '서류함 없음';
      if (item.serviceStatus === '정지') return '관리자 정지';
      if (!item.trialEndsAt) return '결제기간 미설정';
      const overdueDays = getServiceOverdueDays(item);
      if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과';
      return '실사용 베타기간/결제기간 만료';
    }

    function getShareBlockedItems(items) {
      const payments = getAdminPaymentsModule();
      if (payments.getShareBlockedItems) return payments.getShareBlockedItems(items);
      return (items || []).filter(item => item && isServiceShareBlocked(item));
    }

    function canUseQrShareItems(items, actionLabel, silent) {
      const safeItems = (items || []).filter(Boolean);
      const blocked = getShareBlockedItems(safeItems);
      if (!blocked.length) return true;
      const preview = blocked.slice(0, 8).map((item, index) => {
        return (index + 1) + '. ' + getShareItemLabel(item) + ' / ' + getServiceBlockReason(item);
      }).join('\n');
      if (!silent) {
        alert((actionLabel || 'QR 보내기') + '가 차단되었습니다.\n\n유료 전환 후 결제하지 않았거나 기간이 만료된 장비는 담당자 QR·링크를 새로 보내거나 열 수 없습니다.\n\n차단 대상 ' + blocked.length + '건\n' + preview + (blocked.length > 8 ? '\n외 ' + (blocked.length - 8) + '건' : '') + '\n\n관리자에서 결제처리 또는 회원 연장 후 다시 확인하세요.');
      }
      return false;
    }

    function renderServiceBlockedBox(item) {
      return '<div class="manager-expire-box"><b>결제 미완료로 QR·링크가 일시정지되었습니다.</b><br>' +
        '베타기간 또는 결제기간이 끝난 장비서류입니다. 결제/연장 전에는 담당자 화면, 다운로드, 프린트, 공유가 열리지 않습니다.<br>' +
        '<span class="small">장비: ' + escapeHtml(getShareItemLabel(item)) + '<br>차단사유: ' + escapeHtml(getServiceBlockReason(item)) + '<br>서비스상태: ' + escapeHtml(getServiceStatusText(item)) + '</span></div>';
    }

    function getServiceStatusText(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getServiceStatusText) return payments.getServiceStatusText(item);
      if (!item) return '상태 없음';
      if (isQrPaused(item)) {
        const overdueDays = getServiceOverdueDays(item);
        if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과 / QR 일시정지';
        return '실사용 베타 만료 / QR 일시정지';
      }
      const endText = item.trialEndsAt ? formatDateOnly(item.trialEndsAt) : '기간 미설정';
      return (item.serviceStatus || '실사용베타') + ' · 종료일 ' + endText;
    }

    function formatDateOnly(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }


    function getAdminRoleBadgeClass(role) {
      if (role === SUPER_ADMIN_ROLE_NAME) return 'done';
      if (role === '관리자' || role === '운영관리자' || role === '조회관리자') return 'need';
      return 'need';
    }


    function getWithdrawnMembers() {
      try {
        return JSON.parse(localStorage.getItem(ADMIN_WITHDRAWN_MEMBERS_KEY) || '[]') || [];
      } catch (e) {
        return [];
      }
    }

    function setWithdrawnMembers(list) {
      localStorage.setItem(ADMIN_WITHDRAWN_MEMBERS_KEY, JSON.stringify(list || []));
    }

    function getVisibleWithdrawnMembers() {
      try {
        const withdrawnTotal = Number(adminMemberSummaryStats?.withdrawn?.total ?? NaN);
        // v23.7.241: 서버 초기화 후 최고관리자만 남으면 전체회원/신규회원/일반회원에는 최고관리자를 포함하지 않고, 예전 강제탈퇴 기록도 표시하지 않습니다.
        // 실제 탈퇴/강제탈퇴가 새로 발생하면 서버 통계 또는 새 local 기록으로 다시 표시됩니다.
        if (Number.isFinite(withdrawnTotal) && withdrawnTotal === 0) return [];
      } catch (e) {}
      return getWithdrawnMembers();
    }

    function clearLocalWithdrawnIfServerSaysZero() {
      try {
        const withdrawnTotal = Number(adminMemberSummaryStats?.withdrawn?.total ?? NaN);
        if (Number.isFinite(withdrawnTotal) && withdrawnTotal === 0) {
          localStorage.removeItem(ADMIN_WITHDRAWN_MEMBERS_KEY);
        }
      } catch (e) {}
    }

    function normalizeMemberKey(value) {
      return String(value || '').trim().toLowerCase();
    }

    function getMemberLoginKeys(member) {
      if (!member) return [];
      const rawKeys = [
        ...(Array.isArray(member.withdrawalBlockKeys) ? member.withdrawalBlockKeys : []),
        member.supabaseLoginId,
        member.supabaseAuthUserId,
        member.authUserId,
        member.userId,
        member.providerId,
        (normalizeSignupProviderKey(member.signupMethod || member.provider || '') === 'kakao' && (member.providerId || member.kakaoUserId)) ? ('kakao_' + String(member.providerId || member.kakaoUserId || '').replace(/^KAKAO[-_:]/i, '').trim()) : '',
        (normalizeSignupProviderKey(member.signupMethod || member.provider || '') === 'naver' && (member.providerId || member.naverUserId)) ? ('naver_' + String(member.providerId || member.naverUserId || '').replace(/^NAVER[-_:]/i, '').trim()) : '',
        member.signupId,
        member.kakaoUserId ? 'KAKAO-' + member.kakaoUserId : '',
        member.kakaoUserId || '',
        member.naverUserId ? 'NAVER-' + member.naverUserId : '',
        member.naverUserId || '',
        member.id,
        member.phone ? String(member.phone || '').replace(/[^0-9]/g, '') : '',
        member.email || ''
      ];
      return Array.from(new Set(rawKeys.map(normalizeMemberKey).filter(Boolean)));
    }

    function isWithdrawnStatusValue(value) {
      const v = String(value || '').trim().toLowerCase();
      return ['withdrawn', 'deleted', 'force_withdrawn', '강제탈퇴', '회원탈퇴', '탈퇴', '삭제'].includes(v);
    }

    function isMemberWithdrawnOrBlocked(member) {
      if (!member) return false;
      if (member.withdrawn === true) return true;
      if (isWithdrawnStatusValue(member.status) || isWithdrawnStatusValue(member.memberStatus) || isWithdrawnStatusValue(member.plan_type)) return true;
      return !!findWithdrawnMemberRecord(member);
    }

    function filterActiveRowsOnly(rows) {
      return (rows || []).filter(row => {
        if (!row) return false;
        // v23.7.225: 관리자 서버 회원목록은 서버 status/plan_type만 기준으로 판단합니다.
        // 휴대폰/PWA localStorage에 남은 예전 탈퇴 기록으로 서버 active 회원을 숨기면
        // 카카오 가입자가 최고관리자 화면에 안 보이는 문제가 생깁니다.
        if (isWithdrawnStatusValue(row.status) || isWithdrawnStatusValue(row.plan_type) || isWithdrawnStatusValue(row.memberStatus)) return false;
        return true;
      });
    }

    function removeRowsByMemberKeys(rows, member) {
      const keys = getMemberLoginKeys(member);
      if (!keys.length) return rows || [];
      return (rows || []).filter(row => {
        const rowMember = makeLocalMemberFromSupabaseRow(row);
        const rowKeys = getMemberLoginKeys(rowMember);
        return !rowKeys.some(key => keys.includes(key));
      });
    }

    function filterRowsExcludingLocalWithdrawn(rows) {
      // v23.7.241: 회원이 방금 탈퇴했는데 서버/RPC 반영이 한 박자 늦을 때
      // 같은 브라우저 관리자 화면에서는 local 탈퇴 기록 기준으로 즉시 숨깁니다.
      // 재가입하면 removeWithdrawnMemberRecord()가 먼저 실행되어 다시 표시됩니다.
      return (rows || []).filter(row => {
        const rowMember = makeLocalMemberFromSupabaseRow(row);
        return !findWithdrawnMemberRecord(rowMember);
      });
    }

    function findWithdrawnMemberRecord(member) {
      const keys = getMemberLoginKeys(member);
      if (!keys.length) return null;
      return getWithdrawnMembers().find(item => {
        if (item?.withdrawn === false) return false;
        const itemKeys = getMemberLoginKeys(item);
        return itemKeys.some(key => keys.includes(key));
      }) || null;
    }

    function addWithdrawnMemberRecord(member, reason, statusText) {
      if (!member) return;
      const list = getWithdrawnMembers();
      const keys = getMemberLoginKeys(member);
      const filtered = list.filter(item => {
        const itemKeys = getMemberLoginKeys(item);
        return !itemKeys.some(key => keys.includes(key));
      });
      filtered.unshift({
        id:'WD-' + Date.now(),
        name:getMemberDisplayName(member),
        signupMethod:member.signupMethod || member.provider || '탈퇴회원',
        withdrawn:true,
        status:statusText || '회원탈퇴',
        adminRole:'',
        withdrawnAt:new Date().toISOString(),
        withdrawnBy:reason || '회원 직접 탈퇴',
        withdrawalBlockKeys:keys
      });
      setWithdrawnMembers(filtered.slice(0, 500));
    }

    function removeWithdrawnMemberRecord(member) {
      const keys = getMemberLoginKeys(member);
      if (!keys.length) return;
      const list = getWithdrawnMembers().filter(item => {
        const itemKeys = getMemberLoginKeys(item);
        return !itemKeys.some(key => keys.includes(key));
      });
      setWithdrawnMembers(list);
    }

    async function signOutSupabaseAuthQuietly() {
      try {
        if (window.sitepassSupabase && window.sitepassSupabase.auth) {
          await window.sitepassSupabase.auth.signOut();
        }
      } catch (e) {
        console.warn('Supabase 로그아웃 처리 생략:', e);
      }
    }

    // v23.7.250 - 네이버/카카오 기존 약관회원 판별을 login_id뿐 아니라 provider_id/auth_user_id/email까지 확인합니다.
    function getSocialMemberServerLookupPayload(member) {
      const provider = normalizeSignupProviderKey(member?.signupMethod || member?.provider || '');
      const providerId = String(member?.providerId || member?.naverUserId || member?.kakaoUserId || member?.provider_id || '').trim();
      const authUserId = String(member?.supabaseAuthUserId || member?.authUserId || member?.userId || member?.auth_user_id || '').trim();
      const email = String(member?.email || '').trim().toLowerCase();
      const loginKeys = getMemberLoginKeys(member);
      const rawProvider = providerId.replace(/^(kakao|naver)[-_:]/i, '').trim();
      const extraKeys = [];
      if (provider && rawProvider) extraKeys.push(provider + '_' + rawProvider);
      if (provider && providerId) extraKeys.push(provider + '_' + providerId);
      if (provider && authUserId) extraKeys.push(provider + '_' + authUserId);
      if (member?.supabaseLoginId) extraKeys.push(member.supabaseLoginId);
      if (member?.signupId) extraKeys.push(member.signupId);
      return {
        provider,
        providerId: rawProvider || providerId,
        authUserId,
        email,
        loginKeys: Array.from(new Set([...(loginKeys || []), ...extraKeys].map(normalizeMemberKey).filter(Boolean)))
      };
    }

    async function getSupabaseSocialMemberStatusViaRpc(member) {
      try {
        if (!window.sitepassSupabase || !window.sitepassSupabase.rpc || !member) return '';
        const payload = getSocialMemberServerLookupPayload(member);
        if (!payload.loginKeys.length && !payload.providerId && !payload.authUserId && !payload.email) return '';
        const { data, error } = await window.sitepassSupabase.rpc('sitepass_get_social_member_status', {
          p_login_keys: payload.loginKeys,
          p_provider_id: payload.providerId || null,
          p_auth_user_id: payload.authUserId || null,
          p_email: payload.email || null,
          p_signup_method: payload.provider || null
        });
        if (error) {
          console.warn('소셜 회원 상태 RPC 확인 실패:', error.message || error);
          return '';
        }
        return String(data || '').trim().toLowerCase();
      } catch (e) {
        console.warn('소셜 회원 상태 RPC 확인 예외:', e?.message || e);
        return '';
      }
    }

    async function getSupabaseMemberStatus(member) {
      try {
        if (!window.sitepassSupabase || !member) return '';
        const keys = getMemberLoginKeys(member);
        const lookup = getSocialMemberServerLookupPayload(member);
        if (!keys.length && !lookup.providerId && !lookup.authUserId && !lookup.email) return '';

        // v23.7.250: 네이버는 login_id가 naver_고유ID / naver_authUUID 중 어느 쪽으로 저장됐는지 브라우저마다 달라질 수 있어
        // 서버 RPC로 provider_id/auth_user_id/email까지 확인해서 기존 약관회원이면 약관창을 다시 띄우지 않습니다.
        const statusProviderKey = normalizeSignupProviderKey(member.signupMethod || member.provider || lookup.provider || '');
        const isSocialStatusLookup = statusProviderKey === 'kakao' || statusProviderKey === 'naver';
        const rpcStatus = await getSupabaseSocialMemberStatusViaRpc(member);
        if (rpcStatus === 'withdrawn') return 'withdrawn';
        // v23.7.250: 네이버/카카오 신규 가입은 terms_agreed_at이 확인될 때만 기존회원으로 봅니다.
        // 예전 RPC가 status=active만 반환하면 신규 네이버도 약관창 없이 통과할 수 있어,
        // 소셜 active 판정은 아래 sitepass_members의 terms_agreed_at 확인까지 내려보냅니다.
        if (rpcStatus && !isSocialStatusLookup) return rpcStatus;

        // v23.7.231: 탈퇴 여부는 서버 status/plan_type으로 판단합니다.
        if (window.sitepassSupabase.rpc) {
          try {
            const { data: blocked, error: blockError } = await window.sitepassSupabase.rpc('sitepass_is_member_withdrawn', {
              p_login_keys: lookup.loginKeys && lookup.loginKeys.length ? lookup.loginKeys : keys
            });
            if (!blockError && blocked === true) return 'withdrawn';
          } catch (rpcError) {
            console.warn('Supabase 탈퇴 차단 확인 RPC 예외:', rpcError?.message || rpcError);
          }
        }

        const selectCols = 'login_id, status, plan_type, role, terms_agreed_at, provider_id, auth_user_id, email, signup_method';
        const candidates = [];
        const pushRows = rows => {
          (Array.isArray(rows) ? rows : []).forEach(row => {
            if (row && !candidates.some(item => String(item.login_id || '') === String(row.login_id || ''))) candidates.push(row);
          });
        };

        try {
          const { data } = await window.sitepassSupabase
            .from('sitepass_members')
            .select(selectCols)
            .in('login_id', lookup.loginKeys && lookup.loginKeys.length ? lookup.loginKeys : keys)
            .limit(3);
          pushRows(data);
        } catch (ignore) {}

        if (lookup.providerId) {
          try {
            const { data } = await window.sitepassSupabase
              .from('sitepass_members')
              .select(selectCols)
              .eq('signup_method', lookup.provider || normalizeSignupProviderKey(member.signupMethod || member.provider || ''))
              .eq('provider_id', lookup.providerId)
              .limit(3);
            pushRows(data);
          } catch (ignore) {}
        }

        if (lookup.authUserId) {
          try {
            const { data } = await window.sitepassSupabase
              .from('sitepass_members')
              .select(selectCols)
              .eq('auth_user_id', lookup.authUserId)
              .limit(3);
            pushRows(data);
          } catch (ignore) {}
        }

        if (lookup.email) {
          try {
            const { data } = await window.sitepassSupabase
              .from('sitepass_members')
              .select(selectCols)
              .eq('signup_method', lookup.provider || normalizeSignupProviderKey(member.signupMethod || member.provider || ''))
              .eq('email', lookup.email)
              .limit(3);
            pushRows(data);
          } catch (ignore) {}
        }

        if (!candidates.length) {
          // v23.7.250: 소셜 회원은 서버에서 약관동의 완료 행을 못 찾으면 신규가입 약관을 다시 보여줍니다.
          // 기존 약관회원이면 동의 후 같은 login_id로 덮어 저장되므로 중복회원 생성은 막습니다.
          if (isSocialStatusLookup) return '';
          return rpcStatus || '';
        }
        const row = candidates.sort((a,b) => {
          const aActive = !isWithdrawnStatusValue(a.status) && !isWithdrawnStatusValue(a.plan_type) && !!a.terms_agreed_at;
          const bActive = !isWithdrawnStatusValue(b.status) && !isWithdrawnStatusValue(b.plan_type) && !!b.terms_agreed_at;
          return Number(bActive) - Number(aActive);
        })[0];
        const status = String(row.status || '').trim().toLowerCase();
        const planType = String(row.plan_type || '').trim().toLowerCase();
        const role = String(row.role || '').trim().toLowerCase();
        if (isWithdrawnStatusValue(status) || isWithdrawnStatusValue(planType)) return 'withdrawn';
        if (role !== 'super_admin' && !row.terms_agreed_at) return '';
        return status || 'active';
      } catch (e) {
        console.warn('Supabase 회원 상태 확인 생략:', e);
        return '';
      }
    }


