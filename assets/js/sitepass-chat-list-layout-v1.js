/* SitePass R10NO unified alert/chat list controller
 * Scope:
 * - one integrated list: 전체 / 알림·문의 / 친구 / 연동회원
 * - search opens only on demand
 * - separate friend-add exact-search dialog
 * - member cards use v5 counterpartLoginId when available
 * - existing fixed-room/member/friend RPC, message, attachment, Push, Realtime logic is reused
 * - F2 friend chat is NOT implemented here
 */
(function () {
  'use strict';

  var state = {
    initialized: false,
    activeTab: 'all',
    searchOpen: false,
    refreshTimer: 0,
    fixedObserver: null,
    memberObserver: null,
    friendObserver: null,
    friendQuery: '',
    friendResult: null,
    friendBusy: false,
    linkedBulkOpen: false,
    linkedBulkLoading: false,
    linkedBulkSending: false,
    linkedBulkTargets: [],
    linkedBulkSelected: {},
    linkedBulkSearch: '',
    linkedBulkMessage: '',
    linkedBulkBatchIdempotencyKey: '',
    linkedBulkBatchRequestKey: '',
    linkedBulkBatchId: '',
    linkedBulkBatchStatus: null,
    linkedBulkPollSerial: 0,
    linkedBulkResult: null,
    linkedBulkError: ''
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? '' : value);
  }

  function html(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) {
    return html(value);
  }

  function parseRpcDataR10NO(value) {
    if (typeof value !== 'string') return value;
    var raw = value.trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return value;
    }
  }

  async function rpcR10NO(name, params) {
    var api = window.SitePassSupabaseApi;
    if (!api || typeof api.rpc !== 'function') {
      throw new Error('Supabase RPC 연결을 확인하지 못했습니다.');
    }

    var result = await api.rpc(name, params || {});
    if (result && result.error) throw result.error;
    return parseRpcDataR10NO(result ? result.data : null);
  }

  function newIdempotencyKeyR10NO() {
    try {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID === 'function'
      ) {
        return window.crypto.randomUUID();
      }
    } catch (error) {}

    if (
      !window.crypto ||
      typeof window.crypto.getRandomValues !== 'function'
    ) {
      throw new Error('안전한 요청 식별키를 만들 수 없습니다.');
    }

    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;

    var hex = Array.from(bytes).map(function (value) {
      return value.toString(16).padStart(2, '0');
    });

    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-');
  }

  function linkedBulkTargetId(target) {
    return text(
      target &&
      (
        target.recipientMemberUuid ||
        target.recipient_member_uuid ||
        target.linkedMemberUuid ||
        target.linked_member_uuid
      )
    ).trim();
  }

  function linkedBulkEquipmentLabel(target) {
    var rows =
      target && Array.isArray(target.equipment)
        ? target.equipment
        : [];

    var seen = {};
    var values = rows.map(function (item) {
      var no = text(
        item && (item.equipmentNo || item.equipment_no)
      ).trim();
      var name = text(
        item &&
        (
          item.equipmentName ||
          item.equipment_name ||
          '장비'
        )
      ).trim() || '장비';
      var id = text(
        item && (item.equipmentId || item.equipment_id)
      ).trim();
      var key = id || no || name;

      if (!key || seen[key]) return null;
      seen[key] = true;
      return { no: no, name: name };
    }).filter(Boolean);

    if (!values.length) return '활성 연동장비';

    values.sort(function (a, b) {
      return (a.no || a.name).localeCompare(
        b.no || b.name,
        'ko'
      );
    });

    var first = values[0];
    var label =
      first.name +
      (first.no ? ' ' + first.no : '');

    if (values.length > 1) {
      label += ' 외 ' + (values.length - 1) + '대';
    }

    return label;
  }

  function linkedBulkVisibleTargets() {
    var query =
      text(state.linkedBulkSearch)
        .trim()
        .toLowerCase();

    return (
      Array.isArray(state.linkedBulkTargets)
        ? state.linkedBulkTargets
        : []
    ).filter(function (target) {
      if (!query) return true;

      var equipmentRows =
        target && Array.isArray(target.equipment)
          ? target.equipment
          : [];

      var searchable = [
        target && target.displayName,
        linkedBulkEquipmentLabel(target),
        equipmentRows.map(function (item) {
          return [
            item && (item.equipmentName || item.equipment_name),
            item && (item.equipmentNo || item.equipment_no)
          ].join(' ');
        }).join(' ')
      ].join(' ').toLowerCase();

      return searchable.indexOf(query) >= 0;
    });
  }

  function linkedBulkSelectedIds() {
    return Object.keys(
      state.linkedBulkSelected || {}
    ).filter(function (memberId) {
      return state.linkedBulkSelected[memberId] === true;
    });
  }

  function linkedBulkErrorText(error) {
    var raw = text(
      error &&
      (
        error.message ||
        error.details ||
        error.hint ||
        error.code ||
        error
      )
    ).trim();

    if (!raw) return '처리 중 오류가 발생했습니다.';

    var upper = raw.toUpperCase();

    if (upper.indexOf('AUTH_REQUIRED') >= 0) {
      return '로그인이 필요합니다.';
    }
    if (upper.indexOf('ACTIVE_MEMBER_REQUIRED') >= 0) {
      return '현재 회원 상태에서는 사용할 수 없습니다.';
    }
    if (upper.indexOf('BROADCAST_TARGET_NOT_ALLOWED') >= 0) {
      return '연동 상태가 변경된 대상이 있어 다시 확인해야 합니다.';
    }
    if (upper.indexOf('BROADCAST_TARGET_LIMIT_EXCEEDED') >= 0) {
      return '단체메시지 대상 수를 확인해주세요.';
    }
    if (upper.indexOf('BROADCAST_MESSAGE_INVALID') >= 0) {
      return '메시지는 1자 이상 500자 이내로 입력해주세요.';
    }
    if (upper.indexOf('CHAT_RATE_LIMIT_EXCEEDED') >= 0) {
      return '메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도해주세요.';
    }
    if (upper.indexOf('ACTIVE_SESSION_REQUIRED') >= 0) {
      return '로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
    }

    return raw;
  }

  function safeTime(value) {
    var time = new Date(value || '').getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function formatTime(value) {
    var time = safeTime(value);
    if (!time) return '';

    var d = new Date(time);
    var now = new Date();

    if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    ) {
      return (
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0')
      );
    }

    return (
      String(d.getMonth() + 1).padStart(2, '0') +
      '.' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function formatDateTime(value) {
    var time = safeTime(value);
    if (!time) return '';

    var d = new Date(time);

    return (
      String(d.getMonth() + 1).padStart(2, '0') +
      '.' +
      String(d.getDate()).padStart(2, '0') +
      ' ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0')
    );
  }

  function memberSnapshot() {
    try {
      var api = window.SitePassMemberLinkChatV566;
      return api && typeof api.getState === 'function'
        ? api.getState()
        : null;
    } catch (error) {
      return null;
    }
  }

  function memberRooms() {
    var snapshot = memberSnapshot();
    return snapshot &&
      snapshot.list &&
      Array.isArray(snapshot.list.rooms)
        ? snapshot.list.rooms.slice()
        : [];
  }

  function friendSnapshot() {
    try {
      var api = window.SitePassFriendCenterV1;
      return api && typeof api.getState === 'function'
        ? api.getState()
        : null;
    } catch (error) {
      return null;
    }
  }

  function friendListArray(key) {
    var snapshot = friendSnapshot();
    return snapshot &&
      snapshot.list &&
      Array.isArray(snapshot.list[key])
        ? snapshot.list[key].slice()
        : [];
  }

  function memberRoomTime(room) {
    return safeTime(
      room &&
      (
        room.lastMessageAt ||
        room.last_message_at ||
        room.updatedAt ||
        room.updated_at ||
        room.createdAt ||
        room.created_at
      )
    );
  }

  function genericRowTime(row) {
    return safeTime(
      row &&
      (
        row.updatedAt ||
        row.updated_at ||
        row.acceptedAt ||
        row.accepted_at ||
        row.requestedAt ||
        row.requested_at ||
        row.createdAt ||
        row.created_at
      )
    );
  }

  function memberEquipmentText(room) {
    var rows =
      room && Array.isArray(room.activeEquipment)
        ? room.activeEquipment
        : [];

    if (!rows.length) return '';

    var first = rows[0] || {};
    var firstText = [
      text(first.equipmentName || first.equipment_name).trim(),
      text(first.equipmentNo || first.equipment_no).trim()
    ]
      .filter(Boolean)
      .join(' ');

    var count = Math.max(
      rows.length,
      Number(room && room.activeEquipmentCount || 0) || 0
    );

    if (count > 1) {
      firstText +=
        (firstText ? ' ' : '') +
        '외 ' +
        String(count - 1) +
        '대';
    }

    return firstText;
  }

  function normalizedLogin(value) {
    return text(value).trim().toLowerCase();
  }

  function friendMapByLogin() {
    var map = Object.create(null);

    friendListArray('friends').forEach(function (row) {
      var key = normalizedLogin(row && row.loginId);
      if (key) map[key] = row;
    });

    return map;
  }

  function memberSourcePushHtml(roomId) {
    var list = byId('sp566MemberRoomList');
    if (!list) return '';

    var buttons = Array.prototype.slice.call(
      list.querySelectorAll('.sp566-member-room-button')
    );

    for (var index = 0; index < buttons.length; index += 1) {
      var button = buttons[index];
      var openCode = text(button.getAttribute('onclick'));
      if (
        openCode.indexOf(text(roomId)) >= 0
      ) {
        var push = button.querySelector(
          '.sp595-room-push-toggle'
        );
        return push ? push.outerHTML : '';
      }
    }

    return '';
  }

  function fixedRows() {
    var list = byId('sitepassChatRoomList');
    if (!list) return [];

    return Array.prototype.slice.call(
      list.querySelectorAll('.sitepass-chat-room-item')
    ).map(function (button, index) {
      var clone = button.cloneNode(true);
      clone.classList.add(
        'sp-r10no-unified-card',
        'sp-r10no-fixed-card'
      );
      clone.setAttribute('data-sp-r10no-kind', 'alert');
      clone.setAttribute(
        'data-sp641-search-text',
        text(clone.textContent)
      );

      var rawSort =
        button.getAttribute('data-sp-r10no-sort-at') || '';

      return {
        kind: 'alert',
        categories: ['alert'],
        sortTime: safeTime(rawSort),
        tie: '0-' + String(index).padStart(3, '0'),
        html: clone.outerHTML
      };
    });
  }

  function memberRowsForUnified(friendMap) {
    return memberRooms().map(function (room) {
      room = room || {};

      var roomId = text(room.roomId).trim();
      if (!roomId) return null;

      var name = text(
        room.counterpartFullName ||
        room.counterpart_full_name ||
        room.counterpartDisplayName ||
        room.counterpart_display_name ||
        'SitePass 회원'
      ).trim() || 'SitePass 회원';

      var loginId = text(
        room.counterpartLoginId ||
        room.counterpart_login_id ||
        ''
      ).trim();

      var isFriend = !!(
        loginId &&
        friendMap[normalizedLogin(loginId)]
      );

      var equipment = memberEquipmentText(room);
      var preview = text(
        room.lastMessageText ||
        room.last_message_text ||
        ''
      ).trim();

      var incoming =
        Array.isArray(room.incomingPendingGroups)
          ? room.incomingPendingGroups.length
          : 0;
      var outgoing =
        Array.isArray(room.outgoingPendingGroups)
          ? room.outgoingPendingGroups.length
          : 0;

      if (!preview) {
        if (incoming > 0) {
          preview = '받은 장비연동 요청이 있습니다.';
        } else if (outgoing > 0) {
          preview = '보낸 장비연동 요청이 있습니다.';
        } else if (room.chatWritable === false) {
          preview = '읽기 전용';
        } else {
          preview = '회원연동채팅';
        }
      }

      var unread = Math.max(
        0,
        Number(room.unreadCount || room.unread_count || 0) || 0
      );

      var timeValue =
        room.lastMessageAt ||
        room.last_message_at ||
        room.updatedAt ||
        room.updated_at ||
        '';

      var badgeHtml =
        '<span class="sp-r10no-badge member">연동회원</span>' +
        (isFriend
          ? '<span class="sp-r10no-badge friend">친구</span>'
          : '');

      var pushHtml = memberSourcePushHtml(roomId);

      var unreadHtml =
        unread > 0
          ? '<em class="sp-r10no-unread">' +
              html(unread > 99 ? '99+' : unread) +
            '</em>'
          : '';

      var searchText = [
        name,
        loginId,
        equipment,
        preview,
        '연동회원',
        isFriend ? '친구' : ''
      ].join(' ');

      var cardHtml =
        '<div class="sp-r10no-unified-card sp-r10no-member-card" ' +
          'role="button" tabindex="0" ' +
          'data-sp-r10no-kind="member" ' +
          'data-sp-r10no-open-member="' + attr(roomId) + '" ' +
          'data-sp641-search-text="' + attr(searchText) + '">' +
          '<div class="sp-r10no-member-main">' +
            '<span class="sp-r10no-avatar" aria-hidden="true">👤</span>' +
            '<span class="sp-r10no-member-copy">' +
              '<span class="sp-r10no-name-row">' +
                '<b>' + html(name) +
                  (loginId ? ' · ' + html(loginId) : '') +
                '</b>' +
              '</span>' +
              (equipment
                ? '<span class="sp-r10no-equipment">' +
                    html(equipment) +
                  '</span>'
                : '') +
              '<span class="sp-r10no-preview">' +
                html(preview) +
              '</span>' +
            '</span>' +
            '<span class="sp-r10no-meta">' +
              pushHtml +
              '<span class="sp-r10no-badges">' +
                badgeHtml +
              '</span>' +
              '<span class="sp-r10no-meta-bottom">' +
                unreadHtml +
                '<i>' + html(formatDateTime(timeValue)) + '</i>' +
              '</span>' +
            '</span>' +
          '</div>' +
        '</div>';

      return {
        kind: 'member',
        categories: isFriend
          ? ['member', 'friend']
          : ['member'],
        sortTime: memberRoomTime(room),
        tie: '1-' + roomId,
        loginKey: normalizedLogin(loginId),
        html: cardHtml
      };
    }).filter(Boolean);
  }

  function friendActionMenuHtml(row) {
    var relationshipId =
      text(row && row.relationshipId).trim();

    if (!relationshipId) return '';

    return (
      '<details class="sp-r10no-friend-more">' +
        '<summary aria-label="친구 관리">⋯</summary>' +
        '<div class="sp-r10no-friend-menu">' +
          '<button type="button" data-r10no-friend-action="remove" ' +
            'data-relationship-id="' + attr(relationshipId) + '">' +
            '친구 삭제' +
          '</button>' +
          '<button type="button" class="danger" ' +
            'data-r10no-friend-action="block" ' +
            'data-relationship-id="' + attr(relationshipId) + '">' +
            '차단' +
          '</button>' +
        '</div>' +
      '</details>'
    );
  }

  function friendRowsForUnified(memberLoginKeys) {
    var rows = [];

    friendListArray('friends').forEach(function (row) {
      row = row || {};

      var loginId = text(row.loginId).trim();
      var loginKey = normalizedLogin(loginId);

      if (loginKey && memberLoginKeys[loginKey]) {
        return;
      }

      var name = text(
        row.displayName ||
        row.maskedName ||
        'SitePass 회원'
      ).trim() || 'SitePass 회원';

      var timeValue =
        row.updatedAt ||
        row.updated_at ||
        row.acceptedAt ||
        row.accepted_at ||
        '';

      var searchText = [
        name,
        loginId,
        '친구'
      ].join(' ');

      rows.push({
        kind: 'friend',
        categories: ['friend'],
        sortTime: genericRowTime(row),
        tie: '2-' + text(row.relationshipId || loginId),
        html:
          '<div class="sp-r10no-unified-card sp-r10no-friend-card" ' +
            'data-sp-r10no-kind="friend" ' +
            'data-sp641-search-text="' + attr(searchText) + '">' +
            '<span class="sp-r10no-avatar" aria-hidden="true">👥</span>' +
            '<span class="sp-r10no-friend-copy">' +
              '<span class="sp-r10no-name-row">' +
                '<b>' + html(name) +
                  (loginId ? ' · ' + html(loginId) : '') +
                '</b>' +
                '<span class="sp-r10no-badges">' +
                  '<span class="sp-r10no-badge friend">친구</span>' +
                '</span>' +
              '</span>' +
              '<span class="sp-r10no-preview">친구 관계</span>' +
            '</span>' +
            '<span class="sp-r10no-meta">' +
              '<i>' + html(formatTime(timeValue)) + '</i>' +
              friendActionMenuHtml(row) +
            '</span>' +
          '</div>'
      });
    });

    friendListArray('incomingRequests').forEach(function (row) {
      row = row || {};
      var relationshipId =
        text(row.relationshipId).trim();
      if (!relationshipId) return;

      var name = text(
        row.maskedName ||
        row.displayName ||
        'SitePass 회원'
      ).trim() || 'SitePass 회원';
      var loginId = text(row.loginId).trim();
      var timeValue =
        row.updatedAt ||
        row.updated_at ||
        row.requestedAt ||
        row.requested_at ||
        row.createdAt ||
        row.created_at ||
        '';

      rows.push({
        kind: 'friend-request',
        categories: ['friend'],
        sortTime: genericRowTime(row),
        tie: '3-' + relationshipId,
        html:
          '<div class="sp-r10no-unified-card sp-r10no-friend-card sp-r10no-request-card" ' +
            'data-sp-r10no-kind="friend" ' +
            'data-sp641-search-text="' +
              attr([name, loginId, '친구 요청'].join(' ')) +
            '">' +
            '<span class="sp-r10no-avatar" aria-hidden="true">👥</span>' +
            '<span class="sp-r10no-friend-copy">' +
              '<span class="sp-r10no-name-row">' +
                '<b>' + html(name) +
                  (loginId ? ' · ' + html(loginId) : '') +
                '</b>' +
                '<span class="sp-r10no-badges">' +
                  '<span class="sp-r10no-badge request">친구요청</span>' +
                '</span>' +
              '</span>' +
              '<span class="sp-r10no-preview">친구 요청이 도착했습니다.</span>' +
            '</span>' +
            '<span class="sp-r10no-request-actions">' +
              '<button type="button" data-r10no-friend-action="accept" ' +
                'data-relationship-id="' + attr(relationshipId) + '">' +
                '수락' +
              '</button>' +
              '<button type="button" class="secondary" ' +
                'data-r10no-friend-action="reject" ' +
                'data-relationship-id="' + attr(relationshipId) + '">' +
                '거절' +
              '</button>' +
              '<i>' + html(formatTime(timeValue)) + '</i>' +
            '</span>' +
          '</div>'
      });
    });

    return rows;
  }

  function buildRows() {
    var friendMap = friendMapByLogin();
    var members = memberRowsForUnified(friendMap);
    var memberLoginKeys = Object.create(null);

    members.forEach(function (row) {
      if (row.loginKey) memberLoginKeys[row.loginKey] = true;
    });

    var rows = []
      .concat(fixedRows())
      .concat(members)
      .concat(friendRowsForUnified(memberLoginKeys));

    rows.sort(function (a, b) {
      if (a.sortTime !== b.sortTime) {
        return b.sortTime - a.sortTime;
      }
      return text(a.tie).localeCompare(text(b.tie));
    });

    return rows;
  }

  function rowMatchesTab(row) {
    if (state.activeTab === 'all') return true;
    return row.categories.indexOf(state.activeTab) >= 0;
  }

  function ensureToolbar(panel) {
    var toolbar = byId('spR10NOToolbar');

    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'spR10NOToolbar';
      toolbar.className = 'sp-r10no-toolbar';
      toolbar.innerHTML =
        '<div class="sp-r10no-actions">' +
          '<button id="spR10NOSearchToggle" type="button" ' +
            'class="sp-r10no-search-toggle" aria-expanded="false" ' +
            'aria-controls="spR10NOSearchWrap" aria-label="알림 및 채팅 검색">' +
            '🔍' +
          '</button>' +
          '<button id="spR10NOFriendAdd" type="button" ' +
            'class="sp-r10no-friend-add">' +
            '친구추가하기 +' +
          '</button>' +
          '<button id="spR10NOBulkSend" type="button" ' +
            'class="sp-r10no-bulk-send hidden">' +
            '＋ 단체메시지' +
          '</button>' +
        '</div>' +
        '<div id="spR10NOSearchWrap" class="sp-r10no-search-wrap hidden"></div>' +
        '<div id="spR10NOTabs" class="sp-r10no-tabs" role="tablist" ' +
          'aria-label="알림 및 채팅 목록 필터">' +
          '<button type="button" role="tab" data-r10no-tab="all">전체</button>' +
          '<button type="button" role="tab" data-r10no-tab="alert">알림/문의</button>' +
          '<button type="button" role="tab" data-r10no-tab="friend">친구</button>' +
          '<button type="button" role="tab" data-r10no-tab="member">연동회원</button>' +
        '</div>';

      var head = panel.querySelector('.sitepass-chat-head');
      if (head && head.nextSibling) {
        panel.insertBefore(toolbar, head.nextSibling);
      } else {
        panel.insertBefore(toolbar, panel.firstChild);
      }

      byId('spR10NOSearchToggle').addEventListener(
        'click',
        function () {
          state.searchOpen = !state.searchOpen;
          applySearchOpenState();
        }
      );

      byId('spR10NOFriendAdd').addEventListener(
        'click',
        openFriendDialog
      );

      byId('spR10NOBulkSend').addEventListener(
        'click',
        openLinkedBulkDialog
      );

      byId('spR10NOTabs').addEventListener(
        'click',
        function (event) {
          var button =
            event.target && event.target.closest
              ? event.target.closest('[data-r10no-tab]')
              : null;
          if (!button) return;

          var next =
            text(button.getAttribute('data-r10no-tab'));

          if (
            ['all', 'alert', 'friend', 'member']
              .indexOf(next) < 0
          ) {
            return;
          }

          state.activeTab = next;
          refreshUnified();
        }
      );
    }

    var searchWrap = byId('spR10NOSearchWrap');
    var searchLabel = panel.querySelector(
      'label.sp641-chat-search'
    );

    if (
      searchWrap &&
      searchLabel &&
      searchLabel.parentNode !== searchWrap
    ) {
      searchWrap.appendChild(searchLabel);
    }

    applySearchOpenState();
    return toolbar;
  }

  function applySearchOpenState() {
    var wrap = byId('spR10NOSearchWrap');
    var toggle = byId('spR10NOSearchToggle');
    var input = byId('sp641ChatListSearch');

    if (wrap) {
      wrap.classList.toggle('hidden', !state.searchOpen);
    }

    if (toggle) {
      toggle.setAttribute(
        'aria-expanded',
        state.searchOpen ? 'true' : 'false'
      );
    }

    if (state.searchOpen && input) {
      setTimeout(function () {
        input.focus();
      }, 0);
      return;
    }

    if (!state.searchOpen && input && input.value) {
      input.value = '';
      try {
        input.dispatchEvent(
          new Event('input', { bubbles: true })
        );
      } catch (error) {}
    }
  }

  function ensureUnifiedList(panel) {
    var list = byId('spR10NOUnifiedList');

    if (!list) {
      list = document.createElement('div');
      list.id = 'spR10NOUnifiedList';
      list.className = 'sp-r10no-unified-list';
      list.setAttribute('aria-live', 'polite');

      var toolbar = ensureToolbar(panel);
      panel.insertBefore(
        list,
        toolbar ? toolbar.nextSibling : null
      );

      list.addEventListener(
        'click',
        handleUnifiedClick
      );

      list.addEventListener(
        'keydown',
        handleUnifiedKeydown
      );
    }

    return list;
  }

  function handleUnifiedClick(event) {
    var pushControl =
      event.target && event.target.closest
        ? event.target.closest('.sp595-room-push-toggle')
        : null;

    if (pushControl) {
      return;
    }

    var action =
      event.target && event.target.closest
        ? event.target.closest(
            '[data-r10no-friend-action]'
          )
        : null;

    if (action) {
      handleFriendAction(
        text(action.getAttribute(
          'data-r10no-friend-action'
        )),
        text(action.getAttribute(
          'data-relationship-id'
        ))
      );
      return;
    }

    var member =
      event.target && event.target.closest
        ? event.target.closest(
            '[data-sp-r10no-open-member]'
          )
        : null;

    if (member) {
      openMemberRoom(
        member.getAttribute(
          'data-sp-r10no-open-member'
        )
      );
    }
  }

  function handleUnifiedKeydown(event) {
    if (
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return;
    }

    var member =
      event.target && event.target.closest
        ? event.target.closest(
            '[data-sp-r10no-open-member]'
          )
        : null;

    if (!member) return;

    event.preventDefault();
    openMemberRoom(
      member.getAttribute(
        'data-sp-r10no-open-member'
      )
    );
  }

  function openMemberRoom(roomId) {
    try {
      var api = window.SitePassMemberLinkChatV566;
      if (
        api &&
        typeof api.openRoom === 'function'
      ) {
        api.openRoom(text(roomId));
      }
    } catch (error) {}
    return false;
  }

  async function handleFriendAction(action, relationshipId) {
    action = text(action).trim();
    relationshipId = text(relationshipId).trim();

    if (!action || !relationshipId) return false;

    if (
      action === 'remove' &&
      !window.confirm('이 친구를 삭제할까요?')
    ) {
      return false;
    }

    if (
      action === 'block' &&
      !window.confirm(
        '이 회원을 차단할까요? 차단하면 친구 관계가 해제되고 새 친구 요청도 받을 수 없습니다.'
      )
    ) {
      return false;
    }

    if (
      action === 'reject' &&
      !window.confirm('이 친구 요청을 거절할까요?')
    ) {
      return false;
    }

    try {
      var api = window.SitePassFriendCenterV1;
      if (
        api &&
        typeof api.act === 'function'
      ) {
        await api.act(
          relationshipId,
          action
        );
      }
    } catch (error) {}

    scheduleRefresh(0);
    scheduleRefresh(300);
    return false;
  }

  function refreshBulkAction() {
    var proxy = byId('spR10NOBulkSend');
    if (!proxy) return;

    var visible = state.activeTab === 'member';

    proxy.classList.toggle('hidden', !visible);
    proxy.disabled =
      state.linkedBulkLoading === true ||
      state.linkedBulkSending === true;
    proxy.textContent = '단체메시지 보내기';
    proxy.setAttribute(
      'aria-label',
      '연동회원 여러 명에게 같은 메시지 보내기'
    );
  }

  function updateTabs() {
    var tabs = byId('spR10NOTabs');
    if (!tabs) return;

    Array.prototype.slice.call(
      tabs.querySelectorAll('[data-r10no-tab]')
    ).forEach(function (button) {
      var active =
        button.getAttribute('data-r10no-tab') ===
        state.activeTab;
      button.classList.toggle('active', active);
      button.setAttribute(
        'aria-selected',
        active ? 'true' : 'false'
      );
    });
  }

  function renderUnifiedList() {
    var panel = byId('sitepassChatListPanel');
    if (!panel) return false;

    ensureToolbar(panel);
    var list = ensureUnifiedList(panel);
    if (!list) return false;

    var rows = buildRows()
      .filter(rowMatchesTab);

    list.innerHTML = rows.length
      ? rows.map(function (row) {
          return row.html;
        }).join('')
      : '<div class="sp-r10no-empty">' +
          (
            state.activeTab === 'friend'
              ? '표시할 친구가 없습니다.'
              : state.activeTab === 'member'
                ? '표시할 연동회원이 없습니다.'
                : state.activeTab === 'alert'
                  ? '표시할 알림 또는 문의가 없습니다.'
                  : '표시할 알림 또는 채팅이 없습니다.'
          ) +
        '</div>';

    panel.classList.add(
      'sp-r10no-unified-active'
    );

    updateTabs();
    refreshBulkAction();
    return true;
  }

  function ensureLinkedBulkDialog() {
    var modal = byId('spR10NOLinkedBulkDialog');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'spR10NOLinkedBulkDialog';
    modal.className = 'sp-r10no-bulk-dialog hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute(
      'aria-labelledby',
      'spR10NOLinkedBulkTitle'
    );

    modal.innerHTML =
      '<div class="sp-r10no-bulk-dialog-card">' +
        '<div class="sp-r10no-bulk-dialog-head">' +
          '<div>' +
            '<b id="spR10NOLinkedBulkTitle">연동회원 단체메시지</b>' +
            '<small>연동 방향과 관계없이 기존 1:1 채팅방으로 각각 전송됩니다.</small>' +
          '</div>' +
          '<button id="spR10NOLinkedBulkClose" type="button" aria-label="닫기">×</button>' +
        '</div>' +

        '<div class="sp-r10no-bulk-search-row">' +
          '<input id="spR10NOLinkedBulkSearch" type="search" ' +
            'autocomplete="off" autocorrect="off" autocapitalize="none" ' +
            'spellcheck="false" placeholder="연동회원 / 장비 검색">' +
        '</div>' +

        '<div class="sp-r10no-bulk-select-head">' +
          '<button id="spR10NOLinkedBulkSelectAll" type="button">전체선택</button>' +
          '<span id="spR10NOLinkedBulkSelectedCount">전체 0명 · 선택 0명</span>' +
        '</div>' +

        '<div id="spR10NOLinkedBulkList" class="sp-r10no-bulk-target-list"></div>' +

        '<label class="sp-r10no-bulk-message-label" for="spR10NOLinkedBulkMessage">' +
          '<span>메시지</span>' +
          '<span id="spR10NOLinkedBulkMessageCount">0 / 500</span>' +
        '</label>' +

        '<textarea id="spR10NOLinkedBulkMessage" rows="4" maxlength="500" ' +
          'placeholder="연동회원에게 보낼 메시지를 입력하세요."></textarea>' +

        '<div id="spR10NOLinkedBulkResult" ' +
          'class="sp-r10no-bulk-result hidden" aria-live="polite"></div>' +

        '<div class="sp-r10no-bulk-footer">' +
          '<button id="spR10NOLinkedBulkSend" type="button">선택 0명 보내기</button>' +
          '<button id="spR10NOLinkedBulkSendAll" type="button">전체 0명 보내기</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    byId('spR10NOLinkedBulkClose').addEventListener(
      'click',
      closeLinkedBulkDialog
    );

    byId('spR10NOLinkedBulkSearch').addEventListener(
      'input',
      function (event) {
        state.linkedBulkSearch =
          text(event.target && event.target.value)
            .slice(0, 60);
        renderLinkedBulkDialog();
      }
    );

    byId('spR10NOLinkedBulkSelectAll').addEventListener(
      'click',
      toggleLinkedBulkSelectAll
    );

    byId('spR10NOLinkedBulkList').addEventListener(
      'change',
      function (event) {
        var input =
          event.target && event.target.closest
            ? event.target.closest(
                '[data-r10no-linked-bulk-target]'
              )
            : null;

        if (!input) return;

        toggleLinkedBulkTarget(
          text(
            input.getAttribute(
              'data-r10no-linked-bulk-target'
            )
          ),
          input.checked === true
        );
      }
    );

    byId('spR10NOLinkedBulkMessage').addEventListener(
      'input',
      function (event) {
        var next =
          text(event.target && event.target.value)
            .slice(0, 500);

        if (next !== state.linkedBulkMessage) {
          state.linkedBulkBatchIdempotencyKey = '';
          state.linkedBulkBatchRequestKey = '';
          state.linkedBulkResult = null;
        }

        state.linkedBulkMessage = next;
        state.linkedBulkError = '';
        renderLinkedBulkDialog();
      }
    );

    byId('spR10NOLinkedBulkSend').addEventListener(
      'click',
      function () {
        sendLinkedBulkMessage('selected');
      }
    );

    byId('spR10NOLinkedBulkSendAll').addEventListener(
      'click',
      function () {
        sendLinkedBulkMessage('all');
      }
    );

    modal.addEventListener(
      'click',
      function (event) {
        if (event.target === modal) {
          closeLinkedBulkDialog();
        }
      }
    );

    return modal;
  }

  function resetLinkedBulkState() {
    state.linkedBulkLoading = false;
    state.linkedBulkSending = false;
    state.linkedBulkTargets = [];
    state.linkedBulkSelected = {};
    state.linkedBulkSearch = '';
    state.linkedBulkMessage = '';
    state.linkedBulkBatchIdempotencyKey = '';
    state.linkedBulkBatchRequestKey = '';
    state.linkedBulkBatchId = '';
    state.linkedBulkBatchStatus = null;
    state.linkedBulkPollSerial += 1;
    state.linkedBulkResult = null;
    state.linkedBulkError = '';
  }

  async function loadLinkedBulkTargets() {
    if (state.linkedBulkLoading) return;

    state.linkedBulkLoading = true;
    state.linkedBulkError = '';
    renderLinkedBulkDialog();
    refreshBulkAction();

    try {
      var result = await rpcR10NO(
        'sitepass_list_my_member_broadcast_targets_v1',
        {}
      );

      if (
        !result ||
        result.ok !== true ||
        !Array.isArray(result.targets)
      ) {
        throw new Error(
          '연동회원 단체메시지 대상을 확인하지 못했습니다.'
        );
      }

      var seen = {};
      state.linkedBulkTargets =
        result.targets.filter(function (target) {
          var memberId = linkedBulkTargetId(target);
          var roomId = text(
            target && (target.roomId || target.room_id)
          ).trim();

          if (!memberId || !roomId || seen[memberId]) {
            return false;
          }

          seen[memberId] = true;
          return true;
        });

      state.linkedBulkSelected = {};

      if (!state.linkedBulkTargets.length) {
        state.linkedBulkError =
          '현재 단체메시지를 보낼 수 있는 연동회원이 없습니다.';
      }
    } catch (error) {
      state.linkedBulkTargets = [];
      state.linkedBulkSelected = {};
      state.linkedBulkError =
        linkedBulkErrorText(error);
    } finally {
      state.linkedBulkLoading = false;
      renderLinkedBulkDialog();
      refreshBulkAction();
    }
  }

  function openLinkedBulkDialog(event) {
    if (
      event &&
      typeof event.preventDefault === 'function'
    ) {
      event.preventDefault();
    }

    if (state.activeTab !== 'member') {
      return false;
    }

    ensureLinkedBulkDialog();
    resetLinkedBulkState();
    state.linkedBulkOpen = true;

    var modal = byId('spR10NOLinkedBulkDialog');
    if (modal) modal.classList.remove('hidden');

    document.body.classList.add(
      'sp-r10no-bulk-dialog-open'
    );

    renderLinkedBulkDialog();
    loadLinkedBulkTargets();

    return false;
  }

  function closeLinkedBulkDialog() {
    if (state.linkedBulkSending) return false;

    state.linkedBulkOpen = false;

    var modal = byId('spR10NOLinkedBulkDialog');
    if (modal) modal.classList.add('hidden');

    document.body.classList.remove(
      'sp-r10no-bulk-dialog-open'
    );

    refreshBulkAction();
    return false;
  }

  function toggleLinkedBulkTarget(memberId, checked) {
    memberId = text(memberId).trim();
    if (!memberId || state.linkedBulkSending) return false;

    var allowed = state.linkedBulkTargets.some(
      function (target) {
        return linkedBulkTargetId(target) === memberId;
      }
    );

    if (!allowed) return false;

    state.linkedBulkSelected[memberId] =
      checked === true;
    state.linkedBulkBatchIdempotencyKey = '';
    state.linkedBulkBatchRequestKey = '';
    state.linkedBulkResult = null;
    state.linkedBulkError = '';

    renderLinkedBulkDialog();
    return false;
  }

  function toggleLinkedBulkSelectAll() {
    if (
      state.linkedBulkSending ||
      state.linkedBulkLoading
    ) {
      return false;
    }

    var visible = linkedBulkVisibleTargets();
    var allSelected =
      visible.length > 0 &&
      visible.every(function (target) {
        return state.linkedBulkSelected[
          linkedBulkTargetId(target)
        ] === true;
      });

    if (allSelected) {
      visible.forEach(function (target) {
        delete state.linkedBulkSelected[
          linkedBulkTargetId(target)
        ];
      });
    } else {
      visible.forEach(function (target) {
        var memberId = linkedBulkTargetId(target);
        if (!memberId) return;
        state.linkedBulkSelected[memberId] = true;
      });
    }

    state.linkedBulkBatchIdempotencyKey = '';
    state.linkedBulkBatchRequestKey = '';
    state.linkedBulkResult = null;
    state.linkedBulkError = '';

    renderLinkedBulkDialog();
    return false;
  }

  function renderLinkedBulkDialog() {
    var modal = byId('spR10NOLinkedBulkDialog');
    if (!modal) return;

    modal.classList.toggle(
      'hidden',
      !state.linkedBulkOpen
    );

    if (!state.linkedBulkOpen) return;

    var search = byId('spR10NOLinkedBulkSearch');
    var list = byId('spR10NOLinkedBulkList');
    var selectedCount =
      byId('spR10NOLinkedBulkSelectedCount');
    var selectAll =
      byId('spR10NOLinkedBulkSelectAll');
    var message = byId('spR10NOLinkedBulkMessage');
    var messageCount =
      byId('spR10NOLinkedBulkMessageCount');
    var result = byId('spR10NOLinkedBulkResult');
    var send = byId('spR10NOLinkedBulkSend');
    var sendAll = byId('spR10NOLinkedBulkSendAll');

    if (
      search &&
      search.value !== state.linkedBulkSearch
    ) {
      search.value = state.linkedBulkSearch;
    }

    if (
      message &&
      message.value !== state.linkedBulkMessage
    ) {
      message.value = state.linkedBulkMessage;
    }

    var visible = linkedBulkVisibleTargets();
    var selected = linkedBulkSelectedIds();
    var total = Array.isArray(state.linkedBulkTargets)
      ? state.linkedBulkTargets.length
      : 0;

    if (list) {
      if (state.linkedBulkLoading) {
        list.innerHTML =
          '<div class="sp-r10no-bulk-empty">연동회원을 확인하고 있습니다.</div>';
      } else if (!visible.length) {
        list.innerHTML =
          '<div class="sp-r10no-bulk-empty">' +
            html(
              state.linkedBulkError ||
              '검색 결과가 없습니다.'
            ) +
          '</div>';
      } else {
        list.innerHTML =
          visible.map(function (target) {
            var memberId = linkedBulkTargetId(target);
            var checked =
              state.linkedBulkSelected[memberId] === true;
            var displayName =
              text(target.displayName).trim() ||
              'SitePass 회원';

            return (
              '<label class="sp-r10no-bulk-target-row' +
                (checked ? ' selected' : '') +
              '">' +
                '<input type="checkbox" ' +
                  'data-r10no-linked-bulk-target="' +
                  attr(memberId) +
                  '"' +
                  (checked ? ' checked' : '') +
                  (state.linkedBulkSending
                    ? ' disabled'
                    : '') +
                '>' +
                '<span class="sp-r10no-bulk-target-avatar">👤</span>' +
                '<span class="sp-r10no-bulk-target-copy">' +
                  '<b>' + html(displayName) + '</b>' +
                  '<small>' +
                    html(
                      linkedBulkEquipmentLabel(target)
                    ) +
                  '</small>' +
                '</span>' +
              '</label>'
            );
          }).join('');
      }
    }

    if (selectedCount) {
      selectedCount.textContent =
        '전체 ' + total +
        '명 · 선택 ' + selected.length + '명';
    }

    if (selectAll) {
      var allSelected =
        visible.length > 0 &&
        visible.every(function (target) {
          return state.linkedBulkSelected[
            linkedBulkTargetId(target)
          ] === true;
        });

      selectAll.textContent =
        allSelected ? '선택해제' : '전체선택';

      selectAll.disabled =
        state.linkedBulkLoading ||
        state.linkedBulkSending ||
        visible.length < 1;
    }

    if (message) {
      message.disabled =
        state.linkedBulkSending ||
        state.linkedBulkLoading;
    }

    if (messageCount) {
      messageCount.textContent =
        state.linkedBulkMessage.length +
        ' / 500';
    }

    if (result) {
      var resultText = '';
      var isError = false;
      var status = state.linkedBulkBatchStatus;

      if (state.linkedBulkError) {
        resultText = state.linkedBulkError;
        isError = true;
      } else if (status && status.ok === true) {
        var totalCount = Number(status.totalCount || 0);
        var sentCount = Number(status.sentCount || 0);
        var suppressedCount =
          Number(status.suppressedCount || 0);
        var failedCount =
          Number(status.failedCount || 0);
        var pendingCount =
          Number(status.pendingCount || 0) +
          Number(status.processingCount || 0) +
          Number(status.retryCount || 0);

        if (status.done === true) {
          if (suppressedCount > 0 || failedCount > 0) {
            resultText =
              '전송 종료 · 성공 ' + sentCount +
              '명 · 제외 ' + suppressedCount +
              '명 · 실패 ' + failedCount + '명';
            isError = true;
          } else {
            resultText =
              '전송 완료 ' + sentCount + '명';
          }
        } else {
          resultText =
            '전송 진행 · 완료 ' + sentCount +
            '/' + totalCount +
            '명 · 대기 ' + pendingCount + '명';
        }
      } else if (state.linkedBulkResult) {
        resultText =
          '전송 요청 접수 ' +
          Number(
            state.linkedBulkResult.totalCount || 0
          ) +
          '명';
      }

      result.textContent = resultText;
      result.classList.toggle(
        'hidden',
        !resultText
      );
      result.classList.toggle(
        'error',
        isError
      );
    }

    var hasBody =
      !!state.linkedBulkMessage.trim();

    if (send) {
      send.disabled =
        state.linkedBulkLoading ||
        state.linkedBulkSending ||
        selected.length < 1 ||
        !hasBody;

      send.textContent =
        state.linkedBulkSending
          ? '접수 중'
          : '선택 ' + selected.length + '명 보내기';
    }

    if (sendAll) {
      sendAll.disabled =
        state.linkedBulkLoading ||
        state.linkedBulkSending ||
        total < 1 ||
        !hasBody;

      sendAll.textContent =
        state.linkedBulkSending
          ? '접수 중'
          : '전체 ' + total + '명 보내기';
    }
  }

  async function pollLinkedBulkBatchStatus(
    batchId,
    pollSerial,
    attempt
  ) {
    if (
      !state.linkedBulkOpen ||
      !batchId ||
      batchId !== state.linkedBulkBatchId ||
      pollSerial !== state.linkedBulkPollSerial
    ) {
      return false;
    }

    try {
      var status = await rpcR10NO(
        'sitepass_get_my_linked_member_broadcast_batch_v1',
        {
          p_batch_id: batchId
        }
      );

      if (
        !status ||
        status.ok !== true ||
        text(status.batchId).trim() !== batchId
      ) {
        throw new Error(
          '단체메시지 진행상태를 확인하지 못했습니다.'
        );
      }

      state.linkedBulkBatchStatus = status;
      state.linkedBulkError = '';
      renderLinkedBulkDialog();

      if (status.done === true) {
        try {
          var memberApi =
            window.SitePassMemberLinkChatV566;
          if (
            memberApi &&
            typeof memberApi.refresh === 'function'
          ) {
            await memberApi.refresh(true);
          }
        } catch (refreshError) {}

        scheduleRefresh(0);
        scheduleRefresh(300);
        return true;
      }
    } catch (error) {
      if (
        state.linkedBulkOpen &&
        batchId === state.linkedBulkBatchId &&
        pollSerial === state.linkedBulkPollSerial
      ) {
        state.linkedBulkError =
          linkedBulkErrorText(error);
        renderLinkedBulkDialog();
      }
      return false;
    }

    var nextAttempt = Number(attempt || 0) + 1;
    var waitMs =
      nextAttempt <= 6 ? 2500 : 10000;

    window.setTimeout(function () {
      pollLinkedBulkBatchStatus(
        batchId,
        pollSerial,
        nextAttempt
      );
    }, waitMs);

    return false;
  }

  async function sendLinkedBulkMessage(mode) {
    if (
      state.linkedBulkSending ||
      state.linkedBulkLoading
    ) {
      return false;
    }

    mode = mode === 'all' ? 'all' : 'selected';

    var selectedIds =
      linkedBulkSelectedIds().sort();
    var body =
      text(state.linkedBulkMessage).trim();
    var totalCount =
      Array.isArray(state.linkedBulkTargets)
        ? state.linkedBulkTargets.length
        : 0;

    if (
      mode === 'selected' &&
      selectedIds.length < 1
    ) {
      state.linkedBulkError =
        '연동회원을 한 명 이상 선택해주세요.';
      renderLinkedBulkDialog();
      return false;
    }

    if (mode === 'all' && totalCount < 1) {
      state.linkedBulkError =
        '현재 단체메시지를 보낼 수 있는 연동회원이 없습니다.';
      renderLinkedBulkDialog();
      return false;
    }

    if (!body || body.length > 500) {
      state.linkedBulkError =
        '메시지는 1자 이상 500자 이내로 입력해주세요.';
      renderLinkedBulkDialog();
      return false;
    }

    var confirmCount =
      mode === 'all'
        ? totalCount
        : selectedIds.length;

    var confirmText =
      mode === 'all'
        ? '현재 연동회원 전체 ' +
          confirmCount +
          '명에게 같은 메시지를 보낼까요?'
        : '선택한 연동회원 ' +
          confirmCount +
          '명에게 같은 메시지를 보낼까요?';

    if (!window.confirm(confirmText)) {
      return false;
    }

    var requestKey =
      mode +
      '\n' +
      body +
      '\n' +
      (
        mode === 'all'
          ? 'ALL'
          : selectedIds.join(',')
      );

    if (
      !state.linkedBulkBatchIdempotencyKey ||
      state.linkedBulkBatchRequestKey !== requestKey
    ) {
      try {
        state.linkedBulkBatchIdempotencyKey =
          newIdempotencyKeyR10NO();
        state.linkedBulkBatchRequestKey =
          requestKey;
      } catch (error) {
        state.linkedBulkError =
          linkedBulkErrorText(error);
        renderLinkedBulkDialog();
        return false;
      }
    }

    state.linkedBulkSending = true;
    state.linkedBulkError = '';
    state.linkedBulkResult = null;
    state.linkedBulkBatchStatus = null;
    renderLinkedBulkDialog();
    refreshBulkAction();

    var acceptedBatchId = '';

    try {
      var result = await rpcR10NO(
        'sitepass_create_my_linked_member_broadcast_batch_v1',
        {
          p_send_mode: mode,
          p_linked_member_ids:
            mode === 'all' ? [] : selectedIds,
          p_message_text: body,
          p_idempotency_key:
            state.linkedBulkBatchIdempotencyKey
        }
      );

      if (
        !result ||
        result.ok !== true ||
        !text(result.batchId).trim() ||
        Number(result.totalCount || 0) < 1 ||
        (
          mode === 'selected' &&
          Number(result.totalCount || 0) !==
            selectedIds.length
        )
      ) {
        throw new Error(
          '단체메시지 전송 요청 결과를 확인하지 못했습니다.'
        );
      }

      acceptedBatchId =
        text(result.batchId).trim();

      state.linkedBulkResult = result;
      state.linkedBulkBatchId = acceptedBatchId;
      state.linkedBulkBatchStatus = {
        ok: true,
        batchId: acceptedBatchId,
        status: result.status || 'pending',
        totalCount: Number(result.totalCount || 0),
        pendingCount: Number(result.totalCount || 0),
        processingCount: 0,
        retryCount: 0,
        sentCount: 0,
        suppressedCount: 0,
        failedCount: 0,
        done: false
      };

      state.linkedBulkSelected = {};
      state.linkedBulkMessage = '';
      state.linkedBulkBatchIdempotencyKey = '';
      state.linkedBulkBatchRequestKey = '';
      state.linkedBulkPollSerial += 1;

      renderLinkedBulkDialog();
    } catch (error) {
      state.linkedBulkError =
        linkedBulkErrorText(error);
    } finally {
      state.linkedBulkSending = false;
      renderLinkedBulkDialog();
      refreshBulkAction();
    }

    if (acceptedBatchId) {
      pollLinkedBulkBatchStatus(
        acceptedBatchId,
        state.linkedBulkPollSerial,
        0
      );
    }

    return false;
  }

  function ensureFriendDialog() {
    var modal = byId('spR10NOFriendDialog');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'spR10NOFriendDialog';
    modal.className = 'sp-r10no-friend-dialog hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute(
      'aria-labelledby',
      'spR10NOFriendDialogTitle'
    );

    modal.innerHTML =
      '<div class="sp-r10no-friend-dialog-card">' +
        '<div class="sp-r10no-friend-dialog-head">' +
          '<div>' +
            '<b id="spR10NOFriendDialogTitle">친구추가하기</b>' +
            '<small>로그인ID · 전체 전화번호 · 전체 이름 정확검색</small>' +
          '</div>' +
          '<button id="spR10NOFriendDialogClose" type="button" ' +
            'aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="sp-r10no-friend-search-row">' +
          '<input id="spR10NOFriendQuery" type="search" ' +
            'autocomplete="off" autocorrect="off" autocapitalize="none" ' +
            'spellcheck="false" placeholder="로그인ID / 전체 전화번호 / 전체 이름">' +
          '<button id="spR10NOFriendSearchButton" type="button">검색</button>' +
        '</div>' +
        '<div id="spR10NOFriendResult" ' +
          'class="sp-r10no-friend-result" aria-live="polite"></div>' +
      '</div>';

    document.body.appendChild(modal);

    byId('spR10NOFriendDialogClose').addEventListener(
      'click',
      closeFriendDialog
    );

    byId('spR10NOFriendSearchButton').addEventListener(
      'click',
      runFriendSearch
    );

    byId('spR10NOFriendQuery').addEventListener(
      'keydown',
      function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        runFriendSearch();
      }
    );

    byId('spR10NOFriendResult').addEventListener(
      'click',
      function (event) {
        var button =
          event.target && event.target.closest
            ? event.target.closest(
                '[data-r10no-request-friend]'
              )
            : null;

        if (button) {
          requestFriendFromDialog();
        }
      }
    );

    modal.addEventListener(
      'click',
      function (event) {
        if (event.target === modal) {
          closeFriendDialog();
        }
      }
    );

    return modal;
  }

  function openFriendDialog() {
    var modal = ensureFriendDialog();
    state.friendQuery = '';
    state.friendResult = null;
    state.friendBusy = false;

    var input = byId('spR10NOFriendQuery');
    var result = byId('spR10NOFriendResult');

    if (input) input.value = '';
    if (result) {
      result.innerHTML =
        '<p>정확한 로그인ID, 전체 전화번호 또는 전체 이름으로 검색하세요.</p>';
    }

    modal.classList.remove('hidden');
    document.body.classList.add(
      'sp-r10no-friend-dialog-open'
    );

    setTimeout(function () {
      if (input) input.focus();
    }, 0);

    return false;
  }

  function closeFriendDialog() {
    var modal = byId('spR10NOFriendDialog');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove(
      'sp-r10no-friend-dialog-open'
    );
    return false;
  }

  function relationMessage(result) {
    result = result || {};
    var relation =
      text(result.relationState).toLowerCase();
    var reason =
      text(result.reason).toLowerCase();

    if (result.ambiguous === true) {
      return '동명이인이 있습니다. 아이디 또는 전화번호로 검색해주세요.';
    }

    if (
      result.found !== true ||
      result.exactMatch !== true
    ) {
      return '로그인 아이디, 전체 전화번호 또는 전체 이름을 정확히 입력해주세요.';
    }

    if (
      relation === 'none' &&
      result.eligible === true
    ) {
      return '친구 요청 가능';
    }

    if (relation === 'requested_by_me') {
      return '친구 요청을 보냈습니다.';
    }

    if (relation === 'requested_to_me') {
      return '이 회원에게 받은 친구 요청이 있습니다.';
    }

    if (relation === 'accepted') {
      return '이미 친구입니다.';
    }

    if (relation === 'blocked_by_me') {
      return '내가 차단한 회원입니다.';
    }

    if (
      relation === 'self' ||
      reason === 'self'
    ) {
      return '내 계정은 친구로 추가할 수 없습니다.';
    }

    return '현재 친구로 추가할 수 없습니다.';
  }

  function renderFriendSearchResult() {
    var box = byId('spR10NOFriendResult');
    if (!box) return;

    if (state.friendBusy) {
      box.innerHTML =
        '<p>검색 중입니다.</p>';
      return;
    }

    var result = state.friendResult;

    if (!result) {
      box.innerHTML =
        '<p>정확한 로그인ID, 전체 전화번호 또는 전체 이름으로 검색하세요.</p>';
      return;
    }

    var name =
      result.ambiguous === true ||
      result.found !== true ||
      result.exactMatch !== true
        ? ''
        : text(result.maskedName).trim();
    var message = relationMessage(result);
    var canRequest =
      result.found === true &&
      result.exactMatch === true &&
      result.ambiguous !== true &&
      result.eligible === true;

    box.innerHTML =
      '<div class="sp-r10no-friend-result-card">' +
        (name
          ? '<b>' + html(name) + '</b>'
          : '') +
        '<span>' + html(message) + '</span>' +
        (canRequest
          ? '<button type="button" data-r10no-request-friend="1">' +
              '친구 요청' +
            '</button>'
          : '') +
      '</div>';
  }

  async function runFriendSearch() {
    if (state.friendBusy) return false;

    var input = byId('spR10NOFriendQuery');
    var query = text(input && input.value).trim();

    state.friendQuery = query;
    state.friendResult = null;

    if (!query) {
      renderFriendSearchResult();
      return false;
    }

    var api = window.SitePassFriendCenterV1;
    if (
      !api ||
      typeof api.searchExact !== 'function'
    ) {
      state.friendResult = {
        found: false,
        ambiguous: false,
        eligible: false
      };
      renderFriendSearchResult();
      return false;
    }

    state.friendBusy = true;
    renderFriendSearchResult();

    try {
      state.friendResult =
        await api.searchExact(query);
    } catch (error) {
      state.friendResult = {
        found: false,
        ambiguous: false,
        eligible: false
      };
    } finally {
      state.friendBusy = false;
      renderFriendSearchResult();
    }

    return false;
  }

  async function requestFriendFromDialog() {
    if (
      state.friendBusy ||
      !state.friendQuery
    ) {
      return false;
    }

    var api = window.SitePassFriendCenterV1;
    if (
      !api ||
      typeof api.requestFriend !== 'function'
    ) {
      return false;
    }

    state.friendBusy = true;
    renderFriendSearchResult();

    try {
      await api.requestFriend(
        state.friendQuery
      );

      if (typeof api.searchExact === 'function') {
        state.friendResult =
          await api.searchExact(
            state.friendQuery
          );
      }
    } catch (error) {
      var snapshot =
        typeof api.getState === 'function'
          ? api.getState()
          : null;

      state.friendResult =
        snapshot && snapshot.searchResult
          ? snapshot.searchResult
          : state.friendResult;
    } finally {
      state.friendBusy = false;
      renderFriendSearchResult();
      scheduleRefresh(0);
      scheduleRefresh(300);
    }

    return false;
  }

  function bindObserver(target, stateKey) {
    if (!target || state[stateKey]) return;

    state[stateKey] = new MutationObserver(
      function () {
        scheduleRefresh(0);
      }
    );

    state[stateKey].observe(
      target,
      {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          'class',
          'aria-pressed',
          'disabled',
          'data-sp-r10no-sort-at'
        ]
      }
    );
  }

  function ensureObservers() {
    bindObserver(
      byId('sitepassChatRoomList'),
      'fixedObserver'
    );
    bindObserver(
      byId('sp566MemberRoomList'),
      'memberObserver'
    );
    bindObserver(
      byId('spF1FriendCenter'),
      'friendObserver'
    );
  }

  function scheduleRefresh(delay) {
    window.setTimeout(
      refreshUnified,
      Math.max(0, Number(delay || 0))
    );
  }

  function refreshUnified() {
    var panel = byId('sitepassChatListPanel');
    var legacyList = byId('sitepassChatRoomList');

    if (!panel || !legacyList) {
      return false;
    }

    var ok = renderUnifiedList();
    ensureObservers();
    return ok;
  }

  function bind() {
    if (state.initialized) return;
    state.initialized = true;

    [
      'sitepass-support-room-updated-v85',
      'sitepass-member-link-chat-updated-v566',
      'sitepass-friend-relationship-updated-v1',
      'sitepass-room-push-updated-v595',
      'sitepass:screen-changed'
    ].forEach(function (eventName) {
      window.addEventListener(
        eventName,
        function () {
          scheduleRefresh(0);
          scheduleRefresh(250);
        }
      );
    });

    window.addEventListener(
      'focus',
      function () {
        scheduleRefresh(0);
      }
    );

    window.addEventListener(
      'pageshow',
      function () {
        scheduleRefresh(0);
        scheduleRefresh(250);
      }
    );

    document.addEventListener(
      'visibilitychange',
      function () {
        if (!document.hidden) {
          scheduleRefresh(0);
        }
      }
    );
  }

  function init() {
    bind();
    ensureFriendDialog();
    ensureLinkedBulkDialog();
    refreshUnified();
  }

  window.SitePassChatListLayoutR10H =
    Object.freeze({
      refresh: refreshUnified,
      openRecent: function () {
        return false;
      },
      getState: function () {
        return {
          unified: true,
          activeTab: state.activeTab,
          searchOpen: state.searchOpen,
          linkedBulkOpen: state.linkedBulkOpen,
          linkedBulkTargetCount:
            Array.isArray(state.linkedBulkTargets)
              ? state.linkedBulkTargets.length
              : 0,
          linkedBulkSelectedCount:
            linkedBulkSelectedIds().length,
          linkedBulkSending:
            state.linkedBulkSending === true,
          rowCount:
            byId('spR10NOUnifiedList')
              ? byId('spR10NOUnifiedList')
                  .querySelectorAll(
                    '.sp-r10no-unified-card'
                  ).length
              : 0
        };
      }
    });

  window.SitePassChatListR10NO =
    window.SitePassChatListLayoutR10H;

  /* SitePass v23.7.740 R10NO linked-member broadcast UI
   * - 연동회원 탭에서만 단체메시지 버튼 표시
   * - 신규 linked-member broadcast RPC 2개만 사용
   * - 기존 owner-broadcast/1:1 채팅/Push/Realtime 로직은 변경하지 않음
   */
  document.addEventListener(
    'DOMContentLoaded',
    function () {
      init();
      setTimeout(init, 300);
      setTimeout(refreshUnified, 1200);
      setTimeout(refreshUnified, 3500);
    },
    { once: true }
  );
})();
