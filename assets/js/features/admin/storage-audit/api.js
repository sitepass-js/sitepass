// SitePass STEP95 - storage audit read-only admin API
(function(){
  'use strict';

  var RPC_NAME = 'sitepass_admin_list_storage_migration_readiness_v1';
  var state = {
    loaded: false,
    loading: false,
    error: '',
    items: [],
    filteredCount: 0,
    readinessSummary: {},
    limit: 25,
    offset: 0,
    status: '',
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

  function number(value, fallback){
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function normalizeItem(row){
    row = row && typeof row === 'object' ? row : {};
    return {
      equipmentNo: String(row.equipmentNo || ''),
      documentType: String(row.documentType || ''),
      fileId: String(row.fileId || ''),
      migrationStatus: String(row.migrationStatus || ''),
      blockedReason: String(row.blockedReason || ''),
      sourceObjectExists: row.sourceObjectExists === true,
      targetPathReady: row.targetPathReady === true,
      readinessStatus: String(row.readinessStatus || '')
    };
  }

  function getState(){
    return {
      loaded: state.loaded,
      loading: state.loading,
      error: state.error,
      items: state.items.slice(),
      filteredCount: state.filteredCount,
      readinessSummary: Object.assign({}, state.readinessSummary || {}),
      limit: state.limit,
      offset: state.offset,
      status: state.status,
      requestId: state.requestId
    };
  }

  async function load(options){
    options = options && typeof options === 'object' ? options : {};

    if (!isSuperAdminReady()) {
      return { ok:false, code:'SUPER_ADMIN_REQUIRED' };
    }

    if (state.loading) {
      return { ok:true, loading:true };
    }

    var limit = Math.min(100, Math.max(1, Math.floor(number(options.limit, state.limit || 25))));
    var offset = Math.max(0, Math.floor(number(options.offset, state.offset || 0)));
    var status = String(options.status == null ? state.status : options.status).trim();
    var force = options.force === true;

    if (
      !force &&
      state.loaded &&
      state.limit === limit &&
      state.offset === offset &&
      state.status === status
    ) {
      return { ok:true, cached:true };
    }

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
        p_limit: limit,
        p_offset: offset,
        p_status: status || null
      });

      if (requestId !== state.requestId || !isSuperAdminReady()) {
        return { ok:false, stale:true };
      }

      if (!result || result.error) {
        throw (result && result.error) || new Error('STORAGE_AUDIT_RPC_ERROR');
      }

      var payload = result.data && typeof result.data === 'object' ? result.data : {};
      if (payload.ok !== true) {
        throw new Error('STORAGE_AUDIT_RESPONSE_INVALID');
      }

      state.items = Array.isArray(payload.items) ? payload.items.map(normalizeItem) : [];
      state.filteredCount = Math.max(0, Math.floor(number(payload.filteredCount, 0)));
      state.readinessSummary = payload.readinessSummary && typeof payload.readinessSummary === 'object'
        ? payload.readinessSummary
        : {};
      state.limit = Math.max(1, Math.floor(number(payload.limit, limit)));
      state.offset = Math.max(0, Math.floor(number(payload.offset, offset)));
      state.status = status;
      state.loaded = true;
      state.error = '';

      return { ok:true };
    } catch (e) {
      if (requestId === state.requestId) {
        state.error = e && e.message ? e.message : String(e || 'STORAGE_AUDIT_LOAD_ERROR');
      }
      return { ok:false, error:state.error };
    } finally {
      if (requestId === state.requestId) state.loading = false;
    }
  }

  function invalidate(){
    state.requestId += 1;
    state.loaded = false;
    state.loading = false;
    state.error = '';
    state.items = [];
    state.filteredCount = 0;
    state.readinessSummary = {};
    state.offset = 0;
  }

  window.SitePassAdminStorageAuditV95 = Object.freeze({
    RPC_NAME: RPC_NAME,
    getState: getState,
    load: load,
    invalidate: invalidate
  });
})();
