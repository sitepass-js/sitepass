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
    signOut
  };
})();
