    async function withdrawCurrentSupabaseAuthMember(reason) {
      try {
        if (!window.sitepassSupabase || !window.sitepassSupabase.rpc) return 0;
        const { data, error } = await window.sitepassSupabase.rpc('sitepass_withdraw_current_user', {
          p_reason: reason || '회원이 직접 탈퇴했습니다.'
        });
        if (error) {
          console.warn('현재 Supabase 로그인 회원 탈퇴 RPC 실패:', error.message || error);
          return 0;
        }
        return Number(data || 0);
      } catch (e) {
        console.warn('현재 Supabase 로그인 회원 탈퇴 RPC 예외:', e?.message || e);
        return 0;
      }
    }

    async function markMemberWithdrawnInSupabase(member, reason) {
      try {
        if (!window.sitepassSupabase || !member) return 0;
        const keys = getMemberLoginKeys(member);
        if (!keys.length) return 0;

        // v23.7.216: DB에서도 확실히 withdrawn 처리합니다.
        // 기존에는 대표 login_id 1개만 upsert해서 다른 login_id 행이 다시 살아나는 문제가 있었습니다.
        try {
          const { data, error } = await window.sitepassSupabase.rpc('sitepass_force_withdraw_member', {
            p_login_keys: keys,
            p_reason: reason || 'SitePass 회원 탈퇴/강제탈퇴 처리'
          });
          if (!error) return Number(data || 0);
          console.warn('Supabase 강제탈퇴 RPC 실패, 단일 upsert로 보조 처리:', error.message);
        } catch (rpcError) {
          console.warn('Supabase 강제탈퇴 RPC 예외, 단일 upsert로 보조 처리:', rpcError?.message || rpcError);
        }

        const loginId = String(member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.id || '').trim();
        if (!loginId || isSuperAdminLoginId(loginId)) return 0;
        const row = {
          login_id: loginId,
          name: '탈퇴회원',
          phone: null,
          signup_method: normalizeSignupProviderKey(member.signupMethod || member.provider || 'withdrawn') || 'withdrawn',
          role: 'member',
          status: 'withdrawn',
          plan_type: 'withdrawn',
          plan_label: '회원탈퇴',
          plan_started_at: member.paymentStartedAt || member.createdAt || new Date().toISOString(),
          plan_ends_at: new Date().toISOString(),
          last_login_at: member.lastLoginAt || member.loggedInAt || new Date().toISOString(),
          admin_memo: reason || '회원 탈퇴/강제탈퇴 처리'
        };
        const { error } = await window.sitepassSupabase
          .from('sitepass_members')
          .upsert(row, { onConflict:'login_id' });
        if (error) console.warn('Supabase 탈퇴 상태 저장 실패:', error.message);
        return error ? 0 : 1;
      } catch (e) {
        console.warn('Supabase 탈퇴 상태 저장 예외:', e);
        return 0;
      }
    }


    async function reactivateMemberForTestInSupabase(member) {
      try {
        if (!window.sitepassSupabase || !member || !window.sitepassSupabase.rpc) return 0;
        const keys = getMemberLoginKeys(member);
        if (!keys.length) return 0;
        const { data, error } = await window.sitepassSupabase.rpc('sitepass_reactivate_member_for_test', {
          p_login_keys: keys
        });
        if (error) {
          console.warn('테스트 재가입 서버 차단해제 RPC 실패:', error.message || error);
          return 0;
        }
        return Number(data || 0);
      } catch (e) {
        console.warn('테스트 재가입 서버 차단해제 예외:', e?.message || e);
        return 0;
      }
    }

    function getMemberDisplayName(member) {
      if (!member) return '이름없음';
      if (member.isSuperAdminVirtual) return '대표이사 최고관리자';
      return member.name || member.signupId || member.providerId || member.phone || '이름없음';
    }

    function getMemberMainId(member) {
      if (!member) return '-';
      if (member.isSuperAdminVirtual) return ADMIN_ID;
      return member.signupId || member.providerId || member.id || '-';
    }

    function getMemberSocialText(member) {
      const type = getMemberSignupProviderType(member);
      if (type === 'kakao') return member?.providerId || member?.kakaoUserId || member?.supabaseLoginId || '카카오 연동';
      if (type === 'naver') return member?.providerId || member?.naverUserId || member?.supabaseLoginId || '네이버 연동';
      return '미연동';
    }

    function getMemberKakaoText(member) {
      return getMemberSocialText(member);
    }

    function getMemberStatusText(member) {
      if (member?.withdrawn) return '강제탈퇴';
      if (member?.suspended) return '정지';
      if (member?.status === '강제탈퇴') return '강제탈퇴';
      if (member?.status === '정지') return '정지';
      return member?.status || '정상';
    }

    function getMemberPlanInfo(member) {
      const now = Date.now();
      const plan = member?.paymentPlanLabel || member?.memberPlan || member?.planName || member?.paymentPlan || member?.status || '실사용베타';
      const startedAt = member?.paymentStartedAt || member?.planStartedAt || member?.createdAt || '';
      let endsAt = member?.paymentEndsAt || member?.planEndsAt || member?.trialEndsAt || '';
      if (!endsAt && member?.createdAt) endsAt = addDaysIso(member.createdAt, TRIAL_DAYS || 60);
      let remainText = '미설정';
      let remainDays = null;
      if (endsAt) {
        const diff = Math.ceil((new Date(endsAt) - new Date()) / (1000 * 60 * 60 * 24));
        remainDays = Number.isFinite(diff) ? diff : null;
        if (remainDays === null) remainText = '미설정';
        else if (remainDays < 0) remainText = '만료 ' + Math.abs(remainDays) + '일 지남';
        else if (remainDays === 0) remainText = '오늘 만료';
        else remainText = remainDays + '일 남음';
      }
      return {
        label: plan || '실사용베타',
        startedAt,
        endsAt,
        remainDays,
        remainText
      };
    }

    function isMemberPaymentDueSoon(member) {
      const info = getMemberPlanInfo(member);
      return info.remainDays !== null && info.remainDays >= 0 && info.remainDays <= 7;
    }

    function isMemberGrace14Over(member) {
      const info = getMemberPlanInfo(member);
      return info.remainDays !== null && info.remainDays <= -14;
    }


    function memberOwnsItemForDeletion(member, item) {
      if (!member || !item) return false;
      const memberIds = getMemberAdminIdentifiers(member);
      const ownerKeys = [
        item.ownerMemberId,
        item.ownerSignupId,
        item.ownerProviderId,
        item.ownerPhone,
        item.ownerName
      ].map(normalizeAdminRoleKey).filter(Boolean);
      return ownerKeys.some(key => memberIds.includes(key));
    }

    function deleteOwnedItemsForMember(member) {
      if (!member || member.isSuperAdminVirtual || isDesignatedSuperAdminMember(member)) return 0;
      const storageKeys = [STORAGE_KEY, PREV_STORAGE_KEY_7, PREV_STORAGE_KEY_6, PREV_STORAGE_KEY_5, PREV_STORAGE_KEY_4, PREV_STORAGE_KEY_3, PREV_STORAGE_KEY_2, PREV_STORAGE_KEY].filter(Boolean);
      let removedCount = 0;
      storageKeys.forEach(key => {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          if (!Array.isArray(list) || !list.length) return;
          const remained = list.filter(item => !memberOwnsItemForDeletion(member, item));
          removedCount += list.length - remained.length;
          if (remained.length) localStorage.setItem(key, JSON.stringify(remained));
          else localStorage.removeItem(key);
        } catch (e) {}
      });
      return removedCount;
    }

    function buildWithdrawCleanupPayload(member) {
      const keys = getMemberAdminIdentifiers(member).concat(getMemberLoginKeys(member)).map(normalizeAdminRoleKey).filter(Boolean);
      return {
        id: member?.id || '',
        signup_id: member?.signupId || member?.signup_id || '',
        provider_id: member?.providerId || member?.provider_id || '',
        phone: member?.phone || '',
        name: member?.name || '',
        email: member?.email || '',
        provider: member?.provider || member?.signupMethod || '',
        keys: Array.from(new Set(keys))
      };
    }


    function removeServerEquipmentCacheForMember(member) {
      try {
        const cache = getServerEquipmentCache();
        if (!Array.isArray(cache) || !cache.length) return 0;
        const remained = cache.filter(item => !memberOwnsItemForDeletion(member, item));
        const removed = cache.length - remained.length;
        if (removed > 0) setServerEquipmentCache(remained);
        return removed;
      } catch (e) { return 0; }
    }

    async function deleteOwnedServerItemsForMember(member) {
      if (!member || member.isSuperAdminVirtual || isDesignatedSuperAdminMember(member)) return { ok:true, skipped:true, equipmentDeleted:0, sharesDeleted:0 };
      const localCacheRemoved = removeServerEquipmentCacheForMember(member);
      const api = window.SitePassSupabaseApi;
      const payload = buildWithdrawCleanupPayload(member);
      let result = { ok:false, equipmentDeleted:0, sharesDeleted:0, localCacheRemoved, error:null };
      try {
        if (api && api.rpc) {
          const rpcResult = await api.rpc('sitepass_withdraw_member_cleanup', { p_member: payload });
          if (rpcResult && rpcResult.error) throw rpcResult.error;
          let data = rpcResult ? rpcResult.data : null;
          if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) {} }
          result = { ok:true, equipmentDeleted:Number(data?.equipment_deleted || data?.equipmentDeleted || 0), sharesDeleted:Number(data?.shares_deleted || data?.sharesDeleted || 0), localCacheRemoved };
        } else if (window.sitepassSupabase && window.sitepassSupabase.rpc) {
          const { data, error } = await window.sitepassSupabase.rpc('sitepass_withdraw_member_cleanup', { p_member: payload });
          if (error) throw error;
          result = { ok:true, equipmentDeleted:Number(data?.equipment_deleted || data?.equipmentDeleted || 0), sharesDeleted:Number(data?.shares_deleted || data?.sharesDeleted || 0), localCacheRemoved };
        } else {
          result = { ok:false, skipped:true, equipmentDeleted:0, sharesDeleted:0, localCacheRemoved, error:'Supabase RPC 연결 없음' };
        }
      } catch (e) {
        console.warn('회원탈퇴 장비/QR 서버정리 실패:', e);
        result = { ok:false, equipmentDeleted:0, sharesDeleted:0, localCacheRemoved, error:e };
      }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      sitePassEquipmentSyncMessage = result.ok
        ? '회원탈퇴 서버정리 완료: 장비 ' + result.equipmentDeleted + '건 / QR링크 ' + result.sharesDeleted + '건'
        : '회원탈퇴 서버정리 확인 필요: ' + (result.error?.message || result.error || '알 수 없음');
      return result;
    }
    window.deleteOwnedServerItemsForMember = deleteOwnedServerItemsForMember;

    function isAdminArchiveDeletedItem(item) {
      try {
        if (window.SitePassArchive && typeof window.SitePassArchive.isArchiveDeletedItem === 'function') {
          return window.SitePassArchive.isArchiveDeletedItem(item);
        }
        if (window.SitePassArchive && typeof window.SitePassArchive.isArchiveDeletedCode === 'function') {
          const code = item && (item.code || item.equipmentCode || item.qrCode || '');
          if (window.SitePassArchive.isArchiveDeletedCode(code)) return true;
        }
      } catch (e) {}
      if (!item) return false;
      const raw = [item.serviceStatus, item.paymentStatus, item.saveReason, item.save_reason, item.status]
        .map(v => String(v || '').toLowerCase()).join(' ');
      return !!(item.isDeleted || item.is_deleted || item.deletedAt || item.deleted_at || item.withdrawnAt || item.withdrawn_at || raw.indexOf('archive_delete') >= 0 || raw.indexOf('deleted') >= 0 || raw.indexOf('삭제') >= 0);
    }

    function filterAdminArchiveVisibleItems(items) {
      const list = Array.isArray(items) ? items : [];
      try {
        if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') {
          return window.SitePassArchive.filterArchiveVisibleItems(list);
        }
      } catch (e) {}
      return list.filter(item => !isAdminArchiveDeletedItem(item));
    }

    function getMemberEquipmentItems(member) {
      if (!member || member.isSuperAdminVirtual || member.withdrawn) return [];
      const ids = getMemberAdminIdentifiers(member);
      return filterAdminArchiveVisibleItems(getItems()).filter(item => {
        const ownerKeys = [
          item.ownerMemberId,
          item.ownerSignupId,
          item.ownerProviderId,
          item.ownerPhone,
          item.ownerName
        ].map(normalizeAdminRoleKey).filter(Boolean);
        return ownerKeys.some(key => ids.includes(key));
      });
    }


    // v23.7.284: 관리자 전체장비등록수는 “활성 회원과 연결된 장비”만 계산합니다.
    // 회원이 탈퇴했거나, 회원 행이 사라졌는데 브라우저/localStorage/서버 캐시에 장비만 남은 경우는
    // 전체장비등록수와 관리자 장비목록에서 제외합니다.
    function getEquipmentOwnerAdminKeys(item) {
      if (!item) return [];
      return [
        item.ownerMemberId,
        item.ownerSignupId,
        item.ownerProviderId,
        item.ownerPhone,
        item.ownerName,
        item.ownerPhone ? String(item.ownerPhone || '').replace(/[^0-9]/g, '') : ''
      ].map(normalizeAdminRoleKey).filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);
    }

    function getActiveEquipmentOwnerKeySet() {
      const set = new Set();
      try {
        const activeMembers = getAdminAllMemberRows().filter(member => {
          if (!member || member.withdrawn || member.isSuperAdminVirtual) return false;
          if (isDesignatedSuperAdminMember(member)) return false;
          return true;
        });
        activeMembers.forEach(member => {
          getMemberAdminIdentifiers(member).forEach(key => { if (key) set.add(key); });
        });
      } catch (e) {
        console.warn('활성 회원 장비 소유키 계산 실패:', e);
      }
      return set;
    }

    function isEquipmentOwnedByActiveMember(item, activeOwnerKeySet) {
      if (!item || item.isDeleted || item.deletedAt || item.is_deleted || isAdminArchiveDeletedItem(item)) return false;
      const ownerKeys = getEquipmentOwnerAdminKeys(item);
      if (!ownerKeys.length) return false;
      const set = activeOwnerKeySet || getActiveEquipmentOwnerKeySet();
      if (!set || !set.size) return false;
      return ownerKeys.some(key => set.has(key));
    }

    function getAdminVisibleEquipmentItems() {
      const activeOwnerKeySet = getActiveEquipmentOwnerKeySet();
      return filterAdminArchiveVisibleItems(getItems()).filter(item => isEquipmentOwnedByActiveMember(item, activeOwnerKeySet));
    }

    async function cleanupOrphanEquipmentForAdmin() {
      if (!confirm('장비/큐알 집계를 정리할까요?\n\n삭제·탈퇴·연결 누락 장비가 관리자 요약에 남아 있을 때 정리합니다.')) return;
      let serverText = '서버정리: 실행 안 됨';
      try {
        const api = window.SitePassSupabaseApi;
        if (api && api.rpc) {
          const result = await api.rpc('sitepass_cleanup_orphan_equipment', {});
          if (result?.error) throw result.error;
          const data = result?.data || {};
          serverText = '서버정리: 장비 ' + Number(data.equipment_deleted || 0) + '건 / QR ' + Number(data.shares_deleted || 0) + '건 정리';
        } else {
          serverText = '서버정리: Supabase RPC 연결 없음';
        }
      } catch (e) {
        serverText = '서버정리 실패: ' + (e?.message || e);
      }

      try {
        setServerEquipmentCache([]);
        await syncSupabaseEquipmentItems(true);
      } catch (e) {}
      try { renderAdmin(); } catch (e) {}
      alert(serverText + '\n\n화면 집계는 활성 회원과 연결된 장비만 다시 계산했습니다.');
    }

    function getItemOwnerText(item) {
      const parts = [
        item?.ownerName,
        item?.ownerSignupId,
        item?.ownerProviderId,
        item?.ownerPhone
      ].filter(Boolean);
      if (parts.length) return parts.join(' / ');
      return '소유회원 미지정';
    }

    function renderMemberEquipmentList(member) {
      const items = getMemberEquipmentItems(member);
      if (!items.length) {
        return '<div class="notice">이 회원과 연결된 장비서류가 아직 없습니다.<br><span class="small">이전 버전에서 등록한 서류는 회원정보가 저장되지 않아 소유회원 미지정으로 보일 수 있습니다. 새로 저장하는 장비서류부터 회원과 자동 연결됩니다.</span></div>';
      }
      const rows = items.map(item => {
        const warningCount = Object.values(item.docs || {}).reduce((acc, doc) => {
          const status = doc.status || getDocStatus(doc);
          if (status === '만료임박') acc.expiring += 1;
          if (status === '만료') acc.expired += 1;
          return acc;
        }, { expiring:0, expired:0 });
        return '<div class="list-item" style="box-shadow:none;margin-top:8px;">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(getItemTitle(item)) + '</strong><div class="small">통합코드: ' + escapeHtml(item.code || '') + '<br>포함서류: ' + escapeHtml(getIncludedGroupText(item)) + '</div></div><span class="badge done">장비서류</span></div>' +
          '<div class="admin-member-summary">' +
            '<span><b>보험/검사 상태</b>만료임박 ' + warningCount.expiring + '건 · 만료 ' + warningCount.expired + '건</span>' +
            '<span><b>담당자 링크</b>' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</span>' +
          '</div>' +
          '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code || '') + '\')">서류 상세보기</button><button class="primary" onclick="openAdminQrLink(\'' + escapeJs(item.code || '') + '\')">큐알링크</button><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 알림</button></div>' +
        '</div>';
      }).join('');
      return '<div class="admin-member-detail" style="margin-top:12px;"><h4 style="margin:0 0 8px;">이 회원의 장비서류</h4>' + rows + '</div>';
    }

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
