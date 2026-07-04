// SitePass v23.7.298 - app-register-share-payment split continue (03/09)
function requirePaymentOwnerVerification(actionLabel) {
      const member = getCurrentMemberTest() || {};
      const label = actionLabel || '결제';
      const values = getPaymentOwnerVerificationValues();
      if (!document.getElementById('paymentOwnerVerifyBox')) {
        alert('결제 본인확인 화면을 불러오지 못했습니다. 새로고침 후 다시 진행해주세요.');
        return false;
      }
      if (values.method === 'account') {
        if (values.accountCode !== '1234') {
          setPaymentOwnerStatus('계좌이체 테스트 확인번호 1234를 입력해주세요.', 'warn');
          document.getElementById('paymentOwnerAccountCode')?.focus();
          return false;
        }
        setPaymentOwnerStatus('계좌이체 확인이 완료되었습니다. 정식 서비스에서는 PG/은행 인증 결과를 저장합니다.', 'ok');
        return true;
      }
      if (!values.name) { setPaymentOwnerStatus('이름을 입력해주세요.', 'warn'); document.getElementById('paymentOwnerName')?.focus(); return false; }
      if (!/^\d{6}$/.test(String(values.birth6 || '')) || !/^[1-8]$/.test(String(values.genderDigit || ''))) {
        setPaymentOwnerStatus('주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.', 'warn');
        document.getElementById('paymentOwnerJuminMasked')?.focus();
        return false;
      }
      if (values.method === 'card') {
        if (!values.cardCompany) { setPaymentOwnerStatus('카드사를 선택해주세요.', 'warn'); document.getElementById('paymentCardCompany')?.focus(); return false; }
        if (!/^\d{13,19}$/.test(values.cardNumberDigits || '')) { setPaymentOwnerStatus('카드번호를 정확히 입력해주세요. 테스트는 숫자 13~19자리로 확인합니다.', 'warn'); document.getElementById('paymentCardNumber')?.focus(); return false; }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(values.cardExpiry || '')) { setPaymentOwnerStatus('카드 유효기간을 MM/YY 형식으로 입력해주세요.', 'warn'); document.getElementById('paymentCardExpiry')?.focus(); return false; }
        if (!/^\d{2}$/.test(values.cardPassword2 || '')) { setPaymentOwnerStatus('카드 비밀번호 앞 2자리를 입력해주세요. 현재는 실제 승인 없는 테스트입니다.', 'warn'); document.getElementById('paymentCardPassword2')?.focus(); return false; }
        setPaymentOwnerStatus(label + ' 카드결제 테스트 확인이 완료되었습니다. 실제 카드승인은 아직 연결하지 않았고, 결제완료 상태만 저장합니다.', 'ok');
        return true;
      }
      if (!values.carrier) { setPaymentOwnerStatus('통신사를 선택해주세요.', 'warn'); document.getElementById('paymentOwnerCarrier')?.focus(); return false; }
      if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(String(values.phone || ''))) {
        setPaymentOwnerStatus('휴대폰번호를 정확히 입력해주세요.', 'warn');
        document.getElementById('paymentOwnerPhone')?.focus();
        return false;
      }
      if (values.method === 'phone' && member.phone && normalizePhoneDigits(values.phone) !== normalizePhoneDigits(member.phone)) {
        setPaymentOwnerStatus('휴대폰결제는 가입자 본인 휴대폰번호와 일치해야 합니다. 가입 휴대폰번호: ' + member.phone, 'warn');
        document.getElementById('paymentOwnerPhone')?.focus();
        return false;
      }
      if (values.code !== '123456') { setPaymentOwnerStatus('본인확인 인증번호 123456을 입력해주세요.', 'warn'); document.getElementById('paymentOwnerCode')?.focus(); return false; }
      setPaymentOwnerStatus(label + ' 휴대폰결제 본인확인이 완료되었습니다. 정식 서비스에서는 통신사/결제대행사 결과값을 서버에 저장합니다.', 'ok');
      return true;
    }

    // v23.7.282: inline onclick 안전 연결
    window.setPaymentOwnerMethod = setPaymentOwnerMethod;
    window.limitPaymentOwnerJuminInput = limitPaymentOwnerJuminInput;
    window.formatPaymentOwnerJuminDisplay = formatPaymentOwnerJuminDisplay;
    window.formatPaymentCardNumberInput = formatPaymentCardNumberInput;
    window.limitPaymentCardExpiryInput = limitPaymentCardExpiryInput;

    async function saveEquipment() {
      const equipmentRegister = getEquipmentRegisterModule();
      const basicFields = equipmentRegister.collectBasicFields ? equipmentRegister.collectBasicFields(document) : null;
      const equipmentNoEl = document.getElementById('equipmentNo');
      const equipmentNameEl = document.getElementById('equipmentName');
      const equipmentNo = (basicFields?.equipmentNo || equipmentNoEl?.value || '').trim();
      const equipmentName = (basicFields?.equipmentName || equipmentNameEl?.value || '').trim();
      const basicValidation = equipmentRegister.validateBasicFields ? equipmentRegister.validateBasicFields({ equipmentNo, equipmentName }) : null;
      if (basicValidation && !basicValidation.ok) {
        alert(basicValidation.message || '장비 기본정보를 확인해주세요.');
        const target = basicValidation.focusId ? document.getElementById(basicValidation.focusId) : (equipmentNo ? equipmentNameEl : equipmentNoEl);
        focusAndScrollToMissingTarget(target);
        return;
      }
      if (!equipmentNo) { alert('장비 등록번호를 입력해주세요.'); focusAndScrollToMissingTarget(equipmentNoEl); return; }
      if (!equipmentName) { alert('장비명을 입력해주세요.'); focusAndScrollToMissingTarget(equipmentNameEl); return; }

      const docs = collectDocData();
      const activeDefs = getActiveDocDefs();
      const workerValidation = validateWorkerPeople(docs);
      const docValidation = equipmentRegister.validateRegistrationDocuments
        ? equipmentRegister.validateRegistrationDocuments(activeDefs, docs, workerValidation)
        : null;
      const missingFiles = docValidation ? docValidation.missingFiles : activeDefs.filter(def => def.required && !(docs[def.key] && docs[def.key].fileName)).map(def => def.groupTitle + ' - ' + def.title);
      const missingDates = docValidation ? docValidation.missingDates : activeDefs.filter(def => def.required && def.expiry && !(docs[def.key] && docs[def.key].expireDate)).map(def => def.groupTitle + ' - ' + def.title + ' 날짜');
      if (!docValidation) {
        activeDefs.filter(def => def.optionalExpiry).forEach(def => {
          const doc = docs[def.key];
          if (doc && doc.fileName && !doc.expireDate) {
            missingDates.push(def.groupTitle + ' - ' + def.title + ' 날짜');
          }
        });
        missingFiles.push(...workerValidation.missingFiles);
      }
      const missingAuth = Object.values(docs).filter(doc => doc.groupKey !== 'equipment' && doc.fileName && !doc.authVerified).map(doc => (doc.groupTitle || '개인정보서류') + ' - ' + doc.title);
      if (missingAuth.length) {
        alert(`인증 미완료 서류가 있습니다.

${missingAuth.join(String.fromCharCode(10))}`);
        const firstAuthDoc = Object.values(docs).find(doc => doc.groupKey !== 'equipment' && doc.fileName && !doc.authVerified);
        if (firstAuthDoc) focusDocMissingField(firstAuthDoc, 'file');
        return;
      }

      if (missingFiles.length || missingDates.length) {
        alert(`필수 항목을 확인해주세요.

미첨부 서류:
${missingFiles.join(String.fromCharCode(10)) || '없음'}

미입력 날짜:
${missingDates.join(String.fromCharCode(10)) || '없음'}

확인을 누르면 첫 번째 미입력 위치로 자동 이동합니다.`);
        focusFirstMissingRequiredItem(activeDefs, docs, workerValidation);
        return;
      }

      const items = getItems();
      const currentMember = getEquipmentRegistrationOwnerMember();
      const editIndex = editingCode ? items.findIndex(x => x.code === editingCode) : -1;
      const oldItem = editIndex >= 0 ? items[editIndex] : null;
      const isNewRegistration = !oldItem;
      // v23.7.288: 결제대기/고아장비/탈퇴장비를 기존 장비로 세면 첫 장비도 추가결제로 오판됩니다.
      // 추가결제 여부는 현재 회원의 활성 결제완료 장비만 기준으로 판단합니다.
      const isAdditionalRegistration = isNewRegistration && getActivePaidRegistrationItemsForCurrentOwner(currentMember, '').length > 0;
      const selectedPlan = getPlanInfo(localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly', { additional: isAdditionalRegistration });
      const bundleMeta = getBundleMeta();
      const code = oldItem ? oldItem.code : makeBundleCode(equipmentNo);
      if (isNewRegistration && items.some(x => String(x.code || '') === String(code || ''))) {
        alert(`이미 같은 장비 등록번호로 만든 서류함이 있습니다.
보관함에서 기존 장비를 확인하거나 다른 장비번호로 등록해주세요.`);
        return;
      }
      const qrLink = oldItem ? (oldItem.qrLink || makeQrLink(code)) : makeQrLink(code);
      const nowIso = new Date().toISOString();
      const item = equipmentRegister.buildRegistrationItem
        ? equipmentRegister.buildRegistrationItem({
            oldItem,
            code,
            equipmentNo,
            equipmentName,
            bundleMeta,
            qrLink,
            docs,
            currentMember,
            selectedPlan,
            nowIso,
            isAdditionalRegistration
          })
        : {
            ...(oldItem || {}),
            code,
            type:'BUNDLE',
            equipmentNo,
            equipmentName,
            bundleMeta,
            workerPeople:bundleMeta.workerPeople,
            qrLink,
            docs,
            createdAt: oldItem?.createdAt || nowIso,
            updatedAt: nowIso,
            ownerMemberId: oldItem?.ownerMemberId || currentMember?.id || '',
            ownerSignupId: oldItem?.ownerSignupId || currentMember?.signupId || '',
            ownerProviderId: oldItem?.ownerProviderId || currentMember?.providerId || '',
            ownerName: oldItem?.ownerName || currentMember?.name || '',
            ownerPhone: oldItem?.ownerPhone || currentMember?.phone || '',
            trialEndsAt: oldItem?.trialEndsAt || '',
            serviceStatus: oldItem?.serviceStatus || '결제대기',
            paymentPlan: oldItem?.paymentPlan || selectedPlan.key,
            basicPlan: oldItem?.basicPlan || ('결제대기 · ' + selectedPlan.planText),
            alertPlan: oldItem?.alertPlan || '보험·검사 만료 알림 포함 준비',
            forwardPolicy: oldItem?.forwardPolicy || '담당자용 QR·링크 7일 접속 가능',
            managerExpireAt: oldItem?.managerExpireAt || '',
            paymentStatus: oldItem?.paymentStatus || '결제대기',
            paymentAmount: oldItem?.paymentAmount || selectedPlan.price,
            paymentTier: oldItem?.paymentTier || (isAdditionalRegistration ? 'additional' : 'first')
          };
      item.updateHistory = Array.isArray(oldItem?.updateHistory) ? oldItem.updateHistory.slice() : [];
      if (oldItem) {
        if (!requirePrivateEditReverification(oldItem, item)) return;
        item.updateHistory.unshift({ at:nowIso, summary:buildUpdateSummary(oldItem, item).slice(0, 12) });
        items[editIndex] = item;
        const saveResult = setItemsWithFallback(items);
        let editServerResult = null;
        try { editServerResult = await saveEquipmentItemToSupabase(item, 'edit'); } catch (e) { console.warn('수정 장비 서버 저장 실패:', e); editServerResult = { ok:false, error:e }; }
        if (!saveResult.ok && !(editServerResult && editServerResult.ok)) {
          alert('브라우저 저장공간과 서버 저장이 모두 실패했습니다. 사진 용량을 줄이거나 기존 코드를 정리한 뒤 다시 시도해주세요.');
          return;
        }
        const editSavedLightNote = getStorageFallbackNote(saveResult);
        alert(`수정내용이 저장되었습니다.

포함: ${bundleMeta.includedGroupNames.join(', ')}${editSavedLightNote}`);
        clearRegistrationDraft();
        editingCode = '';
        resetForm(false);
        renderDetail(code);
        return;
      }

      const pending = equipmentRegister.buildPendingRegistration
        ? equipmentRegister.buildPendingRegistration(item, isAdditionalRegistration ? 'additional' : 'first', nowIso)
        : {
            item,
            paymentTier: isAdditionalRegistration ? 'additional' : 'first',
            createdAt: nowIso
          };
      if (!setPendingRegistration(pending)) {
        alert('결제 대기 정보를 임시 저장하지 못했습니다. 사진 용량을 줄이거나 기존 코드를 정리한 뒤 다시 시도해주세요.');
        return;
      }
      // v23.7.288: 결제화면으로 넘어간 뒤 앱이 꺼지면 작성중 복귀가 아니라 결제대기 복귀가 맞습니다.
      // 그래서 등록 초안은 결제대기 정보 저장 후 정리합니다.
      clearRegistrationDraft();
      // v23.7.281: 장비등록 직후 결제대기 상태라도 보관함/관리자 장비수에 보이게 먼저 저장합니다.
      // 결제완료 시 같은 code를 찾아 유료 상태로 갱신합니다.
      const pendingItems = getItems();
      if (!pendingItems.some(x => String(x.code || '') === String(item.code || ''))) {
        pendingItems.unshift(item);
        const pendingSaveResult = setItemsWithFallback(pendingItems);
        if (!pendingSaveResult.ok) {
          console.warn('장비등록 목록 localStorage 저장 실패: 서버 저장으로 계속 진행합니다.');
        }
      }
      let pendingServerResult = null;
      try { pendingServerResult = await saveEquipmentItemToSupabase(item, 'pending_registration'); } catch (e) { console.warn('결제대기 장비 서버 저장 실패:', e); pendingServerResult = { ok:false, error:e }; }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      const pendingServerText = pendingServerResult && pendingServerResult.ok ? '\n\n장비 서버저장: 완료' : '\n\n장비 서버저장: 확인 필요 - ' + escapePlainTextForAlert(sitePassEquipmentSyncMessage || (pendingServerResult?.error?.message || pendingServerResult?.error || '알 수 없음'));
      if (window.SITEPASS_TEST_NO_PAYMENT_MODE) {
        console.info('SitePass 테스트 모드: 결제화면 없이 등록완료 처리', pendingServerText);
        await completePendingRegistrationPayment('test-free');
        return;
      }
      alert(`${isAdditionalRegistration ? '추가등록 서류 확인이 완료되었습니다.' : '첫 장비 서류 확인이 완료되었습니다.'}\n\n이제 결제방법 화면으로 이동합니다.\n결제를 완료하면 QR링크가 생성되고 보관함에 저장됩니다.${pendingServerText}`);
      openPendingRegistrationPaymentScreen(pending);
    }

    async function completePendingRegistrationPayment(plan) {
      const pending = getPendingRegistration();
      if (!pending || !pending.item) { alert('결제 대기 중인 등록서류가 없습니다.'); return; }
      if (!window.SITEPASS_TEST_NO_PAYMENT_MODE && !requirePaymentOwnerVerification('등록 결제')) return;
      const items = getItems();
      const item = pending.item;
      const existingIndex = items.findIndex(x => String(x.code || '') === String(item.code || ''));
      const info = window.SITEPASS_TEST_NO_PAYMENT_MODE
        ? { key:'test-free', label:'테스트 무료등록', price:'결제없음', days:60, serviceStatus:'실사용베타', planText:'테스트 무료등록 · 결제없음', additional: pending.paymentTier === 'additional' }
        : getPlanInfo(plan || getSelectedPaymentPlan(), { additional: pending.paymentTier === 'additional' });
      const now = new Date();
      const nowIso = now.toISOString();
      const equipmentRegister = getEquipmentRegisterModule();
      const paidItem = equipmentRegister.buildPaidRegistrationItem
        ? equipmentRegister.buildPaidRegistrationItem({
            item,
            info,
            nowIso,
            trialEndsAt:addDaysIso(nowIso, info.days),
            managerExpireAt:new Date(getSevenDaysFromNowMs()).toISOString(),
            managerShareToken:makeManagerShareToken(),
            paymentTier:pending.paymentTier
          })
        : {
            ...item,
            serviceStatus: info.serviceStatus,
            paymentPlan: info.key,
            basicPlan: info.planText,
            paidAt: nowIso,
            trialEndsAt: addDaysIso(nowIso, info.days),
            managerExpireAt: new Date(getSevenDaysFromNowMs()).toISOString(),
            managerShareToken: makeManagerShareToken(),
            paymentStatus: '등록결제완료',
            paymentAmount: info.price,
            paymentMethod: '등록 결제 테스트 처리',
            paymentTier: pending.paymentTier,
            updatedAt: nowIso
          };
      if (!equipmentRegister.buildPaidRegistrationItem && paidItem.bundleMeta) paidItem.bundleMeta.paymentText = info.planText + ' 결제완료';
      if (existingIndex >= 0) items[existingIndex] = paidItem;
      else items.unshift(paidItem);
      // 브라우저 저장공간이 부족해도 결제완료 장비는 서버 저장을 먼저 시도하고, 로컬 저장은 단계별로 가볍게 낮춰 저장합니다.
      let paidServerResult = null;
      try { paidServerResult = await saveEquipmentItemToSupabase(paidItem, 'payment_completed'); } catch (e) { console.warn('결제완료 장비 서버 저장 실패:', e); paidServerResult = { ok:false, error:e }; }
      const saveResult = setItemsWithFallback(items);
      if (!saveResult.ok && !(paidServerResult && paidServerResult.ok)) {
        alert('결제는 확인되었지만 브라우저 저장공간과 서버 저장이 모두 실패했습니다. 기존 코드를 삭제하거나 사진 용량을 줄인 뒤 다시 시도해주세요.');
        return;
      }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      clearPendingRegistration();
      clearRegistrationDraft();
      updateHomeRegistrationButton();
      resetForm(false);
      const paymentSavedLightNote = getStorageFallbackNote(saveResult);
      const paidServerText = paidServerResult && paidServerResult.ok ? '\n\n장비 서버저장: 완료' : '\n\n장비 서버저장: 확인 필요 - ' + escapePlainTextForAlert(sitePassEquipmentSyncMessage || (paidServerResult?.error?.message || paidServerResult?.error || '알 수 없음'));
      if (window.SITEPASS_TEST_NO_PAYMENT_MODE) {
        alert(`테스트 등록이 완료되었습니다.\n\n${escapePlainTextForAlert(paidItem.equipmentName || '장비')} QR링크가 생성되고 보관함에 저장되었습니다.${paymentSavedLightNote}${paidServerText}\n\n※ 테스트 기간에는 결제단계를 건너뜁니다. 정식 결제서비스 연결 때 PG/본인확인을 다시 확인합니다.`);
      } else {
        alert(`${info.label} 결제가 완료되었습니다.\n\n${escapePlainTextForAlert(paidItem.equipmentName || '장비')} QR링크가 생성되고 보관함에 저장되었습니다.${paymentSavedLightNote}${paidServerText}`);
      }
      renderDetail(paidItem.code);
    }


    function escapePlainTextForAlert(text) {
      return String(text || '').split(String.fromCharCode(13)).join(' ').split(String.fromCharCode(10)).join(' ').trim();
    }
