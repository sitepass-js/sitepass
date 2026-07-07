// SitePass v23.7.330 - speed optimized medium chunk (app-register-share-payment-speed 02/04)
// ---- merged from app-register-share-payment-05.js ----
// SitePass v23.7.330 - app-register-share-payment finer split (05/15)
async function completePendingRegistrationPayment(plan) {
      if (sitePassRegistrationCompletionBusy) return;
      sitePassRegistrationCompletionBusy = true;
      try {
        const pending = getPendingRegistration();
        if (!pending || !pending.item) { alert('결제 대기 중인 등록서류가 없습니다.'); return; }
        if (!window.SITEPASS_TEST_NO_PAYMENT_MODE && !requirePaymentOwnerVerification('등록 결제')) return;

        const item = pending.item;
        // v23.7.330: 테스트 등록완료에서는 기존 전체 보관함/구버전 사진 캐시를 병합하지 않습니다.
        // getItems()가 과거 base64 포함 저장값을 모두 읽으면서 등록완료 버튼이 오래 멈추는 문제가 있어,
        // 현재 STORAGE_KEY 목록 + 이번 등록 1건만 빠르게 처리합니다.
        const items = window.SITEPASS_TEST_NO_PAYMENT_MODE
          ? getImmediateRegistrationCompletionItems(item)
          : getItems();
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

        if (window.SITEPASS_TEST_NO_PAYMENT_MODE) {
          // v23.7.330: 테스트 등록 완료는 현장 사용감이 중요합니다.
          // Supabase 저장/RPC 응답을 기다리면 등록 완료 버튼에서 오래 멈추므로,
          // QR/보관함 목록정보를 먼저 가볍게 저장하고 보관함으로 즉시 이동합니다.
          clearPendingRegistration();
          const saveResult = setItemsForImmediateRegistrationCompletion(items);
          if (!saveResult.ok) {
            alert('브라우저 저장공간이 부족해서 보관함 목록 저장에 실패했습니다. 기존 임시자료를 정리한 뒤 다시 등록해주세요.');
            return;
          }
          clearRegistrationDraft();
          updateHomeRegistrationButton();
          resetForm(false);
          // v23.7.330: showScreen('listScreen') 내부의 registerScreen 이탈 자동저장을 건너뜁니다.
          // 등록완료 직후에는 이미 clearRegistrationDraft()를 했으므로 다시 저장하면 대기시간만 길어집니다.
          window.sitePassFastCompletingRegistration = true;
          window.sitePassFastCompletionItem = makeStorageTinyItem(paidItem);
          try { showScreen('listScreen', { replace:true }); } catch (e) { console.warn('보관함 화면 이동 실패:', e); }
          finally { setTimeout(function(){ window.sitePassFastCompletingRegistration = false; }, 1200); }
          // v23.7.330: 등록완료 직후 renderList()를 즉시 다시 돌리지 않습니다.
          // 전체 보관함 병합/렌더링은 무거울 수 있으므로 사용자가 보관함에 먼저 도착하게 합니다.
          const paymentSavedLightNote = getStorageFallbackNote(saveResult);
          sitePassEquipmentSyncMessage = '테스트 등록완료: 보관함 먼저 저장, 서버 동기화는 뒤에서 처리 중';
          setTimeout(function(){
            try {
              alert(`테스트 등록이 완료되었습니다.\n\n${escapePlainTextForAlert(paidItem.equipmentName || '장비')} QR링크가 생성되고 보관함에 저장되었습니다.${paymentSavedLightNote}\n\n※ 서버 동기화는 뒤에서 처리합니다. 테스트 기간에는 결제단계를 건너뜁니다.`);
            } catch (e) {}
          }, 80);
          setTimeout(async function(){
            try {
              const bgResult = await saveEquipmentItemToSupabase(paidItem, 'test_free_completed_background');
              sitePassEquipmentSyncMessage = bgResult && bgResult.ok ? '장비 서버저장 완료: 백그라운드 동기화' : ('장비 서버저장 확인 필요: ' + (bgResult?.error?.message || bgResult?.error || '알 수 없음'));
            } catch (e) {
              console.warn('테스트 등록완료 후 백그라운드 서버 저장 실패:', e);
              sitePassEquipmentSyncMessage = '장비 서버저장 확인 필요: ' + (e?.message || e);
            }
          }, 250);
          return;
        }

        // 정식 결제 모드에서는 기존처럼 저장/서버확인을 함께 처리합니다.
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
        alert(`${info.label} 결제가 완료되었습니다.\n\n${escapePlainTextForAlert(paidItem.equipmentName || '장비')} QR링크가 생성되고 보관함에 저장되었습니다.${paymentSavedLightNote}${paidServerText}`);
        renderDetail(paidItem.code);
      } finally {
        sitePassRegistrationCompletionBusy = false;
      }
    }

    function escapePlainTextForAlert(text) {
      return String(text || '').split(String.fromCharCode(13)).join(' ').split(String.fromCharCode(10)).join(' ').trim();
    }

