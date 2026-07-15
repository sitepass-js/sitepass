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
    const slash = cleanPath.lastIndexOf('/');
    const folder = slash >= 0 ? cleanPath.slice(0, slash) : '';
    const fileName = slash >= 0 ? cleanPath.slice(slash + 1) : cleanPath;
    try {
      const result = await client.storage.from(String(bucket || '')).list(folder, {
        limit: 100,
        search: fileName,
        sortBy: { column:'name', order:'asc' }
      });
      if (result && result.error) return { exists:false, error:result.error };
      const rows = Array.isArray(result && result.data) ? result.data : [];
      return { exists:rows.some(function(row){ return String(row && row.name || '') === fileName; }), data:rows, error:null };
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
