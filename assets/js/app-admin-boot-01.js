// SitePass v23.7.299 - app-admin-boot split continue (01/08)
// SitePass v23.7.299 - app.bundle.js remaining split (04 admin/pwa/boot)


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
