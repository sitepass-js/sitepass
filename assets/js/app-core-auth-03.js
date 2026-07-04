// SitePass v23.7.298 - app-core-auth split continue (03/10)
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
