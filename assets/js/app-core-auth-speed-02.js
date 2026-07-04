// SitePass v23.7.303 - speed optimized medium chunk (app-core-auth-speed 02/04)
// ---- merged from app-core-auth-06.js ----
// SitePass v23.7.303 - app-core-auth finer split (06/19)
function normalizeSupabaseLoginKeyForMember(value) {
      return String(value || '').trim().toLowerCase();
    }

    function makeLocalMemberFromSupabaseRow(row) {
      const loginId = String(row?.login_id || row?.loginId || row?.id || '').trim();
      const rawMethod = String(row?.signup_method || row?.signupMethod || row?.provider || 'SitePass 로그인');
      const methodKey = normalizeSignupProviderKey(rawMethod) || 'sitepass';
      const method = methodKey === 'kakao' ? 'kakao' : (methodKey === 'naver' ? 'naver' : 'sitepass');
      let roleName = supabaseRoleToAdminRole(row?.role || '');
      if (roleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(loginId)) roleName = '';
      const isKakao = methodKey === 'kakao' || loginId.toLowerCase().startsWith('kakao_');
      const isNaver = methodKey === 'naver' || loginId.toLowerCase().startsWith('naver_');
      const member = {
        id: 'SB-' + (loginId || row?.id || Date.now()),
        name: row?.name || row?.display_name || row?.nickname || '이름없음',
        phone: row?.phone || '',
        signupId: (isKakao || isNaver) ? '' : loginId,
        provider: isKakao ? '카카오톡' : (isNaver ? '네이버' : 'SitePass'),
        providerId: (isKakao || isNaver) ? (row?.provider_id || loginId) : (row?.provider_id || ''),
        kakaoUserId: isKakao ? (row?.provider_id || '') : '',
        naverUserId: isNaver ? (row?.provider_id || '') : '',
        signupMethod: method,
        status: row?.status === 'active' ? '정상' : (row?.status === 'withdrawn' ? '회원탈퇴' : (row?.status || '정상')),
        withdrawn: row?.status === 'withdrawn',
        paymentPlanLabel: row?.plan_label || row?.plan_type || '실사용베타',
        memberPlan: row?.plan_label || row?.plan_type || '실사용베타',
        paymentStartedAt: row?.plan_started_at || row?.created_at || row?.createdAt || '',
        paymentEndsAt: row?.plan_ends_at || row?.trial_ends_at || row?.paymentEndsAt || '',
        createdAt: row?.created_at || row?.createdAt || row?.plan_started_at || new Date().toISOString(),
        updatedAt: row?.updated_at || row?.updatedAt || '',
        lastLoginAt: row?.last_login_at || row?.lastLoginAt || '',
        lastLoginMethod: method,
        adminMemo: row?.admin_memo || row?.adminMemo || '',
        marketingAgreed: !!(row?.marketing_agreed || row?.marketingAgreed),
        emailMarketingAgreed: !!(row?.email_marketing_agreed || row?.emailMarketingAgreed),
        smsMarketingAgreed: !!(row?.sms_marketing_agreed || row?.smsMarketingAgreed),
        termsAgreedAt: row?.terms_agreed_at || row?.termsAgreedAt || '',
        supabaseLoginId: loginId,
        supabaseAuthUserId: row?.auth_user_id || row?.supabase_auth_user_id || row?.user_id || '',
        authUserId: row?.auth_user_id || row?.supabase_auth_user_id || row?.user_id || '',
        fromSupabase: true
      };
      if (roleName) member.adminRole = roleName;
      return member;
    }

    function getAdminLocalMemberKeys(member) {
      return [
        member?.supabaseLoginId,
        member?.providerId,
        member?.signupId,
        member?.id,
        member?.phone
      ].map(normalizeSupabaseLoginKeyForMember).filter(Boolean);
    }

    function getAdminMemberNameProviderKey(member) {
      const name = normalizeSupabaseLoginKeyForMember(member?.name || member?.displayName || '');
      const providerType = getMemberSignupProviderType(member);
      if (!name || name === '이름없음') return '';
      return providerType + ':name:' + name;
    }

    // v23.7.225 - 관리자 회원목록은 DB 행 수가 아니라 "실제 사용자 1명 = 화면 1명" 기준으로 다시 묶습니다.
    // 카카오 계정 회원가입 / kakao / KAKAo / PWA 로그인처럼 같은 사람이 여러 행으로 남아도 화면에는 1명만 표시합니다.
    function normalizeAdminDedupeToken(value) {
      return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^kakao[-_:]*/,'').replace(/^naver[-_:]*/,'');
    }

    function getAdminMemberDedupeTokens(member) {
      const tokens = [];
      const add = (prefix, value) => {
        const token = normalizeAdminDedupeToken(value);
        if (token) tokens.push(prefix + ':' + token);
      };
      if (!member) return tokens;
      const identifiers = getMemberAdminIdentifiers(member);
      if (isDesignatedSuperAdminMember(member) || identifiers.some(id => isSuperAdminLoginId(id))) {
        return ['superadmin:sitepass@kakao.com'];
      }
      const providerType = getMemberSignupProviderType(member);
      const isSocial = providerType === 'kakao' || providerType === 'naver';
      if (isSocial) {
        add(providerType + ':auth', member.supabaseAuthUserId || member.authUserId || member.userId);
        add(providerType + ':provider', member.providerId);
        add(providerType + ':provider', member.kakaoUserId);
        add(providerType + ':provider', member.naverUserId);
        add(providerType + ':login', member.supabaseLoginId);
        add(providerType + ':login', member.signupId);
        add(providerType + ':login', member.login_id);
        add(providerType + ':email', member.email);
        add(providerType + ':phone', member.phone);
        const np = getAdminMemberNameProviderKey(member);
        if (np) add(providerType + ':name', np);
      } else {
        getAdminLocalMemberKeys(member).forEach(key => add(providerType + ':local', key));
        add(providerType + ':email', member.email);
        add(providerType + ':phone', member.phone);
        const np = getAdminMemberNameProviderKey(member);
        if (np) add(providerType + ':name', np);
      }
      if (!tokens.length) add(providerType + ':row', member.id || member.supabaseLoginId || member.signupId || member.name || Math.random());
      return Array.from(new Set(tokens));
    }

