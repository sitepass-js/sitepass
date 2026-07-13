/* SitePass v23.7.448 - 회원 ↔ 관리자 채팅방 + 알림 ON/OFF */
(function(){
  var NOTICE_KEY = 'sitepass_chat_notice_settings_v445';
  var ADMIN_MESSAGES_KEY = 'sitepass_admin_chat_messages_v445';

  var ROOMS = {
    expiry: { title: '만료 알림방', icon: '⏰', desc: '만료 남은 서류가 대화글처럼 쌓입니다.', type: 'system' },
    share: { title: '공유 기록방', icon: '🔗', desc: '누구에게 언제 링크를 보냈는지 확인합니다.', type: 'system' },
    admin: { title: '관리자 문의방', icon: '👨‍💼', desc: '회원과 관리자가 1:1로 문의·답변합니다.', type: 'admin' }
  };

  function $(id){ return document.getElementById(id); }
  function nowText(){
    var d = new Date();
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
  function noticeSettings(){
    var base = loadJson(NOTICE_KEY, {});
    ['expiry','share','admin'].forEach(function(room){
      if (typeof base[room] !== 'boolean') base[room] = true;
    });
    return base;
  }
  function roomNoticeOn(roomId){ return !!noticeSettings()[roomId]; }
  function setRoomNotice(roomId, on){
    var settings = noticeSettings();
    settings[roomId] = !!on;
    saveJson(NOTICE_KEY, settings);
  }
  function safeItems445(){
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

  function expiryMessages(){
    var items = safeItems445();
    var messages = [{
      from: 'SitePass', kind: 'system', time: '오늘',
      text: '만료 알림방입니다. 보험증·검사증·안전교육 등 만료일 알림이 이곳에 대화글처럼 쌓입니다.'
    }];
    items.slice(0, 5).forEach(function(item){
      messages.push({
        from: 'SitePass', kind: 'system', time: '자동알림',
        text: itemTitle(item) + ' ' + itemNo(item) + ' 서류 만료일을 확인해주세요. 서버 연결 후에는 만료 30일/7일/당일 알림을 폰으로 보냅니다.'
      });
    });
    if (!items.length) {
      messages.push({
        from: 'SitePass', kind: 'system', time: '안내',
        text: '아직 등록된 장비가 없어 만료 알림이 없습니다. 장비 등록 후 이 방에서 만료 알림을 확인할 수 있습니다.'
      });
    }
    return messages;
  }

  function shareMessages(){
    var messages = [{
      from: 'SitePass', kind: 'system', time: '오늘',
      text: '공유 기록방입니다. 카톡·문자·링크 공유 시 날짜, 장비명, 받는 사람, 전화번호, 이메일, 링크 만료일을 이곳에 남기게 됩니다.'
    }];
    var history = loadJson('sitepass_share_history_v445', []);
    if (Array.isArray(history) && history.length) {
      history.slice(-10).reverse().forEach(function(row){
        messages.push({
          from: 'SitePass', kind: 'system', time: row.time || row.date || '공유기록',
          text: (row.equipment || '서류 링크') + '를 ' + (row.receiver || '담당자') + '에게 공유했습니다.\n전화번호: ' + (row.phone || '미입력') + '\n이메일: ' + (row.email || '미입력') + '\n공유방식: ' + (row.method || '링크')
        });
      });
    } else {
      messages.push({
        from: 'SitePass', kind: 'system', time: '안내',
        text: '아직 저장된 공유 기록이 없습니다. 다음 단계에서 문자/카톡 공유 버튼과 연결해 자동 기록되게 하겠습니다.'
      });
    }
    return messages;
  }

  function adminMessages(){
    var saved = loadJson(ADMIN_MESSAGES_KEY, []);
    var base = [{
      from: '관리자', kind: 'admin', time: '안내',
      text: '관리자 문의방입니다. 문의를 남기면 관리자 화면에서 확인하고 답변할 수 있게 연결합니다.'
    }];
    return base.concat(Array.isArray(saved) ? saved : []);
  }

  function messagesFor(roomId){
    if (roomId === 'expiry') return expiryMessages();
    if (roomId === 'share') return shareMessages();
    return adminMessages();
  }

  function latestText(roomId){
    var messages = messagesFor(roomId);
    var last = messages[messages.length - 1];
    return last ? last.text.replace(/\n/g, ' ').slice(0, 38) : ROOMS[roomId].desc;
  }

  function renderRoomList(){
    var list = $('sitepassChatRoomList');
    if (!list) return;
    var settings = noticeSettings();
    list.innerHTML = ['expiry','share','admin'].map(function(roomId){
      var room = ROOMS[roomId];
      var on = settings[roomId];
      return '<button type="button" class="sitepass-chat-room-item" onclick="sitepassOpenChatRoom445(\'' + roomId + '\')">'
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
      return '<div class="sitepass-chat-bubble ' + escapeHtml(msg.kind || 'system') + '">'
        + '<span class="meta">' + escapeHtml(msg.from || 'SitePass') + ' · ' + escapeHtml(msg.time || '') + '</span>'
        + escapeHtml(msg.text || '').replace(/\n/g, '<br>')
        + '</div>';
    }).join('');
    setTimeout(function(){ try { box.scrollTop = box.scrollHeight; } catch(e) {} }, 30);
  }

  window.sitepassOpenChatRoom445 = function(roomId){
    if (!ROOMS[roomId]) roomId = 'admin';
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
    renderMessages(roomId);
    return false;
  };

  window.sitepassBackToChatList445 = function(){
    var listPanel = $('sitepassChatListPanel');
    var roomPanel = $('sitepassChatRoomPanel');
    if (roomPanel) roomPanel.classList.add('sitepass-chat-hidden');
    if (listPanel) listPanel.classList.remove('sitepass-chat-hidden');
    renderRoomList();
    return false;
  };

  window.sitepassToggleChatNotice445 = function(){
    var toggle = $('sitepassChatNoticeToggle');
    var roomId = (toggle && toggle.getAttribute('data-room')) || 'admin';
    var next = !roomNoticeOn(roomId);
    setRoomNotice(roomId, next);
    if (toggle) {
      toggle.textContent = next ? '알림 ON' : '알림 OFF';
      toggle.classList.toggle('off', !next);
    }
    renderRoomList();
    try { alert(next ? '이 채팅방 알림을 켰습니다.' : '이 채팅방 알림을 껐습니다.'); } catch(e) {}
    return false;
  };

  window.sitepassSubmitAdminChat445 = function(){
    var name = $('sitepassChatName') ? $('sitepassChatName').value.trim() : '';
    var phone = $('sitepassChatPhone') ? $('sitepassChatPhone').value.trim() : '';
    var email = $('sitepassChatEmail') ? $('sitepassChatEmail').value.trim() : '';
    var text = $('sitepassChatText') ? $('sitepassChatText').value.trim() : '';
    if (!text) {
      try { alert('문의 내용을 입력해주세요.'); } catch(e) {}
      return false;
    }
    var messages = loadJson(ADMIN_MESSAGES_KEY, []);
    if (!Array.isArray(messages)) messages = [];
    var contact = [];
    if (name) contact.push('이름/업체: ' + name);
    if (phone) contact.push('전화: ' + phone);
    if (email) contact.push('메일: ' + email);
    messages.push({ from: '나', kind: 'me', time: nowText(), text: text + (contact.length ? '\n' + contact.join('\n') : '') });
    messages.push({
      from: 'SitePass', kind: 'system', time: '접수완료',
      text: '문의가 접수되었습니다. 관리자 답변이 오면 이 방에 표시하고, 서버 연결 후에는 문자/푸시 알림으로 알려드립니다.'
    });
    saveJson(ADMIN_MESSAGES_KEY, messages);
    if ($('sitepassChatText')) $('sitepassChatText').value = '';
    renderMessages('admin');
    renderRoomList();
    return false;
  };

  function init(){
    renderRoomList();
  }
  document.addEventListener('DOMContentLoaded', function(){
    init();
    setTimeout(init, 120);
    setTimeout(init, 500);
  });
  window.addEventListener('pageshow', function(){ setTimeout(init, 100); });
})();
