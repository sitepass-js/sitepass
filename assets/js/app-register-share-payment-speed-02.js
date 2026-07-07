// SitePass v23.7.319 - speed optimized medium chunk (app-register-share-payment-speed 02/04)
// ---- merged from app-register-share-payment-05.js ----
// SitePass v23.7.319 - app-register-share-payment finer split (05/15)
async function completePendingRegistrationPayment(plan) {
      if (sitePassRegistrationCompletionBusy) return;
      sitePassRegistrationCompletionBusy = true;
      try {
        const pending = getPendingRegistration();
        if (!pending || !pending.item) { alert('결제 대기 중인 등록서류가 없습니다.'); return; }
        if (!window.SITEPASS_TEST_NO_PAYMENT_MODE && !requirePaymentOwnerVerification('등록 결제')) return;

        const item = pending.item;
        // v23.7.319: 테스트 등록완료에서는 기존 전체 보관함/구버전 사진 캐시를 병합하지 않습니다.
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
          // v23.7.319: 테스트 등록 완료는 현장 사용감이 중요합니다.
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
          // v23.7.319: showScreen('listScreen') 내부의 registerScreen 이탈 자동저장을 건너뜁니다.
          // 등록완료 직후에는 이미 clearRegistrationDraft()를 했으므로 다시 저장하면 대기시간만 길어집니다.
          window.sitePassFastCompletingRegistration = true;
          window.sitePassFastCompletionItem = makeStorageTinyItem(paidItem);
          try { showScreen('listScreen', { replace:true }); } catch (e) { console.warn('보관함 화면 이동 실패:', e); }
          finally { setTimeout(function(){ window.sitePassFastCompletingRegistration = false; }, 1200); }
          // v23.7.319: 등록완료 직후 renderList()를 즉시 다시 돌리지 않습니다.
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
// SitePass v23.7.319 - app-register-share-payment finer split (06/15)
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
        // v23.7.319: 서버 장비 캐시는 보조 캐시라서, 용량 초과 때 원본 이미지/base64까지
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
      // v23.7.319: 일반회원 화면에서 전체 장비목록 RPC/SELECT를 실행하면
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

// ---- merged from app-register-share-payment-07.js ----
// SitePass v23.7.319 - app-register-share-payment finer split (07/15)
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
      tiny.pages = [];
      tiny.previewDataUrl = '';
      tiny.editDataUrl = '';
      tiny.originalDataUrl = '';
      tiny.correctedDataUrl = '';
      tiny.previewChoice = '';
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
      // v23.7.319: 사진 등록 후 보관함 저장이 localStorage 용량 때문에 실패하지 않도록
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
        localStorage.removeItem(STORAGE_KEY);
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
      // v23.7.319: 현재 origin의 SitePass 구버전 사진/base64 캐시가 localStorage를 꽉 채우면
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
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
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
      if (tryStoreEmergencyEquipmentList(list, 25)) return { ok:true, mode:'emergency25' };
      if (tryStoreEmergencyEquipmentList(list, 5)) return { ok:true, mode:'emergency5' };
      if (tryStoreEmergencyEquipmentList(list, 1)) return { ok:true, mode:'emergency1' };
      return { ok:false, mode:'memory' };
    }


    function getImmediateRegistrationCompletionItems(item) {
      const out = [];
      try {
        readLocalJsonArray(STORAGE_KEY).slice(0, 30).forEach(function(x){ if (x && x.code) out.push(x); });
      } catch (e) {}
      if (item && item.code) out.unshift(item);
      const map = new Map();
      out.forEach(function(x) {
        if (!x || !x.code) return;
        const key = String(x.code || '');
        if (!map.has(key)) map.set(key, x);
      });
      return Array.from(map.values()).slice(0, 30);
    }

    function renderFastCompletionListItem() {
      const item = window.sitePassFastCompletionItem;
      const box = document.getElementById('equipmentList');
      if (!box || !item) return false;
      const title = document.getElementById('listScreenTitle');
      const bottomActions = document.getElementById('listScreenBottomActions');
      if (title) title.textContent = '장비/기사/인부 보관함';
      if (bottomActions) bottomActions.innerHTML = '<button class="secondary" onclick="showScreen('homeScreen')">처음 화면</button><button class="dangerBtn" onclick="clearAll()">전체 삭제</button>';
      const safeTitle = escapeHtml(getItemTitle(item));
      const included = escapeHtml(getIncludedGroupText(item));
      const expireText = escapeHtml(getManagerExpireText(getManagerExpireAt(item)));
      box.innerHTML = '<div class="list-select-toolbar"><div class="small"><b>테스트 등록 완료</b><br>QR/보관함 목록을 먼저 표시했습니다. 서버 동기화는 뒤에서 처리됩니다.</div></div>' +
        '<div class="list-item">' +
          '<div class="list-item-head"><strong>' + safeTitle + '</strong><label class="list-select-label"><input type="checkbox" data-list-share-check value="' + escapeHtml(item.code || '') + '" /> 선택</label></div>' +
          '<div class="small">포함서류: ' + included + '</div>' +
          '<div class="small">서비스상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
          '<div class="small">담당자 QR·링크 만료: ' + expireText + '</div>' +
          '<div class="small">브라우저 저장공간 보호를 위해 등록 직후에는 목록정보를 우선 표시합니다.</div>' +
          '<div class="actions"><button class="ghost" onclick="renderDetail('' + escapeJs(item.code || '') + '')">상세보기</button><button class="ghost" onclick="openManagerPublicView('' + escapeJs(item.code || '') + '')">담당자화면</button><button class="primary" onclick="startEditEquipment('' + escapeJs(item.code || '') + '')">수정/갱신</button><button class="dangerBtn" onclick="deleteItem('' + escapeJs(item.code || '') + '')">삭제</button></div>' +
        '</div>';
      return true;
    }
    window.sitePassRenderFastListAfterRegistration = renderFastCompletionListItem;

    function setItemsForImmediateRegistrationCompletion(items) {
      // v23.7.319: 등록완료 버튼에서 오래 멈추지 않도록 full JSON/base64 저장을 먼저 시도하지 않습니다.
      // 현재 화면에서는 runtimeEquipmentItems에 원본을 보존하고, localStorage에는 QR/보관함 표시용 목록정보를 우선 저장합니다.
      const list = Array.isArray(items) ? items : [];
      rememberRuntimeEquipmentItems(list);
      try { clearNonEssentialRegistrationStorageForSave(); } catch (e) {}
      if (tryStoreCompactEquipmentList(list, 50)) return { ok:true, mode:'compact50' };
      if (tryStoreCompactEquipmentList(list, 10)) return { ok:true, mode:'compact10' };
      if (tryStoreCompactEquipmentList(list, 1)) return { ok:true, mode:'compact1' };
      if (tryStoreEmergencyEquipmentList(list, 25)) return { ok:true, mode:'emergency25' };
      if (tryStoreEmergencyEquipmentList(list, 5)) return { ok:true, mode:'emergency5' };
      if (tryStoreEmergencyEquipmentList(list, 1)) return { ok:true, mode:'emergency1' };
      return { ok:false, mode:'memory' };
    }

    function getStorageFallbackNote(result) {
      if (!result || result.mode === 'full') return '';
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

// ---- merged from app-register-share-payment-08.js ----
// SitePass v23.7.319 - app-register-share-payment finer split (08/15)
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