// ---- merged from app-core-auth-07.js ----
// SitePass v23.7.303 - app-core-auth finer split (07/19)
function getAdminMemberCanonicalPrimaryKey(member) {
      const tokens = getAdminMemberDedupeTokens(member);
      return tokens[0] || ('row:' + (member?.id || Math.random()));
    }

    function scoreAdminMemberForDedupe(member) {
      if (!member) return -9999;
      let score = 0;
      if (isDesignatedSuperAdminMember(member)) score += 10000;
      if (member.fromSupabase) score += 1000;
      if (member.supabaseLoginId) score += 120;
      if (member.supabaseAuthUserId || member.authUserId) score += 110;
      if (member.providerId || member.kakaoUserId || member.naverUserId) score += 100;
      if (member.phone) score += 40;
      if (member.email) score += 30;
      if (member.lastLoginAt) score += 20;
      if (String(member.status || '').toLowerCase().includes('duplicate_hidden')) score -= 500;
      if (isMemberWithdrawnOrBlocked(member)) score -= 1000;
      const time = Date.parse(member.lastLoginAt || member.updatedAt || member.createdAt || '') || 0;
      score += Math.min(50, Math.floor(time / 100000000000));
      return score;
    }

    function mergeAdminMemberForDedupe(existing, incoming) {
      if (!existing) return incoming;
      if (!incoming) return existing;
      const existingScore = scoreAdminMemberForDedupe(existing);
      const incomingScore = scoreAdminMemberForDedupe(incoming);
      const base = incomingScore > existingScore ? incoming : existing;
      const other = incomingScore > existingScore ? existing : incoming;
      const merged = { ...other, ...base };
      ['id','phone','email','providerId','kakaoUserId','naverUserId','supabaseLoginId','signupId','supabaseAuthUserId','authUserId','lastLoginAt','createdAt','updatedAt','adminMemo','paymentPlanLabel','memberPlan','paymentEndsAt'].forEach(key => {
        if (!merged[key] && other[key]) merged[key] = other[key];
      });
      if (isDesignatedSuperAdminMember(existing) || isDesignatedSuperAdminMember(incoming)) {
        merged.adminRole = SUPER_ADMIN_ROLE_NAME;
        merged.role = 'super_admin';
      } else if (merged.adminRole === SUPER_ADMIN_ROLE_NAME && !isDesignatedSuperAdminMember(merged)) {
        delete merged.adminRole;
        merged.role = 'member';
      }
      merged._duplicateCount = Number(existing._duplicateCount || 1) + Number(incoming._duplicateCount || 1);
      return merged;
    }

    function dedupeAdminMembersForDisplay(members) {
      const groups = [];
      const tokenToIndex = new Map();
      (members || []).forEach(member => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return;
        const tokens = getAdminMemberDedupeTokens(member);
        const matching = Array.from(new Set(tokens.map(token => tokenToIndex.get(token)).filter(index => index !== undefined)));
        if (!matching.length) {
          const index = groups.length;
          groups.push({ member, tokens:new Set(tokens) });
          tokens.forEach(token => tokenToIndex.set(token, index));
          return;
        }
        const primary = matching[0];
        groups[primary].member = mergeAdminMemberForDedupe(groups[primary].member, member);
        tokens.forEach(token => groups[primary].tokens.add(token));
        // 같은 회원의 토큰이 여러 그룹에 흩어져 있으면 하나로 합칩니다.
        matching.slice(1).sort((a,b) => b-a).forEach(index => {
          groups[primary].member = mergeAdminMemberForDedupe(groups[primary].member, groups[index].member);
          groups[index].tokens.forEach(token => groups[primary].tokens.add(token));
          groups[index].member = null;
        });
        groups[primary].tokens.forEach(token => tokenToIndex.set(token, primary));
      });
      return groups.map(group => group.member).filter(Boolean);
    }

    function mergeSupabaseMembersIntoLocal(rows) {
      const rawIncoming = filterActiveRowsOnly(rows || [])
        .map(makeLocalMemberFromSupabaseRow)
        .filter(member => (member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.name));
      const incomingMap = new Map();
      rawIncoming.forEach(member => {
        const providerType = getMemberSignupProviderType(member);
        const key = (providerType === 'kakao' || providerType === 'naver')
          ? (getAdminMemberNameProviderKey(member) || getAdminLocalMemberKeys(member)[0])
          : (getAdminLocalMemberKeys(member)[0] || getAdminMemberNameProviderKey(member));
        if (!key) return;
        const prev = incomingMap.get(key);
        if (!prev) {
          incomingMap.set(key, member);
          return;
        }
        const prevTime = Date.parse(prev.lastLoginAt || prev.updatedAt || prev.createdAt || '') || 0;
        const nextTime = Date.parse(member.lastLoginAt || member.updatedAt || member.createdAt || '') || 0;
        if (nextTime >= prevTime) incomingMap.set(key, { ...prev, ...member, id: prev.id || member.id });
      });
      const incoming = dedupeAdminMembersForDisplay(Array.from(incomingMap.values()));
      if (!incoming.length) return 0;

      const localMembers = ensureMemberIds().filter(member => !isMemberWithdrawnOrBlocked(member));
      const localByKey = new Map();
      const localByNameProvider = new Map();

      localMembers.forEach(local => {
        getAdminLocalMemberKeys(local).forEach(key => {
          if (key && !localByKey.has(key)) localByKey.set(key, local);
        });
        const npKey = getAdminMemberNameProviderKey(local);
        if (npKey && !localByNameProvider.has(npKey)) localByNameProvider.set(npKey, local);
      });

      const serverKeySet = new Set();
      const serverNameProviderSet = new Set();
      const mergedServerMembers = incoming.map(server => {
        const keys = getAdminLocalMemberKeys(server);
        keys.forEach(key => serverKeySet.add(key));
        const npKey = getAdminMemberNameProviderKey(server);
        if (npKey) serverNameProviderSet.add(npKey);

        const sameLocal = keys.map(key => localByKey.get(key)).find(Boolean) || (npKey ? localByNameProvider.get(npKey) : null);
        if (!sameLocal) return server;
        return {
          ...sameLocal,
          ...server,
          id: server.id || sameLocal.id,
          adminRole: isDesignatedSuperAdminMember(server) ? SUPER_ADMIN_ROLE_NAME : (sameLocal.adminRole === SUPER_ADMIN_ROLE_NAME ? '' : (sameLocal.adminRole || server.adminRole || '')),
          adminRoleUpdatedAt: sameLocal.adminRoleUpdatedAt || server.adminRoleUpdatedAt || '',
          adminRoleUpdatedBy: sameLocal.adminRoleUpdatedBy || server.adminRoleUpdatedBy || '',
          testPassword: sameLocal.testPassword || server.testPassword || '',
          passwordSet: sameLocal.passwordSet || server.passwordSet || false,
          updatedAt: new Date().toISOString()
        };
      });

      // v23.7.204: 서버에서 회원 3명이 확인되면 화면/저장도 서버 3명을 기준으로 정리합니다.
      // 예전 localStorage에 남은 카카오/KAKAo/카카오계정회원가입 중복 행은 표시하지 않습니다.
      const keepLocalMembers = localMembers.filter(local => {
        const role = local?.adminRole || supabaseRoleToAdminRole(local?.role || '');
        const isAdmin = [SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role);
        if (isAdmin || local?.isSuperAdminVirtual) return true;

        const providerType = getMemberSignupProviderType(local);
        const keys = getAdminLocalMemberKeys(local);
        const sameKey = keys.some(key => serverKeySet.has(key));
        const npKey = getAdminMemberNameProviderKey(local);
        const sameNameProvider = npKey && serverNameProviderSet.has(npKey);

        if (providerType === 'kakao' || providerType === 'naver') {
          // v23.7.248: 네이버 약관가입 직후 서버 RPC 목록 반영이 늦어도 상세관리에서 숨기지 않습니다.
          return hasLocalSocialTermsAgreement(local) && !sameKey && !sameNameProvider;
        }
        if (sameKey || sameNameProvider) return false;
        return true;
      });

      const finalMap = new Map();
      const putFinal = member => {
        const key = getAdminMemberCanonicalPrimaryKey(member);
        if (!finalMap.has(key)) finalMap.set(key, member);
      };
      mergedServerMembers.forEach(putFinal);
      keepLocalMembers.forEach(putFinal);
      setMembers(Array.from(finalMap.values()));
      return incoming.length;
    }






    // v23.7.216 - 서버 active 목록에 없는 일반회원/소셜회원은 관리자 화면에 다시 살아나지 않도록 localStorage에서도 정리합니다.
    // 최고관리자와 직원 관리자 계정은 보존합니다.
    function purgeLocalMembersNotInActiveServerRows(rows) {
      const activeRows = filterActiveRowsOnly(rows || []);
      const activeMembers = activeRows.map(makeLocalMemberFromSupabaseRow).filter(Boolean);
      const activeKeys = new Set();
      const activeNameProviders = new Set();
      activeMembers.forEach(member => {
        getAdminLocalMemberKeys(member).forEach(key => activeKeys.add(key));
        const np = getAdminMemberNameProviderKey(member);
        if (np) activeNameProviders.add(np);
      });
      const kept = ensureMemberIds().filter(member => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return false;
        if (member.isSuperAdminVirtual || isDesignatedSuperAdminMember(member)) return true;
        if (['관리자','운영관리자','조회관리자'].includes(member.adminRole)) return true;
        const providerType = getMemberSignupProviderType(member);
        if ((providerType === 'kakao' || providerType === 'naver') && hasLocalSocialTermsAgreement(member)) return true;
        const keys = getAdminLocalMemberKeys(member);
        const np = getAdminMemberNameProviderKey(member);
        return keys.some(key => activeKeys.has(key)) || (np && activeNameProviders.has(np));
      });
      setMembers(kept);
      return kept.length;
    }

    // v23.7.208 - 가입방식 표기 통일: KAKAo / 카카오계정회원가입 / kakao 등을 하나로 정리합니다.
    function normalizeSignupProviderKey(value) {
      const raw = normalizeLoginText(value || '');
      const compact = raw.toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/-/g, '');
      if (!compact) return '';
      if (compact.includes('kakao') || compact.includes('카카오')) return 'kakao';
      if (compact.includes('naver') || compact.includes('네이버')) return 'naver';
      if (compact.includes('sitepass') || compact.includes('일반') || compact.includes('자체') || compact.includes('회원가입') || compact.includes('아이디')) return 'sitepass';
      return compact;
    }

    // 혹시 예전 패치에서 대소문자가 다르게 호출돼도 멈추지 않도록 별칭을 둡니다.
    function normalizeSignupProviderkey(value) { return normalizeSignupProviderKey(value); }
    function normalizesignupProviderKey(value) { return normalizeSignupProviderKey(value); }
    function normalizesignupProviderkey(value) { return normalizeSignupProviderKey(value); }
    function normalizesignupproviderkey(value) { return normalizeSignupProviderKey(value); }

    function findExistingMemberForSocialLogin(member) {
      if (!member) return null;
      const provider = normalizeSignupProviderKey(member.signupMethod || member.provider || '');
      const providerId = String(member.providerId || '').toLowerCase();
      const kakaoId = String(member.kakaoUserId || '').toLowerCase();
      const naverId = String(member.naverUserId || '').toLowerCase();
      const email = String(member.email || '').toLowerCase();
      const name = String(member.name || '').toLowerCase();
      const phone = String(member.phone || '').replace(/[^0-9]/g, '');
      return ensureMemberIds().find(m => {
        if (!m || isMemberWithdrawnOrBlocked(m)) return false;
        const mProvider = normalizeSignupProviderKey(m.signupMethod || m.provider || '');
        const mProviderId = String(m.providerId || '').toLowerCase();
        const mKakaoId = String(m.kakaoUserId || '').toLowerCase();
        const mNaverId = String(m.naverUserId || '').toLowerCase();
        const mEmail = String(m.email || '').toLowerCase();
        const mName = String(m.name || '').toLowerCase();
        const mPhone = String(m.phone || '').replace(/[^0-9]/g, '');
        return (providerId && mProviderId === providerId) ||
          (kakaoId && mKakaoId === kakaoId) ||
          (naverId && mNaverId === naverId) ||
          (email && mEmail === email && provider && mProvider === provider) ||
          (phone && mPhone === phone) ||
          (name && mName === name && provider && mProvider === provider);
      }) || null;
    }

    function mergeSocialLoginMember(existing, incoming) {
      if (!existing) return incoming;
      const keep = {
        id: existing.id,
        createdAt: existing.createdAt,
        phone: existing.phone,
        testPassword: existing.testPassword,
        passwordSet: existing.passwordSet,
        passwordChangedAt: existing.passwordChangedAt,
        adminRole: existing.adminRole,
        adminRoleUpdatedAt: existing.adminRoleUpdatedAt,
        adminRoleUpdatedBy: existing.adminRoleUpdatedBy,
        agreements: existing.agreements
      };
      Object.assign(existing, incoming || {}, { updatedAt:new Date().toISOString(), loginOnlyTest:true });
      if (!incoming?.phone && keep.phone) existing.phone = keep.phone;
      if (!incoming?.testPassword && keep.testPassword) existing.testPassword = keep.testPassword;
      if (keep.passwordSet && !incoming?.passwordSet) existing.passwordSet = keep.passwordSet;
      if (keep.passwordChangedAt && !incoming?.passwordChangedAt) existing.passwordChangedAt = keep.passwordChangedAt;
      if (keep.adminRole && !incoming?.adminRole) existing.adminRole = keep.adminRole;
      if (keep.adminRoleUpdatedAt && !incoming?.adminRoleUpdatedAt) existing.adminRoleUpdatedAt = keep.adminRoleUpdatedAt;
      if (keep.adminRoleUpdatedBy && !incoming?.adminRoleUpdatedBy) existing.adminRoleUpdatedBy = keep.adminRoleUpdatedBy;
      if (keep.agreements && !incoming?.agreements) existing.agreements = keep.agreements;
      existing.id = keep.id || existing.id;
      existing.createdAt = keep.createdAt || existing.createdAt;
      return existing;
    }

    function makeStableSocialFallbackId(provider) {
      const providerKey = normalizeSignupProviderKey(provider || 'social') || 'social';
      let saved = '';
      try { saved = localStorage.getItem('sitepass_' + providerKey + '_fallback_member_id') || ''; } catch (e) { saved = ''; }
      if (!saved) {
        saved = providerKey.toUpperCase() + '-BROWSER-' + Date.now();
        try { localStorage.setItem('sitepass_' + providerKey + '_fallback_member_id', saved); } catch (e) {}
      }
      return saved;
    }

    // v23.7.216 - 회원 저장 함수입니다. 기존 회원이면 신규 생성하지 않고, 최고관리자는 sitepass@kakao.com 1명만 유지합니다.

