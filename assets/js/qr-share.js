// SitePass v23.7.264 split step 11 - QR/7일 담당자 공유링크 공통 파일
// 이 파일에는 QR 링크 생성, 담당자 공유링크 서명, Supabase 공유링크 저장/조회 보조 기능을 둡니다.
(function(){
  'use strict';

  const PUBLIC_SHARE_TABLE = 'sitepass_public_shares';
  const DAY_MS = 24 * 60 * 60 * 1000;

  function nowMs(){ return Date.now(); }

  function getSevenDaysFromNowMs(){
    return nowMs() + (7 * DAY_MS);
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

  function makeManagerLinkSignatureRaw(code, expireAt, token){
    const seed = String(code || '') + '|' + String(expireAt || '') + '|' + String(token || '');
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8);
  }

  function makeManagerLink(code, expireAt, getSignature){
    const baseUrl = window.location.href.split('#')[0];
    const exp = expireAt || getSevenDaysFromNowMs();
    const sig = typeof getSignature === 'function' ? getSignature(code, exp) : '';
    return baseUrl + '#manager=' + encodeURIComponent(code || '') + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(sig || '');
  }

  function parseManagerHash(hash){
    const value = String(hash || window.location.hash || '');
    if (!value.startsWith('#manager=')) return { code:'', exp:undefined, sig:'' };
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

  function getClient(deps){
    if (deps && typeof deps.getClient === 'function') return deps.getClient();
    if (window.SitePassSupabaseApi && typeof window.SitePassSupabaseApi.getClient === 'function') return window.SitePassSupabaseApi.getClient();
    return window.sitepassSupabase || null;
  }

  function cloneItemForServer(item, expireAt, sig, deps){
    if (deps && typeof deps.cloneItem === 'function') return deps.cloneItem(item, expireAt, sig);
    const copy = JSON.parse(JSON.stringify(item || {}));
    copy.managerExpireAt = new Date(Number(expireAt || getSevenDaysFromNowMs())).toISOString();
    copy.managerShareSig = sig || '';
    copy.publicShareSavedAt = new Date().toISOString();
    return copy;
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
      const rows = safeItems.map(item => {
        const expireAt = (deps && typeof deps.getExpireAt === 'function') ? deps.getExpireAt(item) : getSevenDaysFromNowMs();
        const sig = (deps && typeof deps.getSignature === 'function') ? deps.getSignature(item.code || '', expireAt) : '';
        const shareItem = cloneItemForServer(item, expireAt, sig, deps || {});
        const label = (deps && typeof deps.getLabel === 'function') ? deps.getLabel(item) : String(item.equipmentName || item.code || 'SitePass 서류');
        return {
          share_code: String(item.code || ''),
          share_sig: String(sig || ''),
          expires_at: new Date(expireAt).toISOString(),
          item_data: shareItem,
          share_title: label,
          equipment_no: String(item.equipmentNo || ''),
          equipment_name: String(item.equipmentName || ''),
          owner_login_id: String(item.ownerSignupId || item.ownerProviderId || ''),
          updated_at: nowIso
        };
      }).filter(row => row.share_code && row.share_sig);
      if (!rows.length) return { ok:false, message:'저장할 담당자 링크 정보가 없습니다.' };
      const { error } = await client.from(PUBLIC_SHARE_TABLE).upsert(rows, { onConflict:'share_code' });
      if (error) return { ok:false, message:error.message || 'Supabase 저장 오류' };
      return { ok:true, saved:rows.length };
    } catch (e) {
      return { ok:false, message:e && e.message ? e.message : String(e) };
    }
  }

  async function loadManagerShareItemFromSupabase(code, sig, deps){
    const client = getClient(deps || {});
    if (!client || typeof client.from !== 'function' || !code || !sig) {
      return { ok:false, message:'Supabase 연결 또는 링크 서명이 없습니다.' };
    }
    try {
      const { data, error } = await client
        .from(PUBLIC_SHARE_TABLE)
        .select('share_code, share_sig, expires_at, item_data')
        .eq('share_code', String(code || ''))
        .eq('share_sig', String(sig || ''))
        .limit(1)
        .maybeSingle();
      if (error) return { ok:false, message:error.message || 'Supabase 조회 오류' };
      if (!data) return { ok:false, notFound:true, message:'공유 링크를 찾을 수 없습니다.' };
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
      if (expiresAt && nowMs() > expiresAt) return { ok:false, expired:true, expiresAt };
      const item = data.item_data || null;
      if (!item || !item.code) return { ok:false, message:'공유 데이터가 비어 있습니다.' };
      const cached = (deps && typeof deps.upsertLocalCache === 'function') ? deps.upsertLocalCache(item) : item;
      return { ok:true, item:cached || item, expiresAt };
    } catch (e) {
      return { ok:false, message:e && e.message ? e.message : String(e) };
    }
  }

  window.SitePassQrShare = {
    PUBLIC_SHARE_TABLE,
    getSevenDaysFromNowMs,
    randomCodeBlock,
    makeQrLink,
    makeQrUrl,
    normalizePhoneForShare,
    makeManagerShareToken,
    makeManagerLinkSignatureRaw,
    makeManagerLink,
    parseManagerHash,
    saveManagerShareItemsToSupabase,
    loadManagerShareItemFromSupabase
  };
})();
