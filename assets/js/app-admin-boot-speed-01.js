// SitePass v23.7.320 - speed optimized medium chunk (app-admin-boot-speed 01/03)
// ---- merged from app-admin-boot-01.js ----
// SitePass v23.7.320 - app-admin-boot finer split (01/14)
// SitePass v23.7.320 - app.bundle.js remaining split (04 admin/pwa/boot)


    function completeAutoPaymentForItem(code, plan, sourceLabel, options) {
      const items = getItems();
      const idx = items.findIndex(item => String(item.code || '') === String(code || ''));
      if (idx < 0) return { ok:false, message:'결제할 서류함을 찾을 수 없습니다.', code:code || '' };
      const info = getPlanInfo(plan || 'monthly', { additional: !!(options && options.additional) });
      const now = new Date();
      const nowIso = now.toISOString();
      const currentEnd = items[idx].trialEndsAt ? new Date(items[idx].trialEndsAt) : now;
      const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const newEnd = addDaysIso(base.toISOString(), info.days);
      const freshManagerExpireAt = new Date(getSevenDaysFromNowMs()).toISOString();
      items[idx] = {
        ...items[idx],
        serviceStatus:info.serviceStatus,
        paymentPlan:info.key,
        basicPlan:info.planText,
        alertPlan:items[idx].alertPlan || '보험·검사 만료 알림 포함 준비',
        paidAt:nowIso,
        trialEndsAt:newEnd,
        managerExpireAt:freshManagerExpireAt,
        managerShareToken:makeManagerShareToken(),
        paymentStatus:'자동결제완료',
        paymentAmount:info.price,
        paymentMethod:'자동결제 링크 확인',
        autoPaymentSource:sourceLabel || '자동결제 성공 링크',
        autoPaymentLastAt:nowIso,
        autoPaymentReceiptNo:'AUTO-TEST-' + Date.now(),
        updatedAt:nowIso
      };
      if (items[idx].paymentConversionTest) items[idx].paymentTestPaid = true;
      if (items[idx].bundleMeta) items[idx].bundleMeta.paymentText = info.planText + ' 자동결제완료';
      setItems(items);
      const memberUpdated = applyAutoPaymentResultToOwnerMember(items[idx], info, nowIso, newEnd);
      return { ok:true, item:items[idx], info, newEnd, memberUpdated, message:info.label + ' 자동결제가 완료되었습니다.' };
    }

    function handleAutoPaymentHash(hash, silent) {
      const rawHash = String(hash || window.location.hash || '');
      const raw = rawHash.replace(/^#pay=/, '');
      const parts = raw.split('&');
      const code = decodeURIComponent(parts.shift() || '');
      const params = {};
      parts.forEach(part => {
        const pair = part.split('=');
        params[decodeURIComponent(pair[0] || '')] = decodeURIComponent(pair.slice(1).join('=') || '');
      });
      const plan = params.plan === 'annual' ? 'annual' : 'monthly';
      const additional = params.tier === 'additional';
      const result = completeAutoPaymentForItem(code, plan, '자동결제 링크 확인', { additional });
      if (!silent) {
        if (!result.ok) {
          alert(result.message || '자동결제 처리에 실패했습니다.');
          return result;
        }
        alert(result.info.label + ' 링크 결제가 성공 처리되었습니다.\n\n장비 QR·담당자 링크가 바로 활성화되었습니다.\n새 종료일: ' + formatDateOnly(result.newEnd));
        renderPricingTargetList();
        renderDetail(code);
      }
      return result;
    }

    function runManagerSevenDayLinkSelfTest() {
      createPaymentConversionTestData();
      expireUnpaidPaymentTestData();
      const items = getItems().filter(isPaymentTestItem);
      const target = items.find(item => item.paymentTestPaid !== true && isServiceShareBlocked(item));
      if (!target) {
        alert('7일 링크 만료검사에 사용할 미결제 임시 장비가 없습니다.\n임시 50명 / 장비 100대를 다시 생성해주세요.');
        return;
      }
      handleAutoPaymentHash(makeAutoPaymentHash(target.code, 'monthly'), true);
      const paidItem = getItemByCode(target.code);
      const box = document.getElementById('managerPrintBox');
      const validExp = getSevenDaysFromNowMs();
      const validSig = getManagerLinkSignature(paidItem.code, validExp);
      renderManagerPrint(paidItem.code, validExp, validSig);
      const validOpen = box.innerHTML.includes('다운로드/프린트') && !box.innerHTML.includes('만료된 담당자') && !box.innerHTML.includes('일시정지');
      const expiredExp = Date.now() - 1000;
      const expiredSig = getManagerLinkSignature(paidItem.code, expiredExp);
      renderManagerPrint(paidItem.code, expiredExp, expiredSig);
      const expiredBlocked = box.innerHTML.includes('만료된 담당자 QR·링크입니다.');
      renderManagerPrint(paidItem.code, Date.now() + (365 * 24 * 60 * 60 * 1000), 'FAKE-SIG');
      const tamperBlocked = box.innerHTML.includes('올바르지 않은 담당자 QR·링크입니다.');
      alert('담당자 7일 링크 만료검사 결과\n\n' +
        '대상 장비: ' + getShareItemLabel(paidItem) + '\n' +
        '결제상태: 1개월 자동결제 성공 처리\n' +
        '7일 안 링크 접속: ' + (validOpen ? '정상 열림' : '오류') + '\n' +
        '7일 지난 링크 접속: ' + (expiredBlocked ? '정상 차단' : '오류') + '\n' +
        '만료시간 조작 링크: ' + (tamperBlocked ? '정상 차단' : '오류') + '\n\n' +
        ((validOpen && expiredBlocked && tamperBlocked) ? '결과: 정상입니다.' : '결과: 확인이 필요합니다.'));
      renderPricingTargetList();
    }

    function runAutoPaymentLinkSelfTest() {
      if (!isSuperAdminLoggedIn()) { alert('자동결제 링크 검사는 최고관리자만 가능합니다.'); return; }
      const blocked = getItems().filter(item => isPaymentTestItem(item) && item.paymentTestPaid !== true && isServiceShareBlocked(item));
      if (blocked.length < 3) {
        alert('차단된 미결제 임시 장비가 부족합니다.\n\n먼저 [임시 50명 / 장비 100대 생성] → [베타기간 강제 종료]를 눌러주세요.');
        return;
      }
      const monthlyCode = blocked[0].code;
      const annualCode = blocked[1].code;
      const untouchedCode = blocked[2].code;
      const beforeMonthlyBlocked = isServiceShareBlocked(getItemByCode(monthlyCode));
      const beforeAnnualBlocked = isServiceShareBlocked(getItemByCode(annualCode));
      const monthlyResult = handleAutoPaymentHash(makeAutoPaymentHash(monthlyCode, 'monthly'), true);
      const annualResult = handleAutoPaymentHash(makeAutoPaymentHash(annualCode, 'annual'), true);
      const monthlyItem = getItemByCode(monthlyCode);
      const annualItem = getItemByCode(annualCode);
      const untouchedItem = getItemByCode(untouchedCode);
      const monthlyDays = Math.ceil((new Date(monthlyItem.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      const annualDays = Math.ceil((new Date(annualItem.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      const monthlyOk = beforeMonthlyBlocked && monthlyResult.ok && !isServiceShareBlocked(monthlyItem) && monthlyItem.paymentPlan === 'monthly' && monthlyDays >= 29 && monthlyDays <= 31;
      const annualOk = beforeAnnualBlocked && annualResult.ok && !isServiceShareBlocked(annualItem) && annualItem.paymentPlan === 'annual' && annualDays >= 364 && annualDays <= 366;
      const untouchedOk = isServiceShareBlocked(untouchedItem);
      const allOk = monthlyOk && annualOk && untouchedOk;
      alert('자동결제 링크 검사 결과\n\n1개월결제 링크: ' + (monthlyOk ? '정상' : '오류') + '\n- 장비코드: ' + monthlyCode + '\n- 남은기간: 약 ' + monthlyDays + '일\n- QR 접속: ' + (!isServiceShareBlocked(monthlyItem) ? '가능' : '차단') + '\n\n1년결제 링크: ' + (annualOk ? '정상' : '오류') + '\n- 장비코드: ' + annualCode + '\n- 남은기간: 약 ' + annualDays + '일\n- QR 접속: ' + (!isServiceShareBlocked(annualItem) ? '가능' : '차단') + '\n\n결제하지 않은 다른 장비 유지차단: ' + (untouchedOk ? '정상' : '오류') + '\n\n' + (allOk ? '정상입니다. 관리자 수동처리 없이 자동결제 링크만으로 QR이 활성화됩니다.' : '오류가 있습니다. 위 항목을 확인해야 합니다.'));
      renderAdmin();
    }

    function renderPricingScreen() {
      const savedPlan = localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly';
      const radio = document.querySelector('input[name="paymentPlan"][value="' + savedPlan + '"]');
      if (radio) radio.checked = true;
      updateSelectedPaymentPlan();
      const pending = getPendingRegistration();
      const renewCard = document.getElementById('pricingRenewCard');
      if (renewCard) {
        // 추가등록 결제 중에는 기존 장비 연장결제창을 숨겨서 결제 대상이 헷갈리지 않게 합니다.
        renewCard.classList.toggle('hidden', !!(pending && pending.item && pending.paymentTier === 'additional'));
      }
    }

    function startRegistrationWithSelectedPlan() {
      const pending = getPendingRegistration();
      if (pending && pending.item) {
        // v23.7.282: 결제하기 직전에 결제 입력칸을 다시 그리면 주민번호/통신사/카드정보가 사라집니다.
        // 그래서 결제대기 상태에서는 입력값을 유지한 채 바로 결제완료 검증으로 들어갑니다.
        completePendingRegistrationPayment(getSelectedPaymentPlan());
        return;
      }
      updateSelectedPaymentPlan();
      startNewRegistration();
    }

    function getPaymentDueDays(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getPaymentDueDays) return payments.getPaymentDueDays(item);
      if (!item || !item.trialEndsAt) return null;
      const end = new Date(item.trialEndsAt).getTime();
      if (Number.isNaN(end)) return null;
      return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    }

    function isPaymentDueSoon(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isPaymentDueSoon) return payments.isPaymentDueSoon(item, 7);
      const diff = getPaymentDueDays(item);
      return diff !== null && diff <= 7;
    }

    function getPaymentDueText(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getPaymentDueText) return payments.getPaymentDueText(item);
      if (!item || !item.trialEndsAt) return '종료일 미설정';
      const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return Math.abs(diff) + '일 지남';
      if (diff === 0) return '오늘 종료';
      return diff + '일 남음';
    }

// ---- merged from app-admin-boot-02.js ----
// SitePass v23.7.320 - app-admin-boot finer split (02/14)
function renderRenewPanel(item) {
      if (!item) return '';
      const dueText = getPaymentDueText(item);
      const showChip = isPaymentDueSoon(item) ? '<div class="renew-chip">연장 필요 · ' + escapeHtml(dueText) + '</div>' : '<div class="small">종료까지 ' + escapeHtml(dueText) + '</div>';
      const additional = isAdditionalPaymentItem(item);
      const monthlyInfo = getPlanInfo('monthly', { additional });
      const annualInfo = getPlanInfo('annual', { additional });
      return '<div class="renew-panel"><b>결제/연장</b><span>' + (additional ? '추가등록 장비 요금으로 연장됩니다.' : '첫 1대 등록 요금으로 연장됩니다.') + ' 현재 종료일 기준으로 기간이 연장되고, 카드/휴대폰 결제는 본인 명의 확인을 한 번 더 진행합니다.</span>' + showChip + '<div class="renew-actions"><button class="ghost" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'monthly\')">' + escapeHtml(monthlyInfo.price) + ' 연장</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'annual\')">' + escapeHtml(annualInfo.price) + ' 연장</button></div></div>';
    }

    function renderListRenewButton(item) {
      if (!item || !isPaymentDueSoon(item)) return '';
      const diff = getPaymentDueDays(item);
      const title = diff === 0 ? '오늘 기간만료 알림' : '기간만료 ' + Math.max(diff || 0, 0) + '일 전 알림';
      const guide = diff === 0
        ? '오늘 만료됩니다. 회원에게 기간연장 사이트 링크를 보내고 결제 후 QR을 다시 활성화합니다.'
        : getPaymentDueText(item) + ' · 만료 7일 전부터 회원에게 연장 안내를 보낼 수 있습니다.';
      return '<div class="renew-panel"><b>' + escapeHtml(title) + '</b><span>' + escapeHtml(guide) + '</span><div class="renew-actions"><button class="okBtn" onclick="sendPaymentRenewalNotice(\'' + escapeJs(item.code) + '\')">연장 알림 보내기</button><button class="ghost" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'monthly\')">월 연장</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'annual\')">연 연장</button></div></div>';
    }

    function renderPricingTargetList() {
      const box = document.getElementById('pricingTargetList');
      if (!box) return;
      const items = getItems();
      const plan = getSelectedPaymentPlan();
      if (!items.length) {
        box.innerHTML = '<div class="empty">아직 등록된 서류함이 없습니다.<br>첫 장비는 서류 등록 후 월 2,000원 또는 연 19,900원 결제를 완료하면 QR링크가 생성됩니다.</div>';
        return;
      }
      box.innerHTML = items.map(item => {
        const additional = isAdditionalPaymentItem(item, items);
        const info = getPlanInfo(plan, { additional });
        const monthlyInfo = getPlanInfo('monthly', { additional });
        const annualInfo = getPlanInfo('annual', { additional });
        const tier = additional ? 'additional' : 'first';
        const monthlyLink = makeAutoPaymentTestLink(item.code, 'monthly', tier);
        const annualLink = makeAutoPaymentTestLink(item.code, 'annual', tier);
        return '<div class="list-item"><strong>' + escapeHtml(getItemTitle(item)) + '</strong>' +
          '<div class="small">현재 상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
          '<div class="small">적용 구분: ' + (additional ? '2대부터 추가등록 요금' : '1대 등록 기본요금') + '</div>' +
          '<div class="small">선택 요금제: ' + escapeHtml(info.label + ' / ' + info.price) + '</div>' +
          '<div class="renew-panel"><b>자동결제 링크 확인</b><span>결제 성공 링크가 돌아왔을 때 QR·담당자 링크가 바로 열리는지 확인합니다.</span>' +
            '<div class="renew-actions">' +
              '<a class="auto-pay-link monthly" href="' + escapeHtml(monthlyLink) + '">' + escapeHtml(monthlyInfo.price) + ' 결제 확인</a>' +
              '<a class="auto-pay-link annual" href="' + escapeHtml(annualLink) + '">' + escapeHtml(annualInfo.price) + ' 결제 확인</a>' +
            '</div>' +
          '</div>' +
          '<div class="actions"><button class="okBtn" onclick="sendPaymentRenewalNotice(\'' + escapeJs(item.code) + '\')">연장 알림 보내기</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'' + escapeJs(plan) + '\')">선택한 요금제로 수동연장</button><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button></div></div>';
      }).join('');
    }


    function buildPaymentRenewalNoticeText(item) {
      const diff = getPaymentDueDays(item);
      const additional = isAdditionalPaymentItem(item);
      const monthlyLink = makeAutoPaymentTestLink(item.code, 'monthly', additional ? 'additional' : 'first');
      const annualLink = makeAutoPaymentTestLink(item.code, 'annual', additional ? 'additional' : 'first');
      const title = diff === 0 ? '오늘 SitePass 이용기간이 만료됩니다.' : 'SitePass 이용기간이 ' + getPaymentDueText(item) + ' 남았습니다.';
      return '[SitePass 기간연장 안내]\n' +
        title + '\n' +
        '장비/서류함: ' + getItemTitle(item) + '\n' +
        '월 결제: ' + getPlanInfo('monthly', { additional }).price + '\n' +
        '연 결제: ' + getPlanInfo('annual', { additional }).price + '\n\n' +
        '기간연장 사이트에서 결제하면 QR·담당자 링크가 다시 활성화됩니다.\n' +
        '월 결제 링크: ' + monthlyLink + '\n' +
        '연 결제 링크: ' + annualLink;
    }

    function sendPaymentRenewalNotice(code) {
      const item = getItemByCode(code);
      if (!item) { alert('알림을 보낼 서류함을 찾을 수 없습니다.'); return; }
      const text = buildPaymentRenewalNoticeText(item);
      const phone = normalizePhoneForShare(item.ownerPhone || '');
      if (phone) {
        openSmsShareToPhones([phone], text);
      } else {
        openSmsShare(text);
      }
    }

    function requirePasswordReconfirm(actionLabel) {
      const label = actionLabel || '중요 작업';
      const input = prompt(label + '은 로그인 상태여도 확인번호 입력이 필요합니다.\n\n현재 임시 확인번호 1234를 입력해주세요.');
      if (input === null) return false;
      if (String(input).trim() !== '1234') {
        alert('확인번호가 맞지 않습니다. 현재 임시 확인번호는 1234입니다.');
        return false;
      }
      return true;
    }

    function renewItemService(code, plan) {
      if (!requirePaymentOwnerVerification('결제/연장')) return;
      const items = getItems();
      const idx = items.findIndex(x => x.code === code);
      if (idx < 0) { alert('연장할 서류함을 찾을 수 없습니다.'); return; }
      const info = getPlanInfo(plan || getSelectedPaymentPlan(), { additional: isAdditionalPaymentItem(items[idx], items) });
      const now = new Date();
      const currentEnd = items[idx].trialEndsAt ? new Date(items[idx].trialEndsAt) : now;
      const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const newEnd = addDaysIso(base.toISOString(), info.days);
      const freshManagerExpireAt = new Date(getSevenDaysFromNowMs()).toISOString();
      items[idx] = {
        ...items[idx],
        serviceStatus: info.serviceStatus,
        paymentPlan: info.key,
        basicPlan: info.planText,
        alertPlan: '보험·검사 만료 알림 포함 준비',
        paidAt: new Date().toISOString(),
        trialEndsAt: newEnd,
        managerExpireAt: freshManagerExpireAt,
        updatedAt: new Date().toISOString()
      };
      if (items[idx].paymentConversionTest) items[idx].paymentTestPaid = true;
      if (items[idx].bundleMeta) items[idx].bundleMeta.paymentText = info.planText + ' 결제완료';
      setItems(items);
      alert(info.label + ' 연장이 완료되었습니다.\n새 종료일: ' + formatDateOnly(newEnd));
      renderPricingTargetList();
      if (!document.getElementById('detailScreen')?.classList.contains('hidden')) renderDetail(code);
      if (!document.getElementById('listScreen')?.classList.contains('hidden')) renderList();
    }

    function addDaysIso(baseIso, days) {
      const payments = getAdminPaymentsModule();
      if (payments.addDaysIso) return payments.addDaysIso(baseIso, days);
      const d = new Date(baseIso);
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }

// ---- merged from app-admin-boot-03.js ----
// SitePass v23.7.320 - app-admin-boot finer split (03/14)
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

// ---- merged from app-admin-boot-04.js ----
// SitePass v23.7.320 - app-admin-boot finer split (04/14)
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

// ---- merged from app-admin-boot-05.js ----
// SitePass v23.7.320 - app-admin-boot finer split (05/14)
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

