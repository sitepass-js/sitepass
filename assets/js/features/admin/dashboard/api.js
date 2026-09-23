// SitePass STEP88 - admin dashboard numeric-only API
(function(){
  'use strict';

  var RPC_NAME = 'sitepass_get_admin_dashboard_summary_v1';
  var ACTIVITY_RPC_NAME = 'sitepass_get_admin_dashboard_activity_v1';
  var state = {
    summary: null,
    loading: false,
    error: '',
    fetchedAt: 0,
    requestId: 0
  };

  function isAdminReady(){
    var auth = window.SitePassAdminAuth || null;
    if (!auth || typeof auth.isLoggedIn !== 'function') return false;
    try { return auth.isLoggedIn() === true; }
    catch (e) { return false; }
  }

  function number(value){
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function normalize(payload){
    payload = payload && typeof payload === 'object' ? payload : {};
    var equipment = payload.equipment && typeof payload.equipment === 'object'
      ? payload.equipment : {};
    var members = payload.members && typeof payload.members === 'object'
      ? payload.members : {};
    var share = payload.share && typeof payload.share === 'object'
      ? payload.share : {};

    return {
      ok: payload.ok === true,
      generatedAt: String(payload.generatedAt || ''),
      members: {
        todaySignups: number(members.todaySignups)
      },
      equipment: {
        rawNonDeleted: number(equipment.rawNonDeleted),
        total: number(equipment.total),
        paused: number(equipment.paused),
        expiringDocs: number(equipment.expiringDocs),
        expiredDocs: number(equipment.expiredDocs),
        paymentDue: number(equipment.paymentDue),
        grace14Items: number(equipment.grace14Items),
        todayCompleted: number(equipment.todayCompleted),
        registrationWaiting: number(equipment.registrationWaiting),
        totalCompleted: number(equipment.totalCompleted)
      },
      share: {
        windowLimit: number(share.windowLimit || 200),
        sent: number(share.sent),
        opened: number(share.opened),
        downloaded: number(share.downloaded),
        printed: number(share.printed),
        expired: number(share.expired),
        revoked: number(share.revoked)
      }
    };
  }

  function snapshot(){
    if (!isAdminReady()) {
      return {
        summary: null,
        loading: false,
        error: '',
        fetchedAt: 0,
        requestId: state.requestId
      };
    }
    return {
      summary: state.summary,
      loading: state.loading,
      error: state.error,
      fetchedAt: state.fetchedAt,
      requestId: state.requestId
    };
  }

  async function refresh(force){
    if (!isAdminReady()) {
      return { ok:false, code:'ADMIN_LOGIN_REQUIRED' };
    }

    var now = Date.now();
    if (state.loading) return { ok:true, loading:true };
    if (
      !force &&
      state.summary &&
      state.fetchedAt &&
      now - state.fetchedAt < 15000
    ) {
      return { ok:true, cached:true, summary:state.summary };
    }

    var api = window.SitePassAdminApi || null;
    if (!api || typeof api.rpc !== 'function') {
      state.error = 'ADMIN_API_UNAVAILABLE';
      return { ok:false, code:state.error };
    }

    var requestId = ++state.requestId;
    state.loading = true;
    state.error = '';

    try {
      var results = await Promise.all([
        api.rpc(RPC_NAME, {}),
        api.rpc(ACTIVITY_RPC_NAME, {})
      ]);

      if (requestId !== state.requestId || !isAdminReady()) {
        return { ok:false, stale:true };
      }

      var result = results[0] || {};
      var activityResult = results[1] || {};

      if (result.error) throw result.error;
      if (activityResult.error) throw activityResult.error;

      var payload = Array.isArray(result.data)
        ? (result.data[0] || {})
        : (result.data || {});

      var activityPayload = Array.isArray(activityResult.data)
        ? (activityResult.data[0] || {})
        : (activityResult.data || {});

      if (activityPayload.ok !== true) {
        throw new Error('DASHBOARD_ACTIVITY_INVALID');
      }

      payload = Object.assign({}, payload, {
        members: activityPayload.members || {},
        equipment: Object.assign(
          {},
          payload.equipment || {},
          activityPayload.equipment || {}
        )
      });

      var normalized = normalize(payload);
      if (!normalized.ok) {
        throw new Error('DASHBOARD_SUMMARY_INVALID');
      }

      state.summary = normalized;
      state.fetchedAt = Date.now();
      state.error = '';

      return { ok:true, summary:normalized };
    } catch (e) {
      if (requestId === state.requestId && isAdminReady()) {
        state.error = e && e.message
          ? e.message
          : String(e || 'DASHBOARD_SUMMARY_ERROR');
      }
      return { ok:false, error:state.error || 'DASHBOARD_SUMMARY_ERROR' };
    } finally {
      if (requestId === state.requestId) {
        state.loading = false;
      }
    }
  }

  function invalidate(){
    state.requestId += 1;
    state.summary = null;
    state.loading = false;
    state.error = '';
    state.fetchedAt = 0;
  }

  // STEP88 v728:
  // 이 모듈이 보유한 숫자 summary cache는 관리자 인증 세션보다 오래 살아서는 안 된다.
  // 87단계 logout 구현은 건드리지 않고, 공통 AuthSession의 SIGNED_OUT만 구독해
  // dashboard 전용 상태를 자기 경계 안에서 폐기한다.
  (function bindSignedOutInvalidationV728(){
    if (window.__sitePassAdminDashboardSignedOutBoundV728) return;

    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.subscribe !== 'function') return;

    window.__sitePassAdminDashboardSignedOutBoundV728 = true;

    authSession.subscribe(function(event){
      if (event !== 'SIGNED_OUT') return;
      invalidate();
    });
  })();

  window.SitePassAdminDashboardApi = Object.freeze({
    RPC_NAME: RPC_NAME,
    ACTIVITY_RPC_NAME: ACTIVITY_RPC_NAME,
    refresh: refresh,
    getState: snapshot,
    invalidate: invalidate,
    normalize: normalize
  });
})();
