// SitePass STEP96 - admin settings page
(function(){
  'use strict';

  var SETTINGS = [
    {
      key: 'members.page_size',
      inputId: 'sitepassStep96MembersPageSize',
      label: '회원관리 페이지 크기',
      note: '현재 기준값 20'
    },
    {
      key: 'notifications.operation_page_size',
      inputId: 'sitepassStep96NotificationsPageSize',
      label: '푸시 운영이슈 페이지 크기',
      note: '현재 기준값 20'
    },
    {
      key: 'support_chats.room_list_page_size',
      inputId: 'sitepassStep96SupportRoomListPageSize',
      label: '고객센터 문의방 목록 페이지 크기',
      note: '현재 기준값 30'
    },
    {
      key: 'support_chats.room_detail_page_size',
      inputId: 'sitepassStep96SupportRoomDetailPageSize',
      label: '고객센터 메시지 상세 페이지 크기',
      note: '현재 기준값 50'
    },
    {
      key: 'recipient_shares.link_days',
      inputId: 'sitepassStep100RecipientShareLinkDays',
      label: '수신자 링크 유효기간',
      note: '새로 발급·갱신되는 링크에 적용 · 1일 / 7일 / 15일 / 30일',
      type: 'select',
      options: [1, 7, 15, 30]
    }
  ];

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function requestRender(){
    try {
      if (typeof window.sitePassRequestAdminRender487 === 'function') {
        window.sitePassRequestAdminRender487(10);
      }
    } catch (e) {}
  }

  function api(){
    return window.SitePassAdminSettingsV96 || null;
  }

  async function ensureActive(){
    var mod = api();
    if (!mod || typeof mod.getState !== 'function' || typeof mod.load !== 'function') return false;

    var state = mod.getState();
    if (state.loading || state.loaded) return true;

    requestRender();
    var result = await mod.load({ force:false });
    requestRender();
    return !!(result && result.ok);
  }

  async function refresh(){
    var mod = api();
    if (!mod || typeof mod.load !== 'function') return false;

    requestRender();
    await mod.load({ force:true });
    requestRender();
    return false;
  }

  async function saveSetting(key, inputId){
    var mod = api();
    if (!mod || typeof mod.getState !== 'function' || typeof mod.findItem !== 'function' || typeof mod.save !== 'function') {
      return false;
    }

    var current = mod.findItem(key);
    if (!current) {
      window.alert('현재 설정값을 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
      return false;
    }

    var el = document.getElementById(inputId);
    var nextValue = Number(el && el.value);

    if (key === 'recipient_shares.link_days') {
      if ([1, 7, 15, 30].indexOf(nextValue) < 0) {
        window.alert('수신자 링크 유효기간은 1일, 7일, 15일, 30일 중에서만 선택할 수 있습니다.');
        return false;
      }
    } else if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > 100) {
      window.alert('페이지 크기는 1~100 사이의 정수만 사용할 수 있습니다.');
      return false;
    }

    if (nextValue === current.value) {
      window.alert('변경된 값이 없습니다.');
      return false;
    }

    if (!window.confirm(
      '설정값을 ' + current.value + ' → ' + nextValue + ' 로 변경할까요?'
    )) {
      return false;
    }

    requestRender();
    var result = await mod.save(key, nextValue, current.version);
    requestRender();

    if (!result || result.ok !== true) {
      window.alert('설정 저장에 실패했습니다: ' + esc((result && (result.error || result.code)) || 'UNKNOWN_ERROR'));
      return false;
    }

    window.alert(result.changed ? '설정을 저장했습니다.' : '변경된 값이 없습니다.');
    return false;
  }

  function renderSettingRow(def, item, saving){
    var value = item ? item.value : '';
    var version = item ? item.version : '-';
    var updatedAt = item && item.updatedAt ? new Date(item.updatedAt) : null;
    var updatedText = updatedAt && !Number.isNaN(updatedAt.getTime())
      ? updatedAt.toLocaleString()
      : '-';

    var inputHtml = '';
    if (def.type === 'select' && Array.isArray(def.options)) {
      inputHtml =
        '<select id="' + esc(def.inputId) + '" style="width:110px;" aria-label="' + esc(def.label) + '">' +
          def.options.map(function(option){
            var selected = Number(value) === Number(option) ? ' selected' : '';
            return '<option value="' + esc(option) + '"' + selected + '>' + esc(option) + '일</option>';
          }).join('') +
        '</select>';
    } else {
      inputHtml =
        '<input id="' + esc(def.inputId) + '" type="number" min="1" max="100" step="1" value="' + esc(value) + '" ' +
          'style="width:110px;" aria-label="' + esc(def.label) + '">';
    }

    return '<div class="card" style="box-shadow:none;margin:10px 0;">' +
      '<div><b>' + esc(def.label) + '</b></div>' +
      '<div class="small" style="margin-top:4px;">' +
        esc(def.key) + ' · ' + esc(def.note) +
      '</div>' +
      '<div class="actions" style="margin-top:8px;align-items:center;">' +
        inputHtml +
        '<button type="button" class="primary" ' + (saving ? 'disabled ' : '') +
          'onclick="return SitePassAdminSettingsPageV96.saveSetting(\'' + esc(def.key) + '\',\'' + esc(def.inputId) + '\')">저장</button>' +
      '</div>' +
      '<div class="small" style="margin-top:5px;">version ' + esc(version) + ' · 마지막 변경 ' + esc(updatedText) + '</div>' +
    '</div>';
  }

  function render(){
    var mod = api();
    if (!mod || typeof mod.getState !== 'function') {
      return '<div class="notice">시스템설정 모듈을 불러오지 못했습니다.</div>';
    }

    var state = mod.getState();

    var controls =
      '<div class="actions" style="margin:8px 0;">' +
        '<button type="button" class="ghost" ' + (state.loading || state.saving ? 'disabled ' : '') +
          'onclick="return SitePassAdminSettingsPageV96.refresh()">새로고침</button>' +
      '</div>';

    if (state.loading && !state.loaded) {
      return '<div class="card" style="box-shadow:none;">' +
        '<h3>시스템설정</h3>' +
        '<div class="notice blue-note">설정을 1회 조회 중입니다.</div>' +
        controls +
      '</div>';
    }

    if (state.error && !state.loaded) {
      return '<div class="card" style="box-shadow:none;">' +
        '<h3>시스템설정</h3>' +
        '<div class="notice">설정 조회 실패: ' + esc(state.error) + '</div>' +
        controls +
      '</div>';
    }

    if (!state.loaded) {
      return '<div class="card" style="box-shadow:none;">' +
        '<h3>시스템설정</h3>' +
        '<div class="notice blue-note">설정을 불러오기 전입니다.</div>' +
        controls +
      '</div>';
    }

    var byKey = {};
    (state.items || []).forEach(function(item){
      byKey[item.key] = item;
    });

    var body = SETTINGS.map(function(def){
      return renderSettingRow(def, byKey[def.key] || null, state.saving);
    }).join('');

    return '<div class="card" style="box-shadow:none;">' +
      '<h3>시스템설정</h3>' +
      '<div class="notice blue-note">' +
        '최고관리자 전용입니다. 자동 polling · Realtime · 백그라운드 갱신은 사용하지 않습니다. ' +
        '실제 변경이 있을 때만 서버 감사기록을 남깁니다.' +
      '</div>' +
      controls +
      (state.error ? '<div class="notice">최근 작업 오류: ' + esc(state.error) + '</div>' : '') +
      body +
    '</div>';
  }

  window.SitePassAdminSettingsPageV96 = Object.freeze({
    render: render,
    ensureActive: ensureActive,
    refresh: refresh,
    saveSetting: saveSetting
  });
})();
