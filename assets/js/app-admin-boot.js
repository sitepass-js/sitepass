// SitePass v23.7.292 - app.bundle.js remaining split (04 admin/pwa/boot)


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

    function getMemberEquipmentItems(member) {
      if (!member || member.isSuperAdminVirtual || member.withdrawn) return [];
      const ids = getMemberAdminIdentifiers(member);
      return getItems().filter(item => {
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
      if (!item || item.isDeleted || item.deletedAt || item.is_deleted) return false;
      const ownerKeys = getEquipmentOwnerAdminKeys(item);
      if (!ownerKeys.length) return false;
      const set = activeOwnerKeySet || getActiveEquipmentOwnerKeySet();
      if (!set || !set.size) return false;
      return ownerKeys.some(key => set.has(key));
    }

    function getAdminVisibleEquipmentItems() {
      const activeOwnerKeySet = getActiveEquipmentOwnerKeySet();
      return getItems().filter(item => isEquipmentOwnedByActiveMember(item, activeOwnerKeySet));
    }

    async function cleanupOrphanEquipmentForAdmin() {
      if (!confirm('현재 회원과 연결되지 않은 장비/QR을 관리자 집계에서 정리할까요?\n\n탈퇴회원 또는 회원 없는 고아 장비가 전체장비등록수에 남는 문제를 정리합니다.')) return;
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


    function renderAdmin() {
      if (!isAdminLoggedIn()) { showScreen('signupScreen'); return; }
      if (!sitePassEquipmentSyncing && (!sitePassEquipmentSyncedAt || Date.now() - sitePassEquipmentSyncedAt > 30000)) {
        try { syncSupabaseEquipmentItems(true); } catch (e) {}
      }
      const items = getAdminVisibleEquipmentItems();
      const members = ensureMemberIds();
      const rawEquipmentCount = getItems().length;
      const total = items.length;
      const paused = items.filter(isQrPaused).length;
      const expiringDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료임박').length, 0);
      const expiredDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료').length, 0);
      const paymentDue = items.filter(item => {
        if (!item.trialEndsAt || item.serviceStatus === '유료사용') return false;
        const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      }).length;
      const grace14Items = items.filter(isServiceGrace14Over).length;
      const contacts = getContacts();
      const waitingContacts = contacts.filter(x => x.status !== '답변완료').length;
      const visitStats = getVisitStats();
      const todayKey = getLocalDateKey();
      const todayVisitors = Number((visitStats.daily || {})[todayKey] || 0);
      const totalVisitors = Number(visitStats.total || 0);
      const todaySignups = countTodaySignups(members);
      const totalEquipmentCount = total;
      const topSummary = '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>관리자 요약 현황</h3>' +
        '<div class="small">장비 서버동기화: ' + escapeHtml(sitePassEquipmentSyncMessage || (sitePassEquipmentSyncedAt ? '마지막 확인 ' + formatNullableDateTime(new Date(sitePassEquipmentSyncedAt).toISOString()) : '대기 중')) + ' · 원본장비 ' + rawEquipmentCount + '대 / 활성회원 연결장비 ' + totalEquipmentCount + '대</div>' +
        '<div class="actions" style="margin:8px 0 4px;"><button type="button" class="ghost" onclick="cleanupOrphanEquipmentForAdmin()">회원 없는 장비/QR 정리</button></div>' +
        '<div class="admin-summary-rows">' +
          '<div class="admin-summary-row">' +
            '<div class="line"><b>오늘방문자수</b><span>' + todayVisitors + '명</span></div>' +
            '<div class="line"><b>토탈방문자수</b><span>' + totalVisitors + '명</span></div>' +
          '</div>' +
          '<div class="admin-summary-row">' +
            '<div class="line"><b>오늘가입자수</b><span>' + todaySignups + '명</span></div>' +
            renderAdminQuickLine('전체장비등록수', totalEquipmentCount + '대', 'openAdminListQuickFilter(\'all\')') +
          '</div>' +
        '</div>' +
      '</div>';
      document.getElementById('adminBox').innerHTML =
        '<div class="notice blue-note"><b>현재 권한: ' + escapeHtml(getCurrentAdminRoleName()) + '</b><br>' + (isSuperAdminLoggedIn() ? '대표이사 최고관리자는 모든 관리 기능을 사용할 수 있으며, 직원 관리자 아이디 생성/비밀번호 재설정/해제가 가능합니다.' : '직원 관리자는 관리자모드 접속 권한만 부여된 상태입니다. 관리자 아이디 생성/해제는 최고관리자만 가능합니다.') + '</div>' +
        topSummary +
        renderAdminTodoSummary({ waitingContacts, paymentDue, paused, expiringDocs, expiredDocs, grace14Items }) +
        renderAdminStaffManager(members) + renderAdminContactManager();
    }

    function deleteItem(code) {
      const archive = getArchiveModule();
      if (archive.deleteItem) return archive.deleteItem(code);
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function clearAll() {
      const archive = getArchiveModule();
      if (archive.clearAll) return archive.clearAll();
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function getDocStatus(doc) {
      if (!doc.fileName) return doc.required ? '미첨부' : '선택안함';
      if (!doc.expiry || !doc.expireDate) return '첨부됨';
      const today = new Date();
      today.setHours(0,0,0,0);
      const end = new Date(doc.expireDate);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) return '만료';
      if (diff <= 30) return '만료임박';
      return '정상';
    }

    function getDdayText(dateValue) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateValue);
      const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (Number.isNaN(diff)) return '';
      if (diff < 0) return '만료 ' + Math.abs(diff) + '일 지남';
      if (diff === 0) return '오늘 만료';
      return 'D-' + diff;
    }

    function makeAlertSummary(docs) {
      const targets = ['equipmentInspection','insurancePolicy','ndtInspection','driverLicense'];
      const parts = targets.map(key => docs[key]).filter(Boolean).filter(doc => doc.expireDate).map(doc => doc.title + ' ' + getDdayText(doc.expireDate));
      return parts.length ? parts.join(' / ') : '만료날짜 입력 없음';
    }

    function openPreviewModal(src) {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (frame) frame.src = '';
      modal.classList.remove('pdf');
      img.src = src;
      modal.classList.add('show');
    }

    function openPdfPreview(src) {
      if (!src) {
        alert('PDF 미리보기 파일이 없습니다. 파일선택으로 다시 첨부하면 바로 미리볼 수 있습니다.');
        return;
      }
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (img) img.src = '';
      if (frame) frame.src = src;
      modal.classList.add('pdf');
      modal.classList.add('show');
    }

    function closePreviewModal() {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      modal.classList.remove('show');
      modal.classList.remove('pdf');
      img.src = '';
      if (frame) frame.src = '';
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function escapeJs(value) {
      return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
    }

    function getActiveInstallGuidePanel() {
      const panels = Array.from(document.querySelectorAll('[data-install-manual-guide]'));
      return panels.find(panel => {
        const screen = panel.closest('.screen');
        return screen && !screen.classList.contains('hidden');
      }) || panels[0] || null;
    }

    function setHomeInstallStatus(message) {
      document.querySelectorAll('[data-install-status]').forEach(status => { status.innerHTML = message; });
    }

    function isHomeInstallGuidePanelOpen() {
      const guide = getActiveInstallGuidePanel();
      return !!(guide && !guide.classList.contains('hidden'));
    }

    function openHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (message) setHomeInstallStatus(message);
      if (guide) {
        guide.classList.remove('hidden');
        updateHomeInstallButtonState();
        try { guide.scrollIntoView({ behavior:'smooth', block:'center' }); } catch (e) {}
      }
    }

    function closeHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (guide) guide.classList.add('hidden');
      if (message) setHomeInstallStatus(message);
      updateHomeInstallButtonState();
    }

    function isSitePassStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function getSitePassInstallFallbackMessage() {
      const ua = navigator.userAgent || '';
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isKakao = /KAKAOTALK/i.test(ua);
      const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';

      if (isSitePassStandalone()) {
        return '이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.';
      }
      if (location.protocol === 'file:') {
        return '현재는 PC에서 파일을 직접 연 상태라 설치창이 뜨지 않습니다. 정식 https 주소에 올린 뒤 <b>홈화면에 설치하기</b> 버튼을 확인해야 합니다.';
      }
      if (!isSecure) {
        return '설치창을 띄우려면 https 보안주소가 필요합니다. 정식 도메인 또는 HTTPS 베타 주소에서 다시 눌러주세요.';
      }
      if (isKakao) {
        return '카카오톡 안에서는 설치창이 잘 안 뜰 수 있습니다. 먼저 <b>외부 브라우저로 열기</b>를 누른 뒤 설치해주세요.';
      }
      if (isIOS) {
        return '아이폰은 버튼 한 번으로 설치창을 강제로 열 수 없습니다. 공유 버튼(□↑)에서 <b>홈 화면에 추가</b>를 눌러 저장합니다.';
      }
      return '브라우저가 아직 설치 가능 신호를 보내지 않았습니다. 20~30초 정도 사용 후 다시 누르거나, 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러주세요.';
    }

    function updateHomeInstallButtonState(message) {
      const buttons = Array.from(document.querySelectorAll('[data-install-primary-button]'));
      buttons.forEach(btn => {
        if (isSitePassStandalone()) {
          btn.textContent = '이미 설치됨';
          btn.disabled = true;
        } else if (isHomeInstallGuidePanelOpen()) {
          btn.textContent = '설치 안내 접기';
          btn.disabled = false;
        } else if (deferredSitePassInstallPrompt) {
          btn.textContent = '홈화면에 설치하기';
          btn.disabled = false;
        } else {
          btn.textContent = '홈화면에 설치하기';
          btn.disabled = false;
        }
      });
      if (message) setHomeInstallStatus(message);
    }

    async function addSitePassToHomeScreen(event) {
      if (event && event.preventDefault) event.preventDefault();

      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다. 필요하면 다시 <b>홈화면에 설치하기</b>를 눌러주세요.');
        return false;
      }

      if (isSitePassStandalone()) {
        openHomeInstallGuidePanel('이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.');
        updateHomeInstallButtonState();
        return false;
      }

      if (deferredSitePassInstallPrompt) {
        try {
          deferredSitePassInstallPrompt.prompt();
          const choice = await deferredSitePassInstallPrompt.userChoice;
          deferredSitePassInstallPrompt = null;
          if (choice && choice.outcome === 'accepted') {
            closeHomeInstallGuidePanel('홈화면 추가가 진행되었습니다. 설치가 끝나면 현장서류패스 아이콘으로 들어오면 됩니다.');
          } else {
            openHomeInstallGuidePanel('설치창을 닫았습니다. 필요하면 아래 방법으로 직접 추가할 수 있습니다.');
          }
          updateHomeInstallButtonState();
        } catch (e) {
          deferredSitePassInstallPrompt = null;
          openHomeInstallGuidePanel('이 브라우저에서는 자동 설치창이 뜨지 않아 아래 방법으로 직접 추가하면 됩니다.');
          updateHomeInstallButtonState();
        }
        return false;
      }

      openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      return false;
    }

    function showHomeInstallGuide(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다.');
      } else {
        openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      }
      return false;
    }


    const SITEPASS_RECOMMEND_INSTALL_URL = 'https://sitepass-js.github.io/sitepass/recommend.html';

    function getSitePassQueryParam(name) {
      try { return new URLSearchParams(location.search || '').get(name) || ''; } catch (e) { return ''; }
    }

    function isSitePassRecommendInstallRequest() {
      const install = getSitePassQueryParam('install');
      const ref = getSitePassQueryParam('ref') || getSitePassQueryParam('from');
      return install === '1' || install === 'home' || install === 'app' || ref === 'recommend' || ref === 'invite';
    }

    function copyRecommendInstallLink() {
      copyTextFallback(SITEPASS_RECOMMEND_INSTALL_URL, '추천용 설치 링크를 복사했습니다.\n카카오톡/문자로 보내면 받은 사람이 설치화면으로 바로 들어옵니다.');
    }

    function openRecommendInstallLanding() {
      if (!isSitePassRecommendInstallRequest()) return false;
      if (isSitePassStandalone()) return false;
      showScreen('installScreen', { replace:true });
      const linkText = document.getElementById('recommendInstallLinkText');
      if (linkText) linkText.textContent = SITEPASS_RECOMMEND_INSTALL_URL;
      setHomeInstallStatus('추천링크로 접속했습니다. 아래 <b>홈화면에 설치하기</b>를 누르면 설치 가능한 브라우저는 설치창이 열리고, 안 뜨면 수동 방법을 따라 추가하면 됩니다.');
      setTimeout(function() {
        if (!deferredSitePassInstallPrompt && !isSitePassStandalone()) {
          openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
        } else {
          updateHomeInstallButtonState('설치 준비가 완료되면 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
        }
      }, 900);
      return true;
    }

    // v23.7.259: PWA 자동업데이트/서비스워커 등록은 assets/js/pwa-update.js로 분리했습니다.
    const SITEPASS_APP_VERSION = (window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.appVersion) || 'v23.7.282';
    const SITEPASS_FIXED_APP_URL = 'https://sitepass-js.github.io/sitepass/';

    window.SitePassPwaRuntime = window.SitePassPwaRuntime || {};
    Object.assign(window.SitePassPwaRuntime, {
      getAppVersion: function(){ return SITEPASS_APP_VERSION; },
      getFixedAppUrl: function(){ return SITEPASS_FIXED_APP_URL; },
      setHomeInstallStatus: function(message){ return setHomeInstallStatus(message); },
      isStandalone: function(){ return isSitePassStandalone(); },
      hasDeferredInstallPrompt: function(){ return !!deferredSitePassInstallPrompt; }
    });

    function getPwaUpdateModule() {
      return window.SitePassPwaUpdate || {};
    }

    async function checkSitePassAutoUpdate() {
      const mod = getPwaUpdateModule();
      if (mod.checkAutoUpdate) return mod.checkAutoUpdate();
    }

    function registerSitePassServiceWorker() {
      const mod = getPwaUpdateModule();
      if (mod.registerServiceWorker) return mod.registerServiceWorker();
      setHomeInstallStatus('PWA 업데이트 파일을 불러오지 못했습니다. assets/js/pwa-update.js 업로드를 확인해주세요.');
    }

    window.forceSitePassUpdateReload = function() {
      const mod = getPwaUpdateModule();
      if (mod.forceUpdateReload) return mod.forceUpdateReload(SITEPASS_APP_VERSION);
      location.reload();
    };

    window.addEventListener('load', function() {
      setTimeout(checkSitePassAutoUpdate, 600);
      setTimeout(openRecommendInstallLanding, 1100);
    });

    const DEMO_MANAGER_CODE = 'SP-DEMO-00BO0000';

    function makeDemoPreviewDataUrl(title, line1, line2) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1260" viewBox="0 0 900 1260">' +
        '<rect width="900" height="1260" fill="#ffffff"/>' +
        '<rect x="55" y="55" width="790" height="1150" rx="28" fill="#f8fbff" stroke="#c9d3e4" stroke-width="5"/>' +
        '<text x="450" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="#172033">' + escapeHtml(title) + '</text>' +
        '<rect x="125" y="220" width="650" height="4" fill="#2457d6"/>' +
        '<text x="130" y="320" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#26334d">' + escapeHtml(line1) + '</text>' +
        '<text x="130" y="395" font-family="Arial, sans-serif" font-size="34" fill="#667085">' + escapeHtml(line2) + '</text>' +
        '<text x="130" y="500" font-family="Arial, sans-serif" font-size="30" fill="#667085">SitePass 담당자 화면 데모용 미리보기입니다.</text>' +
        '<rect x="130" y="575" width="640" height="420" rx="18" fill="#ffffff" stroke="#d7dfed" stroke-width="4"/>' +
        '<text x="450" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#173f9f">첨부 서류 이미지</text>' +
        '<text x="450" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#667085">실제 서비스에서는 촬영/업로드 원본이 표시됩니다.</text>' +
        '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function makeDemoDoc(key, groupKey, groupTitle, title, required, expiry, expireDate, fileName, index) {
      const preview = makeDemoPreviewDataUrl(title, '장비: 굴착기 / 00보0000', expireDate ? ('만료일: ' + expireDate) : '유효기간 확인용 서류');
      const doc = {
        key, groupKey, groupTitle, title, required:!!required, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:preview, originalDataUrl:preview, correctedDataUrl:preview, previewChoice:'preview', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'demo',
        fileType:'image/png',
        previewDataUrl:preview,
        originalDataUrl:preview,
        correctedDataUrl:preview,
        previewChoice:'preview',
        autoFit:'demo',
        driverPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        personPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        workerPhone:'',
        workerTask:'',
        authVerified:true,
        authVerifiedAt:new Date().toISOString()
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function ensureManagerDemoItem() {
      const nowIso = new Date().toISOString();
      const expireIso = addDaysIso(nowIso, 7);
      const demoDocs = {
        businessLicense: makeDemoDoc('businessLicense','equipment','장비서류','사업자등록증',true,false,'','굴착기_00보0000_사업자등록증.png'),
        equipmentRegistration: makeDemoDoc('equipmentRegistration','equipment','장비서류','장비등록증',true,false,'','굴착기_00보0000_장비등록증.png'),
        equipmentInspection: makeDemoDoc('equipmentInspection','equipment','장비서류','장비검사증',true,true,formatDateOnly(addDaysIso(nowIso, 120)),'굴착기_00보0000_장비검사증.png'),
        insurancePolicy: makeDemoDoc('insurancePolicy','equipment','장비서류','장비보험증권',true,true,formatDateOnly(addDaysIso(nowIso, 80)),'굴착기_00보0000_장비보험증권.png'),
        specSheet: makeDemoDoc('specSheet','equipment','장비서류','장비제원표',false,false,'','굴착기_00보0000_장비제원표.png'),
        driverIdCard: makeDemoDoc('driverIdCard','driver','장비기사서류','기사 신분증',true,false,'','굴착기_00보0000_기사신분증.png'),
        driverLicense: makeDemoDoc('driverLicense','driver','장비기사서류','기사면허증',true,false,'','굴착기_00보0000_기사면허증.png'),
        driverBasicSafetyTraining: makeDemoDoc('driverBasicSafetyTraining','driver','장비기사서류','기사 건설기초안전보건교육 이수증',true,false,'','굴착기_00보0000_기사기초안전교육.png')
      };
      const owner = getAdminSampleEquipmentOwner();
      const item = {
        code:DEMO_MANAGER_CODE,
        type:'BUNDLE',
        equipmentNo:'00보0000',
        equipmentName:'굴착기',
        ownerMemberId:owner.id,
        ownerSignupId:owner.signupId,
        ownerProviderId:owner.providerId,
        ownerName:owner.name,
        ownerPhone:owner.phone,
        bundleMeta:{ unit:'통합 서류함 1건', includedGroups:['equipment','driver'], includedGroupNames:['장비서류','장비기사서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:'실사용 베타 운영 중입니다' },
        workerPeople:[],
        qrLink:makeQrLink(DEMO_MANAGER_CODE),
        docs:demoDocs,
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:addDaysIso(nowIso, TRIAL_DAYS),
        serviceStatus:'실사용베타',
        paymentPlan:'monthly',
        basicPlan:'실사용 베타 운영 중입니다',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:expireIso,
        demo:true
      };
      const items = getItems();
      const idx = items.findIndex(x => x.code === DEMO_MANAGER_CODE);
      if (idx >= 0) items[idx] = { ...items[idx], ...item };
      else items.unshift(item);
      setItems(items);
      return item;
    }



    const PAYMENT_TEST_MEMBER_PREFIX = 'MEM-PAYTEST-';
    const PAYMENT_TEST_CODE_PREFIX = 'SP-PAYTEST-';

    function isPaymentTestMember(member) {
      return String(member?.id || '').startsWith(PAYMENT_TEST_MEMBER_PREFIX) || member?.paymentConversionTest === true;
    }

    function isPaymentTestItem(item) {
      return String(item?.code || '').startsWith(PAYMENT_TEST_CODE_PREFIX) || item?.paymentConversionTest === true;
    }

    function getPaymentConversionTestStats(items, members) {
      const testItems = (items || getItems()).filter(isPaymentTestItem);
      const testMembers = (members || getMembers()).filter(isPaymentTestMember);
      const paidItems = testItems.filter(item => !isServiceShareBlocked(item)).length;
      const blockedItems = testItems.filter(item => isServiceShareBlocked(item)).length;
      const unpaidItems = testItems.filter(item => item.paymentTestPaid !== true).length;
      return { testMembers:testMembers.length, testItems:testItems.length, paidItems, blockedItems, unpaidItems };
    }

    function renderPaymentConversionTestPanel(items, members) {
      // 운영 화면에서는 유료전환 차단검사 및 임시 테스트 칸을 표시하지 않습니다.
      return '';
    }

    function makePaymentTestMember(index, paid) {
      const padded = String(index).padStart(2, '0');
      const nowIso = new Date().toISOString();
      const futureEnd = addDaysIso(nowIso, 30);
      const trialEnd = addDaysIso(nowIso, 7);
      return {
        id:PAYMENT_TEST_MEMBER_PREFIX + padded,
        name:'임시 회원' + padded,
        phone:'010-77' + String(1000 + index).slice(-4) + '-' + String(2000 + index).slice(-4),
        signupId:'paytest' + padded,
        provider:'SitePass',
        providerId:'SITEPASS-paytest' + padded,
        signupMethod:'SitePass 베타가입',
        status:paid ? '1개월권' : '실사용베타',
        paymentPlanLabel:paid ? '1개월권' : '실사용베타',
        memberPlan:paid ? '1개월권' : '실사용베타',
        paymentStartedAt:nowIso,
        paymentEndsAt:paid ? futureEnd : trialEnd,
        paymentStatus:paid ? '신규결제완료' : '베타사용중',
        createdAt:nowIso,
        lastLoginAt:nowIso,
        lastLoginMethod:'SitePass 베타가입',
        adminMemo:'유료전환 차단 확인용 임시 회원입니다.',
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    function makePaymentTestDoc(key, title, expiry, expireDate, equipmentName, equipmentNo) {
      const fileName = equipmentName + '_' + equipmentNo + '_' + title + '.png';
      const doc = {
        key, groupKey:'equipment', groupTitle:'장비서류', title, required:true, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:'', originalDataUrl:'', correctedDataUrl:'', previewChoice:'', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'payment-test',
        fileType:'image/png',
        previewDataUrl:'',
        originalDataUrl:'',
        correctedDataUrl:'',
        previewChoice:'',
        autoFit:'payment-test-light',
        storageLight:true
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function makePaymentTestItem(member, memberIndex, equipmentIndex, paid) {
      const nowIso = new Date().toISOString();
      const equipmentNo = String(10 + memberIndex).padStart(2, '0') + '보' + String(1000 + equipmentIndex).slice(-4);
      const equipmentName = equipmentIndex % 3 === 0 ? '지게차' : (equipmentIndex % 2 === 0 ? '덤프트럭' : '굴착기');
      const code = PAYMENT_TEST_CODE_PREFIX + String(equipmentIndex).padStart(3, '0');
      const trialEnd = addDaysIso(nowIso, 7);
      const paidEnd = addDaysIso(nowIso, 30);
      return {
        code,
        type:'BUNDLE',
        equipmentNo,
        equipmentName,
        ownerMemberId:member.id,
        ownerSignupId:member.signupId,
        ownerProviderId:member.providerId,
        ownerName:member.name,
        ownerPhone:member.phone,
        bundleMeta:{ unit:'통합 서류함 1건', includedGroups:['equipment'], includedGroupNames:['장비서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:paid ? '1개월권 결제완료' : '실사용베타 후 미결제 예정' },
        workerPeople:[],
        qrLink:makeQrLink(code),
        docs:{
          businessLicense:makePaymentTestDoc('businessLicense','사업자등록증',false,'',equipmentName,equipmentNo),
          equipmentRegistration:makePaymentTestDoc('equipmentRegistration','장비등록증',false,'',equipmentName,equipmentNo),
          equipmentInspection:makePaymentTestDoc('equipmentInspection','장비검사증',true,formatDateOnly(addDaysIso(nowIso, 90)),equipmentName,equipmentNo),
          insurancePolicy:makePaymentTestDoc('insurancePolicy','장비보험증권',true,formatDateOnly(addDaysIso(nowIso, 60)),equipmentName,equipmentNo)
        },
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:paid ? paidEnd : trialEnd,
        serviceStatus:paid ? '유료사용' : '실사용베타',
        paymentPlan:paid ? 'monthly' : 'trial',
        basicPlan:paid ? '월 결제 · 월 2,000원' : '실사용베타 후 결제대기',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        paidAt:paid ? nowIso : '',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:addDaysIso(nowIso, 7),
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    async function syncPaymentTestMembersToSupabase(testMembers) {
      if (!window.sitepassSupabase || !Array.isArray(testMembers) || !testMembers.length) {
        return { ok:false, total:0, saved:0, failed:0, skipped:!window.sitepassSupabase };
      }
      let saved = 0;
      let failed = 0;
      for (const member of testMembers) {
        try {
          await saveMemberToSupabase(member);
          saved += 1;
        } catch (error) {
          failed += 1;
          console.warn('임시 회원 Supabase 저장 실패:', member && member.signupId, error);
        }
      }
      return { ok:failed === 0, total:testMembers.length, saved, failed, skipped:false };
    }

    async function deletePaymentTestMembersFromSupabase() {
      if (!window.sitepassSupabase) return { ok:false, deleted:0, skipped:true };
      try {
        const { error } = await window.sitepassSupabase
          .from('sitepass_members')
          .delete()
          .like('login_id', 'paytest%');
        if (error) {
          console.warn('Supabase 임시 회원 삭제 실패:', error.message);
          return { ok:false, deleted:0, skipped:false };
        }
        console.log('Supabase 임시 회원 삭제 완료: paytest%');
        return { ok:true, deleted:50, skipped:false };
      } catch (error) {
        console.warn('Supabase 임시 회원 삭제 예외:', error);
        return { ok:false, deleted:0, skipped:false };
      }
    }

    async function createPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 생성은 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 생성할까요?\n\n기존 임시 데이터는 지우고 다시 만듭니다. 실제 회원/장비는 유지됩니다.')) return;
      const nowIso = new Date().toISOString();
      const existingMembers = getMembers().filter(member => !isPaymentTestMember(member));
      const existingItems = getItems().filter(item => !isPaymentTestItem(item));
      const testMembers = [];
      const testItems = [];
      for (let i = 1; i <= 50; i++) {
        const paid = i <= 20;
        const member = makePaymentTestMember(i, paid);
        testMembers.push(member);
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 1, paid));
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 2, paid));
      }
      const nextMembers = testMembers.concat(existingMembers);
      const nextItems = testItems.concat(existingItems);
      const savedItems = setItems(nextItems);
      if (!savedItems) {
        alert('임시 장비 100대 저장에 실패했습니다.\n\n브라우저 임시 저장공간이 부족하거나 기존 사진 데이터가 너무 큽니다. 기존 임시 데이터/큰 사진 서류를 삭제한 뒤 다시 시도해주세요.\n회원만 생성되고 장비가 0대로 보이는 오류를 막기 위해 이번 생성은 중단했습니다.');
        renderAdmin();
        return;
      }
      try {
        setMembers(nextMembers);
      } catch (error) {
        setItems(existingItems);
        alert('임시 회원 50명 저장에 실패했습니다.\n\n브라우저 저장공간을 비운 뒤 다시 시도해주세요. 장비 데이터는 이전 상태로 되돌렸습니다.');
        renderAdmin();
        return;
      }

      const supabaseResult = await syncPaymentTestMembersToSupabase(testMembers);
      const supabaseMessage = supabaseResult.skipped
        ? '\n\nSupabase 연결이 없어 브라우저에만 저장되었습니다.'
        : '\n\nSupabase sitepass_members 저장: ' + supabaseResult.saved + '명' + (supabaseResult.failed ? ' / 실패 ' + supabaseResult.failed + '명' : '');

      alert('임시 데이터 생성 완료\n\n회원 50명 / 장비 100대\n- 결제완료 회원 20명, 장비 40대\n- 실사용베타 회원 30명, 장비 60대' + supabaseMessage + '\n\n다음으로 [베타기간 강제 종료]를 누르면 미결제 장비 60대가 QR 차단 대상이 됩니다.');
      renderAdmin();
    }

    function expireUnpaidPaymentTestData() {
      if (!isSuperAdminLoggedIn()) { alert('베타기간 종료 처리는 최고관리자만 가능합니다.'); return; }
      const items = getItems();
      const members = getMembers();
      const unpaidItems = items.filter(item => isPaymentTestItem(item) && item.paymentTestPaid !== true);
      if (!unpaidItems.length) { alert('강제 종료할 미결제 임시 장비가 없습니다. 먼저 임시 데이터를 생성해주세요.'); return; }
      const yesterday = addDaysIso(new Date().toISOString(), -1);
      const grace15 = addDaysIso(new Date().toISOString(), -15);
      const unpaidMemberIds = new Set();
      items.forEach(item => {
        if (isPaymentTestItem(item) && item.paymentTestPaid !== true) {
          const seq = Number(String(item.code || '').replace(PAYMENT_TEST_CODE_PREFIX, '')) || 0;
          item.trialEndsAt = seq > 80 ? grace15 : yesterday;
          item.serviceStatus = seq > 80 ? '유예14일경과' : '실사용베타만료';
          item.updatedAt = new Date().toISOString();
          item.managerExpireAt = yesterday;
          unpaidMemberIds.add(item.ownerMemberId);
        }
      });
      members.forEach(member => {
        if (isPaymentTestMember(member) && member.paymentTestPaid !== true) {
          const idx = Number(String(member.id || '').replace(PAYMENT_TEST_MEMBER_PREFIX, '')) || 0;
          member.status = idx > 40 ? '정지' : '미결제';
          member.paymentPlanLabel = '미결제';
          member.memberPlan = '미결제';
          member.paymentStatus = '베타종료 미결제';
          member.paymentEndsAt = idx > 40 ? grace15 : yesterday;
          member.updatedAt = new Date().toISOString();
        }
      });
      setItems(items);
      setMembers(members);
      alert('베타기간 강제 종료 완료\n\n미결제 임시 장비 60대가 QR 차단 대상입니다.\n그중 뒤쪽 20대는 유예 14일 이상으로 잡히게 했습니다.\n\n이제 [QR 차단검사]를 눌러 확인하세요.');
      renderAdmin();
    }

    function runPaymentConversionShareBlockTest() {
      const stats = getPaymentConversionTestStats();
      if (!stats.testItems) { alert('임시 데이터가 없습니다. 먼저 임시 50명 / 장비 100대를 생성해주세요.'); return; }
      const testItems = getItems().filter(isPaymentTestItem);
      const blocked = testItems.filter(item => isServiceShareBlocked(item));
      const allowed = testItems.filter(item => !isServiceShareBlocked(item));
      const expiredUnpaid = testItems.filter(item => item.paymentTestPaid !== true && item.trialEndsAt && new Date(item.trialEndsAt).getTime() < Date.now());
      if (!expiredUnpaid.length) { alert('아직 베타기간이 끝난 미결제 장비가 없습니다.\n먼저 [베타기간 강제 종료]를 눌러주세요.'); return; }
      const failed = expiredUnpaid.filter(item => !isServiceShareBlocked(item));
      const paidBlocked = testItems.filter(item => item.paymentTestPaid === true && isServiceShareBlocked(item));
      const resultOk = failed.length === 0 && paidBlocked.length === 0;
      alert('QR 차단검사 결과\n\n총 임시 장비: ' + testItems.length + '대\nQR 가능: ' + allowed.length + '대\nQR 차단: ' + blocked.length + '대\n베타종료 미결제 장비: ' + expiredUnpaid.length + '대\n\n베타종료 미결제인데 보내지는 오류: ' + failed.length + '대\n결제했는데 막히는 오류: ' + paidBlocked.length + '대\n\n' + (resultOk ? '정상입니다. 베타기간이 끝난 미결제 장비는 QR 보내기/링크열람이 차단됩니다.' : '오류가 있습니다. 위 숫자를 확인해야 합니다.'));
    }

    async function clearPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 삭제는 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 삭제할까요?\n실제 회원/장비는 유지됩니다.')) return;
      setMembers(getMembers().filter(member => !isPaymentTestMember(member)));
      setItems(getItems().filter(item => !isPaymentTestItem(item)));
      const supabaseResult = await deletePaymentTestMembersFromSupabase();
      const supabaseMessage = supabaseResult.skipped ? '\nSupabase 연결이 없어 브라우저 임시 데이터만 삭제했습니다.' : '\nSupabase sitepass_members의 paytest 임시 회원도 삭제 처리했습니다.';
      alert('임시 유료전환 임시 데이터를 삭제했습니다.' + supabaseMessage);
      renderAdmin();
    }

    function getLocalDateKey(value) {
      const date = value ? new Date(value) : new Date();
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function getVisitStats() {
      try {
        const saved = JSON.parse(localStorage.getItem(VISIT_STATS_KEY) || 'null');
        if (saved && typeof saved === 'object') {
          return {
            total: Number(saved.total || 0),
            daily: saved.daily && typeof saved.daily === 'object' ? saved.daily : {}
          };
        }
      } catch (e) {}
      return { total:0, daily:{} };
    }

    function setVisitStats(stats) {
      localStorage.setItem(VISIT_STATS_KEY, JSON.stringify({
        total:Number(stats?.total || 0),
        daily:stats?.daily && typeof stats.daily === 'object' ? stats.daily : {}
      }));
    }

    function recordSiteVisit() {
      const todayKey = getLocalDateKey();
      const stats = getVisitStats();
      stats.total = Number(stats.total || 0) + 1;
      stats.daily = stats.daily && typeof stats.daily === 'object' ? stats.daily : {};
      stats.daily[todayKey] = Number(stats.daily[todayKey] || 0) + 1;
      const recentDays = {};
      Object.keys(stats.daily).sort().slice(-31).forEach(key => { recentDays[key] = Number(stats.daily[key] || 0); });
      stats.daily = recentDays;
      setVisitStats(stats);
      return stats;
    }

    function countTodaySignups(members) {
      const todayKey = getLocalDateKey();
      return (members || []).filter(member => getLocalDateKey(member?.createdAt) === todayKey).length;
    }

    function renderAdminQuickLine(label, value, action) {
      if (!action) return '<div class="line"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></div>';
      return '<button type="button" class="admin-quick-line" onclick="' + action + '"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></button>';
    }

    function renderAdminTodoSummary(data) {
      const rows = [
        { label:'문의 답변대기', value:(data.waitingContacts || 0) + '건', action:'openAdminContactManager()' },
        { label:'QR 일시정지', value:(data.paused || 0) + '건', action:'openAdminListQuickFilter(\'paused\')' },
        { label:'서류 만료임박', value:(data.expiringDocs || 0) + '건', action:'openAdminListQuickFilter(\'expiring\')' },
        { label:'서류 만료', value:(data.expiredDocs || 0) + '건', action:'openAdminListQuickFilter(\'expired\')' },
        { label:'유예 14일 이상', value:(data.grace14Items || 0) + '건', action:'openAdminListQuickFilter(\'grace14\')' }
      ];
      const rowHtml = rows.map(item => renderAdminQuickLine(item.label, item.value, item.action)).join('');
      return '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>확인해야 할 사항</h3>' +
        '<div class="notice blue-note" style="margin-top:0;">중복되는 항목은 빼고, 바로 눌러서 이동할 항목만 남겼습니다. 유예 14일 이상 경과한 서류함도 별도로 확인합니다.</div>' +
        rowHtml +
      '</div>';
    }

    function ensureAdminSampleData() {
      // v23.7.112부터는 실제 가입 확인를 위해 샘플 회원/샘플 장비서류를 자동 생성하지 않습니다.
    }

    function resetSitePassTestDataOnce() {
      // v23.7.198부터 수정본 배포 시 실제 가입 회원/카카오/네이버/일반 회원 localStorage 데이터를 자동 삭제하지 않고, 탈퇴 카카오 계정은 자동로그인을 차단합니다.
      // 이전 베타 초기화 키가 없더라도 아무 데이터도 지우지 않고 방문자수만 기록합니다.
      return false;
    }

    function openManagerDemoView() {
      const item = ensureManagerDemoItem();
      openManagerPublicView(item.code, getManagerExpireAt(item));
    }

    function openManagerDemoDetail() {
      const item = ensureManagerDemoItem();
      renderDetail(item.code);
    }

    function checkHash() {
      const hash = window.location.hash || '';
      if (hash.startsWith('#pay=')) {
        handleAutoPaymentHash(hash);
        return true;
      }
      if (hash.startsWith('#manager=')) {
        const parsed = parseManagerHash(hash);
        renderManagerPrintFromHash(parsed);
        return true;
      }
      if (hash.startsWith('#qr=')) {
        const code = decodeURIComponent(hash.replace('#qr=', ''));
        renderPublic(code);
        return true;
      }
      if (hash === '#admin' || hash === '#관리자') {
        showScreen(isAdminLoggedIn() ? 'adminScreen' : 'signupScreen');
        return true;
      }
      return false;
    }

    window.addEventListener('popstate', function(event) {
      const state = event.state || {};
      if (state.sitepassScreen) {
        sitePassHandlingPopState = true;
        showScreen(state.sitepassScreen, { skipHistory:true });
        sitePassHandlingPopState = false;
        return;
      }
      if (window.location.hash && checkHash()) return;
      const fallbackScreen = isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen');
      sitePassHandlingPopState = true;
      showScreen(fallbackScreen, { skipHistory:true });
      sitePassHandlingPopState = false;
    });

    window.addEventListener('hashchange', checkHash);
    try { window.matchMedia('(display-mode: standalone)').addEventListener('change', updateQuickAuthUi); } catch (e) {}
    window.addEventListener('beforeinstallprompt', function(event) {
      event.preventDefault();
      deferredSitePassInstallPrompt = event;
      updateHomeInstallButtonState(isSitePassRecommendInstallRequest()
        ? '추천링크 설치 준비가 완료되었습니다. <b>홈화면에 설치하기</b>를 누르면 설치창이 열립니다.'
        : '이 브라우저에서는 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
    });

    window.addEventListener('appinstalled', function() {
      deferredSitePassInstallPrompt = null;
      closeHomeInstallGuidePanel('홈화면 추가가 완료되었습니다. 이제 현장서류패스 아이콘으로 들어오면 됩니다.');
      updateHomeInstallButtonState();
      updateQuickAuthUi();
    });

    async function bootSitePassApp() {
      try {
        updateSignupTermsUi();
        registerSitePassServiceWorker();
        updateHomeInstallButtonState();
        clearLegacyAutoLoginState();
        const didCleanReset = resetSitePassTestDataOnce();
        ensureAdminSampleData();
        if (!didCleanReset) recordSiteVisit();

        renderDocCards();
        renderAlertPreview();
        setupRegistrationDraftAutoSave();
        setupJuminLimitDelegates();
        restorePwaAutoMemberSession();
        refreshAdminUi();
        refreshMemberUi();
        try { setTimeout(function(){ syncSupabaseEquipmentItems(true); }, 600); } catch (e) {}
        updateQuickAuthUi();
        // v23.7.248: “로그인 확인 중입니다” 차단 화면을 더 이상 오래 띄우지 않습니다.
        // OAuth 확인은 뒤에서 진행하되, 사용자가 화면에 갇히지 않게 먼저 공개합니다.
        try { document.body.classList.remove('sitepass-booting'); } catch (e) {}
        // v23.7.246: 소셜 로그인 확인 과정이 외부 OAuth/Userinfo 응답 대기로 멈춰도
        // 화면이 '로그인 확인 중입니다'에 갇히지 않게 안전 타이머를 먼저 걸어둡니다.
        let sitePassBootWatchdogFired = false;
        const sitePassBootWatchdog = setTimeout(function(){
          if (document.body.classList.contains('sitepass-booting')) {
            sitePassBootWatchdogFired = true;
            try { removeSessionValue(SITEPASS_OAUTH_PENDING_KEY); } catch (e) {}
            document.body.classList.remove('sitepass-booting');
            alert('네이버 로그인 확인 시간이 길어져 중단했습니다.\n\nSupabase Edge Function의 Verify JWT가 OFF인지, 네이버 Provider의 Userinfo URL이 실제 함수 주소인지 확인해주세요.');
            showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
          }
        }, 18000);
        const handledOAuth = await handleSupabaseKakaoOAuthReturn();
        clearTimeout(sitePassBootWatchdog);
        if (sitePassBootWatchdogFired) return;
        if (!handledOAuth && !checkHash()) {
          const initialScreen = isAdminLoggedIn()
            ? 'adminScreen'
            : (isMemberLoggedIn() ? (isSitePassInstalledAppMode() ? 'listScreen' : 'homeScreen') : 'signupScreen');
          showScreen(initialScreen, { replace:true });
          promptRegistrationDraftIfNeeded('startup');
        }
      } catch (e) {
        console.error('SitePass 초기 화면 처리 오류:', e);
        document.body.classList.remove('sitepass-booting');
        alert('첫 화면 처리 중 오류가 났습니다. 새로고침 후에도 반복되면 최신 수정본을 다시 올려주세요.\n' + (e?.message || ''));
        showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
      }
      setTimeout(function(){ document.body.classList.remove('sitepass-booting'); }, 3000);
    }
    bootSitePassApp();


    // v23.7.123 - 날짜 표시칸 깜박임 방지 보강
    (function setupDateInputBlinkFix(){
      if (window.__sitePassDateInputBlinkFix) return;
      window.__sitePassDateInputBlinkFix = true;

      document.addEventListener('focusin', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-display]')) {
          setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
          return;
        }
        if (input.matches('input[type="date"]')) input.style.caretColor = 'transparent';
      });

      document.addEventListener('change', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-real]')) syncCleanDatePicker(input);
        if (input.matches('input[type="date"]')) setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
      });
    })();
