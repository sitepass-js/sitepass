/* SitePass v23.7.779r14-step93-admin-support-chats-render-scroll-stability-fix
 * STEP93 admin support-chats / realtime
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:realtime');
  }
  var state = core.state;
  var RPC = core.RPC;
  var ROOM_STATUSES = core.ROOM_STATUSES;
  var ROOM_STATUS_LABELS = core.ROOM_STATUS_LABELS;

  function client() {
    var target = core.client;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:client');
    }
    return target.apply(core, arguments);
  }

  function currentSectionIsContacts() {
    var target = core.currentSectionIsContacts;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:currentSectionIsContacts');
    }
    return target.apply(core, arguments);
  }

  function isSuperAdmin() {
    var target = core.isSuperAdmin;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:isSuperAdmin');
    }
    return target.apply(core, arguments);
  }

  function loadDetail() {
    var target = core.loadDetail;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:loadDetail');
    }
    return target.apply(core, arguments);
  }

  function loadList() {
    var target = core.loadList;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:loadList');
    }
    return target.apply(core, arguments);
  }

  function safeRoomId() {
    var target = core.safeRoomId;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:safeRoomId');
    }
    return target.apply(core, arguments);
  }

  function scheduleAdminRender() {
    var target = core.scheduleAdminRender;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:scheduleAdminRender');
    }
    return target.apply(core, arguments);
  }

  function text() {
    var target = core.text;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:text');
    }
    return target.apply(core, arguments);
  }

  function realtimeRow(payload) {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    return (
      payload.new ||
      payload.record ||
      payload.row ||
      payload
    );
  }

  function realtimeEventKey(row) {
    return [
      text(row.member_uuid || row.memberUuid).trim(),
      text(row.topic).trim().toLowerCase(),
      text(row.scope_key || row.scopeKey).trim(),
      text(row.revision).trim(),
      text(row.updated_at || row.updatedAt).trim()
    ].join('|');
  }

  function clearRealtimeRefreshTimer() {
    if (state.realtime.refreshTimer) {
      window.clearTimeout(state.realtime.refreshTimer);
      state.realtime.refreshTimer = null;
    }
  }

  async function runRealtimeRefresh() {
    clearRealtimeRefreshTimer();

    if (!isSuperAdmin()) {
      state.realtime.pendingRefresh = true;
      return false;
    }

    if (
      state.listLoading ||
      state.detailLoading ||
      state.replySending
    ) {
      state.realtime.pendingRefresh = true;
      scheduleRealtimeRefresh(250);
      return false;
    }

    state.realtime.pendingRefresh = false;
    state.realtime.refreshCount += 1;
    state.realtime.lastRefreshAt = Date.now();

    await loadList({
      reset: true,
      silentRender: true
    });

    var roomId = currentSectionIsContacts()
      ? safeRoomId(state.selectedRoomId)
      : '';

    if (roomId) {
      await loadDetail(
        roomId,
        {
          markRead: false,
          silentRender: true,
          preserveScroll: true
        }
      );
    }

    /*
     * Realtime background refresh는 중간 로딩 화면을 만들지 않고
     * 목록+상세가 모두 준비된 뒤 딱 한 번만 그린다.
     */
    scheduleAdminRender(0);

    return true;
  }

  function scheduleRealtimeRefresh(delay) {
    state.realtime.pendingRefresh = true;
    clearRealtimeRefreshTimer();

    state.realtime.refreshTimer = window.setTimeout(
      function () {
        runRealtimeRefresh();
      },
      Number(delay || 180)
    );
  }

  function handleRealtimeInvalidation(payload) {
    var row = realtimeRow(payload);
    var topic = text(row.topic).trim().toLowerCase();

    if (topic !== 'admin_inquiry') {
      state.realtime.ignoredEventCount += 1;
      return;
    }

    var key = realtimeEventKey(row);

    if (
      key &&
      key === state.realtime.lastEventKey
    ) {
      state.realtime.duplicateEventCount += 1;
      return;
    }

    state.realtime.lastEventKey = key;
    state.realtime.lastEvent = {
      eventType: text(payload && payload.eventType),
      memberUuid: text(
        row.member_uuid ||
        row.memberUuid
      ),
      topic: topic,
      scopeKey: text(
        row.scope_key ||
        row.scopeKey
      ),
      revision: Number(row.revision || 0),
      updatedAt: text(
        row.updated_at ||
        row.updatedAt
      ),
      receivedAt: new Date().toISOString()
    };

    state.realtime.eventCount += 1;
    scheduleRealtimeRefresh(180);
  }

  function installRealtimeAuthCleanup() {
    if (state.realtime.authSubscription) {
      return;
    }

    var api = client();

    if (
      !api ||
      !api.auth ||
      typeof api.auth.onAuthStateChange !== 'function'
    ) {
      return;
    }

    try {
      var result = api.auth.onAuthStateChange(
        function (event) {
          if (event === 'SIGNED_OUT') {
            stopRealtime();
          }
        }
      );

      state.realtime.authSubscription =
        result &&
        result.data &&
        result.data.subscription
          ? result.data.subscription
          : null;
    } catch (error) {
      state.realtime.error = text(
        error && error.message || error
      );
    }
  }

  async function startRealtime() {
    if (!isSuperAdmin()) {
      return false;
    }

    var api = client();

    if (
      !api ||
      typeof api.channel !== 'function'
    ) {
      state.realtime.status = 'client_not_ready';
      return false;
    }

    if (
      state.realtime.channel &&
      state.realtime.subscribed
    ) {
      return true;
    }

    if (state.realtime.starting) {
      return false;
    }

    state.realtime.starting = true;
    state.realtime.error = '';
    state.realtime.status = 'starting';

    var generation =
      state.realtime.generation + 1;

    state.realtime.generation = generation;

    try {
      if (state.realtime.channel) {
        await stopRealtime();
        state.realtime.generation = generation;
      }

      var channelKey =
        'sitepass-admin-inquiry-invalidations-v675';

      var channel = api
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'sitepass_member_realtime_invalidations_v1'
          },
          handleRealtimeInvalidation
        )
        .subscribe(function (status) {
          if (generation !== state.realtime.generation) {
            return;
          }

          state.realtime.status = text(status);
          state.realtime.subscribed =
            status === 'SUBSCRIBED';

          if (status === 'SUBSCRIBED') {
            state.realtime.error = null;
          } else if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            state.realtime.error = text(status);
          }

          scheduleAdminRender(0);
        });

      state.realtime.channel = channel;
      state.realtime.channelKey = channelKey;

      installRealtimeAuthCleanup();

      return true;
    } catch (error) {
      state.realtime.status = 'error';
      state.realtime.error = text(
        error && error.message || error
      );
      state.realtime.subscribed = false;
      return false;
    } finally {
      state.realtime.starting = false;
    }
  }

  async function stopRealtime() {
    clearRealtimeRefreshTimer();

    var api = client();
    var channel = state.realtime.channel;

    state.realtime.generation += 1;
    state.realtime.channel = null;
    state.realtime.channelKey = '';
    state.realtime.subscribed = false;
    state.realtime.starting = false;
    state.realtime.status = 'stopped';

    if (!channel) {
      return true;
    }

    try {
      if (
        api &&
        typeof api.removeChannel === 'function'
      ) {
        await api.removeChannel(channel);
      } else if (
        typeof channel.unsubscribe === 'function'
      ) {
        await channel.unsubscribe();
      }

      return true;
    } catch (error) {
      state.realtime.error = text(
        error && error.message || error
      );
      return false;
    }
  }

  function ensureRealtimeStarted() {
    if (
      state.realtime.channel ||
      state.realtime.starting
    ) {
      if (state.realtime.pendingRefresh) {
        scheduleRealtimeRefresh(0);
      }
      return;
    }

    window.setTimeout(function () {
      if (currentSectionIsContacts()) {
        startRealtime();
      }
    }, 0);
  }

  function getRealtimeState() {
    return {
      channelKey: state.realtime.channelKey,
      status: state.realtime.status,
      error: state.realtime.error,
      starting: state.realtime.starting,
      subscribed: state.realtime.subscribed,
      eventCount: state.realtime.eventCount,
      refreshCount: state.realtime.refreshCount,
      ignoredEventCount:
        state.realtime.ignoredEventCount,
      duplicateEventCount:
        state.realtime.duplicateEventCount,
      pendingRefresh:
        state.realtime.pendingRefresh,
      lastEvent: state.realtime.lastEvent,
      lastRefreshAt:
        state.realtime.lastRefreshAt
    };
  }

  core.realtimeRow = realtimeRow;
  core.realtimeEventKey = realtimeEventKey;
  core.clearRealtimeRefreshTimer = clearRealtimeRefreshTimer;
  core.runRealtimeRefresh = runRealtimeRefresh;
  core.scheduleRealtimeRefresh = scheduleRealtimeRefresh;
  core.handleRealtimeInvalidation = handleRealtimeInvalidation;
  core.installRealtimeAuthCleanup = installRealtimeAuthCleanup;
  core.startRealtime = startRealtime;
  core.stopRealtime = stopRealtime;
  core.ensureRealtimeStarted = ensureRealtimeStarted;
  core.getRealtimeState = getRealtimeState;
  core.__modules.realtime = true;
})();
