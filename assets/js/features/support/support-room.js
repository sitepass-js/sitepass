(function(global){
  'use strict';

  var root = global.SitePassSupportV85 = global.SitePassSupportV85 || {};
  var api = root.api;

  if (!api) throw new Error('[SitePass STEP85] support api is required before support room');

  var room = null;
  var loaded = false;
  var loading = false;
  var refreshPending = false;
  var lastFetchAt = 0;

  /*
   * STEP85 8/10:
   * logout / account-switch boundary protection.
   *
   * stateGeneration prevents a request that started before logout
   * from repopulating the previous member's support cache afterward.
   */
  var stateGeneration = 0;
  var authBoundaryBound = false;
  var authUserId = null;
  var authSubscription = null;

  function client(){
    return global.sitepassSupabase || null;
  }

  function isExplicitSignedOut(){
    try {
      var authState =
        global.SitePassAuthEvents &&
        typeof global.SitePassAuthEvents.getState === 'function'
          ? global.SitePassAuthEvents.getState()
          : null;

      return !!(
        authState &&
        Number(authState.revision || 0) > 0 &&
        String(authState.type || '') === 'SIGNED_OUT'
      );
    } catch(e) {
      return false;
    }
  }

  function notify(source){
    try {
      global.dispatchEvent(
        new CustomEvent(
          'sitepass-support-room-updated-v85',
          {
            detail: {
              source: String(source || 'refresh')
            }
          }
        )
      );
    } catch(e) {}
  }

  function clearState(reason){
    var hadState =
      room !== null ||
      loaded ||
      loading ||
      refreshPending ||
      lastFetchAt !== 0;

    if (!hadState) return false;

    stateGeneration += 1;

    room = null;
    loaded = false;
    loading = false;
    refreshPending = false;
    lastFetchAt = 0;

    notify(reason || 'auth-clear');

    return true;
  }

  function bindAuthBoundary(){
    if (authBoundaryBound) return true;

    var target = client();

    if (
      !target ||
      !target.auth ||
      typeof target.auth.onAuthStateChange !== 'function'
    ) {
      return false;
    }

    try {
      var result =
        target.auth.onAuthStateChange(function(event, session){
          var nextUserId =
            session &&
            session.user &&
            session.user.id
              ? String(session.user.id)
              : null;

          var accountChanged =
            !!authUserId &&
            !!nextUserId &&
            authUserId !== nextUserId;

          authUserId = nextUserId;

          if (
            String(event || '') === 'SIGNED_OUT' ||
            accountChanged
          ) {
            clearState(
              accountChanged
                ? 'account-changed'
                : 'signed-out'
            );
          }
        });

      authSubscription =
        result &&
        result.data &&
        result.data.subscription
          ? result.data.subscription
          : null;

      authBoundaryBound = true;

      return true;

    } catch(e) {
      return false;
    }
  }

  function syncAuthBoundary(){
    bindAuthBoundary();

    if (isExplicitSignedOut()) {
      clearState('explicit-signed-out');
      return false;
    }

    try {
      if (
        typeof global.isAdminLoggedIn === 'function' &&
        global.isAdminLoggedIn()
      ) {
        clearState('admin-context');
        return false;
      }

      if (
        typeof global.isMemberLoggedIn === 'function' &&
        !global.isMemberLoggedIn()
      ) {
        clearState('member-signed-out');
        return false;
      }

    } catch(e) {
      clearState('auth-check-error');
      return false;
    }

    return true;
  }

  function canUse(){
    if (!syncAuthBoundary()) return false;

    return !!api &&
      typeof api.ready === 'function' &&
      api.ready();
  }

  function normalize(value){
    var valueRoom = Array.isArray(value)
      ? (value[0] || null)
      : value;

    if (
      valueRoom &&
      valueRoom.sitepass_get_my_admin_inquiry_room_v1
    ) {
      valueRoom =
        valueRoom.sitepass_get_my_admin_inquiry_room_v1;
    }

    return valueRoom && valueRoom.ok !== false
      ? valueRoom
      : null;
  }

  async function refresh(force){
    if (!canUse()) return false;

    var now = Date.now();

    if (
      !force &&
      loaded &&
      now - lastFetchAt < 10000
    ) {
      return true;
    }

    if (loading) {
      if (force) refreshPending = true;
      return false;
    }

    var requestGeneration = stateGeneration;

    loading = true;

    try {
      var result = await api.getMyRoom(200);

      /*
       * Logout/account switch may have happened while RPC was in flight.
       * Never let that older response repopulate the cleared cache.
       */
      if (
        requestGeneration !== stateGeneration ||
        !syncAuthBoundary()
      ) {
        return false;
      }

      if (result && !result.error) {
        var nextRoom = normalize(result.data);

        if (nextRoom) {
          room = nextRoom;
          loaded = true;
          lastFetchAt = Date.now();

          notify('refresh');

          return true;
        }
      }

    } catch(e) {}
    finally {
      /*
       * An older request must not mutate the loading state of a newer
       * authentication generation.
       */
      if (requestGeneration === stateGeneration) {
        loading = false;

        if (refreshPending) {
          refreshPending = false;

          setTimeout(function(){
            refresh(true);
          }, 0);
        }
      }
    }

    return false;
  }

  function unread(){
    if (!syncAuthBoundary()) return 0;

    return Math.max(
      0,
      Number(room && room.unreadCount) || 0
    );
  }

  function rawMessages(){
    if (!syncAuthBoundary()) return [];

    return room && Array.isArray(room.messages)
      ? room.messages.slice()
      : [];
  }

  function newIdempotencyKey(){
    return (
      global.crypto &&
      typeof global.crypto.randomUUID === 'function'
    )
      ? global.crypto.randomUUID()
      : '00000000-0000-4000-8000-' +
        Math.random()
          .toString(16)
          .slice(2)
          .padEnd(12,'0')
          .slice(0,12);
  }

  async function markRead(){
    if (!canUse()) return false;

    try {
      var result = await api.markMyRead();

      if (result && !result.error) {
        await refresh(true);
        return true;
      }
    } catch(e) {}

    return false;
  }

  async function send(messageText){
    if (!canUse()) {
      throw new Error('SUPPORT_RPC_UNAVAILABLE');
    }

    var text = String(messageText || '');

    if (!text.trim()) {
      throw new Error('SUPPORT_MESSAGE_EMPTY');
    }

    var result = await api.sendMyMessage(
      text,
      newIdempotencyKey()
    );

    if (!result || result.error) {
      throw (
        (result && result.error) ||
        new Error('ADMIN_INQUIRY_SEND_FAILED')
      );
    }

    await refresh(true);

    return true;
  }

  root.room = Object.freeze({
    version: 'step85-v85-logout-cache-boundary-fix-1',

    refresh: refresh,
    markRead: markRead,
    send: send,

    isLoaded: function(){
      if (!syncAuthBoundary()) return false;
      return loaded;
    },

    unread: unread,
    rawMessages: rawMessages,

    getState: function(){
      syncAuthBoundary();

      return {
        loaded: loaded,
        loading: loading,
        refreshPending: refreshPending,
        lastFetchAt: lastFetchAt,
        stateGeneration: stateGeneration,
        authBoundaryBound: authBoundaryBound
      };
    }
  });

  /*
   * Bind immediately when the shared Supabase singleton is already ready.
   * canUse()/accessors retry the binding if startup order is delayed.
   */
  bindAuthBoundary();

})(window);