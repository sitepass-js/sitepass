/* SitePass R10G F1 friend relationship UI
 * Scope: friend search/request/accept/reject/cancel/remove/block/unblock only.
 * F2 friend chat is intentionally NOT implemented here.
 */
(function () {
  'use strict';

  var FRIEND_EXPANDED_KEY =
    'sitepass_friend_section_expanded_r10h_v1';

  var state = {
    initialized: false,
    visible: false,
    expanded: false,
    loading: false,
    actionBusy: false,
    list: null,
    listError: '',
    searchBusy: false,
    searchQuery: '',
    searchResult: null,
    searchError: '',
    lastRefreshAt: 0,
    authUnsubscribe: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function html(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) {
    return html(value);
  }

  function readExpandedPreference() {
    try {
      return (
        window.localStorage.getItem(
          FRIEND_EXPANDED_KEY
        ) === '1'
      );
    } catch (error) {
      return false;
    }
  }

  function writeExpandedPreference(value) {
    try {
      window.localStorage.setItem(
        FRIEND_EXPANDED_KEY,
        value ? '1' : '0'
      );
    } catch (error) {}
  }

  function isMemberMode() {
    var authState = null;
    try {
      authState =
        window.SitePassAuthEvents &&
        typeof window.SitePassAuthEvents.getState === 'function'
          ? window.SitePassAuthEvents.getState()
          : null;
    } catch (error) {}

    if (
      authState &&
      Number(authState.revision || 0) > 0 &&
      String(authState.type || '') === 'SIGNED_OUT'
    ) {
      return false;
    }

    try {
      return !!(
        typeof window.isMemberLoggedIn === 'function' &&
        window.isMemberLoggedIn() &&
        !(
          typeof window.isAdminLoggedIn === 'function' &&
          window.isAdminLoggedIn()
        )
      );
    } catch (error) {
      return false;
    }
  }

  function contactVisible() {
    var screen = byId('contactScreen');
    if (!screen || screen.classList.contains('hidden')) return false;
    try {
      var style = window.getComputedStyle
        ? window.getComputedStyle(screen)
        : null;
      return !style || style.display !== 'none';
    } catch (error) {
      return true;
    }
  }

  async function rpc(name, params) {
    var api = window.SitePassSupabaseApi;
    if (!api || typeof api.rpc !== 'function') {
      throw new Error('Supabase RPC 연결을 확인하지 못했습니다.');
    }
    var result = await api.rpc(name, params || {});
    if (result && result.error) throw result.error;

    var data = result ? result.data : null;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {}
    }
    return data;
  }

  function errorText(error) {
    if (!error) return '알 수 없는 오류';
    return String(
      error.message ||
      error.details ||
      error.hint ||
      error.error_description ||
      error
    );
  }

  function friendlyError(error) {
    var message = errorText(error);

    if (message.indexOf('AUTH_REQUIRED') >= 0) {
      return '로그인 상태를 다시 확인해주세요.';
    }
    if (message.indexOf('ACTIVE_SESSION_REQUIRED') >= 0) {
      return '로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
    }
    if (message.indexOf('ACTIVE_MEMBER_REQUIRED') >= 0) {
      return '현재 친구 기능을 사용할 수 있는 정상 회원 상태가 아닙니다.';
    }
    if (
      message.indexOf('TARGET_LOGIN_ID_REQUIRED') >= 0 ||
      message.indexOf('TARGET_LOGIN_ID_INVALID') >= 0
    ) {
      return '친구의 로그인 아이디를 입력해주세요.';
    }
    if (message.indexOf('TARGET_LOGIN_ID_TOO_LONG') >= 0) {
      return '로그인 아이디를 다시 확인해주세요.';
    }
    if (message.indexOf('FRIEND_TARGET_NOT_FOUND_OR_NOT_ALLOWED') >= 0) {
      return '친구 요청을 보낼 수 없는 회원입니다.';
    }
    if (message.indexOf('FRIEND_REQUEST_ALREADY_PENDING_FROM_OTHER') >= 0) {
      return '상대방이 이미 친구 요청을 보냈습니다. 받은 요청에서 확인해주세요.';
    }
    if (message.indexOf('FRIEND_TARGET_BLOCKED_BY_ME') >= 0) {
      return '내가 차단한 회원입니다. 차단 목록에서 먼저 해제해주세요.';
    }
    if (message.indexOf('FRIEND_REQUEST_NOT_ACCEPTABLE') >= 0) {
      return '현재 수락할 수 없는 친구 요청입니다.';
    }
    if (message.indexOf('FRIEND_REQUEST_NOT_REJECTABLE') >= 0) {
      return '현재 거절할 수 없는 친구 요청입니다.';
    }
    if (message.indexOf('FRIEND_REQUEST_NOT_CANCELLABLE') >= 0) {
      return '현재 취소할 수 없는 친구 요청입니다.';
    }
    if (message.indexOf('FRIEND_RELATIONSHIP_NOT_REMOVABLE') >= 0) {
      return '현재 삭제할 수 없는 친구 관계입니다.';
    }
    if (message.indexOf('FRIEND_RELATIONSHIP_NOT_UNBLOCKABLE') >= 0) {
      return '현재 차단해제할 수 없는 관계입니다.';
    }
    if (message.indexOf('FRIEND_RELATIONSHIP_NOT_FOUND_OR_FORBIDDEN') >= 0) {
      return '친구 관계를 찾을 수 없거나 권한이 없습니다.';
    }
    if (message.indexOf('FRIEND_ACTION_INVALID') >= 0) {
      return '친구 처리 방법을 확인해주세요.';
    }

    return message;
  }

  function listArray(key) {
    return state.list && Array.isArray(state.list[key])
      ? state.list[key]
      : [];
  }

  function counts() {
    return {
      friends: listArray('friends').length,
      incoming: listArray('incomingRequests').length,
      outgoing: listArray('outgoingRequests').length,
      blocked: listArray('blockedByMe').length
    };
  }

  function ensureUi() {
    var panel = byId('sitepassChatListPanel');
    var roomList = byId('sitepassChatRoomList');
    if (!panel || !roomList) return false;

    var section = byId('spF1FriendCenter');
    if (!section) {
      section = document.createElement('section');
      section.id = 'spF1FriendCenter';
      section.className = 'sp-f1-friend-center';
      section.setAttribute('aria-label', '친구채팅 및 친구 관리');
      section.innerHTML =
        '<div class="sp-f1-friend-summary">' +
          '<div class="sp-f1-friend-summary-main">' +
            '<span class="sp-f1-friend-icon" aria-hidden="true">👥</span>' +
            '<span><b>친구채팅</b><small id="spF1FriendSummaryText">친구 기능을 불러오는 중입니다.</small></span>' +
          '</div>' +
          '<div class="sp-f1-friend-summary-actions">' +
            '<button id="spF1FriendFindButton" type="button" class="sp-f1-friend-find">친구추가하기 +</button>' +
            '<button id="spF1FriendToggle" type="button" class="sp-f1-friend-toggle" aria-expanded="false">열기</button>' +
          '</div>' +
        '</div>' +
        '<div id="spF1FriendBody" class="sp-f1-friend-body" hidden>' +
          '<div id="spF1FriendSearchResult" class="sp-f1-friend-search-result" aria-live="polite"></div>' +
          '<div id="spF1FriendStatus" class="sp-f1-friend-status" aria-live="polite"></div>' +
          '<div id="spF1FriendRequestAlerts" class="sp-f1-friend-request-alerts" aria-live="polite"></div>' +
          '<div id="spF1FriendsList" class="sp-f1-friend-list sp-f1-friend-chat-list"></div>' +
        '</div>';

      var memberSection = byId('sp566MemberChatSection');
      if (memberSection && memberSection.parentNode === panel) {
        panel.insertBefore(section, memberSection.nextSibling);
      } else {
        panel.insertBefore(section, roomList.nextSibling);
      }

      byId('spF1FriendToggle').addEventListener('click', function () {
        state.expanded = !state.expanded;
        writeExpandedPreference(state.expanded);
        render();
        if (state.expanded) {
          refresh(true);
        }
      });

      byId('spF1FriendFindButton').addEventListener('click', function () {
        state.expanded = true;
        writeExpandedPreference(true);
        render();

        var topInput = byId('sp641ChatListSearch');
        if (topInput) {
          topInput.focus();
          try {
            topInput.select();
          } catch (error) {}
        }
      });

      section.addEventListener('click', function (event) {
        var button =
          event.target && event.target.closest
            ? event.target.closest('button[data-friend-action]')
            : null;
        if (!button || state.actionBusy) return;

        var action = String(button.getAttribute('data-friend-action') || '');
        var relationshipId = String(button.getAttribute('data-relationship-id') || '');
        if (action === 'request') {
          requestFriend();
          return;
        }

        if (action === 'incoming-focus') {
          var block = byId('spF1FriendRequestAlerts');
          if (block && typeof block.scrollIntoView === 'function') {
            block.scrollIntoView({ block: 'nearest' });
          }
          return;
        }

        if (!relationshipId) return;

        if (action === 'remove') {
          if (!window.confirm('이 친구를 삭제할까요?')) return;
        } else if (action === 'block') {
          if (!window.confirm('이 회원을 차단할까요? 차단하면 친구 관계가 해제되고 새 친구 요청도 받을 수 없습니다.')) return;
        } else if (action === 'reject') {
          if (!window.confirm('이 친구 요청을 거절할까요?')) return;
        }

        act(relationshipId, action);
      });
    }

    var memberSectionNow = byId('sp566MemberChatSection');
    if (
      section &&
      memberSectionNow &&
      memberSectionNow.parentNode === panel &&
      section.previousElementSibling !== memberSectionNow
    ) {
      panel.insertBefore(section, memberSectionNow.nextSibling);
    }

    ensureBlockedAccountUi();

    return true;
  }

  function ensureBlockedAccountUi() {
    var screen = byId('myAccountScreen');
    if (!screen) return false;

    var summary = screen.querySelector('.my-account-summary-v462');
    if (!summary) return false;

    var menu = byId('spF1BlockedAccountMenu');
    var panel = byId('spF1BlockedAccountPanel');

    if (!menu) {
      menu = document.createElement('button');
      menu.id = 'spF1BlockedAccountMenu';
      menu.type = 'button';
      menu.className = 'my-account-menu-row-v462';
      menu.innerHTML =
        '<span>차단한 아이디 보기</span>' +
        '<em id="spF1BlockedAccountCount">0</em>';
      summary.appendChild(menu);
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'spF1BlockedAccountPanel';
      panel.className = 'my-account-compact-panel-v462 hidden sp-f1-blocked-account-panel';
      panel.innerHTML =
        '<div id="spF1BlockedAccountList" class="sp-f1-blocked-account-list"></div>';
      summary.appendChild(panel);

      panel.addEventListener('click', function (event) {
        var button =
          event.target && event.target.closest
            ? event.target.closest('button[data-friend-unblock-id]')
            : null;

        if (!button || state.actionBusy) return;

        var relationshipId =
          String(
            button.getAttribute('data-friend-unblock-id') || ''
          ).trim();

        if (!relationshipId) return;

        act(relationshipId, 'unblock');
      });
    }

    if (!menu.dataset.spF1Bound) {
      menu.dataset.spF1Bound = '1';
      menu.addEventListener('click', function () {
        panel.classList.toggle('hidden');

        if (!panel.classList.contains('hidden')) {
          refresh(true);
        }

        renderBlockedAccount();
      });
    }

    return true;
  }

  function renderBlockedAccount() {
    ensureBlockedAccountUi();

    var countEl = byId('spF1BlockedAccountCount');
    var listEl = byId('spF1BlockedAccountList');
    var blocked = listArray('blockedByMe');

    if (countEl) {
      countEl.textContent = String(blocked.length);
    }

    if (!listEl) return;

    if (!blocked.length) {
      listEl.innerHTML =
        '<div class="sp-f1-friend-empty">차단한 아이디가 없습니다.</div>';
      return;
    }

    listEl.innerHTML =
      blocked.map(function (row) {
        row = row || {};

        var relationshipId =
          String(row.relationshipId || '');
        var name =
          String(row.displayName || 'SitePass 회원');
        var loginId =
          String(row.loginId || '');

        return (
          '<div class="sp-f1-blocked-account-row">' +
            '<span><b>' + html(name) + '</b><small>' +
              html(loginId) +
            '</small></span>' +
            '<button type="button" data-friend-unblock-id="' +
              attr(relationshipId) +
            '">차단 해제</button>' +
          '</div>'
        );
      }).join('');
  }

  function renderSummary() {
    var summary = byId('spF1FriendSummaryText');
    var toggle = byId('spF1FriendToggle');
    var body = byId('spF1FriendBody');
    var c = counts();

    if (summary) {
      if (!isMemberMode()) {
        summary.textContent = '로그인 후 사용할 수 있습니다.';
      } else if (state.listError) {
        summary.textContent = '친구 목록을 다시 불러와주세요.';
      } else if (!state.list) {
        summary.textContent = state.loading
          ? '친구 기능을 불러오는 중입니다.'
          : '친구를 추가하고 관리할 수 있습니다.';
      } else {
        var parts = ['친구 ' + c.friends + '명'];
        if (c.incoming > 0) {
          parts.push('친구 요청 ' + c.incoming + '건');
        }
        summary.textContent = parts.join(' · ');
      }
    }

    var findButton = byId('spF1FriendFindButton');
    if (findButton) {
      findButton.disabled = !isMemberMode();
    }

    if (toggle) {
      toggle.setAttribute('aria-expanded', state.expanded ? 'true' : 'false');
      toggle.textContent = state.expanded ? '닫기' : '열기';
      toggle.disabled = !isMemberMode();
    }

    if (body) {
      body.hidden = !state.expanded;
    }
  }

  function rowHtml(row, kind) {
    row = row || {};

    var relationshipId =
      String(row.relationshipId || '');
    var loginId =
      String(row.loginId || '');

    if (kind === 'incoming') {
      var requestName =
        String(row.maskedName || 'SitePass 회원');

      return (
        '<div class="sp-f1-friend-request-card">' +
          '<div class="sp-f1-friend-request-title">친구 요청</div>' +
          '<div class="sp-f1-friend-person">' +
            '<span class="sp-f1-friend-avatar" aria-hidden="true">' +
              html((requestName || '회').charAt(0)) +
            '</span>' +
            '<span><b>' + html(requestName) + '</b>' +
              '<small>' + html(loginId) + '</small></span>' +
          '</div>' +
          '<div class="sp-f1-friend-actions">' +
            '<button type="button" data-friend-action="accept" data-relationship-id="' +
              attr(relationshipId) +
            '">수락</button>' +
            '<button type="button" class="secondary" data-friend-action="reject" data-relationship-id="' +
              attr(relationshipId) +
            '">거절</button>' +
          '</div>' +
        '</div>'
      );
    }

    if (kind === 'friend') {
      var friendName =
        String(row.displayName || 'SitePass 회원');

      return (
        '<div class="sp-f1-friend-row sp-f1-friend-chat-row">' +
          '<div class="sp-f1-friend-person">' +
            '<span class="sp-f1-friend-avatar" aria-hidden="true">' +
              html((friendName || '회').charAt(0)) +
            '</span>' +
            '<span>' +
              '<b>' +
                html(friendName) +
                (loginId ? ' · ' + html(loginId) : '') +
              '</b>' +
              '<small>친구</small>' +
            '</span>' +
          '</div>' +
          '<details class="sp-f1-friend-more">' +
            '<summary aria-label="친구 관리">⋯</summary>' +
            '<div class="sp-f1-friend-more-menu">' +
              '<button type="button" class="secondary" data-friend-action="remove" data-relationship-id="' +
                attr(relationshipId) +
              '">친구 삭제</button>' +
              '<button type="button" class="danger-ghost" data-friend-action="block" data-relationship-id="' +
                attr(relationshipId) +
              '">차단</button>' +
            '</div>' +
          '</details>' +
        '</div>'
      );
    }

    return '';
  }

  function emptyHtml(text) {
    return '<div class="sp-f1-friend-empty">' + html(text) + '</div>';
  }

  function renderLists() {
    var incoming =
      listArray('incomingRequests');
    var friends =
      listArray('friends');

    var alertsEl =
      byId('spF1FriendRequestAlerts');
    var friendsEl =
      byId('spF1FriendsList');

    if (alertsEl) {
      alertsEl.innerHTML =
        incoming.length
          ? incoming.map(function (row) {
              return rowHtml(row, 'incoming');
            }).join('')
          : '';
    }

    if (friendsEl) {
      friendsEl.innerHTML =
        friends.length
          ? friends.map(function (row) {
              return rowHtml(row, 'friend');
            }).join('')
          : emptyHtml('등록된 친구가 없습니다.');
    }

    renderBlockedAccount();
  }

  function renderSearch() {
    var resultEl = byId('spF1FriendSearchResult');
    if (!resultEl) return;

    if (state.searchError) {
      resultEl.innerHTML =
        '<div class="sp-f1-friend-result error">' +
          html(state.searchError) +
        '</div>';
      return;
    }

    var r = state.searchResult;
    if (!r) {
      resultEl.innerHTML = '';
      return;
    }

    if (r.ambiguous === true) {
      resultEl.innerHTML =
        '<div class="sp-f1-friend-result">' +
          '<span><b>동명이인이 있습니다.</b><small>아이디 또는 전화번호로 검색해주세요.</small></span>' +
        '</div>';
      return;
    }

    if (r.found !== true || r.exactMatch !== true) {
      resultEl.innerHTML =
        '<div class="sp-f1-friend-result">' +
          '<span><b>검색 결과 없음</b><small>로그인 아이디, 전체 전화번호 또는 전체 이름을 정확히 입력해주세요.</small></span>' +
        '</div>';
      return;
    }

    var name = String(r.maskedName || 'SitePass 회원');
    var relationState = String(r.relationState || '');
    var reason = String(r.reason || '');
    var action = '';
    var stateText = '';

    if (relationState === 'none' && r.eligible === true) {
      stateText = '친구 요청 가능';
      action =
        '<button type="button" data-friend-action="request">친구 요청</button>';
    } else if (relationState === 'requested_by_me') {
      stateText = '친구 요청을 보냈습니다.';
    } else if (relationState === 'requested_to_me') {
      stateText = '이 회원에게 받은 친구 요청이 있습니다.';
      action =
        '<button type="button" class="secondary" data-friend-action="incoming-focus">요청 보기</button>';
    } else if (relationState === 'accepted') {
      stateText = '이미 친구입니다.';
    } else if (relationState === 'blocked_by_me') {
      stateText = '내가 차단한 회원입니다.';
    } else if (relationState === 'self' || reason === 'self') {
      stateText = '내 계정은 친구로 추가할 수 없습니다.';
    } else {
      stateText = '현재 친구로 추가할 수 없습니다.';
    }

    resultEl.innerHTML =
      '<div class="sp-f1-friend-result">' +
        '<div class="sp-f1-friend-person">' +
          '<span class="sp-f1-friend-avatar" aria-hidden="true">' + html((name || '회').charAt(0)) + '</span>' +
          '<span><b>' + html(name) + '</b><small>' + html(stateText) + '</small></span>' +
        '</div>' +
        '<div class="sp-f1-friend-actions">' + action + '</div>' +
      '</div>';
  }

  function renderStatus() {
    var el = byId('spF1FriendStatus');
    if (!el) return;

    if (state.listError) {
      el.textContent = state.listError;
      el.classList.add('error');
      return;
    }

    el.classList.remove('error');
    if (state.loading) {
      el.textContent = '친구 목록을 불러오는 중입니다.';
    } else if (state.actionBusy) {
      el.textContent = '친구 관계를 처리하는 중입니다.';
    } else {
      el.textContent = '';
    }
  }

  function render() {
    if (!ensureUi()) return;
    renderSummary();
    renderSearch();
    renderStatus();
    renderLists();
    renderBlockedAccount();

    var section = byId('spF1FriendCenter');
    if (section) {
      section.classList.toggle('sp-f1-friend-signed-out', !isMemberMode());
    }
  }

  async function refresh(force, silent) {
    if (!ensureUi()) return null;

    if (!isMemberMode()) {
      state.list = null;
      state.listError = '';
      state.searchResult = null;
      state.searchError = '';
      if (!silent) render();
      return null;
    }

    var now = Date.now();
    if (
      !force &&
      state.list &&
      now - state.lastRefreshAt < 4000
    ) {
      if (!silent) render();
      return state.list;
    }

    if (state.loading) return null;

    state.loading = true;
    if (!silent) {
      state.listError = '';
      render();
    }

    try {
      var result = await rpc('sitepass_list_my_friends_v1', {});
      if (
        !result ||
        result.ok !== true ||
        !Array.isArray(result.friends) ||
        !Array.isArray(result.incomingRequests) ||
        !Array.isArray(result.outgoingRequests) ||
        !Array.isArray(result.blockedByMe)
      ) {
        throw new Error('친구 목록 결과를 확인하지 못했습니다.');
      }

      var changed =
        JSON.stringify(state.list || null) !==
        JSON.stringify(result);

      state.list = result;
      state.lastRefreshAt = Date.now();
      state.listError = '';

      if (!silent || changed) {
        render();
      }

      return result;
    } catch (error) {
      state.listError = friendlyError(error);
      if (!silent) render();
      return null;
    } finally {
      state.loading = false;
      if (!silent) render();
    }
  }

  async function search(queryOverride) {
    if (!isMemberMode() || state.searchBusy || state.actionBusy) return null;

    var topInput = byId('sp641ChatListSearch');
    var query = String(
      queryOverride != null
        ? queryOverride
        : (topInput ? topInput.value : '')
    ).trim();

    state.searchQuery = query;
    state.searchResult = null;
    state.searchError = '';

    if (!query) {
      state.searchError = '로그인 아이디, 전체 전화번호 또는 전체 이름을 입력해주세요.';
      render();
      return null;
    }

    state.searchBusy = true;
    render();

    var finalResult = null;

    try {
      var result = await rpc(
        'sitepass_find_friend_target_v2',
        { p_query: query }
      );
      if (!result || result.ok !== true) {
        throw new Error('친구 검색 결과를 확인하지 못했습니다.');
      }

      state.searchResult = result;
      state.searchError = '';
      finalResult = result;

      if (result.found === true) {
        state.expanded = true;
        writeExpandedPreference(true);
      }
    } catch (error) {
      state.searchError = friendlyError(error);
    } finally {
      state.searchBusy = false;
      render();
    }

    return finalResult;
  }

  function clearSearchResult() {
    state.searchQuery = '';
    state.searchResult = null;
    state.searchError = '';
    state.searchBusy = false;
    render();
  }

  async function requestFriend(loginId) {
    if (!isMemberMode() || state.actionBusy) return false;

    var target = String(loginId || state.searchQuery || '').trim();
    if (!target) return false;

    state.actionBusy = true;
    state.listError = '';
    render();

    try {
      var result = await rpc(
        'sitepass_request_friend_v2',
        { p_query: target }
      );
      if (!result || result.ok !== true) {
        throw new Error('친구 요청 결과를 확인하지 못했습니다.');
      }

      await refresh(true);

      if (state.searchQuery) {
        try {
          state.searchResult = await rpc(
            'sitepass_find_friend_target_v2',
            { p_query: state.searchQuery }
          );
        } catch (ignore) {}
      }

      try {
        window.dispatchEvent(
          new CustomEvent('sitepass-friend-relationship-updated-v1')
        );
      } catch (ignore) {}

    } catch (error) {
      state.listError = friendlyError(error);
    } finally {
      state.actionBusy = false;
      render();
    }

    return false;
  }

  async function act(relationshipId, action) {
    if (!isMemberMode() || state.actionBusy) return false;

    var id = String(relationshipId || '').trim();
    var actionName = String(action || '').trim();
    if (!id || !actionName) return false;

    state.actionBusy = true;
    state.listError = '';
    render();

    try {
      var result = await rpc(
        'sitepass_act_friend_relationship_v1',
        {
          p_relationship_id: id,
          p_action: actionName
        }
      );

      if (!result || result.ok !== true) {
        throw new Error('친구 관계 처리 결과를 확인하지 못했습니다.');
      }

      await refresh(true);

      if (state.searchQuery) {
        try {
          state.searchResult = await rpc(
            'sitepass_find_friend_target_v2',
            { p_query: state.searchQuery }
          );
        } catch (ignore) {
          state.searchResult = null;
        }
      }

      try {
        window.dispatchEvent(
          new CustomEvent('sitepass-friend-relationship-updated-v1')
        );
      } catch (ignore) {}

    } catch (error) {
      state.listError = friendlyError(error);
    } finally {
      state.actionBusy = false;
      render();
    }

    return false;
  }

  function clearForSignOut() {
    state.list = null;
    state.listError = '';
    state.searchQuery = '';
    state.searchResult = null;
    state.searchError = '';
    state.loading = false;
    state.searchBusy = false;
    state.actionBusy = false;
    state.lastRefreshAt = 0;

    render();
  }

  function init() {
    if (!ensureUi()) return;

    if (!state.initialized) {
      state.initialized = true;
      state.expanded = readExpandedPreference();

      if (
        window.SitePassAuthEvents &&
        typeof window.SitePassAuthEvents.subscribe === 'function'
      ) {
        state.authUnsubscribe =
          window.SitePassAuthEvents.subscribe(function (event) {
            if (event && event.type === 'SIGNED_OUT') {
              clearForSignOut();
              return;
            }
            if (event && event.type === 'SIGNED_IN') {
              setTimeout(function () {
                refresh(true);
              }, 0);
            }
          });
      }

      var contact = byId('contactScreen');
      if (contact && typeof MutationObserver === 'function') {
        var observer = new MutationObserver(function () {
          if (contactVisible() && isMemberMode()) {
            refresh(false, true);
          }
        });
        observer.observe(contact, {
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      }

      window.addEventListener('focus', function () {
        if (contactVisible() && isMemberMode()) {
          refresh(false, true);
        }
      });

      document.addEventListener('visibilitychange', function () {
        if (
          !document.hidden &&
          contactVisible() &&
          isMemberMode()
        ) {
          refresh(false, true);
        }
      });

      setInterval(function () {
        if (
          contactVisible() &&
          isMemberMode() &&
          !document.hidden
        ) {
          refresh(false, true);
        }
      }, 15000);
    }

    if (isMemberMode()) refresh(true);
  }

  window.SitePassFriendCenterV1 = {
    refresh: refresh,
    search: search,
    searchExact: search,
    searchLoginId: search,
    clearSearchResult: clearSearchResult,
    requestFriend: requestFriend,
    act: act,
    getState: function () {
      return {
        expanded: state.expanded,
        loading: state.loading,
        actionBusy: state.actionBusy,
        searchBusy: state.searchBusy,
        list: state.list,
        listError: state.listError,
        searchResult: state.searchResult,
        searchError: state.searchError
      };
    }
  };

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      init();
      setTimeout(init, 300);
      setTimeout(init, 1200);
    },
    { once: true }
  );

  window.addEventListener('pageshow', function () {
    setTimeout(init, 100);
  });

  window.__SITEPASS_FRIEND_CENTER_V1_READY = true;
})();
