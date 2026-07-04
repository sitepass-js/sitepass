// SitePass v23.7.298 - app-admin-boot split continue (04/07)
function getMemberEquipmentCount(member) {
      return getMemberEquipmentItems(member).length;
    }

    function getMemberDocWarningCount(member) {
      return getMemberEquipmentItems(member).reduce((acc, item) => {
        Object.values(item.docs || {}).forEach(doc => {
          const status = doc.status || getDocStatus(doc);
          if (status === '만료임박') acc.expiring += 1;
          if (status === '만료') acc.expired += 1;
        });
        return acc;
      }, { expiring:0, expired:0 });
    }

    function getAdminMemberDisplayKey(member) {
      const candidates = [
        member?.supabaseLoginId,
        member?.providerId,
        member?.signupId,
        member?.id,
        member?.phone
      ].map(normalizeSupabaseLoginKeyForMember).filter(Boolean);
      return candidates[0] || ('name:' + normalizeSupabaseLoginKeyForMember(member?.name || Math.random()));
    }

    function getAdminMembersWithServerRows() {
      const localMembers = ensureMemberIds().filter(member => !isMemberWithdrawnOrBlocked(member));
      let serverMembers = filterActiveRowsOnly(adminServerMemberRows || [])
        .map(makeLocalMemberFromSupabaseRow)
        .filter(member => (member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.name));
      serverMembers = dedupeAdminMembersForDisplay(serverMembers);
      if (!serverMembers.length) {
        return localMembers.filter(member => !isMemberWithdrawnOrBlocked(member));
      }
      const serverSyncFresh = adminSupabaseMemberSyncedAt && Date.now() - adminSupabaseMemberSyncedAt < 10 * 60 * 1000;

      const serverKeySet = new Set();
      const serverNameProviderSet = new Set();
      serverMembers.forEach(member => {
        getAdminLocalMemberKeys(member).forEach(key => serverKeySet.add(key));
        const np = getAdminMemberNameProviderKey(member);
        if (np) serverNameProviderSet.add(np);
      });

      const map = new Map();
      const put = (member) => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return;
        const key = getAdminMemberDisplayKey(member);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, member);
          return;
        }
        map.set(key, {
          ...existing,
          ...member,
          id: existing.id || member.id,
          adminRole: isDesignatedSuperAdminMember(member) ? SUPER_ADMIN_ROLE_NAME : (existing.adminRole === SUPER_ADMIN_ROLE_NAME ? '' : (existing.adminRole || member.adminRole || '')),
          adminRoleUpdatedAt: existing.adminRoleUpdatedAt || member.adminRoleUpdatedAt || '',
          adminRoleUpdatedBy: existing.adminRoleUpdatedBy || member.adminRoleUpdatedBy || '',
          testPassword: existing.testPassword || member.testPassword || '',
          passwordSet: existing.passwordSet || member.passwordSet || false,
          fromSupabase: existing.fromSupabase || member.fromSupabase || false,
          supabaseLoginId: existing.supabaseLoginId || member.supabaseLoginId || ''
        });
      };

      // v23.7.216: 서버 active 회원을 기준으로 표시합니다.
      // 예전 localStorage에 남은 카카오/네이버/중복 회원은 서버에 active로 없으면 다시 표시하지 않습니다.
      serverMembers.forEach(put);
      localMembers.forEach(local => {
        if (local.isSuperAdminVirtual || isDesignatedSuperAdminMember(local) || ['관리자','운영관리자','조회관리자'].includes(local.adminRole)) {
          put(local);
          return;
        }
        const providerType = getMemberSignupProviderType(local);
        const sameKey = getAdminLocalMemberKeys(local).some(key => serverKeySet.has(key));
        const np = getAdminMemberNameProviderKey(local);
        const sameNameProvider = np && serverNameProviderSet.has(np);
        const isLocalSocialTermsMember = (providerType === 'kakao' || providerType === 'naver') && hasLocalSocialTermsAgreement(local);

        // v23.7.248: 네이버 약관회원은 서버 RPC 목록 반영이 늦는 동안에도 관리자 상세목록에 표시합니다.
        if (serverSyncFresh) {
          if (isLocalSocialTermsMember && !sameKey && !sameNameProvider) {
            local.serverSyncPending = true;
            put(local);
          }
          return;
        }
        if (providerType === 'kakao' || providerType === 'naver') {
          if (isLocalSocialTermsMember && !sameKey && !sameNameProvider) put(local);
          return;
        }
        if (sameKey || sameNameProvider) return;
        put(local);
      });
      return dedupeAdminMembersForDisplay(Array.from(map.values()).filter(member => !isMemberWithdrawnOrBlocked(member))); 
    }

    function getAdminAllMemberRows() {
      cleanupAdminRoleMapSingleSuperAdmin();
      let members = dedupeAdminMembersForDisplay(getAdminMembersWithServerRows().filter(member => !isMemberWithdrawnOrBlocked(member)).map(member => normalizeSingleSuperAdminRole(member))); 
      let changed = false;
      members.forEach(member => {
        const identifiers = getMemberAdminIdentifiers(member);
        const isDesignatedSuperAdmin = identifiers.some(id => isSuperAdminLoginId(id));
        if (isDesignatedSuperAdmin && member.adminRole !== SUPER_ADMIN_ROLE_NAME) {
          member.adminRole = SUPER_ADMIN_ROLE_NAME;
          member.role = 'super_admin';
          member.adminRoleUpdatedAt = member.adminRoleUpdatedAt || new Date().toISOString();
          member.adminRoleUpdatedBy = member.adminRoleUpdatedBy || 'SitePass 자동정리';
          changed = true;
        }
        if (!isDesignatedSuperAdmin && (member.adminRole === SUPER_ADMIN_ROLE_NAME || supabaseRoleToAdminRole(member.role) === SUPER_ADMIN_ROLE_NAME)) {
          delete member.adminRole;
          member.role = 'member';
          member.adminRoleUpdatedAt = new Date().toISOString();
          member.adminRoleUpdatedBy = 'SitePass 최고관리자 단일화';
          changed = true;
        }
      });
      if (changed) setMembers(members);

      // v23.7.255: 서버 약관/탈퇴 통계가 "현재회원 0명"인데 RPC 상세목록에 예전 active 행이 남는 경우가 있습니다.
      // 이때 관리자 회원목록은 통계(current active) 기준으로 한 번 더 보정해서 탈퇴/비활성 회원이 다시 보이지 않게 합니다.
      members = applyAdminCurrentSummaryVisibility(members);

      const hasRealSuperAdmin = members.some(member => {
        const identifiers = getMemberAdminIdentifiers(member);
        return !member.withdrawn && !member.isSuperAdminVirtual && identifiers.some(id => isSuperAdminLoginId(id));
      });
      if (hasRealSuperAdmin) return members.filter(member => member.id !== 'SUPER-ADMIN' && !member.isSuperAdminVirtual);

      const superRow = {
        id:'SUPER-ADMIN',
        name:'대표이사 최고관리자',
        signupId:ADMIN_ID,
        provider:'SitePass',
        signupMethod:'대표이사 최고관리자',
        adminRole:SUPER_ADMIN_ROLE_NAME,
        status:'정상',
        isSuperAdminVirtual:true,
        createdAt:'',
        phone:'',
        paymentPlanLabel:'무제한',
        paymentEndsAt:''
      };
      return [superRow].concat(members.filter(member => member.id !== 'SUPER-ADMIN' && !member.isSuperAdminVirtual));
    }

    function getMemberSignupProviderType(member) {
      if (!member) return 'sitepass';
      const provider = String(member.provider || '').toLowerCase();
      const method = String(member.signupMethod || '').toLowerCase();
      const providerId = String(member.providerId || '').toLowerCase();
      const supabaseLoginId = String(member.supabaseLoginId || '').toLowerCase();
      const naverUserId = String(member.naverUserId || '').toLowerCase();
      const kakaoUserId = String(member.kakaoUserId || '').toLowerCase();
      const joined = [provider, method, providerId, supabaseLoginId, naverUserId, kakaoUserId, member.email || ''].join(' ');
      if (joined.includes('카카오') || joined.includes('kakao') || providerId.startsWith('kakao-') || supabaseLoginId.startsWith('kakao_')) return 'kakao';
      if (joined.includes('네이버') || joined.includes('naver') || providerId.startsWith('naver-') || supabaseLoginId.startsWith('naver_')) return 'naver';
      return 'sitepass';
    }

    function getFiniteAdminSummaryNumber(value) {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }

    function hasUsableAdminCurrentSummaryStats() {
      const current = adminMemberSummaryStats && typeof adminMemberSummaryStats === 'object' ? adminMemberSummaryStats.current : null;
      if (!current || typeof current !== 'object') return false;
      return ['total','kakao','naver','sitepass'].some(key => getFiniteAdminSummaryNumber(current[key]) !== null);
    }

    function applyAdminCurrentSummaryVisibility(members) {
      // v23.7.255: 탈퇴 누계/현재회원 통계는 맞는데 상세 회원목록에 예전 카카오·네이버 active 행이 남는 문제 보정.
      // 서버 RPC가 current=0 또는 provider별 current=0을 알려주면, 화면 목록도 그 숫자에 맞춰 숨깁니다.
      if (!hasUsableAdminCurrentSummaryStats()) return members || [];
      const current = adminMemberSummaryStats.current || {};
      const maxTotal = getFiniteAdminSummaryNumber(current.total);
      const providerMax = {
        kakao: getFiniteAdminSummaryNumber(current.kakao),
        naver: getFiniteAdminSummaryNumber(current.naver),
        sitepass: getFiniteAdminSummaryNumber(current.sitepass)
      };
      const adminRows = [];
      const userRows = [];
      (members || []).forEach(member => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return;
        if (isAdminAccountMember(member)) adminRows.push(member);
        else userRows.push(member);
      });
      if (maxTotal === 0) return adminRows;

      const kept = [];
      const used = { kakao:0, naver:0, sitepass:0 };
      userRows.forEach(member => {
        const type = getMemberSignupProviderType(member);
        const limit = providerMax[type];
        if (limit !== null && used[type] >= limit) return;
        if (maxTotal !== null && kept.length >= maxTotal) return;
        used[type] += 1;
        kept.push(member);
      });
      return adminRows.concat(kept);
    }

    // v23.7.254: 소셜 약관동의 완료 판별은 assets/js/terms.js로 분리했습니다.

    function getAdminSignupProviderCounts(activeMembers) {
      const signupMembers = (activeMembers || []).filter(member => {
        const role = member?.adminRole || supabaseRoleToAdminRole(member?.role);
        if (member?.withdrawn || member?.isSuperAdminVirtual) return false;
        if ([SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role)) return false;
        return true;
      });
      const counts = { total: signupMembers.length, kakao:0, naver:0, sitepass:0 };
      signupMembers.forEach(member => {
        const type = getMemberSignupProviderType(member);
        if (type === 'kakao') counts.kakao += 1;
        else if (type === 'naver') counts.naver += 1;
        else counts.sitepass += 1;
      });
      return counts;
    }

    function getAdminSummaryProviderBlockFromStats(key, fallback) {
      const stats = adminMemberSummaryStats || {};
      const block = stats && typeof stats === 'object' ? stats[key] : null;
      return {
        total: Number(block?.total ?? fallback?.total ?? 0),
        kakao: Number(block?.kakao ?? fallback?.kakao ?? 0),
        naver: Number(block?.naver ?? fallback?.naver ?? 0),
        sitepass: Number(block?.sitepass ?? fallback?.sitepass ?? 0)
      };
    }

    function getAdminTodaySignupProviderCountsFallback(activeMembers) {
      const todayKey = getLocalDateKey();
      const members = (activeMembers || []).filter(member => {
        const role = member?.adminRole || supabaseRoleToAdminRole(member?.role);
        if (member?.withdrawn || member?.isSuperAdminVirtual) return false;
        if ([SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role)) return false;
        return getLocalDateKey(member?.createdAt || member?.joinedAt || member?.paymentStartedAt) === todayKey;
      });
      const counts = { total: members.length, kakao:0, naver:0, sitepass:0 };
      members.forEach(member => {
        const type = getMemberSignupProviderType(member);
        if (type === 'kakao') counts.kakao += 1;
        else if (type === 'naver') counts.naver += 1;
        else counts.sitepass += 1;
      });
      return counts;
    }

    function renderAdminStatsMiniCard(title, count, note, folder, extraClass) {
      const click = folder ? ' onclick="openAdminListQuickFilter(\'' + escapeJs(folder) + '\')" style="cursor:pointer;"' : '';
      return '<div class="admin-signup-method-card ' + escapeHtml(extraClass || '') + '"' + click + '><b>' + escapeHtml(title) + '</b><strong>' + Number(count || 0) + '명</strong><span>' + escapeHtml(note || '') + '</span></div>';
    }

    function renderAdminSignupMethodBoard(activeMembers) {
      const currentFallback = getAdminSignupProviderCounts(activeMembers);
      const todayFallback = getAdminTodaySignupProviderCountsFallback(activeMembers);
      const current = getAdminSummaryProviderBlockFromStats('current', currentFallback);
      const today = getAdminSummaryProviderBlockFromStats('todaySignup', todayFallback);
      const withdrawn = getAdminSummaryProviderBlockFromStats('withdrawn', { total:0, kakao:0, naver:0, sitepass:0 });
      const todayWithdrawn = getAdminSummaryProviderBlockFromStats('todayWithdrawn', { total:0, kakao:0, naver:0, sitepass:0 });
      const marketingConsent = adminMemberSummaryStats?.marketingConsent || {};
      const sourceText = String(adminMemberSummaryStats?.source || '').startsWith('sitepass_admin_member_summary')
        ? '서버 약관/회원 상태 기준'
        : '화면 회원목록 기준';
      return '<div class="notice blue-note" style="margin:10px 0;">' +
        '<b>회원 집계 기준</b><br>' +
        '회원수는 로그인 기록이나 DB 원본 행 수가 아니라 <b>약관 동의 완료 + active 상태</b>인 실제 회원만 계산합니다. 광고 수신 동의는 이메일/문자/카카오톡·앱 채널별 선택 동의로 따로 집계합니다. 카카오/네이버/사이트 약관동의자를 따로 보고, 같은 소셜 계정 중복행은 화면에서 1명으로 묶으며, 탈퇴 회원은 현재 회원수에서 제외합니다. 현재 기준: ' + escapeHtml(sourceText) +
      '</div>' +
      '<div class="admin-signup-method-board">' +
        renderAdminStatsMiniCard('약관동의 현재회원', current.total, '관리자 제외 active 회원', 'normal') +
        renderAdminStatsMiniCard('카카오 약관회원', current.kakao, '카카오 약관 동의 완료', 'normal') +
        renderAdminStatsMiniCard('네이버 약관회원', current.naver, '네이버 약관 동의 완료', 'normal') +
        renderAdminStatsMiniCard('사이트 약관회원', current.sitepass, 'SitePass 일반가입 약관 완료', 'normal') +
      '</div>' +
      '<div class="admin-signup-method-board" style="margin-top:8px;">' +
        renderAdminStatsMiniCard('오늘 전체 가입', today.total, '오늘 약관 동의 완료', 'newSignup') +
        renderAdminStatsMiniCard('오늘 카카오 가입', today.kakao, '오늘 카카오 가입', 'newSignup') +
        renderAdminStatsMiniCard('오늘 네이버 가입', today.naver, '오늘 네이버 가입', 'newSignup') +
        renderAdminStatsMiniCard('오늘 사이트 가입', today.sitepass, '오늘 SitePass 가입', 'newSignup') +
      '</div>' +
      '<div class="admin-signup-method-board" style="margin-top:8px;">' +
        renderAdminStatsMiniCard('광고동의 전체', Number(marketingConsent.any || 0), '이메일 또는 문자/앱 동의', 'normal') +
        renderAdminStatsMiniCard('이메일 광고동의', Number(marketingConsent.email || 0), '선택 동의 회원', 'normal') +
        renderAdminStatsMiniCard('문자 광고동의', Number(marketingConsent.sms || 0), '선택 동의 회원', 'normal') +
        renderAdminStatsMiniCard('카카오톡·앱 광고동의', Number(marketingConsent.kakaoApp || 0), '선택 동의 회원', 'normal') +
      '</div>' +
      '<div class="admin-signup-method-board" style="margin-top:8px;">' +
        renderAdminStatsMiniCard('전체 탈퇴 누계', withdrawn.total, '오늘 ' + todayWithdrawn.total + '명 탈퇴', 'withdrawn') +
        renderAdminStatsMiniCard('카카오 탈퇴 누계', withdrawn.kakao, '오늘 ' + todayWithdrawn.kakao + '명 탈퇴', 'withdrawn') +
        renderAdminStatsMiniCard('네이버 탈퇴 누계', withdrawn.naver, '오늘 ' + todayWithdrawn.naver + '명 탈퇴', 'withdrawn') +
        renderAdminStatsMiniCard('사이트 탈퇴 누계', withdrawn.sitepass, '오늘 ' + todayWithdrawn.sitepass + '명 탈퇴', 'withdrawn') +
      '</div>';
    }

    // v23.7.257: 관리자 회원목록/검색/필터 렌더링 함수는 assets/js/admin-members.js로 분리했습니다.
