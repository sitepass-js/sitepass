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
    try {
      const result = client.storage.from(String(bucket || '')).getPublicUrl(String(path || ''));
      return (result && result.data && result.data.publicUrl) || '';
    } catch (e) {
      return '';
    }
  }


  async function storageExists(bucket, path){
    const client = getClient();
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return { exists:false, error:{ message:'Supabase Storage 연결 없음' } };
    }
    const cleanPath = String(path || '').replace(/^\/+|\/+$/g, '');
    if (!cleanPath) return { exists:false, error:{ message:'Storage 경로 없음' } };
    try {
      const result = client.storage.from(String(bucket || '')).getPublicUrl(cleanPath);
      const publicUrl = (result && result.data && result.data.publicUrl) || '';
      if (!publicUrl) return { exists:false, error:{ message:'Storage 공개주소 생성 실패' } };
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(function(){ try { controller.abort(); } catch (e) {} }, 10000) : null;
      try {
        // Public bucket의 실제 객체 응답을 확인하므로 storage.objects SELECT 정책이 필요하지 않습니다.
        let response = await fetch(publicUrl, {
          method:'HEAD',
          cache:'no-store',
          signal:controller ? controller.signal : undefined
        });
        if (response && (response.status === 405 || response.status === 501)) {
          response = await fetch(publicUrl, {
            method:'GET',
            cache:'no-store',
            headers:{ Range:'bytes=0-0' },
            signal:controller ? controller.signal : undefined
          });
        }
        return response && response.ok
          ? { exists:true, publicUrl:publicUrl, error:null }
          : { exists:false, publicUrl:publicUrl, error:{ message:'Storage 파일 확인 실패 (' + (response ? response.status : '응답없음') + ')' } };
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
    storageExists,
    signOut
  };
})();
