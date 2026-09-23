(function (global) {
  'use strict';

  if (global.__sitepassAndroidBackV1Bound) return;

  var App =
    global.Capacitor &&
    global.Capacitor.Plugins &&
    global.Capacitor.Plugins.App;

  if (!App || typeof App.addListener !== 'function') return;

  function contactScreenVisible() {
    var contact = document.getElementById('contactScreen');

    return !!contact &&
      !contact.classList.contains('hidden');
  }

  function memberRoomVisible() {
    var panel = document.getElementById('sp566MemberRoomPanel');

    return contactScreenVisible() &&
      !!panel &&
      !panel.classList.contains('hidden');
  }

  function fixedRoomVisible() {
    var panel = document.getElementById('sitepassChatRoomPanel');

    return contactScreenVisible() &&
      !!panel &&
      !panel.classList.contains('sitepass-chat-hidden');
  }

  function handleBackButton(event) {
    var canGoBack = !!(event && event.canGoBack);

    if (
      memberRoomVisible() &&
      global.SitePassMemberLinkChatV566 &&
      typeof global.SitePassMemberLinkChatV566.backToList === 'function'
    ) {
      global.SitePassMemberLinkChatV566.backToList();
      return;
    }

    if (
      fixedRoomVisible() &&
      typeof global.sitepassBackToChatList460 === 'function'
    ) {
      global.sitepassBackToChatList460();
      return;
    }

    if (
      canGoBack &&
      global.history &&
      typeof global.history.back === 'function'
    ) {
      global.history.back();
      return;
    }

    if (typeof App.exitApp === 'function') {
      App.exitApp();
    }
  }

  global.__sitepassAndroidBackV1Bound = true;

  try {
    var registration = App.addListener('backButton', handleBackButton);

    if (registration && typeof registration.then === 'function') {
      registration
        .then(function (handle) {
          global.__sitepassAndroidBackV1Handle = handle;
        })
        .catch(function (error) {
          global.__sitepassAndroidBackV1Bound = false;
          console.error('[SitePass Android Back V1]', error);
        });
    } else {
      global.__sitepassAndroidBackV1Handle = registration;
    }
  } catch (error) {
    global.__sitepassAndroidBackV1Bound = false;
    console.error('[SitePass Android Back V1]', error);
  }
})(window);