// SitePass v23.7.735R6 STEP90 - 관리자 상세관리 / 장비별 무료 1개월권 v2 연결
// 이 파일에는 관리자 상세관리 열기/닫기, 결제처리, 무료권, 정지, 메모, 관리자권한, 강제탈퇴 기능을 둡니다.
// 주의: app.bundle.js보다 먼저 불러와야 하며, app.bundle.js의 SitePassAdminRuntime 브리지와 공통 helper 함수를 사용합니다.
(function(){
  'use strict';
  const STORAGE_KEY = 'sitePass_v23_7_7_update_original_corrected';
  const ADMIN_SESSION_KEY = STORAGE_KEY + '_admin_session';
  const CURRENT_MEMBER_KEY = STORAGE_KEY + '_currentMember';
  const ADMIN_ID = 'sitepass@kakao.com';
  const SUPER_ADMIN_ROLE_NAME = '최고관리자';

  function getAdminDetailRuntime() {
    return window.SitePassAdminRuntime || {};
  }

  function getAdminDetailExpandedMemberId() {
    const runtime = getAdminDetailRuntime();
    return runtime.getExpandedMemberId ? runtime.getExpandedMemberId() : '';
  }

  function setAdminDetailExpandedMemberId(value) {
    const runtime = getAdminDetailRuntime();
    if (runtime.setExpandedMemberId) runtime.setExpandedMemberId(value);
  }

  function getAdminDetailServerMemberRows() {
    const runtime = getAdminDetailRuntime();
    return runtime.getServerMemberRows ? runtime.getServerMemberRows() : [];
  }

  function setAdminDetailServerMemberRows(rows) {
    const runtime = getAdminDetailRuntime();
    if (runtime.setServerMemberRows) runtime.setServerMemberRows(rows);
  }

  function toggleAdminMemberDetail(memberId) {
    const key = String(memberId || '');
    setAdminDetailExpandedMemberId(getAdminDetailExpandedMemberId() === key ? '' : key);
    renderAdmin();
  }

  function formatShortDate(value) {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '-';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    } catch (e) {
      return '-';
    }
  }

  function formatNullableDateTime(value) {
    if (!value) return '접속기록 없음';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '접속기록 없음';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    } catch (e) {
      return '접속기록 없음';
    }
  }

  function updateMemberLastLogin(memberOrLoginId, method) {
    const members = ensureMemberIds();
    const q = typeof memberOrLoginId === 'string' ? normalizeAdminRoleKey(memberOrLoginId) : '';
    const targetKeys = typeof memberOrLoginId === 'object' ? getMemberAdminIdentifiers(memberOrLoginId) : [];
    const target = members.find(member => {
      const keys = getMemberAdminIdentifiers(member);
      return (memberOrLoginId?.id && member.id === memberOrLoginId.id) ||
        (q && keys.includes(q)) ||
        targetKeys.some(key => keys.includes(key));
    });
    if (!target) return memberOrLoginId;
    target.lastLoginAt = new Date().toISOString();
    target.lastLoginMethod = method || target.signupMethod || target.provider || '로그인';
    setMembers(members);
    return target;
  }


  function getAdminEditableMember(memberId) {
    let members = ensureMemberIds();
    let target = members.find(member => isSameAdminActionMember(member, memberId));
    if (!target) {
      const displayTarget = getAdminAllMemberRows().find(member => isSameAdminActionMember(member, memberId));
      if (displayTarget && !displayTarget.isSuperAdminVirtual) {
        // 서버에서만 보이는 카카오/네이버 회원도 상세관리 버튼을 누르는 순간
        // 로컬 관리대상으로 한 번 저장해서 무료권/정지/메모/탈퇴 버튼이 동작하게 합니다.
        target = saveMemberTest({
          ...displayTarget,
          id:getAdminMemberActionId(displayTarget),
          status:displayTarget.status || '정상'
        });
        members = ensureMemberIds();
      }
    }
    return { members, target };
  }

  function readAdminPaymentInputs(memberId) {
    return {
      amount:(document.getElementById('payAmount_' + memberId)?.value || '').trim(),
      memo:(document.getElementById('payMemo_' + memberId)?.value || '').trim()
    };
  }

  function addMemberPaymentHistory(member, action, memo, amount) {
    if (!member) return;
    member.paymentHistory = Array.isArray(member.paymentHistory) ? member.paymentHistory : [];
    member.paymentHistory.unshift({
      at:new Date().toISOString(),
      action,
      amount:amount || '',
      memo:memo || '',
      by:getSessionValue(ADMIN_SESSION_KEY + '_id') || SUPER_ADMIN_ROLE_NAME
    });
    member.paymentHistory = member.paymentHistory.slice(0, 30);
  }

  function memberOwnsItemForPayment(member, item) {
    if (!member || !item) return false;
    const memberPhone = String(member.phone || '').replace(/[^0-9]/g, '');
    const itemPhone = String(item.ownerPhone || '').replace(/[^0-9]/g, '');
    return (member.id && item.ownerMemberId === member.id) ||
      (member.signupId && item.ownerSignupId === member.signupId) ||
      (member.providerId && item.ownerProviderId === member.providerId) ||
      (memberPhone && itemPhone && memberPhone === itemPhone);
  }

  function applyMemberPaymentToOwnedItems(member, planKey, days, planText) {
    if (!member) return 0;
    const info = getPlanInfo(planKey || 'annual');
    const now = new Date();
    const freshManagerExpireAt = new Date(getSevenDaysFromNowMs()).toISOString();
    let changed = 0;
    const items = getItems();
    items.forEach(item => {
      if (!memberOwnsItemForPayment(member, item)) return;
      const currentEnd = item.trialEndsAt ? new Date(item.trialEndsAt) : now;
      const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const newEnd = addDaysIso(base.toISOString(), days || info.days || 30);
      item.serviceStatus = '유료사용';
      item.paymentPlan = info.key || planKey || 'annual';
      item.basicPlan = planText || info.planText || '일반 연간결제';
      item.alertPlan = item.alertPlan || '보험·검사 만료 알림 포함 준비';
      item.paidAt = now.toISOString();
      item.trialEndsAt = newEnd;
      item.managerExpireAt = freshManagerExpireAt;
      item.updatedAt = now.toISOString();
      if (item.paymentConversionTest) item.paymentTestPaid = true;
      if (item.bundleMeta) item.bundleMeta.paymentText = (planText || info.planText || '일반 연간결제') + ' 결제완료';
      changed += 1;
    });
    if (changed) setItems(items);
    return changed;
  }

  function pauseOwnedItemsAfterMemberRefund(member) {
    if (!member) return 0;
    const nowIso = new Date().toISOString();
    let changed = 0;
    const items = getItems();
    items.forEach(item => {
      if (!memberOwnsItemForPayment(member, item)) return;
      item.serviceStatus = '환불처리';
      item.paymentPlan = 'refund';
      item.basicPlan = '환불처리 / QR 일시정지';
      item.trialEndsAt = nowIso;
      item.managerExpireAt = nowIso;
      item.updatedAt = nowIso;
      if (item.paymentConversionTest) item.paymentTestPaid = false;
      if (item.bundleMeta) item.bundleMeta.paymentText = '환불처리 / QR 일시정지';
      changed += 1;
    });
    if (changed) setItems(items);
    return changed;
  }

  function processMemberNewPayment(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('신규결제 처리는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
    const input = readAdminPaymentInputs(memberId);
    if (!confirm((target.name || target.signupId || '회원') + '님을 일반 연간결제(30,000원 / 1년)로 처리할까요?')) return;
    const nowIso = new Date().toISOString();
    target.paymentPlanLabel = '일반 연간이용권';
    target.memberPlan = '일반 연간이용권';
    target.paymentStartedAt = nowIso;
    target.paymentEndsAt = addDaysIso(nowIso, 365);
    target.paymentStatus = '신규결제완료';
    target.paymentAmount = input.amount || target.paymentAmount || '30000';
    target.paymentMemo = input.memo || '';
    target.status = '일반 연간결제';
    target.adminLastAction = '일반 연간결제 처리';
    target.adminLastActionAt = nowIso;
    addMemberPaymentHistory(target, '신규결제', input.memo || '일반 연간이용권 30,000원 결제완료 처리', input.amount || '30000');
    const activatedCount = applyMemberPaymentToOwnedItems(target, 'annual', 365, '일반 연간결제 · 연 30,000원');
    setMembers(members);
    alert('신규결제 처리했습니다. 남은기간은 1년으로 표시됩니다.' + (activatedCount ? '\n연결된 장비서류 ' + activatedCount + '건의 QR·링크도 다시 활성화했습니다.' : ''));
    renderAdmin();
  }

  function processMemberPaymentExtension(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('연장결제 처리는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
    const input = readAdminPaymentInputs(memberId);
    if (!confirm((target.name || target.signupId || '회원') + '님의 결제기간을 일반 연간결제로 1년 연장할까요?')) return;
    const now = new Date();
    const currentEnd = target.paymentEndsAt ? new Date(target.paymentEndsAt) : null;
    const base = currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > now ? currentEnd : now;
    const newEnd = new Date(base.getTime());
    newEnd.setDate(newEnd.getDate() + 365);
    const nowIso = now.toISOString();
    target.paymentPlanLabel = '일반 연간이용권';
    target.memberPlan = '일반 연간이용권';
    target.paymentStartedAt = target.paymentStartedAt || nowIso;
    target.paymentEndsAt = newEnd.toISOString();
    target.paymentStatus = '연장결제완료';
    target.paymentAmount = input.amount || target.paymentAmount || '';
    target.paymentMemo = input.memo || '';
    target.status = '일반 연간 연장결제';
    target.adminLastAction = '일반 연간 연장결제 처리';
    target.adminLastActionAt = nowIso;
    addMemberPaymentHistory(target, '연장결제', input.memo || '기존 만료일 기준 또는 오늘 기준 1년 연장', input.amount || '30000');
    const activatedCount = applyMemberPaymentToOwnedItems(target, 'annual', 365, '일반 연간결제 · 연 30,000원');
    setMembers(members);
    alert('연장결제 처리했습니다. 만료일이 1년 연장되었습니다.' + (activatedCount ? '\n연결된 장비서류 ' + activatedCount + '건의 QR·링크도 다시 활성화했습니다.' : ''));
    renderAdmin();
  }

  function requestMemberRefund(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('환불요청 등록은 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
    const input = readAdminPaymentInputs(memberId);
    if (!confirm((target.name || target.signupId || '회원') + '님의 환불요청을 등록할까요?')) return;
    const nowIso = new Date().toISOString();
    target.refundRequestPending = true;
    target.refundRequestedAt = nowIso;
    target.refundRequestMemo = input.memo || '환불요청';
    target.paymentStatus = '환불요청';
    target.adminLastAction = '환불요청 등록';
    target.adminLastActionAt = nowIso;
    addMemberPaymentHistory(target, '환불요청', input.memo || '환불요청 등록', input.amount || target.paymentAmount || '');
    setMembers(members);
    alert('환불요청으로 등록했습니다. 환불요청 폴더에서 확인할 수 있습니다.');
    renderAdmin();
  }

  function processMemberRefund(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('환불처리는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
    const input = readAdminPaymentInputs(memberId);
    if (!confirm((target.name || target.signupId || '회원') + '님을 환불처리할까요?')) return;
    if (!confirm('환불처리하면 결제상태가 환불처리로 표시되고 남은기간은 만료로 처리됩니다. 계속할까요?')) return;
    const nowIso = new Date().toISOString();
    target.refundRequestPending = false;
    target.refundProcessedAt = nowIso;
    target.paymentStatus = '환불처리';
    target.paymentPlanLabel = '환불처리';
    target.memberPlan = '환불처리';
    target.paymentRefundedAt = nowIso;
    target.paymentEndsAt = nowIso;
    target.paymentRefundReason = input.memo || '관리자 환불처리';
    target.status = '환불처리';
    target.adminLastAction = '환불처리';
    target.adminLastActionAt = nowIso;
    addMemberPaymentHistory(target, '환불처리', input.memo || '관리자 환불처리', input.amount || target.paymentAmount || '');
    const pausedCount = pauseOwnedItemsAfterMemberRefund(target);
    setMembers(members);
    alert('환불처리했습니다.' + (pausedCount ? '\n연결된 장비서류 ' + pausedCount + '건의 QR·링크도 일시정지했습니다.' : ''));
    renderAdmin();
  }

  function renderAdminPaymentWindow(member) {
    const actionId = getAdminMemberActionId(member);
    const refundDone = !!(member.refundProcessedAt || member.paymentRefundedAt || String(member.paymentStatus || member.status || '').includes('환불처리'));
    const refundDoneAt = member.refundProcessedAt || member.paymentRefundedAt || '';
    const refundDoneText = refundDone ? ('처리완료' + (refundDoneAt ? ' · ' + formatNullableDateTime(refundDoneAt) : '')) : '미처리';
    const history = Array.isArray(member.paymentHistory) && member.paymentHistory.length
      ? member.paymentHistory.slice(0, 5).map(row => '<div class="small">· ' + escapeHtml(formatNullableDateTime(row.at)) + ' ' + escapeHtml(row.action || '') + (row.amount ? ' · 금액 ' + escapeHtml(row.amount) : '') + (row.memo ? ' · ' + escapeHtml(row.memo) : '') + '</div>').join('')
      : '<div class="small">결제 처리 이력이 없습니다.</div>';
    return '<div class="admin-payment-window">' +
      '<h4>결제처리 창</h4>' +
      '<div class="admin-payment-section">' +
        '<span class="admin-payment-section-title">1. 현재 결제상태</span>' +
        '<div class="admin-payment-current">' +
          '<span><b>현재상태</b>' + escapeHtml(member.paymentStatus || member.status || '-') + '</span>' +
          '<span><b>요금제</b>' + escapeHtml(plan.label || '-') + '</span>' +
          '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
          '<span><b>환불요청</b>' + escapeHtml(member.refundRequestPending ? ('요청됨 · ' + formatNullableDateTime(member.refundRequestedAt)) : '없음') + '</span>' +
          '<span><b>환불처리확인</b>' + escapeHtml(refundDoneText) + '</span>' +
          '<button class="dangerBtn" onclick="processMemberRefund(\'' + escapeJs(actionId) + '\')">환불처리</button>' +
        '</div>' +
      '</div>' +
      '<div class="admin-payment-section">' +
        '<span class="admin-payment-section-title">2. 처리 이력</span>' +
        history +
        '<div class="notice blue-note" style="margin-top:10px;">환불요청 상태를 확인한 뒤 바로 환불처리할 수 있습니다. 처리하면 결제상태와 처리이력에 환불처리로 남습니다.</div>' +
      '</div>' +
    '</div>';
  }

  async function grantEquipmentFreeMonthFromMemberDetail(memberId, equipmentId, equipmentNo, button) {
    if (!isSuperAdminLoggedIn()) {
      alert('무료 1개월권 지급은 최고관리자만 가능합니다.');
      return;
    }

    const cleanEquipmentId = String(equipmentId || '').trim();
    const cleanEquipmentNo = String(equipmentNo || '').trim() || '선택 장비';
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(cleanEquipmentId)) {
      alert('장비의 서버 equipment_id를 확인하지 못했습니다. 무료권을 지급하지 않았습니다.');
      return;
    }

    const displayMember = getAdminAllMemberRows().find(member => isSameAdminActionMember(member, memberId));
    if (!displayMember) {
      alert('회원 상세정보를 찾지 못했습니다. 무료권을 지급하지 않았습니다.');
      return;
    }

    const membersApi = window.SitePassAdminMembersApi || null;
    if (!membersApi || typeof membersApi.getForMember !== 'function') {
      alert('회원의 서버 UUID를 확인할 수 없습니다. 무료권을 지급하지 않았습니다.');
      return;
    }

    let serverMember = null;
    try {
      serverMember = membersApi.getForMember(displayMember);
      if ((!serverMember || serverMember.found !== true || !serverMember.memberId) &&
          typeof membersApi.refresh === 'function') {
        await membersApi.refresh(true);
        serverMember = membersApi.getForMember(displayMember);
      }
    } catch (e) {
      alert('회원 서버정보 확인에 실패했습니다.\n' + (e?.message || e));
      return;
    }

    const expectedOwnerMemberUuid = String(serverMember?.memberId || '').trim();
    if (!uuidPattern.test(expectedOwnerMemberUuid)) {
      alert('회원의 실제 서버 member UUID를 확인하지 못했습니다. 무료권을 지급하지 않았습니다.');
      return;
    }

    if (!confirm(cleanEquipmentNo + ' 장비에 무료 1개월권을 지급할까요?\n\n이 회원이 실제 소유한 선택 장비 1대에만 적용됩니다.')) {
      return;
    }

    const api = window.SitePassSupabaseApi || null;
    if (!api || typeof api.rpc !== 'function') {
      alert('Supabase RPC 연결을 확인하지 못했습니다. 무료권을 지급하지 않았습니다.');
      return;
    }

    const originalDisabled = !!button?.disabled;
    const originalText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = '지급 확인 중';
    }

    try {
      const rpcResult = await api.rpc(
        'sitepass_admin_grant_equipment_free_month_v2',
        {
          p_equipment_id: cleanEquipmentId,
          p_expected_owner_member_uuid: expectedOwnerMemberUuid
        }
      );

      if (rpcResult?.error) throw rpcResult.error;

      let data = rpcResult?.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }

      if (!data || data.ok !== true ||
          data.ownerContextVerified !== true ||
          String(data.ownerMemberUuid || '') !== expectedOwnerMemberUuid ||
          Number(data.grantApiVersion || 0) !== 2) {
        throw new Error('FREE_MONTH_V2_SERVER_RESULT_INVALID');
      }

      let syncOk = true;
      try {
        if (typeof syncSupabaseEquipmentItems === 'function') {
          const syncResult = await syncSupabaseEquipmentItems(true);
          syncOk = !(syncResult && syncResult.ok === false);
        }
      } catch (syncError) {
        syncOk = false;
      }

      try { renderAdmin(); } catch (e) {}

      if (data.alreadyGranted === true) {
        alert(cleanEquipmentNo + ' 장비에는 이미 유효한 무료 1개월권이 적용되어 있습니다.\n기간을 중복 연장하지 않았습니다.');
      } else if (syncOk) {
        alert(cleanEquipmentNo + ' 장비에 무료 1개월권을 지급했습니다.\n다른 장비에는 적용되지 않습니다.');
      } else {
        alert(cleanEquipmentNo + ' 장비의 무료권 지급은 서버에서 완료되었습니다.\n화면 새로고침에 실패했으므로 장비목록 새로고침 후 다시 확인해주세요.');
      }

    } catch (e) {
      alert('무료 1개월권 지급에 실패했습니다.\n서버 데이터는 임의로 변경하지 않습니다.\n\n' + (e?.message || e));
    } finally {
      if (button && document.body.contains(button)) {
        button.disabled = originalDisabled;
        button.textContent = originalText || '무료 1개월권';
      }
    }
  }

  function setMemberPaidMonth(memberId) {
    processMemberNewPayment(memberId);
  }

  function toggleMemberSuspended(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('회원 정지/해제는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
    target.suspended = !target.suspended;
    target.status = target.suspended ? '정지' : '정상';
    target.adminLastAction = target.suspended ? '회원 정지' : '회원 정지해제';
    target.adminLastActionAt = new Date().toISOString();
    setMembers(members);
    alert((target.name || target.signupId || '회원') + '님을 ' + (target.suspended ? '정지' : '정지해제') + ' 처리했습니다.');
    renderAdmin();
  }

  function saveAdminMemberMemo(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('관리자 메모 저장은 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
    const memo = (document.getElementById('adminMemo_' + memberId)?.value || '').trim();
    target.adminMemo = memo;
    target.adminMemoUpdatedAt = new Date().toISOString();
    setMembers(members);
    alert('관리자 메모를 저장했습니다.');
    renderAdmin();
  }


  function renderAdminMemberLinkDetailsV733R2E(member) {
    const api = window.SitePassAdminMembersApi || null;

    if (!api || typeof api.getLinkDetailsForMember !== 'function') {
      return '<div class="sitepass-member-link-detail-r2e"><h4>장비 연동</h4><div class="small">연동 상세 조회 모듈을 준비하지 못했습니다.</div></div>';
    }

    let info = null;
    try {
      info = api.getLinkDetailsForMember(member);
    } catch (e) {
      info = {
        ready: true,
        outgoing: [],
        incoming: [],
        error: e?.message || 'MEMBER_LINK_DETAILS_LOOKUP_ERROR'
      };
    }

    info = info || {};
    const outgoing = Array.isArray(info.outgoing) ? info.outgoing : [];
    const incoming = Array.isArray(info.incoming) ? info.incoming : [];

    if (info.error) {
      return '<div class="sitepass-member-link-detail-r2e"><h4>장비 연동</h4><div class="notice">연동 상대방 정보를 읽지 못했습니다. 기존 회원/장비 데이터는 변경하지 않았습니다.<br>' +
        escapeHtml(info.error) + '</div></div>';
    }

    if (!info.ready) {
      return '<div class="sitepass-member-link-detail-r2e"><h4>장비 연동</h4><div class="small">연동 상대방 정보를 확인 중입니다.</div></div>';
    }

    const maskPhone = last4 => {
      const digits = String(last4 || '').replace(/[^0-9]/g, '').slice(-4);
      return digits ? '***-' + digits : '-';
    };

    const renderLinkCard = (row, direction) => {
      const outgoingDirection = direction === 'outgoing';

      const counterpartName = outgoingDirection
        ? (row.linkedName || '-')
        : (row.ownerName || '-');

      const counterpartLoginId = outgoingDirection
        ? (row.linkedLoginId || '-')
        : (row.ownerLoginId || '-');

      const counterpartPhone = outgoingDirection
        ? row.linkedPhoneLast4
        : row.ownerPhoneLast4;

      const directionLabel = outgoingDirection
        ? '연동 보냄'
        : '연동 받음';

      const counterpartLabel = outgoingDirection
        ? '받은 회원'
        : '보낸 회원(장비소유자)';

      const equipmentTitle = [
        row.equipmentName || '',
        row.equipmentNo || ''
      ].filter(Boolean).join(' / ') || '-';

      return '<div class="sitepass-member-link-row-r5">' +
        '<strong class="sitepass-member-link-equipment-r5">' + escapeHtml(equipmentTitle) + '</strong>' +
        '<span class="sitepass-member-link-counterpart-r5"><b>' + escapeHtml(counterpartLabel) + '</b> ' + escapeHtml(counterpartName) + '</span>' +
        '<span><b>아이디</b> ' + escapeHtml(counterpartLoginId) + '</span>' +
        '<span><b>전화</b> ' + escapeHtml(maskPhone(counterpartPhone)) + '</span>' +
        '<span><b>연동일</b> ' + escapeHtml(formatNullableDateTime(row.linkedAt)) + '</span>' +
        '<span class="badge">' + escapeHtml(directionLabel) + '</span>' +
      '</div>';
    };

    let html = '<div class="sitepass-member-link-detail-r2e"><h4>장비 연동</h4>';

    if (!outgoing.length && !incoming.length) {
      html += '<div class="small">현재 활성 장비 연동이 없습니다.</div>';
    }

    if (outgoing.length) {
      html += '<div class="sitepass-member-link-group-r2e"><div class="sitepass-member-link-group-title-r2e">연동 보낸 장비 ' +
        outgoing.length + '건</div>' +
        outgoing.map(row => renderLinkCard(row, 'outgoing')).join('') +
      '</div>';
    }

    if (incoming.length) {
      html += '<div class="sitepass-member-link-group-r2e"><div class="sitepass-member-link-group-title-r2e">연동 받은 장비 ' +
        incoming.length + '건</div>' +
        incoming.map(row => renderLinkCard(row, 'incoming')).join('') +
      '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderAdminMemberDetail(member) {
    if (member.withdrawn) {
      return '<div class="admin-member-detail"><div class="notice">강제탈퇴 처리된 기록입니다.<br>처리일: ' + escapeHtml(formatDateTime(member.withdrawnAt)) + '<br>처리자: ' + escapeHtml(member.withdrawnBy || SUPER_ADMIN_ROLE_NAME) + '</div></div>';
    }
    if (member.isSuperAdminVirtual) {
      return '<div class="admin-member-detail"><div class="notice blue-note">대표이사 최고관리자 계정입니다. 이 계정은 권한해제, 정지, 강제탈퇴 대상에서 제외됩니다.</div></div>';
    }
    const actionId = getAdminMemberActionId(member);
    const warnings = getMemberDocWarningCount(member);
    return '<div class="admin-member-detail">' +
      '<div class="admin-mini-grid">' +
        '<div class="line"><b>가입일</b><span>' + escapeHtml(formatDateTime(member.createdAt)) + '</span></div>' +
        '<div class="line"><b>최근접속</b><span>' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></div>' +
        '<div class="line"><b>만료임박</b><span>' + warnings.expiring + '건</span></div>' +
        '<div class="line"><b>만료</b><span>' + warnings.expired + '건</span></div>' +
      '</div>' +
      '<div class="field" style="margin-top:10px;"><label>관리자 메모</label><textarea id="adminMemo_' + escapeHtml(actionId) + '" rows="3" style="min-height:78px;resize:vertical;" placeholder="문의내용, 결제약속, 민원, 특이사항 등을 남겨두세요.">' + escapeHtml(member.adminMemo || '') + '</textarea></div>' +
      '<div class="small">최근 조치: ' + escapeHtml(member.adminLastAction || '-') + (member.adminLastActionAt ? ' · ' + escapeHtml(formatDateTime(member.adminLastActionAt)) : '') + '</div>' +
      '<div class="actions">' +
        '<button class="ghost" onclick="saveAdminMemberMemo(\'' + escapeJs(actionId) + '\')">메모 저장</button>' +
        '<button class="ghost" onclick="toggleMemberSuspended(\'' + escapeJs(actionId) + '\')">' + (member.suspended ? '정지해제' : '회원정지') + '</button>' +
        (member.adminRole && member.adminRole !== SUPER_ADMIN_ROLE_NAME ? '<button class="ghost" onclick="resetAdminAccountPassword(\'' + escapeJs(actionId) + '\')">관리자 비밀번호 재설정</button>' : '') +
        (member.adminRole ? '<button class="dangerBtn" onclick="clearMemberAdminRole(\'' + escapeJs(actionId) + '\')">관리자해제</button>' : '') +
        '<button class="dangerBtn" onclick="forceWithdrawMember(\'' + escapeJs(actionId) + '\')">회원 강제탈퇴</button>' +
      '</div>' +
      '<div class="notice blue-note" style="margin-top:10px;">결제상태·시작일·만료일·무료 1개월권은 아래 <b>소유 장비별</b>로 관리합니다.</div>' +
      renderAdminMemberLinkDetailsV733R2E(member) +
      renderMemberEquipmentList(member) +
    '</div>';
  }

  function setMemberAdminRole(memberId, role) {
    if (!isSuperAdminLoggedIn()) {
      alert('관리자 권한 지정/해제는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) {
      alert('회원을 찾을 수 없습니다.');
      return;
    }
    target.adminRole = '관리자';
    target.adminRoleUpdatedAt = new Date().toISOString();
    target.adminRoleUpdatedBy = SUPER_ADMIN_ROLE_NAME;
    setMembers(members);
    syncMemberAdminRoleMap(target, role);
    alert((target.name || target.signupId || '회원') + '님을 관리자로 지정했습니다.\n이 회원은 다음 로그인부터 관리자모드로 접속됩니다.');
    renderAdmin();
  }

  function clearMemberAdminRole(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('관리자 권한 지정/해제는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) {
      alert('회원을 찾을 수 없습니다.');
      return;
    }
    if (isDesignatedSuperAdminMember(target)) {
      alert('sitepass@kakao.com 최고관리자는 해제할 수 없습니다. 최고관리자는 1명만 유지됩니다.');
      return;
    }
    if (!confirm((target.name || target.signupId || '회원') + '님의 관리자 권한을 해제할까요?')) return;
    delete target.adminRole;
    target.role = 'member';
    target.adminRoleUpdatedAt = new Date().toISOString();
    target.adminRoleUpdatedBy = SUPER_ADMIN_ROLE_NAME;
    setMembers(members);
    syncMemberAdminRoleMap(target, '');
    try { saveMemberToSupabase(target); } catch (e) {}
    alert('관리자 권한을 해제했습니다. 이제 최고관리자는 sitepass@kakao.com 1명만 유지됩니다.');
    renderAdmin();
  }

  async function forceWithdrawMember(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('회원 강제탈퇴는 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target) {
      alert('회원을 찾을 수 없습니다.');
      return;
    }
    if (isDesignatedSuperAdminMember(target)) {
      alert('sitepass@kakao.com 최고관리자는 삭제/강제탈퇴할 수 없습니다.');
      return;
    }
    const targetName = getMemberDisplayName(target);
    if (!confirm(targetName + '님을 강제탈퇴 처리할까요?\n\n서버에서 회원 접근권한, 회원간 장비연동, 활성 공유를 안전하게 해제한 뒤에만 이 브라우저의 관리자 목록을 갱신합니다. 장비 원본은 물리 삭제하지 않습니다.')) return;

    // 59/60 추가강화: 서버 성공 전에 로컬 회원/서류/관리자 권한을 먼저 지우지 않습니다.
    // 현재 브라우저 관리자 인증은 service_role 전용 RPC를 안전하게 호출할 수 없으므로
    // 서버 관리자 인증 경로가 연결되지 않은 상태에서는 강제탈퇴 자체를 중단합니다.
    const serverUpdated = await markMemberWithdrawnInSupabase(target, '최고관리자가 강제탈퇴 처리했습니다.');
    if (Number(serverUpdated || 0) < 1) {
      alert('안전한 관리자 서버 강제탈퇴 경로가 아직 연결되지 않아 처리하지 않았습니다.\n회원정보, 장비 원본, 장비연동, 로컬 관리자 목록은 변경하지 않았습니다.');
      return;
    }

    syncMemberAdminRoleMap(target, '');
    const targetKeys = getMemberLoginKeys(target);
    addWithdrawnMemberRecord(target, getSessionValue(ADMIN_SESSION_KEY + '_id') || SUPER_ADMIN_ROLE_NAME, '강제탈퇴');
    const removedDocs = deleteOwnedItemsForMember(target);
    try { removeServerEquipmentCacheForMember(target); } catch (e) {}
    setAdminDetailServerMemberRows(removeRowsByMemberKeys(getAdminDetailServerMemberRows(), target));

    const remained = members.filter(member => {
      if (isSameAdminActionMember(member, memberId)) return false;
      const keys = getMemberLoginKeys(member);
      return !keys.some(key => targetKeys.includes(key));
    });
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

    alert(targetName + '님을 서버에서 강제탈퇴 처리했습니다.\n회원간 장비연동과 활성 공유 접근을 해제했고, 이 브라우저의 해당 회원 임시 데이터 ' + removedDocs + '건을 정리했습니다.');
    refreshMemberUi();
    renderAdmin();
  }



  function resetAdminAccountPassword(memberId) {
    if (!isSuperAdminLoggedIn()) {
      alert('관리자 비밀번호 재설정은 최고관리자만 가능합니다.');
      return;
    }
    const { members, target } = getAdminEditableMember(memberId);
    if (!target || !target.adminRole || target.adminRole === SUPER_ADMIN_ROLE_NAME || target.isSuperAdminVirtual) {
      alert('비밀번호를 재설정할 수 있는 직원 관리자 계정을 찾지 못했습니다.');
      return;
    }
    const pw = prompt((target.name || target.signupId || '관리자') + '님의 새 임시 비밀번호를 입력하세요.\n6자 이상으로 입력해주세요.');
    if (pw === null) return;
    const cleanPw = normalizeLoginText(pw);
    if (cleanPw.length < 6) { alert('비밀번호는 6자 이상이어야 합니다.'); return; }
    const pw2 = prompt('새 임시 비밀번호를 한 번 더 입력하세요.');
    if (pw2 === null) return;
    if (cleanPw !== normalizeLoginText(pw2)) { alert('비밀번호 확인이 맞지 않습니다.'); return; }
    target.testPassword = cleanPw;
    target.passwordSet = true;
    target.passwordResetAt = new Date().toISOString();
    target.passwordResetBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
    target.adminLastAction = '관리자 비밀번호 재설정';
    target.adminLastActionAt = new Date().toISOString();
    setMembers(members);
    alert('관리자 비밀번호를 재설정했습니다. 새 비밀번호는 직원에게 직접 전달해주세요.');
    renderAdmin();
  }

  window.toggleAdminMemberDetail = toggleAdminMemberDetail;
  window.formatShortDate = formatShortDate;
  window.formatNullableDateTime = formatNullableDateTime;
  window.updateMemberLastLogin = updateMemberLastLogin;
  window.getAdminEditableMember = getAdminEditableMember;
  window.readAdminPaymentInputs = readAdminPaymentInputs;
  window.addMemberPaymentHistory = addMemberPaymentHistory;
  window.memberOwnsItemForPayment = memberOwnsItemForPayment;
  window.applyMemberPaymentToOwnedItems = applyMemberPaymentToOwnedItems;
  window.pauseOwnedItemsAfterMemberRefund = pauseOwnedItemsAfterMemberRefund;
  window.processMemberNewPayment = processMemberNewPayment;
  window.processMemberPaymentExtension = processMemberPaymentExtension;
  window.requestMemberRefund = requestMemberRefund;
  window.processMemberRefund = processMemberRefund;
  window.renderAdminPaymentWindow = renderAdminPaymentWindow;
  window.grantEquipmentFreeMonthFromMemberDetail = grantEquipmentFreeMonthFromMemberDetail;
  window.setMemberPaidMonth = setMemberPaidMonth;
  window.toggleMemberSuspended = toggleMemberSuspended;
  window.saveAdminMemberMemo = saveAdminMemberMemo;
  window.renderAdminMemberDetail = renderAdminMemberDetail;
  window.setMemberAdminRole = setMemberAdminRole;
  window.clearMemberAdminRole = clearMemberAdminRole;
  window.forceWithdrawMember = forceWithdrawMember;
  window.resetAdminAccountPassword = resetAdminAccountPassword;

  window.SitePassAdminDetail = {
    toggleAdminMemberDetail: toggleAdminMemberDetail,
    formatShortDate: formatShortDate,
    formatNullableDateTime: formatNullableDateTime,
    updateMemberLastLogin: updateMemberLastLogin,
    getAdminEditableMember: getAdminEditableMember,
    readAdminPaymentInputs: readAdminPaymentInputs,
    addMemberPaymentHistory: addMemberPaymentHistory,
    memberOwnsItemForPayment: memberOwnsItemForPayment,
    applyMemberPaymentToOwnedItems: applyMemberPaymentToOwnedItems,
    pauseOwnedItemsAfterMemberRefund: pauseOwnedItemsAfterMemberRefund,
    processMemberNewPayment: processMemberNewPayment,
    processMemberPaymentExtension: processMemberPaymentExtension,
    requestMemberRefund: requestMemberRefund,
    processMemberRefund: processMemberRefund,
    renderAdminPaymentWindow: renderAdminPaymentWindow,
    grantEquipmentFreeMonthFromMemberDetail: grantEquipmentFreeMonthFromMemberDetail,
    setMemberPaidMonth: setMemberPaidMonth,
    toggleMemberSuspended: toggleMemberSuspended,
    saveAdminMemberMemo: saveAdminMemberMemo,
    renderAdminMemberDetail: renderAdminMemberDetail,
    setMemberAdminRole: setMemberAdminRole,
    clearMemberAdminRole: clearMemberAdminRole,
    forceWithdrawMember: forceWithdrawMember,
    resetAdminAccountPassword: resetAdminAccountPassword
  };
})();
