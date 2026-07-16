// SitePass v23.7.261 split step 9 - Supabase 서버통신 공통 파일
// 이 파일에는 Supabase client 확인, RPC 호출, SELECT/UPSERT 같은 서버 통신 공통 기능을 둡니다.
(function(){
  'use strict';

  function getClient(){
    return window.sitepassSupabase || null;
  }

  function hasClient(){
    return !!getClient();
  }

  function hasRpc(){
    const client = getClient();
    return !!(client && typeof client.rpc === 'function');
  }

  async function rpc(name, params){
    const client = getClient();
    if (!client || typeof client.rpc !== 'function') {
      return { data: null, error: { message: 'Supabase RPC 연결 없음' } };
    }
    try {
      return await client.rpc(String(name || ''), params || {});
    } catch (e) {
      return { data: null, error: e };
    }
  }

  async function select(table, columns, buildQuery){
    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      return { data: null, error: { message: 'Supabase SELECT 연결 없음' } };
    }
    try {
      let query = client.from(String(table || '')).select(columns || '*');
      if (typeof buildQuery === 'function') query = buildQuery(query);
      return await query;
    } catch (e) {
      return { data: null, error: e };
    }
  }

  async function upsert(table, row, options){
    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      return { data: null, error: { message: 'Supabase UPSERT 연결 없음' } };
    }
    try {
      return await client.from(String(table || '')).upsert(row, options || {});
    } catch (e) {
      return { data: null, error: e };
    }
  }

  async function update(table, values, buildQuery){
    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      return { data: null, error: { message: 'Supabase UPDATE 연결 없음' } };
    }
    try {
      let query = client.from(String(table || '')).update(values || {});
      if (typeof buildQuery === 'function') query = buildQuery(query);
      return await query;
    } catch (e) {
      return { data: null, error: e };
    }
  }



  const storageSignedUrlCacheV523 = new Map();

  function getStorageAccessModeV523(){
    try { return String(window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.storageAccessMode || 'public').toLowerCase(); }
    catch (e) { return 'public'; }
  }

  function getStorageSignedTtlV523(value){
    const configured = Number(value || (window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.storageSignedUrlTtlSeconds) || 900);
    return Math.max(60, Math.min(3600, Number.isFinite(configured) ? configured : 900));
  }

  function normalizeStoragePathV523(path){
    return String(path || '').trim().replace(/^\/+|\/+$/g, '');
  }

  function storageReferenceFromUrlV523(value, fallbackBucket){
    const text = String(value || '').trim();
    if (!text) return { bucket:String(fallbackBucket || ''), path:'' };
    if (!/^https?:\/\//i.test(text)) return { bucket:String(fallbackBucket || ''), path:normalizeStoragePathV523(text) };
    try {
      const url = new URL(text, window.location.href);
      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/i);
      if (!match) return { bucket:String(fallbackBucket || ''), path:'' };
      return {
        bucket:decodeURIComponent(match[1] || '') || String(fallbackBucket || ''),
        path:(match[2] || '').split('/').map(function(part){ try { return decodeURIComponent(part); } catch (e) { return part; } }).join('/')
      };
    } catch (e) {
      return { bucket:String(fallbackBucket || ''), path:'' };
    }
  }

  async function storageUpload(bucket, path, blob, options){
    const client = getClient();
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return { data: null, error: { message: 'Supabase Storage 연결 없음' } };
    }
    try {
      return await client.storage.from(String(bucket || '')).upload(String(path || ''), blob, options || {});
    } catch (e) {
      return { data: null, error: e };
    }
  }

  function storagePublicUrl(bucket, path){
    const client = getClient();
    if (!client || !client.storage || typeof client.storage.from !== 'function') return '';
    const cleanBucket = String(bucket || '');
    const cleanPath = normalizeStoragePathV523(path);
    if (!cleanPath) return '';
    const cacheKey = cleanBucket + '|' + cleanPath;
    const cached = storageSignedUrlCacheV523.get(cacheKey);
    if (cached && cached.url && cached.expiresAt > Date.now() + 30000) return cached.url;
    try {
      const result = client.storage.from(cleanBucket).getPublicUrl(cleanPath);
      return (result && result.data && result.data.publicUrl) || '';
    } catch (e) {
      return '';
    }
  }

  async function storageSignedUrl(bucket, path, expiresIn, options){
    const client = getClient();
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return { data:null, error:{ message:'Supabase Storage 연결 없음' }, signedUrl:'' };
    }
    const cleanBucket = String(bucket || '').trim();
    const cleanPath = normalizeStoragePathV523(path);
    if (!cleanBucket || !cleanPath) return { data:null, error:{ message:'Storage 경로 없음' }, signedUrl:'' };
    const opts = options || {};
    const ttl = getStorageSignedTtlV523(expiresIn);
    const cacheKey = cleanBucket + '|' + cleanPath;
    const cached = storageSignedUrlCacheV523.get(cacheKey);
    if (!opts.forceRefresh && cached && cached.url && cached.expiresAt > Date.now() + 60000) {
      return { data:{ signedUrl:cached.url }, error:null, signedUrl:cached.url, cached:true, expiresAt:cached.expiresAt };
    }
    try {
      const result = await client.storage.from(cleanBucket).createSignedUrl(cleanPath, ttl, opts.transform ? { transform:opts.transform } : undefined);
      const signedUrl = String(result && result.data && (result.data.signedUrl || result.data.signedURL) || '');
      if (result && result.error) return { data:result.data || null, error:result.error, signedUrl:'' };
      if (!signedUrl) return { data:result && result.data || null, error:{ message:'기간 제한 파일주소 생성 실패' }, signedUrl:'' };
      const expiresAt = Date.now() + ttl * 1000;
      storageSignedUrlCacheV523.set(cacheKey, { url:signedUrl, expiresAt:expiresAt });
      return { data:result.data || { signedUrl:signedUrl }, error:null, signedUrl:signedUrl, expiresAt:expiresAt };
    } catch (e) {
      return { data:null, error:e, signedUrl:'' };
    }
  }

  async function storageResolveUrl(bucket, pathOrUrl, options){
    const opts = options || {};
    const raw = String(pathOrUrl || '').trim();
    if (!raw) return '';
    if (/^data:/i.test(raw) || /^blob:/i.test(raw)) return raw;
    if (/\/storage\/v1\/object\/sign\//i.test(raw) && /[?&]token=/i.test(raw) && !opts.forceRefresh) return raw;
    const ref = storageReferenceFromUrlV523(raw, bucket);
    const cleanBucket = String(ref.bucket || bucket || '').trim();
    const cleanPath = normalizeStoragePathV523(ref.path || (!/^https?:\/\//i.test(raw) ? raw : ''));
    if (!cleanPath) return /^https?:\/\//i.test(raw) ? raw : '';
    const mode = String(opts.mode || getStorageAccessModeV523()).toLowerCase();
    if (mode === 'signed' || opts.preferSigned) {
      const signed = await storageSignedUrl(cleanBucket, cleanPath, opts.expiresIn, opts);
      if (signed && signed.signedUrl) return signed.signedUrl;
      if (opts.allowPublicFallback !== true) return '';
    }
    return storagePublicUrl(cleanBucket, cleanPath);
  }

  async function storageExists(bucket, path){
    const client = getClient();
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return { exists:false, error:{ message:'Supabase Storage 연결 없음' } };
    }
    const cleanPath = normalizeStoragePathV523(path);
    if (!cleanPath) return { exists:false, error:{ message:'Storage 경로 없음' } };
    try {
      const accessUrl = await storageResolveUrl(bucket, cleanPath, { forceRefresh:false, allowPublicFallback:getStorageAccessModeV523() !== 'signed' });
      if (!accessUrl) return { exists:false, error:{ message:'기간 제한 파일주소 생성 실패' } };
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(function(){ try { controller.abort(); } catch (e) {} }, 10000) : null;
      try {
        let response = await fetch(accessUrl, {
          method:'HEAD',
          cache:'no-store',
          signal:controller ? controller.signal : undefined
        });
        if (response && (response.status === 405 || response.status === 501)) {
          response = await fetch(accessUrl, {
            method:'GET',
            cache:'no-store',
            headers:{ Range:'bytes=0-0' },
            signal:controller ? controller.signal : undefined
          });
        }
        return response && response.ok
          ? { exists:true, publicUrl:accessUrl, signedUrl:accessUrl, error:null }
          : { exists:false, publicUrl:accessUrl, signedUrl:accessUrl, error:{ message:'Storage 파일 확인 실패 (' + (response ? response.status : '응답없음') + ')' } };
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch (e) {
      return { exists:false, error:e };
    }
  }

  async function signOut(){
    const client = getClient();
    if (!client || !client.auth || typeof client.auth.signOut !== 'function') return { error: null };
    try { return await client.auth.signOut(); } catch (e) { return { error: e }; }
  }

  window.SitePassSupabaseApi = {
    getClient,
    hasClient,
    hasRpc,
    rpc,
    select,
    upsert,
    update,
    storageUpload,
    storagePublicUrl,
    storageSignedUrl,
    storageResolveUrl,
    storageExists,
    signOut
  };
})();
