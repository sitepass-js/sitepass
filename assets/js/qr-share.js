// SitePass v23.7.676-72-e3-server-signature-consumption - 서버 발급 공유서명 소비 고정
// 이 파일에는 QR 링크 생성, 담당자 공유링크 서명, Supabase 공유링크 저장/조회 보조 기능을 둡니다.
(function(){
  'use strict';

  const PUBLIC_SHARE_TABLE = 'sitepass_public_shares';
  const DAY_MS = 24 * 60 * 60 * 1000;
  // v23.7.350: 테스트기간 담당자 공유 링크는 1일만 유효하게 발급합니다.
  const MANAGER_SHARE_DAYS = 1;


  // v23.7.676 / 72-E3:
  // public share capability signature는 서버(v2) 발급값만 실제 링크에 사용합니다.
  // 메모리에는 현재 페이지에서 서버가 방금 발급한 값만 보관하며 localStorage에는 기록하지 않습니다.
  const serverIssuedShareMemoryV676 = new Map();

  function isServerIssuedShareSigV676(value){
    return /^[0-9a-f]{64}$/.test(String(value || '').trim());
  }

  function normalizeServerIssuedShareV676(share){
    share = share && typeof share === 'object' ? share : {};
    const code = String(share.share_code || share.code || '').trim();
    const sig = String(share.share_sig || '').trim();
    const expiresAtText = String(share.expires_at || share.expiresAt || '').trim();
    const expiresAtMs = expiresAtText ? new Date(expiresAtText).getTime() : 0;
    if (!code || !isServerIssuedShareSigV676(sig)) return null;
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs()) return null;
    return {
      code:code,
      share_code:code,
      share_sig:sig,
      expires_at:new Date(expiresAtMs).toISOString(),
      expiresAtMs:expiresAtMs
    };
  }

  function rememberServerIssuedSharesV676(shares, items){
    const issued = (Array.isArray(shares) ? shares : [])
      .map(normalizeServerIssuedShareV676)
      .filter(Boolean);

    const byCode = new Map();
    issued.forEach(function(share){
      byCode.set(share.code, share);
      serverIssuedShareMemoryV676.set(share.code, share);
    });

    const safeItems = (items || []).filter(Boolean);
    safeItems.forEach(function(item){
      const code = ensureManagerShareCodeForItem(item);
      const share = byCode.get(code);
      if (!share) return;
      item.share_sig = share.share_sig;
      item.publicShareSig = share.share_sig;
      item.managerShareSig = share.share_sig;
      item.managerExpireAt = share.expires_at;
      item.manager_expire_at = share.expires_at;
      item.publicShareSavedAt = new Date().toISOString();
      item.serverSignatureVersion = 'server-random-32byte-hex';
    });

    return {
      ok: issued.length === safeItems.length && issued.length > 0,
      shares: issued,
      items: safeItems
    };
  }

  function getServerIssuedShareSignatureV676(code, expireAt){
    const key = String(code || '').trim();
    if (!key) return '';
    const share = serverIssuedShareMemoryV676.get(key);
    if (!share || !isServerIssuedShareSigV676(share.share_sig)) return '';
    if (!share.expiresAtMs || share.expiresAtMs <= nowMs()) {
      serverIssuedShareMemoryV676.delete(key);
      return '';
    }
    const requestedExpireAt = Number(expireAt || 0);
    if (Number.isFinite(requestedExpireAt) && requestedExpireAt > 0) {
      if (Math.abs(requestedExpireAt - share.expiresAtMs) > 2000) return '';
    }
    return share.share_sig;
  }

  function getServerIssuedShareV676(code){
    const key = String(code || '').trim();
    const share = key ? serverIssuedShareMemoryV676.get(key) : null;
    if (!share || !isServerIssuedShareSigV676(share.share_sig)) return null;
    if (!share.expiresAtMs || share.expiresAtMs <= nowMs()) return null;
    return { ...share };
  }

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
    const equipmentCodeBeforeShare = String(item.originalEquipmentCode || item.equipmentCode || item.equipment_code || item.code || '').trim();
    let code = getManagerShareCodeCandidate(item);
    if (!code) code = makeFallbackManagerShareCode();
    if (equipmentCodeBeforeShare && equipmentCodeBeforeShare !== code) item.originalEquipmentCode = equipmentCodeBeforeShare;
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
    const url = new URL('./share.html', window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('manager', String(code || ''));
    const linkSig = typeof getSignature === 'function' ? String(getSignature(code, expireAt) || '') : '';
    if (linkSig) url.searchParams.set('sig', linkSig);
    url.searchParams.set('v', '521');
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
    const equipmentCodeBeforeShare = String(copy.originalEquipmentCode || copy.equipmentCode || copy.equipment_code || item?.code || '').trim();
    if (equipmentCodeBeforeShare && equipmentCodeBeforeShare !== code) copy.originalEquipmentCode = equipmentCodeBeforeShare;
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

  function isManagerShareRpcMissingV2(error){
    const code = String(error && error.code || '');
    const message = String(error && (error.message || error.details || error.hint) || '').toLowerCase();
    return code === 'PGRST202' ||
      message.includes('could not find the function') ||
      message.includes('schema cache') ||
      message.includes('sitepass_upsert_public_shares_v2');
  }

  async function saveManagerShareItemsByRpc(client, rows){
    if (!client || typeof client.rpc !== 'function') {
      return { ok:false, skipped:true, message:'Supabase RPC 연결 객체가 없습니다.' };
    }

    const { data, error } = await client.rpc('sitepass_upsert_public_shares_v2', {
      p_rows: rows
    });

    if (error) {
      const message = formatManagerShareSupabaseErrorV496(error, 'Supabase 공유링크 v2 저장 오류');
      if (isManagerShareRpcMissingV2(error)) {
        return {
          ok:false,
          sqlRequired:true,
          message:message + ' / sitepass_upsert_public_shares_v2 서버 공유서명 RPC를 확인해주세요.'
        };
      }
      return { ok:false, message };
    }

    const result = normalizeRpcPublicShareResult(data) || {};
    if (result.ok === false) {
      return { ok:false, message:result.message || result.error || '공유링크 v2 저장 실패' };
    }

    const shares = Array.isArray(result.shares) ? result.shares : [];
    if (!shares.length || shares.length !== rows.length) {
      return {
        ok:false,
        message:'SERVER_SIGNATURE_RESPONSE_REQUIRED',
        serverSignatureMissing:true
      };
    }

    if (shares.some(function(share){
      return !share || !isServerIssuedShareSigV676(share.share_sig);
    })) {
      return {
        ok:false,
        message:'SERVER_SIGNATURE_FORMAT_INVALID',
        serverSignatureInvalid:true
      };
    }

    return {
      ok:true,
      saved:Number(result.saved || rows.length || 0),
      rpc:true,
      version:'v2',
      shares:shares,
      signatureVersion:String(result.signatureVersion || 'server-random-32byte-hex'),
      signatureLength:Number(result.signatureLength || 64)
    };
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

      // v23.7.676 / 72-E3:
      // caller share_sig는 더 이상 만들거나 보내지 않습니다.
      // v2가 32-byte random signature를 발급하고 응답 shares[]로 돌려줍니다.
      const rows = safeItems.map(item => {
        const code = ensureManagerShareCodeForItem(item);
        const expireAt = (deps && typeof deps.getExpireAt === 'function')
          ? deps.getExpireAt(item)
          : getSevenDaysFromNowMs();
        const shareItem = cloneItemForServer(item, expireAt, '', deps || {});
        const label = (deps && typeof deps.getLabel === 'function')
          ? deps.getLabel(item)
          : String(item.equipmentName || code || 'SitePass 서류');

        return {
          code: String(code || ''),
          share_code: String(code || ''),
          expires_at: new Date(expireAt).toISOString(),
          item_data: shareItem,
          payload: shareItem,
          share_title: label,
          equipment_no: String(item.equipmentNo || ''),
          equipment_name: String(item.equipmentName || ''),
          owner_login_id: String(memberOwnerLoginIdV501 || item.ownerSignupId || item.ownerProviderId || ''),
          updated_at: nowIso
        };
      }).filter(row => row.share_code);

      if (!rows.length) {
        return { ok:false, message:'저장할 담당자 링크 정보가 없습니다.' };
      }

      if (typeof client.rpc !== 'function') {
        return {
          ok:false,
          message:'SERVER_SIGNATURE_RPC_REQUIRED',
          serverSignatureRpcRequired:true
        };
      }

      let rpcSaved = await saveManagerShareItemsByRpc(client, rows);

      if (!rpcSaved.ok &&
          /timeout|timed out|statement|canceling|network|fetch/i.test(String(rpcSaved.message || ''))) {
        await new Promise(function(resolve){ setTimeout(resolve, 350); });
        rpcSaved = await saveManagerShareItemsByRpc(client, rows);
      }

      if (!rpcSaved.ok) return rpcSaved;

      const applied = rememberServerIssuedSharesV676(rpcSaved.shares, safeItems);
      if (!applied.ok) {
        return {
          ok:false,
          message:'SERVER_SIGNATURE_APPLY_FAILED',
          serverSignatureApplyFailed:true
        };
      }

      return {
        ...rpcSaved,
        shares:applied.shares,
        items:applied.items,
        serverSignatureApplied:true
      };
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
          const item = result.item_data || result.item || null;
          if (!item || !item.code) return { ok:false, message:'공유 데이터가 비어 있습니다.' };
          const cached = (deps && typeof deps.upsertLocalCache === 'function') ? deps.upsertLocalCache(item) : item;
          return { ok:true, item:cached || item, expiresAt, rpc:true };
        }
        if (!/not found|Could not find|schema cache|function/i.test(String(rpc.error.message || ''))) {
          return { ok:false, message:rpc.error.message || 'Supabase 공유링크 RPC 조회 오류' };
        }
      }
      let query = client
        .from(PUBLIC_SHARE_TABLE)
        .select('share_code, share_sig, expires_at, item_data')
        .eq('share_code', String(code || ''));
      if (sig) query = query.eq('share_sig', String(sig || ''));
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) return { ok:false, message:error.message || 'Supabase 조회 오류' };
      if (!data) return { ok:false, notFound:true, message:'공유 링크를 찾을 수 없습니다.' };
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
      if (expiresAt && nowMs() > expiresAt) return { ok:false, expired:true, expiresAt };
      const item = data.item_data || null;
      if (!item || !item.code) return { ok:false, message:'공유 데이터가 비어 있습니다.' };
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
    isServerIssuedShareSigV676,
    getServerIssuedShareSignatureV676,
    getServerIssuedShareV676,
    saveManagerShareItemsToSupabase,
    loadManagerShareItemFromSupabase
  };
})();
