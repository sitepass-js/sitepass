// SitePass STEP90 R2 - super-admin read-only driver/worker auth API
(function(){
  'use strict';

  var RPC_NAME = 'sitepass_admin_list_person_auth_status_v1';

  var cache = {
    driver: { payload:null, loading:false, error:'', fetchedAt:0, requestId:0 },
    worker: { payload:null, loading:false, error:'', fetchedAt:0, requestId:0 }
  };

  function normalizeType(value) {
    var key = String(value || '').trim().toLowerCase();
    return key === 'driver' || key === 'worker' ? key : '';
  }

  function number(value) {
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function normalizeItem(row) {
    row = row && typeof row === 'object' ? row : {};
    return {
      subjectType: String(row.subjectType || '').trim().toLowerCase(),
      subjectId: String(row.subjectId || '').trim(),
      displayName: String(row.displayName || '-').trim() || '-',
      phoneLast4: String(row.phoneLast4 || '').trim(),
      phonePurpose: String(row.phonePurpose || '').trim(),
      phoneVerified: row.phoneVerified === true,
      phoneVerifiedAt: row.phoneVerifiedAt || null,
      sensEvidence: row.sensEvidence === true,
      consentPurpose: String(row.consentPurpose || '').trim(),
      consented: row.consented === true,
      consentedAt: row.consentedAt || null,
      consentMethod: String(row.consentMethod || '').trim(),
      consentLinkOpened: row.consentLinkOpened === true,
      consentRevealed: row.consentRevealed === true,
      termsVersion: String(row.termsVersion || '').trim(),
      privacyVersion: String(row.privacyVersion || '').trim(),
      smsTermsVersion: String(row.smsTermsVersion || '').trim(),
      identityTermsVersion: String(row.identityTermsVersion || '').trim(),
      identityStatus: String(row.identityStatus || 'not_configured').trim(),
      identityProvider: String(row.identityProvider || 'none').trim(),
      identityVerifiedAt: row.identityVerifiedAt || null,
      authBound: row.authBound === true
    };
  }

  function normalizePayload(data, subjectType) {
    data = data && typeof data === 'object' ? data : {};
    var items = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];
    return {
      ok: data.ok === true,
      subjectType: normalizeType(data.subjectType || subjectType),
      total: number(data.total),
      driverCount: number(data.driverCount),
      workerCount: number(data.workerCount),
      limit: number(data.limit),
      offset: number(data.offset),
      readOnly: data.readOnly === true,
      items: items
    };
  }

  function getApi() {
    var api = window.SitePassSupabaseApi || null;
    return api && typeof api.rpc === 'function' ? api : null;
  }

  function getState(subjectType) {
    var key = normalizeType(subjectType);
    if (!key) return { payload:null, loading:false, error:'INVALID_PERSON_TYPE', fetchedAt:0 };
    var row = cache[key];
    return {
      payload: row.payload,
      loading: row.loading,
      error: row.error,
      fetchedAt: row.fetchedAt
    };
  }

  async function refresh(subjectType, force) {
    var key = normalizeType(subjectType);
    if (!key) return { ok:false, error:'INVALID_PERSON_TYPE' };

    var row = cache[key];
    var now = Date.now();

    if (row.loading) return { ok:true, loading:true };

    if (!force && row.fetchedAt && now - row.fetchedAt < 15000) {
      return { ok:!row.error, cached:true, payload:row.payload, error:row.error };
    }

    var api = getApi();
    if (!api) {
      row.error = 'SITEPASS_SUPABASE_API_NOT_READY';
      row.fetchedAt = Date.now();
      return { ok:false, error:row.error };
    }

    var requestId = ++row.requestId;
    row.loading = true;
    row.error = '';

    try {
      var result = await api.rpc(RPC_NAME, {
        p_subject_type: key,
        p_limit: 200,
        p_offset: 0
      });

      if (requestId !== row.requestId) return { ok:false, stale:true };
      if (result && result.error) throw result.error;

      var payload = normalizePayload(result ? result.data : null, key);
      if (!payload.ok || !payload.readOnly) throw new Error('ADMIN_PERSON_READONLY_PAYLOAD_INVALID');

      row.payload = payload;
      row.error = '';
      row.fetchedAt = Date.now();
      return { ok:true, payload:payload };
    } catch (e) {
      if (requestId === row.requestId) {
        row.payload = null;
        row.error = e && e.message ? e.message : String(e || 'ADMIN_PERSON_READONLY_ERROR');
        row.fetchedAt = Date.now();
      }
      return { ok:false, error:row.error || 'ADMIN_PERSON_READONLY_ERROR' };
    } finally {
      if (requestId === row.requestId) row.loading = false;
    }
  }

  function invalidate() {
    ['driver','worker'].forEach(function(key){
      cache[key].requestId += 1;
      cache[key].payload = null;
      cache[key].loading = false;
      cache[key].error = '';
      cache[key].fetchedAt = 0;
    });
  }

  (function bindSignedOutInvalidation(){
    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.subscribe !== 'function') return;
    if (window.__sitePassAdminEquipmentPersonnelSignedOutR2) return;
    window.__sitePassAdminEquipmentPersonnelSignedOutR2 = true;
    authSession.subscribe(function(event){
      if (event === 'SIGNED_OUT') invalidate();
    });
  })();

  window.SitePassAdminEquipmentPersonnelApi = Object.freeze({
    RPC_NAME: RPC_NAME,
    refresh: refresh,
    getState: getState,
    invalidate: invalidate,
    normalizePayload: normalizePayload
  });
})();
