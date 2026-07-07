// SitePass v23.7.331 - speed optimized medium chunk (app-admin-boot-speed 02/03)
// ---- merged from app-admin-boot-06.js ----
// SitePass v23.7.331 - app-admin-boot finer split (06/14)
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

// ---- merged from app-admin-boot-07.js ----
// SitePass v23.7.331 - app-admin-boot finer split (07/14)
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

// ---- merged from app-admin-boot-08.js ----
// SitePass v23.7.331 - app-admin-boot finer split (08/14)
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

// ---- merged from app-admin-boot-09.js ----
// SitePass v23.7.331 - app-admin-boot finer split (09/14)
function getAdminMembersModule() {
      return window.SitePassAdminMembers || {};
    }

    function isAdminAccountMember(member) {
      const mod = getAdminMembersModule();
      return mod.isAdminAccountMember ? mod.isAdminAccountMember(member) : false;
    }

    function getAdminMemberCounts(activeMembers, withdrawnMembers) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberCounts ? mod.getAdminMemberCounts(activeMembers, withdrawnMembers) : {};
    }

    function getAdminFolderLabel(key) {
      const mod = getAdminMembersModule();
      return mod.getAdminFolderLabel ? mod.getAdminFolderLabel(key) : '전체회원';
    }


    function filterAdminMembersByFolder(member, folder) {
      const mod = getAdminMembersModule();
      return mod.filterAdminMembersByFolder ? mod.filterAdminMembersByFolder(member, folder) : true;
    }

    function adminMemberMatchesSearch(member, q) {
      const mod = getAdminMembersModule();
      return mod.adminMemberMatchesSearch ? mod.adminMemberMatchesSearch(member, q) : true;
    }

    function setAdminMemberFolder(folder) {
      const mod = getAdminMembersModule();
      if (mod.setAdminMemberFolder) return mod.setAdminMemberFolder(folder);
    }

    function startAdminMemberSearchComposition() {
      const mod = getAdminMembersModule();
      if (mod.startAdminMemberSearchComposition) return mod.startAdminMemberSearchComposition();
    }

    function handleAdminMemberSearchInput(input) {
      const mod = getAdminMembersModule();
      if (mod.handleAdminMemberSearchInput) return mod.handleAdminMemberSearchInput(input);
    }

    function finishAdminMemberSearchComposition(input) {
      const mod = getAdminMembersModule();
      if (mod.finishAdminMemberSearchComposition) return mod.finishAdminMemberSearchComposition(input);
    }

    function setAdminMemberSearch(value) {
      const mod = getAdminMembersModule();
      if (mod.setAdminMemberSearch) return mod.setAdminMemberSearch(value);
    }

    function applyAdminMemberSearch() {
      const mod = getAdminMembersModule();
      if (mod.applyAdminMemberSearch) return mod.applyAdminMemberSearch();
    }

    function clearAdminMemberSearch() {
      const mod = getAdminMembersModule();
      if (mod.clearAdminMemberSearch) return mod.clearAdminMemberSearch();
    }

    function changeAdminMemberPage(delta) {
      const mod = getAdminMembersModule();
      if (mod.changeAdminMemberPage) return mod.changeAdminMemberPage(delta);
    }

    function getAdminMemberActionId(member) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberActionId ? mod.getAdminMemberActionId(member) : '';
    }

    function getAdminMemberActionTokens(member) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberActionTokens ? mod.getAdminMemberActionTokens(member) : [];
    }

    function isSameAdminActionMember(member, memberId) {
      const mod = getAdminMembersModule();
      return mod.isSameAdminActionMember ? mod.isSameAdminActionMember(member, memberId) : false;
    }

    function renderAdminStaffManager(members) {
      const mod = getAdminMembersModule();
      if (mod.renderAdminStaffManager) return mod.renderAdminStaffManager(members);
      return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 회원목록 파일을 불러오지 못했습니다. assets/js/admin-members.js 업로드를 확인해주세요.</div></div>';
    }

    // v23.7.257: 관리자 상세관리/결제/탈퇴 조작 함수는 assets/js/admin-detail.js로 분리했습니다.

    function getAdminPaymentActionMembers(activeMembers, type) {
      return activeMembers.filter(member => {
        if (member.withdrawn || member.isSuperAdminVirtual) return false;
        const status = String(member.paymentStatus || member.status || '');
        if (type === 'newPay') return status.includes('신규결제');
        if (type === 'extensionPay') return status.includes('연장결제');
        if (type === 'refundRequest') return member.refundRequestPending || status.includes('환불요청');
        return false;
      });
    }

    function renderAdminPaymentStatusCard(title, folder, list, emptyText) {
      const names = list.length
        ? list.slice(0, 6).map(member => {
            const time = folder === 'refundRequest' ? member.refundRequestedAt : member.adminLastActionAt;
            return '· ' + escapeHtml(getMemberDisplayName(member)) + ' / ' + escapeHtml(getMemberMainId(member)) + (time ? ' / ' + escapeHtml(formatNullableDateTime(time)) : '');
          }).join('<br>')
        : '<span class="small">' + escapeHtml(emptyText || '해당 회원이 없습니다.') + '</span>';
      return '<div class="admin-payment-status-card">' +
        '<strong>' + escapeHtml(title) + '<span class="badge need">' + list.length + '명</span></strong>' +
        '<div class="small">' + names + '</div>' +
        '<div class="actions"><button class="ghost" onclick="setAdminMemberFolder(\'' + escapeJs(folder) + '\')">목록 보기</button></div>' +
      '</div>';
    }

    function renderAdminPaymentStatusBoard(activeMembers) {
      const newPayList = getAdminPaymentActionMembers(activeMembers, 'newPay');
      const extensionList = getAdminPaymentActionMembers(activeMembers, 'extensionPay');
      const refundRequestList = getAdminPaymentActionMembers(activeMembers, 'refundRequest');
      return '<div class="admin-payment-status-board">' +
        renderAdminPaymentStatusCard('신규결제 확인', 'newPay', newPayList, '신규결제 처리 회원 없음') +
        renderAdminPaymentStatusCard('연장결제 확인', 'extensionPay', extensionList, '연장결제 처리 회원 없음') +
        renderAdminPaymentStatusCard('환불요청 확인', 'refundRequest', refundRequestList, '환불요청 회원 없음') +
      '</div>';
    }

    function renderAdminCreateAccountPanel() {
      if (!isSuperAdminLoggedIn()) return '';
      return '<div class="admin-payment-section" style="margin-top:14px;">' +
        '<span class="admin-payment-section-title">관리자 아이디 만들기</span>' +
        '<div class="notice blue-note">이 창은 최고관리자모드에서만 보입니다. 최고관리자가 만든 직원 계정은 모두 <b>관리자</b>로 접속하며, 운영관리자/조회관리자 구분은 사용하지 않습니다. 최고관리자는 <b>' + escapeHtml(ADMIN_ID) + '</b> 1개로 고정합니다.</div>' +
        '<div class="admin-payment-input-grid">' +
          '<input id="newAdminLoginId" type="text" placeholder="관리자 아이디 또는 이메일" autocomplete="off" />' +
          '<input id="newAdminName" type="text" placeholder="관리자 이름/표시명" autocomplete="off" />' +
          '<input id="newAdminPhone" type="tel" placeholder="휴대폰번호 선택" autocomplete="off" />' +
          '<input id="newAdminPassword" type="password" placeholder="임시 비밀번호 6자 이상" autocomplete="new-password" />' +
          '<input id="newAdminPassword2" type="password" placeholder="임시 비밀번호 확인" autocomplete="new-password" />' +
        '</div>' +
        '<div class="actions"><button class="primary" onclick="createAdminAccountBySuper()">관리자 아이디 만들기</button><button class="ghost" onclick="clearNewAdminAccountForm()">입력 초기화</button></div>' +
        '<div class="small">직원 관리자는 일반 로그인 화면에서 만든 아이디와 임시 비밀번호로 접속합니다. 일반 관리자모드에는 이 생성창이 보이지 않습니다.</div>' +
      '</div>';
    }

    function clearNewAdminAccountForm() {
      ['newAdminLoginId','newAdminName','newAdminPhone','newAdminPassword','newAdminPassword2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }

    function createAdminAccountBySuper() {
      if (!isSuperAdminLoggedIn()) {
        alert('관리자 아이디 생성은 최고관리자만 가능합니다.');
        return;
      }
      const loginId = normalizeLoginText(document.getElementById('newAdminLoginId')?.value || '');
      const name = normalizeLoginText(document.getElementById('newAdminName')?.value || '') || loginId;
      const phone = normalizeLoginText(document.getElementById('newAdminPhone')?.value || '');
      const role = '관리자';
      const pw = normalizeLoginText(document.getElementById('newAdminPassword')?.value || '');
      const pw2 = normalizeLoginText(document.getElementById('newAdminPassword2')?.value || '');

      if (!loginId) { alert('관리자 아이디를 입력해주세요.'); return; }
      if (isSuperAdminLoginId(loginId)) { alert('최고관리자 아이디는 이미 고정되어 있습니다. 직원 관리자 아이디로는 사용할 수 없습니다.'); return; }
      if (!pw || pw.length < 6) { alert('임시 비밀번호는 6자 이상으로 입력해주세요.'); return; }
      if (pw !== pw2) { alert('비밀번호 확인이 맞지 않습니다.'); return; }

      const existing = findMemberForLogin(loginId);
      if (existing && !confirm('이미 같은 아이디/휴대폰으로 등록된 회원이 있습니다.\n이 회원을 관리자로 지정하고 비밀번호를 새로 설정할까요?')) return;

      const nowIso = new Date().toISOString();
      let member = existing || {
        id:'ADM-' + Date.now(),
        createdAt:nowIso,
        status:'관리자계정',
        paymentPlanLabel:'관리자계정',
        memberPlan:'관리자계정',
        paymentStartedAt:nowIso,
        paymentEndsAt:addDaysIso(nowIso, 3650)
      };
      member.name = name;
      member.phone = phone;
      member.signupId = loginId;
      member.provider = 'SitePass';
      member.providerId = 'SITEPASS-LOGIN-' + loginId;
      member.signupMethod = '최고관리자 생성 관리자';
      member.testPassword = pw;
      member.passwordSet = true;
      member.adminRole = role;
      member.adminRoleUpdatedAt = nowIso;
      member.adminRoleUpdatedBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
      member.adminCreatedBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
      member.adminCreatedAt = member.adminCreatedAt || nowIso;
      member.adminLastAction = existing ? '관리자 권한/비밀번호 재설정' : '관리자 아이디 생성';
      member.adminLastActionAt = nowIso;
      member.suspended = false;
      member.withdrawn = false;

      saveMemberTest(member);
      syncMemberAdminRoleMap(findMemberForLogin(loginId) || member, role);
      clearNewAdminAccountForm();
      alert('관리자 아이디를 만들었습니다.\n\n아이디: ' + loginId + '\n이제 일반 로그인 화면에서 이 아이디와 임시 비밀번호로 접속할 수 있습니다.');
      renderAdmin();
    }

// ---- merged from app-admin-boot-10.js ----
// SitePass v23.7.331 - app-admin-boot finer split (10/14)
function renderAdminStaffManager(members) {
      if (!isSuperAdminLoggedIn()) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 지정/권한변경/해제, 회원 강제탈퇴, 무료권 지급은 최고관리자만 가능합니다.</div></div>';
      }

      const withdrawnMembers = getVisibleWithdrawnMembers().map(item => ({ ...item, withdrawn:true, status:'강제탈퇴' }));
      const activeMembers = dedupeAdminMembersForDisplay(getAdminAllMemberRows());
      const counts = getAdminMemberCounts(activeMembers, withdrawnMembers);
      const folders = ['super','admin','all','normal','newSignup','monthly','due','grace14','suspended','newPay','extensionPay','refundRequest','refund','withdrawn'];
      const folderButtons = folders.map(key =>
        '<button type="button" class="' + (adminMemberFolder === key ? 'active' : '') + '" onclick="setAdminMemberFolder(\'' + escapeJs(key) + '\')">' +
          escapeHtml(getAdminFolderLabel(key)) + ' ' + (counts[key] || 0) +
        '</button>'
      ).join('');

      const source = adminMemberFolder === 'withdrawn' ? withdrawnMembers : activeMembers;
      let filtered = source.filter(member => filterAdminMembersByFolder(member, adminMemberFolder)).filter(member => adminMemberMatchesSearch(member, adminMemberSearchText));
      const pageSize = 20;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (adminMemberPage >= totalPages) adminMemberPage = totalPages - 1;
      const pageItems = filtered.slice(adminMemberPage * pageSize, adminMemberPage * pageSize + pageSize);

      const summary = '<div class="admin-summary-rows">' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>전체회원</b><span>' + counts.all + '명</span></div>' +
          '<div class="line"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +
          '<div class="line"><b>관리자</b><span>' + ((counts.super || 0) + (counts.admin || 0)) + '명</span></div>' +
          '<div class="line"><b>강제탈퇴</b><span>' + counts.withdrawn + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>1개월권</b><span>' + counts.monthly + '명</span></div>' +
          '<div class="line"><b>만료예정</b><span>' + counts.due + '명</span></div>' +
          '<div class="line"><b>유예14일 이상</b><span>' + counts.grace14 + '명</span></div>' +
          '<div class="line"><b>정지회원</b><span>' + counts.suspended + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>신규결제</b><span>' + counts.newPay + '명</span></div>' +
          '<div class="line"><b>연장결제</b><span>' + counts.extensionPay + '명</span></div>' +
          '<div class="line"><b>환불요청</b><span>' + counts.refundRequest + '명</span></div>' +
          '<div class="line"><b>환불처리</b><span>' + counts.refund + '명</span></div>' +
        '</div>' +
      '</div>';

      const rows = pageItems.map(member => {
        const name = getMemberDisplayName(member);
        const role = member.withdrawn ? '강제탈퇴' : (['운영관리자','조회관리자'].includes(member.adminRole) ? '관리자' : (member.adminRole || '일반회원'));
        const plan = getMemberPlanInfo(member);
        const eqCount = getMemberEquipmentCount(member);
        const status = getMemberStatusText(member);
        const roleBadge = '<span class="badge ' + getAdminRoleBadgeClass(role) + '">' + escapeHtml(role) + '</span>';
        const idText = getMemberMainId(member);
        const actionId = getAdminMemberActionId(member);
        const detailOpen = adminExpandedMemberId === actionId;
        const quickRoleButtons = '';
        return '<div class="admin-member-row">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + ' · ' + escapeHtml(member.signupMethod || member.provider || '일반회원') + '</div></div>' + roleBadge + '</div>' +
          '<div class="admin-member-summary">' +
            '<span><b>휴대폰</b>' + escapeHtml(member.phone || '-') + '</span>' +
            '<span><b>소셜계정</b>' + escapeHtml(getMemberSocialText(member)) + '</span>' +
            '<span><b>결제여부</b>' + escapeHtml(plan.label || '-') + '</span>' +
            '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
            '<span><b>장비등록</b>' + eqCount + '대</span>' +
            '<span><b>회원상태</b>' + escapeHtml(status) + '</span>' +
            '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="ghost" onclick="toggleAdminMemberDetail(\'' + escapeJs(actionId) + '\')">' + (detailOpen ? '상세닫기' : '상세관리') + '</button>' +
            quickRoleButtons +
          '</div>' +
          (detailOpen ? renderAdminMemberDetail(member) : '') +
        '</div>';
      }).join('') || '<div class="empty">조건에 맞는 회원이 없습니다.</div>';

      const pager = '<div class="admin-pager">' +
        '<button class="ghost" onclick="changeAdminMemberPage(-1)" ' + (adminMemberPage <= 0 ? 'disabled' : '') + '>이전 20명</button>' +
        '<span class="small">' + (adminMemberPage + 1) + ' / ' + totalPages + ' 페이지 · 검색결과 ' + filtered.length + '명</span>' +
        '<button class="ghost" onclick="changeAdminMemberPage(1)" ' + (adminMemberPage >= totalPages - 1 ? 'disabled' : '') + '>다음 20명</button>' +
      '</div>';

      return '<div class="card" style="box-shadow:none;margin-top:14px;">' +
        '<h3>약관동의 회원 상세정보 / 관리자관리</h3>' +
        '<div class="notice blue-note">관리자 화면은 Table Editor 원본 행 수를 그대로 보여주지 않고, 약관동의 완료 후 active 상태인 실제 회원만 상세정보에 표시합니다. 로그인만 했거나 중복으로 남은 카카오/네이버 행은 회원목록 숫자에 넣지 않습니다. 카카오/네이버/사이트 약관회원, 오늘 가입, 탈퇴 누계를 따로 표시하고, 탈퇴회원은 현재 회원수에서 제외합니다.</div>' +
        '<div class="actions" style="margin:8px 0 10px;"><button type="button" class="primary" onclick="syncSupabaseMembersForAdmin(true)" ' + (adminSupabaseMemberSyncing ? 'disabled' : '') + '>' + (adminSupabaseMemberSyncing ? '회원목록 불러오는 중' : '약관회원/가입통계 새로고침') + '</button><span class="small">' + escapeHtml(adminSupabaseMemberSyncMessage || (adminSupabaseMemberSyncedAt ? '마지막 동기화: ' + formatNullableDateTime(new Date(adminSupabaseMemberSyncedAt).toISOString()) : '관리자 화면 진입 시 약관동의 active 회원을 확인합니다.')) + '</span></div>' +
        renderAdminSignupMethodBoard(activeMembers) +
        summary +
        renderAdminPaymentStatusBoard(activeMembers) +
        renderAdminCreateAccountPanel() +
        '<div class="admin-member-toolbar"><div><input id="adminMemberSearchInput" type="text" placeholder="이름 / 아이디 / 휴대폰번호 / 카카오·네이버계정 검색" value="' + escapeHtml(adminMemberSearchText || '') + '" oncompositionstart="adminMemberSearchComposing=true" oncompositionend="finishAdminMemberSearchComposition(this)" oninput="handleAdminMemberSearchInput(this)" onkeydown="if(event.key===\'Enter\' && !adminMemberSearchComposing){applyAdminMemberSearch();}" /></div><div class="actions admin-search-actions"><button type="button" class="primary" onclick="applyAdminMemberSearch()">검색</button><button type="button" class="ghost" onclick="clearAdminMemberSearch()">초기화</button></div><div class="small">현재 폴더: <b>' + escapeHtml(getAdminFolderLabel(adminMemberFolder)) + '</b></div></div>' +
        '<div class="admin-folder-tabs">' + folderButtons + '</div>' +
        rows + pager +
      '</div>';
    }

