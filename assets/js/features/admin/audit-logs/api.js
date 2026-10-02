// SitePass STEP95 - audit logs read-only admin API
(function(){
  'use strict';

  var RPC_NAME = 'sitepass_admin_list_audit_logs_v1';
  var state = {
    loading: false,
    error: '',
    pages: [],
    pageIndex: 0,
    requestId: 0
  };

  function isSuperAdminReady(){
    var auth = window.SitePassAdminAuth || null;
    if (!auth || typeof auth.isLoggedIn !== 'function' || typeof auth.isSuperAdmin !== 'function') return false;
    try {
      return auth.isLoggedIn() === true && auth.isSuperAdmin() === true;
    } catch (e) {
      return false;
    }
  }

  function adminApi(){
    var api = window.SitePassAdminApi || null;
    return api && typeof api.rpc === 'function' ? api : null;
  }

  function normalizeItem(row){
    row = row && typeof row === 'object' ? row : {};
    return {
      id: String(row.id || ''),
      adminMemberId: String(row.adminMemberId || ''),
      targetMemberId: String(row.targetMemberId || ''),
      targetBoxId: String(row.targetBoxId || ''),
      action: String(row.action || ''),
      createdAt: String(row.createdAt || '')
    };
  }

  function normalizeCursor(cursor){
    if (!cursor || typeof cursor !== 'object') return null;
    var createdAt = String(cursor.beforeCreatedAt || '').trim();
    var id = String(cursor.beforeId || '').trim();
    return createdAt && id ? { beforeCreatedAt: createdAt, beforeId: id } : null;
  }

  function currentPage(){
    return state.pages[state.pageIndex] || null;
  }

  function getState(){
    var page = currentPage();
    return {
      loaded: state.pages.length > 0,
      loading: state.loading,
      error: state.error,
      pageIndex: state.pageIndex,
      pageCountCached: state.pages.length,
      items: page ? page.items.slice() : [],
      returnedCount: page ? page.returnedCount : 0,
      hasMore: page ? page.hasMore : false,
      nextCursor: page ? page.nextCursor : null,
      canPrev: state.pageIndex > 0,
      canNext: !!(page && (page.hasMore || state.pageIndex + 1 < state.pages.length)),
      requestId: state.requestId
    };
  }

  async function requestPage(cursor, forceReplaceIndex){
    if (!isSuperAdminReady()) return { ok:false, code:'SUPER_ADMIN_REQUIRED' };
    if (state.loading) return { ok:true, loading:true };

    var api = adminApi();
    if (!api) {
      state.error = 'ADMIN_API_UNAVAILABLE';
      return { ok:false, code:state.error };
    }

    var requestId = ++state.requestId;
    state.loading = true;
    state.error = '';

    try {
      var result = await api.rpc(RPC_NAME, {
        p_limit: 25,
        p_before_created_at: cursor ? cursor.beforeCreatedAt : null,
        p_before_id: cursor ? cursor.beforeId : null,
        p_action: null
      });

      if (requestId !== state.requestId || !isSuperAdminReady()) {
        return { ok:false, stale:true };
      }

      if (!result || result.error) {
        throw (result && result.error) || new Error('AUDIT_LOG_RPC_ERROR');
      }

      var payload = result.data && typeof result.data === 'object' ? result.data : {};
      if (payload.ok !== true) throw new Error('AUDIT_LOG_RESPONSE_INVALID');

      var page = {
        cursorIn: cursor || null,
        items: Array.isArray(payload.items) ? payload.items.map(normalizeItem) : [],
        returnedCount: Number(payload.returnedCount || 0),
        hasMore: payload.hasMore === true,
        nextCursor: normalizeCursor(payload.nextCursor)
      };

      if (typeof forceReplaceIndex === 'number' && forceReplaceIndex >= 0) {
        state.pages = state.pages.slice(0, forceReplaceIndex);
        state.pages[forceReplaceIndex] = page;
        state.pageIndex = forceReplaceIndex;
      } else {
        state.pages.push(page);
        state.pageIndex = state.pages.length - 1;
      }

      state.error = '';
      return { ok:true };
    } catch (e) {
      if (requestId === state.requestId) {
        state.error = e && e.message ? e.message : String(e || 'AUDIT_LOG_LOAD_ERROR');
      }
      return { ok:false, error:state.error };
    } finally {
      if (requestId === state.requestId) state.loading = false;
    }
  }

  async function loadFirst(force){
    if (!force && state.pages.length > 0) {
      state.pageIndex = 0;
      return { ok:true, cached:true };
    }
    return requestPage(null, 0);
  }

  async function next(){
    var page = currentPage();
    if (!page) return loadFirst(false);

    if (state.pageIndex + 1 < state.pages.length) {
      state.pageIndex += 1;
      return { ok:true, cached:true };
    }

    if (!page.hasMore || !page.nextCursor) {
      return { ok:true, end:true };
    }

    return requestPage(page.nextCursor);
  }

  function prev(){
    if (state.pageIndex <= 0) return { ok:true, start:true };
    state.pageIndex -= 1;
    return { ok:true, cached:true };
  }

  function invalidate(){
    state.requestId += 1;
    state.loading = false;
    state.error = '';
    state.pages = [];
    state.pageIndex = 0;
  }

  window.SitePassAdminAuditLogsV95 = Object.freeze({
    RPC_NAME: RPC_NAME,
    getState: getState,
    loadFirst: loadFirst,
    next: next,
    prev: prev,
    invalidate: invalidate
  });
})();
