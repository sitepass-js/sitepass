(function () {
  'use strict';

  var contactWasVisible = false;
  var friendSearchQuery = '';
  var friendSearchMatched = false;
  var friendSearchPending = false;

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[·ㆍ.,\-_/]/g, '');
  }

  function roomItems() {
    var unifiedRoot = document.getElementById('spR10NOUnifiedList');
    if (unifiedRoot) {
      return Array.prototype.slice.call(
        unifiedRoot.querySelectorAll('.sp-r10no-unified-card')
      );
    }

    var fixed = Array.prototype.slice.call(document.querySelectorAll('#sitepassChatRoomList .sitepass-chat-room-item'));
    var members = Array.prototype.slice.call(document.querySelectorAll('#sp566MemberRoomList .sp566-member-room-button'));
    return fixed.concat(members);
  }

  function ensureEmptyNode() {
    var panel = document.getElementById('sitepassChatListPanel');
    if (!panel) return null;
    var node = document.getElementById('sp641ChatSearchEmpty');
    if (!node) {
      node = document.createElement('div');
      node.id = 'sp641ChatSearchEmpty';
      node.className = 'sp641-search-empty';
      node.textContent = '검색 결과가 없습니다.';
      var unified = document.getElementById('spR10NOUnifiedList');
      var memberSection = document.getElementById('sp566MemberChatSection');
      if (unified && unified.parentNode === panel) {
        panel.insertBefore(node, unified.nextSibling);
      } else {
        panel.insertBefore(node, memberSection ? memberSection.nextSibling : null);
      }
    }
    return node;
  }

  function clearFilterState() {
    roomItems().forEach(function (item) {
      item.classList.remove('sp641-search-hidden');
    });
    var empty = ensureEmptyNode();
    if (empty) empty.classList.remove('show');
  }

  function clearFriendSearchState(clearFriendUi) {
    friendSearchQuery = '';
    friendSearchMatched = false;
    friendSearchPending = false;

    if (
      clearFriendUi &&
      window.SitePassFriendCenterV1 &&
      typeof window.SitePassFriendCenterV1.clearSearchResult === 'function'
    ) {
      window.SitePassFriendCenterV1.clearSearchResult();
    }
  }

  function resetSearch() {
    var input = document.getElementById('sp641ChatListSearch');
    if (input) {
      input.value = '';
      input.blur();
    }
    clearFriendSearchState(true);
    clearFilterState();
  }

  function applyFilter() {
    var input = document.getElementById('sp641ChatListSearch');
    if (!input) return;

    var rawQuery = String(input.value || '').trim();
    var query = normalize(rawQuery);
    var visible = 0;

    roomItems().forEach(function (item) {
      var haystack = normalize(
        item.textContent + ' ' + (item.getAttribute('title') || '')
      );
      var match = !query || haystack.indexOf(query) >= 0;
      item.classList.toggle('sp641-search-hidden', !match);
      if (match) visible += 1;
    });

    var friendMatchedForCurrentQuery =
      !!rawQuery &&
      friendSearchQuery === rawQuery &&
      friendSearchMatched;

    var friendPendingForCurrentQuery =
      !!rawQuery &&
      friendSearchQuery === rawQuery &&
      friendSearchPending;

    var empty = ensureEmptyNode();
    if (empty) {
      empty.classList.toggle(
        'show',
        !!query &&
        visible === 0 &&
        !friendMatchedForCurrentQuery &&
        !friendPendingForCurrentQuery
      );
    }
  }

  function handleInput() {
    var input = document.getElementById('sp641ChatListSearch');
    if (!input) return;

    var rawQuery = String(input.value || '').trim();

    if (friendSearchQuery && friendSearchQuery !== rawQuery) {
      clearFriendSearchState(true);
    }

    applyFilter();
  }

  async function runUnifiedSearch() {
    var input = document.getElementById('sp641ChatListSearch');
    if (!input) return false;

    var rawQuery = String(input.value || '').trim();
    applyFilter();

    /* R10NO: 상단 검색은 현재 통합목록 필터 전용.
     * 친구 신규 exact 검색은 [친구추가하기 +] 별도 창에서 수행한다.
     */
    if (document.getElementById('spR10NOUnifiedList')) {
      clearFriendSearchState(true);
      return false;
    }

    if (!rawQuery) {
      clearFriendSearchState(true);
      return false;
    }

    var friendApi = window.SitePassFriendCenterV1;
    if (
      !friendApi ||
      typeof friendApi.searchLoginId !== 'function'
    ) {
      return false;
    }

    friendSearchQuery = rawQuery;
    friendSearchMatched = false;
    friendSearchPending = true;
    applyFilter();

    try {
      var result = await friendApi.searchLoginId(rawQuery);
      friendSearchMatched = !!(result && result.found === true);
    } catch (error) {
      friendSearchMatched = false;
    } finally {
      friendSearchPending = false;
      applyFilter();
    }

    return false;
  }

  function isContactVisible() {
    var contact = document.getElementById('contactScreen');
    if (!contact) return false;
    if (contact.classList.contains('hidden')) return false;
    if (contact.hidden || contact.getAttribute('aria-hidden') === 'true') return false;
    return window.getComputedStyle(contact).display !== 'none';
  }

  function handleScreenVisibility() {
    var visible = isContactVisible();
    if (contactWasVisible && !visible) resetSearch();
    contactWasVisible = visible;
  }

  function bindScreenObserver() {
    var contact = document.getElementById('contactScreen');
    if (!contact || contact.dataset.sp643VisibilityBound) return;
    contact.dataset.sp643VisibilityBound = '1';
    contactWasVisible = isContactVisible();
    var observer = new MutationObserver(function () {
      window.requestAnimationFrame(handleScreenVisibility);
    });
    observer.observe(contact, {
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
    });
  }

  function bindNavigationFallback() {
    if (document.body.dataset.sp643NavResetBound) return;
    document.body.dataset.sp643NavResetBound = '1';
    document.addEventListener('click', function (event) {
      var button = event.target && event.target.closest
        ? event.target.closest('[data-target]')
        : null;
      if (!button) return;
      var target = button.getAttribute('data-target') || '';
      if (target && target !== 'contactScreen') resetSearch();
    }, true);
  }

  function install() {
    var input = document.getElementById('sp641ChatListSearch');
    var panel = document.getElementById('sitepassChatListPanel');
    if (!input || !panel) return false;

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');

    if (!input.dataset.sp641Bound) {
      input.dataset.sp641Bound = '1';
      input.addEventListener('input', handleInput);
      input.addEventListener('search', handleInput);
      input.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        runUnifiedSearch();
      });
    }

    if (!panel.dataset.sp641ObserverBound) {
      panel.dataset.sp641ObserverBound = '1';
      var listObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
          var currentInput = document.getElementById('sp641ChatListSearch');
          if (currentInput && currentInput.value) applyFilter();
          else clearFilterState();
        });
      });
      listObserver.observe(panel, { childList: true, subtree: true, characterData: true });
    }

    bindScreenObserver();
    bindNavigationFallback();
    handleScreenVisibility();
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  window.addEventListener('pageshow', function () {
    resetSearch();
    install();
  });
  window.addEventListener('sitepass:screen-changed', function () {
    handleScreenVisibility();
    install();
  });
})();
