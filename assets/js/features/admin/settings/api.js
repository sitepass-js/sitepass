// SitePass STEP96 - admin settings API
(function(){
  'use strict';

  var GET_RPC = 'sitepass_admin_get_settings_v1';
  var SET_RPC = 'sitepass_admin_set_setting_v1';

  var state = {
    loaded: false,
    loading: false,
    saving: false,
    error: '',
    items: [],
    requestId: 0,
    saveRequestId: 0
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
      key: String(row.key || ''),
      value: Number(row.value),
      version: Number(row.version),
      updatedAt: String(row.updatedAt || '')
    };
  }

  function getState(){
    return {
      loaded: state.loaded,
      loading: state.loading,
      saving: state.saving,
      error: state.error,
      items: state.items.map(function(item){ return Object.assign({}, item); }),
      requestId: state.requestId,
      saveRequestId: state.saveRequestId
    };
  }

  function findItem(key){
    var wanted = String(key || '');
    for (var i = 0; i < state.items.length; i += 1) {
      if (state.items[i].key === wanted) return Object.assign({}, state.items[i]);
    }
    return null;
  }

  function getInt(key, fallback){
    var item = findItem(key);
    var value = item ? Number(item.value) : NaN;
    var safeFallback = Number(fallback);

    if (!Number.isInteger(safeFallback) || safeFallback < 1 || safeFallback > 100) {
      safeFallback = 20;
    }

    return Number.isInteger(value) && value >= 1 && value <= 100
      ? value
      : safeFallback;
  }

  async function ensureLoaded(){
    if (state.loaded) {
      return { ok:true, cached:true };
    }

    if (!state.loading) {
      return load();
    }

    for (var i = 0; i < 100; i += 1) {
      await new Promise(function(resolve){
        setTimeout(resolve, 50);
      });

      if (state.loaded) {
        return { ok:true, cached:true };
      }

      if (!state.loading) {
        break;
      }
    }

    if (state.loaded) {
      return { ok:true, cached:true };
    }

    return load();
  }

  async function load(options){
    options = options && typeof options === 'object' ? options : {};

    if (!isSuperAdminReady()) {
      return { ok:false, code:'SUPER_ADMIN_REQUIRED' };
    }

    if (state.loading) {
      return { ok:true, loading:true };
    }

    if (state.loaded && options.force !== true) {
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
      var result = await api.rpc(GET_RPC, {});

      if (requestId !== state.requestId || !isSuperAdminReady()) {
        return { ok:false, stale:true };
      }

      if (!result || result.error) {
        throw (result && result.error) || new Error('SETTINGS_GET_RPC_ERROR');
      }

      var payload = result.data && typeof result.data === 'object' ? result.data : {};
      if (payload.ok !== true || !Array.isArray(payload.items)) {
        throw new Error('SETTINGS_GET_RESPONSE_INVALID');
      }

      state.items = payload.items.map(normalizeItem).filter(function(item){
        return item.key && Number.isFinite(item.value) && Number.isFinite(item.version);
      });
      state.loaded = true;
      state.error = '';

      return { ok:true, count:state.items.length };
    } catch (e) {
      if (requestId === state.requestId) {
        state.error = e && e.message ? e.message : String(e || 'SETTINGS_LOAD_ERROR');
      }
      return { ok:false, error:state.error };
    } finally {
      if (requestId === state.requestId) state.loading = false;
    }
  }

  function newOperationId(){
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (e) {}

    var bytes = new Uint8Array(16);
    try {
      window.crypto.getRandomValues(bytes);
    } catch (e) {
      for (var i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map.call(bytes, function(b){
      return b.toString(16).padStart(2, '0');
    }).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join('-');
  }

  async function save(key, value, expectedVersion){
    if (!isSuperAdminReady()) {
      return { ok:false, code:'SUPER_ADMIN_REQUIRED' };
    }

    if (state.saving) {
      return { ok:false, code:'SETTING_SAVE_IN_FLIGHT' };
    }

    var normalizedKey = String(key || '').trim();
    var normalizedValue = Number(value);
    var normalizedVersion = Number(expectedVersion);

    if (!normalizedKey) return { ok:false, code:'SETTING_KEY_REQUIRED' };
    if (!Number.isInteger(normalizedValue) || normalizedValue < 1 || normalizedValue > 100) {
      return { ok:false, code:'SETTING_VALUE_INVALID' };
    }
    if (!Number.isInteger(normalizedVersion) || normalizedVersion < 1) {
      return { ok:false, code:'SETTING_VERSION_INVALID' };
    }

    var api = adminApi();
    if (!api) {
      state.error = 'ADMIN_API_UNAVAILABLE';
      return { ok:false, code:state.error };
    }

    var saveRequestId = ++state.saveRequestId;
    var operationId = newOperationId();
    state.saving = true;
    state.error = '';

    try {
      var result = await api.rpc(SET_RPC, {
        p_operation_id: operationId,
        p_key: normalizedKey,
        p_value: normalizedValue,
        p_expected_version: normalizedVersion
      });

      if (saveRequestId !== state.saveRequestId || !isSuperAdminReady()) {
        return { ok:false, stale:true };
      }

      if (!result || result.error) {
        throw (result && result.error) || new Error('SETTING_SET_RPC_ERROR');
      }

      var payload = result.data && typeof result.data === 'object' ? result.data : {};
      if (payload.ok !== true) {
        throw new Error('SETTING_SET_RESPONSE_INVALID');
      }

      if (payload.changed === true) {
        var reload = await load({ force:true });
        if (!reload || reload.ok !== true) {
          throw new Error('SETTING_RELOAD_AFTER_SAVE_FAILED');
        }
      }

      return {
        ok: true,
        changed: payload.changed === true,
        idempotent: payload.idempotent === true,
        operationId: String(payload.operationId || operationId),
        key: String(payload.key || normalizedKey),
        value: Number(payload.value),
        version: Number(payload.version),
        result: String(payload.result || '')
      };
    } catch (e) {
      state.error = e && e.message ? e.message : String(e || 'SETTING_SAVE_ERROR');
      return { ok:false, error:state.error };
    } finally {
      if (saveRequestId === state.saveRequestId) state.saving = false;
    }
  }

  function invalidate(){
    state.requestId += 1;
    state.saveRequestId += 1;
    state.loaded = false;
    state.loading = false;
    state.saving = false;
    state.error = '';
    state.items = [];
  }

  window.SitePassAdminSettingsV96 = Object.freeze({
    GET_RPC: GET_RPC,
    SET_RPC: SET_RPC,
    getState: getState,
    findItem: findItem,
    getInt: getInt,
    ensureLoaded: ensureLoaded,
    load: load,
    save: save,
    invalidate: invalidate
  });
})();