// ---- merged from app-core-auth-08.js ----
// SitePass v23.7.303 - app-core-auth finer split (08/19)
function saveMemberTest(member) {
      if (!member) return;
      const saveBlockedRecord = findWithdrawnMemberRecord(member);
      if (saveBlockedRecord) {
        // v23.7.219 테스트기간: 같은 계정으로 탈퇴→재가입을 반복할 수 있게 저장 차단을 해제합니다.
        removeWithdrawnMemberRecord(member);
        member.rejoinConfirmedAt = member.rejoinConfirmedAt || new Date().toISOString();
        member.withdrawn = false;
        member.status = member.status && isWithdrawnStatusValue(member.status) ? '실사용베타' : (member.status || '실사용베타');
        member.memberStatus = 'active';
        member.plan_type = member.plan_type && isWithdrawnStatusValue(member.plan_type) ? 'beta' : (member.plan_type || 'beta');
      }
      const members = ensureMemberIds();
      const memberPhone = String(member.phone || '').replace(/[^0-9]/g, '');
      const memberSignupId = String(member.signupId || '').toLowerCase();
      const memberProviderId = String(member.providerId || '').toLowerCase();
      const memberKakaoId = String(member.kakaoUserId || '').toLowerCase();
      const memberNaverId = String(member.naverUserId || '').toLowerCase();
      const memberEmail = String(member.email || '').toLowerCase();
      const memberName = String(member.name || '').toLowerCase();
      const memberProvider = normalizeSignupProviderKey(member.signupMethod || member.provider || '');
      const existing = members.find(m => {
        const mPhone = String(m.phone || '').replace(/[^0-9]/g, '');
        const mSignupId = String(m.signupId || '').toLowerCase();
        const mProviderId = String(m.providerId || '').toLowerCase();
        const mKakaoId = String(m.kakaoUserId || '').toLowerCase();
        const mNaverId = String(m.naverUserId || '').toLowerCase();
        const mEmail = String(m.email || '').toLowerCase();
        const mName = String(m.name || '').toLowerCase();
        const mProvider = normalizeSignupProviderKey(m.signupMethod || m.provider || '');
        return (member.id && m.id === member.id) ||
          (memberPhone && mPhone === memberPhone) ||
          (memberSignupId && mSignupId === memberSignupId) ||
          (memberProviderId && mProviderId === memberProviderId) ||
          (memberKakaoId && mKakaoId === memberKakaoId) ||
          (memberNaverId && mNaverId === memberNaverId) ||
          (memberEmail && mEmail === memberEmail && memberProvider && mProvider === memberProvider) ||
          (memberName && mName === memberName && memberProvider && mProvider === memberProvider);
      });
      const normalizedMember = { ...member, updatedAt:new Date().toISOString() };
      let savedMember = normalizedMember;
      if (existing) {
        const keep = {
          id: existing.id,
          createdAt: existing.createdAt,
          phone: existing.phone,
          testPassword: existing.testPassword,
          passwordSet: existing.passwordSet,
          passwordChangedAt: existing.passwordChangedAt,
          adminRole: existing.adminRole,
          adminRoleUpdatedAt: existing.adminRoleUpdatedAt,
          adminRoleUpdatedBy: existing.adminRoleUpdatedBy,
          agreements: existing.agreements
        };
        Object.assign(existing, normalizedMember);
        if (keep.id) existing.id = keep.id;
        if (keep.createdAt) existing.createdAt = keep.createdAt;
        if (!member.phone && keep.phone) existing.phone = keep.phone;
        if (!member.testPassword && keep.testPassword) existing.testPassword = keep.testPassword;
        if (keep.passwordSet && !member.passwordSet) existing.passwordSet = keep.passwordSet;
        if (keep.passwordChangedAt && !member.passwordChangedAt) existing.passwordChangedAt = keep.passwordChangedAt;
        if (keep.adminRole && !member.adminRole) existing.adminRole = keep.adminRole;
        if (keep.adminRoleUpdatedAt && !member.adminRoleUpdatedAt) existing.adminRoleUpdatedAt = keep.adminRoleUpdatedAt;
        if (keep.adminRoleUpdatedBy && !member.adminRoleUpdatedBy) existing.adminRoleUpdatedBy = keep.adminRoleUpdatedBy;
        if (keep.agreements && !member.agreements) existing.agreements = keep.agreements;
        savedMember = existing;
      } else {
        savedMember = { id:'MEM-' + Date.now(), createdAt:new Date().toISOString(), status:'실사용베타', ...normalizedMember };
        members.unshift(savedMember);
      }
      setMembers(members);
      try { saveMemberToSupabase(savedMember); } catch (e) { console.warn('회원 서버 저장은 나중에 다시 시도합니다:', e); }
      return savedMember;
    }

    async function syncCurrentSupabaseAuthMemberToServer() {
      try {
        const supabaseApi = getSupabaseApiModule();
        if (!(supabaseApi.hasRpc && supabaseApi.hasRpc())) return false;
        const { error } = await supabaseApi.rpc('sitepass_sync_current_user_member');
        if (error) {
          console.warn('현재 Supabase Auth 회원 서버 동기화 RPC 실패:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('현재 Supabase Auth 회원 서버 동기화 RPC 예외:', e);
        return false;
      }
    }

    async function syncSupabaseMembersForAdmin(forceAlert) {
      if (!isAdminLoggedIn()) return;
      if (adminSupabaseMemberSyncing) return;
      if (!forceAlert && adminSupabaseMemberSyncedAt && Date.now() - adminSupabaseMemberSyncedAt < 15000) return;
      const supabaseApi = getSupabaseApiModule();
      if (!(supabaseApi.hasClient && supabaseApi.hasClient())) {
        adminSupabaseMemberSyncMessage = 'Supabase 연결 없음: 이 브라우저에 저장된 회원만 표시 중';
        if (forceAlert) alert(adminSupabaseMemberSyncMessage);
        renderAdmin();
        return;
      }
      adminSupabaseMemberSyncing = true;
      adminSupabaseMemberSyncMessage = '인터넷 서버 회원목록 불러오는 중...';
      renderAdmin();
      try {
        let rows = [];
        let rpcErrorMessage = '';
        let directErrorMessage = '';

        // v23.7.225: 관리자 새로고침 전 Auth 소셜 가입자를 members로 먼저 보강 동기화합니다.
        // 이 단계가 실패해도 아래 회원목록 조회는 계속 진행합니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          try {
            const { data: authSyncCount, error: authSyncError } = await supabaseApi.rpc('sitepass_sync_auth_social_users_to_members');
            if (authSyncError) {
              console.warn('Auth 소셜 회원 보강 동기화 실패:', authSyncError.message || authSyncError);
            } else {
              console.log('Auth 소셜 회원 보강 동기화 완료:', authSyncCount);
            }
          } catch (authSyncException) {
            console.warn('Auth 소셜 회원 보강 동기화 예외:', authSyncException?.message || authSyncException);
          }
        }

        // v23.7.216: 인터넷 배포에서는 RLS 때문에 직접 SELECT가 막힐 수 있으므로 RPC를 1순위로 호출합니다.
        let triedRpc = false;
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          triedRpc = true;
          try {
            const { data: rpcRows, error: rpcError } = await supabaseApi.rpc('sitepass_admin_sync_members');
            if (rpcError) {
              rpcErrorMessage = rpcError.message || 'sitepass_admin_sync_members RPC 실패';
            } else {
              rows = Array.isArray(rpcRows) ? rpcRows : [];
            }
          } catch (rpcException) {
            rpcErrorMessage = rpcException?.message || 'sitepass_admin_sync_members RPC 예외';
          }
        }

        // v23.7.216: RPC가 있으면 RPC 결과만 active 기준으로 사용합니다.
        // RPC 실패 때 직접조회로 우회하면 탈퇴회원이 다시 보일 수 있어 직접조회는 RPC가 없는 경우에만 씁니다.
        if (!rows.length && !triedRpc) {
          try {
            const { data, error } = await supabaseApi.select('sitepass_members', '*', function(query){
              return query.order('last_login_at', { ascending:false, nullsFirst:false }).limit(1000);
            });
            if (error) {
              directErrorMessage = error.message || 'sitepass_members 직접 조회 실패';
            } else {
              rows = Array.isArray(data) ? data : [];
            }
          } catch (directError) {
            directErrorMessage = directError?.message || 'sitepass_members 직접 조회 예외';
          }
        }

        // v23.7.225: 관리자 통계는 회원 행 수가 아니라 약관동의 완료/active/탈퇴 이벤트 기준 RPC를 우선 사용합니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          try {
            const { data: summaryData, error: summaryError } = await supabaseApi.rpc('sitepass_admin_member_summary');
            if (summaryError) {
              console.warn('관리자 가입/탈퇴 통계 RPC 실패:', summaryError.message || summaryError);
            } else {
              adminMemberSummaryStats = summaryData || null;
              clearLocalWithdrawnIfServerSaysZero();
            }
          } catch (summaryException) {
            console.warn('관리자 가입/탈퇴 통계 RPC 예외:', summaryException?.message || summaryException);
          }
        }

        rows = filterRowsExcludingLocalWithdrawn(filterActiveRowsOnly(rows || []));
        adminServerMemberRows = rows || [];
        const count = mergeSupabaseMembersIntoLocal(rows || []);
        try { purgeLocalMembersNotInActiveServerRows(rows || []); } catch (purgeError) { console.warn('local 회원목록 active 기준 정리 생략:', purgeError); }
        adminSupabaseMemberSyncedAt = Date.now();
        adminSupabaseMemberSyncMessage = rows.length
          ? '약관동의 회원목록 동기화 완료: 서버 표시대상 ' + rows.length + '명 / 화면 ' + dedupeAdminMembersForDisplay(rows.map(makeLocalMemberFromSupabaseRow)).length + '명 표시'
          : '서버 회원 0명 수신. RPC 확인: ' + (rpcErrorMessage || '오류 없음') + (directErrorMessage ? ' / 직접조회: ' + directErrorMessage : '');
        if (forceAlert) alert(adminSupabaseMemberSyncMessage);
      } catch (e) {
        console.warn('Supabase 회원목록 불러오기 예외:', e);
        adminSupabaseMemberSyncMessage = 'Supabase 회원목록 불러오기 중 오류가 났습니다: ' + (e?.message || '알 수 없음');
        if (forceAlert) alert(adminSupabaseMemberSyncMessage);
      } finally {
        adminSupabaseMemberSyncing = false;
        renderAdmin();
      }
    }

