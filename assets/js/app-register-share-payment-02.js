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
        localStorage.setItem(SERVER_EQUIPMENT_CACHE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
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
          const existing = map.get(code) || {};
          map.set(code, { ...existing, ...item });
        });
      });
      return Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }

    function normalizeSupabaseEquipmentRow(row) {
      if (!row) return null;
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

    function shareOneListItemEmail(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemEmail) return archive.shareOneListItemEmail(code);
    }

    function shareSelectedListItemsKakao() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsKakao) return archive.shareSelectedListItemsKakao();
    }

    function shareSelectedListItemsSms() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsSms) return archive.shareSelectedListItemsSms();
    }

    function shareSelectedListItemsEmail() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsEmail) return archive.shareSelectedListItemsEmail();
    }

    function buildManagerShareText(items) {
      const archive = getArchiveModule();
      if (archive.buildManagerShareText) return archive.buildManagerShareText(items);
      return '[SitePass] 담당자 서류 공유';
    }

    function renderManagerSharePreviewPanel(item) {
      const archive = getArchiveModule();
      return archive.renderManagerSharePreviewPanel ? archive.renderManagerSharePreviewPanel(item) : '';
    }

    const PUBLIC_SHARE_TABLE = 'sitepass_public_shares';

    function getSitePassSupabaseClient() {
      return window.sitepassSupabase || null;
    }

    function cloneShareItemForServer(item, expireAt, sig) {
      const copy = JSON.parse(JSON.stringify(item || {}));
      copy.managerExpireAt = new Date(Number(expireAt || getManagerExpireAt(item))).toISOString();
      copy.managerShareToken = item?.managerShareToken || getOrCreateManagerShareToken(item?.code || '');
      copy.managerShareSig = sig || getManagerLinkSignature(item?.code || '', Number(expireAt || getManagerExpireAt(item)));
      copy.publicShareSavedAt = new Date().toISOString();
      return copy;
    }

    function upsertSharedItemIntoLocalCache(item) {
      if (!item || !item.code) return null;
      const all = getItems();
      const idx = all.findIndex(x => String(x.code || '') === String(item.code || ''));
      const merged = idx >= 0 ? { ...all[idx], ...item } : item;
      if (idx >= 0) all[idx] = merged;
      else all.unshift(merged);
      setItems(all);
      return merged;
    }

    async function saveManagerShareItemsToSupabase(items) {
      const client = getSitePassSupabaseClient();
      if (!client) {
        return { ok:false, message:'Supabase 연결 객체가 없습니다.' };
      }
      const safeItems = (items || []).filter(Boolean);
      if (!safeItems.length) return { ok:true, saved:0 };
      try {
        const nowIso = new Date().toISOString();
        const rows = safeItems.map(item => {
          const expireAt = getManagerExpireAt(item);
          const sig = getManagerLinkSignature(item.code || '', expireAt);
          const shareItem = cloneShareItemForServer(item, expireAt, sig);
          return {
            share_code: String(item.code || ''),
            share_sig: String(sig || ''),
            expires_at: new Date(expireAt).toISOString(),
            item_data: shareItem,
            share_title: getShareItemLabel(item),
            equipment_no: String(item.equipmentNo || ''),
            equipment_name: String(item.equipmentName || ''),
            owner_login_id: String(item.ownerSignupId || item.ownerProviderId || ''),
            updated_at: nowIso
          };
        }).filter(row => row.share_code && row.share_sig);
        if (!rows.length) return { ok:false, message:'저장할 담당자 링크 정보가 없습니다.' };
        const { error } = await client
          .from(PUBLIC_SHARE_TABLE)
          .upsert(rows, { onConflict:'share_code' });
        if (error) return { ok:false, message:error.message || 'Supabase 저장 오류' };
        return { ok:true, saved:rows.length };
      } catch (e) {
        return { ok:false, message:e?.message || String(e) };
      }
    }

    async function loadManagerShareItemFromSupabase(code, sig) {
      const qrShare = getQrShareModule();
      if (qrShare.loadManagerShareItemFromSupabase) {
        return await qrShare.loadManagerShareItemFromSupabase(code, sig, {
          getClient: getSitePassSupabaseClient,
          upsertLocalCache: upsertSharedItemIntoLocalCache
        });
      }
      if (!getSitePassSupabaseClient() || !code || !sig) return { ok:false, message:'Supabase 연결 또는 링크 서명이 없습니다.' };
      return { ok:false, message:'QR 공유 모듈 연결 실패' };
    }

    function showManagerLinkLoadMessage(message) {
      const box = document.getElementById('managerPrintBox');
      if (box) box.innerHTML = '<div class="empty">' + escapeHtml(message || '담당자 링크를 확인하고 있습니다.') + '</div>';
      showScreen('managerPrintScreen');
    }

    async function renderManagerPrintFromHash(parsed) {
      if (!parsed || !parsed.code) {
        showManagerLinkLoadMessage('담당자 링크 정보가 없습니다. 링크를 다시 확인해주세요.');
        return;
      }
      let item = getItemByCode(parsed.code);
      if (!item && parsed.sig) {
        showManagerLinkLoadMessage('서버에서 담당자 링크를 불러오는 중입니다.');
        const loaded = await loadManagerShareItemFromSupabase(parsed.code, parsed.sig);
        if (loaded.ok) item = loaded.item;
        else if (loaded.expired) {
          const box = document.getElementById('managerPrintBox');
          if (box) box.innerHTML = '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 7일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
          showScreen('managerPrintScreen');
          return;
        } else {
          const msg = loaded.notFound
            ? '조회할 수 없는 코드입니다.<br>장비업자가 7일 링크를 다시 공유해야 합니다.'
            : '담당자 링크를 서버에서 불러오지 못했습니다.<br>장비업자에게 새 링크를 다시 받아주세요.<br><span class="small">' + escapeHtml(loaded.message || '') + '</span>';
          const box = document.getElementById('managerPrintBox');
          if (box) box.innerHTML = '<div class="empty">' + msg + '</div>';
          showScreen('managerPrintScreen');
          return;
        }
      }
      renderManagerPrint(parsed.code, parsed.exp, parsed.sig);
    }

    function shareManagerItems(items) {
      shareManagerItemsByChannel(items, 'kakao');
    }

    async function shareManagerItemsByChannel(items, channel) {
      const requestedItems = (items || []).filter(Boolean);
      if (!canUseQrShareItems(requestedItems, '담당자 QR·링크 보내기')) return;
      const safeItems = refreshManagerExpiryForCodes(requestedItems.map(item => item.code));
      if (!safeItems.length) return;

      const saved = await saveManagerShareItemsToSupabase(safeItems);
      if (!saved.ok) {
        alert('담당자 링크를 서버에 저장하지 못했습니다.\n지금 보내면 받은 사람 휴대폰에서 조회할 수 없는 코드가 나올 수 있습니다.\n\nSupabase SQL Editor에서 sitepass_public_shares 테이블을 만든 뒤 다시 7일 링크 공유를 눌러주세요.\n\n오류: ' + (saved.message || '알 수 없는 오류'));
        return;
      }

      const text = buildManagerShareText(safeItems);
      const first = safeItems[0];
      const firstLink = makeManagerLink(first.code, getManagerExpireAt(first));
      if (channel === 'sms') {
        openSmsShare(text);
        return;
      }
      if (channel === 'email') {
        openEmailShare(text, safeItems);
        return;
      }
      openKakaoShare(text, firstLink, safeItems.length);
    }

    function openKakaoShare(text, firstLink, itemCount) {
      if (navigator.share) {
        const payload = itemCount === 1
          ? { title:'SitePass 담당자 서류', text:'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.', url:firstLink }
          : { title:'SitePass 담당자 서류', text };
        navigator.share(payload).catch(() => copyTextFallback(text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.'));
      } else {
        copyTextFallback(text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.');
      }
    }

    function normalizePhoneForShare(phone) {
      const qrShare = getQrShareModule();
      if (qrShare.normalizePhoneForShare) return qrShare.normalizePhoneForShare(phone);
      return String(phone || '').replace(/[^0-9+]/g, '');
    }

    function openSmsShare(text) {
      const phoneRaw = prompt('받는 사람 휴대폰번호를 입력해주세요.\n예: 01012345678');
      if (phoneRaw === null) return;
      const phone = normalizePhoneForShare(phoneRaw);
      if (!phone) { alert('휴대폰번호를 입력해야 문자로 보낼 수 있습니다.'); return; }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(phone) + '?&body=' + body;
    }

    function openSmsShareToPhones(phones, text) {
      const targets = Array.from(new Set((phones || []).map(normalizePhoneForShare).filter(Boolean)));
      if (!targets.length) {
        alert('문자를 보낼 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(targets.join(',')) + '?&body=' + body;
    }

    function buildAdminOwnerAlertText(items) {
      const safeItems = (items || []).filter(Boolean);
      const rows = safeItems.map((item, index) => {
        const prefix = safeItems.length > 1 ? (index + 1) + '. ' : '- ';
        return prefix + getShareItemLabel(item) + ' · ' + makeAlertSummary(item.docs || {});
      }).join('\n');
      return '[SitePass 관리자 알림]\n아래 장비서류의 만료 상태를 확인해주세요.\n' + rows + '\n\nSitePass 로그인 후 장비/기사/인부 보관함에서 서류를 수정/갱신해주세요.';
    }

    function shareSelectedAdminOwnerAlertSms() {
      const items = getSelectedListItemsForShare();
      if (!items.length) return;
      const phones = [];
      const missing = [];
      items.forEach(item => {
        const phone = normalizePhoneForShare(item?.ownerPhone || '');
        if (phone) phones.push(phone);
        else missing.push(getShareItemLabel(item));
      });
      if (!phones.length) {
        alert('선택한 장비에 등록된 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      if (missing.length) {
        alert('아래 장비는 장비업자 휴대폰번호가 없어 알림 대상에서 제외됩니다.\n\n' + missing.join('\n'));
      }
      const text = buildAdminOwnerAlertText(items);
      openSmsShareToPhones(phones, text);
    }

    function shareAdminOwnerAlertSmsForCode(code) {
      const item = getItemByCode(code);
      if (!item) { alert('알림을 보낼 장비서류를 찾을 수 없습니다.'); return; }
      const phone = normalizePhoneForShare(item.ownerPhone || '');
      if (!phone) { alert('이 장비서류에는 장비업자 휴대폰번호가 등록되어 있지 않습니다.'); return; }
      openSmsShareToPhones([phone], buildAdminOwnerAlertText([item]));
    }

    function openEmailShare(text, items) {
      const email = prompt('받는 사람 이메일을 입력해주세요.\n예: site@example.com');
      if (email === null) return;
      const cleanEmail = String(email || '').trim();
      if (!cleanEmail || !cleanEmail.includes('@')) { alert('받는 사람 이메일을 정확히 입력해주세요.'); return; }
      const subjectBase = getShareTitleForItems(items || []);
      const subject = encodeURIComponent('[SitePass] ' + subjectBase + ' QR·링크');
      const body = encodeURIComponent(text);
      window.location.href = 'mailto:' + cleanEmail + '?subject=' + subject + '&body=' + body;
    }

    function openAdminQrLink(code) {
      const item = getItemByCode(code);
      if (!item) { alert('QR을 열 장비서류를 찾을 수 없습니다.'); return; }
      if (isServiceShareBlocked(item)) {
        const box = document.getElementById('detailBox');
        if (box) {
          box.innerHTML = renderServiceBlockedBox(item) + '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 결제/갱신 알림</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>';
          showScreen('detailScreen');
        }
        return;
      }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 240);
      const docs = getDisplayDocs(item);
      const docHtml = docs.map(doc => renderDocDetail(doc)).join('');
      document.getElementById('detailBox').innerHTML =
        '<div class="notice blue-note"><b>관리자 큐알링크</b><br>이 QR은 회원이 등록한 해당 장비서류 담당자 화면으로 바로 연결됩니다. 담당자는 코드 입력 없이 다운로드/프린트 화면을 봅니다.</div>' +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">' +
          '<img alt="담당자 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 화면 바로 열림</div>' +
        '</div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>장비업자</b><span>' + escapeHtml(getItemOwnerText(item)) + '</span></div>' +
        '<div class="line"><b>담당자 링크</b><span style="word-break:break-all;">' + escapeHtml(currentDetailLink) + '</span></div>' +
        '<div class="line"><b>담당자 QR·링크 만료</b><span>' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 알림 보내기</button><button class="ghost" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">링크 복사</button><button class="primary" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 열기</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>' +
        '<h3>등록 서류</h3>' + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>');
      showScreen('detailScreen');
    }

    function renderDetail(code) {
      const item = getItems().find(x => x.code === code);
      if (!item) { alert('통합 서류함 정보를 찾을 수 없습니다.'); showScreen('listScreen'); return; }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 180);
      const docHtml = getDisplayDocs(item).map(doc => renderDocDetail(doc)).join('');
      const renewalHtml = isAdminLoggedIn() ? '<div class="notice blue-note">관리자 상세보기에서는 수정/갱신·결제연장 버튼을 숨깁니다. 장비업자에게 알림만 보내고, 실제 수정/갱신은 회원 보관함에서 처리합니다.</div>' : renderRenewPanel(item);

      document.getElementById('detailBox').innerHTML =
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>결제단위</b><span>' + escapeHtml(item?.bundleMeta?.paymentText || '장비 및 인력 통합 1세트 결제') + '</span></div>' +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        '<div class="line"><b>요금제 기준</b><span>' + escapeHtml(item.basicPlan || BASIC_PRICE_TEXT) + '<br>' + escapeHtml(item.alertPlan || ALERT_PRICE_TEXT) + '</span></div>' +
        '<div class="line"><b>전달 정책</b><span>' + escapeHtml(item.forwardPolicy || '공유 후 7일 재전송 가능 예정') + '</span></div>' +
        renewalHtml +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">' +
          '<img alt="통합 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 다운로드/프린트 화면 바로 열림</div>' +
        '</div>' +
        '<h3>등록 서류</h3>' + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>');
      showScreen('detailScreen');
    }

    function renderDocDetail(doc) {
      const pages = getDocPagesFromDoc(doc);
      const badgeClass = doc.fileName ? 'done' : (doc.required ? 'need' : '');
      const badgeText = doc.fileName ? ((doc.status || '첨부됨') + (pages.length ? ' · ' + pages.length + '장' : '')) : (doc.required ? '미첨부' : '선택안함');
      const attachInfo = (!pages.length && !doc.fileName) ? '<div class="selected-file">미첨부</div>' : '';
      const dateHtml = doc.expiry ? '<div class="line"><b>만료날짜</b><span>' + (doc.expireDate ? escapeHtml(doc.expireDate + ' / ' + getDdayText(doc.expireDate)) : '미입력') + '</span></div>' : '';
      return '<div class="doc-card"><div class="doc-head"><div class="doc-title">' + escapeHtml((doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title) + '</div><span class="badge ' + badgeClass + '">' + escapeHtml(badgeText) + '</span></div>' + attachInfo + renderPreviewHtml(doc) + dateHtml + '</div>';
    }

    function getDdayTextWithDays(dateValue) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getDdayTextWithDays) {
        return recipientView.getDdayTextWithDays(dateValue, { getDdayText });
      }
      const text = getDdayText(dateValue);
      if (!text) return '';
      return /^D-\d+$/.test(text) ? text + '일' : text;
    }

    function getExpiryPeriodLabel(doc) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getExpiryPeriodLabel) return recipientView.getExpiryPeriodLabel(doc);
      const title = String(doc?.title || '서류');
      if (title.includes('보험')) return '보험만료기간';
      if (title.includes('검사')) return title.includes('비파괴') ? '비파괴검사 만료기간' : '검사만료기간';
      if (title.includes('안전교육') || title.includes('교육')) return '교육만료기간';
      if (title.includes('면허')) return '면허만료기간';
      return '서류만료기간';
    }

    function renderDocExpiryStrip(doc) {
      if (!doc || !doc.expireDate) return '';
      const label = getExpiryPeriodLabel(doc);
      const dday = getDdayTextWithDays(doc.expireDate);
      return '<div class="doc-expiry-strip"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(dday + (doc.expireDate ? ' · ' + doc.expireDate : '')) + '</span></div>';
    }

    function getEquipmentNoForDocLabel(code) {
      const item = code ? getItemByCode(code) : null;
      return String(item?.equipmentNo || document.getElementById('equipmentNo')?.value || '').trim();
    }

    function makeDocFileTopLabel(doc, code) {
      const equipmentNo = getEquipmentNoForDocLabel(code);
      const title = String(doc?.title || doc?.docTitle || '첨부서류').trim();
      return (equipmentNo ? equipmentNo + ' ' : '') + title;
    }

    function renderIdExtraStrip(doc) {
      const phoneValue = doc.driverPhone || doc.workerPhone || doc.personPhone || '';
      const phoneStrip = phoneValue ? '<div>전화번호: ' + escapeHtml(phoneValue) + '</div>' : '';
      const taskStrip = doc.workerTask ? '<div>작업내용: ' + escapeHtml(doc.workerTask) + '</div>' : '';
      return (phoneStrip || taskStrip) ? '<div class="id-extra-strip">' + phoneStrip + taskStrip + '</div>' : '';
    }

    function renderPreviewHtml(doc) {
      const pages = getDocPagesFromDoc(doc);
      if (!doc.fileName && !pages.length) return '';
      if (pages.length) {
        const extraStrip = renderIdExtraStrip(doc);
        const label = makeDocFileTopLabel(doc, '');
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:'', docLabel:label }) + renderDocExpiryStrip(doc) + extraStrip + '</div>';
      }
      if ((doc.fileType || '').includes('pdf') || String(doc.fileName || '').toLowerCase().endsWith('.pdf')) {
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div>' +
          '<div class="preview-pdf">PDF 첨부됨<br><span class="small">현재 베타 파일은 서버 저장 전이라 파일명 중심으로 표시됩니다.</span></div>' + renderIdExtraStrip(doc) + '</div>';
      }
      const extraStrip = renderIdExtraStrip(doc);
      if (extraStrip) {
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 정보</span></div>' + extraStrip + '</div>';
      }
      return '';
    }

    function openQrPublicView(code) {
      const link = makeQrLink(code);
      window.location.hash = '#qr=' + encodeURIComponent(code);
      renderPublic(code);
    }

    function openCurrentQrLink() {
      if (!currentDetailLink) return;
      if (currentDetailLink.includes('#manager=')) {
        const parsed = parseManagerHash('#' + currentDetailLink.split('#')[1]);
        if (parsed.code) openManagerPublicView(parsed.code, parsed.exp, parsed.sig);
        return;
      }
      const code = decodeURIComponent((currentDetailLink.split('#qr=')[1] || '').trim());
      if (code) openQrPublicView(code);
    }


    function openManagerByInput() {
      const code = (document.getElementById('managerCodeInput')?.value || '').trim();
      if (!code) { alert('담당자에게 받은 링크나 QR로 접속해주세요.'); return; }
      openManagerPublicView(code);
    }

    function openManagerPublicView(code, expireAt, sig) {
      const item = getItemByCode(code);
      if (!item) {
        document.getElementById('managerPrintBox').innerHTML = '<div class="empty">조회할 수 없는 코드입니다.<br>코드를 다시 확인해주세요.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      const exp = expireAt ? Number(expireAt) : getManagerExpireAt(item);
      const linkSig = sig || getManagerLinkSignature(code, exp);
      window.location.hash = '#manager=' + encodeURIComponent(code) + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(linkSig);
      renderManagerPrint(code, exp, linkSig);
    }

