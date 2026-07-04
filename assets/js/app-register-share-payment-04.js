// SitePass v23.7.299 - app-register-share-payment split continue (04/09)
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

