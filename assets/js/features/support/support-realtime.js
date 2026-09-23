(function(global){
  'use strict';

  var root = global.SitePassSupportV85 =
    global.SitePassSupportV85 || {};

  var bound = false;

  function onInvalidation(event){
    var topic = String(
      event &&
      event.detail &&
      event.detail.topic ||
      ''
    );

    if (topic !== 'admin_inquiry') return;

    var room = root.room;

    if (
      !room ||
      typeof room.refresh !== 'function'
    ) {
      return;
    }

    room.refresh(true);
  }

  function start(){
    if (bound) return true;

    global.addEventListener(
      'sitepass-realtime-invalidation-v664',
      onInvalidation
    );

    bound = true;

    return true;
  }

  function stop(){
    if (!bound) return true;

    global.removeEventListener(
      'sitepass-realtime-invalidation-v664',
      onInvalidation
    );

    bound = false;

    return true;
  }

  root.realtime = Object.freeze({
    start: start,
    stop: stop,

    isStarted: function(){
      return bound;
    }
  });

  start();
})(window);