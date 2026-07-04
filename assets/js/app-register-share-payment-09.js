// SitePass v23.7.299 - app-register-share-payment split continue (09/09)
function normalizePendingRegistrationTier(pending) {
      if (!pending || !pending.item) return pending;
      const member = getEquipmentRegistrationOwnerMember ? getEquipmentRegistrationOwnerMember() : (getCurrentMemberTest() || null);
      const paidCount = getActivePaidRegistrationItemsForCurrentOwner(member, pending.item.code).length;
      const fixedTier = paidCount > 0 ? 'additional' : 'first';
      if (pending.paymentTier !== fixedTier) {
        pending = { ...pending, paymentTier: fixedTier, fixedAt: new Date().toISOString(), fixedReason: 'active_paid_equipment_count' };
        pendingRegistrationItemMemory = pending;
        try { sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending)); } catch (e) {}
        try { localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending)); } catch (e) {}
      }
      return pending;
    }

    function hasRegisteredEquipmentBundle() {
      return getActivePaidRegistrationItemsForCurrentOwner(getCurrentMemberTest() || null, '').length > 0;
    }

    function updateHomeRegistrationButton() {
      const btn = document.getElementById('homeRegisterButton');
      if (!btn) return;
      btn.textContent = hasRegisteredEquipmentBundle() ? '장비/기사/인력 추가등록' : '장비/기사/인부 등록';
    }

    function getPendingRegistrationTierText(pending) {
      const additional = pending ? pending.paymentTier === 'additional' : isAdditionalRegistrationContext();
      return additional ? '2대부터 추가등록' : '첫 장비 1대 등록';
    }

    function renderPendingRegistrationPaymentBox() {
      const box = document.getElementById('pendingRegistrationPaymentBox');
      if (!box) return;
      const pending = getPendingRegistration();
      if (!pending || !pending.item) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
      }
      const item = pending.item;
      const tierText = getPendingRegistrationTierText(pending);
      const member = getCurrentMemberTest() || {};
      box.classList.remove('hidden');
      box.innerHTML = '<div class="pending-pay-head"><b>결제 대기 중인 등록서류</b><span>' + escapeHtml(tierText) + '</span></div>' +
        '<div class="pay-pending-summary"><b>' + escapeHtml(item.equipmentName || '장비명 없음') + '</b><span>' + escapeHtml(item.equipmentNo || '번호 없음') + '</span></div>' +
        '<div class="payment-owner-verify-box" id="paymentOwnerVerifyBox">' +
          '<div class="payment-owner-title"><b id="paymentOwnerMethodTitle">카드결제 정보 입력</b><span>현재 테스트 결제</span></div>' +
          '<div class="payment-method-buttons" role="group" aria-label="결제수단 선택">' +
            '<button type="button" class="active" data-payment-owner-method="card" onclick="setPaymentOwnerMethod(\'card\')">카드결제</button>' +
            '<button type="button" data-payment-owner-method="phone" onclick="setPaymentOwnerMethod(\'phone\')">휴대폰결제</button>' +
            '<button type="button" data-payment-owner-method="account" onclick="setPaymentOwnerMethod(\'account\')">계좌이체</button>' +
          '</div>' +
          '<div id="paymentOwnerCommonBox">' +
            '<div class="person-auth-grid">' +
              '<input id="paymentOwnerName" type="text" placeholder="명의자 이름" value="' + escapeHtml(member.name || '') + '" autocomplete="name" />' +
              '<input id="paymentOwnerJuminMasked" type="text" placeholder="주민번호 예: 840507-1" maxlength="8" inputmode="numeric" autocomplete="off" oninput="limitPaymentOwnerJuminInput()" onpaste="setTimeout(limitPaymentOwnerJuminInput,0)" onblur="formatPaymentOwnerJuminDisplay()" />' +
            '</div>' +
          '</div>' +
          '<div id="paymentOwnerCardBox">' +
            '<div class="person-auth-grid">' +
              '<select id="paymentCardCompany"><option value="">카드사 선택</option><option value="신한카드">신한카드</option><option value="삼성카드">삼성카드</option><option value="국민카드">국민카드</option><option value="현대카드">현대카드</option><option value="롯데카드">롯데카드</option><option value="하나카드">하나카드</option><option value="우리카드">우리카드</option><option value="BC카드">BC카드</option><option value="농협카드">농협카드</option></select>' +
              '<input id="paymentCardNumber" type="text" placeholder="카드번호 0000 0000 0000 0000" inputmode="numeric" autocomplete="cc-number" oninput="formatPaymentCardNumberInput(this)" />' +
            '</div>' +
            '<div class="person-auth-grid">' +
              '<input id="paymentCardExpiry" type="text" placeholder="유효기간 MM/YY" inputmode="numeric" maxlength="5" autocomplete="cc-exp" oninput="limitPaymentCardExpiryInput(this)" />' +
              '<input id="paymentCardPassword2" type="password" placeholder="비밀번호 앞 2자리" inputmode="numeric" maxlength="2" autocomplete="off" />' +
            '</div>' +
            '<div class="auth-mini-note">실제 카드 승인 전 단계입니다. 지금 입력값은 테스트 확인용이며 정식 결제는 PG사 연결 후 처리합니다.</div>' +
          '</div>' +
          '<div id="paymentOwnerPhoneBox" class="hidden">' +
            '<div class="person-auth-grid">' +
              '<select id="paymentOwnerCarrier"><option value="">통신사 선택</option><option value="SKT">SKT</option><option value="KT">KT</option><option value="LG U+">LG U+</option><option value="SKT 알뜰폰">SKT 알뜰폰</option><option value="KT 알뜰폰">KT 알뜰폰</option><option value="LG U+ 알뜰폰">LG U+ 알뜰폰</option></select>' +
              '<input id="paymentOwnerPhone" type="tel" placeholder="휴대폰번호 예: 010-0000-0000" value="' + escapeHtml(member.phone || '') + '" inputmode="tel" autocomplete="tel" />' +
            '</div>' +
            '<input id="paymentOwnerCode" type="text" placeholder="휴대폰 인증번호 123456" inputmode="numeric" maxlength="6" autocomplete="one-time-code" />' +
          '</div>' +
          '<div id="paymentOwnerAccountBox" class="hidden">' +
            '<div class="notice blue-note">계좌이체는 정식 서비스에서 PG/은행 인증으로 확인합니다. 현재 테스트 확인번호는 1234입니다.</div>' +
            '<div class="person-auth-grid">' +
              '<select id="paymentOwnerBank"><option value="">은행 선택</option><option value="국민은행">국민은행</option><option value="신한은행">신한은행</option><option value="우리은행">우리은행</option><option value="하나은행">하나은행</option><option value="농협은행">농협은행</option><option value="기업은행">기업은행</option></select>' +
              '<input id="paymentOwnerAccountCode" type="text" placeholder="계좌이체 확인번호 1234" inputmode="numeric" maxlength="4" />' +
            '</div>' +
          '</div>' +
          '<div id="paymentOwnerVerifyStatus" class="auth-mini-note">카드사를 선택하고 카드번호/유효기간을 입력하세요. 현재는 실제 승인 없는 테스트 결제입니다.</div>' +
        '</div>' +
        '<div class="small">결제를 완료하면 이 장비는 보관함과 전체 장비등록수에 활성 장비로 표시됩니다. 현재는 테스트 결제 화면입니다.</div>';
      setPaymentOwnerMethod('card');
    }

    function getSelectedPaymentPlan() {
      const checked = document.querySelector('input[name="paymentPlan"]:checked');
      return checked?.value || localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly';
    }

    function isAdditionalRegistrationContext() {
      const pending = getPendingRegistration();
      if (pending && pending.paymentTier) return pending.paymentTier === 'additional';
      return getActivePaidRegistrationItemsForCurrentOwner(getCurrentMemberTest() || null, '').length > 0;
    }

    function isAdditionalPaymentItem(item, list) {
      const items = Array.isArray(list) ? list : getItems();
      if (!item || items.length <= 1) return false;
      const oldest = items[items.length - 1];
      return String(item.code || '') !== String(oldest?.code || '');
    }

    function getPlanInfo(plan, options) {
      const payments = getAdminPaymentsModule();
      if (payments.getPlanInfo) return payments.getPlanInfo(plan, options);
      const additional = typeof options === 'boolean' ? options : !!(options && options.additional);
      if (plan === 'annual') {
        const price = additional ? '연 9,900원' : '연 19,900원';
        const label = additional ? '추가등록 연 결제' : '1대 등록 연 결제';
        return { key:'annual', label, price, days:365, serviceStatus:'유료사용', planText:label + ' · ' + price, additional };
      }
      const price = additional ? '월 1,000원' : '월 2,000원';
      const label = additional ? '추가등록 월 결제' : '1대 등록 월 결제';
      return { key:'monthly', label, price, days:30, serviceStatus:'유료사용', planText:label + ' · ' + price, additional };
    }

    function updateSelectedPaymentPlan() {
      const plan = getSelectedPaymentPlan();
      localStorage.setItem(SELECTED_PAYMENT_PLAN_KEY, plan);
      const additional = isAdditionalRegistrationContext();
      const info = getPlanInfo(plan, { additional });
      const monthlyInfo = getPlanInfo('monthly', { additional });
      const annualInfo = getPlanInfo('annual', { additional });
      const monthlyPrice = document.getElementById('monthlyPlanPriceText');
      const annualPrice = document.getElementById('annualPlanPriceText');
      const monthlyDesc = document.getElementById('monthlyPlanDescText');
      const annualDesc = document.getElementById('annualPlanDescText');
      const registerButton = document.getElementById('paymentRegisterButton');
      const pending = getPendingRegistration();
      if (monthlyPrice) monthlyPrice.textContent = monthlyInfo.price;
      if (annualPrice) annualPrice.textContent = annualInfo.price;
      if (monthlyDesc) monthlyDesc.textContent = additional ? '2대부터 추가등록 기준. 한 달씩 이용하는 방식입니다.' : '처음 1대 등록 기준. 한 달씩 이용하는 방식입니다.';
      if (annualDesc) annualDesc.textContent = additional ? '2대부터 추가등록 기준. 1년 동안 이용하는 방식입니다.' : '처음 1대 등록 기준. 1년 동안 이용하는 방식입니다.';
      if (registerButton) registerButton.textContent = window.SITEPASS_TEST_NO_PAYMENT_MODE ? (pending ? '결제없이 QR링크 생성' : '테스트 등록 시작') : (pending ? '결제하고 QR링크 생성' : (additional ? '선택한 결제방법으로 추가등록하기' : '선택한 결제방법으로 1대 등록하기'));
      const note = document.getElementById('selectedPlanNote');
      if (note) {
        note.innerHTML = window.SITEPASS_TEST_NO_PAYMENT_MODE ? '<b>테스트 기간:</b> 결제단계 없이 등록 완료 후 QR·보관함 저장을 확인합니다.<br>정식 결제서비스 연결 때 카드/휴대폰/계좌 본인확인을 다시 켭니다.' : '<b>선택한 요금제:</b> ' + escapeHtml(info.label) + ' / ' + escapeHtml(info.price) + '<br>' + (additional ? '2대부터 추가등록 요금으로 결제됩니다.' : '첫 장비 1대 등록 요금으로 결제됩니다.') + '<br>' + (pending ? '결제를 완료하면 보관함에 저장되고 QR·담당자 링크가 바로 생성됩니다.' : '정식 서비스에서는 카드 명의자 확인, 휴대폰 소액결제 명의 확인, 계좌이체 은행 인증을 결제대행사와 연결합니다.');
      }
      renderPendingRegistrationPaymentBox();
      renderPricingTargetList();
    }


    function makeAutoPaymentHash(code, plan, tier) {
      const cleanPlan = plan === 'annual' ? 'annual' : 'monthly';
      const cleanTier = tier === 'additional' ? 'additional' : 'first';
      return '#pay=' + encodeURIComponent(code || '') + '&plan=' + encodeURIComponent(cleanPlan) + '&tier=' + encodeURIComponent(cleanTier) + '&result=success';
    }

    function makeAutoPaymentTestLink(code, plan, tier) {
      const base = String(window.location.href || './index.html').split('#')[0] || './index.html';
      return base + makeAutoPaymentHash(code, plan, tier);
    }

    function applyAutoPaymentResultToOwnerMember(paidItem, info, nowIso, newEnd) {
      if (!paidItem || !info) return 0;
      const members = getMembers();
      const target = members.find(member => memberOwnsItemForPayment(member, paidItem));
      if (!target) return 0;
      const ownedItems = getItems().filter(item => memberOwnsItemForPayment(target, item));
      const paidOwned = ownedItems.filter(item => !isServiceShareBlocked(item)).length;
      const totalOwned = ownedItems.length;
      const allOwnedPaid = totalOwned > 0 && paidOwned >= totalOwned;
      const label = info.key === 'annual' ? '1년권' : '1개월권';
      const planLabel = allOwnedPaid ? label : '일부장비 ' + label;
      const maxEnd = ownedItems.reduce((latest, item) => {
        const time = item.trialEndsAt ? new Date(item.trialEndsAt).getTime() : 0;
        return Number.isFinite(time) && time > latest ? time : latest;
      }, new Date(newEnd).getTime());
      target.paymentPlanLabel = planLabel;
      target.memberPlan = planLabel;
      target.paymentStartedAt = target.paymentStartedAt || nowIso;
      target.paymentEndsAt = new Date(maxEnd).toISOString();
      target.paymentStatus = '자동결제완료';
      target.paymentAmount = info.price;
      target.paymentMemo = '자동결제 링크 확인로 처리됨';
      target.status = allOwnedPaid ? (label + ' 자동결제') : '일부장비 자동결제';
      target.autoPaymentLastAt = nowIso;
      target.autoPaymentLastPlan = info.key;
      target.updatedAt = nowIso;
      target.paymentTestPaid = allOwnedPaid;
      addMemberPaymentHistory(target, '자동결제', info.planText + ' 자동결제 링크 확인', info.price);
      setMembers(members);
      return 1;
    }
