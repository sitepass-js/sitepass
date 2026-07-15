// SitePass v23.7.504 - 담당자 공유 payload 저장·조회 복원 강화
// 이 파일에는 QR 링크 생성, 담당자 공유링크 서명, Supabase 공유링크 저장/조회 보조 기능을 둡니다.
(function(){
  'use strict';

  const PUBLIC_SHARE_TABLE = 'sitepass_public_shares';
  const DAY_MS = 24 * 60 * 60 * 1000;
  // v23.7.350: 테스트기간 담당자 공유 링크는 1일만 유효하게 발급합니다.
  const MANAGER_SHARE_DAYS = 1;

  function nowMs(){ return Date.now(); }

  function getManagerShareDays(){
    return MANAGER_SHARE_DAYS;
  }

  function getManagerShareExpireFromNowMs(){
    return nowMs() + (MANAGER_SHARE_DAYS * DAY_MS);
  }

  // 기존 함수명 호환용: 실제 테스트기간 값은 1일입니다.
  function getSevenDaysFromNowMs(){
    return getManagerShareExpireFromNowMs();
  }

  function randomCodeBlock(length){
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const size = Math.max(1, Number(length || 4));
    const values = new Uint32Array(size);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(values);
    } else {
      for (let i = 0; i < size; i++) values[i] = Math.floor(Math.random() * 4294967295);
    }
    let out = '';
    for (let i = 0; i < size; i++) out += chars[values[i] % chars.length];
    return out;
  }

  function makeQrLink(code){
    const baseUrl = window.location.href.split('#')[0];
    return baseUrl + '#qr=' + encodeURIComponent(code || '');
  }

  function makeQrUrl(link, size){
    const qrSize = Number(size || 180);
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' + qrSize + 'x' + qrSize + '&data=' + encodeURIComponent(link || '');
  }

  function normalizePhoneForShare(phone){
    return String(phone || '').replace(/[^0-9+]/g, '');
  }

  function makeManagerShareToken(){
    return 'MST-' + nowMs().toString(36).toUpperCase() + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4);
  }

  function getManagerShareCodeCandidate(item){
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

  function makeFallbackManagerShareCode(){
    return 'MSH-' + nowMs().toString(36).toUpperCase() + '-' + randomCodeBlock(6);
  }

  function ensureManagerShareCodeForItem(item){
    if (!item) return '';
    let code = getManagerShareCodeCandidate(item);
    if (!code) code = makeFallbackManagerShareCode();
    item.code = code;
    item.publicShareCode = code;
    item.managerShareCode = code;
    return code;
  }

  function makeManagerLinkSignatureRaw(code, expireAt, token){
    const seed = String(code || '') + '|' + String(expireAt || '') + '|' + String(token || '');
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8);
  }

  function getCleanShareBaseUrl(){
    return window.location.origin + window.location.pathname;
  }

  function makeManagerLink(code, expireAt, getSignature){
    const baseUrl = getCleanShareBaseUrl();
    // v23.7.502: 카카오톡·문자·메일·PWA에서 #fragment가 잘리거나
    // 자동업데이트 중 사라지지 않도록 담당자 코드를 query 파라미터로 고정합니다.
    // 만료일과 검증은 Supabase sitepass_public_shares의 expires_at 기준입니다.
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('manager', String(code || ''));
    return url.toString();
  }

  function parseManagerHash(hash){
    const supplied = String(hash || '');
    let value = supplied || window.location.hash || window.location.search || '';
    if (value.includes('?manager=')) value = value.slice(value.indexOf('?manager='));
    if (value.includes('&manager=') && !value.startsWith('?manager=')) value = '?' + value.slice(value.indexOf('&manager=') + 1);
    if (value.startsWith('#manager=')) {
      const raw = value.replace('#manager=', '');
      const parts = raw.split('&');
      const code = decodeURIComponent(parts.shift() || '');
      let exp;
      let sig = '';
      parts.forEach(part => {
        const pair = part.split('=');
        const key = decodeURIComponent(pair[0] || '');
        const val = decodeURIComponent(pair.slice(1).join('=') || '');
        if (key === 'exp') exp = Number(val);
        if (key === 'sig') sig = val;
      });
      return { code, exp, sig };
    }
    if (value.startsWith('?') || value.includes('manager=')) {
      const params = new URLSearchParams(value.startsWith('?') ? value.slice(1) : value);
      return {
        code: params.get('manager') || params.get('m') || '',
        exp: params.get('exp') ? Number(params.get('exp')) : undefined,
        sig: params.get('sig') || ''
      };
    }
    return { code:'', exp:undefined, sig:'' };
  }

  function getClient(deps){
    if (deps && typeof deps.getClient === 'function') return deps.getClient();
    if (window.SitePassSupabaseApi && typeof window.SitePassSupabaseApi.getClient === 'function') return window.SitePassSupabaseApi.getClient();
    return window.sitepassSupabase || null;
  }

  function cloneItemForServer(item, expireAt, sig, deps){
    const code = ensureManagerShareCodeForItem(item);
    if (deps && typeof deps.cloneItem === 'function') {
      const cloned = deps.cloneItem(item, expireAt, sig);
      if (cloned) {
        cloned.code = code;
        cloned.publicShareCode = code;
        cloned.managerShareCode = code;
      }
      return cloned;
    }
    const copy = JSON.parse(JSON.stringify(item || {}));
    copy.code = code;
    copy.publicShareCode = code;
    copy.managerShareCode = code;
    copy.managerExpireAt = new Date(Number(expireAt || getSevenDaysFromNowMs())).toISOString();
    copy.managerShareSig = sig || '';
    copy.publicShareSavedAt = new Date().toISOString();
    return copy;
  }

  function normalizeRpcPublicShareResult(data){
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
  }

  // v23.7.504: 과거 SQL/RPC와 현재 SQL이 item_data, payload, item, item_json 등
  // 서로 다른 키로 값을 돌려줘도 실제 장비/서류 객체를 하나로 복원합니다.
  function normalizeLoadedManagerShareItemV503(value, fallbackCode){
    const seen = new WeakSet();
    const candidates = [];
    function collect(node, depth){
      if (!node || typeof node !== 'object' || depth > 4 || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) {
        node.forEach(function(entry){ collect(entry, depth + 1); });
        return;
      }
      candidates.push(node);
      ['item_data','payload','item_json','item','data','share_item','shareItem'].forEach(function(key){
        if (node[key] && typeof node[key] === 'object') collect(node[key], depth + 1);
      });
    }
    collect(value, 0);
    if (!candidates.length) return null;

    const merged = {};
    const docs = {};
    const documents = [];
    candidates.slice().reverse().forEach(function(candidate){
      Object.keys(candidate).forEach(function(key){
        if (!['item_data','payload','item_json','item','data','share_item','shareItem','docs','documents'].includes(key)) {
          if (candidate[key] !== undefined && candidate[key] !== null && candidate[key] !== '') merged[key] = candidate[key];
        }
      });
      if (candidate.docs && typeof candidate.docs === 'object' && !Array.isArray(candidate.docs)) {
        Object.keys(candidate.docs).forEach(function(key){
          const doc = candidate.docs[key];
          if (!doc || typeof doc !== 'object') return;
          docs[key] = Object.assign({}, docs[key] || {}, doc, { key:String(doc.key || key) });
        });
      }
      if (Array.isArray(candidate.documents)) documents.push.apply(documents, candidate.documents);
    });
    documents.forEach(function(doc, index){
      if (!doc || typeof doc !== 'object') return;
      const key = String(doc.key || doc.docKey || doc.doc_key || doc.type || doc.kind || ('legacyDocument' + (index + 1))).trim();
      if (!key) return;
      docs[key] = Object.assign({}, docs[key] || {}, doc, { key:key });
    });
    Object.keys(docs).forEach(function(key){
      const doc = docs[key];
      doc.key = String(doc.key || key);
      doc.pages = Array.isArray(doc.pages) ? doc.pages.filter(Boolean) : [];
      if (!doc.fileName && doc.pages.length) doc.fileName = String(doc.pages[0].fileName || doc.title || '첨부파일');
      if (!doc.pageCount && doc.pages.length) doc.pageCount = doc.pages.length;
      docs[key] = doc;
    });
    merged.docs = docs;
    const code = String(fallbackCode || merged.share_code || merged.shareCode || merged.publicShareCode || merged.managerShareCode || merged.code || '').trim();
    if (code) {
      merged.code = code;
      merged.share_code = code;
      merged.publicShareCode = code;
      merged.managerShareCode = code;
    }
    return merged;
  }

  function hasLoadedManagerShareItemV503(item){
    if (!item || typeof item !== 'object') return false;
    return !!String(item.code || item.share_code || '').trim() && (
      Object.keys(item.docs || {}).length > 0 ||
      !!String(item.equipmentNo || item.equipment_no || item.equipmentName || item.equipment_name || '').trim()
    );
  }

  function formatManagerShareSupabaseErrorV496(error, fallback){
    if (!error) return String(fallback || 'Supabase 저장 오류');
    const parts = [error.code, error.message, error.details, error.hint]
      .map(function(value){ return String(value || '').trim(); })
      .filter(Boolean);
    return parts.length ? Array.from(new Set(parts)).join(' / ') : String(fallback || 'Supabase 저장 오류');
  }

  function getManagerShareMemberPayloadV501(deps){
    let member = null;
    try {
      if (deps && typeof deps.getMember === 'function') member = deps.getMember();
    } catch (e) { member = null; }
    member = member && typeof member === 'object' ? member : {};
    return {
      id: String(member.id || member.memberId || member.userId || ''),
      signup_id: String(member.signupId || member.loginId || member.signup_id || member.login_id || member.supabaseLoginId || ''),
      provider_id: String(member.providerId || member.provider_id || ''),
      phone: String(member.phone || member.phoneNumber || member.signupIdentityPhone || member.verifiedPhone || '').replace(/[^0-9]/g, ''),
      name: String(member.name || member.fullName || member.signupIdentityName || member.verifiedName || '')
    };
  }

  function isManagerShareRpcMissingV501(error){
    const code = String(error && error.code || '');
    const message = String(error && (error.message || error.details || error.hint) || '').toLowerCase();
    return code === 'PGRST202' || message.includes('could not find the function') || message.includes('schema cache') || message.includes('sitepass_upsert_public_shares_v501');
  }

  async function saveManagerShareItemsByRpc(client, rows, deps){
    if (!client || typeof client.rpc !== 'function') return { ok:false, skipped:true, message:'Supabase RPC 연결 객체가 없습니다.' };
    const member = getManagerShareMemberPayloadV501(deps || {});
    if (!member.signup_id && !member.provider_id && !member.phone) {
      return { ok:false, message:'SitePass 로그인 회원정보를 확인하지 못했습니다. 로그아웃 후 다시 로그인해주세요.' };
    }
    const { data, error } = await client.rpc('sitepass_upsert_public_shares_v501', {
      p_rows: rows,
      p_member: member
    });
    if (error) {
      const message = formatManagerShareSupabaseErrorV496(error, 'Supabase 공유링크 RPC 저장 오류');
      if (isManagerShareRpcMissingV501(error)) {
        return { ok:false, sqlRequired:true, message:message + ' / v501 담당자 공유링크 SQL을 먼저 실행해주세요.' };
      }
      return { ok:false, message };
    }
    const result = normalizeRpcPublicShareResult(data) || {};
    if (result.ok === false) return { ok:false, message:result.message || result.error || '공유링크 RPC 저장 실패' };
    return { ok:true, saved:Number(result.saved || rows.length || 0), rpc:true, version:'v501' };
  }

  async function saveManagerShareItemsToSupabase(items, deps){
    const client = getClient(deps || {});
    if (!client || typeof client.from !== 'function') {
      return { ok:false, message:'Supabase 연결 객체가 없습니다.' };
    }
    const safeItems = (items || []).filter(Boolean);
    if (!safeItems.length) return { ok:true, saved:0 };
    try {
      const nowIso = new Date().toISOString();
      const memberPayloadV501 = getManagerShareMemberPayloadV501(deps || {});
      const memberOwnerLoginIdV501 = String(memberPayloadV501.signup_id || memberPayloadV501.provider_id || '').trim();
      const rows = safeItems.map(item => {
        const code = ensureManagerShareCodeForItem(item);
        const expireAt = (deps && typeof deps.getExpireAt === 'function') ? deps.getExpireAt(item) : getSevenDaysFromNowMs();
        const sig = (deps && typeof deps.getSignature === 'function') ? deps.getSignature(code, expireAt) : '';
        const shareItem = cloneItemForServer(item, expireAt, sig, deps || {});
        const label = (deps && typeof deps.getLabel === 'function') ? deps.getLabel(item) : String(item.equipmentName || code || 'SitePass 서류');
        return {
          code: String(code || ''),
          share_code: String(code || ''),
          share_sig: String(sig || ''),
          expires_at: new Date(expireAt).toISOString(),
          item_data: shareItem,
          payload: shareItem,
          share_title: label,
          equipment_no: String(item.equipmentNo || ''),
          equipment_name: String(item.equipmentName || ''),
          owner_login_id: String(memberOwnerLoginIdV501 || item.ownerSignupId || item.ownerProviderId || ''),
          updated_at: nowIso
        };
      }).filter(row => row.share_code && row.share_sig);
      if (!rows.length) return { ok:false, message:'저장할 담당자 링크 정보가 없습니다.' };
      if (typeof client.rpc === 'function') {
        let rpcSaved = await saveManagerShareItemsByRpc(client, rows, deps || {});
        if (rpcSaved.ok) return rpcSaved;
        if (rpcSaved.sqlRequired) return rpcSaved;
        // v23.7.496: 휴대폰 네트워크/DB 순간 지연은 가벼운 URL 전용 payload로 한 번만 재시도합니다.
        if (/timeout|timed out|statement|canceling|network|fetch/i.test(String(rpcSaved.message || ''))) {
          await new Promise(function(resolve){ setTimeout(resolve, 350); });
          rpcSaved = await saveManagerShareItemsByRpc(client, rows, deps || {});
          if (rpcSaved.ok) return rpcSaved;
        }
        // RPC가 아직 적용되지 않은 경우에만 기존 직접 upsert를 fallback으로 시도합니다.
        if (!/not found|Could not find|schema cache|function/i.test(String(rpcSaved.message || ''))) {
          return rpcSaved;
        }
      }
      const { error } = await client.from(PUBLIC_SHARE_TABLE).upsert(rows, { onConflict:'share_code' });
      if (error) return { ok:false, message:formatManagerShareSupabaseErrorV496(error, 'Supabase 저장 오류') };
      return { ok:true, saved:rows.length, direct:true };
    } catch (e) {
      return { ok:false, message:e && e.message ? e.message : String(e) };
    }
  }

  async function loadManagerShareItemFromSupabase(code, sig, deps){
    const client = getClient(deps || {});
    if (!client || typeof client.from !== 'function' || !code) {
      return { ok:false, message:'Supabase 연결 또는 링크 코드가 없습니다.' };
    }
    try {
      if (typeof client.rpc === 'function') {
        const rpc = await client.rpc('sitepass_get_public_share_item', {
          p_share_code: String(code || ''),
          p_share_sig: String(sig || '')
        });
        if (!rpc.error) {
          const result = normalizeRpcPublicShareResult(rpc.data) || {};
          if (result.ok === false || result.notFound || result.expired) {
            return {
              ok:false,
              notFound:!!result.notFound,
              expired:!!result.expired,
              expiresAt: result.expiresAt ? new Date(result.expiresAt).getTime() : (result.expires_at ? new Date(result.expires_at).getTime() : 0),
              message: result.message || result.error || '공유 링크를 찾을 수 없습니다.'
            };
          }
          const expiresAt = result.expiresAt ? new Date(result.expiresAt).getTime() : (result.expires_at ? new Date(result.expires_at).getTime() : 0);
          const item = normalizeLoadedManagerShareItemV503(result, code);
          if (hasLoadedManagerShareItemV503(item)) {
            const cached = (deps && typeof deps.upsertLocalCache === 'function') ? deps.upsertLocalCache(item) : item;
            return { ok:true, item:cached || item, expiresAt, rpc:true };
          }
          // RPC가 빈 item_data만 돌려주는 구버전이면 아래 직접 SELECT로 한 번 더 확인합니다.
        }
        if (rpc.error && !/not found|Could not find|schema cache|function/i.test(String(rpc.error.message || ''))) {
          return { ok:false, message:rpc.error.message || 'Supabase 공유링크 RPC 조회 오류' };
        }
      }
      let query = client
        .from(PUBLIC_SHARE_TABLE)
        .select('share_code, share_sig, expires_at, item_data, payload')
        .eq('share_code', String(code || ''));
      if (sig) query = query.eq('share_sig', String(sig || ''));
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) return { ok:false, message:error.message || 'Supabase 조회 오류' };
      if (!data) return { ok:false, notFound:true, message:'공유 링크를 찾을 수 없습니다.' };
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
      if (expiresAt && nowMs() > expiresAt) return { ok:false, expired:true, expiresAt };
      const item = normalizeLoadedManagerShareItemV503(data, code);
      if (!hasLoadedManagerShareItemV503(item)) return { ok:false, message:'공유 데이터에 장비·서류 정보가 없습니다.' };
      const cached = (deps && typeof deps.upsertLocalCache === 'function') ? deps.upsertLocalCache(item) : item;
      return { ok:true, item:cached || item, expiresAt, direct:true };
    } catch (e) {
      return { ok:false, message:e && e.message ? e.message : String(e) };
    }
  }

  window.SitePassQrShare = {
    PUBLIC_SHARE_TABLE,
    getManagerShareDays,
    getManagerShareExpireFromNowMs,
    getSevenDaysFromNowMs,
    randomCodeBlock,
    makeQrLink,
    makeQrUrl,
    normalizePhoneForShare,
    makeManagerShareToken,
    makeManagerLinkSignatureRaw,
    makeManagerLink,
    parseManagerHash,
    normalizeLoadedManagerShareItemV503,
    saveManagerShareItemsToSupabase,
    loadManagerShareItemFromSupabase
  };
})();
