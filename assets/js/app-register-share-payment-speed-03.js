// SitePass v23.7.551-test - 회원 상세보기·공유 준비 (담당자 렌더링은 recipient.html 전용) (03/04)
// ---- merged from app-register-share-payment-09.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (09/15)
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

    // v23.7.350: 담당자 공유 링크로 받은 자료는 수신자 기기의 localStorage에 의존하지 않고
    // 서버에서 받은 payload를 메모리에만 보관해 바로 렌더링합니다.
    window.sitePassManagerShareCache = window.sitePassManagerShareCache || {};

    function normalizeManagerShareItemForRuntime(item, code, expiresAt, sig) {
      if (!item) return null;
      const copy = JSON.parse(JSON.stringify(item || {}));
      const linkCode = String(code || copy.publicShareCode || copy.managerShareCode || copy.share_code || copy.code || '').trim();
      const originalCode = String(copy.code || copy.equipmentCode || copy.equipment_code || '').trim();
      if (linkCode) {
        if (originalCode && originalCode !== linkCode) copy.originalEquipmentCode = originalCode;
        copy.code = linkCode;
        copy.share_code = linkCode;
        copy.publicShareCode = linkCode;
        copy.managerShareCode = linkCode;
      }
      if (expiresAt) copy.managerExpireAt = new Date(Number(expiresAt)).toISOString();
      if (sig) copy.managerShareSig = sig;
      copy.isPublicShareRuntime = true;
      copy.publicShareLoadedAt = new Date().toISOString();
      return copy;
    }

    function rememberManagerShareItem(code, item, expiresAt, sig) {
      const normalized = normalizeManagerShareItemForRuntime(item, code, expiresAt, sig);
      if (!normalized || !normalized.code) return normalized || null;
      window.sitePassManagerShareCache[normalized.code] = normalized;
      if (code) window.sitePassManagerShareCache[String(code)] = normalized;
      if (normalized.publicShareCode) window.sitePassManagerShareCache[String(normalized.publicShareCode)] = normalized;
      if (normalized.managerShareCode) window.sitePassManagerShareCache[String(normalized.managerShareCode)] = normalized;
      return normalized;
    }

    function getManagerShareRuntimeItem(code) {
      const key = String(code || '').trim();
      if (!key) return null;
      return (window.sitePassManagerShareCache && window.sitePassManagerShareCache[key]) || null;
    }

    function getRuntimeItemByCode(code) {
      return getManagerShareRuntimeItem(code) || getItemByCode(code);
    }

    function getManagerShareCodeCandidate(item) {
      if (!item) return '';
      const candidates = [
        item.code, item.share_code, item.shareCode, item.publicShareCode, item.managerShareCode,
        item.qr_code, item.qrCode, item.equipment_code, item.equipmentCode, item.id,
        item.item_json && item.item_json.code, item.payload && item.payload.code, item.item_data && item.item_data.code
      ];
      for (const value of candidates) {
        const text = String(value || '').trim();
        if (text) return text;
      }
      return '';
    }

    function getManagerShareSeed(item) {
      const raw = [
        item && (item.equipmentNo || item.equipment_no || item.vehicle_number || item.registration_no),
        item && (item.equipmentName || item.equipment_name || item.title),
        item && (item.createdAt || item.created_at || item.updatedAt || item.updated_at),
        item && JSON.stringify(item && item.docs ? Object.keys(item.docs).sort() : [])
      ].join('|');
      return raw.replace(/\s+/g, '').slice(0, 180) || ('seed-' + Date.now());
    }

    function makeFallbackManagerShareCode() {
      const block = () => Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(2, 8).padEnd(6, 'X');
      return 'MSH-' + Date.now().toString(36).toUpperCase() + '-' + block();
    }

    function ensureManagerShareCodeForItem(item) {
      if (!item) return '';
      let code = getManagerShareCodeCandidate(item);
      if (code) {
        item.code = code;
        item.publicShareCode = code;
        item.managerShareCode = code;
        return code;
      }
      const mapKey = 'SITEPASS_PUBLIC_SHARE_CODE_MAP_V1';
      const seed = getManagerShareSeed(item);
      try {
        const map = JSON.parse(localStorage.getItem(mapKey) || '{}');
        code = map[seed] || makeFallbackManagerShareCode();
        map[seed] = code;
        localStorage.setItem(mapKey, JSON.stringify(map));
      } catch (e) {
        code = makeFallbackManagerShareCode();
      }
      item.code = code;
      item.publicShareCode = code;
      item.managerShareCode = code;
      return code;
    }

    function removeEmbeddedSharePayloadValuesV496(value, seen) {
      if (typeof value === 'string') {
        return /^(data:|blob:)/i.test(value.trim()) ? '' : value;
      }
      if (!value || typeof value !== 'object') return value;
      seen = seen || new WeakSet();
      if (seen.has(value)) return null;
      seen.add(value);
      if (Array.isArray(value)) {
        return value.map(function(entry){ return removeEmbeddedSharePayloadValuesV496(entry, seen); });
      }
      Object.keys(value).forEach(function(key){
        value[key] = removeEmbeddedSharePayloadValuesV496(value[key], seen);
      });
      return value;
    }

    function collectManagerShareStorageManifestV512(item) {
      const files = [];
      const seen = new Set();
      Object.entries((item && item.docs) || {}).forEach(function(entry){
        const docKey = String(entry[0] || '').trim();
        const doc = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
        const pages = Array.isArray(doc.pages) && doc.pages.length ? doc.pages : [doc];
        pages.forEach(function(page){
          page = page && typeof page === 'object' ? page : {};
          const path = String(getManagerShareStoragePathV497(page) || getManagerShareStoragePathV497(doc) || '').replace(/^\/+/, '').trim();
          if (!path) return;
          const bucket = getManagerShareStorageBucketV497(page, doc);
          const id = bucket + '|' + path;
          if (seen.has(id)) return;
          seen.add(id);
          files.push({
            storageBucket:bucket,
            storagePath:path,
            docKey:docKey,
            fileName:String(page.fileName || doc.fileName || path.split('/').pop() || '첨부파일')
          });
        });
      });
      return files.slice(0, 300);
    }

    function cloneShareItemForServer(item, expireAt, sig) {
      const code = ensureManagerShareCodeForItem(item);
      // v23.7.496: 담당자 공유 테이블에는 base64/blob 원본사진을 넣지 않고
      // Supabase Storage URL과 문서 메타정보만 저장합니다.
      let copy = null;
      try {
        copy = (typeof stripItemDataUrlsForServerStorage === 'function')
          ? stripItemDataUrlsForServerStorage(item || {})
          : JSON.parse(JSON.stringify(item || {}));
      } catch (e) {
        copy = (typeof makeStorageTinyItem === 'function') ? makeStorageTinyItem(item || {}) : { ...(item || {}) };
      }
      copy = removeEmbeddedSharePayloadValuesV496(copy || {});
      const equipmentCodeBeforeShareV511 = String(
        copy.originalEquipmentCode || copy.equipmentCode || copy.equipment_code ||
        item?.originalEquipmentCode || item?.equipmentCode || item?.equipment_code || item?.code || ''
      ).trim();
      if (equipmentCodeBeforeShareV511 && equipmentCodeBeforeShareV511 !== code) copy.originalEquipmentCode = equipmentCodeBeforeShareV511;
      copy.code = code;
      copy.publicShareCode = code;
      copy.managerShareCode = code;
      copy.managerExpireAt = new Date(Number(expireAt || getManagerExpireAt(item))).toISOString();
      copy.managerShareToken = item?.managerShareToken || getOrCreateManagerShareToken(code);
      copy.managerShareSig = sig || getManagerLinkSignature(code, Number(expireAt || getManagerExpireAt(item)));
      copy.publicShareSavedAt = new Date().toISOString();
      copy.sharePayloadMode = item && item.sharePayloadMode ? item.sharePayloadMode : 'storage-orphan-recovery-v500';
      copy.shareStorageFiles = collectManagerShareStorageManifestV512(copy);
      return copy;
    }

    function isManagerShareEmbeddedUrlV496(value) {
      return typeof value === 'string' && /^(data:|blob:)/i.test(value.trim());
    }

    function isManagerShareStoredUrlV496(value) {
      const text = String(value || '').trim();
      return !!text && !isManagerShareEmbeddedUrlV496(text) && (/^https?:\/\//i.test(text) || /^\//.test(text));
    }

    function getManagerShareObjectStoredUrlV496(obj) {
      obj = obj && typeof obj === 'object' ? obj : {};
      const values = [
        obj.fileUrl, obj.downloadUrl, obj.storagePublicUrl, obj.publicUrl,
        obj.previewDataUrl, obj.editDataUrl, obj.previewUrl, obj.download_url,
        obj.signedUrl, obj.signed_url, obj.url, obj.imageUrl, obj.image_url
      ];
      return String(values.find(isManagerShareStoredUrlV496) || '');
    }

    function getManagerShareStoragePathV497(obj) {
      obj = obj && typeof obj === 'object' ? obj : {};
      const values = [
        obj.storagePath, obj.storage_path, obj.filePath, obj.file_path,
        obj.storageKey, obj.storage_key, obj.objectPath, obj.object_path, obj.path
      ];
      const value = String(values.find(function(v){ return !!String(v || '').trim(); }) || '').trim();
      return isManagerShareStoredUrlV496(value) ? '' : value.replace(/^\/+/, '');
    }

    function getManagerShareStorageBucketV497(obj, parent) {
      obj = obj && typeof obj === 'object' ? obj : {};
      parent = parent && typeof parent === 'object' ? parent : {};
      return String(
        obj.storageBucket || obj.storage_bucket || obj.bucket || obj.bucketName || obj.bucket_name ||
        parent.storageBucket || parent.storage_bucket || parent.bucket || parent.bucketName || parent.bucket_name ||
        (typeof getSitePassStorageBucketName === 'function' ? getSitePassStorageBucketName() : 'sitepass-documents')
      ).trim() || 'sitepass-documents';
    }

    function recoverManagerShareStoredUrlFromPathV497(obj, parent) {
      obj = obj && typeof obj === 'object' ? obj : {};
      const existing = getManagerShareObjectStoredUrlV496(obj);
      if (existing) return existing;
      const path = getManagerShareStoragePathV497(obj);
      if (!path) return '';
      try {
        const api = window.SitePassSupabaseApi;
        if (api && typeof api.storagePublicUrl === 'function') {
          return String(api.storagePublicUrl(getManagerShareStorageBucketV497(obj, parent), path) || '');
        }
      } catch (e) {}
      return '';
    }

    function applyManagerShareRecoveredUrlV497(obj, url) {
      if (!obj || typeof obj !== 'object' || !isManagerShareStoredUrlV496(url)) return obj;
      obj.fileUrl = obj.fileUrl || url;
      obj.downloadUrl = obj.downloadUrl || url;
      obj.storagePublicUrl = obj.storagePublicUrl || url;
      obj.publicUrl = obj.publicUrl || url;
      // v23.7.551-test: data/blob 원본은 Storage 재업로드에 필요한 유일한 원본일 수 있습니다.
      // 경로에서 만든 오래된 URL로 덮어쓰지 않고, URL 칸이 비어 있을 때만 채웁니다.
      if (!obj.previewDataUrl) obj.previewDataUrl = url;
      if (!obj.editDataUrl) obj.editDataUrl = url;
      return obj;
    }

    function hydrateManagerShareStorageUrlsV497(item) {
      if (!item || typeof item !== 'object') return item;
      const docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
      Object.keys(docs).forEach(function(key){
        const doc = docs[key] && typeof docs[key] === 'object' ? docs[key] : {};
        const docUrl = recoverManagerShareStoredUrlFromPathV497(doc, item);
        if (docUrl) applyManagerShareRecoveredUrlV497(doc, docUrl);
        const pages = Array.isArray(doc.pages) ? doc.pages : [];
        pages.forEach(function(page){
          if (!page || typeof page !== 'object') return;
          const pageUrl = recoverManagerShareStoredUrlFromPathV497(page, doc) || docUrl;
          if (pageUrl) applyManagerShareRecoveredUrlV497(page, pageUrl);
        });
        if (!docUrl) {
          const firstPageUrl = pages.map(getManagerShareObjectStoredUrlV496).find(Boolean) || '';
          if (firstPageUrl) applyManagerShareRecoveredUrlV497(doc, firstPageUrl);
        }
        docs[key] = doc;
      });
      item.docs = docs;
      return item;
    }

    function countManagerShareStoredUrlsV496(item) {
      let count = 0;
      Object.values((item && item.docs) || {}).forEach(function(doc) {
        if (getManagerShareObjectStoredUrlV496(doc)) count++;
        (Array.isArray(doc && doc.pages) ? doc.pages : []).forEach(function(page) {
          if (getManagerShareObjectStoredUrlV496(page)) count++;
        });
      });
      return count;
    }

    function clearManagerShareUrlFieldsV511(obj) {
      if (!obj || typeof obj !== 'object') return;
      [
        'fileUrl','file_url','downloadUrl','download_url','storagePublicUrl','storage_public_url',
        'publicUrl','public_url','previewUrl','preview_url','signedUrl','signed_url','url','src','imageUrl','image_url'
      ].forEach(function(key){ if (isManagerShareStoredUrlV496(obj[key])) obj[key] = ''; });
      ['previewDataUrl','editDataUrl'].forEach(function(key){ if (isManagerShareStoredUrlV496(obj[key])) obj[key] = ''; });
    }

    async function validateManagerShareObjectUrlV511(obj, parent) {
      if (!obj || typeof obj !== 'object') return false;
      const candidates = [];
      const storagePath = getManagerShareStoragePathV497(obj);
      if (storagePath) {
        try {
          const api = window.SitePassSupabaseApi;
          if (api && typeof api.storageResolveUrl === 'function') {
            const exactPathUrl = String(await api.storageResolveUrl(getManagerShareStorageBucketV497(obj, parent), storagePath, { preferSigned:true }) || '');
            if (exactPathUrl) candidates.push(exactPathUrl);
          } else if (api && typeof api.storagePublicUrl === 'function') {
            const exactPathUrl = String(api.storagePublicUrl(getManagerShareStorageBucketV497(obj, parent), storagePath) || '');
            if (exactPathUrl) candidates.push(exactPathUrl);
          }
        } catch (e) {}
      }
      const pathUrl = recoverManagerShareStoredUrlFromPathV497(obj, parent);
      if (pathUrl) candidates.push(pathUrl);
      const stored = getManagerShareObjectStoredUrlV496(obj);
      if (stored) candidates.push(stored);
      const unique = Array.from(new Set(candidates.filter(Boolean))).slice(0, 4);
      if (!unique.length) return false;
      const checks = await Promise.all(unique.map(function(url){ return probeManagerSharePublicUrlV498(url); }));
      const index = checks.findIndex(Boolean);
      if (index < 0) {
        clearManagerShareUrlFieldsV511(obj);
        obj.storageUrlInvalidV511 = true;
        return false;
      }
      applyManagerShareRecoveredUrlV497(obj, unique[index]);
      obj.storageUrlInvalidV511 = false;
      obj.storageUrlValidatedAt = new Date().toISOString();
      return true;
    }

    async function validateManagerShareStoredFilesV511(item) {
      if (!item || typeof item !== 'object') return 0;
      const docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
      const tasks = [];
      Object.keys(docs).forEach(function(key){
        const doc = docs[key] && typeof docs[key] === 'object' ? docs[key] : {};
        tasks.push(validateManagerShareObjectUrlV511(doc, item));
        (Array.isArray(doc.pages) ? doc.pages : []).forEach(function(page){ tasks.push(validateManagerShareObjectUrlV511(page, doc)); });
      });
      const results = await Promise.all(tasks);
      hydrateManagerShareStorageUrlsV497(item);
      item.storageUrlsValidatedAtV511 = new Date().toISOString();
      return results.filter(Boolean).length;
    }

    function countManagerShareEmbeddedAttachmentsV497(item) {
      let count = 0;
      Object.values((item && item.docs) || {}).forEach(function(doc) {
        if (!doc || typeof doc !== 'object') return;
        const docValues = [doc.previewDataUrl, doc.editDataUrl, doc.originalDataUrl, doc.correctedDataUrl, doc.dataUrl, doc.fileDataUrl];
        if (docValues.some(isManagerShareEmbeddedUrlV496)) count++;
        (Array.isArray(doc.pages) ? doc.pages : []).forEach(function(page) {
          if (!page || typeof page !== 'object') return;
          const pageValues = [page.previewDataUrl, page.editDataUrl, page.originalDataUrl, page.correctedDataUrl, page.dataUrl, page.fileDataUrl];
          if (pageValues.some(isManagerShareEmbeddedUrlV496)) count++;
        });
      });
      return count;
    }

    function managerShareHasAttachmentMetadataV496(item) {
      return Object.values((item && item.docs) || {}).some(function(doc){
        if (!doc || typeof doc !== 'object') return false;
        return !!String(doc.fileName || '').trim() || Number(doc.pageCount || 0) > 0 ||
          (Array.isArray(doc.pages) && doc.pages.length > 0);
      });
    }

    function managerShareItemNeedsStorageUploadV496(item) {
      let needsUpload = false;
      Object.values((item && item.docs) || {}).forEach(function(doc) {
        if (needsUpload || !doc || typeof doc !== 'object') return;
        const pages = Array.isArray(doc.pages) ? doc.pages : [];
        const values = [doc.previewDataUrl, doc.editDataUrl, doc.originalDataUrl, doc.correctedDataUrl, doc.dataUrl, doc.fileDataUrl];
        pages.forEach(function(page) {
          values.push(page && page.previewDataUrl, page && page.editDataUrl, page && page.originalDataUrl, page && page.correctedDataUrl, page && page.dataUrl, page && page.fileDataUrl);
        });
        const hasEmbedded = values.some(isManagerShareEmbeddedUrlV496);
        const hasStored = !!getManagerShareObjectStoredUrlV496(doc) || pages.some(function(page){ return !!getManagerShareObjectStoredUrlV496(page); });
        if (hasEmbedded && !hasStored) needsUpload = true;
      });
      return needsUpload;
    }

    function normalizeManagerShareIdentityV497(value) {
      const text = String(value || '').trim();
      try {
        if (typeof normalizeEquipmentNoForSync === 'function') return String(normalizeEquipmentNoForSync(text) || '').trim();
      } catch (e) {}
      return text.replace(/\s+/g, '').toUpperCase();
    }

    function isSameManagerShareEquipmentV497(candidate, target) {
      if (!candidate || !target) return false;
      const codeA = String(candidate.code || candidate.equipmentCode || candidate.equipment_code || '').trim();
      const codeB = String(target.code || target.equipmentCode || target.equipment_code || '').trim();
      if (codeA && codeB && codeA === codeB) return true;
      const noA = normalizeManagerShareIdentityV497(candidate.equipmentNo || candidate.equipment_no || candidate.vehicle_number || candidate.registration_no);
      const noB = normalizeManagerShareIdentityV497(target.equipmentNo || target.equipment_no || target.vehicle_number || target.registration_no);
      if (noA && noB && noA === noB) return true;
      return false;
    }

    function getManagerShareCandidateScoreV497(item) {
      if (!item) return -1;
      hydrateManagerShareStorageUrlsV497(item);
      const stored = countManagerShareStoredUrlsV496(item);
      const embedded = countManagerShareEmbeddedAttachmentsV497(item);
      const docCount = Object.keys((item && item.docs) || {}).length;
      // v23.7.551-test: 휴대폰에 남은 data/blob 원본을 오래된 404 URL보다 우선합니다.
      // 이전 점수는 저장 URL에 가산점이 있어, 실제 원본이 있는 로컬 문서가
      // 잘못된 서버 URL 문서로 덮이는 경우가 있었습니다.
      let score = embedded * 5000 + stored * 2000 + stored * 40 + docCount;
      try { if (typeof getEquipmentItemDataScoreForSync === 'function') score += Number(getEquipmentItemDataScoreForSync(item) || 0); } catch (e) {}
      return score;
    }

    function mergeManagerShareCandidatesV497(candidates, rawItem) {
      const safe = (candidates || []).filter(Boolean);
      if (!safe.length) return rawItem;
      const sorted = safe.slice().sort(function(a, b){ return getManagerShareCandidateScoreV497(a) - getManagerShareCandidateScoreV497(b); });
      const merged = {};
      const docsByKey = {};
      sorted.forEach(function(candidate){
        Object.assign(merged, candidate || {});
        Object.entries((candidate && candidate.docs) || {}).forEach(function(entry){
          const key = entry[0];
          const nextDoc = entry[1];
          const prevDoc = docsByKey[key];
          const wrap = function(doc){ return { docs:{ x:doc } }; };
          if (!prevDoc || getManagerShareCandidateScoreV497(wrap(nextDoc)) >= getManagerShareCandidateScoreV497(wrap(prevDoc))) {
            docsByKey[key] = nextDoc;
          }
        });
      });
      merged.docs = docsByKey;
      // 선택 화면에서 갱신한 만료일·공유토큰과 원래 장비 식별값은 항상 우선합니다.
      Object.assign(merged, {
        code: rawItem.code || merged.code,
        equipmentNo: rawItem.equipmentNo || merged.equipmentNo,
        equipmentName: rawItem.equipmentName || merged.equipmentName,
        managerExpireAt: rawItem.managerExpireAt || merged.managerExpireAt,
        managerShareToken: rawItem.managerShareToken || merged.managerShareToken,
        publicShareCode: rawItem.publicShareCode || merged.publicShareCode,
        managerShareCode: rawItem.managerShareCode || merged.managerShareCode
      });
      return hydrateManagerShareStorageUrlsV497(merged);
    }

    function getBestManagerShareServerItemV497(item) {
      const candidates = [item].filter(Boolean);
      try {
        const server = getSitePassServerAuthoritativeEquipmentItems();
        (server || []).forEach(function(row){ if (isSameManagerShareEquipmentV497(row, item)) candidates.push(row); });
      } catch (e) {}
      try {
        const cached = getServerEquipmentCache();
        (cached || []).forEach(function(row){ if (isSameManagerShareEquipmentV497(row, item)) candidates.push(row); });
      } catch (e) {}
      // v23.7.497: 일반회원 보관함은 서버 기준이지만, 공유할 때는 휴대폰에 남은
      // 현재/구버전 등록 원본까지 찾아 Storage 업로드에 사용할 수 있게 합니다.
      try {
        if (typeof getLocalVisibleEquipmentItemsForServerResync === 'function') {
          (getLocalVisibleEquipmentItemsForServerResync() || []).forEach(function(row){
            if (isSameManagerShareEquipmentV497(row, item)) candidates.push(row);
          });
        }
      } catch (e) { console.warn('담당자 공유용 기존 등록자료 검색 실패:', e); }
      try {
        const pending = typeof getPendingRegistration === 'function' ? getPendingRegistration() : null;
        if (pending && pending.item && isSameManagerShareEquipmentV497(pending.item, item)) candidates.push(pending.item);
      } catch (e) {}
      return mergeManagerShareCandidatesV497(candidates, item) || item;
    }


    // v23.7.498: 예전 등록 과정에서 Storage 업로드는 끝났지만 장비 item_json에
    // 공개 URL/storagePath가 남지 않은 경우, 회원/장비/서류 경로를 직접 찾아 복구합니다.
    function normalizeManagerShareStoragePartV498(value, fallback) {
      try {
        if (typeof sanitizeStoragePathPart === 'function') return sanitizeStoragePathPart(value, fallback);
      } catch (e) {}
      const text = String(value || fallback || 'file').trim();
      return text.replace(/[^0-9a-zA-Z가-힣._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || String(fallback || 'file');
    }

    function getManagerShareCurrentMemberV498() {
      try {
        if (typeof getCurrentSitePassMemberForEquipmentSync === 'function') {
          const member = getCurrentSitePassMemberForEquipmentSync();
          if (member && typeof member === 'object') return member;
        }
      } catch (e) {}
      try { if (window.currentMember && typeof window.currentMember === 'object') return window.currentMember; } catch (e) {}
      return {};
    }

    function uniqueManagerShareValuesV498(values, normalizer) {
      const out = [];
      const seen = new Set();
      (values || []).forEach(function(value){
        const normalized = normalizer ? normalizer(value) : String(value || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
      });
      return out;
    }

    function getManagerShareStorageOwnerCandidatesV498(item) {
      const member = getManagerShareCurrentMemberV498();
      // 실제 업로드 함수의 우선순위(ownerSignupId → ownerProviderId → ownerMemberId)를 먼저 사용합니다.
      return uniqueManagerShareValuesV498([
        item && (item.ownerSignupId || item.owner_signup_id),
        item && (item.ownerProviderId || item.owner_provider_id),
        item && (item.ownerMemberId || item.owner_member_id),
        member.signupId || member.loginId || member.signup_id || member.login_id,
        member.providerId || member.provider_id,
        member.id || member.memberId || member.userId || member.authUserId || member.auth_user_id,
        'anonymous'
      ], function(value){ return String(value || '').trim() ? normalizeManagerShareStoragePartV498(value, 'owner') : ''; }).slice(0, 7);
    }

    function getManagerShareStorageCodeCandidatesV498(item) {
      return uniqueManagerShareValuesV498([
        item && item.code,
        item && item.originalEquipmentCode,
        item && (item.equipmentCode || item.equipment_code),
        item && (item.equipmentNo || item.equipment_no || item.vehicle_number || item.registration_no)
      ], function(value){ return String(value || '').trim() ? normalizeManagerShareStoragePartV498(value, 'code') : ''; }).slice(0, 4);
    }

    function getManagerShareDocKeyMapV498(item) {
      const docs = item && item.docs && typeof item.docs === 'object' ? item.docs : {};
      const map = {};
      Object.keys(docs).forEach(function(key){
        map[normalizeManagerShareStoragePartV498(key, 'document')] = key;
      });
      return map;
    }

    function mergeLegacyManagerShareDocumentsV498(item) {
      item = item && typeof item === 'object' ? item : {};
      const nestedCandidates = [item.item_json, item.item_data, item.payload, item.data].filter(function(v){ return v && typeof v === 'object'; });
      nestedCandidates.forEach(function(nested){
        if ((!item.docs || !Object.keys(item.docs).length) && nested.docs && typeof nested.docs === 'object') item.docs = nested.docs;
        if ((!item.documents || !item.documents.length) && Array.isArray(nested.documents)) item.documents = nested.documents;
      });
      item.docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
      (Array.isArray(item.documents) ? item.documents : []).forEach(function(doc, index){
        if (!doc || typeof doc !== 'object') return;
        const key = String(doc.key || doc.docKey || doc.doc_key || doc.type || doc.kind || ('legacyDocument' + (index + 1))).trim();
        if (!key) return;
        item.docs[key] = Object.assign({}, item.docs[key] || {}, doc, { key:key });
      });
      return item;
    }

    function makeManagerShareStoragePageV498(path, url, name, index) {
      return {
        id:'storage_recovered_' + (index + 1),
        fileName:String(name || ('첨부파일_' + (index + 1))),
        storageBucket:getSitePassStorageBucketName(),
        storagePath:path,
        storagePublicUrl:url,
        publicUrl:url,
        fileUrl:url,
        downloadUrl:url,
        previewDataUrl:url,
        editDataUrl:url,
        previewChoice:'storage',
        storageMode:'supabase-storage',
        storageRecoveredAt:new Date().toISOString()
      };
    }

    function applyManagerShareStorageFilesV498(item, owner, codePart, docFolder, files) {
      item = mergeLegacyManagerShareDocumentsV498(item);
      const keyMap = getManagerShareDocKeyMapV498(item);
      const docKey = keyMap[docFolder] || docFolder;
      const doc = item.docs[docKey] && typeof item.docs[docKey] === 'object' ? item.docs[docKey] : { key:docKey, title:docKey };
      const bucket = getSitePassStorageBucketName();
      const pages = [];
      (files || []).forEach(function(file, index){
        const name = String(file && file.name || '').trim();
        if (!name || name === '.emptyFolderPlaceholder') return;
        const path = [owner, codePart, docFolder, name].join('/');
        let url = '';
        try {
          const api = window.SitePassSupabaseApi;
          if (api && typeof api.storagePublicUrl === 'function') url = String(api.storagePublicUrl(bucket, path) || '');
        } catch (e) {}
        if (!url) return;
        pages.push(makeManagerShareStoragePageV498(path, url, name, pages.length));
      });
      if (!pages.length) return 0;
      const existingPages = Array.isArray(doc.pages) ? doc.pages.filter(function(page){ return !!getManagerShareObjectStoredUrlV496(page); }) : [];
      doc.pages = existingPages.length ? existingPages : pages;
      const firstUrl = getManagerShareObjectStoredUrlV496(doc.pages[0]);
      applyManagerShareRecoveredUrlV497(doc, firstUrl);
      doc.storageBucket = bucket;
      doc.storageMode = 'supabase-storage';
      doc.pageCount = doc.pages.length;
      doc.fileName = doc.fileName || doc.pages[0].fileName || ('첨부 ' + doc.pages.length + '장');
      doc.storageRecoveredAt = new Date().toISOString();
      item.docs[docKey] = doc;
      return doc.pages.length;
    }

    function withManagerShareTimeoutV498(promise, ms) {
      return Promise.race([
        Promise.resolve(promise),
        new Promise(function(_, reject){ setTimeout(function(){ reject(new Error('storage lookup timeout')); }, Math.max(500, Number(ms || 2500))); })
      ]);
    }

    async function listManagerShareStorageFolderV498(bucket, path) {
      try {
        const client = getSitePassSupabaseClient();
        if (!client || !client.storage || typeof client.storage.from !== 'function') return { ok:false, data:[] };
        const result = await withManagerShareTimeoutV498(
          client.storage.from(bucket).list(path, { limit:100, sortBy:{ column:'name', order:'asc' } }),
          1800
        );
        if (!result || result.error) return { ok:false, data:[], error:result && result.error };
        return { ok:true, data:Array.isArray(result.data) ? result.data : [] };
      } catch (e) {
        return { ok:false, data:[], error:e };
      }
    }

    async function probeManagerSharePublicUrlV498(url) {
      if (!url) return false;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(function(){ try { controller.abort(); } catch (e) {} }, 1800) : null;
      try {
        const response = await fetch(url, { method:'GET', headers:{ Range:'bytes=0-0' }, cache:'no-store', signal:controller ? controller.signal : undefined });
        return !!(response && response.ok);
      } catch (e) {
        return false;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    function getManagerShareExtensionCandidatesV498(doc, page) {
      const name = String((page && page.fileName) || (doc && doc.fileName) || '').toLowerCase();
      const match = name.match(/\.([a-z0-9]{2,5})$/i);
      const preferred = match ? match[1] : '';
      return uniqueManagerShareValuesV498([preferred, 'jpg', 'jpeg', 'png', 'webp', 'pdf']);
    }

    function getManagerSharePageIdCandidatesV498(docKey, doc, page, index) {
      return uniqueManagerShareValuesV498([
        page && (page.id || page.pageId || page.page_id || page.uid || page.fileId || page.file_id),
        'page_' + (index + 1),
        index === 0 ? ('legacy_' + docKey + '_1') : ''
      ], function(value){ return normalizeManagerShareStoragePartV498(value, 'page_' + (index + 1)); }).slice(0, 3);
    }

    async function probeManagerShareStorageDocV498(item, owner, codePart, docKey, doc) {
      const bucket = getSitePassStorageBucketName();
      const docPart = normalizeManagerShareStoragePartV498(docKey, 'document');
      const sourcePages = Array.isArray(doc && doc.pages) && doc.pages.length ? doc.pages : [{}];
      const recovered = [];
      for (let index = 0; index < Math.min(sourcePages.length, 12); index++) {
        const page = sourcePages[index] || {};
        const ids = getManagerSharePageIdCandidatesV498(docKey, doc, page, index);
        const exts = getManagerShareExtensionCandidatesV498(doc, page);
        let found = null;
        const candidates = [];
        ids.forEach(function(id){
          exts.forEach(function(ext){
            const path = [owner, codePart, docPart, id + '.' + ext].join('/');
            let url = '';
            try {
              const api = window.SitePassSupabaseApi;
              if (api && typeof api.storagePublicUrl === 'function') url = String(api.storagePublicUrl(bucket, path) || '');
            } catch (e) {}
            if (url) candidates.push({ path:path, url:url, name:id + '.' + ext });
          });
        });
        // 가장 가능성 높은 후보 4개를 병렬 확인해 공유 대기시간을 2초 안쪽으로 제한합니다.
        const limitedCandidates = candidates.slice(0, 4);
        const probeResults = await Promise.all(limitedCandidates.map(function(candidate){ return probeManagerSharePublicUrlV498(candidate.url); }));
        const foundIndex = probeResults.findIndex(Boolean);
        if (foundIndex >= 0) found = limitedCandidates[foundIndex];
        if (found) recovered.push(makeManagerShareStoragePageV498(found.path, found.url, found.name, recovered.length));
      }
      if (!recovered.length) return 0;
      doc.pages = recovered;
      const firstUrl = getManagerShareObjectStoredUrlV496(recovered[0]);
      applyManagerShareRecoveredUrlV497(doc, firstUrl);
      doc.storageBucket = bucket;
      doc.storageMode = 'supabase-storage';
      doc.pageCount = recovered.length;
      doc.fileName = doc.fileName || recovered[0].fileName;
      doc.storageRecoveredAt = new Date().toISOString();
      item.docs[docKey] = doc;
      return recovered.length;
    }

    async function recoverManagerShareItemFromStorageV498(item) {
      item = mergeLegacyManagerShareDocumentsV498(item);
      hydrateManagerShareStorageUrlsV497(item);
      if (countManagerShareStoredUrlsV496(item)) return { ok:true, item:item, recovered:0 };
      const bucket = getSitePassStorageBucketName();
      const owners = getManagerShareStorageOwnerCandidatesV498(item);
      const codes = getManagerShareStorageCodeCandidatesV498(item);
      const docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
      const docKeys = Object.keys(docs).filter(function(key){
        const doc = docs[key];
        return doc && typeof doc === 'object' && !getManagerShareObjectStoredUrlV496(doc);
      });
      if (!owners.length || !codes.length) return { ok:false, item:item, recovered:0 };

      // 먼저 Storage 목록 조회로 실제 파일명을 찾습니다. 목록 권한이 없으면 아래의 경로 추정 방식으로 보완합니다.
      const listPairs = [];
      owners.slice(0, 3).forEach(function(owner){
        codes.slice(0, 2).forEach(function(codePart){ listPairs.push({ owner:owner, codePart:codePart }); });
      });
      const listPairResults = await Promise.all(listPairs.map(async function(pair){
        const folderResults = await Promise.all(docKeys.map(async function(docKey){
          const docFolder = normalizeManagerShareStoragePartV498(docKey, 'document');
          const result = await listManagerShareStorageFolderV498(bucket, [pair.owner, pair.codePart, docFolder].join('/'));
          if (!result.ok || !result.data.length) return 0;
          return applyManagerShareStorageFilesV498(item, pair.owner, pair.codePart, docFolder, result.data);
        }));
        let count = folderResults.reduce(function(sum, value){ return sum + Number(value || 0); }, 0);
        if (!count) count = await discoverManagerShareStorageFoldersV499(item, bucket, pair.owner, pair.codePart);
        return count;
      }));
      const listedRecoveredCount = listPairResults.reduce(function(sum, value){ return sum + Number(value || 0); }, 0);
      if (listedRecoveredCount > 0) {
        hydrateManagerShareStorageUrlsV497(item);
        item.storageRecoveredAt = new Date().toISOString();
        item.storageRecoveryMode = 'folder-list-v498';
        return { ok:true, item:item, recovered:listedRecoveredCount };
      }

      // Storage 목록 조회가 막힌 환경에서는 기존 업로드 규칙으로 경로를 직접 계산해 확인합니다.
      const directOwners = uniqueManagerShareValuesV498([owners[0], owners[owners.length - 1]]);
      for (const owner of directOwners) {
        for (const codePart of codes.slice(0, 2)) {
          const probeCounts = await Promise.all(docKeys.map(async function(docKey){
            const doc = docs[docKey];
            if (getManagerShareObjectStoredUrlV496(doc)) return 0;
            return await probeManagerShareStorageDocV498(item, owner, codePart, docKey, doc);
          }));
          const recoveredCount = probeCounts.reduce(function(sum, value){ return sum + Number(value || 0); }, 0);
          if (recoveredCount > 0) {
            hydrateManagerShareStorageUrlsV497(item);
            item.storageRecoveredAt = new Date().toISOString();
            item.storageRecoveryMode = 'predictable-path-v498';
            return { ok:true, item:item, recovered:recoveredCount };
          }
        }
      }
      return { ok:false, item:item, recovered:0 };
    }


    async function recoverManagerShareItemFromPreviousPublicShareV499(item) {
      try {
        const client = getSitePassSupabaseClient();
        const code = String(item && (item.code || item.publicShareCode || item.managerShareCode) || '').trim();
        if (!client || !code || typeof client.from !== 'function') return { ok:false, item:item };
        const result = await withManagerShareTimeoutV498(
          client.from(PUBLIC_SHARE_TABLE)
            .select('item_data,payload,share_code,updated_at')
            .eq('share_code', code)
            .order('updated_at', { ascending:false })
            .limit(1)
            .maybeSingle(),
          1800
        );
        if (!result || result.error || !result.data) return { ok:false, item:item, error:result && result.error };
        const previous = result.data.item_data || result.data.payload;
        if (!previous || typeof previous !== 'object') return { ok:false, item:item };
        const merged = mergeManagerShareCandidatesV497([item, previous], item);
        hydrateManagerShareStorageUrlsV497(merged);
        return { ok:countManagerShareStoredUrlsV496(merged) > 0 || countManagerShareEmbeddedAttachmentsV497(merged) > 0, item:merged };
      } catch (e) {
        return { ok:false, item:item, error:e };
      }
    }

    async function discoverManagerShareStorageFoldersV499(item, bucket, owner, codePart) {
      const rootPath = [owner, codePart].join('/');
      const root = await listManagerShareStorageFolderV498(bucket, rootPath);
      if (!root.ok || !root.data.length) return 0;
      const folders = root.data.map(function(entry){ return String(entry && entry.name || '').trim(); })
        .filter(function(name){ return !!name && name !== '.emptyFolderPlaceholder'; })
        .slice(0, 30);
      if (!folders.length) return 0;
      const counts = await Promise.all(folders.map(async function(folder){
        const child = await listManagerShareStorageFolderV498(bucket, [rootPath, folder].join('/'));
        if (!child.ok || !child.data.length) return 0;
        return applyManagerShareStorageFilesV498(item, owner, codePart, folder, child.data);
      }));
      return counts.reduce(function(sum, value){ return sum + Number(value || 0); }, 0);
    }

    // v23.7.500: 저장소에 주소가 빠졌더라도 숨겨진 등록 화면에 남아 있는
    // data-pages-json/미리보기 이미지를 마지막 업로드 원본으로 사용합니다.
    function recoverManagerShareItemFromRegistrationDomV500(item) {
      if (!item || typeof item !== 'object' || typeof document === 'undefined') return item;
      item.docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
      document.querySelectorAll('#docCards .doc-card[data-doc-key]').forEach(function(card){
        const key = String(card.dataset.docKey || '').trim();
        if (!key) return;
        const doc = item.docs[key] && typeof item.docs[key] === 'object' ? item.docs[key] : { key:key, title:card.dataset.docTitle || key };
        let pages = [];
        const filenameBox = card.querySelector('[data-role="filename"]');
        if (filenameBox) {
          try {
            const parsed = JSON.parse(filenameBox.dataset.pagesJson || '[]');
            if (Array.isArray(parsed)) pages = parsed.filter(Boolean);
          } catch (e) {}
        }
        if (!pages.length) {
          card.querySelectorAll('img[src], iframe[src], embed[src], object[data]').forEach(function(node, index){
            const src = String(node.getAttribute('src') || node.getAttribute('data') || '').trim();
            if (!src || !/^(data:|blob:|https?:\/\/)/i.test(src)) return;
            pages.push({ id:'dom_page_' + (index + 1), fileName:(doc.fileName || card.dataset.docTitle || key) + '_' + (index + 1), previewDataUrl:src, editDataUrl:src });
          });
        }
        if (!pages.length) return;
        const existing = Array.isArray(doc.pages) ? doc.pages : [];
        doc.pages = existing.length ? existing.map(function(page, index){ return Object.assign({}, pages[index] || {}, page || {}); }) : pages;
        const first = doc.pages[0] || {};
        const source = first.previewDataUrl || first.editDataUrl || first.originalDataUrl || first.correctedDataUrl || first.fileUrl || first.downloadUrl || '';
        if (source) {
          doc.previewDataUrl = doc.previewDataUrl || source;
          doc.editDataUrl = doc.editDataUrl || source;
          doc.fileName = doc.fileName || first.fileName || card.dataset.docTitle || '첨부파일';
          doc.pageCount = doc.pages.length;
          doc.recoveredFromRegistrationDomV500 = true;
          item.docs[key] = doc;
        }
      });
      return item;
    }

    async function prepareManagerShareItemsForServerV497(items) {
      const prepared = [];
      for (const rawItem of (items || []).filter(Boolean)) {
        let item = mergeLegacyManagerShareDocumentsV498(getBestManagerShareServerItemV497(rawItem));
        item = recoverManagerShareItemFromRegistrationDomV500(item);
        // 서버/구버전 자료를 사용하더라도 방금 만든 공유 만료일·토큰은 유지합니다.
        item.managerExpireAt = rawItem.managerExpireAt || item.managerExpireAt;
        item.managerShareToken = rawItem.managerShareToken || item.managerShareToken;
        item.publicShareCode = rawItem.publicShareCode || item.publicShareCode;
        item.managerShareCode = rawItem.managerShareCode || item.managerShareCode;
        ensureManagerShareCodeForItem(item);
        hydrateManagerShareStorageUrlsV497(item);
        await validateManagerShareStoredFilesV511(item);

        // v23.7.499: 현재 장비 item_json에 URL이 빠졌더라도 예전에 정상 저장된
        // 담당자 공유 payload에 파일 주소/사진이 남아 있으면 먼저 합쳐 복구합니다.
        if (managerShareHasAttachmentMetadataV496(item) && !countManagerShareStoredUrlsV496(item)) {
          const previousShare = await recoverManagerShareItemFromPreviousPublicShareV499(item);
          if (previousShare && previousShare.item) {
            item = previousShare.item;
            await validateManagerShareStoredFilesV511(item);
          }
        }

        if (managerShareItemNeedsStorageUploadV496(item)) {
          try {
            const uploaded = await uploadEquipmentItemDocsToSupabaseStorage(item);
            item = hydrateManagerShareStorageUrlsV497(stripItemDataUrlsForServerStorage(uploaded));
            await validateManagerShareStoredFilesV511(item);
            Promise.resolve(saveEquipmentItemToSupabase(item, 'manager_share_prepare_v511')).catch(function(e){
              console.warn('담당자 공유 준비 후 장비 서버 갱신 실패:', e);
            });
          } catch (e) {
            return { ok:false, message:'서류 사진 서버 업로드 중 오류가 발생했습니다. ' + (e && e.message ? e.message : String(e)) };
          }
        }

        if (managerShareHasAttachmentMetadataV496(item) && !countManagerShareStoredUrlsV496(item)) {
          const recovered = await recoverManagerShareItemFromStorageV498(item);
          item = recovered && recovered.item ? recovered.item : item;
          await validateManagerShareStoredFilesV511(item);
          if (recovered && recovered.ok && countManagerShareStoredUrlsV496(item)) {
            const serverItem = stripItemDataUrlsForServerStorage(item);
            Promise.resolve(saveEquipmentItemToSupabase(serverItem, 'manager_share_storage_recovery_v498')).catch(function(e){
              console.warn('담당자 공유 Storage 복구 후 장비 서버 갱신 실패:', e);
            });
          }
        }

        if (managerShareHasAttachmentMetadataV496(item) && !countManagerShareStoredUrlsV496(item)) {
          // v23.7.500: 예전 등록건의 실제 파일 주소가 유실됐더라도 담당자 링크 화면 자체를
          // 막지 않습니다. 문서명/만료일 메타정보를 먼저 공유하고 파일 미복구 상태를 명확히 표시합니다.
          item.shareFilesPendingRecovery = true;
          item.sharePayloadMode = 'metadata-fallback-v500';
          item.shareFileRecoveryMessage = (getShareItemLabel(item) || '선택 장비') + '의 기존 사진 파일 주소를 찾지 못했습니다.';
        } else {
          item.shareFilesPendingRecovery = false;
        }
        prepared.push(item);
      }
      return { ok:true, items:prepared };
    }

    function upsertSharedItemIntoLocalCache(item) {
      // v23.7.350: 수신자 링크 조회는 서버 payload를 메모리에만 저장합니다.
      // 받은 사람 휴대폰의 localStorage 용량/예전 보관함 상태 때문에 조회 실패가 나지 않게 합니다.
      return rememberManagerShareItem(item?.code || item?.share_code || item?.publicShareCode || item?.managerShareCode || '', item);
    }

    async function saveManagerShareItemsToSupabase(items) {
      const qrShare = getQrShareModule();
      if (qrShare.saveManagerShareItemsToSupabase) {
        return await qrShare.saveManagerShareItemsToSupabase(items, {
          getClient: getSitePassSupabaseClient,
          getExpireAt: getManagerExpireAt,
          getSignature: getManagerLinkSignature,
          cloneItem: cloneShareItemForServer,
          getLabel: getShareItemLabel,
          getMember: getManagerShareCurrentMemberV498
        });
      }
      const client = getSitePassSupabaseClient();
      if (!client) {
        return { ok:false, message:'Supabase 연결 객체가 없습니다.' };
      }
      const safeItems = (items || []).filter(Boolean);
      if (!safeItems.length) return { ok:true, saved:0 };
      try {
        const nowIso = new Date().toISOString();
        const rows = safeItems.map(item => {
          const code = ensureManagerShareCodeForItem(item);
          const expireAt = getManagerExpireAt(item);
          const sig = getManagerLinkSignature(code, expireAt);
          const shareItem = cloneShareItemForServer(item, expireAt, sig);
          return {
            code: String(code || ''),
            share_code: String(code || ''),
            share_sig: String(sig || ''),
            expires_at: new Date(expireAt).toISOString(),
            item_data: shareItem,
            payload: shareItem,
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
      if (!getSitePassSupabaseClient() || !code) return { ok:false, message:'Supabase 연결 또는 링크 코드가 없습니다.' };
      return { ok:false, message:'QR 공유 모듈 연결 실패' };
    }


    const SITEPASS_SHARE_HISTORY_KEY_V520 = 'sitepass_share_history_v445';

    function recordSitePassShareHistoryV520(items, detail) {
      const safeItems = (items || []).filter(Boolean);
      detail = detail && typeof detail === 'object' ? detail : {};
      if (!safeItems.length) return null;
      let history = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(SITEPASS_SHARE_HISTORY_KEY_V520) || '[]');
        history = Array.isArray(parsed) ? parsed : [];
      } catch (e) { history = []; }
      const now = new Date();
      const labels = safeItems.map(function(item){ return getShareItemLabel(item); }).filter(Boolean);
      const links = safeItems.map(function(item){
        const code = ensureManagerShareCodeForItem(item);
        return makeManagerLink(code, getManagerExpireAt(item));
      }).filter(Boolean);
      const row = {
        id: 'SHARE-' + now.getTime() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
        createdAt: now.toISOString(),
        time: now.toLocaleString('ko-KR'),
        date: now.toLocaleDateString('ko-KR'),
        equipment: labels.join(', ') || '서류 링크',
        equipmentCodes: safeItems.map(function(item){ return String(item.code || ''); }).filter(Boolean),
        method: String(detail.method || '링크 공유'),
        receiver: String(detail.receiver || '담당자'),
        phone: String(detail.phone || ''),
        email: String(detail.email || ''),
        links: links,
        status: String(detail.status || '공유 실행')
      };
      history.push(row);
      try { localStorage.setItem(SITEPASS_SHARE_HISTORY_KEY_V520, JSON.stringify(history.slice(-100))); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('sitepass-share-history-updated-v520', { detail:row })); } catch (e) {}
      try { if (typeof window.sitepassRefreshShareHistoryV520 === 'function') window.sitepassRefreshShareHistoryV520(); } catch (e) {}
      return row;
    }
    try { window.sitePassRecordShareHistoryV520 = recordSitePassShareHistoryV520; } catch (e) {}

    function makeShareTrackingTokenV521() {
      const randomPart = function(size) {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let out = '';
        try {
          const values = new Uint32Array(size);
          crypto.getRandomValues(values);
          for (let i = 0; i < values.length; i++) out += chars[values[i] % chars.length];
          return out;
        } catch (e) {
          while (out.length < size) out += Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase();
          return out.slice(0, size);
        }
      };
      return 'SHT-' + Date.now().toString(36).toUpperCase() + '-' + randomPart(7) + '-' + randomPart(7);
    }

    function getShareTrackingMemberPayloadV521() {
      const member = getManagerShareCurrentMemberV498() || {};
      return {
        id: String(member.id || member.memberId || member.userId || ''),
        member_id: String(member.memberId || member.id || member.userId || ''),
        signup_id: String(member.signupId || member.loginId || member.signup_id || member.login_id || member.supabaseLoginId || ''),
        login_id: String(member.loginId || member.signupId || member.login_id || member.signup_id || member.supabaseLoginId || ''),
        provider_id: String(member.providerId || member.provider_id || ''),
        auth_user_id: String(member.authUserId || member.auth_user_id || member.supabaseAuthUserId || ''),
        phone: String(member.phone || member.phoneNumber || member.signupIdentityPhone || member.verifiedPhone || '').replace(/[^0-9]/g, ''),
        name: String(member.name || member.fullName || member.signupIdentityName || member.verifiedName || '')
      };
    }

    function getShareTrackingRowsV521(items) {
      return (items || []).filter(Boolean).map(function(item) {
        const code = ensureManagerShareCodeForItem(item);
        const expireAt = getManagerExpireAt(item);
        return {
          share_code: String(code || ''),
          share_sig: String(getManagerLinkSignature(code, expireAt) || '')
        };
      }).filter(function(row) { return !!row.share_code; });
    }

    function getShareTrackingEquipmentNoV521(items) {
      return Array.from(new Set((items || []).map(function(item) {
        return String(item && (item.equipmentNo || item.equipment_no || item.vehicleNo || item.vehicle_number || item.registration_no) || '').trim();
      }).filter(Boolean))).join(', ');
    }

    function getShareTrackingEquipmentLabelV521(items) {
      return (items || []).filter(Boolean).map(function(item) { return getShareItemLabel(item); }).filter(Boolean).join(', ');
    }

    function normalizeShareTrackingRpcDataV521(data) {
      if (Array.isArray(data)) return data[0] || null;
      return data && typeof data === 'object' ? data : null;
    }

    async function callShareTrackingRpcV521(name, params) {
      const client = getSitePassSupabaseClient();
      if (!client || typeof client.rpc !== 'function') return { ok:false, message:'Supabase 연결 객체가 없습니다.' };
      try {
        const result = await client.rpc(name, params || {});
        if (result && result.error) {
          const err = result.error;
          return {
            ok:false,
            message:[err.code, err.message, err.details, err.hint].map(function(v){ return String(v || '').trim(); }).filter(Boolean).join(' / ') || '서버 처리 오류'
          };
        }
        const data = normalizeShareTrackingRpcDataV521(result && result.data);
        if (data && data.ok === false) return { ok:false, message:data.message || data.error || '서버 처리 실패', data:data };
        return { ok:true, data:data || {} };
      } catch (e) {
        return { ok:false, message:e && e.message ? e.message : String(e || '서버 처리 오류') };
      }
    }

    function shareTrackingSqlHintV521(message) {
      const text = String(message || '').toLowerCase();
      return /sitepass_(create|activate|cancel)_share_tracking_v521|could not find the function|schema cache|pgrst202/.test(text)
        ? '\n\nSupabase에서 v521 공유 전송·열람 알림 SQL을 먼저 실행해주세요.'
        : '';
    }

    function publishShareTrackingRowV521(row) {
      if (!row || typeof row !== 'object') return;
      try {
        if (typeof window.sitePassAddShareTrackingRowV521 === 'function') window.sitePassAddShareTrackingRowV521(row);
        else window.dispatchEvent(new CustomEvent('sitepass-share-tracking-updated-v521', { detail:row }));
      } catch (e) {}
    }

    async function prepareShareTrackingV521(items, channel, detail) {
      const token = makeShareTrackingTokenV521();
      const safeItems = (items || []).filter(Boolean);
      const result = await callShareTrackingRpcV521('sitepass_create_share_tracking_v521', {
        p_tracking_token: token,
        p_channel: String(channel || ''),
        p_receiver: String(detail && detail.receiver || ''),
        p_phone: String(detail && detail.phone || ''),
        p_email: String(detail && detail.email || ''),
        p_share_rows: getShareTrackingRowsV521(safeItems),
        p_equipment_label: getShareTrackingEquipmentLabelV521(safeItems),
        p_equipment_no: getShareTrackingEquipmentNoV521(safeItems),
        p_member: getShareTrackingMemberPayloadV521()
      });
      if (!result.ok) return { ok:false, message:result.message || '공유 알림 준비 실패' };
      return { ok:true, token:token, row:result.data || {} };
    }

    async function activateShareTrackingV521(token) {
      const result = await callShareTrackingRpcV521('sitepass_activate_share_tracking_v521', { p_tracking_token:String(token || '') });
      if (result.ok) publishShareTrackingRowV521(result.data);
      return result;
    }

    async function cancelShareTrackingV521(token) {
      return await callShareTrackingRpcV521('sitepass_cancel_share_tracking_v521', { p_tracking_token:String(token || '') });
    }

    function buildTrackedSharePayloadV521(items, token) {
      const previous = window.sitePassShareTrackingTokenV521;
      window.sitePassShareTrackingTokenV521 = String(token || '');
      try {
        const safeItems = (items || []).filter(Boolean);
        const text = buildManagerShareText(safeItems);
        const first = safeItems[0];
        const firstCode = first ? ensureManagerShareCodeForItem(first) : '';
        const firstLink = first ? makeManagerLink(firstCode, getManagerExpireAt(first)) : '';
        return { text:text, firstLink:firstLink };
      } finally {
        window.sitePassShareTrackingTokenV521 = previous || '';
      }
    }

    async function openTrackedSmsShareV521(items) {
      const phoneRaw = prompt('받는 사람 휴대폰번호를 입력해주세요.\n예: 01012345678');
      if (phoneRaw === null) return;
      const phone = normalizePhoneForShare(phoneRaw);
      if (!phone) { alert('휴대폰번호를 입력해야 문자로 보낼 수 있습니다.'); return; }
      const prepared = await prepareShareTrackingV521(items, 'sms', { receiver:phone, phone:phone });
      if (!prepared.ok) {
        alert('문자 링크 전송 알림을 준비하지 못했습니다.\n\n오류: ' + (prepared.message || '알 수 없는 오류') + shareTrackingSqlHintV521(prepared.message));
        return;
      }
      const payload = buildTrackedSharePayloadV521(items, prepared.token);
      const activated = await activateShareTrackingV521(prepared.token);
      if (!activated.ok) {
        alert('문자 링크 전송 기록을 서버에 저장하지 못했습니다.\n\n오류: ' + (activated.message || '알 수 없는 오류') + shareTrackingSqlHintV521(activated.message));
        await cancelShareTrackingV521(prepared.token);
        return;
      }
      window.location.href = 'sms:' + encodeURIComponent(phone) + '?body=' + encodeURIComponent(payload.text);
    }

    function shareManagerItems(items) {
      shareManagerItemsByChannel(items, 'kakao');
    }

    async function shareManagerItemsByChannel(items, channel) {
      const requestedItems = (items || []).filter(Boolean).map(item => { ensureManagerShareCodeForItem(item); return item; });
      if (!canUseQrShareItems(requestedItems, '담당자 QR·링크 보내기')) return;
      const refreshedItems = refreshManagerExpiryForCodes(requestedItems.map(item => ensureManagerShareCodeForItem(item)));
      const initialItems = (refreshedItems && refreshedItems.length ? refreshedItems : requestedItems).filter(Boolean).map(item => { ensureManagerShareCodeForItem(item); return item; });
      if (!initialItems.length) return;

      const prepared = await prepareManagerShareItemsForServerV497(initialItems);
      if (!prepared.ok) {
        alert('담당자 링크를 준비하지 못했습니다.\n\n' + (prepared.message || '서류 서버 저장 상태를 확인해주세요.'));
        return;
      }
      const safeItems = prepared.items;

      const saved = await saveManagerShareItemsToSupabase(safeItems);
      if (!saved.ok) {
        const message = String(saved.message || '알 수 없는 오류');
        const sqlHint = /P0001|login required|not found|Could not find|schema cache|function|permission|42501|v501 담당자 공유링크 SQL/i.test(message)
          ? '\n\nSupabase의 v501 담당자 공유링크 SQL을 실행한 뒤 다시 보내주세요.'
          : '';
        alert('담당자 링크를 서버에 저장하지 못했습니다.\n지금 보내면 받은 사람 휴대폰에서 조회할 수 없는 코드가 나올 수 있어 전송을 중단했습니다.' + sqlHint + '\n\n오류: ' + message);
        return;
      }

      if (channel === 'sms') {
        await openTrackedSmsShareV521(safeItems);
        return;
      }
      if (channel === 'email') {
        openEmailShare(buildManagerShareText(safeItems), safeItems);
        return;
      }
      await openKakaoShareV521(safeItems);
    }

    async function openKakaoShareV521(items) {
      const safeItems = (items || []).filter(Boolean);
      const prepared = await prepareShareTrackingV521(safeItems, 'kakao', { receiver:'카카오톡' });
      if (!prepared.ok) {
        alert('카카오톡 링크 전송 알림을 준비하지 못했습니다.\n\n오류: ' + (prepared.message || '알 수 없는 오류') + shareTrackingSqlHintV521(prepared.message));
        return;
      }
      const tracked = buildTrackedSharePayloadV521(safeItems, prepared.token);
      const itemCount = safeItems.length;
      if (navigator.share) {
        const payload = itemCount === 1
          ? { title:'SitePass 담당자 서류', text:'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n1일 뒤에는 담당자 QR·링크 접속이 차단됩니다.', url:tracked.firstLink }
          : { title:'SitePass 담당자 서류', text:tracked.text };
        try {
          await navigator.share(payload);
          const activated = await activateShareTrackingV521(prepared.token);
          if (!activated.ok) {
            alert('링크는 공유했지만 전송 알림을 서버에 저장하지 못했습니다.\n\n오류: ' + (activated.message || '알 수 없는 오류') + shareTrackingSqlHintV521(activated.message));
          }
        } catch (error) {
          if (error && String(error.name || '').toLowerCase() === 'aborterror') {
            await cancelShareTrackingV521(prepared.token);
            return;
          }
          copyTextFallback(tracked.text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.');
          const activated = await activateShareTrackingV521(prepared.token);
          if (!activated.ok) {
            alert('공유문은 복사했지만 전송 알림을 서버에 저장하지 못했습니다.\n\n오류: ' + (activated.message || '알 수 없는 오류') + shareTrackingSqlHintV521(activated.message));
          }
        }
      } else {
        copyTextFallback(tracked.text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.');
        const activated = await activateShareTrackingV521(prepared.token);
        if (!activated.ok) {
          alert('공유문은 복사했지만 전송 알림을 서버에 저장하지 못했습니다.\n\n오류: ' + (activated.message || '알 수 없는 오류') + shareTrackingSqlHintV521(activated.message));
        }
      }
    }

// ---- merged from app-register-share-payment-10.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (10/15)
function normalizePhoneForShare(phone) {
      const qrShare = getQrShareModule();
      if (qrShare.normalizePhoneForShare) return qrShare.normalizePhoneForShare(phone);
      return String(phone || '').replace(/[^0-9+]/g, '');
    }

    function openSmsShare(text, items) {
      const phoneRaw = prompt('받는 사람 휴대폰번호를 입력해주세요.\n예: 01012345678');
      if (phoneRaw === null) return;
      const phone = normalizePhoneForShare(phoneRaw);
      if (!phone) { alert('휴대폰번호를 입력해야 문자로 보낼 수 있습니다.'); return; }
      recordSitePassShareHistoryV520(items || [], { method:'문자 공유', receiver:phone, phone:phone, status:'문자 작성창 열기' });
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(phone) + '?body=' + body;
    }

    function openSmsShareToPhones(phones, text) {
      const targets = Array.from(new Set((phones || []).map(normalizePhoneForShare).filter(Boolean)));
      if (!targets.length) {
        alert('문자를 보낼 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(targets.join(',')) + '?body=' + body;
    }

    function buildAdminOwnerAlertText(items) {
      const safeItems = (items || []).filter(Boolean);
      const rows = safeItems.map((item, index) => {
        const prefix = safeItems.length > 1 ? (index + 1) + '. ' : '- ';
        return prefix + getShareItemLabel(item) + ' · ' + makeAlertSummary(item.docs || {});
      }).join('\n');
      return '[SitePass 관리자 알림]\n아래 장비서류의 만료 상태를 확인해주세요.\n' + rows + '\n\nSitePass 로그인 후 보관함에서 서류를 수정/갱신해주세요.';
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
      const item = getRuntimeItemByCode(code);
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
      recordSitePassShareHistoryV520(items || [], { method:'이메일 공유', receiver:cleanEmail, email:cleanEmail, status:'이메일 작성창 열기' });
      const body = encodeURIComponent(text);
      window.location.href = 'mailto:' + cleanEmail + '?subject=' + subject + '&body=' + body;
    }

    function getDocFolderKeyV486(doc) {
      const key = String(doc?.groupKey || 'equipment');
      return ['equipment','driver','worker'].includes(key) ? key : 'equipment';
    }

    function switchDocFolderV486(folderId, groupKey) {
      const root = document.getElementById(folderId);
      if (!root) return;
      root.querySelectorAll('[data-doc-folder-tab]').forEach(tab => {
        const active = tab.dataset.docFolderTab === groupKey;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      root.querySelectorAll('[data-doc-folder-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.docFolderPanel !== groupKey);
      });
    }
    window.switchDocFolderV486 = switchDocFolderV486;

    function renderDocFoldersV486(docs, folderId, renderOne) {
      const list = Array.isArray(docs) ? docs : [];
      const groups = [
        {key:'equipment', label:'장비서류'},
        {key:'driver', label:'기사서류'},
        {key:'worker', label:'인부서류'}
      ].map(group => ({ ...group, docs:list.filter(doc => getDocFolderKeyV486(doc) === group.key) }))
       .filter(group => group.docs.length > 0);
      if (!groups.length) return '<div class="empty">표시할 서류가 없습니다.</div>';
      const activeKey = groups.some(group => group.key === 'equipment') ? 'equipment' : groups[0].key;
      const tabs = groups.map(group => '<button type="button" role="tab" class="doc-folder-tab-v486 ' + (group.key === activeKey ? 'active' : '') + '" data-doc-folder-tab="' + group.key + '" aria-selected="' + (group.key === activeKey ? 'true' : 'false') + '" onclick="switchDocFolderV486(\'' + escapeJs(folderId) + '\',\'' + group.key + '\')"><span>' + escapeHtml(group.label) + '</span><b>' + group.docs.length + '</b></button>').join('');
      const panels = groups.map(group => '<div class="doc-folder-panel-v486 ' + (group.key === activeKey ? '' : 'hidden') + '" data-doc-folder-panel="' + group.key + '">' + group.docs.map((doc, index) => renderOne(doc, index)).join('') + '</div>').join('');
      return '<div id="' + escapeHtml(folderId) + '" class="doc-folders-v486"><div class="doc-folder-tabs-v486" role="tablist">' + tabs + '</div>' + panels + '</div>';
    }

    async function openAdminQrLink(code) {
      let item = getRuntimeItemByCode(code);
      if (!item) { alert('QR을 열 장비서류를 찾을 수 없습니다.'); return; }
      if (isServiceShareBlocked(item)) {
        const box = document.getElementById('detailBox');
        if (box) {
          box.innerHTML = renderServiceBlockedBox(item) + '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 결제/갱신 알림</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>';
          showScreen('detailScreen');
        }
        return;
      }
      try { item = await hydrateItemStorageAccessUrlsV523(item); } catch (e) { console.warn('관리자 상세 서류주소 준비 실패:', e); }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 240);
      const docs = getDisplayDocs(item);
      const docHtml = renderDocFoldersV486(docs, 'adminDetailFoldersV486_' + String(item.code || '').replace(/[^a-zA-Z0-9_-]/g, ''), (doc) => renderDocDetail(doc));
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
        '<h3>등록 서류 폴더</h3>' + docHtml;
      showScreen('detailScreen');
    }


    const sitePassDetailServerRefreshAtV519 = {};
    const sitePassStorageHydrateCacheV523 = new WeakMap();

    // v23.7.551-test: 장비 상세보기는 v520의 단순 흐름을 기준으로 복원합니다.
    // 서버자료가 비어 있거나 축약돼도 같은 회원의 기존 브라우저 등록자료를 보조자료로만 합칩니다.
    // 신규 Storage 경로가 있는 자료를 최우선으로 유지하고, 첨부 흔적이 없는 빈 서류카드는 상세보기에서 숨깁니다.
    const sitePassMemberDetailSnapshotV536 = new Map();

    function sitePassDetailTextV536(value) {
      return String(value == null ? '' : value).trim();
    }

    function sitePassDetailPlaceholderV536(value) {
      const text = sitePassDetailTextV536(value).toLowerCase();
      return !text || text === '미첨부' || text === '선택안함' || text === '-' || text === 'null' || text === 'undefined';
    }

    function sitePassDetailMeaningfulValueV536(value) {
      const text = sitePassDetailTextV536(value);
      return text && !sitePassDetailPlaceholderV536(text) ? text : '';
    }

    function sitePassDetailObjectFileScoreV536(obj) {
      obj = obj && typeof obj === 'object' ? obj : {};
      let score = 0;
      const pathKeys = ['storagePath','storage_path','storageKey','storage_key','filePath','file_path','objectPath','object_path','uploadPath','upload_path','path'];
      const urlKeys = ['signedUrl','signed_url','storageAccessUrl','storage_access_url','fileUrl','file_url','downloadUrl','download_url','previewDataUrl','preview_data_url','editDataUrl','edit_data_url','correctedDataUrl','corrected_data_url','originalDataUrl','original_data_url','fileDataUrl','file_data_url','storagePublicUrl','storage_public_url','publicUrl','public_url','previewUrl','preview_url','dataUrl','data_url','url','src','imageUrl','image_url'];
      if (pathKeys.some(function(key){ return !!sitePassDetailMeaningfulValueV536(obj[key]); })) score += 5000;
      urlKeys.forEach(function(key){
        const value = sitePassDetailMeaningfulValueV536(obj[key]);
        if (!value) return;
        if (/^data:/i.test(value)) score += 4500;
        else if (/^blob:/i.test(value)) score += 4000;
        else if (/^https?:\/\//i.test(value)) score += 3500;
        else score += 1200;
      });
      return score;
    }

    function sitePassDetailDocScoreV536(doc) {
      doc = doc && typeof doc === 'object' ? doc : {};
      let score = sitePassDetailObjectFileScoreV536(doc);
      const pages = Array.isArray(doc.pages) ? doc.pages : [];
      score += pages.reduce(function(sum, page){ return sum + sitePassDetailObjectFileScoreV536(page); }, 0);
      if (pages.length) score += 900 + pages.length * 50;
      const pageCount = Number(doc.pageCount || doc.page_count || 0);
      if (pageCount > 0) score += 600 + pageCount * 20;
      const fileName = sitePassDetailMeaningfulValueV536(doc.fileName || doc.file_name);
      if (fileName) score += /^첨부됨$/i.test(fileName) ? 500 : 800;
      const status = sitePassDetailTextV536(doc.status || doc.attachStatus || doc.attachmentStatus);
      if (status && /첨부|등록|완료|저장/i.test(status) && !/미첨부|선택안함/i.test(status)) score += 450;
      if (doc.previewChoice || doc.storageMode) score += 100;
      return score;
    }

    function sitePassDetailDocHasFileV536(doc) {
      if (!doc || typeof doc !== 'object') return false;
      if (sitePassDetailObjectFileScoreV536(doc) >= 1200) return true;
      return (Array.isArray(doc.pages) ? doc.pages : []).some(function(page){ return sitePassDetailObjectFileScoreV536(page) >= 1200; });
    }

    function sitePassDetailDocWasRegisteredV536(doc) {
      if (!doc || typeof doc !== 'object') return false;
      if (sitePassDetailDocHasFileV536(doc)) return true;
      const score = sitePassDetailDocScoreV536(doc);
      // 구등록 필수서류는 원본주소가 유실돼도 등록 흔적을 유지합니다.
      if (doc.required && score >= 450) return true;
      // 선택서류는 단순 '첨부됨' 껍데기로 표시하지 않고 실제 파일명 흔적이 있을 때만 남깁니다.
      const fileName = sitePassDetailMeaningfulValueV536(doc.fileName || doc.file_name);
      return !!fileName && !/^첨부됨$/i.test(fileName) && score >= 800;
    }

    function sitePassDetailCodeValuesV536(item) {
      item = item && typeof item === 'object' ? item : {};
      const rows = [item];
      ['item_json','item_data','payload','data'].forEach(function(key){
        const value = item[key];
        if (value && typeof value === 'object') rows.push(value);
      });
      const values = [];
      rows.forEach(function(row){
        ['code','share_code','shareCode','publicShareCode','managerShareCode','qrCode','qr_code','equipmentCode','equipment_code','id','originalEquipmentCode','original_equipment_code'].forEach(function(key){
          const value = sitePassDetailTextV536(row[key]);
          if (value) values.push(value);
        });
      });
      return Array.from(new Set(values));
    }

    function sitePassDetailEquipmentNoV536(item) {
      item = item && typeof item === 'object' ? item : {};
      const direct = item.equipmentNo || item.equipment_no || item.vehicleNo || item.vehicle_no || item.registrationNo || item.registration_no;
      const text = sitePassDetailTextV536(direct);
      return text.replace(/\s+/g, '').toLowerCase();
    }

    function sitePassDetailItemMatchesV536(item, code, equipmentNo) {
      if (!item || typeof item !== 'object') return false;
      const targetCode = sitePassDetailTextV536(code);
      if (targetCode && sitePassDetailCodeValuesV536(item).indexOf(targetCode) >= 0) return true;
      const targetNo = sitePassDetailTextV536(equipmentNo).replace(/\s+/g, '').toLowerCase();
      return !!targetNo && sitePassDetailEquipmentNoV536(item) === targetNo;
    }

    function sitePassDetailUnwrapV536(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const nested = [raw.item_json, raw.item_data, raw.payload, raw.data].find(function(value){ return value && typeof value === 'object' && (value.docs || value.code || value.equipmentNo || value.equipment_no); });
      if (!nested) return raw;
      const out = Object.assign({}, raw, nested);
      if (nested.docs) out.docs = nested.docs;
      return out;
    }

    function sitePassCollectDetailCandidatesV536(code, seed) {
      const targetCode = sitePassDetailTextV536(code);
      const targetNo = sitePassDetailEquipmentNoV536(seed);
      const candidates = [];
      const seen = new WeakSet();
      function add(raw) {
        const item = sitePassDetailUnwrapV536(raw);
        if (!item || !sitePassDetailItemMatchesV536(item, targetCode, targetNo)) return;
        if (seen.has(item)) return;
        seen.add(item);
        candidates.push(item);
      }
      add(seed);
      try { add(getRuntimeItemByCode(targetCode)); } catch (e) {}
      try { add(getItemByCode(targetCode)); } catch (e) {}
      try { if (typeof getSitePassCanonicalEquipmentItemV519 === 'function') add(getSitePassCanonicalEquipmentItemV519(targetCode)); } catch (e) {}
      try { (getSitePassServerAuthoritativeEquipmentItems() || []).forEach(add); } catch (e) {}
      try { (getServerEquipmentCache() || []).forEach(add); } catch (e) {}
      try { (getSitePassUnsyncedEquipmentItemsV476() || []).forEach(add); } catch (e) {}
      try { if (typeof getLocalVisibleEquipmentItemsForServerResync === 'function') (getLocalVisibleEquipmentItemsForServerResync() || []).forEach(add); } catch (e) { console.warn('상세보기 기존 등록자료 검색 실패:', e); }
      try { add(window.sitePassFastCompletionItem); } catch (e) {}
      try { (Array.isArray(window.sitePassFastCompletionItems) ? window.sitePassFastCompletionItems : []).forEach(add); } catch (e) {}
      try { if (window.sitePassArchiveItemSnapshotV538 instanceof Map) add(window.sitePassArchiveItemSnapshotV538.get(targetCode)); } catch (e) {}
      try { add(sitePassMemberDetailSnapshotV536.get(targetCode)); } catch (e) {}
      return candidates;
    }

    function sitePassCloneDetailDocV536(doc) {
      doc = doc && typeof doc === 'object' ? doc : {};
      const out = Object.assign({}, doc);
      if (Array.isArray(doc.pages)) out.pages = doc.pages.map(function(page){ return page && typeof page === 'object' ? Object.assign({}, page) : page; });
      return out;
    }

    function sitePassMergeDetailPagesV536(aPages, bPages) {
      const a = Array.isArray(aPages) ? aPages : [];
      const b = Array.isArray(bPages) ? bPages : [];
      const length = Math.max(a.length, b.length);
      const out = [];
      for (let i = 0; i < length; i++) {
        const left = a[i] && typeof a[i] === 'object' ? a[i] : null;
        const right = b[i] && typeof b[i] === 'object' ? b[i] : null;
        if (!left) { if (right) out.push(Object.assign({}, right)); continue; }
        if (!right) { out.push(Object.assign({}, left)); continue; }
        const better = sitePassDetailObjectFileScoreV536(right) > sitePassDetailObjectFileScoreV536(left) ? right : left;
        const other = better === right ? left : right;
        out.push(Object.assign({}, other, better));
      }
      return out;
    }

    function sitePassMergeDetailDocV536(current, incoming) {
      if (!current) return sitePassCloneDetailDocV536(incoming);
      if (!incoming) return sitePassCloneDetailDocV536(current);
      const currentScore = sitePassDetailDocScoreV536(current);
      const incomingScore = sitePassDetailDocScoreV536(incoming);
      const better = incomingScore > currentScore ? incoming : current;
      const other = better === incoming ? current : incoming;
      const out = Object.assign({}, other, better);
      out.pages = sitePassMergeDetailPagesV536(current.pages, incoming.pages);
      const fillKeys = ['title','groupTitle','groupKey','key','docKind','required','expiry','expireDate','educationDate','fileName','pageCount','status'];
      fillKeys.forEach(function(key){
        if ((out[key] === undefined || out[key] === null || out[key] === '') && other[key] !== undefined) out[key] = other[key];
      });
      if (!out.pageCount && out.pages.length) out.pageCount = out.pages.length;
      return out;
    }

    function sitePassDetailItemScoreV536(item) {
      if (!item || typeof item !== 'object') return 0;
      return Object.values(item.docs || {}).reduce(function(sum, doc){ return sum + sitePassDetailDocScoreV536(doc); }, 0);
    }

    function sitePassBuildStableDetailItemV536(code) {
      const targetCode = sitePassDetailTextV536(code);
      let seed = null;
      try { seed = getRuntimeItemByCode(targetCode) || getItemByCode(targetCode); } catch (e) {}
      const candidates = sitePassCollectDetailCandidatesV536(targetCode, seed);
      if (!candidates.length) return seed;
      candidates.sort(function(a, b){ return sitePassDetailItemScoreV536(b) - sitePassDetailItemScoreV536(a); });
      const best = candidates[0];
      // 장비명·결제·서비스상태 같은 현재 서버값은 유지하고 서류만 과거자료에서 보완합니다.
      const out = Object.assign({}, best || {}, seed || {});
      const docs = {};
      candidates.forEach(function(item){
        Object.keys((item && item.docs) || {}).forEach(function(key){ docs[key] = sitePassMergeDetailDocV536(docs[key], item.docs[key]); });
      });
      out.docs = docs;
      if (!out.code) out.code = targetCode;
      if (!out.equipmentNo) out.equipmentNo = candidates.map(function(item){ return item.equipmentNo || item.equipment_no || ''; }).find(Boolean) || '';
      if (!out.equipmentName) out.equipmentName = candidates.map(function(item){ return item.equipmentName || item.equipment_name || ''; }).find(Boolean) || '';
      const includedGroups = [];
      candidates.forEach(function(item){
        const groups = item && item.bundleMeta && Array.isArray(item.bundleMeta.includedGroups) ? item.bundleMeta.includedGroups : [];
        groups.forEach(function(group){ if (includedGroups.indexOf(group) < 0) includedGroups.push(group); });
      });
      if (includedGroups.length) {
        out.bundleMeta = Object.assign({}, out.bundleMeta || {});
        out.bundleMeta.includedGroups = includedGroups;
      }
      sitePassMemberDetailSnapshotV536.set(targetCode || sitePassDetailCodeValuesV536(out)[0] || '', out);
      return out;
    }

    function sitePassGetRegisteredDetailDocsV536(item) {
      return getDisplayDocs(item).filter(sitePassDetailDocWasRegisteredV536);
    }

    function sitePassRenderMissingOriginalDocV536(doc) {
      const effectiveExpireDate = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '';
      const dateHtml = !doc.expiry ? '' : '<div class="line"><b>만료날짜</b><span>' + (effectiveExpireDate ? escapeHtml(effectiveExpireDate + ' / ' + getDdayText(effectiveExpireDate)) : '미입력') + '</span></div>';
      return '<div class="doc-card"><div class="doc-head"><div class="doc-title">' + escapeHtml((doc.groupTitle ? doc.groupTitle + ' - ' : '') + (doc.title || '서류')) + '</div><span class="badge need">원본 확인 필요</span></div>' +
        '<div class="selected-file">등록된 서류정보는 남아 있습니다.<br>사진이 보이지 않을 때만 수정/갱신에서 원본을 다시 첨부해주세요.</div>' + dateHtml + '</div>';
    }

    function sitePassRenderMemberDetailDocV536(doc) {
      return sitePassDetailDocHasFileV536(doc) ? renderDocDetail(doc) : sitePassRenderMissingOriginalDocV536(doc);
    }

    async function resolveStorageAccessUrlForObjectV523(obj, parent, forceRefresh) {
      if (!obj || typeof obj !== 'object') return '';
      const path = getManagerShareStoragePathV497(obj);
      if (!path) return getManagerShareObjectStoredUrlV496(obj) || '';
      const api = window.SitePassSupabaseApi;
      if (!api) return getManagerShareObjectStoredUrlV496(obj) || '';
      try {
        if (typeof api.storageResolveUrl === 'function') {
          return String(await api.storageResolveUrl(getManagerShareStorageBucketV497(obj, parent), path, {
            preferSigned:true,
            forceRefresh:!!forceRefresh
          }) || '');
        }
      } catch (e) { console.warn('기간 제한 파일주소 생성 실패:', e); }
      try {
        if (typeof api.storagePublicUrl === 'function') return String(api.storagePublicUrl(getManagerShareStorageBucketV497(obj, parent), path) || '');
      } catch (e) {}
      return '';
    }

    function applyStorageAccessUrlV523(obj, url) {
      if (!obj || typeof obj !== 'object' || !url) return obj;
      obj.signedUrl = url;
      obj.storageAccessUrl = url;
      obj.fileUrl = url;
      obj.downloadUrl = url;
      obj.previewDataUrl = url;
      obj.editDataUrl = url;
      obj.storagePublicUrl = '';
      obj.publicUrl = '';
      obj.storageAccessExpiresAt = Date.now() + Number((window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.storageSignedUrlTtlSeconds) || 900) * 1000;
      return obj;
    }

    async function hydrateItemStorageAccessUrlsV523(item, forceRefresh) {
      if (!item || typeof item !== 'object') return item;
      if (!forceRefresh && sitePassStorageHydrateCacheV523.has(item)) {
        try { return await sitePassStorageHydrateCacheV523.get(item); } catch (e) {}
      }
      const promise = (async function(){
        const docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
        const tasks = [];
        Object.keys(docs).forEach(function(key){
          const doc = docs[key] && typeof docs[key] === 'object' ? docs[key] : {};
          const pages = Array.isArray(doc.pages) ? doc.pages : [];
          if (getManagerShareStoragePathV497(doc)) tasks.push({ obj:doc, parent:item });
          pages.forEach(function(page){ if (page && typeof page === 'object' && getManagerShareStoragePathV497(page)) tasks.push({ obj:page, parent:doc }); });
        });
        let cursor = 0;
        async function worker(){
          while (cursor < tasks.length) {
            const task = tasks[cursor++];
            const url = await resolveStorageAccessUrlForObjectV523(task.obj, task.parent, forceRefresh);
            if (url) applyStorageAccessUrlV523(task.obj, url);
          }
        }
        await Promise.all(Array.from({ length:Math.min(4, Math.max(1, tasks.length)) }, worker));
        Object.keys(docs).forEach(function(key){
          const doc = docs[key] && typeof docs[key] === 'object' ? docs[key] : {};
          const pages = Array.isArray(doc.pages) ? doc.pages : [];
          if (!getManagerShareObjectStoredUrlV496(doc)) {
            const firstUrl = pages.map(getManagerShareObjectStoredUrlV496).find(Boolean) || '';
            if (firstUrl) applyStorageAccessUrlV523(doc, firstUrl);
          }
        });
        item.docs = docs;
        item.storageAccessHydratedAtV523 = new Date().toISOString();
        return item;
      })();
      sitePassStorageHydrateCacheV523.set(item, promise);
      try { return await promise; }
      finally { if (forceRefresh) sitePassStorageHydrateCacheV523.delete(item); }
    }


    window.sitePassHydrateItemStorageAccessUrlsV523 = hydrateItemStorageAccessUrlsV523;

    function refreshMemberDetailFromServerV519(code) {
      const targetCode = String(code || '').trim();
      if (!targetCode) return;
      try {
        if (typeof isSitePassMemberServerAuthoritativeMode !== 'function' || !isSitePassMemberServerAuthoritativeMode()) return;
        if (typeof syncSupabaseMyEquipmentItems !== 'function') return;
      } catch (e) { return; }
      const last = Number(sitePassDetailServerRefreshAtV519[targetCode] || 0);
      if (Date.now() - last < 12000) return;
      sitePassDetailServerRefreshAtV519[targetCode] = Date.now();
      Promise.resolve(syncSupabaseMyEquipmentItems(true, true)).then(function(result){
        if (!result || result.ok !== true) return;
        if (String(window.sitePassCurrentDetailCodeV519 || '') !== targetCode) return;
        if (typeof sitePassCurrentScreenId !== 'undefined' && sitePassCurrentScreenId !== 'detailScreen') return;
        renderDetail(targetCode, { skipServerRefresh:true, preserveVisible:true });
      }).catch(function(error){
        console.warn('상세보기 서버 최신자료 확인 실패:', error);
      });
    }

    function sitePassPaintMemberDetailV536(item, requestedCodeV519, paintOptionsV541) {
      if (!item) return false;
      paintOptionsV541 = paintOptionsV541 || {};
      try { item = mergeLegacyManagerShareDocumentsV498(item); } catch (e) {}
      try { item = hydrateManagerShareStorageUrlsV497(item); } catch (e) {}
      const itemCode = ensureManagerShareCodeForItem(item) || String(requestedCodeV519 || '').trim();
      currentDetailLink = makeManagerLink(itemCode, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 180);
      const detailDocs = sitePassGetRegisteredDetailDocsV536(item);
      const docHtml = detailDocs.length
        ? renderDocFoldersV486(detailDocs, 'memberDetailFoldersV536_' + String(itemCode || '').replace(/[^a-zA-Z0-9_-]/g, ''), function(doc){ return sitePassRenderMemberDetailDocV536(doc); })
        : (paintOptionsV541.docsPending
          ? '<div class="empty sitepass-detail-doc-loading-v541"><b>등록 서류를 불러오는 중입니다.</b><br>로그인 직후 서버 서류목록을 확인하고 있습니다. 확인 전에는 서류 없음으로 표시하지 않습니다.</div>'
          : '<div class="empty"><b>서버에서 등록된 서류정보를 확인하지 못했습니다.</b><br>수정/갱신 화면에서 등록서류가 남아 있는지 확인해주세요.</div>');
      const renewalHtml = isAdminLoggedIn() ? '<div class="notice blue-note">관리자 상세보기에서는 수정/갱신·결제연장 버튼을 숨깁니다. 장비업자에게 알림만 보내고, 실제 수정/갱신은 회원 보관함에서 처리합니다.</div>' : renderRenewPanel(item);
      const detailBox = document.getElementById('detailBox');
      if (!detailBox) return false;
      detailBox.innerHTML =
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo || '-') + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName || '-') + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>결제단위</b><span>' + escapeHtml(item?.bundleMeta?.paymentText || '장비 및 인력 통합 1세트 결제') + '</span></div>' +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        '<div class="line"><b>요금제 기준</b><span>' + escapeHtml(item.basicPlan || BASIC_PRICE_TEXT) + '<br>' + escapeHtml(item.alertPlan || ALERT_PRICE_TEXT) + '</span></div>' +
        '<div class="line"><b>전달 정책</b><span>' + escapeHtml(item.forwardPolicy || '공유 후 1일 재전송 가능 예정') + '</span></div>' +
        renewalHtml +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(itemCode) + '\')">' +
          '<img alt="통합 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 다운로드/프린트 화면 바로 열림</div>' +
        '</div>' +
        '<h3>등록 서류 폴더</h3>' + docHtml;
      showScreen('detailScreen');
      return true;
    }

    function renderDetail(code, options) {
      options = options || {};
      const requestedCodeV519 = String(code || '').trim();
      try { window.sitePassCurrentDetailCodeV519 = requestedCodeV519; } catch (e) {}
      let item = sitePassBuildStableDetailItemV536(requestedCodeV519);
      if (!item) {
        const detailBox = document.getElementById('detailBox');
        if (detailBox) detailBox.innerHTML = '<div class="empty"><b>장비 정보를 불러오는 중입니다.</b><br>서버 확인이 끝나기 전에는 장비 없음으로 표시하지 않습니다.</div>';
        showScreen('detailScreen');
        if (!options.skipMissingRetry && typeof syncSupabaseMyEquipmentItems === 'function') {
          Promise.resolve(syncSupabaseMyEquipmentItems(true, true)).then(function(){
            if (String(window.sitePassCurrentDetailCodeV519 || '') !== requestedCodeV519) return;
            const retryItem = sitePassBuildStableDetailItemV536(requestedCodeV519);
            if (retryItem) { renderDetail(requestedCodeV519, { skipServerRefresh:true, skipMissingRetry:true }); return; }
            const retryBox = document.getElementById('detailBox');
            if (retryBox) retryBox.innerHTML = '<div class="empty"><b>장비 정보를 최종 확인하지 못했습니다.</b><br>보관함으로 돌아가 다시 열어주세요.</div>';
          }).catch(function(error){
            console.warn('상세보기 장비 재확인 실패:', error);
            const retryBox = document.getElementById('detailBox');
            if (retryBox) retryBox.innerHTML = '<div class="empty"><b>서버 연결을 확인하지 못했습니다.</b><br>장비 없음으로 처리하지 않았습니다. 네트워크 확인 후 다시 열어주세요.</div>';
          });
        }
        return;
      }
      const detailDocsBeforeV541 = sitePassGetRegisteredDetailDocsV536(item);
      const shouldWaitForDocsV541 = !detailDocsBeforeV541.length && !options.skipEmptyDocsRetry;
      sitePassPaintMemberDetailV536(item, requestedCodeV519, { docsPending:shouldWaitForDocsV541 });

      // 비공개 Storage 파일은 상세화면을 먼저 보여준 뒤 기간 제한 주소만 뒤에서 채웁니다.
      Promise.resolve(hydrateItemStorageAccessUrlsV523(item, true)).then(function(hydrated){
        if (String(window.sitePassCurrentDetailCodeV519 || '') !== requestedCodeV519) return;
        if (typeof sitePassCurrentScreenId !== 'undefined' && sitePassCurrentScreenId !== 'detailScreen') return;
        const stable = sitePassBuildStableDetailItemV536(requestedCodeV519) || hydrated || item;
        const stableDocs = sitePassGetRegisteredDetailDocsV536(stable);
        sitePassPaintMemberDetailV536(stable, requestedCodeV519, { docsPending:shouldWaitForDocsV541 && !stableDocs.length });
      }).catch(function(error){ console.warn('회원 상세 서류주소 준비 실패:', error); });

      if (shouldWaitForDocsV541 && typeof syncSupabaseMyEquipmentItems === 'function') {
        // 장비 한 건 직접조회는 전체 보관함 동기화와 병렬로 실행합니다.
        // RLS가 허용하는 환경에서는 해당 장비 서류가 먼저 도착하는 즉시 화면을 다시 그립니다.
        if (typeof window.sitePassLoadMemberEquipmentItemByCodeV541 === 'function') {
          Promise.resolve(window.sitePassLoadMemberEquipmentItemByCodeV541(requestedCodeV519)).then(function(result){
            if (!result || result.ok !== true) return;
            if (String(window.sitePassCurrentDetailCodeV519 || '') !== requestedCodeV519) return;
            if (typeof sitePassCurrentScreenId !== 'undefined' && sitePassCurrentScreenId !== 'detailScreen') return;
            const directItem = sitePassBuildStableDetailItemV536(requestedCodeV519) || result.item;
            if (directItem && sitePassGetRegisteredDetailDocsV536(directItem).length) renderDetail(requestedCodeV519, { skipServerRefresh:true, skipEmptyDocsRetry:true });
          }).catch(function(){});
        }
        Promise.resolve(syncSupabaseMyEquipmentItems(true, true)).then(function(){
          if (String(window.sitePassCurrentDetailCodeV519 || '') !== requestedCodeV519) return;
          if (typeof sitePassCurrentScreenId !== 'undefined' && sitePassCurrentScreenId !== 'detailScreen') return;
          const refreshed = sitePassBuildStableDetailItemV536(requestedCodeV519);
          if (refreshed && sitePassGetRegisteredDetailDocsV536(refreshed).length) {
            renderDetail(requestedCodeV519, { skipServerRefresh:true, skipEmptyDocsRetry:true });
            return;
          }
          if (refreshed) sitePassPaintMemberDetailV536(refreshed, requestedCodeV519, { docsPending:false });
        }).catch(function(error){ console.warn('상세보기 서류목록 빠른 확인 실패:', error); });
      } else if (!options.skipServerRefresh) {
        refreshMemberDetailFromServerV519(requestedCodeV519 || item.code);
      }
    }

    function renderDocDetail(doc) {
      const pages = getDocPagesFromDoc(doc);
      const badgeClass = doc.fileName ? 'done' : (doc.required ? 'need' : '');
      const badgeText = doc.fileName ? ((doc.status || '첨부됨') + (pages.length ? ' · ' + pages.length + '장' : '')) : (doc.required ? '미첨부' : '선택안함');
      const attachInfo = (!pages.length && !doc.fileName) ? '<div class="selected-file">미첨부</div>' : '';
      const effectiveExpireDate = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '';
      const educationDate = (window.sitePassGetEducationDateV486 && window.sitePassGetEducationDateV486(doc)) || doc.educationDate || '';
      const isEducation3Years = !!(window.sitePassIsMachinerySafetyDocV486 && window.sitePassIsMachinerySafetyDocV486(doc));
      const dateHtml = !doc.expiry ? '' : isEducation3Years
        ? '<div class="line"><b>안전교육 이수일</b><span>' + (educationDate ? escapeHtml(educationDate) : '미입력') + '</span></div><div class="line"><b>다음 교육 예정일</b><span>' + (effectiveExpireDate ? escapeHtml(effectiveExpireDate + ' / ' + getDdayText(effectiveExpireDate)) : '미입력') + '</span></div>'
        : '<div class="line"><b>만료날짜</b><span>' + (effectiveExpireDate ? escapeHtml(effectiveExpireDate + ' / ' + getDdayText(effectiveExpireDate)) : '미입력') + '</span></div>';
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

// ---- merged from app-register-share-payment-11.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (11/15)
function renderDocExpiryStrip(doc) {
      const effectiveExpireDate = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc?.expireDate || '';
      if (!doc || !effectiveExpireDate) return '';
      const label = (window.sitePassIsMachinerySafetyDocV486 && window.sitePassIsMachinerySafetyDocV486(doc)) ? '다음 교육 예정일' : getExpiryPeriodLabel(doc);
      const dday = getDdayTextWithDays(effectiveExpireDate);
      const educationDate = (window.sitePassGetEducationDateV486 && window.sitePassGetEducationDateV486(doc)) || '';
      const educationText = educationDate ? ' · 교육일 ' + educationDate : '';
      return '<div class="doc-expiry-strip"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(dday + ' · ' + effectiveExpireDate + educationText) + '</span></div>';
    }

    function getEquipmentNoForDocLabel(code) {
      const item = code ? getRuntimeItemByCode(code) : null;
      return String(item?.equipmentNo || document.getElementById('equipmentNo')?.value || '').trim();
    }

    function makeDocFileTopLabel(doc, code) {
      const equipmentNo = getEquipmentNoForDocLabel(code);
      const title = String(doc?.title || doc?.docTitle || '첨부서류').trim();
      return (equipmentNo ? equipmentNo + ' ' : '') + title;
    }

    function renderIdExtraStrip(doc) {
      if (!doc) return '';
      const phoneValue = doc.driverPhone || doc.workerPhone || doc.personPhone || doc.authPhone || '';
      const nameValue = doc.authPersonName || '';
      const verifiedAt = doc.authVerifiedAt || '';
      const identityStatus = doc.identityStatus || '미완료';
      const nameStrip = nameValue ? '<div><b>이름</b>: ' + escapeHtml(nameValue) + '</div>' : '';
      const phoneStrip = phoneValue ? '<div><b>휴대폰</b>: ' + escapeHtml(phoneValue) + '</div>' : '';
      const verifiedStrip = (nameStrip || phoneStrip) ? '<div><b>휴대폰 인증</b>: 완료' + (verifiedAt ? ' / ' + escapeHtml(new Date(verifiedAt).toLocaleString('ko-KR')) : '') + '</div><div><b>본인확인</b>: ' + escapeHtml(identityStatus) + '</div><div class="small">※ 위 이름과 첨부 신분증 이름이 일치하는지 확인하세요.</div>' : '';
      const taskStrip = doc.workerTask ? '<div><b>작업내용</b>: ' + escapeHtml(doc.workerTask) + '</div>' : '';
      return (nameStrip || phoneStrip || taskStrip) ? '<div class="id-extra-strip sp351-id-extra-strip">' + nameStrip + phoneStrip + verifiedStrip + taskStrip + '</div>' : '';
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
      if (currentDetailLink.includes('#manager=') || currentDetailLink.includes('?manager=') || currentDetailLink.includes('&manager=')) {
        const parsed = parseManagerHash(currentDetailLink.includes('#manager=') ? '#' + currentDetailLink.split('#')[1] : currentDetailLink);
        if (parsed.code) openManagerPublicView(parsed.code, parsed.exp, parsed.sig);
        return;
      }
      const code = decodeURIComponent((currentDetailLink.split('#qr=')[1] || '').trim());
      if (code) openQrPublicView(code);
    }


    function showManagerPreviewPreparingV511() {
      let overlay = document.getElementById('sitepassManagerPreviewPreparingV511');
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'sitepassManagerPreviewPreparingV511';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(13,28,51,.55);';
      overlay.innerHTML = '<div style="width:min(380px,100%);padding:22px;border-radius:18px;background:#fff;box-shadow:0 22px 70px rgba(0,0,0,.28);text-align:center"><div style="width:38px;height:38px;margin:0 auto 12px;border:4px solid #dfe9f7;border-top-color:#1767ca;border-radius:50%;animation:sitepassV511Spin .8s linear infinite"></div><b style="display:block;font-size:17px;color:#17243b">링크화면 파일을 확인하고 있습니다.</b><span style="display:block;margin-top:8px;color:#66758c;font-size:13px;line-height:1.55">실제 Storage 파일주소를 확인한 뒤 화면을 엽니다.</span></div><style>@keyframes sitepassV511Spin{to{transform:rotate(360deg)}}</style>';
      document.body.appendChild(overlay);
      return overlay;
    }
    function hideManagerPreviewPreparingV511(){ const overlay=document.getElementById('sitepassManagerPreviewPreparingV511'); if(overlay) overlay.remove(); }

    function sitePassCreateMemberPreviewTokenV542(finalCode) {
      const token = (window.crypto && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID().replace(/-/g, '')
        : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
      const record = {
        token:String(token || ''),
        code:String(finalCode || ''),
        createdAt:Date.now(),
        expiresAt:Date.now() + (30 * 60 * 1000)
      };
      try {
        sessionStorage.setItem('sitepass_member_preview_auth_v542_' + String(finalCode || ''), JSON.stringify(record));
      } catch (e) {
        console.warn('회원 링크화면 인증값 저장 실패:', e);
      }
      return record.token;
    }

    function sitePassSaveManagerPreviewSnapshotV538(previewItem, finalCode, linkSig, memberPreviewToken) {
      const snapshot = {
        item_data:previewItem,
        payload:previewItem,
        expires_at:null,
        share_code:String(finalCode || ''),
        share_sig:String(linkSig || ''),
        member_preview:true,
        member_preview_token:String(memberPreviewToken || ''),
        preview_saved_at:new Date().toISOString()
      };
      const key = 'sitepass_recipient_preview_current_' + String(finalCode || '');
      try {
        sessionStorage.setItem(key, JSON.stringify(snapshot));
        return true;
      } catch (e) {
        try {
          const lightItem = typeof stripItemDataUrlsForServerStorage === 'function'
            ? stripItemDataUrlsForServerStorage(previewItem)
            : previewItem;
          sessionStorage.setItem(key, JSON.stringify(Object.assign({}, snapshot, { item_data:lightItem, payload:lightItem })));
          return true;
        } catch (ignore) {
          console.warn('링크화면 즉시 미리보기 저장 실패:', ignore);
          return false;
        }
      }
    }

    async function openManagerPublicView(code, expireAt, sig, options) {
      options = options || {};
      const targetCode = String(code || '').trim();
      let item = null;
      try { if (window.sitePassArchiveItemSnapshotV538 instanceof Map) item = window.sitePassArchiveItemSnapshotV538.get(targetCode) || null; } catch (e) {}
      item = item || sitePassBuildStableDetailItemV536(targetCode) || getRuntimeItemByCode(targetCode) || getItemByCode(targetCode);
      if (!item) {
        if (!options.skipServerRetry && typeof syncSupabaseMyEquipmentItems === 'function') {
          showManagerPreviewPreparingV511();
          try {
            await syncSupabaseMyEquipmentItems(true, true);
          } catch (e) { console.warn('링크화면 장비 재확인 실패:', e); }
          hideManagerPreviewPreparingV511();
          return openManagerPublicView(targetCode, expireAt, sig, { skipServerRetry:true });
        }
        alert('장비 정보를 최종 확인하지 못했습니다. 보관함으로 돌아가 다시 열어주세요.');
        return;
      }

      // v23.7.551-test: 로그인 직후 캐시에 서류목록이 아직 없으면 진행 중인 첫 서버동기화를
      // 최대 2.2초만 함께 기다립니다. 30~40초짜리 중복 재조회는 만들지 않습니다.
      if (!options.skipDocsWarmup && !sitePassGetRegisteredDetailDocsV536(item).length && typeof syncSupabaseMyEquipmentItems === 'function') {
        try {
          const warmupsV541 = [Promise.resolve(syncSupabaseMyEquipmentItems(true, true)).then(function(){
            const syncedItem = sitePassBuildStableDetailItemV536(targetCode);
            if (syncedItem && sitePassGetRegisteredDetailDocsV536(syncedItem).length) return syncedItem;
            throw new Error('전체 동기화에 서류목록 없음');
          })];
          if (typeof window.sitePassLoadMemberEquipmentItemByCodeV541 === 'function') {
            warmupsV541.push(Promise.resolve(window.sitePassLoadMemberEquipmentItemByCodeV541(targetCode)).then(function(result){
              const directItem = sitePassBuildStableDetailItemV536(targetCode) || (result && result.item);
              if (result && result.ok === true && directItem && sitePassGetRegisteredDetailDocsV536(directItem).length) return directItem;
              throw new Error('장비 한 건 조회에 서류목록 없음');
            }));
          }
          const readyV541 = Promise.any ? Promise.any(warmupsV541) : Promise.race(warmupsV541);
          await Promise.race([
            readyV541.catch(function(){ return null; }),
            new Promise(function(resolve){ setTimeout(resolve, 2200); })
          ]);
          item = sitePassBuildStableDetailItemV536(targetCode) || item;
        } catch (e) { console.warn('링크화면 서류목록 빠른 준비 실패:', e); }
      }

      // 링크화면은 Storage 전체검사·복구를 기다리지 않고 캐시된 서류 메타정보와 경로로 먼저 엽니다.
      // 보관함 카드에서 확보한 장비 원본을 sessionStorage에 넘기고 share.html이 즉시 그린 뒤
      // 서버 최신자료와 기간 제한 파일주소를 뒤에서 보완합니다.
      let previewItem = item;
      try { previewItem = mergeLegacyManagerShareDocumentsV498(getBestManagerShareServerItemV497(item)); } catch (e) {}
      try { previewItem = recoverManagerShareItemFromRegistrationDomV500(previewItem); } catch (e) {}
      try { previewItem = hydrateManagerShareStorageUrlsV497(previewItem); } catch (e) {}
      const originalCode = ensureManagerShareCodeForItem(previewItem) || targetCode;
      const finalCode = ensureManagerShareCodeForItem(previewItem) || originalCode;
      // v23.7.551-test: 회원이 보관함에서 여는 링크화면은 수신자 공유링크와 분리합니다.
      // 회원 미리보기에는 만료시간을 적용하거나 공개 공유행의 만료시간을 갱신하지 않습니다.
      // 카카오톡·문자 등 실제 전송 기능에서 만든 링크만 기존 1일 만료 규칙을 사용합니다.
      const recipientExpireAt = expireAt ? Number(expireAt) : getManagerExpireAt(previewItem);
      const linkSig = sig || getManagerLinkSignature(finalCode, recipientExpireAt);
      const memberPreviewToken = sitePassCreateMemberPreviewTokenV542(finalCode);
      sitePassSaveManagerPreviewSnapshotV538(previewItem, finalCode, linkSig, memberPreviewToken);

      const url = new URL('./share.html', window.location.href);
      url.search = ''; url.hash = '';
      url.searchParams.set('manager', String(finalCode || ''));
      if (linkSig) url.searchParams.set('sig', String(linkSig));
      url.searchParams.set('from', 'member');
      url.searchParams.set('preview_token', String(memberPreviewToken || ''));
      url.searchParams.set('v', '23.7.551-test');
      window.location.assign(url.toString());
    }



    function copyManagerCode(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      if (!canUseQrShareItems([item], '담당자 QR·링크 복사')) return;
      const expireAt = getManagerExpireAt(item);
      const link = makeManagerLink(item.code, expireAt);
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\n' +
        '장비: ' + getItemTitle(item) + '\n' +
        'QR·링크: ' + link + '\n' +
        '만료일: ' + getManagerExpireText(expireAt) + '\n' +
        '1일 뒤에는 담당자 QR·링크 접속이 차단됩니다.';
      copyTextFallback(text, '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 담당자가 코드 입력 없이 바로 열 수 있습니다.');
    }

    function downloadAllDocsBundle(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) return;
      downloadDocsBundle(item, getAttachedDisplayDocs(item), '전체서류');
    }

    function downloadSelectedDocsBundle(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) return;
      const keys = getSelectedPrintDocKeys();
      if (!keys.length) { alert('다운로드할 서류를 체크해주세요.'); return; }
      downloadDocsBundle(item, getDocsByKeys(item, keys), '선택서류');
    }

    function downloadSingleDocBundle(code, key) {
      const item = getRuntimeItemByCode(code);
      if (!item) return;
      downloadDocsBundle(item, getDocsByKeys(item, [key]), '단일서류');
    }


    function downloadDocsBundle(item, docs, label) {
      const out = getDocumentOutputModule();
      if (out.downloadDocsBundle) return out.downloadDocsBundle(item, docs, label, getDocumentOutputDeps());
      alert('문서 다운로드 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }


    function buildDownloadHtml(item, pages, blockedPages) {
      const out = getDocumentOutputModule();
      if (out.buildDownloadHtml) return out.buildDownloadHtml(item, pages, blockedPages, getDocumentOutputDeps());
      return buildPrintHtml(item, pages, blockedPages);
    }


    function renderPublicDocLine(doc, code, index) {
      const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
      const pages = getDocPagesFromDoc(doc);
      const pageText = pages.length ? ' · ' + pages.length + '장' : '';
      const effectiveExpireDate = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '';
      const expiryText = effectiveExpireDate ? ' / ' + escapeHtml(getExpiryPeriodLabel(doc) + ' ' + getDdayTextWithDays(effectiveExpireDate)) : '';
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + expiryText;
      const hasPrintablePreview = docHasPrintablePreview(doc);
      const disabledNote = (doc.fileName && !hasPrintablePreview) ? '<div class="print-disabled-note">현재 이 첨부는 이미지 저장본이 없어 바로 인쇄는 제한될 수 있습니다. 서버 저장 단계에서 원본 파일 인쇄로 연결합니다.</div>' : '';
      const previewHtml = renderPreviewHtmlForPublic(doc, code) || (doc.fileName ? '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div><div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>' + renderIdExtraStrip(doc) + '</div>' : '');
      return '<div class="public-doc-card printable" data-public-doc-key="' + escapeHtml(doc.key) + '">' +
        '<div class="doc-head"><label class="print-check-label"><input type="checkbox" data-print-doc-check value="' + escapeHtml(doc.key) + '" ' + (!doc.fileName ? 'disabled' : '') + ' /> <span>' + (index + 1) + '. ' + escapeHtml(title) + '</span></label><span class="badge ' + (doc.fileName ? 'done' : (doc.required ? 'need' : '')) + '">' + (doc.fileName ? statusText : (doc.required ? '미첨부' : '선택안함')) + '</span></div>' +
        previewHtml + disabledNote + '</div>';
    }

    function renderPreviewHtmlForPublic(doc, code) {
      const pages = getDocPagesFromDoc(doc);
      if (!pages.length) return renderPreviewHtml(doc);
      const extraStrip = renderIdExtraStrip(doc);
      const label = makeDocFileTopLabel(doc, code);
      return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:code, docLabel:label }) + renderDocExpiryStrip(doc) + extraStrip + '</div>';
    }

    async function renderPublic(code) {
      let item = getItems().find(x => x.code === code);
      if (!item) {
        document.getElementById('publicBox').innerHTML = '<div class="empty">조회할 수 없는 코드입니다.</div>';
        showScreen('publicScreen');
        return;
      }
      try { item = await hydrateItemStorageAccessUrlsV523(item); } catch (e) { console.warn('QR 상세 서류주소 준비 실패:', e); }
      currentDetailLink = item.qrLink;
      if (isServiceShareBlocked(item)) {
        document.getElementById('publicBox').innerHTML = renderServiceBlockedBox(item);
        showScreen('publicScreen');
        return;
      }
      const paused = isQrPaused(item);
      const recipientView = getRecipientViewModule();
      const publicDocs = getAttachedDisplayDocs(item);
      const docHtml = publicDocs.map((doc, index) => renderPublicDocLine(doc, item.code, index)).join('');
      document.getElementById('publicBox').innerHTML =
        '<div class="manager-received-hero"><div class="eyebrow">QR 서류 확인 화면</div><h3>' + escapeHtml(getShareItemLabel(item)) + ' 서류</h3><p>QR을 찍은 현장 담당자가 보는 화면입니다. 장비명과 장비번호를 먼저 보여줍니다.</p></div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        renderShortcutPanel(item) +
        renderPrintToolbar(item, true) +
        '<h3 style="margin-top:14px">서류 상태</h3>' + renderPrintSelectRow(item.code) + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>') +
        (recipientView.renderSponsorBox ? recipientView.renderSponsorBox() : '');
      showScreen('publicScreen');
    }


    function renderPrintToolbar(item, showSelection) {
      if (!item) return '';
      const recipientView = getRecipientViewModule();
      if (recipientView.renderDownloadToolbar) {
        return recipientView.renderDownloadToolbar(item, {
          mode:'public',
          showSelection: !!showSelection,
          deps:{ getDisplayDocs:getAttachedDisplayDocs, getDocPagesFromDoc, expandPrintablePages, escapeJs }
        });
      }
      const code = item.code || '';
      const printableCount = getAttachedDisplayDocs(item).reduce((sum, doc) => sum + expandPrintablePages([doc]).length, 0);
      const attachedPageCount = getAttachedDisplayDocs(item).reduce((sum, doc) => sum + getDocPagesFromDoc(doc).length, 0);
      return '<div class="print-toolbar download-toolbar">' +
        '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
        '<button type="button" class="okBtn" onclick="downloadAllDocsBundle(\'' + escapeJs(code) + '\')">전체 서류 다운로드</button>' +
        '<button type="button" class="primary" onclick="printAllDocs(\'' + escapeJs(code) + '\')">전체 서류 인쇄</button>' +
        (showSelection ? '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' : '') +
        (showSelection ? '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' : '') +
        (showSelection ? '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + escapeJs(code) + '\')">선택 다운로드</button>' : '<button type="button" class="okBtn" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 다운로드</button>') +
        (showSelection ? '<button type="button" class="primary" onclick="printSelectedDocs(\'' + escapeJs(code) + '\')">선택 인쇄</button>' : '<button type="button" class="primary" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 인쇄</button>') +
      '</div>';
    }

    function renderPrintSelectRow(code) {
      return '';
    }

    function selectAllPrintDocs(checked) {
      document.querySelectorAll('[data-print-doc-check]').forEach(input => {
        if (!input.disabled) input.checked = !!checked;
      });
    }

    function toggleSinglePrintCheck(key) {
      const input = document.querySelector('[data-print-doc-check][value="' + cssEscapeValue(key) + '"]');
      if (input && !input.disabled) input.checked = !input.checked;
    }

    function getSelectedPrintKeys() {
      return Array.from(document.querySelectorAll('[data-print-doc-check]:checked')).map(input => input.value);
    }

    function getSelectedPrintDocKeys() {
      return getSelectedPrintKeys();
    }

    function openPublicDocPreview(code, key) {
      const item = getRuntimeItemByCode(code);
      const doc = item ? getAttachedDisplayDocs(item).find(d => d.key === key) : null;
      if (!doc || !doc.fileName) { alert('미첨부 서류입니다.'); return; }
      const pages = getDocPagesFromDoc(doc);
      const firstPreview = pages.find(page => page.previewDataUrl);
      if (firstPreview) { openPreviewModal(firstPreview.previewDataUrl); return; }
      if (doc.previewDataUrl) { openPreviewModal(doc.previewDataUrl); return; }
      alert('현재 베타 저장본에는 크게 볼 이미지가 없습니다.\nPDF 원본보기/서버 파일보기는 다음 서버 저장 단계에서 붙입니다.\n\n파일명: ' + (doc.fileName || ''));
    }

    function printAllDocs(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const docs = getAttachedDisplayDocs(item);
      printDocs(item, docs);
    }

    function printSelectedDocs(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const keys = getSelectedPrintKeys();
      if (!keys.length) { alert('인쇄할 서류를 체크해주세요.'); return; }
      const docs = getDocsByKeys(item, keys);
      printDocs(item, docs);
    }

    function printSingleDoc(code, key) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const docs = getDocsByKeys(item, [key]);
      printDocs(item, docs);
    }

    function printDocs(item, docs) {
      const out = getDocumentOutputModule();
      if (out.printDocs) return out.printDocs(item, docs, getDocumentOutputDeps());
      alert('문서 인쇄 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }


    function expandPrintablePages(docs) {
      const out = getDocumentOutputModule();
      if (out.expandPrintablePages) return out.expandPrintablePages(docs, getDocumentOutputDeps());
      return [];
    }


    function expandBlockedPages(docs) {
      const out = getDocumentOutputModule();
      if (out.expandBlockedPages) return out.expandBlockedPages(docs, getDocumentOutputDeps());
      return [];
    }


    function buildPrintHtml(item, pages, blockedPages) {
      const out = getDocumentOutputModule();
      if (out.buildPrintHtml) return out.buildPrintHtml(item, pages, blockedPages, getDocumentOutputDeps());
      return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>SitePass</title></head><body>문서 인쇄 기능 파일을 불러오지 못했습니다.</body></html>';
    }


    function renderPlainExtra(doc) {
      const out = getDocumentOutputModule();
      if (out.renderPlainExtra) return out.renderPlainExtra(doc, getDocumentOutputDeps());
      return '';
    }

