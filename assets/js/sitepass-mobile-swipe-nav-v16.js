(function () {
  'use strict';

  if (window.__sitepassMobileSwipeNavV18Bound) return;
  window.__sitepassMobileSwipeNavV18Bound = true;

  var SCREEN_ORDER = [
    'homeScreen',
    'registerScreen',
    'listScreen',
    'contactScreen'
  ];

  var startX = 0;
  var startY = 0;
  var lastX = 0;
  var lastY = 0;
  var startTime = 0;
  var tracking = false;
  var horizontalLocked = false;
  var fired = false;

  function isMobileTouchDevice() {
    try {
      return (
        Number(navigator.maxTouchPoints || 0) > 0 &&
        window.innerWidth <= 900
      );
    } catch (e) {
      return false;
    }
  }

  function currentVisibleScreenId() {
    var active = document.querySelector(
      '#sitepassBottomAppNav button.active[data-target]'
    );

    if (active) {
      var activeTarget = String(active.getAttribute('data-target') || '');
      var activeScreen = document.getElementById(activeTarget);

      if (
        SCREEN_ORDER.indexOf(activeTarget) >= 0 &&
        activeScreen &&
        !activeScreen.classList.contains('hidden')
      ) {
        return activeTarget;
      }
    }

    for (var i = 0; i < SCREEN_ORDER.length; i += 1) {
      var screen = document.getElementById(SCREEN_ORDER[i]);
      if (screen && !screen.classList.contains('hidden')) {
        return SCREEN_ORDER[i];
      }
    }

    return '';
  }

  function bottomNavReady() {
    var nav = document.getElementById('sitepassBottomAppNav');

    return !!(
      nav &&
      !nav.classList.contains('hidden') &&
      typeof window.sitepassBottomNavGo === 'function'
    );
  }

  function hasVisibleModal() {
    var modals = document.querySelectorAll(
      '[role="dialog"][aria-modal="true"]'
    );

    for (var i = 0; i < modals.length; i += 1) {
      var modal = modals[i];

      if (
        !modal.classList.contains('hidden') &&
        modal.getAttribute('aria-hidden') !== 'true'
      ) {
        var style = window.getComputedStyle(modal);

        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function isInteractiveTarget(target) {
    if (!target || typeof target.closest !== 'function') return true;

    return !!target.closest(
      'input, textarea, select, button, a, label, summary, details,' +
      ' [contenteditable="true"], [role="button"], [role="link"],' +
      ' .sitepass-bottom-nav'
    );
  }

  function isInsideHorizontalScroller(target, screen) {
    var node = target;

    while (
      node &&
      node !== screen &&
      node !== document.body &&
      node.nodeType === 1
    ) {
      try {
        var style = window.getComputedStyle(node);
        var overflowX = String(style.overflowX || '');

        if (
          (overflowX === 'auto' || overflowX === 'scroll') &&
          node.scrollWidth > node.clientWidth + 2
        ) {
          return true;
        }
      } catch (e) {}

      node = node.parentElement;
    }

    return false;
  }

  function reset() {
    startX = 0;
    startY = 0;
    lastX = 0;
    lastY = 0;
    startTime = 0;
    tracking = false;
    horizontalLocked = false;
    fired = false;
  }

  function openTarget(target) {
    if (
      target === 'contactScreen' &&
      typeof window.sitepassOpenAlertChatList532 === 'function'
    ) {
      return window.sitepassOpenAlertChatList532({ skipHistory:false });
    }

    return window.sitepassBottomNavGo(target);
  }

  function navigateByDelta(dx) {
    if (fired) return false;

    var screenId = currentVisibleScreenId();
    var index = SCREEN_ORDER.indexOf(screenId);

    if (index < 0) return false;

    var nextIndex = dx < 0 ? index + 1 : index - 1;

    // HOME and ALERT/CHAT are hard boundaries. No wrapping.
    if (nextIndex < 0 || nextIndex >= SCREEN_ORDER.length) return false;

    var nextScreen = SCREEN_ORDER[nextIndex];

    if (!nextScreen || nextScreen === screenId) return false;

    fired = true;
    openTarget(nextScreen);
    return true;
  }

  document.addEventListener(
    'touchstart',
    function (event) {
      reset();

      if (!isMobileTouchDevice()) return;
      if (!bottomNavReady()) return;
      if (hasVisibleModal()) return;
      if (!event.touches || event.touches.length !== 1) return;

      var screenId = currentVisibleScreenId();
      var screen = document.getElementById(screenId);
      var target = event.target;

      if (SCREEN_ORDER.indexOf(screenId) < 0) return;
      if (!screen || !target || !screen.contains(target)) return;
      if (isInteractiveTarget(target)) return;
      if (isInsideHorizontalScroller(target, screen)) return;

      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      lastX = startX;
      lastY = startY;
      startTime = Date.now();
      tracking = true;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    function (event) {
      if (!tracking || fired) return;
      if (!event.touches || event.touches.length !== 1) return;

      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;

      var dx = lastX - startX;
      var dy = lastY - startY;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);

      // Preserve normal vertical scrolling.
      if (!horizontalLocked) {
        if (absX < 16 && absY < 16) return;

        if (absY > absX) {
          tracking = false;
          return;
        }

        if (absX >= 20 && absX >= absY * 1.25) {
          horizontalLocked = true;
        }
      }

      if (!horizontalLocked) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      // Complete the app swipe before a browser touchcancel can discard it.
      if (absX >= 64 && absX >= absY * 1.25) {
        navigateByDelta(dx);
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'touchend',
    function (event) {
      if (!tracking) {
        reset();
        return;
      }

      var sx = startX;
      var sy = startY;
      var lx = lastX;
      var ly = lastY;
      var startedAt = startTime;
      var alreadyFired = fired;

      if (
        event.changedTouches &&
        event.changedTouches.length === 1
      ) {
        lx = event.changedTouches[0].clientX;
        ly = event.changedTouches[0].clientY;
      }

      reset();

      if (alreadyFired) return;
      if (!isMobileTouchDevice()) return;
      if (!bottomNavReady()) return;
      if (hasVisibleModal()) return;

      var dx = lx - sx;
      var dy = ly - sy;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);
      var elapsed = Date.now() - startedAt;

      if (absX < 64) return;
      if (absX < absY * 1.25) return;
      if (elapsed > 1400) return;

      navigateByDelta(dx);
    },
    { passive: true }
  );

  document.addEventListener(
    'touchcancel',
    function () {
      reset();
    },
    { passive: true }
  );
})();
