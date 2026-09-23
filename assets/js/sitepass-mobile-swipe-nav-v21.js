(function () {
  'use strict';

  if (window.__sitepassMobileSwipeNavV21Bound) return;
  window.__sitepassMobileSwipeNavV21Bound = true;

  var SCREEN_ORDER = [
    'homeScreen',
    'registerScreen',
    'listScreen',
    'contactScreen'
  ];

  var AXIS_LOCK_DISTANCE = 8;
  var HORIZONTAL_RATIO = 1.2;
  var COMMIT_DISTANCE = 38;
  var FLICK_DISTANCE = 24;
  var FLICK_VELOCITY = 0.45;
  var MAX_GESTURE_TIME = 1200;
  var EDGE_GUARD = 24;
  var NAVIGATION_LOCK_MS = 170;
  var CLICK_SUPPRESSION_DISTANCE = 12;

  var gesture = null;
  var dragFrame = 0;
  var navigationLockedUntil = 0;
  var suppressClickUntil = 0;
  var metrics = {
    starts: 0,
    horizontalLocks: 0,
    navigations: 0,
    verticalCancels: 0,
    blockedStarts: 0,
    clickSuppressions: 0,
    boundaryStops: 0,
    lastNavigation: null
  };

  function now() {
    try { return window.performance.now(); } catch (e) { return Date.now(); }
  }

  function isMobileTouchDevice() {
    try {
      return Number(navigator.maxTouchPoints || 0) > 0 && window.innerWidth <= 900;
    } catch (e) {
      return false;
    }
  }

  function isRendered(element) {
    if (!element || element.classList.contains('hidden')) return false;
    try {
      var style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    } catch (e) {
      return false;
    }
  }

  function currentVisibleScreenId() {
    var visible = [];
    var i;

    for (i = 0; i < SCREEN_ORDER.length; i += 1) {
      if (isRendered(document.getElementById(SCREEN_ORDER[i]))) {
        visible.push(SCREEN_ORDER[i]);
      }
    }

    if (visible.length === 1) return visible[0];
    if (!visible.length) return '';

    var active = document.querySelector('#sitepassBottomAppNav button.active[data-target]');
    var activeTarget = active ? String(active.getAttribute('data-target') || '') : '';
    return visible.indexOf(activeTarget) >= 0 ? activeTarget : '';
  }

  function bottomNavReady() {
    var nav = document.getElementById('sitepassBottomAppNav');
    return !!(
      nav &&
      isRendered(nav) &&
      typeof window.sitepassBottomNavGo === 'function'
    );
  }

  function hasVisibleBlockingLayer() {
    var layers = document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"], dialog,' +
      ' #cameraModal, #previewModal, #pageEditModal,' +
      ' .quick-setup-overlay, .my-account-gate-v462'
    );

    for (var i = 0; i < layers.length; i += 1) {
      var layer = layers[i];
      if (!isRendered(layer)) continue;
      try {
        var rect = layer.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
      } catch (e) {
        return true;
      }
    }

    return false;
  }

  function isHardBlockedTarget(target) {
    if (!target || typeof target.closest !== 'function') return true;

    return !!target.closest(
      'input, textarea, select, option,' +
      ' [contenteditable="true"],' +
      ' [role="slider"], [role="checkbox"], [role="radio"], [role="switch"],' +
      ' iframe, embed, object, video, audio, canvas,' +
      ' [data-sitepass-no-swipe="hard"], .sitepass-no-swipe-hard,' +
      ' .sitepass-bottom-nav'
    );
  }

  function armClickSuppression(duration) {
    suppressClickUntil = Math.max(suppressClickUntil, now() + duration);
  }

  function isInsideHorizontalScroller(target, screen) {
    var node = target;

    while (node && node !== screen && node !== document.body && node.nodeType === 1) {
      try {
        if (
          node.hasAttribute('data-horizontal-scroll') ||
          /(^|\s)(carousel|slider|horizontal-scroll)(\s|$)/i.test(String(node.className || ''))
        ) {
          return true;
        }

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

  function pointFromList(list, identifier) {
    if (!list) return null;
    for (var i = 0; i < list.length; i += 1) {
      if (identifier == null || list[i].identifier === identifier) return list[i];
    }
    return null;
  }

  function adjacentTarget(screenId, dx) {
    var index = SCREEN_ORDER.indexOf(screenId);
    if (index < 0 || !dx) return '';
    var nextIndex = dx < 0 ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= SCREEN_ORDER.length) return '';
    return SCREEN_ORDER[nextIndex];
  }

  function rememberInlineStyle(screen) {
    return {
      transform: screen.style.transform,
      transition: screen.style.transition,
      willChange: screen.style.willChange
    };
  }

  function restoreInlineStyle(screen, saved) {
    if (!screen || !saved) return;
    screen.style.transform = saved.transform;
    screen.style.transition = saved.transition;
    screen.style.willChange = saved.willChange;
  }

  function cancelDragFrame() {
    if (!dragFrame) return;
    window.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
  }

  function clearGesture(restoreStyle) {
    cancelDragFrame();
    if (restoreStyle && gesture) {
      restoreInlineStyle(gesture.screen, gesture.savedStyle);
    }
    gesture = null;
  }

  function renderDrag() {
    if (!gesture || !gesture.horizontalLocked || dragFrame) return;
    dragFrame = window.requestAnimationFrame(function () {
      dragFrame = 0;
      if (!gesture || !gesture.screen) return;

      var dx = gesture.lastX - gesture.startX;
      var target = adjacentTarget(gesture.screenId, dx);
      var distance = target
        ? Math.max(-36, Math.min(36, dx * 0.72))
        : Math.max(-14, Math.min(14, dx * 0.18));

      gesture.screen.style.transition = 'none';
      gesture.screen.style.willChange = 'transform';
      gesture.screen.style.transform = 'translate3d(' + distance.toFixed(2) + 'px,0,0)';
    });
  }

  function animateBackAndClear() {
    if (!gesture) return;
    var screen = gesture.screen;
    var saved = gesture.savedStyle;
    var movedX = Math.abs(gesture.lastX - gesture.startX);
    if (gesture.horizontalLocked && movedX >= CLICK_SUPPRESSION_DISTANCE) {
      armClickSuppression(320);
    }
    cancelDragFrame();
    gesture = null;

    if (!screen || !saved) return;
    screen.style.willChange = 'transform';
    screen.style.transition = 'transform 95ms cubic-bezier(.2,.8,.2,1)';
    screen.style.transform = 'translate3d(0,0,0)';
    window.setTimeout(function () {
      restoreInlineStyle(screen, saved);
    }, 110);
  }

  function animateIncoming(targetId, dx) {
    var incoming = document.getElementById(targetId);
    if (!isRendered(incoming)) return;
    var saved = rememberInlineStyle(incoming);
    var offset = dx < 0 ? 18 : -18;

    incoming.style.transition = 'none';
    incoming.style.willChange = 'transform';
    incoming.style.transform = 'translate3d(' + offset + 'px,0,0)';
    void incoming.offsetWidth;

    window.requestAnimationFrame(function () {
      incoming.style.transition = 'transform 125ms cubic-bezier(.2,.85,.25,1)';
      incoming.style.transform = 'translate3d(0,0,0)';
      window.setTimeout(function () {
        restoreInlineStyle(incoming, saved);
      }, 145);
    });
  }

  function openTarget(target) {
    if (
      target === 'contactScreen' &&
      typeof window.sitepassOpenAlertChatList532 === 'function'
    ) {
      return window.sitepassOpenAlertChatList532({ skipHistory: false });
    }
    return window.sitepassBottomNavGo(target);
  }

  function emitNavigation(detail) {
    try {
      window.dispatchEvent(new CustomEvent('sitepass:mobile-swipe-navigation-v21', {
        detail: detail
      }));
    } catch (e) {}
  }

  function commitNavigation(dx, dy, elapsed, reason) {
    if (!gesture || now() < navigationLockedUntil) return false;

    var from = gesture.screenId;
    var target = adjacentTarget(from, dx);
    if (!target) {
      metrics.boundaryStops += 1;
      animateBackAndClear();
      return false;
    }

    var currentScreen = gesture.screen;
    var currentStyle = gesture.savedStyle;
    cancelDragFrame();
    gesture = null;
    restoreInlineStyle(currentScreen, currentStyle);

    navigationLockedUntil = now() + NAVIGATION_LOCK_MS;
    armClickSuppression(420);
    var detail = {
      from: from,
      to: target,
      dx: Math.round(dx),
      dy: Math.round(dy),
      elapsedMs: Math.round(elapsed),
      reason: reason
    };

    try {
      openTarget(target);
      metrics.navigations += 1;
      metrics.lastNavigation = detail;
      animateIncoming(target, dx);
      emitNavigation(detail);
      return true;
    } catch (error) {
      navigationLockedUntil = 0;
      try { console.error('[SitePass V21 swipe] navigation failed', error); } catch (ignore) {}
      return false;
    }
  }

  function qualifiesForNavigation(dx, dy, elapsed) {
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (elapsed <= 0 || elapsed > MAX_GESTURE_TIME) return '';
    if (absX < absY * HORIZONTAL_RATIO) return '';
    if (absX >= COMMIT_DISTANCE) return 'distance';
    if (absX >= FLICK_DISTANCE && absX / elapsed >= FLICK_VELOCITY) return 'velocity';
    return '';
  }

  function onTouchStart(event) {
    clearGesture(true);

    if (!isMobileTouchDevice() || now() < navigationLockedUntil) return;
    if (!bottomNavReady() || hasVisibleBlockingLayer()) {
      metrics.blockedStarts += 1;
      return;
    }
    if (!event.touches || event.touches.length !== 1) return;

    var point = event.touches[0];
    var screenId = currentVisibleScreenId();
    var screen = document.getElementById(screenId);
    var target = event.target;

    if (SCREEN_ORDER.indexOf(screenId) < 0) return;
    if (!screen || !target || !screen.contains(target)) return;
    if (point.clientX <= EDGE_GUARD || point.clientX >= window.innerWidth - EDGE_GUARD) return;
    if (isHardBlockedTarget(target) || isInsideHorizontalScroller(target, screen)) {
      metrics.blockedStarts += 1;
      return;
    }

    gesture = {
      identifier: point.identifier,
      screenId: screenId,
      screen: screen,
      savedStyle: rememberInlineStyle(screen),
      startX: point.clientX,
      startY: point.clientY,
      lastX: point.clientX,
      lastY: point.clientY,
      startedAt: now(),
      horizontalLocked: false
    };
    metrics.starts += 1;
  }

  function onTouchMove(event) {
    if (!gesture) return;
    if (!event.touches || event.touches.length !== 1) {
      animateBackAndClear();
      return;
    }

    var point = pointFromList(event.touches, gesture.identifier);
    if (!point) {
      animateBackAndClear();
      return;
    }

    gesture.lastX = point.clientX;
    gesture.lastY = point.clientY;
    var dx = gesture.lastX - gesture.startX;
    var dy = gesture.lastY - gesture.startY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);

    if (!gesture.horizontalLocked) {
      if (absX < AXIS_LOCK_DISTANCE && absY < AXIS_LOCK_DISTANCE) return;
      if (absY > absX) {
        metrics.verticalCancels += 1;
        clearGesture(true);
        return;
      }
      if (absX >= AXIS_LOCK_DISTANCE && absX >= absY * HORIZONTAL_RATIO) {
        gesture.horizontalLocked = true;
        metrics.horizontalLocks += 1;
      }
    }

    if (!gesture || !gesture.horizontalLocked) return;
    if (event.cancelable && absX >= CLICK_SUPPRESSION_DISTANCE) event.preventDefault();
    renderDrag();

    var elapsed = now() - gesture.startedAt;
    var reason = qualifiesForNavigation(dx, dy, elapsed);
    if (reason) commitNavigation(dx, dy, elapsed, reason);
  }

  function onTouchEnd(event) {
    if (!gesture) return;
    var point = pointFromList(event.changedTouches, gesture.identifier);
    if (point) {
      gesture.lastX = point.clientX;
      gesture.lastY = point.clientY;
    }

    var dx = gesture.lastX - gesture.startX;
    var dy = gesture.lastY - gesture.startY;
    var elapsed = now() - gesture.startedAt;
    var reason = qualifiesForNavigation(dx, dy, elapsed);

    if (reason) commitNavigation(dx, dy, elapsed, reason);
    else animateBackAndClear();
  }

  function onTouchCancel() {
    if (!gesture) return;
    animateBackAndClear();
  }

  function onClickCapture(event) {
    if (now() > suppressClickUntil) return;
    metrics.clickSuppressions += 1;
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (event && typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchCancel, { passive: true });

  window.sitepassMobileSwipeNavV21 = {
    version: 'STEP81_V21_WORK_CONTENT_SWIPE_FIX',
    screenOrder: SCREEN_ORDER.slice(),
    getMetrics: function () {
      return JSON.parse(JSON.stringify(metrics));
    }
  };
})();
