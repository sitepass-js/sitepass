/* SitePass v23.7.460-test - 알림/쪽지함 목록복귀 + 만료알림 삭제 + 로그인회원 자동식별 관리자 채팅 */
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
  var currentRoomId = '';
  var navWrapped = false;

  var ROOMS = {
    expiry: { title: '만료 알림방', icon: '⏰', desc: '만료가 가까운 서류 알림을 확인하고 필요 없는 알림은 삭제합니다.', type: 'system' },
    share: { title: '공유 기록방', icon: '🔗', desc: '누구에게 언제 링크를 보냈는지 확인합니다.', type: 'system' },
    admin: { title: '관리자 문의방', icon: '👨‍💼', desc: '로그인한 회원 계정으로 관리자와 1:1 대화합니다.', type: 'admin' }
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
  function deletedExpiryIds(){
    var rows = loadJson(expiryDeletedKey(), []);
    return Array.isArray(rows) ? rows : [];
  }
  function saveDeletedExpiryIds(rows){ saveJson(expiryDeletedKey(), Array.from(new Set(rows || []))); }

  function expiryMessages(includeDeleted){
    var items = safeItems460();
    var deleted = deletedExpiryIds();
    var messages = [{
      id: 'expiry-guide', from: 'SitePass', kind: 'system', time: '안내',
      text: '보험증·검사증·안전교육 등 만료 알림이 이곳에 쌓입니다. 확인이 끝난 알림은 삭제할 수 있습니다.',
      deletable: false
    }];
    var actual = [];
    items.slice(0, 30).forEach(function(item, index){
      var rawId = String(item && (item.code || item.id || item.shareCode || '')) + '|' + itemTitle(item) + '|' + itemNo(item) + '|' + index;
      var id = 'expiry-' + hashText(rawId);
      if (!includeDeleted && deleted.indexOf(id) >= 0) return;
      actual.push({
        id: id,
        from: 'SitePass', kind: 'system', time: '자동알림', deletable: true,
        text: itemTitle(item) + ' ' + itemNo(item) + ' 서류 만료일을 확인해주세요.'
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
        text: '현재 표시할 만료 알림이 없습니다. 삭제한 알림은 같은 자료가 새 알림 조건이 되면 다시 표시되도록 개선할 예정입니다.'
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
    var base = [{
      id: 'admin-guide', from: '관리자', kind: 'admin', time: '안내',
      text: identity.loginId
        ? identity.loginId + ' 회원님, 문의 내용을 보내면 이 방에서 관리자 답변을 이어서 확인할 수 있습니다.'
        : '로그인 회원정보를 확인하고 있습니다. 로그인 후 문의를 보내주세요.'
    }];
    var contacts = getContactsSafe().filter(function(item){ return isContactForIdentity(item, identity); });
    contacts.sort(function(a,b){ return new Date(a.createdAt || 0) - new Date(b.createdAt || 0); });
    contacts.forEach(function(item){
      base.push({
        id: 'member-' + String(item.id || hashText(item.message)),
        from: '나', kind: 'me', time: nowText(item.createdAt), text: item.message || ''
      });
      if (item.reply) {
        base.push({
          id: 'admin-' + String(item.id || hashText(item.reply)),
          from: '관리자', kind: 'admin', time: nowText(item.repliedAt), text: item.reply || ''
        });
      } else {
        base.push({
          id: 'pending-' + String(item.id || hashText(item.message)),
          from: 'SitePass', kind: 'status', time: '전송됨', text: '관리자가 확인하면 이 대화 아래에 답변이 표시됩니다.'
        });
      }
    });

    if (contacts.length === 0) {
      var legacy = loadJson(LEGACY_ADMIN_MESSAGES_KEY, []);
      if (Array.isArray(legacy)) {
        legacy.forEach(function(msg, index){
          if (!msg || !msg.text) return;
          base.push({ id:'legacy-' + index, from:msg.from || '나', kind:msg.kind || 'me', time:msg.time || '', text:msg.text });
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
      return '<button type="button" class="sitepass-chat-room-item" onclick="return sitepassOpenChatRoom460(\'' + roomId + '\')">'
        + '<span class="sitepass-chat-room-icon">' + room.icon + '</span>'
        + '<span><b>' + escapeHtml(room.title) + '</b><small>' + escapeHtml(latestText(roomId)) + '</small></span>'
        + '<span class="sitepass-chat-room-meta"><em class="sitepass-chat-pill' + (on ? '' : ' off') + '">' + (on ? '알림 ON' : '알림 OFF') + '</em><i class="sitepass-chat-time">방 열기</i></span>'
        + '</button>';
    }).join('');
  }

  function renderMessages(roomId){
    var box = $('sitepassChatMessages');
    if (!box) return;
    var messages = messagesFor(roomId);
    box.innerHTML = messages.map(function(msg){
      var deleteHtml = (roomId === 'expiry' && msg.deletable)
        ? '<button type="button" class="sitepass-chat-message-delete" onclick="return sitepassDeleteChatMessage460(\'' + escapeHtml(msg.id) + '\')">삭제</button>'
        : '';
      return '<div class="sitepass-chat-bubble ' + escapeHtml(msg.kind || 'system') + '" data-message-id="' + escapeHtml(msg.id || '') + '">'
        + '<span class="meta">' + escapeHtml(msg.from || 'SitePass') + ' · ' + escapeHtml(msg.time || '') + '</span>'
        + '<div class="sitepass-chat-bubble-text">' + escapeHtml(msg.text || '').replace(/\n/g, '<br>') + '</div>'
        + deleteHtml
        + '</div>';
    }).join('');
    setTimeout(function(){ try { box.scrollTop = box.scrollHeight; } catch(e) {} }, 30);
  }

  function renderIdentity(){
    var box = $('sitepassChatMemberIdentity');
    if (!box) return;
    var identity = currentIdentity();
    if (identity.loginId) {
      box.innerHTML = '<b>로그인 회원</b><span>' + escapeHtml(identity.name || '회원') + ' · ' + escapeHtml(identity.loginId) + '</span>';
      box.classList.remove('warn');
    } else {
      box.innerHTML = '<b>회원정보 확인 필요</b><span>로그인 후 관리자 문의를 이용해주세요.</span>';
      box.classList.add('warn');
    }
  }

  function showRoomActions(roomId){
    var deleteAll = $('sitepassChatDeleteAll');
    if (deleteAll) deleteAll.classList.toggle('sitepass-chat-hidden', roomId !== 'expiry');
  }

  window.sitepassOpenChatRoom460 = function(roomId){
    if (!ROOMS[roomId]) roomId = 'admin';
    currentRoomId = roomId;
    var room = ROOMS[roomId];
    var listPanel = $('sitepassChatListPanel');
    var roomPanel = $('sitepassChatRoomPanel');
    if (listPanel) listPanel.classList.add('sitepass-chat-hidden');
    if (roomPanel) roomPanel.classList.remove('sitepass-chat-hidden');

    var icon = $('sitepassChatRoomIcon');
    var title = $('sitepassChatRoomTitle');
    var desc = $('sitepassChatRoomDesc');
    var toggle = $('sitepassChatNoticeToggle');
    var composer = $('sitepassChatComposer');

    if (icon) icon.textContent = room.icon;
    if (title) title.textContent = room.title;
    if (desc) desc.textContent = room.desc;
    if (toggle) {
      toggle.setAttribute('data-room', roomId);
      toggle.textContent = roomNoticeOn(roomId) ? '알림 ON' : '알림 OFF';
      toggle.classList.toggle('off', !roomNoticeOn(roomId));
    }
    if (composer) composer.classList.toggle('sitepass-chat-hidden', roomId !== 'admin');
    showRoomActions(roomId);
    renderIdentity();
    renderMessages(roomId);
    return false;
  };

  window.sitepassBackToChatList460 = function(){
    currentRoomId = '';
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

  window.sitepassDeleteChatMessage460 = function(messageId){
    var id = String(messageId || '');
    if (!id || id.indexOf('expiry-') !== 0) return false;
    if (!confirm('이 만료 알림을 삭제할까요?')) return false;
    var deleted = deletedExpiryIds();
    if (deleted.indexOf(id) < 0) deleted.push(id);
    saveDeletedExpiryIds(deleted);
    renderMessages('expiry');
    renderRoomList();
    return false;
  };

  window.sitepassDeleteAllExpiry460 = function(){
    var all = expiryMessages(true).filter(function(msg){ return msg.deletable; }).map(function(msg){ return msg.id; });
    if (!all.length) {
      alert('삭제할 만료 알림이 없습니다.');
      return false;
    }
    if (!confirm('현재 만료 알림을 모두 삭제할까요?')) return false;
    saveDeletedExpiryIds(deletedExpiryIds().concat(all));
    renderMessages('expiry');
    renderRoomList();
    return false;
  };

  window.sitepassSubmitAdminChat460 = function(){
    var identity = currentIdentity();
    var text = $('sitepassChatText') ? $('sitepassChatText').value.trim() : '';
    if (!identity.loginId) {
      alert('로그인 회원정보를 확인할 수 없습니다. 다시 로그인한 뒤 문의해주세요.');
      return false;
    }
    if (!text) {
      alert('문의 내용을 입력해주세요.');
      return false;
    }
    var contacts = getContactsSafe();
    if (!Array.isArray(contacts)) contacts = [];
    contacts.push({
      id: 'CHAT' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      type: '관리자 문의',
      message: text,
      reply: '',
      status: '답변대기',
      createdAt: new Date().toISOString(),
      repliedAt: '',
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
    renderIdentity();
    wrapBottomNav();
  }

  // 이전 HTML/캐시에서 호출해도 v460 구현으로 연결합니다.
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
    if (currentRoomId === 'admin' && !$('sitepassChatRoomPanel')?.classList.contains('sitepass-chat-hidden')) renderMessages('admin');
  }, 2500);
})();
