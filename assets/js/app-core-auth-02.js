    function getAdminSampleEquipmentOwner() {
      return {
        id:'MEM-SAMPLE-EQUIPMENT-OWNER',
        name:'김장비',
        phone:'010-1111-2222',
        signupId:'kim-equipment',
        provider:'SitePass',
        providerId:'SITEPASS-kim-equipment',
        signupMethod:'SitePass 로그인',
        status:'실사용베타',
        paymentPlanLabel:'실사용베타',
        memberPlan:'실사용베타',
        paymentStartedAt:'2026-06-26T00:00:00.000Z',
        paymentEndsAt:addDaysIso(new Date().toISOString(), TRIAL_DAYS || 60),
        paymentStatus:'신규결제완료',
        adminLastAction:'1개월 신규결제 처리',
        adminLastActionAt:new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        createdAt:'2026-06-26T00:00:00.000Z',
        lastLoginAt:new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastLoginMethod:'SitePass 로그인',
        adminMemo:'베타 확인용 장비 소유자입니다. 굴착기 / 00보0000 서류와 연결했습니다.'
      };
    }


    function getAdminSampleNoTrialMember() {
      return {
        id:'MEM-SAMPLE-NO-TRIAL',
        name:'박미결제',
        phone:'010-3333-4444',
        signupId:'no-trial-user',
        provider:'SitePass',
        providerId:'SITEPASS-no-trial-user',
        signupMethod:'SitePass 로그인',
        status:'미결제',
        paymentPlanLabel:'미결제',
        memberPlan:'미결제',
        paymentStartedAt:'',
        paymentEndsAt:addDaysIso(new Date().toISOString(), 1),
        paymentStatus:'환불요청',
        refundRequestPending:true,
        refundRequestedAt:new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        refundRequestMemo:'베타 환불요청',
        createdAt:'2026-06-26T00:10:00.000Z',
        lastLoginAt:new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        lastLoginMethod:'SitePass 로그인',
        adminMemo:'실사용 베타가 없는 회원 예시입니다. 결제여부/남은기간 1일 표시 확인용입니다.'
      };
    }

    function getAdminSampleExtensionMember() {
      return {
        id:'MEM-SAMPLE-EXTENSION',
        name:'이연장',
        phone:'010-5555-6666',
        signupId:'extension-user',
        provider:'SitePass',
        providerId:'SITEPASS-extension-user',
        signupMethod:'SitePass 로그인',
        status:'1개월 연장결제',
        paymentPlanLabel:'1개월권',
        memberPlan:'1개월권',
        paymentStartedAt:new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        paymentEndsAt:addDaysIso(new Date().toISOString(), 35),
        paymentStatus:'연장결제완료',
        adminLastAction:'1개월 연장결제 처리',
        adminLastActionAt:new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt:'2026-06-26T00:20:00.000Z',
        lastLoginAt:new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        lastLoginMethod:'SitePass 로그인',
        adminMemo:'연장결제 확인용 베타 회원입니다.'
      };
    }

    function upsertAdminSampleMember(member) {
      const members = getMembers();
      const idx = members.findIndex(item => String(item.id || '') === String(member.id || '') || String(item.signupId || '').toLowerCase() === String(member.signupId || '').toLowerCase());
      if (idx >= 0) {
        members[idx] = { ...members[idx], ...member, updatedAt:new Date().toISOString() };
      } else {
        members.unshift(member);
      }
      setMembers(members);
    }

    function ensureAdminSampleMembers() {
      upsertAdminSampleMember(getAdminSampleEquipmentOwner());
      upsertAdminSampleMember(getAdminSampleNoTrialMember());
      upsertAdminSampleMember(getAdminSampleExtensionMember());
    }
    

    // v23.7.225 - 소셜 가입자가 최고관리자 회원목록에 반드시 보이도록 최종 보강합니다.
    // v23.7.219 - 소셜 로그인 DB 저장키를 하나로 고정합니다.
    // 카카오/네이버는 signupMethod 표기가 달라도 login_id를 kakao_고유ID / naver_고유ID 하나로만 씁니다.
    function getStableProviderRawId(member, providerKey) {
      if (!member) return '';
      const identityData = member.identityData || member.identity_data || {};
      const raw = providerKey === 'kakao'
        ? (member.kakaoUserId || member.providerUserId || member.provider_id || member.providerId || identityData.provider_id || identityData.sub || member.supabaseAuthUserId || member.authUserId || member.userId || '')
        : (member.naverUserId || member.providerUserId || member.provider_id || member.providerId || identityData.provider_id || identityData.sub || member.supabaseAuthUserId || member.authUserId || member.userId || '');
      return String(raw || '')
        .replace(/^KAKAO[-_:]/i, '')
        .replace(/^NAVER[-_:]/i, '')
        .trim();
    }

    function makeStableMemberLoginId(member) {
      const providerKey = normalizeSignupProviderKey(member?.signupMethod || member?.provider || member?.signup_provider || '');
      if (providerKey === 'kakao' || providerKey === 'naver') {
        const rawId = getStableProviderRawId(member, providerKey);
        if (rawId) return providerKey + '_' + rawId;
      }
      return String(
        member?.signupId ||
        member?.login_id ||
        member?.loginId ||
        member?.providerId ||
        member?.supabaseAuthUserId ||
        member?.authUserId ||
        member?.userId ||
        member?.phone ||
        member?.id ||
        ''
      ).trim();
    }

    async function saveMemberToSupabase(member) {
      try {
        const supabaseApi = getSupabaseApiModule();
        if (!(supabaseApi.hasClient && supabaseApi.hasClient()) || !member) return;

        const normalizedSignupMethod = normalizeSignupProviderKey(member.signupMethod || member.provider || 'sitepass') || 'sitepass';
        const loginId = makeStableMemberLoginId({ ...member, signupMethod: normalizedSignupMethod });

        const localWithdrawnRecord = findWithdrawnMemberRecord(member);
        if (localWithdrawnRecord && !member.rejoinConfirmedAt) {
          // v23.7.225 테스트기간: 탈퇴 후 같은 카카오/네이버 계정으로 재가입 테스트가 가능해야 하므로
          // 브라우저 localStorage에 남은 탈퇴 차단 기록은 서버 active 저장을 막지 않게 제거합니다.
          removeWithdrawnMemberRecord(member);
          member.rejoinConfirmedAt = new Date().toISOString();
          member.withdrawn = false;
          member.status = '실사용베타';
          member.memberStatus = 'active';
          member.plan_type = 'beta';
        }
        const cleanPhone = String(member.phone || '').replace(/[^0-9]/g, '');
        const agreements = member.agreements || {};
        const kakaoAppMarketingAgreed = !!(agreements.kakaoAppMarketing || agreements.marketingKakaoApp || agreements.marketing);
        const emailMarketingAgreed = !!(agreements.emailMarketing || agreements.emailAd || agreements.marketingEmail);
        const smsMarketingAgreed = !!(agreements.smsMarketing || agreements.smsAd || agreements.marketingSms);
        const anyMarketingAgreed = !!(kakaoAppMarketingAgreed || emailMarketingAgreed || smsMarketingAgreed || agreements.marketing);
        const termsAgreedAt = agreements.agreedAt || member.termsAgreedAt || member.agreedAt || null;
        let finalRole = adminRoleToSupabaseRole(member.adminRole || '', loginId);

        // v23.7.219: 최고관리자는 sitepass@kakao.com 1명만 허용합니다.
        // 기존 서버에 남은 super_admin 권한은 여기서 보존하지 않고, 명시된 현재 권한값으로 다시 저장합니다.
        if (finalRole === 'super_admin' && !isSuperAdminLoginId(loginId)) finalRole = 'member';

        const existingStatus = await getSupabaseMemberStatus({ ...member, signupId: loginId, login_id: loginId, signupMethod: normalizedSignupMethod });
        if (existingStatus === 'withdrawn' && !member.rejoinConfirmedAt) {
          console.warn('탈퇴 회원은 일반 저장으로 재활성화하지 않습니다:', loginId);
          return;
        }

        const row = {
          login_id: loginId || null,
          name: String(member.name || '').trim() || '이름없음',
          phone: cleanPhone || null,
          email: String(member.email || '').trim() || null,
          provider_id: getStableProviderRawId({ ...member, signupMethod: normalizedSignupMethod }, normalizedSignupMethod) || String(member.providerId || '').trim() || null,
          auth_user_id: String(member.supabaseAuthUserId || member.authUserId || member.userId || '').trim() || null,
          signup_method: normalizedSignupMethod,
          role: finalRole,
          status: 'active',
          plan_type: 'beta',
          plan_label: member.paymentPlanLabel || member.memberPlan || '실사용베타',
          plan_started_at: member.paymentStartedAt || new Date().toISOString(),
          plan_ends_at: member.paymentEndsAt || new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          last_login_at: new Date().toISOString(),
          terms_agreed_at: termsAgreedAt || null,
          marketing_agreed: anyMarketingAgreed,
          email_marketing_agreed: emailMarketingAgreed,
          sms_marketing_agreed: smsMarketingAgreed,
          admin_memo: 'SitePass 웹 회원가입/로그인에서 자동 저장'
        };

        // v23.7.250: 네이버/카카오 약관동의 완료 회원은 auth_user_id/provider_id/email까지 서버에 확정 저장합니다.
        // 그래야 다른 기기에서도 약관창이 다시 뜨지 않고 관리자 상세목록에 표시됩니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc() && (normalizedSignupMethod === 'kakao' || normalizedSignupMethod === 'naver') && termsAgreedAt) {
          try {
            const { data: confirmLoginId, error: confirmError } = await supabaseApi.rpc('sitepass_confirm_social_terms_member', {
              p_login_id: row.login_id,
              p_name: row.name,
              p_phone: row.phone,
              p_email: row.email,
              p_provider_id: row.provider_id,
              p_auth_user_id: row.auth_user_id,
              p_signup_method: row.signup_method,
              p_marketing_agreed: anyMarketingAgreed,
              p_email_marketing_agreed: emailMarketingAgreed,
              p_sms_marketing_agreed: smsMarketingAgreed,
              p_terms_agreed_at: termsAgreedAt
            });
            if (!confirmError) {
              console.log('Supabase 소셜 약관회원 확정 저장 성공:', confirmLoginId || row.login_id);
              member.supabaseLoginId = confirmLoginId || row.login_id;
              return;
            }
            console.warn('Supabase 소셜 약관회원 확정 저장 실패, 기존 저장 재시도:', confirmError.message || confirmError);
          } catch (confirmException) {
            console.warn('Supabase 소셜 약관회원 확정 저장 예외, 기존 저장 재시도:', confirmException?.message || confirmException);
          }
        }

        // v23.7.252: 네이버가 관리자 상세목록에 빠지는 주원인은 서버 row에 terms_agreed_at이 비어 저장되는 경우입니다.
        // 아래 RPC와 직접 upsert 모두 약관동의 시각을 같이 보내서 카카오/네이버가 같은 기준으로 표시되게 합니다.
        // v23.7.225: GitHub Pages/휴대폰/PWA에서는 RLS 때문에 직접 upsert가 막힐 수 있습니다.
        // 그래서 security definer RPC로 먼저 저장하고, 실패할 때만 기존 직접 저장을 보조로 시도합니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          try {
            const { data: rpcSavedLoginId, error: rpcSaveError } = await supabaseApi.rpc('sitepass_upsert_member_public', {
              p_login_id: row.login_id,
              p_name: row.name,
              p_phone: row.phone,
              p_email: row.email,
              p_provider_id: row.provider_id,
              p_signup_method: row.signup_method,
              p_role: row.role,
              p_status: row.status,
              p_plan_label: row.plan_label,
              p_marketing_agreed: anyMarketingAgreed,
              p_email_marketing_agreed: emailMarketingAgreed,
              p_sms_marketing_agreed: smsMarketingAgreed,
              p_terms_agreed_at: termsAgreedAt
            });
            if (!rpcSaveError) {
              console.log('Supabase RPC 회원 저장 성공:', rpcSavedLoginId || row.login_id, 'role:', row.role);
              return;
            }
            console.warn('Supabase RPC 회원 저장 실패, 직접 저장 재시도:', rpcSaveError.message || rpcSaveError);
          } catch (rpcSaveException) {
            console.warn('Supabase RPC 회원 저장 예외, 직접 저장 재시도:', rpcSaveException?.message || rpcSaveException);
          }
        }

        const { error } = await supabaseApi.upsert('sitepass_members', row, { onConflict: 'login_id' });

        if (error) {
          console.warn('Supabase 회원 저장 실패:', error.message);
          return;
        }

        console.log('Supabase 회원 저장 성공:', row.login_id, 'role:', row.role);
      } catch (e) {
        console.warn('Supabase 회원 저장 예외:', e);
      }
    }



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
