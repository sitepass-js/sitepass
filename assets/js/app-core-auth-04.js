// SitePass v23.7.298 - app-core-auth split continue (04/10)
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