// ---- merged from app-register-share-payment-06.js ----
// SitePass v23.7.330 - app-register-share-payment finer split (06/15)
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

    function makeCompactServerEquipmentCacheItem(item) {
      if (!item || typeof item !== 'object') return item;
      const compact = {};
      [
        'id','code','type','kind','category','equipmentNo','equipmentName','name','title',
        'ownerName','ownerPhone','memberId','memberName','memberPhone','createdAt','updatedAt',
        'expiresAt','expireDate','shareExpiresAt','status','isDeleted','deletedAt'
      ].forEach(function(key) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') compact[key] = item[key];
      });
      if (Array.isArray(item.documents)) {
        compact.documents = item.documents.map(function(doc) {
          if (!doc || typeof doc !== 'object') return doc;
          const d = {};
          ['id','type','name','title','label','expireDate','expiresAt','status','uploadedAt','updatedAt','required'].forEach(function(key) {
            if (doc[key] !== undefined && doc[key] !== null && doc[key] !== '') d[key] = doc[key];
          });
          return d;
        }).slice(0, 20);
      }
      return compact;
    }

    function setServerEquipmentCache(list) {
      let safeList = Array.isArray(list) ? list : [];
      try {
        if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') {
          safeList = window.SitePassArchive.filterArchiveVisibleItems(safeList);
        }
      } catch (e) {}
      try {
        localStorage.setItem(SERVER_EQUIPMENT_CACHE_KEY, JSON.stringify(safeList));
        return true;
      } catch (e) {
        // v23.7.330: 서버 장비 캐시는 보조 캐시라서, 용량 초과 때 원본 이미지/base64까지
        // 억지로 저장하지 않고 목록 표시용 축약 캐시로 대체합니다.
        try {
          const compactList = safeList.map(makeCompactServerEquipmentCacheItem).slice(0, 300);
          localStorage.setItem(SERVER_EQUIPMENT_CACHE_KEY, JSON.stringify(compactList));
          return true;
        } catch (compactError) {
          try { localStorage.removeItem(SERVER_EQUIPMENT_CACHE_KEY); } catch (removeError) {}
          console.info('서버 장비 캐시는 용량 제한으로 이번 회차 저장을 생략했습니다. 서버 데이터 원본은 유지됩니다.');
          return false;
        }
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
        if (pendingItem && pendingItem.code && !isLikelyBrokenNoPhotoRegistrationItem(pendingItem)) pendingList.push(pendingItem);
      } catch (e) {}
      return mergeEquipmentItemLists(getServerEquipmentCache(), list, pendingList);
    }



    // v23.7.330: 실패/미완성 등록건 방지용 첨부 데이터 검사
    // v321~v322 빠른 등록 중 사진 데이터가 없는 항목이 QR만 생성되어 뒤늦게 보관함에 뜨는 문제를 막습니다.
    function isUsableAttachmentData(value) {
      const text = String(value || '');
      if (!text) return false;
      return text.indexOf('data:image/') === 0 || text.indexOf('data:application/pdf') === 0 || text.indexOf('blob:') === 0 || text.indexOf('https://') === 0 || text.indexOf('http://') === 0;
    }

    function docHasDownloadableData(doc) {
      doc = (doc && typeof doc === 'object') ? doc : {};
      if (isUsableAttachmentData(doc.previewDataUrl) || isUsableAttachmentData(doc.editDataUrl) || isUsableAttachmentData(doc.originalDataUrl) || isUsableAttachmentData(doc.correctedDataUrl) || isUsableAttachmentData(doc.fileUrl) || isUsableAttachmentData(doc.downloadUrl)) return true;
      const pages = Array.isArray(doc.pages) ? doc.pages : [];
      return pages.some(function(page) {
        page = (page && typeof page === 'object') ? page : {};
        return isUsableAttachmentData(page.previewDataUrl) || isUsableAttachmentData(page.editDataUrl) || isUsableAttachmentData(page.originalDataUrl) || isUsableAttachmentData(page.correctedDataUrl) || isUsableAttachmentData(page.fileUrl) || isUsableAttachmentData(page.downloadUrl);
      });
    }

    function docLooksAttached(doc) {
      doc = (doc && typeof doc === 'object') ? doc : {};
      const pages = Array.isArray(doc.pages) ? doc.pages : [];
      const pageCount = Number(doc.pageCount || pages.length || 0);
      const fileName = String(doc.fileName || '').trim();
      return !!fileName || pageCount > 0 || pages.length > 0;
    }

    function getAttachedDocs(item) {
      const docs = item && item.docs && typeof item.docs === 'object' ? item.docs : {};
      return Object.values(docs).filter(docLooksAttached);
    }

    function getAttachedDocsWithoutDownloadData(item) {
      return getAttachedDocs(item).filter(function(doc) { return !docHasDownloadableData(doc); });
    }

    function itemHasDownloadableDocData(item) {
      return getAttachedDocs(item).some(docHasDownloadableData);
    }

    function isLikelyBrokenNoPhotoRegistrationItem(item) {
      if (!item || !item.code) return false;
      const attached = getAttachedDocs(item);
      const hasAnyData = attached.some(docHasDownloadableData);
      const meta = item.bundleMeta && typeof item.bundleMeta === 'object' ? item.bundleMeta : {};
      const expectedCount = Number(meta.equipmentDocCount || 0) + Number(meta.driverDocCount || 0) + Number(meta.workerDocCount || 0);
      const completedLike = String(item.serviceStatus || '') || String(item.paymentStatus || '') || String(item.basicPlan || '');
      if (attached.length > 0 && !hasAnyData) return true;
      if (!attached.length && expectedCount > 0 && completedLike) return true;
      return false;
    }

    function filterBrokenNoPhotoRegistrationItems(list) {
      // v23.7.330: 기존 보관함 항목을 자동으로 숨기지 않습니다.
      // v323의 빈 QR 방지는 신규 등록 직전 validateRegistrationItemHasDownloadableDocs()에서 처리하고,
      // 이미 저장된 항목은 사용자가 직접 확인/삭제할 수 있도록 보존합니다.
      return (Array.isArray(list) ? list : []).filter(function(item) {
        if (!item) return false;
        return !(item.sitePassEmptyQrBlocked || item.emptyQrBlocked || item.localBrokenNoPhotoRegistrationItem);
      });
    }

    function validateRegistrationItemHasDownloadableDocs(item) {
      const attached = getAttachedDocs(item);
      if (!attached.length) {
        return { ok:false, message:'첨부된 서류 사진 데이터가 없습니다. 오류로 만들어진 빈 QR이 올라가지 않도록 등록을 중단합니다. 서류를 다시 첨부한 뒤 등록완료를 눌러주세요.' };
      }
      const missingData = getAttachedDocsWithoutDownloadData(item);
      if (missingData.length) {
        const names = missingData.slice(0, 8).map(function(doc){ return (doc.groupTitle ? doc.groupTitle + ' - ' : '') + (doc.title || doc.fileName || '서류'); });
        return { ok:false, message:'첨부표시는 있지만 QR/다운로드용 사진 데이터가 없는 서류가 있습니다.\n\n' + names.join('\n') + '\n\n빈 QR이 생성되지 않도록 등록을 중단합니다. 위 서류를 다시 첨부한 뒤 등록완료를 눌러주세요.' };
      }
      if (!itemHasDownloadableDocData(item)) {
        return { ok:false, message:'QR/담당자 화면에 보여줄 서류 사진 데이터가 없습니다. 서류를 다시 첨부해주세요.' };
      }
      return { ok:true };
    }

    window.sitePassValidateRegistrationItemForSave = validateRegistrationItemHasDownloadableDocs;
    window.sitePassItemHasDownloadableDocData = itemHasDownloadableDocData;

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
        return filterBrokenNoPhotoRegistrationItems(mergePendingRegistrationIntoItems(mergeEquipmentItemLists.apply(null, localLists.concat([runtimeEquipmentItems]))));
      }
      catch (error) { return filterBrokenNoPhotoRegistrationItems(mergePendingRegistrationIntoItems(runtimeEquipmentItems)); }
    }

    function buildSupabaseEquipmentRow(item, reason) {
      if (!item || !item.code) return null;
      let light = item;
      try { light = makeStorageTinyItem(item); } catch (e) { try { light = makeStorageLightItem(item); } catch (e2) { light = { ...item }; } }
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

    function shouldSyncSupabaseEquipmentItemsForCurrentContext() {
      // v23.7.330: 일반회원 화면에서 전체 장비목록 RPC/SELECT를 실행하면
      // RLS/timeout(500/401/403) 오류가 일반 등록/보관함 흐름까지 오염시킵니다.
      // 전체 장비목록 조회는 관리자 화면에서만 실행하고, 일반회원은 로컬/현재 등록건 중심으로 표시합니다.
      try {
        if (typeof isAdminLoggedIn !== 'function' || !isAdminLoggedIn()) return false;
        if (typeof sitePassCurrentScreenId !== 'undefined' && sitePassCurrentScreenId && sitePassCurrentScreenId !== 'adminScreen') return false;
        return true;
      } catch (e) {
        return false;
      }
    }

    async function syncSupabaseEquipmentItems(silent) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || sitePassEquipmentSyncing) return { skipped:true, error:'Supabase API 연결 없음' };
      if (!shouldSyncSupabaseEquipmentItemsForCurrentContext()) {
        sitePassEquipmentSyncMessage = '일반회원 화면에서는 전체 장비 서버목록 동기화를 생략했습니다.';
        return { skipped:true, reason:'member_scope' };
      }
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

    let sitePassMemberEquipmentSyncing = false;
    let sitePassMemberEquipmentSyncedAt = 0;

    function shouldSyncSupabaseMyEquipmentItemsForCurrentContext() {
      try {
        return !!(typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()));
      } catch (e) {
        return false;
      }
    }

    function parseSupabaseEquipmentRows(data) {
      let rows = data;
      if (typeof rows === 'string') {
        try { rows = JSON.parse(rows); } catch (e) {}
      }
      if (rows && !Array.isArray(rows) && Array.isArray(rows.items)) rows = rows.items;
      if (rows && !Array.isArray(rows) && Array.isArray(rows.data)) rows = rows.data;
      return Array.isArray(rows) ? rows : [];
    }

    async function syncSupabaseMyEquipmentItems(silent) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || sitePassMemberEquipmentSyncing) return { skipped:true, error:'Supabase API 연결 없음 또는 동기화 중' };
      if (!shouldSyncSupabaseMyEquipmentItemsForCurrentContext()) return { skipped:true, reason:'not_member_context' };
      sitePassMemberEquipmentSyncing = true;
      try {
        let data = null;
        let error = null;
        if (supabaseApi.rpc) {
          const rpcResult = await supabaseApi.rpc('sitepass_list_my_equipment_items', {});
          error = rpcResult && rpcResult.error ? rpcResult.error : null;
          data = rpcResult ? rpcResult.data : null;
          if (error) console.warn('내 보관함 서버목록 RPC 실패:', error);
        }
        const rows = parseSupabaseEquipmentRows(data);
        if (error) {
          sitePassEquipmentSyncMessage = '내 보관함 서버목록 불러오기 실패: ' + (error.message || JSON.stringify(error));
          if (!silent) alert(sitePassEquipmentSyncMessage);
          return { ok:false, error };
        }
        const serverItems = rows.map(normalizeSupabaseEquipmentRow).filter(Boolean);
        if (!serverItems.length) {
          sitePassMemberEquipmentSyncedAt = Date.now();
          sitePassEquipmentSyncMessage = '서버에 저장된 내 보관함 항목이 아직 없습니다.';
          return { ok:true, count:0, visibleCount:getItems().length };
        }
        const mergedItems = mergeEquipmentItemLists(serverItems, readLocalJsonArray(STORAGE_KEY), getItems());
        try { setServerEquipmentCache(serverItems); } catch (e) {}
        try { setItemsWithFallback(mergedItems); } catch (e) { try { setItems(mergedItems); } catch (e2) {} }
        try { rememberRuntimeEquipmentItems(mergedItems); } catch (e) {}
        sitePassMemberEquipmentSyncedAt = Date.now();
        sitePassEquipmentSyncMessage = '내 보관함 서버동기화: ' + serverItems.length + '건 / 화면합산 ' + mergedItems.length + '건';
        try { updateHomeRegistrationButton(); } catch (e) {}
        try { refreshMemberUi(); } catch (e) {}
        try {
          if (sitePassCurrentScreenId === 'listScreen' && !window.sitePassFastCompletingRegistration) renderList();
        } catch (e) {}
        return { ok:true, count:serverItems.length, visibleCount:mergedItems.length };
      } catch (e) {
        sitePassEquipmentSyncMessage = '내 보관함 서버목록 불러오기 예외: ' + (e?.message || e);
        if (!silent) alert(sitePassEquipmentSyncMessage);
        return { ok:false, error:e };
      } finally {
        sitePassMemberEquipmentSyncing = false;
      }
    }
    window.syncSupabaseMyEquipmentItems = syncSupabaseMyEquipmentItems;

