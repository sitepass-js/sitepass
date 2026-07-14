/* SitePass v23.7.466-test - 채팅 읽음확인 + 만료알림 안읽음 수 */
(function(){
  'use strict';

  var NOTICE_KEY = 'sitepass_chat_notice_settings_v460';
  var LEGACY_NOTICE_KEY = 'sitepass_chat_notice_settings_v445';
  var LEGACY_ADMIN_MESSAGES_KEY = 'sitepass_admin_chat_messages_v445';
  var CONTACTS_KEY = 'sitePass_v23_7_7_update_original_corrected_contacts';
  var CURRENT_MEMBER_KEYS = [
    'sitePass_v23_7_7_update_original_corrected_currentMember',
    'sitePass_v23_7_7_update_original_corrected_pwa_auto_member_v23_7_145',
    'sitePass_v23_7_7_update_original_corrected_browser_auto_member_v23_7_395'
  ];
  var EXPIRY_DELETED_PREFIX = 'sitepass_expiry_deleted_v460:';
  var EXPIRY_READ_PREFIX = 'sitepass_expiry_read_v466:';
  var ADMIN_DELETED_PREFIX = 'sitepass_admin_chat_deleted_v466:';
  var currentRoomId = '';
  var navWrapped = false;
  var deleteMode = false;
  var selectedDeleteGroups = Object.create(null);

  var ROOMS = {
    expiry: { title: '만료 알림방', icon: '⏰', desc: '만료가 가까운 서류 알림을 확인하고 필요한 항목만 선택해 삭제합니다.', type: 'system' },
    share: { title: '공유 기록방', icon: '🔗', desc: '누구에게 언제 링크를 보냈는지 확인합니다.', type: 'system' },
    admin: { title: '관리자 채팅방', icon: '👨‍💼', desc: '관리자와 1:1로 메시지를 주고받습니다.', type: 'admin' }
  };

  function $(id){ return document.getElementById(id); }
  function nowText(value){
    var d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0') + ' '
      + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escapeAttr(value){ return escapeHtml(value); }
  function loadJson(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch(e) { return fallback; }
  }
  function saveJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
  }
  function normalize(value){ return String(value || '').trim().toLowerCase(); }
  function cleanPhone(value){ return String(value || '').replace(/[^0-9]/g, ''); }
  function hashText(value){
    var text = String(value || '');
    var hash = 2166136261;
    for (var i=0; i<text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function getCurrentMember(){
    try {
      if (typeof window.getCurrentMemberTest === 'function') {
        var member = window.getCurrentMemberTest();
        if (member && typeof member === 'object') return member;
      }
    } catch(e) {}
    var stores = [sessionStorage, localStorage];
    for (var s=0; s<stores.length; s++) {
      for (var k=0; k<CURRENT_MEMBER_KEYS.length; k++) {
        try {
          var parsed = JSON.parse(stores[s].getItem(CURRENT_MEMBER_KEYS[k]) || 'null');
          if (parsed && typeof parsed === 'object') return parsed;
        } catch(e) {}
      }
    }
    return null;
  }

  function stripLoginPrefix(value){
    return String(value || '').trim()
      .replace(/^SITEPASS-LOGIN-/i, '')
      .replace(/^SITEPASS-/i, '');
  }

  function currentIdentity(){
    var member = getCurrentMember() || {};
    var loginId = String(member.supabaseLoginId || member.login_id || member.loginId || member.signupId || '').trim();
    if (!loginId) loginId = stripLoginPrefix(member.providerId || member.id || member.userId || '');
    if (!loginId) loginId = cleanPhone(member.phone || member.mobile || '');
    var name = String(member.name || member.companyName || '').trim();
    return {
      loginId: loginId,
      key: normalize(loginId || member.providerId || member.id || member.phone || name || 'guest'),
      name: name,
      phone: cleanPhone(member.phone || member.mobile || member.phoneNumber || ''),
      email: String(member.email || '').trim().toLowerCase(),
      member: member
    };
  }

  function noticeSettings(){
    var base = loadJson(NOTICE_KEY, null);
    if (!base || typeof base !== 'object') base = loadJson(LEGACY_NOTICE_KEY, {});
    ['expiry','share','admin'].forEach(function(room){
      if (typeof base[room] !== 'boolean') base[room] = true;
    });
    saveJson(NOTICE_KEY, base);
    return base;
  }
  function roomNoticeOn(roomId){ return !!noticeSettings()[roomId]; }
  function setRoomNotice(roomId, on){
    var settings = noticeSettings();
    settings[roomId] = !!on;
    saveJson(NOTICE_KEY, settings);
  }

  function safeItems460(){
    try { if (typeof window.safeItems === 'function') return window.safeItems(); } catch(e) {}
    try { if (typeof window.getItems === 'function') return window.getItems(); } catch(e) {}
    try { if (typeof safeItems === 'function') return safeItems(); } catch(e) {}
    try { if (typeof getItems === 'function') return getItems(); } catch(e) {}
    return [];
  }
  function itemTitle(item){
    return String((item && (item.equipmentName || item.equipmentType || item.name || item.bundleTitle || item.title)) || '등록 장비');
  }
  function itemNo(item){
    return String((item && (item.equipmentNo || item.carNo || item.vehicleNo || item.code)) || '번호 미입력');
  }

  function expiryDeletedKey(){ return EXPIRY_DELETED_PREFIX + (currentIdentity().key || 'guest'); }
  function expiryReadKey(){ return EXPIRY_READ_PREFIX + (currentIdentity().key || 'guest'); }
  function adminDeletedKey(){ return ADMIN_DELETED_PREFIX + (currentIdentity().key || 'guest'); }
  function deletedIds(key){
    var rows = loadJson(key, []);
    return Array.isArray(rows) ? rows : [];
  }
  function saveDeletedIds(key, rows){ saveJson(key, Array.from(new Set(rows || []))); }
  function deletedExpiryIds(){ return deletedIds(expiryDeletedKey()); }
  function saveDeletedExpiryIds(rows){ saveDeletedIds(expiryDeletedKey(), rows); }
  function readExpiryIds(){ return deletedIds(expiryReadKey()); }
  function saveReadExpiryIds(rows){ saveDeletedIds(expiryReadKey(), rows); }
  function deletedAdminGroups(){ return deletedIds(adminDeletedKey()); }
  function saveDeletedAdminGroups(rows){ saveDeletedIds(adminDeletedKey(), rows); }

  function expiryMessages(includeDeleted){
    var items = safeItems460();
    var deleted = deletedExpiryIds();
    var readIds = readExpiryIds();
    var messages = [{
      id: 'expiry-guide', from: 'SitePass', kind: 'system', time: '안내',
      text: '보험증·검사증·안전교육 등 만료 알림이 이곳에 쌓입니다. 삭제 버튼을 누른 뒤 필요한 알림만 선택해 삭제할 수 있습니다.',
      deletable: false
    }];
    var actual = [];
    var attentionRows = [];
    try {
      if (typeof window.sitepassGetExpiryAttentionRows465 === 'function') attentionRows = window.sitepassGetExpiryAttentionRows465() || [];
    } catch(e) { attentionRows = []; }
    attentionRows.slice(0, 60).forEach(function(row, index){
      var item = row.item || {};
      var doc = row.doc || {};
      var stableRawId = String(item.code || item.id || item.shareCode || '') + '|' + String(row.docKey || doc.key || '') + '|' + String(row.expireDate || '') + '|' + String(row.reason || '');
      var rawId = stableRawId + '|' + index;
      var id = 'expiry-' + hashText(rawId);
      var readId = 'expiry-read-' + hashText(stableRawId);
      if (!includeDeleted && deleted.indexOf(id) >= 0) return;
      var detail = '';
      if (row.reason === '만료일 미입력') detail = '만료일이 입력되지 않았습니다.';
      else if (row.reason === '만료일 확인 필요') detail = '만료일 형식을 확인해주세요.';
      else if (typeof row.diffDays === 'number' && row.diffDays < 0) detail = Math.abs(row.diffDays) + '일 전에 만료되었습니다.';
      else if (row.diffDays === 0) detail = '오늘 만료됩니다.';
      else if (typeof row.diffDays === 'number') detail = '만료까지 D-' + row.diffDays + '입니다.';
      else detail = row.reason === '만료' ? '만료된 서류입니다.' : '만료가 가까운 서류입니다.';
      actual.push({
        id: id,
        readId: readId,
        deleteGroupId: id,
        from: 'SitePass', kind: 'system', time: '자동알림', deletable: true,
        read: readIds.indexOf(readId) >= 0,
        receipt: readIds.indexOf(readId) >= 0 ? '읽음' : '안 읽음',
        receiptClass: readIds.indexOf(readId) >= 0 ? 'read' : 'unread',
        text: String(row.itemTitle || itemTitle(item)) + ' ' + String(row.itemNo || itemNo(item)) + '\n' + String(row.docTitle || doc.title || '서류') + ' · ' + detail
      });
    });
    if (!items.length) {
      actual.push({
        id: 'expiry-empty', from: 'SitePass', kind: 'system', time: '안내', deletable: false,
        text: '아직 등록된 장비가 없어 만료 알림이 없습니다. 장비 등록 후 이 방에서 만료 알림을 확인할 수 있습니다.'
      });
    } else if (!actual.length) {
      actual.push({
        id: 'expiry-cleared', from: 'SitePass', kind: 'system', time: '안내', deletable: false,
        text: '현재 표시할 만료 알림이 없습니다.'
      });
    }
    return messages.concat(actual);
  }

  function shareMessages(){
    var messages = [{
      id: 'share-guide', from: 'SitePass', kind: 'system', time: '안내',
      text: '카톡·문자·링크로 공유한 기록을 확인합니다.'
    }];
    var history = loadJson('sitepass_share_history_v445', []);
    if (Array.isArray(history) && history.length) {
      history.slice(-30).reverse().forEach(function(row, index){
        messages.push({
          id: 'share-' + hashText(JSON.stringify(row) + index),
          from: 'SitePass', kind: 'system', time: row.time || row.date || '공유기록',
          text: (row.equipment || '서류 링크') + '를 ' + (row.receiver || '담당자') + '에게 공유했습니다.\n전화번호: ' + (row.phone || '미입력') + '\n이메일: ' + (row.email || '미입력') + '\n공유방식: ' + (row.method || '링크')
        });
      });
    } else {
      messages.push({
        id: 'share-empty', from: 'SitePass', kind: 'system', time: '안내',
        text: '아직 저장된 공유 기록이 없습니다. 문자·카톡 공유 기록이 생기면 이 방에 표시됩니다.'
      });
    }
    return messages;
  }

  function getContactsSafe(){
    try { if (typeof window.getContacts === 'function') return window.getContacts(); } catch(e) {}
    try { if (typeof getContacts === 'function') return getContacts(); } catch(e) {}
    var rows = loadJson(CONTACTS_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }
  function setContactsSafe(rows){
    try { if (typeof window.setContacts === 'function') { window.setContacts(rows); return; } } catch(e) {}
    try { if (typeof setContacts === 'function') { setContacts(rows); return; } } catch(e) {}
    saveJson(CONTACTS_KEY, rows || []);
  }

  function isContactForIdentity(item, identity){
    if (!item) return false;
    var rowKey = normalize(item.memberLoginId || item.member_login_id || item.memberKey || item.loginId || '');
    if (rowKey && identity.key) return rowKey === identity.key || rowKey === normalize(identity.loginId);
    if (item.source === 'sitepass_chat_v460') return true;
    return false;
  }

  function adminMessages(){
    var identity = currentIdentity();
    var deleted = deletedAdminGroups();
    var base = [{
      id: 'admin-guide', from: '관리자', kind: 'admin', time: '안내', deletable: false,
      text: '관리자와 1:1로 대화할 수 있습니다. 메시지를 보내면 관리자 답변이 이 방에 이어서 표시됩니다.'
    }];
    var contacts = getContactsSafe().filter(function(item){ return isContactForIdentity(item, identity); });
    contacts.sort(function(a,b){ return new Date(a.createdAt || 0) - new Date(b.createdAt || 0); });
    contacts.forEach(function(item){
      var rawContactId = String(item.id || hashText((item.message || '') + '|' + (item.createdAt || '')));
      var deleteGroupId = 'contact-' + rawContactId;
      if (deleted.indexOf(deleteGroupId) >= 0) return;
      base.push({
        id: 'member-' + rawContactId,
        deleteGroupId: deleteGroupId,
        from: '나', kind: 'me', time: nowText(item.createdAt), text: item.message || '', deletable: true,
        receipt: item.adminReadAt ? '관리자 읽음' : '전송됨',
        receiptClass: item.adminReadAt ? 'read' : 'sent'
      });
      if (item.reply) {
        base.push({
          id: 'admin-' + rawContactId,
          deleteGroupId: deleteGroupId,
          from: '관리자', kind: 'admin', time: nowText(item.repliedAt), text: item.reply || '', deletable: true
        });
      } else {
        base.push({
          id: 'pending-' + rawContactId,
          deleteGroupId: deleteGroupId,
          from: 'SitePass', kind: 'status', time: item.adminReadAt ? '읽음' : '전송됨',
          text: item.adminReadAt ? '관리자가 메시지를 읽었습니다. 답변을 기다려주세요.' : '관리자가 확인하면 이 대화 아래에 답변이 표시됩니다.',
          deletable: true
        });
      }
    });

    if (contacts.length === 0) {
      var legacy = loadJson(LEGACY_ADMIN_MESSAGES_KEY, []);
      if (Array.isArray(legacy)) {
        legacy.forEach(function(msg, index){
          if (!msg || !msg.text) return;
          var groupId = 'legacy-' + index;
          if (deleted.indexOf(groupId) >= 0) return;
          base.push({
            id: groupId,
            deleteGroupId: groupId,
            from: msg.from || '나', kind: msg.kind || 'me', time: msg.time || '', text: msg.text, deletable: true
          });
        });
      }
    }
    return base;
  }

  function messagesFor(roomId){
    if (roomId === 'expiry') return expiryMessages(false);
    if (roomId === 'share') return shareMessages();
    return adminMessages();
  }

  function markExpiryRoomRead(){
    var rows = expiryMessages(false).filter(function(msg){ return !!msg.deletable && !!msg.readId; });
    var ids = readExpiryIds();
    var changed = false;
    rows.forEach(function(msg){
      if (ids.indexOf(msg.readId) < 0) { ids.push(msg.readId); changed = true; }
    });
    if (changed) saveReadExpiryIds(ids);
    return changed;
  }

  function markAdminRepliesReadByMember(){
    var identity = currentIdentity();
    var contacts = getContactsSafe();
    if (!Array.isArray(contacts)) return false;
    var changed = false;
    var now = new Date().toISOString();
    contacts.forEach(function(item){
      if (!isContactForIdentity(item, identity)) return;
      if (item.reply && !item.memberReadAt) {
        item.memberReadAt = now;
        changed = true;
      }
    });
    if (changed) setContactsSafe(contacts);
    return changed;
  }

  function unreadCount(roomId){
    if (roomId === 'expiry') {
      return expiryMessages(false).filter(function(msg){ return !!msg.deletable && !msg.read; }).length;
    }
    if (roomId === 'admin') {
      var identity = currentIdentity();
      return getContactsSafe().filter(function(item){
        return isContactForIdentity(item, identity) && !!item.reply && !item.memberReadAt;
      }).length;
    }
    return 0;
  }

  function totalUnreadCount(){ return unreadCount('expiry') + unreadCount('admin'); }

  function updateBottomUnreadBadge(){
    var button = document.querySelector('#sitepassBottomAppNav button[data-target="contactScreen"]');
    if (!button) return;
    var badge = button.querySelector('.sitepass-bottom-unread-badge');
    if (!badge) {
      badge = document.createElement('i');
      badge.className = 'sitepass-bottom-unread-badge';
      badge.setAttribute('aria-label', '읽지 않은 알림 수');
      button.appendChild(badge);
    }
    var count = totalUnreadCount();
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('hidden', count < 1);
  }

  function latestText(roomId){
    var messages = messagesFor(roomId);
    var last = messages[messages.length - 1];
    return last ? String(last.text || '').replace(/\n/g, ' ').slice(0, 42) : ROOMS[roomId].desc;
  }

  function renderRoomList(){
    var list = $('sitepassChatRoomList');
    if (!list) return;
    var settings = noticeSettings();
    list.innerHTML = ['expiry','share','admin'].map(function(roomId){
      var room = ROOMS[roomId];
      var on = settings[roomId];
      var unread = unreadCount(roomId);
      var unreadHtml = unread > 0 ? '<strong class="sitepass-chat-unread-count">' + (unread > 99 ? '99+' : unread) + '</strong>' : '';
      return '<button type="button" class="sitepass-chat-room-item" onclick="return sitepassOpenChatRoom460(\'' + roomId + '\')">'
        + '<span class="sitepass-chat-room-icon">' + room.icon + '</span>'
        + '<span><b>' + escapeHtml(room.title) + unreadHtml + '</b><small>' + escapeHtml(latestText(roomId)) + '</small></span>'
        + '<span class="sitepass-chat-room-meta"><em class="sitepass-chat-pill' + (on ? '' : ' off') + '">' + (on ? '알림 ON' : '알림 OFF') + '</em><i class="sitepass-chat-time">' + (unread > 0 ? '안 읽음 ' + unread + '개' : '모두 읽음') + '</i></span>'
        + '</button>';
    }).join('');
    updateBottomUnreadBadge();
  }

  function selectedCount(){
    return Object.keys(selectedDeleteGroups).filter(function(key){ return !!selectedDeleteGroups[key]; }).length;
  }

  function updateDeleteBar(){
    var bar = $('sitepassChatDeleteBar');
    var count = $('sitepassChatDeleteCount');
    var confirmButton = $('sitepassChatDeleteConfirm');
    var headerButton = $('sitepassChatDeleteSelect');
    if (bar) bar.classList.toggle('sitepass-chat-hidden', !deleteMode);
    if (count) count.textContent = selectedCount() + '개 선택';
    if (confirmButton) confirmButton.disabled = selectedCount() === 0;
    if (headerButton) headerButton.classList.toggle('sitepass-chat-hidden', deleteMode || (currentRoomId !== 'expiry' && currentRoomId !== 'admin'));
  }

  function resetDeleteMode(){
    deleteMode = false;
    selectedDeleteGroups = Object.create(null);
    updateDeleteBar();
  }

  function renderMessages(roomId){
    var box = $('sitepassChatMessages');
    if (!box) return;
    var messages = messagesFor(roomId);
    box.classList.toggle('selecting', deleteMode);
    box.innerHTML = messages.map(function(msg){
      var kind = escapeHtml(msg.kind || 'system');
      var groupId = String(msg.deleteGroupId || msg.id || '');
      var checkboxHtml = (deleteMode && msg.deletable)
        ? '<label class="sitepass-chat-select-check" title="선택"><input type="checkbox" data-delete-group="' + escapeAttr(groupId) + '" onchange="return sitepassToggleChatMessageSelect465(\'' + escapeAttr(groupId) + '\', this.checked)"' + (selectedDeleteGroups[groupId] ? ' checked' : '') + '><span aria-hidden="true">✓</span></label>'
        : '';
      var receiptHtml = msg.receipt
        ? '<span class="sitepass-chat-read-receipt ' + escapeHtml(msg.receiptClass || '') + '">' + escapeHtml(msg.receipt) + '</span>'
        : '';
      return '<div class="sitepass-chat-message-row ' + kind + '" data-message-id="' + escapeAttr(msg.id || '') + '" data-delete-group="' + escapeAttr(groupId) + '">'
        + checkboxHtml
        + '<div class="sitepass-chat-bubble ' + kind + '">'
        + '<span class="meta">' + escapeHtml(msg.from || 'SitePass') + ' · ' + escapeHtml(msg.time || '') + '</span>'
        + '<div class="sitepass-chat-bubble-text">' + escapeHtml(msg.text || '').replace(/\n/g, '<br>') + '</div>'
        + receiptHtml
        + '</div></div>';
    }).join('');
    updateDeleteBar();
    if (!deleteMode) setTimeout(function(){ try { box.scrollTop = box.scrollHeight; } catch(e) {} }, 30);
  }

  function showRoomActions(roomId){
    var deleteSelect = $('sitepassChatDeleteSelect');
    if (deleteSelect) deleteSelect.classList.toggle('sitepass-chat-hidden', roomId !== 'expiry' && roomId !== 'admin');
    updateDeleteBar();
  }

  function refreshComposerVisibility(){
    var composer = $('sitepassChatComposer');
    if (composer) composer.classList.toggle('sitepass-chat-hidden', currentRoomId !== 'admin' || deleteMode);
  }

  window.sitepassOpenChatRoom460 = function(roomId){
    if (!ROOMS[roomId]) roomId = 'admin';
    currentRoomId = roomId;
    resetDeleteMode();
    if (roomId === 'expiry') markExpiryRoomRead();
    if (roomId === 'admin') markAdminRepliesReadByMember();
    var room = ROOMS[roomId];
    var listPanel = $('sitepassChatListPanel');
    var roomPanel = $('sitepassChatRoomPanel');
    if (listPanel) listPanel.classList.add('sitepass-chat-hidden');
    if (roomPanel) roomPanel.classList.remove('sitepass-chat-hidden');

    var icon = $('sitepassChatRoomIcon');
    var title = $('sitepassChatRoomTitle');
    var desc = $('sitepassChatRoomDesc');
    var toggle = $('sitepassChatNoticeToggle');

    if (icon) icon.textContent = room.icon;
    if (title) title.textContent = room.title;
    if (desc) desc.textContent = room.desc;
    if (toggle) {
      toggle.setAttribute('data-room', roomId);
      toggle.textContent = roomNoticeOn(roomId) ? '알림 ON' : '알림 OFF';
      toggle.classList.toggle('off', !roomNoticeOn(roomId));
    }
    showRoomActions(roomId);
    refreshComposerVisibility();
    renderMessages(roomId);
    renderRoomList();
    updateBottomUnreadBadge();
    return false;
  };

  window.sitepassBackToChatList460 = function(){
    currentRoomId = '';
    resetDeleteMode();
    var listPanel = $('sitepassChatListPanel');
    var roomPanel = $('sitepassChatRoomPanel');
    if (roomPanel) roomPanel.classList.add('sitepass-chat-hidden');
    if (listPanel) listPanel.classList.remove('sitepass-chat-hidden');
    renderRoomList();
    return false;
  };

  window.sitepassOpenChatInbox460 = function(){
    window.sitepassBackToChatList460();
    return false;
  };

  window.sitepassToggleChatNotice460 = function(){
    var toggle = $('sitepassChatNoticeToggle');
    var roomId = (toggle && toggle.getAttribute('data-room')) || currentRoomId || 'admin';
    var next = !roomNoticeOn(roomId);
    setRoomNotice(roomId, next);
    if (toggle) {
      toggle.textContent = next ? '알림 ON' : '알림 OFF';
      toggle.classList.toggle('off', !next);
    }
    renderRoomList();
    try { alert(next ? '이 방의 알림을 켰습니다.' : '이 방의 알림을 껐습니다.'); } catch(e) {}
    return false;
  };

  window.sitepassStartDeleteMode465 = function(){
    if (currentRoomId !== 'expiry' && currentRoomId !== 'admin') return false;
    var deletable = messagesFor(currentRoomId).some(function(msg){ return !!msg.deletable; });
    if (!deletable) {
      alert(currentRoomId === 'expiry' ? '삭제할 만료 알림이 없습니다.' : '삭제할 채팅이 없습니다.');
      return false;
    }
    deleteMode = true;
    selectedDeleteGroups = Object.create(null);
    refreshComposerVisibility();
    renderMessages(currentRoomId);
    return false;
  };

  window.sitepassToggleChatMessageSelect465 = function(groupId, checked){
    var id = String(groupId || '');
    if (!id) return false;
    if (checked) selectedDeleteGroups[id] = true;
    else delete selectedDeleteGroups[id];
    var boxes = document.querySelectorAll('#sitepassChatMessages input[data-delete-group="' + (window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"')) + '"]');
    Array.prototype.forEach.call(boxes, function(box){ box.checked = !!checked; });
    updateDeleteBar();
    return false;
  };

  window.sitepassCancelDeleteMode465 = function(){
    resetDeleteMode();
    refreshComposerVisibility();
    renderMessages(currentRoomId);
    return false;
  };

  window.sitepassConfirmSelectedDelete465 = function(){
    var groups = Object.keys(selectedDeleteGroups).filter(function(key){ return !!selectedDeleteGroups[key]; });
    if (!groups.length) {
      alert('삭제할 항목을 선택해주세요.');
      return false;
    }
    var message = currentRoomId === 'admin'
      ? '선택한 대화를 삭제할까요? 질문과 답변이 같은 대화로 연결된 경우 함께 숨겨집니다.'
      : '선택한 만료 알림을 삭제할까요?';
    if (!confirm(message)) return false;
    if (currentRoomId === 'expiry') {
      saveDeletedExpiryIds(deletedExpiryIds().concat(groups));
    } else if (currentRoomId === 'admin') {
      saveDeletedAdminGroups(deletedAdminGroups().concat(groups));
    }
    resetDeleteMode();
    refreshComposerVisibility();
    renderMessages(currentRoomId);
    renderRoomList();
    return false;
  };

  // 이전 버전 개별/전체삭제 호출이 남아 있어도 선택삭제 모드로 연결합니다.
  window.sitepassDeleteChatMessage460 = function(){ return window.sitepassStartDeleteMode465(); };
  window.sitepassDeleteAllExpiry460 = function(){ return window.sitepassStartDeleteMode465(); };

  window.sitepassSubmitAdminChat460 = function(){
    var identity = currentIdentity();
    var text = $('sitepassChatText') ? $('sitepassChatText').value.trim() : '';
    if (!identity.loginId) {
      alert('로그인 회원정보를 확인할 수 없습니다. 다시 로그인한 뒤 이용해주세요.');
      return false;
    }
    if (!text) {
      alert('메시지 내용을 입력해주세요.');
      return false;
    }
    var contacts = getContactsSafe();
    if (!Array.isArray(contacts)) contacts = [];
    contacts.push({
      id: 'CHAT' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      type: '관리자 채팅',
      message: text,
      reply: '',
      status: '답변대기',
      createdAt: new Date().toISOString(),
      repliedAt: '',
      adminReadAt: '',
      memberReadAt: '',
      source: 'sitepass_chat_v460',
      memberLoginId: identity.loginId,
      memberKey: identity.key,
      name: identity.name || identity.loginId,
      phone: identity.phone || '',
      email: identity.email || ''
    });
    setContactsSafe(contacts);
    if ($('sitepassChatText')) $('sitepassChatText').value = '';
    renderMessages('admin');
    renderRoomList();
    try {
      if (typeof window.renderAdmin === 'function' && typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) window.renderAdmin();
    } catch(e) {}
    return false;
  };

  function wrapBottomNav(){
    if (navWrapped || typeof window.sitepassBottomNavGo !== 'function') return;
    navWrapped = true;
    var previous = window.sitepassBottomNavGo;
    window.sitepassBottomNavGo = function(target){
      if (target === 'usageGuideScreen') target = 'contactScreen';
      if (target === 'contactScreen') window.sitepassOpenChatInbox460();
      return previous.apply(this, arguments.length ? [target] : arguments);
    };
  }

  function init(){
    renderRoomList();
    wrapBottomNav();
    updateBottomUnreadBadge();
  }

  window.sitepassOpenChatRoom445 = window.sitepassOpenChatRoom460;
  window.sitepassBackToChatList445 = window.sitepassBackToChatList460;
  window.sitepassToggleChatNotice445 = window.sitepassToggleChatNotice460;
  window.sitepassSubmitAdminChat445 = window.sitepassSubmitAdminChat460;

  document.addEventListener('DOMContentLoaded', function(){
    init();
    setTimeout(init, 120);
    setTimeout(init, 600);
  });
  window.addEventListener('pageshow', function(){ setTimeout(init, 100); });
  setInterval(function(){
    var panelOpen = !$('sitepassChatRoomPanel')?.classList.contains('sitepass-chat-hidden');
    if (!deleteMode && panelOpen && currentRoomId === 'admin') {
      markAdminRepliesReadByMember();
      renderMessages('admin');
    }
    if (!deleteMode && panelOpen && currentRoomId === 'expiry') {
      markExpiryRoomRead();
      renderMessages('expiry');
    }
    renderRoomList();
    updateBottomUnreadBadge();
  }, 2500);
})();
