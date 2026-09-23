/* SitePass v23.7.596-55-mobile-only-room-push-toggle
 * ?쒕쾭 ??ν삎 諛⑸퀎 ?대???Push ON/OFF.
 * OFF???대???Push留?留됯퀬 硫붿떆吏/?대깽???쎌쓬/諛곗?/SMS쨌移댁뭅?ㅒ룹씠硫붿씪? 嫄대뱶由ъ? ?딅뒗??
 */
(function(){
  'use strict';

  var EVENT_NAME = 'sitepass-room-push-updated-v595';
  var FIXED_TYPES = ['system','share','expiry','admin'];
  var state = {
    loaded: false,
    loading: false,
    lastError: '',
    fixed: { system:true, share:true, expiry:true, admin:true },
    memberRooms: Object.create(null),
    busy: Object.create(null),
    lastLoadedAt: 0,
    identityKey: ''
  };

  function client(){ return window.sitepassSupabase || null; }

  function parse(value){
    var out = value;
    if (typeof out === 'string') {
      try { out = JSON.parse(out); } catch (e) {}
    }
    if (Array.isArray(out) && out.length === 1) out = out[0];
    return out && typeof out === 'object' ? out : {};
  }

  function errorText(error){
    return String(
      error && (error.message || error.details || error.hint || error.error_description) ||
      error ||
      '?????녿뒗 ?ㅻ쪟'
    );
  }

  function normalizeType(value){
    var type = String(value || '').trim().toLowerCase();
    return FIXED_TYPES.indexOf(type) >= 0 || type === 'member_chat' ? type : '';
  }

  function key(roomType, roomId){
    var type = normalizeType(roomType);
    return type === 'member_chat'
      ? type + ':' + String(roomId || '').trim()
      : type;
  }

  function isMemberMode(){
    try {
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return false;
    } catch (e) {}
    try {
      if (typeof window.isMemberLoggedIn === 'function') return !!window.isMemberLoggedIn();
    } catch (e) {}
    return true;
  }

  async function syncIdentity(){
    var nextIdentity = '';
    try {
      var authSession = window.SitePassAuthSession || null;
      if (authSession && typeof authSession.getUserId === 'function') {
        nextIdentity = await authSession.getUserId();
      }
    } catch (e) {}

    if (state.identityKey !== nextIdentity) {
      state.identityKey = nextIdentity;
      state.loaded = false;
      state.lastError = '';
      state.fixed = { system:true, share:true, expiry:true, admin:true };
      state.memberRooms = Object.create(null);
      state.lastLoadedAt = 0;
      emit();
    }
    return nextIdentity;
  }

  function snapshot(){
    return {
      loaded: state.loaded,
      loading: state.loading,
      lastError: state.lastError,
      fixed: Object.assign({}, state.fixed),
      memberRooms: Object.assign({}, state.memberRooms),
      busy: Object.assign({}, state.busy),
      lastLoadedAt: state.lastLoadedAt,
      identityKey: state.identityKey
    };
  }

  function emit(){
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail:snapshot() }));
    } catch (e) {
      try {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent(EVENT_NAME, false, false, snapshot());
        window.dispatchEvent(event);
      } catch (err) {}
    }
  }

  function applyPayload(raw){
    var payload = parse(raw);
    var fixedRows = Array.isArray(payload.fixedRooms) ? payload.fixedRooms : [];
    var memberRows = Array.isArray(payload.memberRooms) ? payload.memberRooms : [];
    var nextFixed = { system:true, share:true, expiry:true, admin:true };
    var nextMembers = Object.create(null);

    fixedRows.forEach(function(row){
      var type = normalizeType(row && (row.roomType || row.room_type));
      if (FIXED_TYPES.indexOf(type) < 0) return;
      nextFixed[type] = row.pushEnabled !== false && row.push_enabled !== false;
    });

    memberRows.forEach(function(row){
      var roomId = String(row && (row.roomId || row.room_id) || '').trim();
      if (!roomId) return;
      nextMembers[roomId] = row.pushEnabled !== false && row.push_enabled !== false;
    });

    state.fixed = nextFixed;
    state.memberRooms = nextMembers;
    state.loaded = true;
    state.lastError = '';
    state.lastLoadedAt = Date.now();
  }

  function get(roomType, roomId){
    var type = normalizeType(roomType);
    if (type === 'member_chat') {
      var id = String(roomId || '').trim();
      return Object.prototype.hasOwnProperty.call(state.memberRooms, id)
        ? state.memberRooms[id] !== false
        : true;
    }
    return FIXED_TYPES.indexOf(type) >= 0 ? state.fixed[type] !== false : true;
  }

  function isBusy(roomType, roomId){
    return !!state.busy[key(roomType, roomId)];
  }

  async function rpc(name, args){
    var supabase = client();
    if (!supabase || typeof supabase.rpc !== 'function') {
      throw new Error('Supabase RPC ?곌껐 ?놁쓬');
    }
    var result = await supabase.rpc(name, args || {});
    if (result && result.error) throw result.error;
    return parse(result && result.data);
  }

  async function refresh(force){
    if (!isMemberMode()) return snapshot();
    await syncIdentity();
    if (!state.identityKey) return snapshot();
    if (state.loading) return snapshot();
    if (!force && state.loaded && Date.now() - state.lastLoadedAt < 30000) return snapshot();

    state.loading = true;
    emit();
    try {
      var payload = await rpc('sitepass_get_my_room_push_preferences_v1', {});
      applyPayload(payload);
      var pushApi = window.SitePassPushNotify;
      if (pushApi && typeof pushApi.isMobilePushDevice === 'function' && !pushApi.isMobilePushDevice()) {
        if (typeof pushApi.cleanupDesktopPushSubscriptionIfPossible === 'function') {
          pushApi.cleanupDesktopPushSubscriptionIfPossible().catch(function(){});
        }
      } else {
        autoRegisterGrantedDevice();
      }
    } catch (error) {
      state.lastError = errorText(error);
    } finally {
      state.loading = false;
      emit();
    }
    return snapshot();
  }

  async function ensureDeviceSubscription(interactive){
    try {
      var nativeApi = window.SitePassNativePushV1;
      if (
        nativeApi &&
        typeof nativeApi.getState === 'function' &&
        nativeApi.getState() &&
        nativeApi.getState().nativeAndroid === true
      ) {
        return { ok:true, skipped:true, reason:'native_android_fcm' };
      }
    } catch (e) {}

    var pushApi = window.SitePassPushNotify;
    if (pushApi && typeof pushApi.isMobilePushDevice === 'function' && !pushApi.isMobilePushDevice()) {
      return { ok:true, skipped:true, reason:'desktop_not_eligible' };
    }

    if (!('Notification' in window)) {
      if (interactive) alert('??釉뚮씪?곗????대???Push ?뚮┝??吏?먰븯吏 ?딆뒿?덈떎.');
      return { ok:false, reason:'unsupported' };
    }

    if (Notification.permission === 'denied') {
      if (interactive) alert('諛??뚮┝? ON?쇰줈 ??λ릱吏留???湲곌린??釉뚮씪?곗? ?뚮┝ 沅뚰븳??李⑤떒?섏뼱 ?덉뒿?덈떎. 湲곌린 ?ㅼ젙?먯꽌 ?뚮┝???덉슜?댁＜?몄슂.');
      return { ok:false, reason:'permission_denied' };
    }

    if (Notification.permission === 'default') {
      if (interactive && typeof window.sitepassRequestPushPermission === 'function') {
        var permission = await window.sitepassRequestPushPermission();
        return { ok:permission === 'granted', reason:permission };
      }
      return { ok:false, reason:'permission_default' };
    }

    var api = pushApi || window.SitePassPushNotify;
    if (api && typeof api.saveSubscriptionIfPossible === 'function') {
      var saved = await api.saveSubscriptionIfPossible();
      if (saved && saved.error) {
        if (interactive) alert('諛??뚮┝? ON?쇰줈 ??λ릱吏留???湲곌린??Push 援щ룆 ??μ쓣 ?뺤씤?섏? 紐삵뻽?듬땲??\n' + errorText(saved.error));
        return { ok:false, reason:'subscription_save_failed', error:saved.error };
      }
      return { ok:true };
    }

    return { ok:false, reason:'push_module_not_ready' };
  }

  var autoRegisterRunning = false;
  async function autoRegisterGrantedDevice(){
    if (autoRegisterRunning || !isMemberMode()) return;
    var api = window.SitePassPushNotify;
    if (api && typeof api.isMobilePushDevice === 'function' && !api.isMobilePushDevice()) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    autoRegisterRunning = true;
    try { await ensureDeviceSubscription(false); } catch (e) {}
    autoRegisterRunning = false;
  }

  async function set(roomType, roomId, enabled, options){
    await syncIdentity();
    if (!state.identityKey) throw new Error('AUTH_REQUIRED');
    var type = normalizeType(roomType);
    var id = type === 'member_chat' ? String(roomId || '').trim() : '';
    if (!type || (type === 'member_chat' && !id)) throw new Error('ROOM_PUSH_TARGET_INVALID');

    var itemKey = key(type, id);
    if (state.busy[itemKey]) return false;
    state.busy[itemKey] = true;
    emit();

    var previous = get(type, id);
    try {
      var payload = await rpc('sitepass_set_my_room_push_preference_v1', {
        p_room_type: type,
        p_member_chat_room_id: type === 'member_chat' ? id : null,
        p_push_enabled: enabled === true
      });
      var stored = payload.pushEnabled !== false && payload.push_enabled !== false;
      if (type === 'member_chat') state.memberRooms[id] = stored;
      else state.fixed[type] = stored;
      state.loaded = true;
      state.lastError = '';
      state.lastLoadedAt = Date.now();
      emit();

      if (stored) await ensureDeviceSubscription(!!(options && options.interactive));
      return true;
    } catch (error) {
      if (type === 'member_chat') state.memberRooms[id] = previous;
      else state.fixed[type] = previous;
      state.lastError = errorText(error);
      if (!options || options.alertOnError !== false) {
        alert('?뚮┝ ?ㅼ젙????ν븯吏 紐삵뻽?듬땲??\n' + state.lastError);
      }
      emit();
      return false;
    } finally {
      delete state.busy[itemKey];
      emit();
    }
  }

  function toggle(event, roomType, roomId){
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    if (isBusy(roomType, roomId)) return false;
    set(roomType, roomId, !get(roomType, roomId), { interactive:true }).catch(function(error){
      alert('?뚮┝ ?ㅼ젙????ν븯吏 紐삵뻽?듬땲??\n' + errorText(error));
    });
    return false;
  }

  function handleKey(event, roomType, roomId){
    var keyName = event && (event.key || event.code);
    if (keyName === 'Enter' || keyName === ' ' || keyName === 'Spacebar') {
      return toggle(event, roomType, roomId);
    }
    return true;
  }

  function boot(){
    [0, 450, 1400].forEach(function(delay){
      setTimeout(function(){ refresh(false); }, delay);
    });
    window.addEventListener('focus', function(){ refresh(false); });
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) refresh(false);
    });
    window.addEventListener('sitepass-member-link-chat-updated-v566', function(){ refresh(false); });
    try {
      var authSession = window.SitePassAuthSession || null;
      if (authSession && typeof authSession.subscribe === 'function') {
        authSession.subscribe(function(){
          setTimeout(function(){
            syncIdentity().then(function(){ refresh(true); });
          }, 0);
        });
      }
    } catch (e) {}
  }

  window.SitePassRoomPushV595 = {
    version: '23.7.596',
    eventName: EVENT_NAME,
    get: get,
    isBusy: isBusy,
    refresh: refresh,
    set: set,
    toggle: toggle,
    handleToggle: toggle,
    handleKey: handleKey,
    ensureDeviceSubscription: ensureDeviceSubscription,
    snapshot: snapshot
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