// ---- merged from app-register-share-payment-07.js ----
// SitePass v23.7.330 - app-register-share-payment finer split (07/15)
function setItems(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
      } catch (error) {
        console.info('저장 공간 부족: 축약 저장으로 재시도합니다.');
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


    function getSitePassStorageBucketName() {
      try { return (window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.storageBucket) || 'sitepass-documents'; }
      catch (e) { return 'sitepass-documents'; }
    }

    function isDataUrlAttachment(value) {
      return String(value || '').indexOf('data:') === 0;
    }

    function isBlobUrlAttachment(value) {
      return String(value || '').indexOf('blob:') === 0;
    }

    function getAttachmentUrlFromPageOrDoc(obj) {
      obj = obj && typeof obj === 'object' ? obj : {};
      return obj.previewDataUrl || obj.editDataUrl || obj.correctedDataUrl || obj.originalDataUrl || obj.fileUrl || obj.downloadUrl || obj.storagePublicUrl || obj.publicUrl || '';
    }

    function getStoredAttachmentUrl(obj) {
      obj = obj && typeof obj === 'object' ? obj : {};
      return obj.fileUrl || obj.downloadUrl || obj.storagePublicUrl || obj.publicUrl || obj.previewDataUrl || obj.editDataUrl || '';
    }

    function sanitizeStoragePathPart(value, fallback) {
      const text = String(value || fallback || 'file').trim();
      const safe = text.replace(/[^0-9a-zA-Z가-힣._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
      return safe || String(fallback || 'file');
    }

    function guessExtensionFromDataUrl(value, fileName) {
      const text = String(value || '');
      const name = String(fileName || '').toLowerCase();
      if (name.endsWith('.pdf')) return 'pdf';
      if (name.endsWith('.png')) return 'png';
      if (name.endsWith('.webp')) return 'webp';
      if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg';
      const match = text.match(/^data:([^;]+);base64,/i);
      const mime = match ? match[1].toLowerCase() : '';
      if (mime.indexOf('pdf') >= 0) return 'pdf';
      if (mime.indexOf('png') >= 0) return 'png';
      if (mime.indexOf('webp') >= 0) return 'webp';
      return 'jpg';
    }

    function dataUrlToBlob(value) {
      const text = String(value || '');
      const match = text.match(/^data:([^;]+);base64,(.*)$/i);
      if (!match) return null;
      const mime = match[1] || 'application/octet-stream';
      const binary = atob(match[2] || '');
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type:mime });
    }

    async function attachmentValueToBlob(value) {
      const text = String(value || '');
      if (isDataUrlAttachment(text)) return dataUrlToBlob(text);
      if (isBlobUrlAttachment(text)) {
        try { return await fetch(text).then(r => r.blob()); } catch (e) { return null; }
      }
      return null;
    }

    async function uploadSingleDocPageToSupabaseStorage(item, docKey, doc, page, pageIndex) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || typeof supabaseApi.storageUpload !== 'function') return { ok:false, skipped:true, error:'Supabase Storage API 없음' };
      const source = getAttachmentUrlFromPageOrDoc(page) || getAttachmentUrlFromPageOrDoc(doc);
      if (!source || (!isDataUrlAttachment(source) && !isBlobUrlAttachment(source))) {
        const existingUrl = getStoredAttachmentUrl(page) || getStoredAttachmentUrl(doc);
        return existingUrl ? { ok:true, skipped:true, publicUrl:existingUrl } : { ok:false, skipped:true, error:'업로드할 이미지 데이터 없음' };
      }
      const blob = await attachmentValueToBlob(source);
      if (!blob) return { ok:false, error:'이미지 Blob 변환 실패' };
      const bucket = getSitePassStorageBucketName();
      const owner = sanitizeStoragePathPart(item.ownerSignupId || item.ownerProviderId || item.ownerMemberId || 'anonymous', 'owner');
      const code = sanitizeStoragePathPart(item.code || item.equipmentNo || ('draft_' + Date.now()), 'code');
      const docPart = sanitizeStoragePathPart(docKey || doc.key || 'document', 'document');
      const ext = guessExtensionFromDataUrl(source, (page && page.fileName) || doc.fileName || 'document.jpg');
      const pageId = sanitizeStoragePathPart((page && page.id) || ('page_' + (pageIndex + 1)), 'page_' + (pageIndex + 1));
      const path = owner + '/' + code + '/' + docPart + '/' + pageId + '.' + ext;
      const result = await supabaseApi.storageUpload(bucket, path, blob, { upsert:true, cacheControl:'31536000', contentType: blob.type || undefined });
      if (result && result.error) return { ok:false, error:result.error };
      const publicUrl = (typeof supabaseApi.storagePublicUrl === 'function') ? supabaseApi.storagePublicUrl(bucket, path) : '';
      return { ok:true, bucket, path, publicUrl };
    }

    function applyStorageUploadResultToPage(page, result) {
      if (!page || !result || !result.ok || !result.publicUrl) return page;
      page.storageBucket = result.bucket || page.storageBucket || '';
      page.storagePath = result.path || page.storagePath || '';
      page.storagePublicUrl = result.publicUrl;
      page.publicUrl = result.publicUrl;
      page.fileUrl = result.publicUrl;
      page.downloadUrl = result.publicUrl;
      page.previewDataUrl = result.publicUrl;
      page.editDataUrl = result.publicUrl;
      page.originalDataUrl = '';
      page.correctedDataUrl = '';
      page.previewChoice = 'storage';
      page.storageSavedAt = new Date().toISOString();
      return page;
    }

    function stripDocDataUrlsForServerStorage(doc) {
      doc = doc && typeof doc === 'object' ? doc : {};
      const clone = Object.assign({}, doc);
      const docUrl = getStoredAttachmentUrl(clone);
      if (docUrl) {
        clone.previewDataUrl = docUrl;
        clone.editDataUrl = docUrl;
        clone.fileUrl = clone.fileUrl || docUrl;
        clone.downloadUrl = clone.downloadUrl || docUrl;
      } else {
        clone.previewDataUrl = '';
        clone.editDataUrl = '';
      }
      clone.originalDataUrl = '';
      clone.correctedDataUrl = '';
      clone.pages = (Array.isArray(doc.pages) ? doc.pages : []).map(function(page) {
        const p = Object.assign({}, page || {});
        const url = getStoredAttachmentUrl(p) || docUrl;
        if (url) {
          p.previewDataUrl = url;
          p.editDataUrl = url;
          p.fileUrl = p.fileUrl || url;
          p.downloadUrl = p.downloadUrl || url;
          p.storagePublicUrl = p.storagePublicUrl || url;
          p.publicUrl = p.publicUrl || url;
        } else {
          p.previewDataUrl = '';
          p.editDataUrl = '';
        }
        p.originalDataUrl = '';
        p.correctedDataUrl = '';
        return p;
      });
      if (!clone.fileName && clone.pageCount) clone.fileName = '첨부 ' + clone.pageCount + '장';
      clone.storageMode = docUrl || clone.pages.some(p => p.fileUrl || p.storagePublicUrl) ? 'supabase-storage' : (clone.storageMode || 'metadata-only');
      return clone;
    }

    function stripItemDataUrlsForServerStorage(item) {
      const out = JSON.parse(JSON.stringify(item || {}));
      out.docs = {};
      Object.keys((item && item.docs) || {}).forEach(function(key) {
        out.docs[key] = stripDocDataUrlsForServerStorage(item.docs[key]);
      });
      out.storageMode = 'supabase-storage-v328';
      out.updatedAt = out.updatedAt || new Date().toISOString();
      return out;
    }

    async function uploadEquipmentItemDocsToSupabaseStorage(item) {
      const out = JSON.parse(JSON.stringify(item || {}));
      out.docs = out.docs || {};
      let uploadCount = 0;
      let failCount = 0;
      const docEntries = Object.entries(out.docs || {});
      for (const entry of docEntries) {
        const docKey = entry[0];
        const doc = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
        const pages = Array.isArray(doc.pages) && doc.pages.length ? doc.pages : (doc.fileName ? [{
          id:'legacy_' + docKey + '_1',
          fileName:doc.fileName || '첨부파일',
          previewDataUrl:doc.previewDataUrl || doc.editDataUrl || doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || '',
          editDataUrl:doc.editDataUrl || doc.previewDataUrl || ''
        }] : []);
        for (let i = 0; i < pages.length; i++) {
          try {
            const result = await uploadSingleDocPageToSupabaseStorage(out, docKey, doc, pages[i], i);
            if (result && result.ok && result.publicUrl) {
              pages[i] = applyStorageUploadResultToPage(pages[i], result);
              uploadCount++;
            } else if (result && result.skipped) {
              // 이미 URL이 있거나 업로드 대상이 없으면 실패로 치지 않습니다.
            } else {
              failCount++;
            }
          } catch (e) {
            console.warn('서류 Storage 업로드 실패:', docKey, e);
            failCount++;
          }
        }
        doc.pages = pages;
        const firstUrl = pages.map(getStoredAttachmentUrl).find(Boolean) || getStoredAttachmentUrl(doc);
        if (firstUrl) {
          doc.previewDataUrl = firstUrl;
          doc.editDataUrl = firstUrl;
          doc.fileUrl = doc.fileUrl || firstUrl;
          doc.downloadUrl = doc.downloadUrl || firstUrl;
          doc.storagePublicUrl = doc.storagePublicUrl || firstUrl;
          doc.publicUrl = doc.publicUrl || firstUrl;
          doc.originalDataUrl = '';
          doc.correctedDataUrl = '';
          doc.storageMode = 'supabase-storage';
        }
        out.docs[docKey] = doc;
      }
      out.storageMode = 'supabase-storage-v328';
      out.storageUploadedAt = new Date().toISOString();
      out.storageUploadCount = uploadCount;
      out.storageUploadFailCount = failCount;
      return out;
    }

    async function uploadAndPersistEquipmentItemDocsInBackground(item, reason) {
      try {
        const storageItem = await uploadEquipmentItemDocsToSupabaseStorage(item);
        const serverItem = stripItemDataUrlsForServerStorage(storageItem);
        try { await saveEquipmentItemToSupabase(serverItem, reason || 'storage_background'); } catch (e) { console.warn('Storage 업로드 후 서버저장 실패:', e); }
        try {
          const current = getImmediateRegistrationCompletionItems(serverItem);
          const merged = current.map(function(x) { return String(x.code || '') === String(serverItem.code || '') ? serverItem : x; });
          setItemsForImmediateRegistrationCompletion(merged);
          rememberRuntimeEquipmentItems(merged);
        } catch (e) { console.warn('Storage 업로드 후 로컬 보관함 갱신 실패:', e); }
        sitePassEquipmentSyncMessage = '서류파일 서버저장 완료: ' + (serverItem.storageUploadCount || 0) + '개 업로드';
        return { ok:true, item:serverItem };
      } catch (e) {
        console.warn('서류파일 서버저장 백그라운드 처리 실패:', e);
        sitePassEquipmentSyncMessage = '서류파일 서버저장 확인 필요: ' + (e?.message || e);
        return { ok:false, error:e };
      }
    }

    function makeTinyDocForStorage(doc) {
      doc = (doc && typeof doc === 'object') ? doc : {};
      const count = Array.isArray(doc.pages) ? doc.pages.length : Number(doc.pageCount || 0);
      const tiny = {};
      [
        'key','title','groupKey','groupTitle','required','expiry','expireDate','dateLabel','fileName',
        'workerUid','workerIndex','workerType','workerLabel','workerPhone','workerTask',
        'driverPhone','personPhone','authPhone','authPersonName','authBirth6','authGenderDigit',
        'authCarrier','authVerified','authVerifiedAt','juminMasked','authJuminMasked'
      ].forEach(function(key) {
        if (doc[key] !== undefined && doc[key] !== null && doc[key] !== '') tiny[key] = doc[key];
      });
      tiny.pageCount = count;
      const storedUrl = getStoredAttachmentUrl(doc) || ((Array.isArray(doc.pages) ? doc.pages : []).map(getStoredAttachmentUrl).find(Boolean) || '');
      tiny.pages = storedUrl ? [{ fileName: doc.fileName || '첨부파일', previewDataUrl: storedUrl, editDataUrl: storedUrl, fileUrl: storedUrl, downloadUrl: storedUrl, storagePublicUrl: storedUrl }] : [];
      tiny.previewDataUrl = storedUrl || '';
      tiny.editDataUrl = storedUrl || '';
      tiny.originalDataUrl = '';
      tiny.correctedDataUrl = '';
      tiny.previewChoice = storedUrl ? 'storage' : '';
      if (storedUrl) { tiny.fileUrl = storedUrl; tiny.downloadUrl = storedUrl; tiny.storagePublicUrl = storedUrl; tiny.publicUrl = storedUrl; tiny.storageMode = doc.storageMode || 'supabase-storage'; }
      tiny.fileName = tiny.fileName || (count ? ('첨부 ' + count + '장') : '첨부됨');
      tiny.storageNote = '브라우저 저장공간 부족으로 사진 미리보기는 저장하지 않고 서류명/만료일/QR정보만 저장됨';
      return tiny;
    }

    function makeStorageTinyItem(item) {
      item = (item && typeof item === 'object') ? item : {};
      const tiny = {};
      [
        'id','code','type','kind','category','equipmentNo','equipmentName','name','title','qrLink',
        'ownerMemberId','ownerSignupId','ownerProviderId','ownerName','ownerPhone','memberId','memberName','memberPhone',
        'createdAt','updatedAt','expiresAt','expireDate','shareExpiresAt','managerExpireAt','managerShareToken',
        'serviceStatus','paymentPlan','basicPlan','alertPlan','forwardPolicy','paymentStatus','paymentAmount','paymentMethod','paymentTier',
        'paidAt','trialEndsAt','status','isDeleted','deletedAt'
      ].forEach(function(key) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') tiny[key] = item[key];
      });
      tiny.docs = {};
      Object.keys(item.docs || {}).forEach(function(key) {
        tiny.docs[key] = makeTinyDocForStorage(item.docs[key]);
      });
      const meta = item.bundleMeta && typeof item.bundleMeta === 'object' ? item.bundleMeta : {};
      tiny.bundleMeta = {};
      ['includedGroups','includedGroupNames','equipmentDocCount','driverDocCount','workerDocCount','workerPeopleCount','normalWorkerCount','specialWorkerCount'].forEach(function(key) {
        if (meta[key] !== undefined && meta[key] !== null && meta[key] !== '') tiny.bundleMeta[key] = meta[key];
      });
      if (Array.isArray(meta.workerPeople)) {
        tiny.bundleMeta.workerPeople = meta.workerPeople.map(function(p) {
          return { uid:p.uid || '', type:p.type || 'normal', phone:p.phone || '', task:p.task || '', name:p.name || '' };
        });
      }
      if (Array.isArray(item.workerPeople)) {
        tiny.workerPeople = item.workerPeople.map(function(p) {
          return { uid:p.uid || '', type:p.type || 'normal', phone:p.phone || '', task:p.task || '', name:p.name || '' };
        });
      }
      tiny.storageNote = '브라우저 저장공간 부족으로 이 기기에는 사진 없는 목록정보만 저장됨. QR/보관함 확인용으로 우선 보존됨';
      tiny.localPhotoPreviewStripped = true;
      return tiny;
    }

    function clearNonEssentialRegistrationStorageForSave() {
      // v23.7.330: 사진 등록 후 보관함 저장이 localStorage 용량 때문에 실패하지 않도록
      // 서버 캐시/임시등록/작성중 초안처럼 다시 만들 수 있는 보조자료를 비우고 재시도합니다.
      try { localStorage.removeItem(SERVER_EQUIPMENT_CACHE_KEY); } catch (e) {}
      try { localStorage.removeItem(PENDING_REGISTRATION_KEY); } catch (e) {}
      try { sessionStorage.removeItem(PENDING_REGISTRATION_KEY); } catch (e) {}
      try { localStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch (e) {}
    }

    function clearLegacyEquipmentStorageForCompactSave() {
      // 오래된 버전의 사진 포함 저장값이 남아 있으면 현재 등록 1건도 저장하지 못할 수 있습니다.
      // 테스트 단계에서는 장비 원본 사진보다 QR/보관함 목록 저장이 우선이므로 구버전 장비 저장키만 비웁니다.
      [PREV_STORAGE_KEY, PREV_STORAGE_KEY_2, PREV_STORAGE_KEY_3, PREV_STORAGE_KEY_4, PREV_STORAGE_KEY_5, PREV_STORAGE_KEY_6, PREV_STORAGE_KEY_7, STORAGE_KEY, SERVER_EQUIPMENT_CACHE_KEY].forEach(function(key) {
        try { if (key) localStorage.removeItem(key); } catch (e) {}
      });
      clearNonEssentialRegistrationStorageForSave();
    }

    function tryStoreCompactEquipmentList(list, limit) {
      const compact = (Array.isArray(list) ? list : []).slice(0, limit).map(makeStorageTinyItem);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
        return true;
      } catch (e) {
        console.info('장비 보관함 축약 저장 재시도 필요');
        return false;
      }
    }

    function getEssentialSitePassStorageKeysForSave() {
      const keys = [STORAGE_KEY, MEMBER_STORAGE_KEY, CURRENT_MEMBER_KEY, ADMIN_SESSION_KEY, ADMIN_SESSION_KEY + '_role', ADMIN_SESSION_KEY + '_id', ADMIN_SESSION_KEY + '_name', ADMIN_ROLE_MAP_KEY, PWA_AUTO_MEMBER_KEY, QUICK_AUTH_KEY, SELECTED_PAYMENT_PLAN_KEY];
      return new Set(keys.filter(Boolean).map(String));
    }

    function clearSitePassHeavyStorageForEmergencySave() {
      // v23.7.330: 현재 origin의 SitePass 구버전 사진/base64 캐시가 localStorage를 꽉 채우면
      // 새 QR/보관함 목록도 저장하지 못합니다. 로그인/회원정보는 보존하고 무거운 보조자료만 정리합니다.
      const keep = getEssentialSitePassStorageKeysForSave();
      const keys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      } catch (e) {}
      keys.filter(Boolean).forEach(function(key) {
        const lower = String(key).toLowerCase();
        if (!lower.includes('sitepass')) return;
        if (keep.has(String(key))) return;
        try { localStorage.removeItem(key); } catch (e) {}
      });
      // v23.7.330: 기존 보관함 삭제 방지. 비상 저장에서도 현재 보관함 키는 지우지 않습니다.
    }

    function tryStoreEmergencyEquipmentList(list, limit) {
      const compact = (Array.isArray(list) ? list : []).slice(0, limit).map(makeStorageTinyItem);
      clearSitePassHeavyStorageForEmergencySave();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
        return true;
      } catch (e) {
        console.warn('장비 보관함 비상 축약 저장 실패:', e);
        return false;
      }
    }

    function setItemsWithFallback(items) {
      const list = Array.isArray(items) ? items : [];
      rememberRuntimeEquipmentItems(list);
      if (setItems(list)) return { ok:true, mode:'full' };
      clearNonEssentialRegistrationStorageForSave();
      const lightItems = list.map(makeStorageLightItem);
      if (setItems(lightItems)) return { ok:true, mode:'light' };
      clearNonEssentialRegistrationStorageForSave();
      const tinyItems = list.map(makeStorageTinyItem);
      if (setItems(tinyItems)) return { ok:true, mode:'tiny' };
      clearLegacyEquipmentStorageForCompactSave();
      if (tryStoreCompactEquipmentList(list, 50)) return { ok:true, mode:'compact50' };
      if (tryStoreCompactEquipmentList(list, 10)) return { ok:true, mode:'compact10' };
      if (tryStoreCompactEquipmentList(list, 1)) return { ok:true, mode:'compact1' };
      // v23.7.330: 즉시 등록 경로에서는 기존 보관함 보호가 우선입니다.
      // 저장공간이 부족해도 기존 STORAGE_KEY/PREV_STORAGE_KEY를 지우지 않고 현재 화면 메모리 표시로 둡니다.
      return { ok:false, mode:'memory_preserve_existing' };
    }


    function getFastCompletionExistingItems(newCode) {
      // v23.7.330: 추가등록 완료 직후 화면 이동이 막히지 않도록 기존 항목 병합은 가볍게만 처리합니다.
      // 서버캐시 전체 읽기는 과거 사진/base64가 크면 등록완료 버튼을 붙잡을 수 있어 즉시 경로에서는 제외합니다.
      const code = String(newCode || '');
      const sources = [];
      try { sources.push(readLocalJsonArray(STORAGE_KEY).slice(0, 30)); } catch (e) {}
      try { sources.push((Array.isArray(runtimeEquipmentItems) ? runtimeEquipmentItems : []).slice(0, 30)); } catch (e) {}
      const merged = [];
      sources.forEach(function(list) {
        (Array.isArray(list) ? list : []).forEach(function(x) {
          if (!x || !x.code) return;
          if (String(x.code || '') === code) return;
          // v23.7.330: 추가등록 직후 기존 보관함이 사라져 보이지 않도록
          // 기존 항목은 사진 데이터가 축약되어 있어도 보존합니다.
          merged.push(x);
        });
      });
      const map = new Map();
      merged.forEach(function(x) {
        const key = String(x.code || '');
        if (!key || map.has(key)) return;
        map.set(key, x);
      });
      return Array.from(map.values()).sort(function(a,b){
        return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
      }).slice(0, 30);
    }

    function getImmediateRegistrationCompletionItems(item) {
      const out = [];
      if (item && item.code) out.push(item);
      getFastCompletionExistingItems(item && item.code).forEach(function(x){ out.push(x); });
      const map = new Map();
      out.forEach(function(x) {
        if (!x || !x.code) return;
        const key = String(x.code || '');
        if (!map.has(key)) map.set(key, x);
      });
      return Array.from(map.values()).slice(0, 50);
    }

    function renderFastCompletionListItem() {
      const item = window.sitePassFastCompletionItem;
      const box = document.getElementById('equipmentList');
      if (!box || !item) return false;
      const title = document.getElementById('listScreenTitle');
      const bottomActions = document.getElementById('listScreenBottomActions');
      if (title) title.textContent = '장비/기사/인부 보관함';
      if (bottomActions) {
        bottomActions.innerHTML = '<button class="secondary" onclick="showScreen(\'homeScreen\')">처음 화면</button><button class="dangerBtn" onclick="clearAll()">전체 삭제</button>';
      }
      function fastCardHtml(x, isNew) {
        const safeTitle = escapeHtml(getItemTitle(x));
        const included = escapeHtml(getIncludedGroupText(x));
        const expireText = escapeHtml(getManagerExpireText(getManagerExpireAt(x)));
        const code = escapeJs(x.code || '');
        const codeForValue = escapeHtml(x.code || '');
        return '<div class="list-item">' +
          '<div class="list-item-head"><strong>' + (isNew ? '<span class="badge">방금 등록</span> ' : '') + safeTitle + '</strong><label class="list-select-label"><input type="checkbox" data-list-share-check value="' + codeForValue + '" /> 선택</label></div>' +
          '<div class="small">포함서류: ' + included + '</div>' +
          '<div class="small">서비스상태: ' + escapeHtml(getServiceStatusText(x)) + '</div>' +
          '<div class="small">담당자 QR·링크 만료: ' + expireText + '</div>' +
          (isNew ? '<div class="small">등록 직후에는 새 등록건을 먼저 표시하고 기존 보관함 항목은 함께 보존합니다.</div>' : '') +
          '<div class="actions">' +
            '<button class="ghost" onclick="renderDetail(\'' + code + '\')">상세보기</button>' +
            '<button class="ghost" onclick="openManagerPublicView(\'' + code + '\')">담당자화면</button>' +
            '<button class="primary" onclick="startEditEquipment(\'' + code + '\')">수정/갱신</button>' +
            '<button class="dangerBtn" onclick="deleteItem(\'' + code + '\')">삭제</button>' +
          '</div>' +
        '</div>';
      }
      let list = Array.isArray(window.sitePassFastCompletionItems) && window.sitePassFastCompletionItems.length
        ? window.sitePassFastCompletionItems
        : getImmediateRegistrationCompletionItems(item);
      const newCode = String(item.code || '');
      const map = new Map();
      list.forEach(function(x) { if (x && x.code && !map.has(String(x.code))) map.set(String(x.code), x); });
      if (!map.has(newCode)) map.set(newCode, item);
      list = Array.from(map.values());
      list.sort(function(a,b) {
        if (String(a.code || '') === newCode) return -1;
        if (String(b.code || '') === newCode) return 1;
        return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
      });
      box.innerHTML = '<div class="list-select-toolbar"><div class="small"><b>테스트 등록 완료</b><br>새 등록건을 먼저 표시하고, 기존 보관함 항목은 삭제하지 않고 함께 표시합니다. 서버 동기화는 뒤에서 처리됩니다.</div></div>' +
        list.slice(0, 50).map(function(x){ return fastCardHtml(x, String(x.code || '') === newCode); }).join('');
      return true;
    }
    window.sitePassRenderFastListAfterRegistration = renderFastCompletionListItem;

    function makeImmediateRegistrationSaveListWithPreview(list) {
      // v23.7.330: v321에서 속도 때문에 모든 항목을 tiny 저장하면서 QR/담당자 화면이
      // '첨부됨'만 표시되고 다운로드 사진 데이터가 없는 문제가 있었습니다.
      // 현재 등록 1건은 담당자용 미리보기 데이터(makeStorageLightItem)를 살리고,
      // 기존 보관함 항목은 tiny로 줄여 속도와 저장공간을 같이 지킵니다.
      const raw = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!raw.length) return [];
      const first = makeStorageLightItem(raw[0]);
      const out = [first];
      raw.slice(1, 30).forEach(function(x) {
        try { out.push(makeStorageTinyItem(x)); }
        catch (e) { out.push(x); }
      });
      return out;
    }

    function makeImmediateRegistrationFirstPagePreviewList(list) {
      // 저장공간이 부족할 때의 2차 저장: 현재 등록건의 각 서류별 첫 미리보기 1장만 남깁니다.
      const raw = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!raw.length) return [];
      const first = makeStorageLightItem(raw[0]);
      Object.values(first.docs || {}).forEach(function(doc) {
        const pages = Array.isArray(doc.pages) ? doc.pages.filter(Boolean) : [];
        if (pages.length > 1) doc.pages = [pages[0]];
        const preview = (doc.pages && doc.pages[0] && (doc.pages[0].previewDataUrl || doc.pages[0].editDataUrl)) || doc.previewDataUrl || doc.editDataUrl || '';
        doc.previewDataUrl = preview || '';
        doc.editDataUrl = preview || '';
        if (doc.pages && doc.pages[0]) {
          doc.pages[0].previewDataUrl = doc.pages[0].previewDataUrl || preview || '';
          doc.pages[0].editDataUrl = doc.pages[0].editDataUrl || doc.pages[0].previewDataUrl || '';
        }
        doc.storageNote = '저장공간 보호를 위해 이 서류는 첫 미리보기만 저장되었습니다.';
      });
      const out = [first];
      raw.slice(1, 30).forEach(function(x) {
        try { out.push(makeStorageTinyItem(x)); }
        catch (e) { out.push(x); }
      });
      return out;
    }

    function tryStoreImmediateRegistrationPreviewList(list) {
      const saveList = makeImmediateRegistrationSaveListWithPreview(list);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveList));
        rememberRuntimeEquipmentItems(saveList);
        return { ok:true, mode:'preview' };
      } catch (e) {
        console.info('현재 등록건 사진 미리보기 저장 실패: 첫 미리보기 저장으로 재시도합니다.');
        return { ok:false, error:e };
      }
    }

    function tryStoreImmediateRegistrationFirstPagePreviewList(list) {
      const saveList = makeImmediateRegistrationFirstPagePreviewList(list);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveList));
        rememberRuntimeEquipmentItems(saveList);
        return { ok:true, mode:'preview_first_page' };
      } catch (e) {
        console.info('현재 등록건 첫 미리보기 저장 실패: 목록정보 저장으로 재시도합니다.');
        return { ok:false, error:e };
      }
    }

    function setItemsForImmediateRegistrationCompletion(items) {
      // v23.7.330: 등록완료 속도는 유지하되, 현재 등록건의 사진 미리보기 데이터는 QR/담당자 화면에 남깁니다.
      // 기존 보관함 사진까지 모두 병합하지 않고, 현재 등록건 preview + 기존 항목 tiny 방식으로 저장합니다.
      const list = Array.isArray(items) ? items : [];
      rememberRuntimeEquipmentItems(list);
      try { clearNonEssentialRegistrationStorageForSave(); } catch (e) {}
      const previewResult = tryStoreImmediateRegistrationPreviewList(list);
      if (previewResult.ok) return previewResult;
      const firstPageResult = tryStoreImmediateRegistrationFirstPagePreviewList(list);
      if (firstPageResult.ok) return firstPageResult;
      if (tryStoreCompactEquipmentList(list, 50)) return { ok:true, mode:'compact50' };
      if (tryStoreCompactEquipmentList(list, 10)) return { ok:true, mode:'compact10' };
      if (tryStoreCompactEquipmentList(list, 1)) return { ok:true, mode:'compact1' };
      // v23.7.330: 즉시 등록 경로에서는 기존 보관함 보호가 우선입니다.
      // 저장공간이 부족해도 기존 STORAGE_KEY/PREV_STORAGE_KEY를 지우지 않고 현재 화면 메모리 표시로 둡니다.
      return { ok:false, mode:'memory_preserve_existing' };
    }

    function showListScreenImmediatelyForRegistration(item) {
      try {
        window.sitePassFastCompletingRegistration = true;
        window.sitePassFastCompletionItem = makeStorageLightItem(item);
        document.body.classList.remove('sitepass-booting');
        document.body.classList.remove('manager-view-mode');
        document.querySelectorAll('.screen').forEach(function(screen){ screen.classList.add('hidden'); });
        const target = document.getElementById('listScreen');
        if (target) target.classList.remove('hidden');
        if (typeof window.sitePassRenderFastListAfterRegistration === 'function') {
          window.sitePassRenderFastListAfterRegistration();
        }
        try {
          if (window.history && window.history.replaceState) {
            window.history.replaceState({ sitepassScreen:'listScreen' }, document.title || 'SitePass', window.location.pathname + window.location.search);
          }
        } catch (e) {}
        try { window.scrollTo({ top:0, behavior:'auto' }); } catch (e) {}
        setTimeout(function(){ window.sitePassFastCompletingRegistration = false; }, 1500);
        return true;
      } catch (e) {
        console.warn('즉시 보관함 화면 표시 실패:', e);
        return false;
      }
    }

    function completeTestRegistrationInstantly(item, paymentTier) {
      // v23.7.330: 등록완료 대기시간을 없애기 위해 결제완료 변환/가벼운 저장/화면이동을 동기적으로 끝냅니다.
      item = (item && typeof item === 'object') ? item : {};
      const validation = validateRegistrationItemHasDownloadableDocs(item);
      if (!validation.ok) {
        alert(validation.message || '서류 사진 데이터가 없어 등록을 중단합니다.');
        return;
      }
      const now = new Date();
      const nowIso = now.toISOString();
      const info = { key:'test-free', label:'테스트 무료등록', price:'결제없음', days:60, serviceStatus:'실사용베타', planText:'테스트 무료등록 · 결제없음', additional: paymentTier === 'additional' };
      const equipmentRegister = getEquipmentRegisterModule ? getEquipmentRegisterModule() : {};
      const paidItem = equipmentRegister && equipmentRegister.buildPaidRegistrationItem
        ? equipmentRegister.buildPaidRegistrationItem({
            item,
            info,
            nowIso,
            trialEndsAt:addDaysIso(nowIso, info.days),
            managerExpireAt:new Date(getSevenDaysFromNowMs()).toISOString(),
            managerShareToken:makeManagerShareToken(),
            paymentTier:paymentTier || 'first'
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
            paymentTier: paymentTier || 'first',
            updatedAt: nowIso
          };
      if (!equipmentRegister.buildPaidRegistrationItem && paidItem.bundleMeta) paidItem.bundleMeta.paymentText = info.planText + ' 결제완료';

      // v23.7.330: 등록완료 화면 전환을 어떤 저장/병합 작업보다 먼저 실행합니다.
      // v325에서 기존 보관함 보존 병합이 등록완료 흐름을 붙잡아 보관함으로 안 넘어가는 문제가 있었습니다.
      const immediateItems = getImmediateRegistrationCompletionItems(paidItem);
      try { window.sitePassFastCompletionItems = immediateItems; } catch (e) {}
      try { rememberRuntimeEquipmentItems(immediateItems); } catch (e) {}
      try { clearPendingRegistration(); } catch (e) {}
      try { clearRegistrationDraft(); } catch (e) {}
      sitePassEquipmentSyncMessage = '테스트 등록완료: 화면 먼저 표시, 저장/서버 동기화는 뒤에서 처리 중';
      const movedToList = showListScreenImmediatelyForRegistration(paidItem);
      if (!movedToList) {
        try { showScreen('listScreen', { replace:true }); } catch (e) { console.warn('보관함 화면 이동 실패:', e); }
      }

      let saveResult = { ok:false, mode:'scheduled' };
      setTimeout(function(){
        try {
          const items = getImmediateRegistrationCompletionItems(paidItem);
          saveResult = setItemsForImmediateRegistrationCompletion(items);
          if (!saveResult.ok) {
            try { rememberRuntimeEquipmentItems(items); } catch (e) {}
            console.warn('테스트 즉시 등록완료: 브라우저 저장은 실패했지만 현재 화면 보관함 표시를 우선 진행합니다.');
          }
        } catch (e) {
          console.warn('테스트 즉시 등록완료 후 보관함 저장/병합 실패:', e);
        }
      }, 80);
      setTimeout(function(){
        try {
          const note = saveResult && saveResult.ok ? getStorageFallbackNote(saveResult) : '\n\n보관함 화면을 먼저 표시했습니다. 저장은 뒤에서 처리 중입니다.';
          alert(`테스트 등록이 완료되었습니다.\n\n${escapePlainTextForAlert(paidItem.equipmentName || '장비')} QR링크가 생성되고 보관함에 표시되었습니다.${note}\n\n※ 서버 동기화는 뒤에서 처리합니다. 테스트 기간에는 결제단계를 건너뜁니다.`);
        } catch (e) {}
      }, 250);
      setTimeout(function(){
        try { resetForm(false); } catch (e) {}
        try { updateHomeRegistrationButton(); } catch (e) {}
      }, 1000);
      setTimeout(function(){
        try {
          if (!itemHasDownloadableDocData(paidItem)) {
            console.warn('사진 데이터 없는 등록건은 빈 QR 방지를 위해 백그라운드 서버저장을 생략합니다.');
            return;
          }
          Promise.resolve(uploadAndPersistEquipmentItemDocsInBackground(paidItem, 'test_free_completed_storage_background')).then(function(bgResult){
            sitePassEquipmentSyncMessage = bgResult && bgResult.ok ? '서류파일 서버저장 완료: QR/보관함은 Storage URL 사용' : ('서류파일 서버저장 확인 필요: ' + (bgResult?.error?.message || bgResult?.error || '알 수 없음'));
          }).catch(function(e){
            console.warn('테스트 즉시 등록완료 후 Storage 백그라운드 저장 실패:', e);
            sitePassEquipmentSyncMessage = '서류파일 서버저장 확인 필요: ' + (e?.message || e);
          });
        } catch (e) {}
      }, 3500);
    }
    window.completeTestRegistrationInstantly = completeTestRegistrationInstantly;

    function getStorageFallbackNote(result) {
      if (!result || result.mode === 'full') return '';
      if (result.mode === 'preview') return String.fromCharCode(10) + String.fromCharCode(10) + '등록 속도를 위해 원본/보정본 비교데이터는 제외하고 QR/담당자용 사진 미리보기를 저장했습니다.';
      if (result.mode === 'preview_first_page') return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간 보호를 위해 각 서류의 첫 미리보기 중심으로 저장했습니다.';
      if (result.mode === 'light') return String.fromCharCode(10) + String.fromCharCode(10) + '용량을 줄이기 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장했습니다.';
      if (result.mode === 'tiny') return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 부족해서 이 기기에는 사진 없는 목록정보만 저장했습니다.';
      if (String(result.mode || '').indexOf('compact') === 0) return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 가득 차서 구버전 사진 캐시를 정리하고 QR/보관함 목록정보만 저장했습니다.';
      if (String(result.mode || '').indexOf('emergency') === 0) return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 가득 차서 로그인정보를 제외한 SitePass 임시/사진 캐시를 정리하고 QR/보관함 목록정보만 저장했습니다.';
      return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 가득 차서 이 기기 저장은 메모리로만 유지됩니다. 새로고침 전 보관함을 확인해주세요.';
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
        const firstPreview = pages.map(getStoredAttachmentUrl).find(Boolean) || pages.find(page => page.previewDataUrl)?.previewDataUrl || doc.previewDataUrl || doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || '';
        doc.previewDataUrl = firstPreview;
        doc.editDataUrl = firstPreview;
        if (firstPreview && firstPreview.indexOf('data:') !== 0) {
          doc.fileUrl = doc.fileUrl || firstPreview;
          doc.downloadUrl = doc.downloadUrl || firstPreview;
          doc.storagePublicUrl = doc.storagePublicUrl || firstPreview;
        }
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        if (Array.isArray(doc.pages)) {
          doc.pages.forEach(page => {
            const pageUrl = getStoredAttachmentUrl(page) || page.previewDataUrl || firstPreview || '';
            page.previewDataUrl = pageUrl || '';
            page.editDataUrl = page.editDataUrl || page.previewDataUrl || '';
            if (pageUrl && pageUrl.indexOf('data:') !== 0) {
              page.fileUrl = page.fileUrl || pageUrl;
              page.downloadUrl = page.downloadUrl || pageUrl;
              page.storagePublicUrl = page.storagePublicUrl || pageUrl;
            }
            page.originalDataUrl = '';
            page.correctedDataUrl = '';
            page.previewChoice = page.previewDataUrl ? (page.previewChoice || (pageUrl.indexOf('data:') === 0 ? 'preview' : 'storage')) : (page.previewChoice || '');
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

// ---- merged from app-register-share-payment-08.js ----
// SitePass v23.7.330 - app-register-share-payment finer split (08/15)
function makeQrUrl(link, size = 180) {
      const qrShare = getQrShareModule();
      if (qrShare.makeQrUrl) return qrShare.makeQrUrl(link, size);
      return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(link || '');
    }

    function renderAlertPreview() {
      const activeDefs = getActiveDocDefs().filter(doc => doc.expiry);
      const rows = activeDefs.map(def => {
        const value = document.querySelector('[data-date-key="' + def.dateKey + '"]')?.value || '';
        return '<div class="line"><b>' + escapeHtml(def.groupTitle + ' - ' + def.dateLabel) + '</b><span>' + (value ? escapeHtml(value + ' / ' + getDdayText(value)) : '날짜 없음') + '</span></div>';
      }).join('');
      const box = document.getElementById('alertPreview');
      if (box) box.innerHTML = rows || '<div class="empty">만료일을 입력하는 서류가 없습니다.</div>';
    }

    function getShareItemLabel(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getShareItemLabel) return recipientView.getShareItemLabel(item);
      if (!item) return '';
      return (item.equipmentName || '장비명 없음') + ' / ' + (item.equipmentNo || '번호 없음');
    }

    function getItemTitle(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getItemTitle) return recipientView.getItemTitle(item);
      return getShareItemLabel(item);
    }

    function getShareTitleForItems(items) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getShareTitleForItems) return recipientView.getShareTitleForItems(items);
      const safe = (items || []).filter(Boolean);
      if (safe.length === 1) return getShareItemLabel(safe[0]) + ' 서류';
      if (!safe.length) return 'SitePass 담당자 서류';
      return 'SitePass 장비서류 ' + safe.length + '건';
    }

    function getShareSubtitle(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getShareSubtitle) return recipientView.getShareSubtitle(item);
      return '현장 반입서류 확인 · 다운로드/프린트 전용';
    }

    function getIncludedGroupText(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getIncludedGroupText) return recipientView.getIncludedGroupText(item);
      const names = item?.bundleMeta?.includedGroupNames;
      if (Array.isArray(names) && names.length) {
        const out = names.slice();
        const meta = item.bundleMeta || {};
        const workerIndex = out.indexOf('인부서류');
        const workerCount = Number(meta.workerPeopleCount || (Array.isArray(item.workerPeople) ? item.workerPeople.length : 0));
        if (workerIndex >= 0 && workerCount) {
          out[workerIndex] = '인부서류 ' + workerCount + '명(보통 ' + (meta.normalWorkerCount || 0) + '명 / 특수 ' + (meta.specialWorkerCount || 0) + '명)';
        }
        return out.join(', ');
      }
      if (item?.type === 'BUNDLE') return '장비서류';
      return '장비서류';
    }


    function getDeadlineDiffDays(dateValue) {
      if (!dateValue) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0,0,0,0);
      return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    }

    function getD7DeadlineDocs(item) {
      return getDisplayDocs(item).filter(doc => {
        if (!doc || !doc.expiry || !doc.expireDate) return false;
        if (!doc.fileName && !getDocPagesFromDoc(doc).length) return false;
        const diff = getDeadlineDiffDays(doc.expireDate);
        return diff !== null && diff <= 7;
      }).sort((a, b) => getDeadlineDiffDays(a.expireDate) - getDeadlineDiffDays(b.expireDate));
    }

    function getServiceOverdueDays(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getServiceOverdueDays) return payments.getServiceOverdueDays(item);
      if (!item || !item.trialEndsAt) return null;
      const end = new Date(item.trialEndsAt);
      if (Number.isNaN(end.getTime())) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      return diff < 0 ? Math.abs(diff) : 0;
    }

    function isServiceGrace14Over(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isServiceGrace14Over) return payments.isServiceGrace14Over(item);
      const overdueDays = getServiceOverdueDays(item);
      return overdueDays !== null && overdueDays >= 14;
    }

    function renderD7DeadlineNotice(item) {
      const docs = getD7DeadlineDocs(item);
      if (!docs.length) return '';
      const rows = docs.map(doc => {
        const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
        return '<li>' + escapeHtml(title) + ' · ' + escapeHtml(getDdayText(doc.expireDate)) + ' · ' + escapeHtml(doc.expireDate) + '</li>';
      }).join('');
      return '<div class="deadline-alert-box"><b>만료임박 서류(D-7 이내)</b><ul>' + rows + '</ul></div>';
    }

    function getAdminListQuickFilterLabel(filterKey) {
      const labels = {
        all:'전체 장비서류',
        paused:'QR 일시정지',
        expiring:'서류 만료임박',
        expired:'서류 만료',
        grace14:'유예 14일 이상'
      };
      return labels[filterKey] || '전체 장비서류';
    }

    function itemMatchesAdminListQuickFilter(item, filterKey) {
      if (!filterKey || filterKey === 'all') return true;
      if (filterKey === 'paused') return isQrPaused(item);
      if (filterKey === 'expiring') return Object.values(item.docs || {}).some(doc => (doc.status || getDocStatus(doc)) === '만료임박');
      if (filterKey === 'expired') return Object.values(item.docs || {}).some(doc => (doc.status || getDocStatus(doc)) === '만료');
      if (filterKey === 'grace14') return isServiceGrace14Over(item);
      return true;
    }

    function openAdminListQuickFilter(filterKey) {
      const archive = getArchiveModule();
      if (archive.openAdminListQuickFilter) return archive.openAdminListQuickFilter(filterKey);
      adminListQuickFilter = filterKey || 'all';
      showScreen('listScreen');
    }

    function clearAdminListQuickFilter() {
      const archive = getArchiveModule();
      if (archive.clearAdminListQuickFilter) return archive.clearAdminListQuickFilter();
      adminListQuickFilter = 'all';
      renderList();
    }

    function openAdminContactManager() {
      showScreen('adminScreen');
      setTimeout(() => {
        const card = document.getElementById('adminContactManagerCard');
        if (card) card.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 80);
    }

    function renderList() {
      const archive = getArchiveModule();
      if (archive.renderList) return archive.renderList();
      const box = document.getElementById('equipmentList');
      if (box) box.innerHTML = '<div class="empty">보관함 모듈을 불러오지 못했습니다. 최신 수정본을 다시 올려주세요.</div>';
    }

    function selectAllListItems(checked) {
      const archive = getArchiveModule();
      if (archive.selectAllListItems) return archive.selectAllListItems(checked);
    }

    function getSelectedListCodes() {
      const archive = getArchiveModule();
      return archive.getSelectedListCodes ? archive.getSelectedListCodes() : [];
    }

    function getSevenDaysFromNowMs() {
      return Date.now() + (7 * 24 * 60 * 60 * 1000);
    }

    function refreshManagerExpiryForCodes(codes) {
      const uniqueCodes = Array.from(new Set((codes || []).filter(Boolean)));
      if (!uniqueCodes.length) return [];
      const expireAt = getSevenDaysFromNowMs();
      const expireIso = new Date(expireAt).toISOString();
      const codeSet = new Set(uniqueCodes);
      const all = getItems();
      all.forEach(item => {
        if (codeSet.has(item.code) && !isServiceShareBlocked(item)) {
          item.managerExpireAt = expireIso;
          item.updatedAt = new Date().toISOString();
        }
      });
      setItems(all);
      return uniqueCodes.map(code => getItemByCode(code)).filter(Boolean);
    }

    function getCodeFromManagerLink(link) {
      const parsed = parseManagerHash(String(link || '').includes('#manager=') ? '#' + String(link || '').split('#')[1] : link);
      return parsed.code || '';
    }

    function getItemsFromCodes(codes) {
      const archive = getArchiveModule();
      return archive.getItemsFromCodes ? archive.getItemsFromCodes(codes) : (codes || []).map(code => getItemByCode(code)).filter(Boolean);
    }

    function getSelectedListItemsForShare() {
      const archive = getArchiveModule();
      return archive.getSelectedListItemsForShare ? archive.getSelectedListItemsForShare() : [];
    }

    function shareOneListItem(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItem) return archive.shareOneListItem(code);
      shareOneListItemKakao(code);
    }

    function shareSelectedListItems() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItems) return archive.shareSelectedListItems();
      shareSelectedListItemsKakao();
    }

    function shareOneListItemKakao(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemKakao) return archive.shareOneListItemKakao(code);
    }

    function shareOneListItemSms(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemSms) return archive.shareOneListItemSms(code);
    }