// ---- merged from app-core-auth-09.js ----
// SitePass v23.7.303 - app-core-auth finer split (09/19)
const SITEPASS_OAUTH_PENDING_KEY = STORAGE_KEY + '_oauth_pending_v23_7_207';

    // v23.7.258: 카카오/네이버 OAuth 로그인 처리는 assets/js/auth-social.js로 분리했습니다.
    function getAuthSocialModule() {
      return window.SitePassAuthSocial || {};
    }

    function isNonChromeInternetBrowser() {
      const mod = getAuthSocialModule();
      return mod.isNonChromeInternetBrowser ? mod.isNonChromeInternetBrowser() : false;
    }

    function showOAuthRedirectHelp(providerLabel, url) {
      const mod = getAuthSocialModule();
      if (mod.showOAuthRedirectHelp) return mod.showOAuthRedirectHelp(providerLabel, url);
    }

    function hideOAuthRedirectHelp() {
      const mod = getAuthSocialModule();
      if (mod.hideOAuthRedirectHelp) return mod.hideOAuthRedirectHelp();
    }

    function openOAuthUrlSameTab(url, providerLabel) {
      const mod = getAuthSocialModule();
      return mod.openOAuthUrlSameTab ? mod.openOAuthUrlSameTab(url, providerLabel) : false;
    }

    function getOAuthRedirectUrl() {
      const mod = getAuthSocialModule();
      return mod.getOAuthRedirectUrl ? mod.getOAuthRedirectUrl() : (location.origin + location.pathname);
    }

    function hasSupabaseKakaoReturnParams() {
      const mod = getAuthSocialModule();
      return mod.hasSupabaseKakaoReturnParams ? mod.hasSupabaseKakaoReturnParams() : false;
    }

    async function startSupabaseKakaoOAuth(mode) {
      const mod = getAuthSocialModule();
      if (mod.startSupabaseKakaoOAuth) return mod.startSupabaseKakaoOAuth(mode);
      alert('카카오 로그인 파일을 불러오지 못했습니다. assets/js/auth-social.js 업로드를 확인해주세요.');
    }

    async function startSupabaseNaverOAuth(mode) {
      const mod = getAuthSocialModule();
      if (mod.startSupabaseNaverOAuth) return mod.startSupabaseNaverOAuth(mode);
      alert('네이버 로그인 파일을 불러오지 못했습니다. assets/js/auth-social.js 업로드를 확인해주세요.');
    }

    function handleKakaoLogin() {
      const mod = getAuthSocialModule();
      if (mod.handleKakaoLogin) return mod.handleKakaoLogin();
      return startSupabaseKakaoOAuth('login');
    }

    function handleNaverLogin() {
      const mod = getAuthSocialModule();
      if (mod.handleNaverLogin) return mod.handleNaverLogin();
      return startSupabaseNaverOAuth('login');
    }

    function handleNaverSignup() {
      const mod = getAuthSocialModule();
      if (mod.handleNaverSignup) return mod.handleNaverSignup();
      return startSupabaseNaverOAuth('signup');
    }

    function handleKakaoSignup() {
      const mod = getAuthSocialModule();
      if (mod.handleKakaoSignup) return mod.handleKakaoSignup();
      return startSupabaseKakaoOAuth('signup');
    }

    // 휴대폰 inline onclick 안전 연결
    window.handleKakaoLogin = handleKakaoLogin;
    window.handleKakaoSignup = handleKakaoSignup;
    window.handleNaverLogin = handleNaverLogin;
    window.handleNaverSignup = handleNaverSignup;
    window.submitSocialLoginTest = submitSocialLoginTest;
    window.startJoinFlow = startJoinFlow;
    window.openSitePassSignup = openSitePassSignup;
    window.toggleAllSignupTerms = toggleAllSignupTerms;
    window.updateSignupTermsUi = updateSignupTermsUi;

    function normalizeOAuthProviderFromAuth(value) {
      const mod = getAuthSocialModule();
      return mod.normalizeOAuthProviderFromAuth ? mod.normalizeOAuthProviderFromAuth(value) : String(value || '').trim().toLowerCase().replace(/^custom:/, '');
    }

    function getPrimaryAuthProviderFromUser(user, fallback) {
      const mod = getAuthSocialModule();
      return mod.getPrimaryAuthProviderFromUser ? mod.getPrimaryAuthProviderFromUser(user, fallback) : normalizeOAuthProviderFromAuth(fallback || user?.app_metadata?.provider || user?.user_metadata?.provider || '');
    }

    function makeMemberFromSupabaseKakaoUser(user, pending) {
      const mod = getAuthSocialModule();
      return mod.makeMemberFromSupabaseKakaoUser ? mod.makeMemberFromSupabaseKakaoUser(user, pending) : null;
    }

    function makeMemberFromSupabaseNaverUser(user, pending) {
      const mod = getAuthSocialModule();
      return mod.makeMemberFromSupabaseNaverUser ? mod.makeMemberFromSupabaseNaverUser(user, pending) : null;
    }

    function sitePassOAuthWithTimeout(promise, ms, label) {
      const mod = getAuthSocialModule();
      if (mod.sitePassOAuthWithTimeout) return mod.sitePassOAuthWithTimeout(promise, ms, label);
      return Promise.resolve(promise);
    }

    async function handleSupabaseKakaoOAuthReturn() {
      const mod = getAuthSocialModule();
      if (mod.handleSupabaseKakaoOAuthReturn) return mod.handleSupabaseKakaoOAuthReturn();
      return false;
    }


    function normalizeLoginText(value) {
      return String(value || '').trim();
    }



    // v23.7.216 - 휴대폰 브라우저 저장 비밀번호가 들어왔는지 확인하기 쉽도록 표시 토글을 제공합니다.
    function toggleLoginPasswordVisible(checked) {
      const input = document.getElementById('sitepassLoginPassword');
      if (!input) return;
      input.type = checked ? 'text' : 'password';
    }
    window.toggleLoginPasswordVisible = toggleLoginPasswordVisible;


    // v23.7.216 - 휴대폰 브라우저 저장 비밀번호 자동완성 안정화.
    // 로그인 화면을 열 때 JS가 비밀번호를 지우지 않도록 하고, 실제 <form> 구조로 브라우저 비밀번호 관리자와 맞춥니다.
    function stabilizeLoginAutofillFields() {
      const form = document.getElementById('normalLoginFormArea');
      const idInput = document.getElementById('sitepassLoginIdentifier');
      const pwInput = document.getElementById('sitepassLoginPassword');
      if (form) {
        form.setAttribute('autocomplete', 'on');
        form.setAttribute('method', 'post');
        form.setAttribute('action', './');
      }
      if (idInput) {
        idInput.setAttribute('name', 'username');
        idInput.setAttribute('autocomplete', 'username');
        idInput.setAttribute('autocapitalize', 'none');
        idInput.setAttribute('spellcheck', 'false');
      }
      if (pwInput) {
        pwInput.classList.remove('hidden');
        pwInput.setAttribute('name', 'password');
        pwInput.setAttribute('autocomplete', 'current-password');
        if (pwInput.type !== 'text') pwInput.type = 'password';
      }
    }
    window.stabilizeLoginAutofillFields = stabilizeLoginAutofillFields;
    window.addEventListener('pageshow', function(){ setTimeout(stabilizeLoginAutofillFields, 80); });
    window.addEventListener('load', function(){ setTimeout(stabilizeLoginAutofillFields, 160); });

    function openAdminLoginFromSignup() {
      showScreen('signupScreen');
    }

    function isSuperAdminLoginId(loginId) {
      const key = normalizeAdminRoleKey(loginId);
      return !!key && key === normalizeAdminRoleKey(ADMIN_ID);
    }

    function supabaseRoleToAdminRole(role) {
      const value = String(role || '').trim().toLowerCase();
      if (!value) return '';
      if (value === 'super_admin' || value === 'superadmin' || value === '최고관리자') return SUPER_ADMIN_ROLE_NAME;
      if (value === 'admin' || value === 'operator' || value === 'manager' || value === '운영관리자' || value === 'viewer' || value === 'readonly' || value === '조회관리자' || value === '관리자') return '관리자';
      return '';
    }

