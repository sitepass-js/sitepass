/* SitePass STEP84 Native FCM lifecycle candidate - Android only. */
(function () {
  'use strict';

  var INSTALLATION_KEY = 'sitepass_native_push_installation_v1';
  var APP_VERSION = 'step84-native-fcm-server-integration-candidate-v1';
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var ROOM_TYPES = ['system', 'share', 'expiry', 'admin', 'member_chat'];

  var currentToken = '';
  var listenersBound = false;
  var authBound = false;
  var logoutWrapped = false;
  var registrationRequestPending = null;
  var rpcRegistrationPending = null;
  var lastRpcRegistrationAt = 0;
  var initialized = false;

  function capacitor() {
    return window.Capacitor || null;
  }

  function isNativeAndroid() {
    var cap = capacitor();
    if (!cap) return false;
    try {
      if (typeof cap.isNativePlatform === 'function' && !cap.isNativePlatform()) return false;
      if (typeof cap.getPlatform === 'function') return cap.getPlatform() === 'android';
    } catch (error) {
      return false;
    }
    return false;
  }

  function pushPlugin() {
    var cap = capacitor();
    return cap && cap.Plugins ? cap.Plugins.PushNotifications || null : null;
  }

  function appPlugin() {
    var cap = capacitor();
    return cap && cap.Plugins ? cap.Plugins.App || null : null;
  }

  function supabaseClient() {
    try {
      var authSession = window.SitePassAuthSession || null;
      if (authSession && typeof authSession.getClient === 'function') {
        return authSession.getClient();
      }
    } catch (error) {}
    return window.sitepassSupabase || null;
  }

  async function session() {
    try {
      var authSession = window.SitePassAuthSession || null;
      if (authSession && typeof authSession.getSession === 'function') {
        return await authSession.getSession();
      }
      var client = supabaseClient();
      if (client && client.auth && typeof client.auth.getSession === 'function') {
        return await client.auth.getSession();
      }
    } catch (error) {
      return { data: { session: null }, error: error };
    }
    return { data: { session: null }, error: { message: 'AUTH_SESSION_UNAVAILABLE' } };
  }

  function randomUuid() {
    try {
      if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = Array.prototype.map.call(bytes, function (value) {
        return value.toString(16).padStart(2, '0');
      }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
        hex.slice(16, 20) + '-' + hex.slice(20);
    } catch (error) {
      return '';
    }
  }

  function installationId() {
    var stored = '';
    try { stored = String(localStorage.getItem(INSTALLATION_KEY) || '').trim(); } catch (error) {}
    if (UUID_RE.test(stored)) return stored;
    var created = randomUuid();
    if (!UUID_RE.test(created)) return '';
    try { localStorage.setItem(INSTALLATION_KEY, created); } catch (error) {}
    return created;
  }

  function appVersion() {
    try {
      return String(
        window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.appVersion || APP_VERSION
      ).slice(0, 100);
    } catch (error) {
      return APP_VERSION;
    }
  }

  function validToken(value) {
    var token = String(value || '').trim();
    return token.length >= 80 && token.length <= 4096 && !/\s/.test(token) && token.indexOf('://') < 0;
  }

  function normalizePushOpenData(value) {
    var data = value && typeof value === 'object' ? value : {};
    var roomType = String(data.roomType || data.room_type || '').trim().toLowerCase();
    var roomId = String(data.roomId || data.room_id || '').trim();
    if (roomType === 'admin_inquiry') roomType = 'admin';
    if (ROOM_TYPES.indexOf(roomType) < 0) return null;
    if (roomType === 'member_chat' && !UUID_RE.test(roomId)) return null;
    if (roomType !== 'member_chat') roomId = '';
    return {
      roomType: roomType,
      roomId: roomId,
      url: String(data.url || './').slice(0, 500),
      type: String(data.type || data.sourceType || data.source_type || roomType).slice(0, 50),
      eventKey: String(data.eventKey || data.event_key || '').slice(0, 200)
    };
  }

  function dispatchPushOpen(value) {
    var data = normalizePushOpenData(value);
    if (!data) return false;
    try {
      window.dispatchEvent(new CustomEvent('sitepass-native-push-open-v1', { detail: data }));
      return true;
    } catch (error) {
      return false;
    }
  }

  async function registerCurrentToken(force) {
    if (!isNativeAndroid() || !validToken(currentToken)) return { ok: false, skipped: 'token_unavailable' };
    if (rpcRegistrationPending) return rpcRegistrationPending;
    if (!force && Date.now() - lastRpcRegistrationAt < 15000) {
      return { ok: true, skipped: 'recently_registered' };
    }

    rpcRegistrationPending = (async function () {
      var sessionResult = await session();
      var currentSession = sessionResult && sessionResult.data && sessionResult.data.session;
      if (sessionResult && sessionResult.error) return { ok: false, skipped: 'session_error' };
      if (!currentSession || !currentSession.user || !currentSession.user.id) {
        return { ok: false, skipped: 'signed_out' };
      }

      var client = supabaseClient();
      var installId = installationId();
      if (!client || typeof client.rpc !== 'function' || !installId) {
        return { ok: false, skipped: 'client_or_installation_unavailable' };
      }

      var result = await client.rpc('sitepass_register_my_native_push_token_v1', {
        p_token: currentToken,
        p_platform: 'android',
        p_provider: 'fcm',
        p_installation_id: installId,
        p_permission: 'granted',
        p_device_info: String(navigator.userAgent || '').slice(0, 500),
        p_app_version: appVersion()
      });

      if (result && result.error) return { ok: false, error: true };
      lastRpcRegistrationAt = Date.now();
      return { ok: true };
    })();

    try {
      return await rpcRegistrationPending;
    } finally {
      rpcRegistrationPending = null;
    }
  }

  async function unregisterCurrentInstallation() {
    if (!isNativeAndroid()) return { ok: true, skipped: 'browser' };
    var client = supabaseClient();
    var installId = installationId();
    if (!client || typeof client.rpc !== 'function' || !installId) {
      return { ok: false, skipped: 'client_or_installation_unavailable' };
    }
    try {
      var result = await client.rpc('sitepass_remove_my_native_push_token_v1', {
        p_installation_id: installId
      });
      if (result && result.error) return { ok: false, error: true };
      lastRpcRegistrationAt = 0;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: true };
    }
  }

  async function permissionState(plugin, allowPrompt) {
    var checked = await plugin.checkPermissions();
    var receive = String(checked && checked.receive || 'prompt');
    if (receive === 'granted') return receive;
    if (!allowPrompt) return receive;
    var requested = await plugin.requestPermissions();
    return String(requested && requested.receive || receive);
  }

  async function ensureRegistration(options) {
    if (!isNativeAndroid()) return { ok: true, skipped: 'browser' };
    if (registrationRequestPending) return registrationRequestPending;

    registrationRequestPending = (async function () {
      var sessionResult = await session();
      var currentSession = sessionResult && sessionResult.data && sessionResult.data.session;
      if (!currentSession || !currentSession.user || !currentSession.user.id) {
        return { ok: false, skipped: 'signed_out' };
      }

      var plugin = pushPlugin();
      if (!plugin) return { ok: false, skipped: 'plugin_unavailable' };
      var allowPrompt = !options || options.allowPrompt !== false;
      var permission = await permissionState(plugin, allowPrompt);
      if (permission !== 'granted') return { ok: false, skipped: 'permission_' + permission };

      if (validToken(currentToken)) return registerCurrentToken(!!(options && options.force));
      await plugin.register();
      return { ok: true, pending: 'registration_event' };
    })();

    try {
      return await registrationRequestPending;
    } catch (error) {
      return { ok: false, error: true };
    } finally {
      registrationRequestPending = null;
    }
  }

  function bindPushListeners() {
    if (listenersBound || !isNativeAndroid()) return listenersBound;
    var plugin = pushPlugin();
    if (!plugin || typeof plugin.addListener !== 'function') return false;
    listenersBound = true;

    plugin.addListener('registration', function (registration) {
      var token = String(registration && registration.value || '').trim();
      if (!validToken(token)) return;
      currentToken = token;
      registerCurrentToken(true).catch(function () {});
    });

    plugin.addListener('registrationError', function () {
      currentToken = '';
    });

    plugin.addListener('pushNotificationActionPerformed', function (action) {
      var notification = action && action.notification || {};
      dispatchPushOpen(notification.data || {});
    });

    return true;
  }

  function bindAuth() {
    if (authBound || !isNativeAndroid()) return authBound;
    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.subscribe !== 'function') return false;
    authBound = true;
    authSession.subscribe(function (event, authValue) {
      var type = String(event || '');
      if ((type === 'SIGNED_IN' || type === 'TOKEN_REFRESHED') && authValue) {
        ensureRegistration({ allowPrompt: true, force: true }).catch(function () {});
      }
      if (type === 'SIGNED_OUT' && !authValue) {
        lastRpcRegistrationAt = 0;
      }
    });
    return true;
  }

  function wrapMemberLogout() {
    if (logoutWrapped || !isNativeAndroid() || typeof window.memberLogout !== 'function') {
      return logoutWrapped;
    }
    logoutWrapped = true;
    var previousLogout = window.memberLogout;
    window.memberLogout = function () {
      var context = this;
      var args = arguments;
      return Promise.resolve()
        .then(unregisterCurrentInstallation)
        .catch(function () { return null; })
        .then(function () { return previousLogout.apply(context, args); });
    };
    return true;
  }

  function bindAppResume() {
    var plugin = appPlugin();
    if (!plugin || typeof plugin.addListener !== 'function') return false;
    plugin.addListener('appStateChange', function (state) {
      if (state && state.isActive) {
        ensureRegistration({ allowPrompt: false, force: false }).catch(function () {});
      }
    });
    return true;
  }

  function initialize() {
    if (initialized || !isNativeAndroid()) return false;
    initialized = true;
    bindPushListeners();
    bindAuth();
    wrapMemberLogout();
    bindAppResume();
    ensureRegistration({ allowPrompt: true, force: true }).catch(function () {});
    return true;
  }

  window.SitePassNativePushV1 = Object.freeze({
    initialize: initialize,
    ensureRegistration: ensureRegistration,
    unregisterCurrentInstallation: unregisterCurrentInstallation,
    dispatchPushOpen: dispatchPushOpen,
    getState: function () {
      return {
        nativeAndroid: isNativeAndroid(),
        initialized: initialized,
        listenersBound: listenersBound,
        authBound: authBound,
        logoutWrapped: logoutWrapped,
        tokenAvailableInMemory: validToken(currentToken),
        tokenPersistedByModule: false
      };
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    setTimeout(initialize, 0);
  }
})();
