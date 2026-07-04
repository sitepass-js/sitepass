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

    function resetForm(clearEdit = true) {
      if (clearEdit) editingCode = '';
      const no = document.getElementById('equipmentNo');
      const name = document.getElementById('equipmentName');
      if (no) { no.value = ''; no.readOnly = false; }
      if (name) name.value = '';
      const includeDriver = document.getElementById('includeDriverDocs');
      const includeWorker = document.getElementById('includeWorkerDocs');
      if (includeDriver) includeDriver.checked = false;
      if (includeWorker) includeWorker.checked = false;
      renderDocCards();
      renderAlertPreview();
      renderBundleSummary();
      updateRegisterModeUi();
    }

    function readLocalJsonArray(key) {
      if (!key) return [];
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    function getServerEquipmentCache() {
      return readLocalJsonArray(SERVER_EQUIPMENT_CACHE_KEY);
    }

    function setServerEquipmentCache(list) {
      try {
        let safeList = Array.isArray(list) ? list : [];
        try {
          if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') {
            safeList = window.SitePassArchive.filterArchiveVisibleItems(safeList);
          }
        } catch (e) {}
        localStorage.setItem(SERVER_EQUIPMENT_CACHE_KEY, JSON.stringify(safeList));
        return true;
      } catch (e) {
        console.warn('서버 장비 캐시 저장 실패:', e);
        return false;
      }
    }

    function mergeEquipmentItemLists() {
      const map = new Map();
      Array.from(arguments).forEach(list => {
        (Array.isArray(list) ? list : []).forEach(item => {
          if (!item || item.isDeleted || item.deletedAt) return;
          const code = String(item.code || '').trim() || ('NO-CODE-' + Math.random());
          try {
            if (window.SitePassArchive && typeof window.SitePassArchive.isArchiveDeletedCode === 'function' && window.SitePassArchive.isArchiveDeletedCode(code)) return;
          } catch (e) {}
          const existing = map.get(code) || {};
          map.set(code, { ...existing, ...item });
        });
      });
      return Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }

    function normalizeSupabaseEquipmentRow(row) {
      if (!row) return null;
      if (row.is_deleted || row.deleted_at) return null;
      let item = row.item_json || row.payload || row.data || null;
      if (typeof item === 'string') {
        try { item = JSON.parse(item); } catch (e) { item = null; }
      }
      if (!item || typeof item !== 'object') item = {};
      item.code = item.code || row.code || '';
      item.equipmentNo = item.equipmentNo || row.equipment_no || '';
      item.equipmentName = item.equipmentName || row.equipment_name || '';
      item.ownerMemberId = item.ownerMemberId || row.owner_member_id || '';
      item.ownerSignupId = item.ownerSignupId || row.owner_signup_id || '';
      item.ownerProviderId = item.ownerProviderId || row.owner_provider_id || '';
      item.ownerName = item.ownerName || row.owner_name || '';
      item.ownerPhone = item.ownerPhone || row.owner_phone || '';
      item.serviceStatus = item.serviceStatus || row.service_status || '';
      item.paymentStatus = item.paymentStatus || row.payment_status || '';
      item.createdAt = item.createdAt || row.created_at || '';
      item.updatedAt = item.updatedAt || row.updated_at || '';
      item.fromSupabaseEquipment = true;
      return item.code ? item : null;
    }

    function mergePendingRegistrationIntoItems(list) {
      const pendingList = [];
      try {
        const pending = getPendingRegistration();
        const pendingItem = pending && pending.item ? pending.item : null;
        if (pendingItem && pendingItem.code) pendingList.push(pendingItem);
      } catch (e) {}
      return mergeEquipmentItemLists(getServerEquipmentCache(), list, pendingList);
    }

    function getItems() {
      try {
        const localLists = [
          readLocalJsonArray(PREV_STORAGE_KEY),
          readLocalJsonArray(PREV_STORAGE_KEY_2),
          readLocalJsonArray(PREV_STORAGE_KEY_3),
          readLocalJsonArray(PREV_STORAGE_KEY_4),
          readLocalJsonArray(PREV_STORAGE_KEY_5),
          readLocalJsonArray(PREV_STORAGE_KEY_6),
          readLocalJsonArray(PREV_STORAGE_KEY_7),
          readLocalJsonArray(STORAGE_KEY)
        ];
        return mergePendingRegistrationIntoItems(mergeEquipmentItemLists.apply(null, localLists.concat([runtimeEquipmentItems])));
      }
      catch (error) { return mergePendingRegistrationIntoItems(runtimeEquipmentItems); }
    }

    function buildSupabaseEquipmentRow(item, reason) {
      if (!item || !item.code) return null;
      let light = item;
      try { light = makeStorageLightItem(item); } catch (e) { light = { ...item }; }
      return {
        code: String(item.code || ''),
        equipment_no: String(item.equipmentNo || ''),
        equipment_name: String(item.equipmentName || ''),
        owner_member_id: String(item.ownerMemberId || ''),
        owner_signup_id: String(item.ownerSignupId || ''),
        owner_provider_id: String(item.ownerProviderId || ''),
        owner_name: String(item.ownerName || ''),
        owner_phone: String(item.ownerPhone || ''),
        service_status: String(item.serviceStatus || ''),
        payment_status: String(item.paymentStatus || ''),
        item_json: light,
        is_deleted: false,
        save_reason: String(reason || 'save'),
        updated_at: new Date().toISOString()
      };
    }

    async function saveEquipmentItemToSupabase(item, reason) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || (!supabaseApi.upsert && !supabaseApi.rpc)) {
        sitePassEquipmentSyncMessage = '장비 서버저장 실패: Supabase API 연결 없음';
        return { skipped:true, error:'Supabase API 연결 없음' };
      }
      const row = buildSupabaseEquipmentRow(item, reason);
      if (!row) {
        sitePassEquipmentSyncMessage = '장비 서버저장 실패: 장비 row 없음';
        return { skipped:true, error:'장비 row 없음' };
      }
      try {
        // v23.7.281: RLS/권한/브라우저 키 차이를 줄이기 위해 서버 RPC를 우선 사용합니다.
        // RPC가 없거나 실패하면 기존 UPSERT로 한 번 더 시도합니다.
        let error = null;
        let rpcTried = false;
        if (supabaseApi.rpc) {
          rpcTried = true;
          const rpcResult = await supabaseApi.rpc('sitepass_upsert_equipment_item', { p_row: row });
          error = rpcResult && rpcResult.error ? rpcResult.error : null;
          if (error) console.warn('Supabase 장비 RPC 저장 실패, 직접 UPSERT 재시도:', error);
        }
        if (error || !rpcTried) {
          if (!supabaseApi.upsert) return { ok:false, error: error || { message:'Supabase UPSERT 연결 없음' } };
          const upsertResult = await supabaseApi.upsert('sitepass_equipment_items', row, { onConflict:'code' });
          error = upsertResult && upsertResult.error ? upsertResult.error : null;
        }
        if (error) {
          console.warn('Supabase 장비 저장 실패:', error);
          sitePassEquipmentSyncMessage = '장비 서버저장 실패: ' + (error.message || JSON.stringify(error));
          return { ok:false, error };
        }
        const cache = getServerEquipmentCache();
        const merged = mergeEquipmentItemLists(cache, [normalizeSupabaseEquipmentRow(row), item]);
        setServerEquipmentCache(merged);
        sitePassEquipmentSyncMessage = '장비 서버저장 완료: ' + (row.equipment_no || row.code || '장비');
        return { ok:true };
      } catch (e) {
        console.warn('Supabase 장비 저장 예외:', e);
        sitePassEquipmentSyncMessage = '장비 서버저장 예외: ' + (e?.message || e);
        return { ok:false, error:e };
      }
    }

    async function syncSupabaseEquipmentItems(silent) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || sitePassEquipmentSyncing) return { skipped:true, error:'Supabase API 연결 없음' };
      sitePassEquipmentSyncing = true;
      try {
        let data = null;
        let error = null;
        // v23.7.281: 서버 RPC 목록 조회를 우선 사용하고, 실패 시 직접 SELECT로 재시도합니다.
        if (supabaseApi.rpc) {
          const rpcResult = await supabaseApi.rpc('sitepass_list_equipment_items', {});
          error = rpcResult && rpcResult.error ? rpcResult.error : null;
          data = rpcResult ? rpcResult.data : null;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) {}
          }
          if (data && !Array.isArray(data) && Array.isArray(data.items)) data = data.items;
          if (error) console.warn('Supabase 장비 RPC 목록 실패, 직접 SELECT 재시도:', error);
        }
        if ((error || !Array.isArray(data)) && supabaseApi.select) {
          const selectResult = await supabaseApi.select('sitepass_equipment_items', '*', function(query){
            return query.eq('is_deleted', false).order('updated_at', { ascending:false }).limit(1000);
          });
          data = selectResult && selectResult.data ? selectResult.data : [];
          error = selectResult && selectResult.error ? selectResult.error : null;
        }
        if (error) {
          sitePassEquipmentSyncMessage = '장비 서버목록 불러오기 실패: ' + (error.message || JSON.stringify(error));
          if (!silent) alert(sitePassEquipmentSyncMessage);
          return { ok:false, error };
        }
        const rows = Array.isArray(data) ? data : [];
        const serverItems = rows.map(normalizeSupabaseEquipmentRow).filter(Boolean);
        const mergedItems = mergeEquipmentItemLists(serverItems, readLocalJsonArray(STORAGE_KEY), getItems());
        setServerEquipmentCache(serverItems);
        sitePassEquipmentSyncedAt = Date.now();
        sitePassEquipmentSyncMessage = '서버 장비목록 동기화: ' + serverItems.length + '대 / 화면합산 ' + mergedItems.length + '대';
        try { updateHomeRegistrationButton(); } catch (e) {}
        try { refreshMemberUi(); } catch (e) {}
        try { if (isAdminLoggedIn() && sitePassCurrentScreenId === 'adminScreen') renderAdmin(); } catch (e) {}
        try { if (sitePassCurrentScreenId === 'listScreen') renderList(); } catch (e) {}
        return { ok:true, count:serverItems.length, visibleCount:mergedItems.length };
      } catch (e) {
        sitePassEquipmentSyncMessage = '장비 서버목록 불러오기 예외: ' + (e?.message || e);
        if (!silent) alert(sitePassEquipmentSyncMessage);
        return { ok:false, error:e };
      } finally {
        sitePassEquipmentSyncing = false;
      }
    }

    function setItems(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
      } catch (error) {
        console.warn('저장 공간 부족 또는 브라우저 저장 오류:', error);
        return false;
      }
    }

    function rememberRuntimeEquipmentItems(items) {
      try {
        runtimeEquipmentItems = mergeEquipmentItemLists(runtimeEquipmentItems, Array.isArray(items) ? items : []);
      } catch (e) {
        runtimeEquipmentItems = Array.isArray(items) ? items.slice(0, 20) : [];
      }
    }

    function makeStorageTinyItem(item) {
      const light = JSON.parse(JSON.stringify(item || {}));
      Object.values(light.docs || {}).forEach(doc => {
        const count = Array.isArray(doc.pages) ? doc.pages.length : Number(doc.pageCount || 0);
        doc.pages = [];
        doc.pageCount = count;
        doc.fileName = doc.fileName || (count ? ('첨부 ' + count + '장') : '첨부됨');
        doc.previewDataUrl = '';
        doc.editDataUrl = '';
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        doc.previewChoice = '';
        doc.storageNote = '브라우저 저장공간 부족으로 사진 미리보기는 서버/원본 등록 흐름에서 확인 필요';
      });
      light.storageNote = '브라우저 저장공간 부족으로 이 기기에는 사진 없는 목록정보만 저장됨. 서버 저장이 완료된 장비는 관리자/서버 목록에서 확인 가능';
      light.localPhotoPreviewStripped = true;
      return light;
    }

    function setItemsWithFallback(items) {
      const list = Array.isArray(items) ? items : [];
      rememberRuntimeEquipmentItems(list);
      if (setItems(list)) return { ok:true, mode:'full' };
      const lightItems = list.map(makeStorageLightItem);
      if (setItems(lightItems)) return { ok:true, mode:'light' };
      const tinyItems = list.map(makeStorageTinyItem);
      if (setItems(tinyItems)) return { ok:true, mode:'tiny' };
      return { ok:false, mode:'memory' };
    }

    function getStorageFallbackNote(result) {
      if (!result || result.mode === 'full') return '';
      if (result.mode === 'light') return String.fromCharCode(10) + String.fromCharCode(10) + '용량을 줄이기 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장했습니다.';
      if (result.mode === 'tiny') return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 부족해서 이 기기에는 사진 없는 목록정보만 저장했습니다. 서버저장이 완료되면 관리자/서버 목록 기준으로 확인됩니다.';
      return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 가득 차서 이 기기 저장은 생략했습니다. 서버저장 완료 여부를 꼭 확인해주세요.';
    }

    // v23.7.72 - 담당자 화면보기/QR/상세/프린트 공통 조회 함수 복구
    // 이전 정리 과정에서 getItemByCode, getDocsByKeys가 빠져 담당자화면 보기 버튼이 멈추는 문제가 있었습니다.
    function getItemByCode(code) {
      const targetCode = String(code || '').trim();
      if (!targetCode) return null;
      return getItems().find(item => String(item?.code || '').trim() === targetCode) || null;
    }

    function getDocsByKeys(item, keys) {
      const docs = getDisplayDocs(item);
      if (!Array.isArray(keys) || !keys.length) return docs;
      const keySet = new Set(keys.map(key => String(key || '')));
      return docs.filter(doc => keySet.has(String(doc?.key || '')));
    }

    function makeStorageLightItem(item) {
      const light = JSON.parse(JSON.stringify(item));
      Object.values(light.docs || {}).forEach(doc => {
        const pages = Array.isArray(doc.pages) ? doc.pages : [];
        const firstPreview = pages.find(page => page.previewDataUrl)?.previewDataUrl || doc.previewDataUrl || '';
        doc.previewDataUrl = firstPreview;
        doc.editDataUrl = firstPreview;
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        if (Array.isArray(doc.pages)) {
          doc.pages.forEach(page => {
            page.previewDataUrl = page.previewDataUrl || '';
            page.editDataUrl = page.editDataUrl || page.previewDataUrl || '';
            page.originalDataUrl = '';
            page.correctedDataUrl = '';
            page.previewChoice = page.previewDataUrl ? 'preview' : (page.previewChoice || '');
          });
        }
      });
      light.storageNote = '저장공간 절약을 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장됨';
      return light;
    }

    function makeBundleCode(equipmentNo) {
      const cleaned = String(equipmentNo || '').replace(/\s+/g, '').toUpperCase();
      const now = new Date();
      const yymmdd = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      const seed = cleaned + '|' + Date.now() + '|' + Math.random();
      let hash = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const hashPart = Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
      return 'SP-' + yymmdd + '-' + hashPart.slice(0, 3) + hashPart.slice(3) + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4);
    }

    function randomCodeBlock(length) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      const values = new Uint32Array(length);
      if (window.crypto && crypto.getRandomValues) {
        crypto.getRandomValues(values);
      } else {
        for (let i = 0; i < length; i++) values[i] = Math.floor(Math.random() * 4294967295);
      }
      let out = '';
      for (let i = 0; i < length; i++) out += chars[values[i] % chars.length];
      return out;
    }

    function makeQrLink(code) {
      const qrShare = getQrShareModule();
      if (qrShare.makeQrLink) return qrShare.makeQrLink(code);
      const baseUrl = window.location.href.split('#')[0];
      return baseUrl + '#qr=' + encodeURIComponent(code);
    }

