/*
 * SitePass v23.7.571-test
 * 4구간-37단계-7/7
 *
 * 회원 보관함 카드/선택 툴바 개편 +
 * 서버검증 회원 ID 검색 + 여러 장비 회원채팅 연동요청.
 *
 * 목록·통계:
 *   public.sitepass_list_my_equipment_archive_v1
 *
 * 상세·전송 직전 원본:
 *   public.sitepass_get_equipment_detail_v1
 *
 * 관리자 보관함과 기존 상세/수정/공유/삭제 구현은 교체하지 않고
 * 기존 모듈을 그대로 재사용한다.
 */
(function () {
  'use strict';

  var legacyArchive = window.SitePassArchive || {};
  var legacyRenderList =
    typeof legacyArchive.renderList === 'function'
      ? legacyArchive.renderList.bind(legacyArchive)
      : function () {};
  var legacyDeleteItem =
    typeof legacyArchive.deleteItem === 'function'
      ? legacyArchive.deleteItem.bind(legacyArchive)
      : null;

  var PAGE_SIZE = 10;
  var state = {
    relationType: 'all',
    search: '',
    page: 1,
    loading: false,
    error: '',
    requestKey: '',
    loadedKey: '',
    loadedAt: 0,
    requestSequence: 0,
    data: null,
    linkComposerEquipments: [],
    linkTargetQuery: '',
    linkTargetLoginId: '',
    linkTargetResult: null,
    linkTargetPrepared: false,
    linkLookupBusy: false,
    linkLookupError: '',
    linkLookupSequence: 0,
    linkRequestBusy: false,
    linkBatchIdempotencyKey: '',
    linkRequestedEquipmentIds: new Set(),
    selectedEquipmentIds: new Set()
  };

  var summaryByCode = new Map();
  var summaryByEquipmentId = new Map();
  var runtimeItemByCode = new Map();

  var FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'owned', label: '내 장비' },
    { key: 'linked_in', label: '연동받음' },
    { key: 'linked_out', label: '연동중' },
    { key: 'document_attention', label: '서류주의' }
  ];

  var DOCUMENT_META = {
    businessLicense: {
      title: '사업자등록증',
      required: true,
      expiry: false
    },
    equipmentRegistration: {
      title: '장비등록증',
      required: true,
      expiry: false
    },
    equipmentInspection: {
      title: '장비검사증',
      required: true,
      expiry: true
    },
    insurancePolicy: {
      title: '장비보험증권',
      required: true,
      expiry: true
    },
    specSheet: {
      title: '제원표',
      required: false,
      expiry: false
    },
    ndtInspection: {
      title: '비파괴검사증',
      required: false,
      expiry: true
    },
    equipmentLedger: {
      title: '장비갑원부',
      required: false,
      expiry: false
    },
    otherEquipment: {
      title: '기타 장비서류',
      required: false,
      expiry: false
    }
  };

  function isAdminMode() {
    try {
      return !!(
        typeof window.isAdminLoggedIn === 'function' &&
        window.isAdminLoggedIn()
      );
    } catch (error) {
      return false;
    }
  }

  function isMemberMode() {
    try {
      return !!(
        typeof window.isMemberLoggedIn === 'function' &&
        window.isMemberLoggedIn() &&
        !isAdminMode()
      );
    } catch (error) {
      return false;
    }
  }

  function html(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function js(value) {
    return String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }

  function parseRpcData(value) {
    var parsed = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {}
    }
    return parsed;
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

  async function callRpc(name, params) {
    var api = window.SitePassSupabaseApi;
    if (!api || typeof api.rpc !== 'function') {
      throw new Error('Supabase RPC 연결을 확인하지 못했습니다.');
    }
    var result = await api.rpc(name, params || {});
    if (result && result.error) throw result.error;
    return parseRpcData(result ? result.data : null);
  }

  function getRequestKey() {
    return [
      state.relationType,
      state.search,
      state.page,
      PAGE_SIZE
    ].join('|');
  }

  function getListBox() {
    return document.getElementById('equipmentList');
  }

  function prepareListShell() {
    var title = document.getElementById('listScreenTitle');
    var searchInput = document.getElementById('archiveSearchInput');
    var bottomActions = document.getElementById('listScreenBottomActions');
    if (title) title.textContent = '보관함';
    if (searchInput) {
      searchInput.placeholder = '장비번호·장비명 검색';
      if (searchInput.value !== state.search) searchInput.value = state.search;
    }
    if (bottomActions) bottomActions.innerHTML = '';
  }

  function renderLinkTargetPanel() {
    var items = Array.isArray(state.linkComposerEquipments)
      ? state.linkComposerEquipments
      : [];
    if (!items.length) return '';

    var equipmentCount = items.length;
    var equipmentLabels = items.slice(0, 3).map(function (item) {
      return (
        '<span>' +
          html(item.equipmentName || '장비') +
          ' · ' +
          html(item.equipmentNo || '') +
        '</span>'
      );
    });
    if (equipmentCount > 3) {
      equipmentLabels.push(
        '<span>외 ' + html(equipmentCount - 3) + '대</span>'
      );
    }

    var queryLoginId = String(state.linkTargetQuery || '').trim();
    var targetLoginId = String(state.linkTargetLoginId || '').trim();
    var targetResult =
      state.linkTargetResult && typeof state.linkTargetResult === 'object'
        ? state.linkTargetResult
        : null;
    var maskedName = String(
      targetResult ? targetResult.maskedName || '' : ''
    ).trim();
    var busy = state.linkRequestBusy;
    var lookupMessage = '';

    if (state.linkLookupError) {
      lookupMessage =
        '<p class="sp562-link-lookup-message error">' +
          html(state.linkLookupError) +
        '</p>';
    } else if (targetResult && targetResult.eligible === true) {
      lookupMessage =
        '<div class="sp562-link-member-result">' +
          '<div>' +
            '<span>검색된 회원</span>' +
            '<b>' + html(targetResult.loginId || '') + '</b>' +
            '<small>' + html(maskedName || 'SitePass 회원') + '</small>' +
          '</div>' +
          '<button type="button" onclick="window.SitePassArchiveV562.prepareLinkTarget()">이 회원 선택</button>' +
        '</div>';
    } else if (targetResult && targetResult.reason === 'self') {
      lookupMessage =
        '<p class="sp562-link-lookup-message warning">본인 아이디로는 장비 연동 요청을 보낼 수 없습니다.</p>';
    } else if (targetResult && targetResult.reason === 'not_available') {
      lookupMessage =
        '<p class="sp562-link-lookup-message warning">회원은 확인됐지만 현재 연동 요청을 받을 수 없습니다.</p>';
    } else if (targetResult && targetResult.reason === 'not_found') {
      lookupMessage =
        '<p class="sp562-link-lookup-message error">일치하는 SitePass 회원 아이디가 없습니다.</p>';
    }

    return (
      '<section class="sp562-link-target" aria-live="polite">' +
        '<div class="sp562-link-target-head">' +
          '<div><span>연동 보낼 내 장비</span><b>' +
            html(equipmentCount) +
            '대 선택됨</b></div>' +
          '<button type="button" onclick="window.SitePassArchiveV562.clearLinkTarget()">닫기</button>' +
        '</div>' +
        '<div class="sp562-link-equipment-list">' +
          equipmentLabels.join('') +
        '</div>' +
        (!state.linkTargetPrepared
          ? '<div class="sp562-link-id-row">' +
              '<div class="sp562-link-id-input">' +
                '<svg class="archive-search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.8" cy="10.8" r="6.2"></circle><path d="M15.5 15.5L20 20"></path></svg>' +
                '<input id="memberLinkSearchInput" type="text" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="120" placeholder="연동받을 회원 아이디" aria-label="연동받을 회원 아이디" value="' +
                  html(queryLoginId) +
                  '" oninput="window.SitePassArchiveV562.handleLinkTargetInput(this.value)" onkeydown="if(event.key===&quot;Enter&quot;){event.preventDefault();window.SitePassArchiveV562.searchLinkTarget();}" />' +
              '</div>' +
              '<button type="button" ' +
                (state.linkLookupBusy ? 'disabled ' : '') +
                'onclick="window.SitePassArchiveV562.searchLinkTarget()">' +
                (state.linkLookupBusy ? '확인 중' : '아이디 확인') +
              '</button>' +
            '</div>' +
            lookupMessage +
            '<p>정확한 로그인 아이디만 확인합니다. 이름·전화번호·회원목록 검색은 하지 않습니다.</p>'
          : '<div class="sp562-link-confirm">' +
              '<p><b>' +
                html(targetLoginId) +
                (maskedName ? ' · ' + html(maskedName) : '') +
              '</b> 회원에게 선택한 장비 <strong>' +
                html(equipmentCount) +
              '대</strong>의 연동 요청을 보내시겠습니까?</p>' +
              '<div>' +
                '<button type="button" class="confirm" ' +
                  (busy ? 'disabled ' : '') +
                  'onclick="window.SitePassArchiveV562.requestBatchLink()">' +
                  (busy
                    ? '요청 중'
                    : '확인') +
                '</button>' +
                '<button type="button" onclick="window.SitePassArchiveV562.cancelPreparedLinkTarget()">취소</button>' +
              '</div>' +
              '<small>상대방이 승인해야 실제 연동됩니다.</small>' +
            '</div>') +
      '</section>'
    );
  }

  function registerSummaries(items) {
    summaryByCode.clear();
    summaryByEquipmentId.clear();
    (Array.isArray(items) ? items : []).forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var code = String(item.code || '').trim();
      var equipmentId = String(item.equipmentId || '').trim();
      if (code) summaryByCode.set(code, item);
      if (equipmentId) summaryByEquipmentId.set(equipmentId, item);
    });
    try {
      window.sitePassArchiveSummaryByCodeV562 = summaryByCode;
      window.sitePassArchiveSummaryByEquipmentIdV562 =
        summaryByEquipmentId;
    } catch (error) {}
  }

  function validateArchiveResponse(data) {
    return !!(
      data &&
      typeof data === 'object' &&
      data.ok === true &&
      data.contractVersion === 'sitepass-equipment-archive-v1' &&
      data.counts &&
      data.paging &&
      Array.isArray(data.items)
    );
  }


  var homeSnapshotV571 = {
    data: null,
    loadedAt: 0,
    promise: null,
    authEpoch: 0
  };

  function archiveHomeSnapshotFreshV571(data, loadedAt) {
    return !!(
      validateArchiveResponse(data) &&
      Date.now() - Number(loadedAt || 0) < 30000
    );
  }

  function invalidateHomeSnapshotV571() {
    homeSnapshotV571.data = null;
    homeSnapshotV571.loadedAt = 0;
  }

  async function getHomeSnapshotV571(force) {
    if (!isMemberMode()) {
      return {
        ok: true,
        contractVersion: 'sitepass-equipment-archive-v1',
        counts: {
          registeredCount: 0,
          linkedInCount: 0,
          linkedOutCount: 0,
          totalArchiveCount: 0
        },
        paging: {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 1
        },
        items: []
      };
    }

    if (
      !force &&
      state.relationType === 'all' &&
      !state.search &&
      Number(state.page || 1) === 1 &&
      archiveHomeSnapshotFreshV571(state.data, state.loadedAt)
    ) {
      return state.data;
    }

    if (
      !force &&
      archiveHomeSnapshotFreshV571(
        homeSnapshotV571.data,
        homeSnapshotV571.loadedAt
      )
    ) {
      return homeSnapshotV571.data;
    }

    if (homeSnapshotV571.promise) {
      return homeSnapshotV571.promise;
    }

    var requestEpoch = Number(homeSnapshotV571.authEpoch || 0);

    var requestPromise = (async function () {
      var data = await callRpc(
        'sitepass_list_my_equipment_archive_v1',
        {
          p_page: 1,
          p_page_size: 10,
          p_relation_type: 'all',
          p_search: null
        }
      );

      if (!validateArchiveResponse(data)) {
        throw new Error('홈 장비목록 응답 형식이 올바르지 않습니다.');
      }

      if (requestEpoch !== Number(homeSnapshotV571.authEpoch || 0)) {
        throw new Error('HOME_SNAPSHOT_AUTH_SCOPE_CHANGED');
      }

      homeSnapshotV571.data = data;
      homeSnapshotV571.loadedAt = Date.now();
      registerSummaries(data.items);
      return data;
    })();

    homeSnapshotV571.promise = requestPromise;

    try {
      return await requestPromise;
    } finally {
      if (homeSnapshotV571.promise === requestPromise) {
        homeSnapshotV571.promise = null;
      }
    }
  }

  async function loadArchive(force) {
    if (!isMemberMode()) return;

    var requestKey = getRequestKey();
    var fresh =
      state.loadedKey === requestKey &&
      Date.now() - Number(state.loadedAt || 0) < 60000;

    if (!force && fresh) {
      renderMemberArchive();
      return;
    }
    if (state.loading && state.requestKey === requestKey) return;

    state.loading = true;
    state.error = '';
    state.requestKey = requestKey;
    var requestSequence = ++state.requestSequence;
    renderMemberArchive();

    try {
      var data = await callRpc(
        'sitepass_list_my_equipment_archive_v1',
        {
          p_page: state.page,
          p_page_size: PAGE_SIZE,
          p_relation_type: state.relationType,
          p_search: state.search || null
        }
      );

      if (!validateArchiveResponse(data)) {
        throw new Error('통합 보관함 응답 형식이 올바르지 않습니다.');
      }
      if (requestSequence !== state.requestSequence) return;

      state.data = data;
      state.page = Number(data.paging.page || 1);
      if (
        state.relationType === 'all' &&
        !state.search &&
        Number(state.page || 1) === 1
      ) {
        homeSnapshotV571.data = data;
        homeSnapshotV571.loadedAt = Date.now();
      } else {
        invalidateHomeSnapshotV571();
      }
      state.loadedKey = getRequestKey();
      state.loadedAt = Date.now();
      state.error = '';
      registerSummaries(data.items);
    } catch (error) {
      if (requestSequence !== state.requestSequence) return;
      state.error = errorText(error);
      console.warn('[SitePass v562] 통합 보관함 조회 실패:', error);
    } finally {
      if (requestSequence === state.requestSequence) {
        state.loading = false;
        renderMemberArchive();
      }
    }
  }

  function statCard(label, count, tone) {
    return (
      '<div class="sp562-stat ' +
      html(tone || '') +
      '">' +
      '<span>' +
      html(label) +
      '</span>' +
      '<strong>' +
      html(Number(count || 0)) +
      '<small>대</small></strong>' +
      '</div>'
    );
  }

  function renderStats(counts) {
    counts = counts || {};
    return (
      '<div class="sp562-stats" aria-label="보관함 장비 통계">' +
      statCard('직접등록', counts.registeredCount, 'owned') +
      statCard('연동받음', counts.linkedInCount, 'linked-in') +
      statCard('연동보냄', counts.linkedOutCount, 'linked-out') +
      statCard('등록장비', counts.totalArchiveCount, 'total') +
      '</div>'
    );
  }

  function renderFilters() {
    return (
      '<div class="sp562-filters" role="tablist" aria-label="보관함 필터">' +
      FILTERS.map(function (filter) {
        var active = state.relationType === filter.key;
        return (
          '<button type="button" role="tab" aria-selected="' +
          (active ? 'true' : 'false') +
          '" class="sp562-filter ' +
          (active ? 'active' : '') +
          '" onclick="window.SitePassArchiveV562.setFilter(\'' +
          js(filter.key) +
          '\')">' +
          html(filter.label) +
          '</button>'
        );
      }).join('') +
      '</div>'
    );
  }

  function relationBadges(item) {
    var module =
      window.SitePassEquipmentLinkV82 &&
      window.SitePassEquipmentLinkV82.badge;

    if (
      !module ||
      typeof module.renderRelationBadges !== 'function'
    ) {
      return '';
    }

    return module.renderRelationBadges(item);
  }

  function serviceBadge(item) {
    var relation = String(item.relationType || '');
    var serviceState = String(item.serviceState || '');
    var linkedIn = relation === 'linked_in';
    var label = '';
    var className = '';

    if (serviceState === 'available') {
      label = linkedIn ? '원소유자 서비스 정상' : '서비스 정상';
      className = 'service-ok';
    } else if (serviceState === 'payment_required') {
      label = linkedIn
        ? '원소유자 결제 필요·중단'
        : '결제 필요·중단';
      className = 'service-pay';
    } else {
      label = linkedIn
        ? '원소유자 서비스 중단'
        : '서비스 중단';
      className = 'service-stop';
    }

    return (
      '<span class="sp562-badge service ' +
      className +
      '">' +
      html(label) +
      '</span>'
    );
  }

  function documentStateLabel(prefix, value) {
    value = value || {};
    var stateName = String(value.state || 'missing');
    var days = Number(value.daysRemaining);

    if (stateName === 'missing') return prefix + ' 누락';
    if (stateName === 'date_missing') return prefix + ' 날짜확인';
    if (stateName === 'expired') return prefix + ' 만료';
    if (stateName === 'due_today') return prefix + ' D-DAY';
    if (stateName === 'expiring_soon' && Number.isFinite(days)) {
      return prefix + ' D-' + Math.max(0, days);
    }
    if (stateName === 'normal') return prefix + ' 정상';
    return prefix + ' 확인';
  }

  function documentBadgeClass(value) {
    var stateName = String((value && value.state) || 'missing');
    if (stateName === 'normal') return 'doc-ok';
    if (stateName === 'expiring_soon' || stateName === 'due_today') {
      return 'doc-soon';
    }
    return 'doc-alert';
  }

  function renderStatusBadges(item) {
    var summary = item.documentSummary || {};
    var total = Number(summary.requiredTotal || 4);
    var complete = Number(summary.requiredCompleteCount || 0);
    var missing = Number(summary.requiredMissingCount || 0);
    var inspection = summary.inspection || {};
    var insurance = summary.insurance || {};

    return (
      '<div class="sp562-badges sp562-status-strip">' +
        relationBadges(item) +
        '<span class="sp562-badge document ' +
        (missing > 0 ? 'doc-alert' : 'doc-ok') +
        '">' +
        html(
          missing > 0
            ? '서류 누락 ' + missing + '건'
            : '서류 ' + complete + '/' + total
        ) +
        '</span>' +
        '<span class="sp562-badge document ' +
        documentBadgeClass(inspection) +
        '">' +
        html(documentStateLabel('검사', inspection)) +
        '</span>' +
        '<span class="sp562-badge document ' +
        documentBadgeClass(insurance) +
        '">' +
        html(documentStateLabel('보험', insurance)) +
        '</span>' +
        serviceBadge(item) +
      '</div>'
    );
  }

  function renderMobileStatusBadges(item) {
    var summary = item.documentSummary || {};
    var total = Number(summary.requiredTotal || 4);
    var complete = Number(summary.requiredCompleteCount || 0);
    var missing = Number(summary.requiredMissingCount || 0);
    var inspection = summary.inspection || {};
    var insurance = summary.insurance || {};
    var counterpart = counterpartText(item);

    return (
      '<div class="sp562-mobile-status" aria-label="모바일 장비 상태">' +
        '<div class="sp562-mobile-status-row relation-row">' +
          relationBadges(item) +
          (counterpart
            ? '<span class="sp562-counterpart-mobile">' +
                html(counterpart) +
              '</span>'
            : '') +
        '</div>' +
        '<div class="sp562-mobile-status-row document-row">' +
          '<span class="sp562-badge document ' +
          (missing > 0 ? 'doc-alert' : 'doc-ok') +
          '">' +
          html(
            missing > 0
              ? '서류 누락 ' + missing + '건'
              : '서류 ' + complete + '/' + total
          ) +
          '</span>' +
          '<span class="sp562-badge document ' +
          documentBadgeClass(inspection) +
          '">' +
          html(documentStateLabel('검사', inspection)) +
          '</span>' +
          '<span class="sp562-badge document ' +
          documentBadgeClass(insurance) +
          '">' +
          html(documentStateLabel('보험', insurance)) +
          '</span>' +
          serviceBadge(item) +
        '</div>' +
      '</div>'
    );
  }

  function counterpartText(item) {
    var name = String(item.counterpartDisplayName || '').trim();
    if (!name) return '';
    if (item.relationType === 'linked_out') {
      return '연동회원 · ' + name;
    }
    if (item.relationType === 'linked_in') {
      return '원소유자 · ' + name;
    }
    return '';
  }

  function permission(item, name) {
    return !!(
      item &&
      item.permissions &&
      item.permissions[name] === true
    );
  }

  function renderMoreMenu(item) {
    var code = String(item.code || '');
    var rows = [];

    if (permission(item, 'canArchiveDelete')) {
      rows.push(
        '<button type="button" class="danger" onclick="window.SitePassArchiveV562.deleteOwner(\'' +
          js(code) +
          '\')">삭제</button>'
      );
    }

    if (!rows.length) return '';

    return (
      '<details class="sp562-more">' +
      '<summary aria-label="더보기" title="더보기">⋮</summary>' +
      '<div class="sp562-more-menu">' +
      rows.join('') +
      '</div>' +
      '</details>'
    );
  }

  var EQUIPMENT_IMAGE_MAP = {
    '불도저': '01-bulldozer.webp',
    '굴착기': '02-excavator.webp',
    '로더': '03-loader.webp',
    '지게차': '04-forklift.webp',
    '스크레이퍼': '05-scraper.webp',
    '덤프트럭': '06-dump-truck.webp',
    '기중기': '07-crane.webp',
    '모터그레이더': '08-motor-grader.webp',
    '롤러': '09-roller.webp',
    '노상안정기': '10-soil-stabilizer.webp',
    '콘크리트뱃칭플랜트': '11-batching-plant.webp',
    '콘크리트피니셔': '12-concrete-finisher.webp',
    '콘크리트살포기': '13-concrete-spreader.webp',
    '콘크리트믹서트럭': '14-concrete-mixer-truck.webp',
    '콘크리트펌프': '15-concrete-pump.webp',
    '아스팔트믹싱플랜트': '16-asphalt-mixing-plant.webp',
    '아스팔트피니셔': '17-asphalt-finisher.webp',
    '아스팔트살포기': '18-asphalt-spreader.webp',
    '골재살포기': '19-aggregate-spreader.webp',
    '쇄석기': '20-crusher.webp',
    '공기압축기': '21-air-compressor.webp',
    '천공기': '22-drilling-rig.webp',
    '항타및항발기': '23-pile-driver.webp',
    '자갈채취기': '24-gravel-extractor.webp',
    '준설선': '25-dredger.webp',
    '특수건설기계': '26-special-construction-machine.webp',
    '타워크레인': '27-tower-crane.webp'
  };

  function equipmentImagePath(name) {
    var normalized = String(name || '')
      .replace(/\s+/g, '')
      .trim();
    if (/굴착|굴삭|포크레인|백호/.test(normalized)) {
      normalized = '굴착기';
    } else if (/페이로더|휠로더|로더/.test(normalized)) {
      normalized = '로더';
    } else if (/포크리프트|지게차/.test(normalized)) {
      normalized = '지게차';
    } else if (/덤프/.test(normalized)) {
      normalized = '덤프트럭';
    } else if (/항타|항발|파일드라이버/.test(normalized)) {
      normalized = '항타및항발기';
    }
    var filename =
      EQUIPMENT_IMAGE_MAP[normalized] ||
      EQUIPMENT_IMAGE_MAP['특수건설기계'];
    return './assets/img/equipment-27/' + filename + '?v=450';
  }

  function renderOptionalTemplates(item) {
    var equipmentId = String(item.equipmentId || '');
    var equipmentName = String(item.equipmentName || '장비').trim() || '장비';
    return (
      '<div class="sp562-template-options" aria-label="추가 양식 선택 예정">' +
        '<label title="한글 양식과 담당자 링크 연결 후 활성화됩니다.">' +
          '<input type="checkbox" data-sp562-template="rental" data-equipment-id="' +
            html(equipmentId) +
            '" disabled aria-disabled="true" />' +
          '<span>임대차계약서양식 보내기</span>' +
        '</label>' +
        '<label title="장비종류별 엑셀 작업계획서 연결 후 활성화됩니다.">' +
          '<input type="checkbox" data-sp562-template="work-plan" data-equipment-id="' +
            html(equipmentId) +
            '" disabled aria-disabled="true" />' +
          '<span>' +
            html(equipmentName) +
            ' 작업계획서 보내기</span>' +
        '</label>' +
        '<small>임대차 한글·장비별 작업계획서 엑셀 양식 연결 후 사용</small>' +
      '</div>'
    );
  }

  function renderCard(item) {
    var equipmentId = String(item.equipmentId || '');
    var code = String(item.code || '');
    var equipmentName = String(item.equipmentName || '장비명 없음');
    var equipmentNo = String(item.equipmentNo || '번호 없음');
    var canShare = permission(item, 'canShare');
    var canSelect =
      canShare ||
      permission(item, 'canCreateLinkRequest') ||
      permission(item, 'canRevokeLink');
    var selectionIdentity = equipmentId || code;
    var counterpart = counterpartText(item);
    var imagePath = equipmentImagePath(equipmentName);
    var canEdit = permission(item, 'canEdit');
    var moreMenu = renderMoreMenu(item);
    var actionClass =
      'sp562-card-actions' +
      (canEdit ? '' : ' compact') +
      (moreMenu ? '' : ' no-more');

    return (
      '<article class="sp562-card" data-equipment-id="' +
      html(equipmentId) +
      '" data-equipment-code="' +
      html(code) +
      '">' +
      '<div class="sp562-card-head">' +
        '<div class="sp562-equipment-identity">' +
          '<img class="sp562-equipment-image" src="' +
            html(imagePath) +
            '" alt="' +
            html(equipmentName) +
            '" loading="lazy" />' +
          '<div class="sp562-card-main">' +
            '<div class="sp562-card-title">' +
              '<strong>' +
              html(equipmentName) +
              '</strong>' +
              '<span>' +
              html(equipmentNo) +
              '</span>' +
            '</div>' +
            renderStatusBadges(item) +
          '</div>' +
        '</div>' +
        '<label class="sp562-select ' +
        (canSelect ? '' : 'disabled') +
        '">' +
          '<input type="checkbox" data-sp562-select value="' +
          html(code) +
          '" data-equipment-id="' +
          html(equipmentId) +
          '" ' +
          (canSelect ? '' : 'disabled') +
          (state.selectedEquipmentIds.has(selectionIdentity)
            ? ' checked'
            : '') +
          ' onchange="window.SitePassArchiveV562.updateSelection()" />' +
          '<span>선택</span>' +
        '</label>' +
      '</div>' +
      renderMobileStatusBadges(item) +
      (counterpart
        ? '<div class="sp562-counterpart">' + html(counterpart) + '</div>'
        : '') +
      renderOptionalTemplates(item) +
      '<div class="' +
      actionClass +
      '">' +
      '<button type="button" class="detail" onclick="window.SitePassEquipment.list.openDetail(\'' +
      js(equipmentId) +
      '\',\'' +
      js(code) +
      '\')">상세보기</button>' +
      (canEdit
        ? '<button type="button" class="edit" onclick="window.SitePassEquipment.list.editOwner(\'' +
          js(code) +
          '\')">수정/갱신</button>'
        : '') +
      (canShare
        ? '<button type="button" class="preview" onclick="window.SitePassArchiveV562.openLink(\'' +
          js(equipmentId) +
          '\',\'' +
          js(code) +
          '\')">링크 미리보기</button>'
        : '<button type="button" class="preview" disabled>서비스 중단</button>') +
      moreMenu +
      '</div>' +
      '</article>'
    );
  }

  function renderPagination(paging) {
    paging = paging || {};
    var pageCount = Number(paging.pageCount || 0);
    if (pageCount <= 1) return '';

    var page = Number(paging.page || 1);
    return (
      '<div class="sp562-pagination">' +
      '<button type="button" ' +
      (paging.hasPrevious ? '' : 'disabled') +
      ' onclick="window.SitePassArchiveV562.goToPage(' +
      (page - 1) +
      ')">이전</button>' +
      '<span><b>' +
      html(page) +
      '</b> / ' +
      html(pageCount) +
      '</span>' +
      '<button type="button" ' +
      (paging.hasNext ? '' : 'disabled') +
      ' onclick="window.SitePassArchiveV562.goToPage(' +
      (page + 1) +
      ')">다음</button>' +
      '</div>'
    );
  }

  function renderSelectionBar() {
    return (
      '<div id="sp562SelectionBar" class="sp562-selection-bar" aria-live="polite">' +
      '<strong><span id="sp562SelectionCount">0</span>대 선택</strong>' +
      '<div class="sp562-selection-actions">' +
      '<button type="button" data-sp562-share-action class="kakao" disabled onclick="window.SitePassArchiveV562.shareSelected(\'kakao\')">카카오톡 보내기</button>' +
      '<button type="button" data-sp562-share-action class="sms" disabled onclick="window.SitePassArchiveV562.shareSelected(\'sms\')">문자 보내기</button>' +
      '<button type="button" data-sp562-share-action class="email" disabled onclick="window.SitePassArchiveV562.shareSelected(\'email\')">메일 보내기</button>' +
      '<button type="button" id="sp562LinkActionButton" class="link" disabled onclick="window.SitePassArchiveV562.openLinkActionFromSelection()">연동 보내기</button>' +
      '</div>' +
      '</div>'
    );
  }

  function attachSelectionListeners() {
    Array.from(
      document.querySelectorAll('[data-sp562-select]')
    ).forEach(function (input) {
      input.addEventListener('change', updateSelection);
    });
    updateSelection();
  }

  function renderMemberArchive() {
    prepareListShell();
    var box = getListBox();
    if (!box) return;

    if (!state.data && state.loading) {
      box.innerHTML =
        renderStats({}) +
        renderLinkTargetPanel() +
        '<div class="sp562-status loading"><b>보관함을 불러오는 중입니다.</b><span>소유·연동·결제·서류 상태를 서버에서 확인하고 있습니다.</span></div>';
      return;
    }

    if (!state.data && state.error) {
      box.innerHTML =
        renderStats({}) +
        renderLinkTargetPanel() +
        '<div class="sp562-status error"><b>보관함을 불러오지 못했습니다.</b><span>' +
        html(state.error) +
        '</span><button type="button" onclick="window.SitePassArchiveV562.reload()">다시 불러오기</button></div>';
      return;
    }

    if (!state.data) {
      box.innerHTML =
        renderStats({}) +
        renderLinkTargetPanel() +
        '<div class="sp562-status loading"><b>보관함을 준비하고 있습니다.</b></div>';
      return;
    }

    var data = state.data;
    var items = Array.isArray(data.items) ? data.items : [];
    var loadingLine = state.loading
      ? '<div class="sp562-refreshing">최신 상태 확인 중…</div>'
      : '';
    var errorLine = state.error
      ? '<div class="sp562-inline-error">최신 조회 실패 · ' +
        html(state.error) +
        ' <button type="button" onclick="window.SitePassArchiveV562.reload()">재시도</button></div>'
      : '';

    var emptyText =
      state.relationType === 'all' && !state.search
        ? '보관함에 표시할 장비가 없습니다.'
        : '선택한 조건에 맞는 장비가 없습니다.';

    box.innerHTML =
      '<div class="sp562-archive">' +
      renderStats(data.counts) +
      renderSelectionBar() +
      renderLinkTargetPanel() +
      loadingLine +
      errorLine +
      (items.length
        ? '<div class="sp562-card-list">' +
          items.map(renderCard).join('') +
          '</div>'
        : '<div class="sp562-status empty">' + html(emptyText) + '</div>') +
      renderPagination(data.paging) +
      '</div>';

    attachSelectionListeners();

    try {
      if (!(window.sitePassArchiveItemSnapshotV538 instanceof Map)) {
        window.sitePassArchiveItemSnapshotV538 = new Map();
      }
      items.forEach(function (summary) {
        var code = String(summary.code || '');
        var existing = null;
        try {
          if (typeof window.getItemByCode === 'function') {
            existing = window.getItemByCode(code);
          }
        } catch (error) {}
        if (existing) {
          applySummaryToItem(existing, summary);
          window.sitePassArchiveItemSnapshotV538.set(code, existing);
        }
      });
    } catch (error) {}
  }

  function renderList() {
    if (!isMemberMode()) {
      return legacyRenderList();
    }
    prepareListShell();
    renderMemberArchive();
    loadArchive(false);
  }

  function setFilter(filterKey) {
    if (!FILTERS.some(function (row) { return row.key === filterKey; })) {
      return;
    }
    state.relationType = filterKey;
    state.page = 1;
    state.data = null;
    state.error = '';
    state.loadedKey = '';
    renderMemberArchive();
    loadArchive(true);
  }

  function searchFromInput() {
    var input = document.getElementById('archiveSearchInput');
    state.search = String(input ? input.value : '').trim();
    state.page = 1;
    state.data = null;
    state.error = '';
    state.loadedKey = '';
    renderMemberArchive();
    loadArchive(true);
  }

  function clearSearch() {
    var input = document.getElementById('archiveSearchInput');
    if (input) input.value = '';
    state.search = '';
    state.page = 1;
    state.data = null;
    state.loadedKey = '';
    loadArchive(true);
  }

  function goToPage(page) {
    var next = Number(page || 1);
    if (!Number.isFinite(next) || next < 1) return;
    state.page = Math.floor(next);
    state.data = null;
    state.error = '';
    state.loadedKey = '';
    renderMemberArchive();
    loadArchive(true);
    try {
      var screen = document.getElementById('listScreen');
      if (screen) {
        screen.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {}
  }

  function reload() {
    state.loadedKey = '';
    state.error = '';
    loadArchive(true);
  }

  function openLinkActionFromSelection() {
    if (!isMemberMode()) {
      alert('일반회원 로그인 후 연동 요청을 이용해주세요.');
      return;
    }

    var selected = selectedEntries();
    if (!selected.length) {
      alert('연동할 내 장비를 한 대 이상 선택해주세요.');
      return;
    }
    if (selected.length > 50) {
      alert('연동 요청은 한 번에 최대 50대까지 보낼 수 있습니다.');
      return;
    }

    var items = selected.map(function (selectedItem) {
      return getSummary(
        selectedItem.equipmentId,
        selectedItem.code
      );
    });
    if (
      items.some(function (item) {
        return !item;
      })
    ) {
      alert('선택한 장비의 최신 상태를 확인하지 못했습니다.');
      return;
    }

    var canCreateBatch = items.every(function (item) {
      return (
        item.relationType === 'owned' &&
        permission(item, 'canCreateLinkRequest')
      );
    });

    if (canCreateBatch) {
      state.linkComposerEquipments = items.slice();
      state.linkTargetQuery = '';
      state.linkTargetLoginId = '';
      state.linkTargetResult = null;
      state.linkTargetPrepared = false;
      state.linkLookupBusy = false;
      state.linkLookupError = '';
      state.linkLookupSequence += 1;
      state.linkRequestBusy = false;
      state.linkBatchIdempotencyKey = newIdempotencyKey();
      state.linkRequestedEquipmentIds.clear();
      renderMemberArchive();
      try {
        var input = document.getElementById('memberLinkSearchInput');
        if (input) {
          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          input.focus();
        }
      } catch (error) {}
      return;
    }

    var single = items.length === 1 ? items[0] : null;
    if (single && permission(single, 'canRevokeLink')) {
      unlink(single.equipmentId, single.relationType);
      return;
    }

    alert(
      '연동 보내기는 연동 가능한 직접등록 장비만 함께 선택할 수 있습니다.'
    );
  }

  function handleLinkTargetInput(value) {
    var nextValue = String(value || '');
    if (nextValue === state.linkTargetQuery) return;
    state.linkTargetQuery = nextValue;
    state.linkTargetLoginId = '';
    state.linkTargetResult = null;
    state.linkTargetPrepared = false;
    state.linkLookupError = '';
    state.linkLookupSequence += 1;
    state.linkBatchIdempotencyKey = '';
  }

  async function searchLinkTarget() {
    if (!isMemberMode()) {
      alert('일반회원 로그인 후 연동 요청을 이용해주세요.');
      return;
    }
    if (!state.linkComposerEquipments.length) {
      alert('연동할 내 장비를 먼저 선택해주세요.');
      return;
    }

    var input = document.getElementById('memberLinkSearchInput');
    var targetLoginId = String(input ? input.value : '').trim();

    if (!targetLoginId) {
      alert('연동받을 회원의 로그인 아이디를 입력해주세요.');
      if (input) input.focus();
      return;
    }
    if (targetLoginId.length > 120) {
      alert('회원 아이디가 너무 깁니다.');
      return;
    }

    var lookupSequence = state.linkLookupSequence + 1;
    state.linkLookupSequence = lookupSequence;
    state.linkTargetQuery = targetLoginId;
    state.linkTargetLoginId = '';
    state.linkTargetResult = null;
    state.linkTargetPrepared = false;
    state.linkLookupBusy = true;
    state.linkLookupError = '';
    state.linkBatchIdempotencyKey = '';
    state.linkRequestedEquipmentIds.clear();
    renderMemberArchive();

    try {
      var result = await callRpc(
        'sitepass_find_equipment_link_target_v1',
        {
          p_target_login_id: targetLoginId
        }
      );
      if (lookupSequence !== state.linkLookupSequence) return;
      if (!result || result.ok !== true) {
        throw new Error('회원 아이디 확인 결과를 받지 못했습니다.');
      }
      state.linkTargetResult = result;
      if (result.eligible === true) {
        state.linkTargetLoginId = String(result.loginId || '').trim();
      }
    } catch (error) {
      if (lookupSequence !== state.linkLookupSequence) return;
      state.linkTargetResult = null;
      state.linkTargetLoginId = '';
      state.linkLookupError =
        '회원 아이디를 확인하지 못했습니다. ' + errorText(error);
    } finally {
      if (lookupSequence === state.linkLookupSequence) {
        state.linkLookupBusy = false;
        renderMemberArchive();
      }
    }
  }

  function prepareLinkTarget() {
    var result = state.linkTargetResult;
    if (
      !result ||
      result.ok !== true ||
      result.found !== true ||
      result.eligible !== true ||
      !String(result.loginId || '').trim()
    ) {
      alert('연동받을 정상 회원을 먼저 확인해주세요.');
      return;
    }

    state.linkTargetLoginId = String(result.loginId || '').trim();
    state.linkTargetPrepared = true;
    state.linkLookupError = '';
    state.linkBatchIdempotencyKey =
      state.linkBatchIdempotencyKey || newIdempotencyKey();
    renderMemberArchive();
  }

  function cancelPreparedLinkTarget() {
    state.linkTargetPrepared = false;
    state.linkRequestBusy = false;
    state.linkBatchIdempotencyKey = '';
    state.linkRequestedEquipmentIds.clear();
    renderMemberArchive();
    try {
      var input = document.getElementById('memberLinkSearchInput');
      if (input) input.focus();
    } catch (error) {}
  }

  function clearLinkTarget() {
    state.linkComposerEquipments = [];
    state.linkTargetQuery = '';
    state.linkTargetLoginId = '';
    state.linkTargetResult = null;
    state.linkTargetPrepared = false;
    state.linkLookupBusy = false;
    state.linkLookupError = '';
    state.linkLookupSequence += 1;
    state.linkRequestBusy = false;
    state.linkBatchIdempotencyKey = '';
    state.linkRequestedEquipmentIds.clear();
    renderMemberArchive();
  }

  function newIdempotencyKey() {
    try {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID === 'function'
      ) {
        return window.crypto.randomUUID();
      }
    } catch (error) {}

    var bytes = new Uint8Array(16);
    if (
      !window.crypto ||
      typeof window.crypto.getRandomValues !== 'function'
    ) {
      throw new Error('안전한 요청 식별키를 만들 수 없습니다.');
    }
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

  function linkRequestErrorMessage(error) {
    var message = errorText(error);
    if (message.indexOf('TARGET_MEMBER_NOT_FOUND') >= 0) {
      return '일치하는 회원 아이디를 찾지 못했습니다.';
    }
    if (message.indexOf('SELF_LINK_REQUEST_NOT_ALLOWED') >= 0) {
      return '본인 계정으로는 연동 요청을 보낼 수 없습니다.';
    }
    if (message.indexOf('EQUIPMENT_ALREADY_LINKED') >= 0) {
      return '이미 다른 회원과 연동 중인 장비입니다.';
    }
    if (
      message.indexOf('EQUIPMENT_REQUEST_ALREADY_PENDING') >= 0
    ) {
      return '이미 처리 대기 중인 연동 요청이 있습니다.';
    }
    if (
      message.indexOf('TARGET_MEMBER_NOT_ACTIVE') >= 0 ||
      message.indexOf('TARGET_MEMBER_AUTH_REQUIRED') >= 0 ||
      message.indexOf('TARGET_MEMBER_ROLE_NOT_ALLOWED') >= 0
    ) {
      return '현재 연동 요청을 받을 수 없는 회원입니다.';
    }
    return message;
  }

  async function requestBatchLink() {
    if (!isMemberMode()) {
      alert('일반회원 로그인 후 연동 요청을 이용해주세요.');
      return;
    }

    var targetLoginId = String(state.linkTargetLoginId || '').trim();
    var targetResult = state.linkTargetResult;
    var items = Array.isArray(state.linkComposerEquipments)
      ? state.linkComposerEquipments
      : [];
    var equipmentIds = items.map(function (item) {
      return String(item.equipmentId || '').trim();
    });

    if (
      !targetLoginId ||
      !state.linkTargetPrepared ||
      !targetResult ||
      targetResult.eligible !== true ||
      String(targetResult.loginId || '').trim() !== targetLoginId ||
      !equipmentIds.length ||
      equipmentIds.length > 50 ||
      equipmentIds.some(function (equipmentId) {
        return !equipmentId;
      }) ||
      items.some(function (item) {
        return (
          item.relationType !== 'owned' ||
          !permission(item, 'canCreateLinkRequest')
        );
      })
    ) {
      alert('확인된 회원과 연동할 내 장비를 다시 확인해주세요.');
      return;
    }

    var selectedIds = selectedEntries()
      .map(function (selectedItem) {
        return String(selectedItem.equipmentId || '').trim();
      })
      .filter(Boolean)
      .sort();
    var composerIds = equipmentIds.slice().sort();
    if (
      selectedIds.length !== composerIds.length ||
      selectedIds.some(function (equipmentId, index) {
        return equipmentId !== composerIds[index];
      })
    ) {
      alert('장비 선택이 변경되었습니다. 연동 보내기를 다시 눌러주세요.');
      clearLinkTarget();
      return;
    }

    var requestModule =
      window.SitePassEquipmentLinkV82 &&
      window.SitePassEquipmentLinkV82.request;

    if (
      !requestModule ||
      typeof requestModule.create !== 'function' ||
      typeof requestModule.ensureIdempotencyKey !== 'function'
    ) {
      alert('장비연동 요청 모듈을 확인하지 못했습니다.');
      return;
    }

    state.linkRequestBusy = true;
    state.linkBatchIdempotencyKey =
      requestModule.ensureIdempotencyKey(
        state.linkBatchIdempotencyKey
      );
    renderMemberArchive();

    try {
      var result = await requestModule.create({
        equipmentIds: equipmentIds,
        targetLoginId: targetLoginId,
        idempotencyKey: state.linkBatchIdempotencyKey,
        expectedCount: equipmentIds.length
      });

      equipmentIds.forEach(function (equipmentId) {
        state.linkRequestedEquipmentIds.add(equipmentId);
      });

      var createdCount = Number(result.createdCount || 0);
      var unchangedCount = Number(result.unchangedCount || 0);
      state.selectedEquipmentIds.clear();
      state.linkComposerEquipments = [];
      state.linkTargetQuery = '';
      state.linkTargetLoginId = '';
      state.linkTargetResult = null;
      state.linkTargetPrepared = false;
      state.linkLookupError = '';
      state.linkBatchIdempotencyKey = '';

      try {
        window.dispatchEvent(
          new CustomEvent(
            'sitepass-member-link-chat-updated-v566',
            {
              detail: {
                roomId: String(result.chatRoomId || ''),
                requestGroupId:
                  String(result.requestGroupId || ''),
                requestedCount:
                  Number(result.requestedCount || 0),
                outgoing: true
              }
            }
          )
        );
      } catch (error) {}

      try {
        if (
          window.SitePassMemberLinkChatV566 &&
          typeof window.SitePassMemberLinkChatV566.refresh ===
            'function'
        ) {
          window.SitePassMemberLinkChatV566.refresh(true);
        }
      } catch (error) {}

      alert(
        createdCount > 0
          ? '선택한 ' +
              equipmentIds.length +
              '대 중 ' +
              createdCount +
              '대의 연동 요청을 보냈습니다.' +
              (unchangedCount > 0
                ? '\n이미 대기 중인 요청 ' +
                  unchangedCount +
                  '대는 그대로 유지했습니다.'
                : '') +
              '\n상대방 홈 알림과 채팅방으로 요청을 보냈습니다.' +
              '\n상대방이 승인하면 연동됩니다.'
          : result.notificationCreated === true
            ? '이미 대기 중인 ' +
              equipmentIds.length +
              '대의 요청을 상대방 채팅방에 연결했습니다.'
            : '선택한 장비는 이미 같은 회원의 채팅방에서 승인 대기 중입니다.'
      );

      state.data = null;
      state.loadedKey = '';
      await loadArchive(true);
    } catch (error) {
      var message = linkRequestErrorMessage(error);
      if (
        message.indexOf('회원 아이디') >= 0 ||
        message.indexOf('연동 요청을 받을 수 없는 회원') >= 0 ||
        message.indexOf('본인 계정') >= 0
      ) {
        state.linkTargetPrepared = false;
        state.linkTargetResult = null;
        state.linkTargetLoginId = '';
        state.linkLookupError = message;
        state.linkBatchIdempotencyKey = '';
      }
      alert(
        '선택한 장비의 연동 요청을 보내지 못했습니다.\n\n' +
          message
      );
    } finally {
      state.linkRequestBusy = false;
      renderMemberArchive();
    }
  }

  function getSummary(equipmentId, code) {
    var byId = summaryByEquipmentId.get(String(equipmentId || ''));
    if (byId) return byId;
    return summaryByCode.get(String(code || '')) || null;
  }

  function applySummaryToItem(item, summary) {
    item = item && typeof item === 'object' ? item : {};
    summary = summary && typeof summary === 'object' ? summary : {};
    item.code = item.code || summary.code || '';
    item.equipmentId = item.equipmentId || summary.equipmentId || '';
    item.equipment_id = item.equipment_id || item.equipmentId;
    item.equipmentNo = item.equipmentNo || summary.equipmentNo || '';
    item.equipmentName = item.equipmentName || summary.equipmentName || '';
    item.ownerMemberUuid =
      item.ownerMemberUuid || summary.ownerMemberUuid || '';
    item.owner_member_uuid =
      item.owner_member_uuid || item.ownerMemberUuid;
    item.lifecycleStatus =
      summary.lifecycleStatus || item.lifecycleStatus || '';
    item.serviceStatus = summary.serviceStatus || item.serviceStatus || '';
    item.paymentStatus = summary.paymentStatus || item.paymentStatus || '';
    item.sitePassRelationTypeV562 = summary.relationType || '';
    item.sitePassArchiveSummaryV562 = summary;
    item.sitePassArchiveAccessVerifiedV562 = true;
    return item;
  }

  function makeLegacyPage(file, index) {
    file = file && typeof file === 'object' ? file : {};
    return {
      id: file.file_id || file.fileId || '',
      fileId: file.file_id || file.fileId || '',
      pageNo: Number(file.page_no || file.pageNo || index + 1),
      pageIndex: index,
      fileName:
        file.original_file_name ||
        file.originalFileName ||
        '첨부파일',
      mimeType: file.mime_type || file.mimeType || '',
      fileType: file.mime_type || file.mimeType || '',
      fileSizeBytes:
        Number(file.file_size_bytes || file.fileSizeBytes || 0),
      storageBucket:
        file.storage_bucket || file.storageBucket || 'sitepass-documents',
      storagePath: file.storage_path || file.storagePath || '',
      storageMode: 'supabase-storage',
      storageObjectVerified:
        String(
          file.verification_status ||
            file.verificationStatus ||
            'verified'
        ) === 'verified'
    };
  }

  function makeLegacyDocument(documentRow) {
    documentRow =
      documentRow && typeof documentRow === 'object'
        ? documentRow
        : {};
    var documentType = String(documentRow.document_type || 'otherEquipment');
    var meta = DOCUMENT_META[documentType] || {
      title: documentType,
      required: !!documentRow.is_required,
      expiry: false
    };
    var version = documentRow.current_version || {};
    var files = Array.isArray(version.files) ? version.files : [];
    var pages = files.map(makeLegacyPage);
    var first = pages[0] || {};

    return {
      key: documentType,
      documentId: documentRow.document_id || '',
      currentVersionId: documentRow.current_version_id || '',
      versionId: version.version_id || '',
      title: meta.title,
      groupKey: 'equipment',
      groupTitle: '장비서류',
      required:
        documentRow.is_required === undefined
          ? !!meta.required
          : !!documentRow.is_required,
      expiry: !!meta.expiry,
      expireDate: version.expiry_date || '',
      status: pages.length ? '첨부됨' : '미첨부',
      fileName: first.fileName || '',
      fileType: first.fileType || '',
      mimeType: first.mimeType || '',
      storageBucket: first.storageBucket || '',
      storagePath: first.storagePath || '',
      storageMode: pages.length ? 'supabase-storage' : '',
      storageObjectVerified: pages.length > 0,
      pageCount: pages.length,
      pages: pages
    };
  }

  function adaptDetailResponse(summary, response) {
    response = response && typeof response === 'object' ? response : {};
    var equipment = response.equipment || {};
    var documents = Array.isArray(response.documents)
      ? response.documents
      : [];
    var docs = {};

    documents.forEach(function (row) {
      var doc = makeLegacyDocument(row);
      docs[doc.key] = doc;
    });

    var item = {
      code: equipment.code || summary.code || '',
      equipmentId: equipment.equipment_id || summary.equipmentId || '',
      equipment_id: equipment.equipment_id || summary.equipmentId || '',
      equipmentNo: equipment.equipment_no || summary.equipmentNo || '',
      equipmentName:
        equipment.equipment_name || summary.equipmentName || '',
      ownerMemberUuid: summary.ownerMemberUuid || '',
      owner_member_uuid: summary.ownerMemberUuid || '',
      lifecycleStatus:
        equipment.lifecycle_status || summary.lifecycleStatus || '',
      serviceStatus: summary.serviceStatus || '',
      paymentStatus: summary.paymentStatus || '',
      createdAt: equipment.created_at || '',
      updatedAt: equipment.updated_at || '',
      docs: docs,
      bundleMeta: {
        includedGroups: ['equipment'],
        includedGroupNames: ['장비서류'],
        paymentText: '장비등록 1건'
      },
      fromSupabaseEquipment: true
    };

    return applySummaryToItem(item, summary);
  }

  function rememberRuntimeItem(item) {
    if (!item || !item.code) return item;
    runtimeItemByCode.set(String(item.code), item);
    try {
      window.sitePassArchiveRuntimeItemsV562 = runtimeItemByCode;
      if (!(window.sitePassArchiveItemSnapshotV538 instanceof Map)) {
        window.sitePassArchiveItemSnapshotV538 = new Map();
      }
      window.sitePassArchiveItemSnapshotV538.set(String(item.code), item);
    } catch (error) {}
    return item;
  }

  async function resolveItem(equipmentId, code) {
    var summary = getSummary(equipmentId, code);
    if (!summary) throw new Error('보관함 장비 요약을 찾지 못했습니다.');

    var saved = runtimeItemByCode.get(String(code || ''));
    if (saved) return saved;

    var existing = null;
    try {
      if (typeof window.getItemByCode === 'function') {
        existing = window.getItemByCode(String(code || ''));
      }
    } catch (error) {}

    if (
      existing &&
      summary.relationType !== 'linked_in' &&
      summary.relationType !== 'linked_out' &&
      existing.docs &&
      typeof existing.docs === 'object'
    ) {
      return rememberRuntimeItem(applySummaryToItem(existing, summary));
    }

    var detail = await callRpc('sitepass_get_equipment_detail_v1', {
      p_equipment_id: String(equipmentId || summary.equipmentId || '')
    });
    var item = adaptDetailResponse(summary, detail);
    return rememberRuntimeItem(item);
  }

  async function openDetail(equipmentId, code) {
    try {
      var summary = getSummary(equipmentId, code);
      var item = await resolveItem(equipmentId, code);
      // v644: 상세/QR에서도 private Storage 파일을 공개 URL로 직접 열지 않는다.
      // 원소유자와 연동회원 모두 현재 로그인 세션으로 짧은 signed URL을 준비한다.
      if (summary) {
        try { await hydrateLinkedInPreviewSignedUrls(item, summary); }
        catch (signError) {
          try { console.warn('[SitePass v646] 상세 파일주소 일부 준비 실패 - 상세는 계속 엽니다.', signError); } catch (ignore) {}
        }
      }
      if (
        !window.SitePassEquipmentDetail ||
        typeof window.SitePassEquipmentDetail.render !== 'function'
      ) {
        throw new Error('상세보기 공개 API를 불러오지 못했습니다.');
      }
      window.SitePassEquipmentDetail.render(String(code || ''));
    } catch (error) {
      alert('장비 상세정보를 열지 못했습니다.\n\n' + errorText(error));
    }
  }

  function editOwner(code) {
    var summary = getSummary('', code);
    if (!summary || !permission(summary, 'canEdit')) {
      alert('연동받은 장비는 원소유자만 수정·갱신할 수 있습니다.');
      return;
    }
    if (
      window.SitePassEquipmentUpdate &&
      typeof window.SitePassEquipmentUpdate.start === 'function'
    ) {
      window.SitePassEquipmentUpdate.start(String(code || ''));
      return;
    }
    alert('수정·갱신 공개 API를 불러오지 못했습니다.');
  }

  async function hydrateLinkedInPreviewSignedUrls(item, summary) {
    if (!item || !summary) return item;

    var api = window.SitePassSupabaseApi || {};
    if (typeof api.storageSignedUrl !== 'function') {
      try { console.warn('[SitePass v646] 파일주소 기능 없음 - 기존 주소로 계속 표시합니다.'); } catch (ignore) {}
      return item;
    }

    var docs = item.docs && typeof item.docs === 'object' ? item.docs : {};
    var jobs = [];

    function applySignedUrl(target, signed) {
      if (!target || typeof target !== 'object' || !signed) return;
      target.signedUrl = signed;
      target.storageAccessUrl = signed;
      target.fileUrl = signed;
      target.downloadUrl = signed;
      target.previewDataUrl = signed;
      target.editDataUrl = signed;
    }

    Object.keys(docs).forEach(function (key) {
      var doc = docs[key];
      if (!doc || typeof doc !== 'object') return;

      var pages = Array.isArray(doc.pages) && doc.pages.length
        ? doc.pages
        : [doc];

      pages.forEach(function (page) {
        if (!page || typeof page !== 'object') return;

        var bucket = String(
          page.storageBucket ||
          page.storage_bucket ||
          doc.storageBucket ||
          doc.storage_bucket ||
          'sitepass-documents'
        ).trim();

        var path = String(
          page.storagePath ||
          page.storage_path ||
          doc.storagePath ||
          doc.storage_path ||
          ''
        ).replace(/^\/+/, '').trim();

        // v646: 구자료의 절대 Storage URL이 현재 Supabase 프로젝트가 아닌
        // 이전 프로젝트를 가리키면 현재 프로젝트에서 다시 서명하지 않는다.
        // 기존 링크 미리보기에서 실제로 열리는 원래 URL을 그대로 유지한다.
        var legacyUrl = String(
          page.previewDataUrl || page.editDataUrl || page.fileUrl || page.downloadUrl ||
          doc.previewDataUrl || doc.editDataUrl || doc.fileUrl || doc.downloadUrl || ''
        ).trim();
        if (legacyUrl) {
          try {
            var legacyParsed = new URL(legacyUrl, window.location.href);
            var configuredBase = String(
              window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.supabaseUrl || ''
            ).trim();
            var configuredHost = configuredBase ? new URL(configuredBase).host : '';
            var isSupabaseStorageUrl = /\.supabase\.co$/i.test(legacyParsed.host) &&
              /\/storage\/v1\/object\//i.test(legacyParsed.pathname);
            var isDifferentProject = isSupabaseStorageUrl && configuredHost &&
              legacyParsed.host !== configuredHost;
            if (isDifferentProject) {
              applySignedUrl(page, legacyUrl);
              if (page === pages[0]) applySignedUrl(doc, legacyUrl);
              return;
            }
          } catch (ignoreLegacyUrl) {}
        }

        // 현재 프로젝트의 구형 object/public URL만 bucket/path를 복원해
        // authenticated signed URL로 교체한다.
        if (!path && legacyUrl) {
          var legacyMatch = legacyUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:[?#].*)?$/i);
          if (legacyMatch) {
            bucket = decodeURIComponent(legacyMatch[1] || bucket);
            path = decodeURIComponent(legacyMatch[2] || '').replace(/^\/+/, '').trim();
            page.storageBucket = bucket;
            page.storagePath = path;
            if (page === pages[0]) {
              doc.storageBucket = bucket;
              doc.storagePath = path;
            }
          }
        }

        if (!bucket || !path) return;

        jobs.push(
          api.storageSignedUrl(bucket, path, 300, { forceRefresh: false })
            .then(function (result) {
              var signed = String(
                result && (
                  result.signedUrl ||
                  result.data && (result.data.signedUrl || result.data.signedURL)
                ) || ''
              ).trim();

              if (!signed) {
                throw new Error(
                  result && result.error && result.error.message ||
                  '기간 제한 파일주소 생성 실패'
                );
              }

              applySignedUrl(page, signed);
              if (page === pages[0]) applySignedUrl(doc, signed);
              return true;
            })
        );
      });
    });

    if (!jobs.length) return item;

    var results = await Promise.allSettled(jobs);
    var failed = results.filter(function (row) {
      return row.status !== 'fulfilled';
    });

    if (failed.length) {
      var firstReason = failed[0] && failed[0].reason;
      try {
        console.warn(
          '[SitePass v646] 회원 장비 파일주소 일부 준비 실패 (' +
          failed.length + '/' + results.length + ') - 정상 파일과 상세 화면은 계속 표시합니다.',
          firstReason
        );
      } catch (ignore) {}
    }

    return item;
  }

  async function openLink(equipmentId, code) {
    var summary = getSummary(equipmentId, code);
    if (!summary || !permission(summary, 'canShare')) {
      alert('현재 결제·서비스 상태에서는 공유링크를 열 수 없습니다.');
      return;
    }
    try {
      var item = await resolveItem(equipmentId, code);

      // v568: linked_in 회원은 공개공유 프록시용 코드가 아니라 현재 로그인 권한으로
      // private Storage signed URL을 먼저 준비해 회원 미리보기 snapshot에 전달한다.
      // 외부 담당자 링크와 원소유자 기존 경로는 변경하지 않는다.
      if (summary.relationType === 'linked_in') {
        await hydrateLinkedInPreviewSignedUrls(item, summary);
      }

      if (typeof window.openManagerPublicView !== 'function') {
        throw new Error('공유링크 기능을 불러오지 못했습니다.');
      }
      window.openManagerPublicView(String(code || ''));
    } catch (error) {
      alert('공유링크를 준비하지 못했습니다.\n\n' + errorText(error));
    }
  }

  function selectForSend(code) {
    var target = String(code || '');
    var input = Array.from(
      document.querySelectorAll('[data-sp562-select]')
    ).find(function (row) {
      return String(row.value || '') === target;
    });
    if (!input || input.disabled) return;
    input.checked = true;
    updateSelection();
    try {
      var bar = document.getElementById('sp562SelectionBar');
      if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {}
  }

  function selectedEntries() {
    var unique = new Map();
    Array.from(
      document.querySelectorAll('[data-sp562-select]:checked')
    ).forEach(function (input) {
      var equipmentId = String(
        input.getAttribute('data-equipment-id') || ''
      ).trim();
      var code = String(input.value || '').trim();
      var identity = equipmentId || code;
      if (!identity || unique.has(identity)) return;
      unique.set(identity, {
        equipmentId: equipmentId,
        code: code
      });
    });
    return Array.from(unique.values());
  }

  function updateSelection() {
    var selected = selectedEntries();
    var count = selected.length;
    state.selectedEquipmentIds = new Set(
      selected.map(function (selectedItem) {
        return selectedItem.equipmentId || selectedItem.code;
      })
    );
    var bar = document.getElementById('sp562SelectionBar');
    var countBox = document.getElementById('sp562SelectionCount');
    if (countBox) countBox.textContent = String(count);

    var summaries = selected.map(function (selectedItem) {
      return getSummary(
        selectedItem.equipmentId,
        selectedItem.code
      );
    });
    var canShareAll =
      count > 0 &&
      summaries.every(function (item) {
        return !!item && permission(item, 'canShare');
      });
    Array.from(
      document.querySelectorAll('[data-sp562-share-action]')
    ).forEach(function (button) {
      button.disabled = !canShareAll;
    });

    var linkButton = document.getElementById(
      'sp562LinkActionButton'
    );
    var single = count === 1 ? summaries[0] : null;
    var canCreateBatch = !!(
      count > 0 &&
      count <= 50 &&
      summaries.every(function (item) {
        return (
          !!item &&
          item.relationType === 'owned' &&
          permission(item, 'canCreateLinkRequest')
        );
      })
    );
    var canRevoke = !!(
      single &&
      permission(single, 'canRevokeLink')
    );
    if (linkButton) {
      linkButton.disabled = !(canCreateBatch || canRevoke);
      linkButton.textContent =
        single && single.relationType === 'linked_in'
          ? '연동 나가기'
          : single && single.relationType === 'linked_out'
            ? '연동 해제'
            : '연동 보내기';
    }

    var composerIds = state.linkComposerEquipments
      .map(function (item) {
        return String(item.equipmentId || '').trim();
      })
      .filter(Boolean)
      .sort();
    var selectedIds = selected
      .map(function (selectedItem) {
        return String(selectedItem.equipmentId || '').trim();
      })
      .filter(Boolean)
      .sort();
    var composerSelectionChanged =
      composerIds.length > 0 &&
      (
        composerIds.length !== selectedIds.length ||
        composerIds.some(function (equipmentId, index) {
          return equipmentId !== selectedIds[index];
        })
      );

    if (composerSelectionChanged) {
      state.linkComposerEquipments = [];
      state.linkTargetQuery = '';
      state.linkTargetLoginId = '';
      state.linkTargetResult = null;
      state.linkTargetPrepared = false;
      state.linkLookupBusy = false;
      state.linkLookupError = '';
      state.linkLookupSequence += 1;
      state.linkRequestBusy = false;
      state.linkBatchIdempotencyKey = '';
      state.linkRequestedEquipmentIds.clear();
      var panel = document.querySelector('.sp562-link-target');
      if (panel) panel.remove();
    }

    if (bar) bar.classList.remove('hidden');
  }

  async function shareSelected(channel) {
    var selected = selectedEntries();
    if (!selected.length) {
      alert('공유할 장비를 먼저 선택해주세요.');
      return;
    }
    var buttonBar = document.getElementById('sp562SelectionBar');
    if (buttonBar) buttonBar.classList.add('busy');

    try {
      var items = await Promise.all(
        selected.map(function (selectedItem) {
          var summary = getSummary(
            selectedItem.equipmentId,
            selectedItem.code
          );
          if (!summary || !permission(summary, 'canShare')) {
            throw new Error('전송할 수 없는 장비가 선택되었습니다.');
          }
          return resolveItem(
            summary.equipmentId,
            selectedItem.code
          );
        })
      );

      if (typeof window.shareManagerItemsByChannel !== 'function') {
        throw new Error('기존 카카오톡·문자·이메일 전송 기능을 찾지 못했습니다.');
      }
      await window.shareManagerItemsByChannel(items, String(channel || 'kakao'));
    } catch (error) {
      alert('선택한 장비를 보내지 못했습니다.\n\n' + errorText(error));
    } finally {
      if (buttonBar) buttonBar.classList.remove('busy');
    }
  }

  async function unlink(equipmentId, relationType) {
    var message =
      relationType === 'linked_in'
        ? '이 장비의 연동을 해제할까요?\n해제 후에는 장비 상세·공유에 접근할 수 없습니다.'
        : '이 장비에 보낸 연동을 해제할까요?\n상대 회원의 접근이 즉시 차단됩니다.';
    if (!confirm(message)) return;

    try {
      var revokeModule =
        window.SitePassEquipmentLinkV82 &&
        window.SitePassEquipmentLinkV82.revoke;

      if (
        !revokeModule ||
        typeof revokeModule.revoke !== 'function'
      ) {
        throw new Error(
          '장비연동 해제 모듈을 확인하지 못했습니다.'
        );
      }

      var result = await revokeModule.revoke({
        equipmentId: String(equipmentId || ''),
        reason: 'member_archive_unlinked'
      });
      runtimeItemByCode.clear();
      state.data = null;
      state.loadedKey = '';
      await loadArchive(true);
      try {
        if (typeof window.syncSupabaseMyEquipmentItems === 'function') {
          window.syncSupabaseMyEquipmentItems(true, true);
        }
      } catch (error) {}
      try {
        window.dispatchEvent(
          new CustomEvent(
            'sitepass-member-link-chat-updated-v566',
            {
              detail: {
                roomId: String(result.chatRoomId || ''),
                equipmentId: String(equipmentId || ''),
                revoked: true
              }
            }
          )
        );
      } catch (error) {}
      try {
        if (
          window.SitePassMemberLinkChatV566 &&
          typeof window.SitePassMemberLinkChatV566.refresh ===
            'function'
        ) {
          window.SitePassMemberLinkChatV566.refresh(true);
        }
      } catch (error) {}
      alert(
        result.idempotent
          ? '이미 해제된 연동입니다.'
          : '장비 연동을 해제했습니다.\n상대 회원 채팅방에 해제 알림을 보냈습니다.'
      );
    } catch (error) {
      alert('연동을 해제하지 못했습니다.\n\n' + errorText(error));
    }
  }

  async function deleteOwner(code) {
    var summary = getSummary('', code);
    if (!summary || !permission(summary, 'canArchiveDelete')) {
      alert('원소유자 장비만 보관함에서 삭제할 수 있습니다.');
      return;
    }
    if (!legacyDeleteItem) {
      alert('기존 안전 삭제 기능을 불러오지 못했습니다.');
      return;
    }
    await legacyDeleteItem(String(code || ''));
    runtimeItemByCode.delete(String(code || ''));
    state.data = null;
    state.loadedKey = '';
    loadArchive(true);
  }

  function resetAuthScopedStateV79() {
    /*
      Step79 auth boundary:
      No previous member archive/home snapshot/runtime item may survive
      SIGNED_OUT or be reused by the next SIGNED_IN session.
    */
    state.requestSequence += 1;
    state.loading = false;
    state.error = '';
    state.requestKey = '';
    state.loadedKey = '';
    state.loadedAt = 0;
    state.data = null;

    state.relationType = 'all';
    state.search = '';
    state.page = 1;

    state.linkComposerEquipments = [];
    state.linkTargetQuery = '';
    state.linkTargetLoginId = '';
    state.linkTargetResult = null;
    state.linkTargetPrepared = false;
    state.linkLookupBusy = false;
    state.linkLookupError = '';
    state.linkLookupSequence += 1;
    state.linkRequestBusy = false;
    state.linkBatchIdempotencyKey = '';
    state.linkRequestedEquipmentIds = new Set();
    state.selectedEquipmentIds = new Set();

    summaryByCode.clear();
    summaryByEquipmentId.clear();
    runtimeItemByCode.clear();

    homeSnapshotV571.authEpoch =
      Number(homeSnapshotV571.authEpoch || 0) + 1;
    invalidateHomeSnapshotV571();
    homeSnapshotV571.promise = null;

    try {
      window.sitePassArchiveSummaryByCodeV562 = summaryByCode;
      window.sitePassArchiveSummaryByEquipmentIdV562 =
        summaryByEquipmentId;
      window.sitePassArchiveRuntimeItemsV562 = runtimeItemByCode;

      if (window.sitePassArchiveItemSnapshotV538 instanceof Map) {
        window.sitePassArchiveItemSnapshotV538.clear();
      }
    } catch (error) {}

    return true;
  }

  legacyArchive.renderList = renderList;
  legacyArchive.searchFromInput = searchFromInput;
  legacyArchive.clearSearch = clearSearch;
  legacyArchive.goToPage = goToPage;
  legacyArchive.getSearchQuery = function () {
    return state.search;
  };
  legacyArchive.getCurrentPage = function () {
    return state.page;
  };

  window.SitePassArchive = legacyArchive;
  window.SitePassArchiveV562 = {
    renderList: renderList,
    reload: reload,
    handleLinkTargetInput: handleLinkTargetInput,
    searchLinkTarget: searchLinkTarget,
    prepareLinkTarget: prepareLinkTarget,
    cancelPreparedLinkTarget: cancelPreparedLinkTarget,
    clearLinkTarget: clearLinkTarget,
    requestBatchLink: requestBatchLink,
    openLinkActionFromSelection: openLinkActionFromSelection,
    setFilter: setFilter,
    searchFromInput: searchFromInput,
    clearSearch: clearSearch,
    goToPage: goToPage,
    openDetail: openDetail,
    editOwner: editOwner,
    openLink: openLink,
    selectForSend: selectForSend,
    updateSelection: updateSelection,
    shareSelected: shareSelected,
    unlink: unlink,
    deleteOwner: deleteOwner,
    getHomeSnapshot: getHomeSnapshotV571,
    invalidateHomeSnapshot: invalidateHomeSnapshotV571,
    resetAuthScopedState: resetAuthScopedStateV79,
    getState: function () {
      return {
        relationType: state.relationType,
        search: state.search,
        page: state.page,
        loading: state.loading,
        error: state.error,
        data: state.data
      };
    }
  };

  window.__SITEPASS_ARCHIVE_V562_READY = true;
})();


// SitePass Step79 WORKING TEST - equipment owns auth-session cache side effects.
(function () {
  'use strict';

  var events =
    window.SitePassAuthEvents ||
    null;

  if (
    !events ||
    typeof events.subscribe !==
      'function'
  ) {
    return;
  }

  var lastRevision = 0;

  function resetHomeEquipmentAuthBoundaryV79(reason) {
    try {
      var box = document.getElementById('sitepassAppRecentEquipment');

      if (box) {
        try {
          delete box.dataset.sitepassRecentSignatureV520;
        } catch (error) {
          box.dataset.sitepassRecentSignatureV520 = '';
        }

        box.innerHTML =
          '<div class="sitepass-recent-empty sitepass-server-loading-v491">' +
            '<b>보관함 장비를 불러오는 중입니다.</b>' +
          '</div>';

        box.setAttribute(
          'data-sitepass-auth-boundary-v79',
          String(reason || '')
        );
      }
    } catch (error) {}

    try {
      if (
        window.SitePassArchiveV562 &&
        typeof window.SitePassArchiveV562.resetAuthScopedState ===
          'function'
      ) {
        window.SitePassArchiveV562.resetAuthScopedState();
      }
    } catch (error) {}
  }

  events.subscribe(function (event) {
    if (
      !event ||
      !event.revision
    ) {
      return;
    }

    if (
      event.revision === lastRevision
    ) {
      return;
    }

    lastRevision = event.revision;

    if (event.type === 'SIGNED_IN') {
      resetHomeEquipmentAuthBoundaryV79('SIGNED_IN');

      try {
        if (
          window.sitePassClearServerAuthoritativeEquipmentItems
        ) {
          window.sitePassClearServerAuthoritativeEquipmentItems();
        }
      } catch (error) {}

      try {
        if (
          window.sitePassPrimeMemberEquipmentCacheV520
        ) {
          window.sitePassPrimeMemberEquipmentCacheV520();
        }
      } catch (error) {}

      return;
    }

    if (event.type === 'SIGNED_OUT') {
      resetHomeEquipmentAuthBoundaryV79('SIGNED_OUT');

      try {
        if (
          window.sitePassClearServerAuthoritativeEquipmentItems
        ) {
          window.sitePassClearServerAuthoritativeEquipmentItems();
        }
      } catch (error) {}

      try {
        localStorage.removeItem(
          'sitePass_v23_7_7_update_original_corrected_server_equipment_cache_v23_7_283'
        );
      } catch (error) {}
    }
  });
})();
