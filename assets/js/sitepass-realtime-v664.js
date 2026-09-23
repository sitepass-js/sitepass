/* SitePass STEP84 V40 mobile chat realtime recovery
 * - A failed/closed channel is never treated as connected.
 * - Reconnect after mobile background/network recovery without polling.
 * - Refresh canonical chat state once after every successful subscription so
 *   events missed while the PWA was suspended are reconciled.
 */
(function(){
  'use strict';

  var channel = null;
  var channelKey = '';
  var channelStatus = 'idle';
  var channelStartedAt = 0;
  var channelGeneration = 0;
  var startPromise = null;
  var retryTimer = 0;
  var debounceTimer = 0;
  var pendingTopics = Object.create(null);

  function client(){
    return window.sitepassSupabase || null;
  }

  function emit(topic, payload){
    pendingTopics[String(topic || '')] = payload || {};
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function(){
      var topics = Object.keys(pendingTopics);
      var batch = pendingTopics;
      pendingTopics = Object.create(null);
      topics.forEach(function(name){
        try {
          window.dispatchEvent(new CustomEvent(
            'sitepass-realtime-invalidation-v664',
            { detail: Object.assign({ topic:name }, batch[name] || {}) }
          ));
        } catch(e) {}
      });
      if (topics.indexOf('member_chat') >= 0) {
        try {
          var api = window.SitePassMemberLinkChatV566;
          if (api && typeof api.refresh === 'function') {
            api.refresh(true);
          }
          if (
            api &&
            typeof api.refreshCurrentRoom === 'function'
          ) {
            api.refreshCurrentRoom();
          }
        } catch(e) {}
      }
    }, 120);
  }

  async function sessionKey(){
    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.getUserId !== 'function') return '';
    try {
      return await authSession.getUserId();
    } catch(e) { return ''; }
  }

  function scheduleReconnect(generation){
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function(){
      if (generation !== channelGeneration) return;
      start(true);
    }, 1500);
  }

  async function stop(){
    channelGeneration += 1;
    clearTimeout(retryTimer);
    retryTimer = 0;
    var sb = client();
    var old = channel;
    channel = null;
    channelKey = '';
    channelStatus = 'idle';
    channelStartedAt = 0;
    if (sb && old && typeof sb.removeChannel === 'function') {
      try { await sb.removeChannel(old); } catch(e) {}
    } else if (old && typeof old.unsubscribe === 'function') {
      try { await old.unsubscribe(); } catch(e) {}
    }
  }

  async function start(force){
    if (startPromise) return startPromise;
    startPromise = (async function(){
      var sb = client();
      if (!sb || typeof sb.channel !== 'function') return false;
      var key = await sessionKey();
      if (!key) {
        await stop();
        return false;
      }
      if (
        !force &&
        channel &&
        channelKey === key &&
        channelStatus === 'SUBSCRIBED'
      ) return true;
      if (
        !force &&
        channel &&
        channelKey === key &&
        channelStatus === 'CONNECTING' &&
        Date.now() - channelStartedAt < 10000
      ) return true;

      await stop();
      var generation = channelGeneration;
      channelKey = key;
      channelStatus = 'CONNECTING';
      channelStartedAt = Date.now();

      var nextChannel = sb
        .channel('sitepass-member-invalidations-v664-' + key)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sitepass_member_realtime_invalidations_v1'
          },
          function(payload){
            if (generation !== channelGeneration || channel !== nextChannel) return;
            var row = payload && (payload.new || payload.old) || {};
            emit(row.topic, {
              scopeKey: row.scope_key || '',
              revision: Number(row.revision || 0),
              updatedAt: row.updated_at || '',
              reason: 'postgres_changes'
            });
          }
        )
        .subscribe(function(status){
          if (generation !== channelGeneration || channel !== nextChannel) return;
          channelStatus = String(status || 'UNKNOWN');
          if (status === 'SUBSCRIBED') {
            clearTimeout(retryTimer);
            retryTimer = 0;
            /* Reconcile messages that arrived while Android suspended the PWA. */
            emit('admin_inquiry', { reason:'subscription_ready' });
            emit('member_chat', { reason:'subscription_ready' });
            return;
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            channel = null;
            channelKey = '';
            channelStartedAt = 0;
            try {
              if (typeof sb.removeChannel === 'function') sb.removeChannel(nextChannel);
              else if (nextChannel && typeof nextChannel.unsubscribe === 'function') nextChannel.unsubscribe();
            } catch(e) {}
            scheduleReconnect(generation);
          }
        });
      channel = nextChannel;
      return true;
    })();
    try {
      return await startPromise;
    } finally {
      startPromise = null;
    }
  }

  function bootstrap(){
    start();
    var authSession = window.SitePassAuthSession || null;
    if (authSession && typeof authSession.subscribe === 'function') {
      try {
        authSession.subscribe(function(event){
          if (event === 'SIGNED_OUT') stop();
          else setTimeout(function(){ start(false); }, 0);
        });
      } catch(e) {}
    }
  }

  window.SitePassRealtimeV664 = {
    start: start,
    stop: stop,
    emitForTest: emit,
    getState: function(){
      return {
        connected: !!channel && channelStatus === 'SUBSCRIBED',
        channelKey: channelKey,
        status: channelStatus,
        generation: channelGeneration,
        pendingTopics: Object.keys(pendingTopics)
      };
    }
  };

  document.addEventListener('DOMContentLoaded', bootstrap, { once:true });
  window.addEventListener('pageshow', function(){ setTimeout(function(){ start(false); }, 100); });
  window.addEventListener('focus', function(){ setTimeout(function(){ start(false); }, 50); });
  window.addEventListener('online', function(){ setTimeout(function(){ start(true); }, 50); });
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) setTimeout(function(){ start(false); }, 50);
  });
})();