// ---- merged from app-core-auth-10.js ----
// SitePass v23.7.303 - app-core-auth finer split (10/19)
function adminRoleToSupabaseRole(roleName, loginId) {
      if (isSuperAdminLoginId(loginId)) return 'super_admin';
      if (roleName === SUPER_ADMIN_ROLE_NAME) return 'member';
      if (roleName === '관리자' || roleName === '운영관리자' || roleName === '조회관리자') return 'admin';
      return 'member';
    }

    function isDesignatedSuperAdminMember(member) {
      if (!member) return false;
      return getMemberAdminIdentifiers(member).some(id => isSuperAdminLoginId(id));
    }

    function normalizeSingleSuperAdminRole(member) {
      if (!member || member.isSuperAdminVirtual) return member;
      const designated = isDesignatedSuperAdminMember(member);
      const roleName = member.adminRole || supabaseRoleToAdminRole(member.role || '');
      if (designated) {
        member.adminRole = SUPER_ADMIN_ROLE_NAME;
        member.role = 'super_admin';
        return member;
      }
      if (roleName === SUPER_ADMIN_ROLE_NAME || String(member.role || '').toLowerCase() === 'super_admin') {
        delete member.adminRole;
        member.role = 'member';
        member.adminRoleUpdatedAt = new Date().toISOString();
        member.adminRoleUpdatedBy = 'SitePass 최고관리자 단일화';
      }
      return member;
    }

    function enforceSingleSuperAdminOnMemberList(list) {
      const arr = Array.isArray(list) ? list : [];
      return arr.map(member => normalizeSingleSuperAdminRole({ ...(member || {}) }));
    }

    function cleanupAdminRoleMapSingleSuperAdmin() {
      const map = getAdminRoleMap();
      let changed = false;
      Object.keys(map || {}).forEach(key => {
        if (map[key] === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(key)) {
          delete map[key];
          changed = true;
        }
      });
      if (changed) setAdminRoleMap(map);
    }

    function getLocalAdminRoleForLogin(loginId, member) {
      if (isSuperAdminLoginId(loginId)) return SUPER_ADMIN_ROLE_NAME;
      const role = (member && (member.adminRole || supabaseRoleToAdminRole(member.role))) || '';
      if (role === SUPER_ADMIN_ROLE_NAME) return '';
      const mapped = getMappedAdminRoleForLogin(loginId);
      return mapped === SUPER_ADMIN_ROLE_NAME ? '' : mapped;
    }

    async function fetchSupabaseAdminRoleForLogin(loginId) {
      try {
        if (!window.sitepassSupabase) return '';
        const raw = normalizeLoginText(loginId);
        const key = normalizeAdminRoleKey(raw);
        const candidates = Array.from(new Set([
          raw,
          key,
          key ? 'SITEPASS-' + key : '',
          key ? 'SITEPASS-LOGIN-' + key : ''
        ].filter(Boolean)));
        if (!candidates.length) return '';

        const { data, error } = await window.sitepassSupabase
          .from('sitepass_members')
          .select('login_id, role, name, phone')
          .in('login_id', candidates)
          .limit(1);

        if (error) {
          console.warn('Supabase 관리자 권한 조회 실패:', error.message);
          return '';
        }
        const roleName = supabaseRoleToAdminRole(data && data[0] && data[0].role);
        if (roleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(loginId)) return '';
        return roleName;
      } catch (e) {
        console.warn('Supabase 관리자 권한 조회 예외:', e);
        return '';
      }
    }

    function getAdminRoleMap() {
      try {
        return JSON.parse(localStorage.getItem(ADMIN_ROLE_MAP_KEY) || '{}') || {};
      } catch (e) {
        return {};
      }
    }

    function setAdminRoleMap(map) {
      localStorage.setItem(ADMIN_ROLE_MAP_KEY, JSON.stringify(map || {}));
    }

    function normalizeAdminRoleKey(value) {
      const raw = normalizeLoginText(value).toLowerCase();
      if (!raw) return '';
      return raw.replace(/^sitepass-/, '').replace(/^sitepass-login-/, '');
    }

    function getMemberAdminIdentifiers(member) {
      if (!member) return [];
      const phoneDigits = String(member.phone || '').replace(/[^0-9]/g, '');
      const providerRaw = String(member.providerId || '');
      const providerNoPrefix = providerRaw.replace(/^SITEPASS-/i, '').replace(/^SITEPASS-LOGIN-/i, '');
      return [
        member.id,
        member.signupId,
        member.providerId,
        providerNoPrefix,
        member.name,
        member.phone,
        phoneDigits
      ].map(normalizeAdminRoleKey).filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);
    }

    function syncMemberAdminRoleMap(member, role) {
      const map = getAdminRoleMap();
      getMemberAdminIdentifiers(member).forEach(key => {
        if (role) map[key] = role;
        else delete map[key];
      });
      setAdminRoleMap(map);
    }

    function getMappedAdminRoleForLogin(loginId) {
      const key = normalizeAdminRoleKey(loginId);
      if (!key) return '';
      const map = getAdminRoleMap();
      return map[key] || '';
    }

    function getCurrentAdminRoleName() {
      const role = getSessionValue(ADMIN_SESSION_KEY + '_role') || SUPER_ADMIN_ROLE_NAME;
      const adminId = getSessionValue(ADMIN_SESSION_KEY + '_id') || '';
      if (role === SUPER_ADMIN_ROLE_NAME && adminId && !isSuperAdminLoginId(adminId)) return '관리자';
      return role;
    }

    function isSuperAdminLoggedIn() {
      return isAdminLoggedIn() && getCurrentAdminRoleName() === SUPER_ADMIN_ROLE_NAME;
    }

    function completeAdminLogin(roleName, adminId, adminName) {
      let finalRoleName = roleName || SUPER_ADMIN_ROLE_NAME;
      if (finalRoleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(adminId || ADMIN_ID)) finalRoleName = '관리자';
      setSessionValue(ADMIN_SESSION_KEY, 'yes');
      setSessionValue(ADMIN_SESSION_KEY + '_role', finalRoleName);
      setSessionValue(ADMIN_SESSION_KEY + '_id', adminId || '');
      setSessionValue(ADMIN_SESSION_KEY + '_name', adminName || '');
      removeSessionValue(CURRENT_MEMBER_KEY);
      clearPwaAutoMemberTest();
      refreshAdminUi();
      refreshMemberUi();
      showScreen('adminScreen');
    }

    function completeSuperAdminLogin() {
      completeAdminLogin(SUPER_ADMIN_ROLE_NAME, ADMIN_ID, '대표이사 최고관리자');
    }

    function ensureMemberIds() {
      const members = getMembers();
      let changed = false;
      members.forEach((member, index) => {
        if (!member.id) {
          member.id = 'MEM-' + Date.now() + '-' + index;
          changed = true;
        }
      });
      if (changed) setMembers(members);
      return members;
    }

    function findMemberForLogin(loginId) {
      const q = normalizeAdminRoleKey(loginId);
      const qPhone = String(loginId || '').replace(/[^0-9]/g, '');
      return getMembers().find(item => {
        const keys = getMemberAdminIdentifiers(item);
        const phone = String(item.phone || '').replace(/[^0-9]/g, '');
        return keys.includes(q) || (qPhone && phone === qPhone);
      });
    }

    function isMemberPasswordOk(member, password) {
      if (!member) return false;
      if (!member.testPassword) return true;
      return String(member.testPassword) === String(password || '');
    }

    function completeMemberAdminLogin(member) {
      const updatedMember = updateMemberLastLogin(member, '일반 로그인(관리자 권한)') || member;
      const role = updatedMember.adminRole || member.adminRole || '관리자';
      const adminId = updatedMember.signupId || updatedMember.providerId || updatedMember.id || updatedMember.name || '';
      const adminName = updatedMember.name || updatedMember.signupId || '관리자';
      completeAdminLogin(role, adminId, adminName);
    }



    function isSitePassInstalledAppMode() {
      try {
        return !!(
          window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          window.matchMedia('(display-mode: minimal-ui)').matches ||
          window.navigator.standalone === true
        );
      } catch (e) {
        return false;
      }
    }

    function getQuickAuth() {
      try {
        return JSON.parse(localStorage.getItem(QUICK_AUTH_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }

    function setQuickAuth(data) {
      localStorage.setItem(QUICK_AUTH_KEY, JSON.stringify(data || {}));
      updateQuickAuthUi();
    }

    function getQuickAuthLoginKey(member) {
      return member?.signupId || member?.providerId || member?.id || member?.phone || member?.name || '';
    }

    function getCurrentQuickAuthMember() {
      const current = getCurrentMemberTest();
      if (!current) return null;
      return findMemberForLogin(getQuickAuthLoginKey(current)) || current;
    }

    function getQuickAuthUnlockMember(auth) {
      if (!auth) return null;
      return findMemberForLogin(auth.memberLoginKey) || auth.member || null;
    }

    function isSignupScreenVisible() {
      const signup = document.getElementById('signupScreen');
      return !!(signup && !signup.classList.contains('hidden'));
    }

