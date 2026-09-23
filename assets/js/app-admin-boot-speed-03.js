// SitePass v23.7.350 - speed optimized medium chunk (app-admin-boot-speed 03/03)
// ---- merged from app-admin-boot-11.js ----
// SitePass v23.7.350 - app-admin-boot finer split (11/14)
let sitePassAdminRenderTimer487 = 0;
let sitePassAdminLastBaseHtml488 = '';
let sitePassAdminRenderBusy488 = false;

// SITEPASS_45_8C_ADMIN_SHARE_HISTORY_V577
// 관리자 공유기록도 회원 공유 기록방과 동일한 Recipient V2 Event 원본을 조회한다.
let sitePassAdminRecipientEventsV577 = [];
let sitePassAdminRecipientEventsLoadingV577 = false;
let sitePassAdminRecipientEventsFetchedAtV577 = 0;
let sitePassAdminRecipientEventsErrorV577 = '';

function sitePassAdminRecipientEventTimeV577(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '-';
  return String(d.getFullYear()) + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function sitePassAdminRecipientEventLabelV577(type) {
  return ({
    sent:'전송',
    opened:'열람',
    downloaded:'다운로드',
    printed:'인쇄',
    expired:'만료',
    revoked:'회수'
  })[String(type || '').toLowerCase()] || String(type || '기록');
}

function sitePassAdminRecipientChannelV577(channel) {
  return ({ sms:'문자', kakao:'카카오톡', email:'이메일' })[String(channel || '').toLowerCase()] || '';
}

function renderAdminRecipientShareEventsCardV577() {
  if (!isSuperAdminLoggedIn()) return '';

  const rows = Array.isArray(sitePassAdminRecipientEventsV577)
    ? sitePassAdminRecipientEventsV577.slice(0, 20)
    : [];

  let body = '';
  if (rows.length) {
    body = rows.map(function(row) {
      const equipment = String(row && (row.equipmentNo || row.equipment_no || row.equipmentName || row.equipment_name) || '장비서류');
      const creator = String(row && (row.creatorName || row.creator_name || row.creatorLoginId || row.creator_login_id) || '-');
      const eventType = sitePassAdminRecipientEventLabelV577(row && (row.eventType || row.event_type));
      const channel = sitePassAdminRecipientChannelV577(row && row.channel);
      const at = sitePassAdminRecipientEventTimeV577(row && (row.eventAt || row.event_at));
      return '<div class="line"><b>' + escapeHtml(equipment) + '</b><span>' +
        escapeHtml(creator + ' · ' + eventType + (channel ? ' · ' + channel : '') + ' · ' + at) +
        '</span></div>';
    }).join('');
  } else if (sitePassAdminRecipientEventsErrorV577) {
    body = '<div class="small">공유 기록을 불러오지 못했습니다. ' + escapeHtml(sitePassAdminRecipientEventsErrorV577) + '</div>';
  } else {
    body = '<div class="small">' + (sitePassAdminRecipientEventsFetchedAtV577 ? '표시할 공유 기록이 없습니다.' : '공유 기록을 불러오는 중입니다.') + '</div>';
  }

  return '<div id="adminRecipientShareEventsCardV577" class="card" style="box-shadow:none;margin-top:14px;">' +
    '<h3>공유 기록</h3>' +
    '<div class="notice blue-note">회원 공유 기록방과 동일한 Recipient V2 서버 이벤트 원본입니다. 최근 20건을 표시합니다.</div>' +
    body +
    '</div>';
}

async function refreshAdminRecipientShareEventsV577(force) {
  if (!isSuperAdminLoggedIn()) {
    sitePassAdminRecipientEventsV577 = [];
    sitePassAdminRecipientEventsErrorV577 = '';
    return { ok:false, skipped:true };
  }
  if (!window.sitepassSupabase || typeof window.sitepassSupabase.rpc !== 'function') {
    return { ok:false, skipped:true };
  }
  const now = Date.now();
  if (sitePassAdminRecipientEventsLoadingV577) return { ok:true, loading:true };
  if (!force && sitePassAdminRecipientEventsFetchedAtV577 && now - sitePassAdminRecipientEventsFetchedAtV577 < 15000) {
    return { ok:true, cached:true };
  }

  sitePassAdminRecipientEventsLoadingV577 = true;
  try {
    const result = await window.sitepassSupabase.rpc('sitepass_get_admin_recipient_share_events_v2', {
      p_limit: 200,
      p_offset: 0
    });
    if (result && result.error) throw result.error;
    const payload = Array.isArray(result && result.data)
      ? (result.data[0] || {})
      : ((result && result.data) || {});
    sitePassAdminRecipientEventsV577 = payload && Array.isArray(payload.items) ? payload.items : [];
    sitePassAdminRecipientEventsFetchedAtV577 = Date.now();
    sitePassAdminRecipientEventsErrorV577 = '';
    requestAdminRender487(20);
    return { ok:true, rows:sitePassAdminRecipientEventsV577, total:Number(payload.total || 0) };
  } catch (e) {
    sitePassAdminRecipientEventsFetchedAtV577 = Date.now();
    sitePassAdminRecipientEventsErrorV577 = e && e.message ? e.message : String(e || '공유 기록 조회 오류');
    requestAdminRender487(20);
    return { ok:false, message:sitePassAdminRecipientEventsErrorV577 };
  } finally {
    sitePassAdminRecipientEventsLoadingV577 = false;
  }
}
window.sitePassRefreshAdminRecipientShareEventsV577 = refreshAdminRecipientShareEventsV577;


// SITEPASS_45_ADMIN_PAGE_V578
// 최고관리자/일반관리자는 관리자페이지 1개를 공유하고, 권한에 따라 상위 관리 폴더를 분리한다.
let sitePassAdminSectionV578 = (function(){
  try {
    return String(sessionStorage.getItem('sitepass_admin_section_v578') || 'dashboard');
  } catch (e) {
    return 'dashboard';
  }
})();
let sitePassAdminShareFilterV578 = 'all';
let sitePassAdminShareSearchV578 = '';

// STEP91 R9H — 공유기록 전용 전체 이력 상태.
// 기존 V577 최근 200건 상태는 대시보드/기존 기능 보존을 위해 그대로 둔다.
let sitePassAdminShareHistoryRowsV91 = [];
let sitePassAdminShareHistoryTotalV91 = 0;
let sitePassAdminShareHistoryLoadingV91 = false;
let sitePassAdminShareHistoryFetchedAtV91 = 0;
let sitePassAdminShareHistoryErrorV91 = '';
let sitePassAdminShareExpandedEquipmentV91 = '';
let sitePassAdminShareDetailFolderV91 = '';
let sitePassAdminShareExcludedAuditOpenV91 = false;
let sitePassAdminShareEquipmentPageV91 = 1;
const SITEPASS_ADMIN_SHARE_EQUIPMENT_PAGE_SIZE_V91 = 20;
const SITEPASS_ADMIN_SHARE_PAGE_SIZE_V91 = 200;
const SITEPASS_ADMIN_SHARE_MAX_OFFSET_V91 = 10000;

// STEP91 R9P — 대용량 공유기록.
// 카드 숫자는 서버 Summary RPC, 상세은 equipment/folder별 cursor RPC를 사용한다.
// 기존 V2 offset RPC/최근 200 배열은 대시보드·ROLLBACK 호환을 위해 삭제하지 않는다.
let sitePassAdminShareSummaryItemsV3 = [];
let sitePassAdminShareSummaryTotalsV3 = {
  sent:0,
  opened:0,
  downloaded:0,
  printed:0,
  expired:0,
  revoked:0,
  unsentQrExpired:0,
  other:0
};
let sitePassAdminShareDetailCacheV3 = Object.create(null);
const SITEPASS_ADMIN_SHARE_DETAIL_PAGE_SIZE_V3 = 100;


function sitePassAdminShareRowEventIdV91(row) {
  return String(
    row && (
      row.eventId ||
      row.event_id ||
      row.id
    ) ||
    ''
  ).trim();
}

function sitePassAdminShareRowTokenIdV91(row) {
  return String(
    row && (
      row.tokenId ||
      row.token_id
    ) ||
    ''
  ).trim();
}

function sitePassAdminShareRowEquipmentIdV91(row) {
  return String(
    row && (
      row.equipmentId ||
      row.equipment_id
    ) ||
    ''
  ).trim();
}

function sitePassAdminShareRowEquipmentNoV91(row) {
  return String(
    row && (
      row.equipmentNo ||
      row.equipment_no
    ) ||
    ''
  ).trim();
}

function sitePassAdminShareRowEquipmentNameV91(row) {
  return String(
    row && (
      row.equipmentName ||
      row.equipment_name
    ) ||
    ''
  ).trim();
}

function sitePassAdminShareRowEventTypeV91(row) {
  return String(
    row && (
      row.eventType ||
      row.event_type
    ) ||
    ''
  ).trim().toLowerCase();
}

function sitePassAdminShareRowEventAtV91(row) {
  return row && (
    row.eventAt ||
    row.event_at
  ) || '';
}

function sitePassAdminShareRowCreatorV91(row) {
  return String(
    row && (
      row.creatorName ||
      row.creator_name ||
      row.creatorLoginId ||
      row.creator_login_id
    ) ||
    '-'
  ).trim();
}

function sitePassAdminShareShortIdV91(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= 13) return text;
  return text.slice(0, 8) + '…' + text.slice(-4);
}

function sitePassAdminShareEquipmentKeyV91(row) {
  const equipmentId = sitePassAdminShareRowEquipmentIdV91(row);
  if (equipmentId) return 'id:' + equipmentId;

  const equipmentNo = sitePassAdminShareRowEquipmentNoV91(row);
  if (equipmentNo) return 'no:' + equipmentNo;

  const equipmentName = sitePassAdminShareRowEquipmentNameV91(row);
  return 'name:' + (equipmentName || '장비서류');
}

function sitePassAdminShareEquipmentMetaV91(group) {
  const equipmentId = String(
    group && group.equipmentId || ''
  ).trim();

  const equipmentNo = String(
    group && group.equipmentNo || ''
  ).trim();

  const candidates = [];

  try {
    if (typeof getItems === 'function') {
      const rows = getItems();
      if (Array.isArray(rows)) candidates.push.apply(candidates, rows);
    }
  } catch (e) {}

  try {
    if (typeof getServerEquipmentCache === 'function') {
      const rows = getServerEquipmentCache();
      if (Array.isArray(rows)) candidates.push.apply(candidates, rows);
    }
  } catch (e) {}

  let item = candidates.find(function(row) {
    if (!row || typeof row !== 'object') return false;

    const rowId = String(
      row.equipmentId ||
      row.equipment_id ||
      row.id ||
      ''
    ).trim();

    if (equipmentId && rowId === equipmentId) return true;

    const rowNo = String(
      row.equipmentNo ||
      row.equipment_no ||
      row.code ||
      ''
    ).trim();

    return !!equipmentNo && rowNo === equipmentNo;
  }) || null;

  if (item) {
    try {
      if (typeof getAdminEquipmentPaymentSource === 'function') {
        item = getAdminEquipmentPaymentSource(item) || item;
      }
    } catch (e) {}
  }

  let activeVisible = false;

  try {
    if (typeof getAdminVisibleEquipmentItems === 'function') {
      const visible = getAdminVisibleEquipmentItems();

      activeVisible = (Array.isArray(visible) ? visible : []).some(function(row) {
        if (!row || typeof row !== 'object') return false;

        const rowId = String(
          row.equipmentId ||
          row.equipment_id ||
          row.id ||
          ''
        ).trim();

        if (equipmentId && rowId === equipmentId) return true;

        const rowNo = String(
          row.equipmentNo ||
          row.equipment_no ||
          row.code ||
          ''
        ).trim();

        return !!equipmentNo && rowNo === equipmentNo;
      });
    }
  } catch (e) {}

  const ownerName = String(
    item && (
      item.ownerName ||
      item.owner_name ||
      item.memberName ||
      item.member_name
    ) ||
    ''
  ).trim();

  const ownerLoginId = String(
    item && (
      item.ownerLoginId ||
      item.owner_login_id ||
      item.memberLoginId ||
      item.member_login_id ||
      item.loginId ||
      item.login_id
    ) ||
    ''
  ).trim();

  const serviceStatus = String(
    item && (
      item.serviceStatus ||
      item.service_status
    ) ||
    ''
  ).trim();

  const paymentStatus = String(
    item && (
      item.paymentStatus ||
      item.payment_status
    ) ||
    ''
  ).trim();

  const paymentStatusDisplay = (
    item &&
    typeof window.sitePassPaymentDisplayTextV91 === 'function'
  )
    ? window.sitePassPaymentDisplayTextV91(item)
    : paymentStatus;

  let deleted = false;

  try {
    deleted = !!(
      item &&
      (
        item.isDeleted ||
        item.is_deleted ||
        item.deletedAt ||
        item.deleted_at
      )
    );

    if (
      !deleted &&
      item &&
      typeof isAdminArchiveDeletedItem === 'function'
    ) {
      deleted = !!isAdminArchiveDeletedItem(item);
    }
  } catch (e) {}

  let shareBlocked = null;

  if (item) {
    try {
      if (typeof isServiceShareBlocked === 'function') {
        shareBlocked = !!isServiceShareBlocked(item);
      }
    } catch (e) {
      shareBlocked = null;
    }
  }

  let operationStatus = '상태 확인필요';
  let operationClass = 'unknown';

  if (deleted) {
    operationStatus = '삭제/보관 장비';
    operationClass = 'blocked';
  } else if (item && activeVisible && shareBlocked === false) {
    operationStatus = '정상사용';
    operationClass = 'normal';
  } else if (item && activeVisible && shareBlocked === true) {
    operationStatus = '공유 일시정지';
    operationClass = 'blocked';
  } else if (item && !activeVisible) {
    operationStatus = '회원연결 확인필요';
    operationClass = 'warning';
  }

  return {
    found: !!item,
    ownerName: ownerName || '소유자 확인필요',
    ownerLoginId: ownerLoginId || '',
    serviceStatus: serviceStatus || '확인필요',
    paymentStatus: paymentStatusDisplay || paymentStatus || '확인필요',
    operationStatus,
    operationClass
  };
}

function sitePassAdminShareSummaryGroupV3(item) {
  item = item && typeof item === 'object' ? item : {};

  const group = {
    key: sitePassAdminShareEquipmentKeyV91(item),
    equipmentId: sitePassAdminShareRowEquipmentIdV91(item),
    equipmentNo: sitePassAdminShareRowEquipmentNoV91(item),
    equipmentName: sitePassAdminShareRowEquipmentNameV91(item),
    rows: [],
    counts: {
      sent: Number(item.sent || 0),
      opened: Number(item.opened || 0),
      downloaded: Number(item.downloaded || 0),
      printed: Number(item.printed || 0),
      expired: Number(item.expired || 0),
      revoked: Number(item.revoked || 0)
    },
    excludedUnsentExpired: Number(item.unsentQrExpired || 0),
    rawEventCount: Number(item.rawEventCount || 0),
    otherCount: Number(item.other || 0),
    latestAt: item.latestEventAt || ''
  };

  group.equipmentMeta =
    sitePassAdminShareEquipmentMetaV91(group);

  return group;
}

function sitePassAdminShareSummaryGroupsV3() {
  return (Array.isArray(sitePassAdminShareSummaryItemsV3)
    ? sitePassAdminShareSummaryItemsV3
    : []
  ).map(sitePassAdminShareSummaryGroupV3);
}

function sitePassAdminShareSummaryGroupByKeyV3(key) {
  const value = String(key || '');
  return sitePassAdminShareSummaryGroupsV3().find(function(group) {
    return group.key === value;
  }) || null;
}

function sitePassAdminShareDefaultFolderV3(group) {
  group = group || {};
  const candidates = [
    ['sent', Number(group.counts && group.counts.sent || 0)],
    ['opened', Number(group.counts && group.counts.opened || 0)],
    ['downloaded', Number(group.counts && group.counts.downloaded || 0)],
    ['printed', Number(group.counts && group.counts.printed || 0)],
    ['expired', Number(group.counts && group.counts.expired || 0)],
    ['revoked', Number(group.counts && group.counts.revoked || 0)],
    ['unsent', Number(group.excludedUnsentExpired || 0)]
  ];

  const first = candidates.find(function(row) {
    return row[1] > 0;
  });

  return first ? first[0] : 'sent';
}

function sitePassAdminShareFolderRpcV3(folder) {
  return String(folder || '').toLowerCase() === 'unsent'
    ? 'unsent_qr_expired'
    : String(folder || '').trim().toLowerCase();
}

function sitePassAdminShareDetailKeyV3(equipmentId, folder) {
  return String(equipmentId || '') + '|' +
    sitePassAdminShareFolderRpcV3(folder);
}

function sitePassAdminShareFolderExpectedCountV3(group, folder) {
  group = group || {};
  const key = String(folder || '').trim().toLowerCase();

  if (key === 'unsent') {
    return Number(group.excludedUnsentExpired || 0);
  }

  return Number(
    group.counts &&
    Object.prototype.hasOwnProperty.call(group.counts, key)
      ? group.counts[key]
      : 0
  );
}

function sitePassAdminShareDetailStateV3(equipmentId, folder) {
  const key = sitePassAdminShareDetailKeyV3(
    equipmentId,
    folder
  );

  return sitePassAdminShareDetailCacheV3[key] || null;
}

async function sitePassLoadAdminShareDetailCursorV3(
  equipmentId,
  folder,
  append
) {
  if (!isSuperAdminLoggedIn()) {
    return { ok:false, skipped:true };
  }

  if (
    !window.sitepassSupabase ||
    typeof window.sitepassSupabase.rpc !== 'function'
  ) {
    return { ok:false, skipped:true };
  }

  const id = String(equipmentId || '').trim();
  const uiFolder = String(folder || '').trim().toLowerCase();
  const rpcFolder = sitePassAdminShareFolderRpcV3(uiFolder);

  if (!id) {
    return { ok:false, message:'EQUIPMENT_ID_REQUIRED' };
  }

  const group =
    sitePassAdminShareSummaryGroupsV3().find(function(row) {
      return row.equipmentId === id;
    }) || null;

  if (!group) {
    return { ok:false, message:'SHARE_EQUIPMENT_NOT_FOUND' };
  }

  const cacheKey =
    sitePassAdminShareDetailKeyV3(id, uiFolder);

  let state =
    sitePassAdminShareDetailCacheV3[cacheKey] || {
      rows:[],
      loading:false,
      error:'',
      hasMore:false,
      nextCursor:null,
      fetchedAt:0
    };

  if (state.loading) {
    return { ok:true, loading:true };
  }

  if (!append && state.fetchedAt && !state.error) {
    return {
      ok:true,
      cached:true,
      rows:state.rows,
      hasMore:state.hasMore
    };
  }

  if (!append) {
    state = {
      rows:[],
      loading:false,
      error:'',
      hasMore:false,
      nextCursor:null,
      fetchedAt:0
    };
  }

  if (append && !state.hasMore) {
    return {
      ok:true,
      done:true,
      rows:state.rows
    };
  }

  state.loading = true;
  state.error = '';
  sitePassAdminShareDetailCacheV3[cacheKey] = state;
  requestAdminRender487(0);

  try {
    const cursor =
      append && state.nextCursor
        ? state.nextCursor
        : null;

    const result = await window.sitepassSupabase.rpc(
      'sitepass_get_admin_recipient_share_events_cursor_v3',
      {
        p_equipment_id:id,
        p_folder:rpcFolder,
        p_limit:SITEPASS_ADMIN_SHARE_DETAIL_PAGE_SIZE_V3,
        p_before_event_at:
          cursor && cursor.eventAt
            ? cursor.eventAt
            : null,
        p_before_event_id:
          cursor && cursor.eventId
            ? cursor.eventId
            : null
      }
    );

    if (result && result.error) throw result.error;

    const payload = Array.isArray(result && result.data)
      ? (result.data[0] || {})
      : ((result && result.data) || {});

    if (!payload || payload.ok !== true) {
      throw new Error('SHARE_CURSOR_NOT_OK');
    }

    const incoming = Array.isArray(payload.items)
      ? payload.items
      : [];

    const merged = append
      ? state.rows.slice()
      : [];

    const seen = new Set(
      merged.map(sitePassAdminShareRowEventIdV91)
        .filter(Boolean)
    );

    incoming.forEach(function(row) {
      const rowEquipmentId =
        sitePassAdminShareRowEquipmentIdV91(row);

      if (rowEquipmentId && rowEquipmentId !== id) {
        throw new Error('SHARE_CURSOR_EQUIPMENT_MISMATCH');
      }

      const eventId = sitePassAdminShareRowEventIdV91(row);
      if (eventId && seen.has(eventId)) return;
      if (eventId) seen.add(eventId);
      merged.push(row);
    });

    const expected =
      sitePassAdminShareFolderExpectedCountV3(
        group,
        uiFolder
      );

    if (merged.length > expected) {
      throw new Error(
        'SHARE_DETAIL_COUNT_OVERFLOW: summary ' +
        expected +
        '건 / cursor ' +
        merged.length +
        '건'
      );
    }

    const hasMore = payload.hasMore === true;
    const nextCursor =
      payload.nextCursor &&
      payload.nextCursor.eventAt &&
      payload.nextCursor.eventId
        ? payload.nextCursor
        : null;

    if (hasMore && !nextCursor) {
      throw new Error('SHARE_CURSOR_NEXT_MISSING');
    }

    if (!hasMore && merged.length !== expected) {
      throw new Error(
        'SHARE_DETAIL_COUNT_MISMATCH: summary ' +
        expected +
        '건 / cursor ' +
        merged.length +
        '건. 새 이벤트가 발생했다면 공유기록을 새로고침하세요.'
      );
    }

    state.rows = merged;
    state.hasMore = hasMore;
    state.nextCursor = nextCursor;
    state.fetchedAt = Date.now();
    state.loading = false;
    state.error = '';

    sitePassAdminShareDetailCacheV3[cacheKey] = state;
    requestAdminRender487(0);

    return {
      ok:true,
      rows:state.rows,
      hasMore:state.hasMore,
      nextCursor:state.nextCursor
    };
  } catch (e) {
    state.loading = false;
    state.fetchedAt = Date.now();
    state.error =
      e && e.message
        ? e.message
        : String(e || '상세 공유기록 cursor 조회 오류');

    sitePassAdminShareDetailCacheV3[cacheKey] = state;
    requestAdminRender487(0);

    return {
      ok:false,
      message:state.error
    };
  }
}
window.sitePassLoadAdminShareDetailCursorV3 =
  sitePassLoadAdminShareDetailCursorV3;

function sitePassLoadMoreAdminShareDetailV3() {
  const group =
    sitePassAdminShareSummaryGroupByKeyV3(
      sitePassAdminShareExpandedEquipmentV91
    );

  if (!group || !group.equipmentId) return false;

  const folder =
    String(sitePassAdminShareDetailFolderV91 || '')
      .trim()
      .toLowerCase() ||
    sitePassAdminShareDefaultFolderV3(group);

  sitePassLoadAdminShareDetailCursorV3(
    group.equipmentId,
    folder,
    true
  );

  return false;
}
window.sitePassLoadMoreAdminShareDetailV3 =
  sitePassLoadMoreAdminShareDetailV3;

async function refreshAdminShareHistoryFullV91(force) {
  if (!isSuperAdminLoggedIn()) {
    sitePassAdminShareHistoryRowsV91 = [];
    sitePassAdminShareSummaryItemsV3 = [];
    sitePassAdminShareHistoryTotalV91 = 0;
    sitePassAdminShareHistoryErrorV91 = '';
    sitePassAdminShareDetailCacheV3 = Object.create(null);
    return { ok:false, skipped:true };
  }

  if (
    !window.sitepassSupabase ||
    typeof window.sitepassSupabase.rpc !== 'function'
  ) {
    return { ok:false, skipped:true };
  }

  const now = Date.now();

  if (sitePassAdminShareHistoryLoadingV91) {
    return { ok:true, loading:true };
  }

  if (
    !force &&
    sitePassAdminShareHistoryFetchedAtV91 &&
    now - sitePassAdminShareHistoryFetchedAtV91 < 15000
  ) {
    return {
      ok:true,
      cached:true,
      items:sitePassAdminShareSummaryItemsV3,
      total:sitePassAdminShareHistoryTotalV91
    };
  }

  sitePassAdminShareHistoryLoadingV91 = true;
  sitePassAdminShareHistoryErrorV91 = '';

  try {
    const result = await window.sitepassSupabase.rpc(
      'sitepass_get_admin_recipient_share_summary_v3'
    );

    if (result && result.error) throw result.error;

    const payload = Array.isArray(result && result.data)
      ? (result.data[0] || {})
      : ((result && result.data) || {});

    if (!payload || payload.ok !== true) {
      throw new Error('SHARE_SUMMARY_NOT_OK');
    }

    const items = Array.isArray(payload.items)
      ? payload.items
      : [];

    const totals =
      payload.totals && typeof payload.totals === 'object'
        ? payload.totals
        : {};

    const totalEvents = Number(payload.totalEvents || 0);
    const equipmentCount = Number(payload.equipmentCount || 0);

    if (
      !Number.isFinite(totalEvents) ||
      totalEvents < 0 ||
      !Number.isFinite(equipmentCount) ||
      equipmentCount < 0
    ) {
      throw new Error('SHARE_SUMMARY_INVALID_TOTAL');
    }

    if (equipmentCount !== items.length) {
      throw new Error(
        'SHARE_SUMMARY_EQUIPMENT_COUNT_MISMATCH'
      );
    }

    let rawSum = 0;
    let otherSum = 0;

    items.forEach(function(item) {
      const raw = Number(item && item.rawEventCount || 0);

      const classified =
        Number(item && item.sent || 0) +
        Number(item && item.opened || 0) +
        Number(item && item.downloaded || 0) +
        Number(item && item.printed || 0) +
        Number(item && item.expired || 0) +
        Number(item && item.revoked || 0) +
        Number(item && item.unsentQrExpired || 0) +
        Number(item && item.other || 0);

      if (raw !== classified) {
        throw new Error(
          'SHARE_SUMMARY_CLASSIFICATION_MISMATCH'
        );
      }

      rawSum += raw;
      otherSum += Number(item && item.other || 0);
    });

    if (rawSum !== totalEvents) {
      throw new Error(
        'SHARE_SUMMARY_TOTAL_MISMATCH: server ' +
        totalEvents +
        '건 / equipment sum ' +
        rawSum +
        '건'
      );
    }

    const totalOther = Number(totals.other || 0);

    if (otherSum !== totalOther) {
      throw new Error(
        'SHARE_SUMMARY_OTHER_MISMATCH'
      );
    }

    // 새 event_type이 생기면 7개 폴더에서 조용히 누락시키지 않는다.
    if (totalOther > 0) {
      throw new Error(
        'UNSUPPORTED_SHARE_EVENT_TYPE: 미분류 이벤트 ' +
        totalOther +
        '건. 새 이벤트 유형을 먼저 확인해야 합니다.'
      );
    }

    sitePassAdminShareSummaryItemsV3 = items;
    sitePassAdminShareSummaryTotalsV3 = {
      sent:Number(totals.sent || 0),
      opened:Number(totals.opened || 0),
      downloaded:Number(totals.downloaded || 0),
      printed:Number(totals.printed || 0),
      expired:Number(totals.expired || 0),
      revoked:Number(totals.revoked || 0),
      unsentQrExpired:Number(totals.unsentQrExpired || 0),
      other:totalOther
    };

    // R9P 공유기록 본문에서는 전체 raw event 배열을 보관하지 않는다.
    sitePassAdminShareHistoryRowsV91 = [];
    sitePassAdminShareHistoryTotalV91 = totalEvents;
    sitePassAdminShareHistoryFetchedAtV91 = Date.now();
    sitePassAdminShareHistoryErrorV91 = '';

    // Summary 갱신 뒤 상세 cache도 새 스냅샷 기준으로 다시 읽는다.
    sitePassAdminShareDetailCacheV3 = Object.create(null);

    requestAdminRender487(20);

    const expanded =
      sitePassAdminShareSummaryGroupByKeyV3(
        sitePassAdminShareExpandedEquipmentV91
      );

    if (expanded && expanded.equipmentId) {
      const folder =
        String(sitePassAdminShareDetailFolderV91 || '')
          .trim()
          .toLowerCase() ||
        sitePassAdminShareDefaultFolderV3(expanded);

      setTimeout(function() {
        sitePassLoadAdminShareDetailCursorV3(
          expanded.equipmentId,
          folder,
          false
        );
      }, 30);
    }

    return {
      ok:true,
      items:items,
      total:totalEvents
    };
  } catch (e) {
    sitePassAdminShareHistoryFetchedAtV91 = Date.now();
    sitePassAdminShareHistoryErrorV91 =
      e && e.message
        ? e.message
        : String(e || '공유기록 Summary 조회 오류');

    requestAdminRender487(20);

    return {
      ok:false,
      message:sitePassAdminShareHistoryErrorV91
    };
  } finally {
    sitePassAdminShareHistoryLoadingV91 = false;
  }
}
window.sitePassRefreshAdminShareHistoryFullV91 =
  refreshAdminShareHistoryFullV91;

function sitePassToggleAdminShareEquipmentV91(key) {
  const value = String(key || '');
  const opening =
    sitePassAdminShareExpandedEquipmentV91 !== value;

  sitePassAdminShareExpandedEquipmentV91 =
    opening ? value : '';

  sitePassAdminShareExcludedAuditOpenV91 = false;

  if (!opening) {
    sitePassAdminShareDetailFolderV91 = '';
    try { renderAdmin(); } catch (e) {}
    return false;
  }

  const group =
    sitePassAdminShareSummaryGroupByKeyV3(value);

  const folder =
    sitePassAdminShareDefaultFolderV3(group);

  sitePassAdminShareDetailFolderV91 = folder;

  try { renderAdmin(); } catch (e) {}

  if (group && group.equipmentId) {
    sitePassLoadAdminShareDetailCursorV3(
      group.equipmentId,
      folder,
      false
    );
  }

  return false;
}
window.sitePassToggleAdminShareEquipmentV91 =
  sitePassToggleAdminShareEquipmentV91;

function sitePassOpenAdminShareDetailFolderV91(folder) {
  const value =
    String(folder || '').trim().toLowerCase();

  sitePassAdminShareDetailFolderV91 = value;
  sitePassAdminShareExcludedAuditOpenV91 = false;

  try { renderAdmin(); } catch (e) {}

  const group =
    sitePassAdminShareSummaryGroupByKeyV3(
      sitePassAdminShareExpandedEquipmentV91
    );

  if (group && group.equipmentId) {
    sitePassLoadAdminShareDetailCursorV3(
      group.equipmentId,
      value,
      false
    );
  }

  return false;
}
window.sitePassOpenAdminShareDetailFolderV91 =
  sitePassOpenAdminShareDetailFolderV91;

function sitePassToggleAdminShareExcludedAuditV91() {
  sitePassAdminShareExcludedAuditOpenV91 =
    !sitePassAdminShareExcludedAuditOpenV91;

  try { renderAdmin(); } catch (e) {}
  return false;
}
window.sitePassToggleAdminShareExcludedAuditV91 =
  sitePassToggleAdminShareExcludedAuditV91;

function sitePassGoAdminShareEquipmentPageV91(page) {
  const next = Number(page || 1);

  sitePassAdminShareEquipmentPageV91 =
    Number.isFinite(next)
      ? Math.max(1, Math.floor(next))
      : 1;

  sitePassAdminShareExpandedEquipmentV91 = '';
  sitePassAdminShareDetailFolderV91 = '';
  sitePassAdminShareExcludedAuditOpenV91 = false;

  try { renderAdmin(); } catch (e) {}
  return false;
}
window.sitePassGoAdminShareEquipmentPageV91 =
  sitePassGoAdminShareEquipmentPageV91;

function sitePassAdminSectionAllowedV578(section) {
  const key = String(section || 'dashboard');
  const common = ['dashboard','members','equipment','shares','contacts','payments','push','errors'];
  const superOnly = ['admins','settings','audit'];
  if (common.includes(key)) return true;
  return isSuperAdminLoggedIn() && superOnly.includes(key);
}

function sitePassSetAdminSectionV578(section) {
  const key = String(section || 'dashboard');
  if (!sitePassAdminSectionAllowedV578(key)) return false;
  sitePassAdminSectionV578 = key;
  try {
    sessionStorage.setItem('sitepass_admin_section_v578', key);
  } catch (e) {}

  if (key === 'members') {
    try {
      const memberModV731R2 = window.SitePassAdminMembers || {};
      if (typeof memberModV731R2.normalizeDirectMemberFolderV731R2 === 'function') {
        memberModV731R2.normalizeDirectMemberFolderV731R2();
      }
    } catch (e) {}
  }

  if (key === 'admins' && isSuperAdminLoggedIn()) {
    try {
      const mod = window.SitePassAdminMembers || {};
      if (typeof mod.setAdminMemberFolder === 'function') {
        mod.setAdminMemberFolder('admin');
        return false;
      }
      if (typeof setAdminMemberFolder === 'function') {
        setAdminMemberFolder('admin');
        return false;
      }
    } catch (e) {}
  }

  try { renderAdmin(); } catch (e) { console.warn('관리자 상위 폴더 이동 실패:', e); }
  if (key === 'shares' && isSuperAdminLoggedIn()) {
    setTimeout(function(){
      try { refreshAdminShareHistoryFullV91(true); } catch (e) {}
    }, 30);
  }
  if (key === 'errors') {
    setTimeout(function(){
      try {
        sitePassSyncAdminErrorMonitorVisibilityV682();
        if (
          window.SitePassErrorMonitor &&
          typeof window.SitePassErrorMonitor.loadAdmin === 'function'
        ) {
          window.SitePassErrorMonitor.loadAdmin();
        }
      } catch (e) {}
    }, 30);
  }
  return false;
}
window.sitePassSetAdminSectionV578 = sitePassSetAdminSectionV578;

// SITEPASS_73_ADMIN_ERROR_MONITOR_DEDICATED_TAB_V682
// 기존 공통 오류모니터 패널을 오류로그 상위 폴더에서만 표시한다.
function sitePassSyncAdminErrorMonitorVisibilityV682() {
  const panel = document.getElementById('sitepassErrorMonitorAdminV537');
  if (!panel) return false;

  const shouldShow =
    sitePassAdminSectionV578 === 'errors' &&
    typeof isAdminLoggedIn === 'function' &&
    isAdminLoggedIn();

  panel.hidden = !shouldShow;
  panel.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  return shouldShow;
}
window.sitePassSyncAdminErrorMonitorVisibilityV682 = sitePassSyncAdminErrorMonitorVisibilityV682;

function sitePassOpenAdminMemberFolderV578(folder) {
  sitePassAdminSectionV578 = 'members';
  try {
    if (typeof setAdminMemberFolder === 'function') {
      setAdminMemberFolder(folder || 'all');
      return false;
    }
  } catch (e) {}
  try { renderAdmin(); } catch (e) {}
  return false;
}
window.sitePassOpenAdminMemberFolderV578 = sitePassOpenAdminMemberFolderV578;

function sitePassSetAdminShareFilterV578(filter) {
  sitePassAdminShareFilterV578 = String(filter || 'all');
  try { renderAdmin(); } catch (e) {}
  return false;
}
window.sitePassSetAdminShareFilterV578 = sitePassSetAdminShareFilterV578;

function sitePassApplyAdminShareSearchV578() {
  const input = document.getElementById('sitepassAdminShareSearchV578');
  sitePassAdminShareSearchV578 = String(input && input.value || '').trim();
  sitePassAdminShareEquipmentPageV91 = 1;
  sitePassAdminShareExpandedEquipmentV91 = '';
  sitePassAdminShareDetailFolderV91 = '';
  sitePassAdminShareExcludedAuditOpenV91 = false;
  try { renderAdmin(); } catch (e) {}
  return false;
}
window.sitePassApplyAdminShareSearchV578 = sitePassApplyAdminShareSearchV578;

function sitePassClearAdminShareSearchV578() {
  sitePassAdminShareSearchV578 = '';
  sitePassAdminShareEquipmentPageV91 = 1;
  sitePassAdminShareExpandedEquipmentV91 = '';
  sitePassAdminShareDetailFolderV91 = '';
  sitePassAdminShareExcludedAuditOpenV91 = false;
  try { renderAdmin(); } catch (e) {}
  return false;
}
window.sitePassClearAdminShareSearchV578 = sitePassClearAdminShareSearchV578;

function sitePassEnsureAdminInquiryNotificationLinkV675() {
  if (!isSuperAdminLoggedIn()) return false;

  try {
    const inquiryFrontendV675 = window.SitePassAdminInquiryV675;
    if (
      inquiryFrontendV675 &&
      typeof inquiryFrontendV675.ensureNotificationLink === 'function'
    ) {
      inquiryFrontendV675.ensureNotificationLink();
      return true;
    }
  } catch (e) {}

  return false;
}
window.sitePassEnsureAdminInquiryNotificationLinkV675 = sitePassEnsureAdminInquiryNotificationLinkV675;

function sitePassGetAdminInquiryUnreadRoomsV675() {
  if (!isSuperAdminLoggedIn()) return 0;

  try {
    const inquiryFrontendV675 = window.SitePassAdminInquiryV675;
    if (!inquiryFrontendV675 || typeof inquiryFrontendV675.getState !== 'function') {
      return 0;
    }

    const inquiryStateV675 = inquiryFrontendV675.getState() || {};
    const inquirySummaryV675 = inquiryStateV675.listSummary || {};
    const rawCountV675 = Number(
      inquirySummaryV675.totalUnreadRooms != null
        ? inquirySummaryV675.totalUnreadRooms
        : inquirySummaryV675.total_unread_rooms
    );

    return Number.isFinite(rawCountV675) && rawCountV675 > 0
      ? Math.floor(rawCountV675)
      : 0;
  } catch (e) {
    return 0;
  }
}
window.sitePassGetAdminInquiryUnreadRoomsV675 = sitePassGetAdminInquiryUnreadRoomsV675;

function sitePassRenderAdminTopNavV578() {
  const common = [
    ['dashboard','대시보드'],
    ['members','회원관리'],
    ['equipment','등록관리'],
    ['shares','공유기록'],
    ['contacts','문의·채팅'],
    ['payments','결제관리']
  ];
  const superOnly = [
    ['admins','관리자관리'],
    ['settings','시스템설정'],
    ['audit','감사기록']
  ];
  const utilityOnly = [
    ['push','푸시알림'],
    ['errors','오류로그']
  ];
  const items = common
    .concat(isSuperAdminLoggedIn() ? superOnly : [])
    .concat(utilityOnly);
  return '<div class="sitepass-admin-nav-v578" role="tablist" aria-label="관리자 상위 메뉴">' +
    items.map(function(item){
      const key = item[0];
      const label = item[1];
      const active = sitePassAdminSectionV578 === key ? ' active' : '';
      // STEP91 R9M:
      // 공유기록의 과거 최근-200 배열 길이는 전체 건수/미확인 수가 아니므로
      // 메뉴 배지로 표시하지 않는다. 문의·채팅의 실제 미확인 배지만 유지한다.
      const badgeCount =
        key === 'contacts'
          ? sitePassGetAdminInquiryUnreadRoomsV675()
          : 0;
      const badge = badgeCount > 0
        ? '<span class="sitepass-admin-nav-badge-v675" aria-label="미확인 ' + badgeCount + '건">' + badgeCount + '</span>'
        : '';
      return '<button type="button" class="sitepass-admin-nav-btn-v578' + active + '" role="tab" aria-selected="' + (active ? 'true' : 'false') + '" onclick="return sitePassSetAdminSectionV578(\'' + key + '\')">' + escapeHtml(label) + badge + '</button>';
    }).join('') +
  '</div>';
}

function sitePassRenderAdminShareMiniV578() {
  if (!isSuperAdminLoggedIn()) return '';
  const rows = Array.isArray(sitePassAdminRecipientEventsV577) ? sitePassAdminRecipientEventsV577 : [];
  const counts = { sent:0, opened:0, downloaded:0, printed:0, expired:0, revoked:0 };
  rows.forEach(function(row){
    const key = String(row && (row.eventType || row.event_type) || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
  });
  return '<div class="card sitepass-admin-dashboard-share-v578" style="box-shadow:none;margin-top:12px;">' +
    '<div class="sitepass-admin-section-head-v578"><div><h3>공유기록 현황</h3><div class="small">Recipient V2 서버 이벤트 원본 기준</div></div><button type="button" class="ghost" onclick="return sitePassSetAdminSectionV578(\'shares\')">공유기록 열기</button></div>' +
    '<div class="sitepass-admin-kpi-grid-v578">' +
      '<div><b>전송</b><span>' + counts.sent + '</span></div>' +
      '<div><b>열람</b><span>' + counts.opened + '</span></div>' +
      '<div><b>다운로드</b><span>' + counts.downloaded + '</span></div>' +
      '<div><b>인쇄</b><span>' + counts.printed + '</span></div>' +
      '<div><b>만료</b><span>' + counts.expired + '</span></div>' +
      '<div><b>회수</b><span>' + counts.revoked + '</span></div>' +
    '</div>' +
  '</div>';
}

let sitePassAdminEquipmentSearchV736 = '';
let sitePassAdminEquipmentPageV736 = 1;
let sitePassAdminEquipmentExpandedCodeV736 = '';
const SITEPASS_ADMIN_EQUIPMENT_PAGE_SIZE_V736 = 20;

function sitePassAdminEquipmentNormalizeSearchV736(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[-_.]/g, '');
}

function sitePassAdminEquipmentRequestRenderV736() {
  if (typeof window.sitePassRequestAdminRender487 === 'function') {
    window.sitePassRequestAdminRender487(0);
    return;
  }
  if (typeof window.renderAdmin === 'function') {
    try { window.renderAdmin(); } catch (e) {}
  }
}

function sitePassApplyAdminEquipmentSearchV736() {
  const input = document.getElementById('sitePassAdminEquipmentSearchV736');
  sitePassAdminEquipmentSearchV736 = String(input ? input.value : '').trim();
  sitePassAdminEquipmentPageV736 = 1;
  sitePassAdminEquipmentExpandedCodeV736 = '';
  sitePassAdminEquipmentRequestRenderV736();
  return false;
}

function sitePassClearAdminEquipmentSearchV736() {
  sitePassAdminEquipmentSearchV736 = '';
  sitePassAdminEquipmentPageV736 = 1;
  sitePassAdminEquipmentExpandedCodeV736 = '';
  const input = document.getElementById('sitePassAdminEquipmentSearchV736');
  if (input) input.value = '';
  sitePassAdminEquipmentRequestRenderV736();
  return false;
}

function sitePassGoAdminEquipmentPageV736(page) {
  const next = Number(page || 1);
  sitePassAdminEquipmentPageV736 = Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1;
  sitePassAdminEquipmentExpandedCodeV736 = '';
  sitePassAdminEquipmentRequestRenderV736();
  return false;
}

function sitePassAdminEquipmentDocPageCountV736(doc) {
  doc = doc && typeof doc === 'object' ? doc : {};
  const pages = Array.isArray(doc.pages) ? doc.pages.length : 0;
  const explicit = Number(doc.pageCount || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(explicit, pages);
  if (pages > 0) return pages;
  const hasAttachment = !!String(
    doc.fileName ||
    doc.storagePath ||
    doc.storage_path ||
    doc.filePath ||
    doc.file_path ||
    doc.objectPath ||
    doc.object_path ||
    doc.path ||
    ''
  ).trim();
  return hasAttachment ? 1 : 0;
}

function sitePassAdminEquipmentDocGroupV736(doc, key) {
  doc = doc && typeof doc === 'object' ? doc : {};
  const explicit = String(doc.groupKey || doc.group_key || '').trim().toLowerCase();
  if (explicit === 'equipment' || explicit === 'driver' || explicit === 'worker') return explicit;

  const probe = String(
    key || doc.key || doc.docKey || doc.doc_key || doc.docKind || doc.doc_kind || ''
  ).toLowerCase();

  if (doc.workerUid || doc.worker_uid || probe.indexOf('worker') >= 0) return 'worker';
  if (doc.driverPhone || doc.driver_phone || probe.indexOf('driver') >= 0) return 'driver';
  return 'equipment';
}

function sitePassAdminEquipmentDocsV736(item, group) {
  const docs = item && item.docs && typeof item.docs === 'object' ? item.docs : {};
  return Object.keys(docs).map(function(key){
    const doc = docs[key] && typeof docs[key] === 'object' ? docs[key] : {};
    return {
      key: key,
      doc: doc,
      group: sitePassAdminEquipmentDocGroupV736(doc, key),
      pages: sitePassAdminEquipmentDocPageCountV736(doc)
    };
  }).filter(function(row){
    return row.group === group && row.pages > 0;
  });
}

function sitePassAdminEquipmentDocTotalV736(item, group) {
  return sitePassAdminEquipmentDocsV736(item, group).reduce(function(sum, row){
    return sum + Number(row.pages || 0);
  }, 0);
}

function sitePassAdminEquipmentDriverNameV736(item) {
  const docs = sitePassAdminEquipmentDocsV736(item, 'driver');
  for (const row of docs) {
    const name = String(row.doc.authPersonName || row.doc.auth_person_name || '').trim();
    if (name) return name;
  }
  return String(item && (item.driverName || item.driver_name) || '').trim() || '-';
}

function sitePassAdminEquipmentWorkerGroupsV736(item) {
  const map = new Map();
  const people = Array.isArray(item && item.workerPeople)
    ? item.workerPeople
    : (item && item.bundleMeta && Array.isArray(item.bundleMeta.workerPeople) ? item.bundleMeta.workerPeople : []);

  people.forEach(function(person, index){
    person = person && typeof person === 'object' ? person : {};
    const uid = String(person.uid || person.workerUid || person.worker_uid || '').trim();
    const key = uid ? 'uid:' + uid : 'meta:' + index;
    map.set(key, {
      key:key,
      uid:uid,
      name:String(person.name || person.authPersonName || person.auth_person_name || '').trim(),
      label:String(person.label || '').trim(),
      subjectId:String(person.authSubjectId || person.auth_subject_id || '').trim(),
      pages:0,
      docs:[]
    });
  });

  sitePassAdminEquipmentDocsV736(item, 'worker').forEach(function(row, index){
    const doc = row.doc || {};
    const uid = String(doc.workerUid || doc.worker_uid || '').trim();
    const subjectId = String(doc.authSubjectId || doc.auth_subject_id || '').trim();
    const key = uid ? 'uid:' + uid : (subjectId ? 'subject:' + subjectId : 'doc:' + index);
    let group = map.get(key);
    if (!group) {
      group = { key:key, uid:uid, name:'', label:'', subjectId:subjectId, pages:0, docs:[] };
      map.set(key, group);
    }
    if (!group.name) group.name = String(doc.authPersonName || doc.auth_person_name || '').trim();
    if (!group.label) group.label = String(doc.workerLabel || doc.worker_label || '').trim();
    if (!group.subjectId) group.subjectId = subjectId;
    group.pages += Number(row.pages || 0);
    group.docs.push(row);
  });

  return Array.from(map.values()).filter(function(group){
    return group.pages > 0 || group.uid || group.subjectId || group.name || group.label;
  });
}

function sitePassAdminEquipmentWorkerCountV736(item) {
  const groups = sitePassAdminEquipmentWorkerGroupsV736(item);
  if (groups.length) return groups.length;
  const metaCount = Number(item && item.bundleMeta && item.bundleMeta.workerPeopleCount || 0);
  return Number.isFinite(metaCount) && metaCount > 0 ? Math.floor(metaCount) : 0;
}

function sitePassAdminEquipmentOwnerIdV736(item) {
  return String(item && (
    item.ownerSignupId ||
    item.owner_signup_id ||
    item.ownerProviderId ||
    item.owner_provider_id ||
    item.ownerMemberId ||
    item.owner_member_id ||
    '-'
  ) || '-').trim() || '-';
}


function sitePassAdminEquipmentNoV737(item) {
  return String(item && (
    item.equipmentNo ||
    item.equipment_no ||
    item.code ||
    ''
  ) || '').trim();
}

function sitePassAdminEquipmentPersonAuthRowsV737(item, subjectType) {
  const equipmentNo = sitePassAdminEquipmentNoV737(item);
  const type = subjectType === 'worker' ? 'worker' : 'driver';
  if (!equipmentNo) return [];

  const api = window.SitePassAdminEquipmentPersonnelApi || null;
  if (!api || typeof api.getState !== 'function') return [];
  const state = api.getState(type);
  const items = state && state.payload && Array.isArray(state.payload.items)
    ? state.payload.items
    : [];

  const prefix = equipmentNo + ':' + type + ':';
  const seen = new Set();

  return items.filter(function(row){
    const subjectId = String(row && row.subjectId || '').trim();
    if (!subjectId || subjectId.indexOf(prefix) !== 0 || seen.has(subjectId)) return false;
    seen.add(subjectId);
    return true;
  });
}

function sitePassAdminEquipmentPersonAuthCardV737(row) {
  const detail = window.SitePassAdminEquipmentPersonnelDetail || null;
  if (detail && typeof detail.render === 'function') {
    return detail.render(row);
  }
  return '<div class="notice">' +
    '<b>' + escapeHtml(row && row.displayName || '-') + '</b><br>' +
    '서버 인증현황 상세 모듈을 불러오지 못했습니다.' +
  '</div>';
}

function sitePassAdminEquipmentDriverGroupsV737(item) {
  const map = new Map();
  const docs = sitePassAdminEquipmentDocsV736(item, 'driver');

  docs.forEach(function(row, index){
    const doc = row.doc || {};
    const subjectId = String(doc.authSubjectId || doc.auth_subject_id || '').trim();
    const key = subjectId ? 'subject:' + subjectId : 'unbound';
    let group = map.get(key);
    if (!group) {
      group = {
        key:key,
        subjectId:subjectId,
        name:'',
        pages:0,
        docs:[],
        auth:null
      };
      map.set(key, group);
    }
    if (!group.name) {
      group.name = String(doc.authPersonName || doc.auth_person_name || '').trim();
    }
    group.pages += Number(row.pages || 0);
    group.docs.push(row);
  });

  const authRows = sitePassAdminEquipmentPersonAuthRowsV737(item, 'driver');
  authRows.forEach(function(row){
    const subjectId = String(row && row.subjectId || '').trim();
    const key = 'subject:' + subjectId;
    let group = map.get(key);
    if (!group) {
      group = {
        key:key,
        subjectId:subjectId,
        name:'',
        pages:0,
        docs:[],
        auth:null
      };
      map.set(key, group);
    }
    group.auth = row;
    if (!group.name || group.name === '-') {
      group.name = String(row && row.displayName || '').trim();
    }
  });

  if (authRows.length === 1 && map.has('unbound')) {
    const unbound = map.get('unbound');
    const subjectId = String(authRows[0].subjectId || '').trim();
    const key = 'subject:' + subjectId;
    const target = map.get(key);
    if (target && unbound) {
      target.pages += Number(unbound.pages || 0);
      target.docs = target.docs.concat(unbound.docs || []);
      if (!target.name) target.name = unbound.name || '';
      map.delete('unbound');
    }
  }

  if (!map.size) {
    const fallbackName = String(item && (item.driverName || item.driver_name) || '').trim();
    if (fallbackName) {
      map.set('legacy', {
        key:'legacy',
        subjectId:'',
        name:fallbackName,
        pages:0,
        docs:[],
        auth:null
      });
    }
  }

  return Array.from(map.values()).filter(function(group){
    return group.auth || group.docs.length || group.name || group.subjectId;
  });
}

function sitePassAdminEquipmentWorkerGroupsV737(item) {
  const base = sitePassAdminEquipmentWorkerGroupsV736(item).map(function(group){
    return {
      key:String(group.key || ''),
      uid:String(group.uid || ''),
      subjectId:String(group.subjectId || ''),
      name:String(group.name || ''),
      label:String(group.label || ''),
      pages:Number(group.pages || 0),
      docs:Array.isArray(group.docs) ? group.docs.slice() : [],
      auth:null
    };
  });

  const map = new Map();
  base.forEach(function(group, index){
    const key = group.subjectId
      ? 'subject:' + group.subjectId
      : (group.uid ? 'uid:' + group.uid : 'base:' + index);
    group.key = key;
    map.set(key, group);
  });

  const authRows = sitePassAdminEquipmentPersonAuthRowsV737(item, 'worker');
  authRows.forEach(function(row){
    const subjectId = String(row && row.subjectId || '').trim();
    const key = 'subject:' + subjectId;
    let group = map.get(key);
    if (!group) {
      group = {
        key:key,
        uid:'',
        subjectId:subjectId,
        name:'',
        label:'',
        pages:0,
        docs:[],
        auth:null
      };
      map.set(key, group);
    }
    group.auth = row;
    if (!group.name) group.name = String(row && row.displayName || '').trim();
  });

  return Array.from(map.values()).filter(function(group){
    return group.auth || group.docs.length || group.uid || group.subjectId || group.name || group.label;
  });
}

function sitePassAdminEquipmentDriverSummaryV737(item) {
  const groups = sitePassAdminEquipmentDriverGroupsV737(item);
  if (!groups.length) {
    return {
      name:'-',
      count:0,
      pages:sitePassAdminEquipmentDocTotalV736(item, 'driver')
    };
  }

  const names = groups.map(function(group){
    return String(group.name || (group.auth && group.auth.displayName) || '').trim();
  }).filter(Boolean);

  let name = names[0] || '-';
  if (names.length > 1) name += ' 외 ' + (names.length - 1) + '명';

  return {
    name:name,
    count:groups.length,
    pages:sitePassAdminEquipmentDocTotalV736(item, 'driver')
  };
}

function sitePassAdminEquipmentWorkerSummaryV737(item) {
  const groups = sitePassAdminEquipmentWorkerGroupsV737(item);
  return {
    count:groups.length || sitePassAdminEquipmentWorkerCountV736(item),
    pages:sitePassAdminEquipmentDocTotalV736(item, 'worker')
  };
}

function sitePassAdminEquipmentPersonGroupHtmlV737(subjectType, group, index) {
  group = group && typeof group === 'object' ? group : {};
  const roleLabel = subjectType === 'worker' ? '인부' : '기사';
  const displayName = String(
    group.name ||
    group.label ||
    (group.auth && group.auth.displayName) ||
    (roleLabel + ' ' + (index + 1))
  ).trim();

  const authHtml = group.auth
    ? sitePassAdminEquipmentPersonAuthCardV737(group.auth)
    : sitePassAdminEquipmentConsentHtmlV736(subjectType, group.subjectId);

  return '<div class="sitepass-admin-eq-person-block-v736">' +
    '<div class="sitepass-admin-eq-person-title-v736"><b>' + escapeHtml(displayName) + '</b><span>' + Number(group.pages || 0) + '장</span></div>' +
    authHtml +
    '<div style="margin-top:8px;">' + sitePassAdminEquipmentDocRowsHtmlV736(group.docs || []) + '</div>' +
  '</div>';
}

function sitePassAdminEquipmentUnlinkedAuthHtmlV737(items) {
  const equipmentNos = new Set(
    (Array.isArray(items) ? items : [])
      .map(sitePassAdminEquipmentNoV737)
      .filter(Boolean)
  );

  const api = window.SitePassAdminEquipmentPersonnelApi || null;
  if (!api || typeof api.getState !== 'function') return '';

  const unlinked = [];
  ['driver','worker'].forEach(function(type){
    const state = api.getState(type);
    const rows = state && state.payload && Array.isArray(state.payload.items)
      ? state.payload.items
      : [];
    rows.forEach(function(row){
      const subjectId = String(row && row.subjectId || '').trim();
      const parts = subjectId.split(':');
      const equipmentNo = String(parts[0] || '').trim();
      const subjectType = String(parts[1] || '').trim();
      if (!equipmentNo || subjectType !== type || !equipmentNos.has(equipmentNo)) {
        unlinked.push({ type:type, row:row });
      }
    });
  });

  if (!unlinked.length) return '';

  return '<details class="sitepass-admin-person-meta-r2" style="margin-top:12px;">' +
    '<summary>장비 미연결 기사·인부 인증기록 ' + unlinked.length + '건</summary>' +
    '<div class="small" style="margin:8px 0;">장비번호가 현재 장비카드와 정확히 일치하지 않는 서버 인증기록입니다. 임의로 장비에 붙이지 않고 별도로 남깁니다.</div>' +
    unlinked.map(function(entry){
      return sitePassAdminEquipmentPersonAuthCardV737(entry.row);
    }).join('') +
  '</details>';
}

function sitePassAdminEquipmentSearchHaystackV736(item) {
  const driverSummary = sitePassAdminEquipmentDriverSummaryV737(item);
  const values = [
    item && (item.equipmentNo || item.equipment_no || item.code),
    item && (item.equipmentName || item.equipment_name || item.name),
    item && (item.ownerSignupId || item.owner_signup_id),
    item && (item.ownerProviderId || item.owner_provider_id),
    item && (item.ownerMemberId || item.owner_member_id),
    item && (item.ownerName || item.owner_name),
    driverSummary.name
  ];

  sitePassAdminEquipmentDriverGroupsV737(item).forEach(function(group){
    if (group.auth) values.push(group.auth.displayName, group.auth.phoneLast4);
    values.push(group.name, group.subjectId);
  });

  sitePassAdminEquipmentWorkerGroupsV737(item).forEach(function(group){
    values.push(group.name, group.label, group.subjectId);
    if (group.auth) values.push(group.auth.displayName, group.auth.phoneLast4);
  });

  return sitePassAdminEquipmentNormalizeSearchV736(values.filter(Boolean).join(' '));
}

function sitePassAdminEquipmentFindPersonAuthV736(subjectType, subjectId) {
  const id = String(subjectId || '').trim();
  if (!id) return null;
  const api = window.SitePassAdminEquipmentPersonnelApi || null;
  if (!api || typeof api.getState !== 'function') return null;
  const state = api.getState(subjectType);
  const items = state && state.payload && Array.isArray(state.payload.items) ? state.payload.items : [];
  return items.find(function(row){
    return String(row && row.subjectId || '').trim() === id;
  }) || null;
}

function sitePassAdminEquipmentConsentHtmlV736(subjectType, subjectId) {
  const id = String(subjectId || '').trim();
  if (!id) {
    return '<div class="sitepass-admin-eq-consent-v736"><b>약관동의서</b><span>연결정보 없음</span><small>장비 저장자료에 subject_id가 없어 서버 동의기록을 임의 연결하지 않습니다.</small></div>';
  }

  const api = window.SitePassAdminEquipmentPersonnelApi || null;
  const state = api && typeof api.getState === 'function' ? api.getState(subjectType) : null;

  if (state && state.loading) {
    return '<div class="sitepass-admin-eq-consent-v736"><b>약관동의서</b><span>서버 확인 중</span><small>최고관리자 read-only 인증현황을 조회하고 있습니다.</small></div>';
  }

  const row = sitePassAdminEquipmentFindPersonAuthV736(subjectType, id);
  if (!row) {
    const note = state && state.error
      ? '서버 조회 실패: ' + String(state.error)
      : '해당 subject_id의 서버 동의기록을 확인하지 못했습니다.';
    return '<div class="sitepass-admin-eq-consent-v736"><b>약관동의서</b><span>미확인</span><small>' + escapeHtml(note) + '</small></div>';
  }

  const consentText = row.consented === true ? '확인' : '미확인';
  let meta = '';
  if (row.consentedAt) {
    try { meta += new Date(row.consentedAt).toLocaleString('ko-KR'); }
    catch (e) { meta += String(row.consentedAt); }
  }
  if (row.consentMethod) meta += (meta ? ' · ' : '') + String(row.consentMethod);

  return '<div class="sitepass-admin-eq-consent-v736"><b>약관동의서</b><span>' + escapeHtml(consentText) + '</span><small>' + escapeHtml(meta || '서버 동의기록') + '</small></div>';
}

function sitePassAdminEquipmentDocRowsHtmlV736(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return '<div class="empty sitepass-admin-eq-empty-v736">등록된 첨부서류가 없습니다.</div>';
  }
  return '<div class="sitepass-admin-eq-doc-list-v736">' + rows.map(function(row){
    const doc = row.doc || {};
    const title = String(doc.title || doc.label || doc.name || row.key || '서류');
    const status = String(doc.status || (row.pages > 0 ? '첨부됨' : '-'));
    const expiry = String(doc.expireDate || doc.expiresAt || doc.expire_date || '').trim();
    return '<div class="sitepass-admin-eq-doc-row-v736">' +
      '<div><b>' + escapeHtml(title) + '</b><small>' + escapeHtml(status) + (expiry ? ' · ' + escapeHtml(expiry) : '') + '</small></div>' +
      '<span>' + Number(row.pages || 0) + '장</span>' +
    '</div>';
  }).join('') + '</div>';
}

function sitePassAdminEquipmentDriverSubjectIdV736(item) {
  const docs = sitePassAdminEquipmentDocsV736(item, 'driver');
  for (const row of docs) {
    const id = String(row.doc.authSubjectId || row.doc.auth_subject_id || '').trim();
    if (id) return id;
  }
  return '';
}

function sitePassAdminEquipmentDetailHtmlV736(item) {
  const equipmentDocs = sitePassAdminEquipmentDocsV736(item, 'equipment');
  const driverGroups = sitePassAdminEquipmentDriverGroupsV737(item);
  const workerGroups = sitePassAdminEquipmentWorkerGroupsV737(item);

  const driverHtml = driverGroups.length
    ? driverGroups.map(function(group, index){
        return sitePassAdminEquipmentPersonGroupHtmlV737('driver', group, index);
      }).join('')
    : '<div class="empty sitepass-admin-eq-empty-v736">등록된 기사서류·인증정보가 없습니다.</div>';

  const workerHtml = workerGroups.length
    ? workerGroups.map(function(group, index){
        return sitePassAdminEquipmentPersonGroupHtmlV737('worker', group, index);
      }).join('')
    : '<div class="empty sitepass-admin-eq-empty-v736">등록된 인부서류·인증정보가 없습니다.</div>';

  return '<div class="sitepass-admin-eq-detail-v736">' +
    '<section><h4>장비 상세서류</h4>' + sitePassAdminEquipmentDocRowsHtmlV736(equipmentDocs) + '</section>' +
    '<section><h4>기사 상세서류 및 인증·약관동의</h4>' + driverHtml + '</section>' +
    '<section><h4>인부 서류 및 인증·약관동의</h4>' + workerHtml + '</section>' +
  '</div>';
}

function sitePassLoadAdminEquipmentPersonAuthV736() {
  const api = window.SitePassAdminEquipmentPersonnelApi || null;
  if (!api || typeof api.refresh !== 'function') return;
  Promise.all([
    api.refresh('driver', false),
    api.refresh('worker', false)
  ]).then(function(){
    sitePassAdminEquipmentRequestRenderV736();
  }).catch(function(){
    sitePassAdminEquipmentRequestRenderV736();
  });
}

function sitePassToggleAdminEquipmentDetailV736(code) {
  const next = String(code || '').trim();
  if (!next) return false;
  if (sitePassAdminEquipmentExpandedCodeV736 === next) {
    sitePassAdminEquipmentExpandedCodeV736 = '';
    sitePassAdminEquipmentRequestRenderV736();
    return false;
  }
  sitePassAdminEquipmentExpandedCodeV736 = next;
  sitePassAdminEquipmentRequestRenderV736();
  sitePassLoadAdminEquipmentPersonAuthV736();
  return false;
}

function sitePassRenderAdminEquipmentV578(ctx) {
  const items = Array.isArray(ctx.items) ? ctx.items : [];
  const needle = sitePassAdminEquipmentNormalizeSearchV736(sitePassAdminEquipmentSearchV736);
  const filtered = items.filter(function(item){
    return !needle || sitePassAdminEquipmentSearchHaystackV736(item).indexOf(needle) >= 0;
  });

  const pageSize = SITEPASS_ADMIN_EQUIPMENT_PAGE_SIZE_V736;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (sitePassAdminEquipmentPageV736 > totalPages) sitePassAdminEquipmentPageV736 = totalPages;
  const pageStart = (sitePassAdminEquipmentPageV736 - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  const cards = pageItems.map(function(item){
    const code = String(item && (item.code || item.equipmentNo || item.equipment_no) || '').trim();
    const equipmentNo = String(item && (item.equipmentNo || item.equipment_no || item.code) || '-').trim() || '-';
    const equipmentName = String(item && (item.equipmentName || item.equipment_name || item.name) || '장비').trim() || '장비';
    const ownerId = sitePassAdminEquipmentOwnerIdV736(item);
    const equipmentDocPages = sitePassAdminEquipmentDocTotalV736(item, 'equipment');
    const driverSummary = sitePassAdminEquipmentDriverSummaryV737(item);
    const workerSummary = sitePassAdminEquipmentWorkerSummaryV737(item);
    const expanded = sitePassAdminEquipmentExpandedCodeV736 === code;

    return '<article class="sitepass-admin-eq-card-v736">' +
      '<div class="sitepass-admin-eq-card-head-v736">' +
        '<div><strong>' + escapeHtml(equipmentName + ' / ' + equipmentNo) + '</strong><span>장비 등록정보</span></div>' +
        '<button type="button" class="' + (expanded ? 'ghost' : 'primary') + '" onclick="return sitePassToggleAdminEquipmentDetailV736(\'' + escapeJs(code) + '\')">' + (expanded ? '상세닫기' : '상세보기') + '</button>' +
      '</div>' +
      '<div class="sitepass-admin-eq-card-grid-v736">' +
        '<div><b>회원아이디</b><span>' + escapeHtml(ownerId) + '</span></div>' +
        '<div><b>장비명</b><span>' + escapeHtml(equipmentName + ' / ' + equipmentNo) + '</span></div>' +
        '<div><b>장비서류</b><span>' + equipmentDocPages + '장</span></div>' +
        '<div><b>기사</b><span>' + escapeHtml(driverSummary.name) + ' · ' + driverSummary.pages + '장</span></div>' +
        '<div><b>인부</b><span>' + workerSummary.count + '명 · ' + workerSummary.pages + '장</span></div>' +
      '</div>' +
      (expanded ? sitePassAdminEquipmentDetailHtmlV736(item) : '') +
    '</article>';
  }).join('');

  const pager = '<div class="sitepass-admin-eq-pager-v736">' +
    '<button type="button" class="ghost" onclick="return sitePassGoAdminEquipmentPageV736(' + (sitePassAdminEquipmentPageV736 - 1) + ')" ' + (sitePassAdminEquipmentPageV736 <= 1 ? 'disabled' : '') + '>이전 20대</button>' +
    '<span>' + sitePassAdminEquipmentPageV736 + ' / ' + totalPages + ' 페이지 · 검색결과 ' + filtered.length + '대</span>' +
    '<button type="button" class="ghost" onclick="return sitePassGoAdminEquipmentPageV736(' + (sitePassAdminEquipmentPageV736 + 1) + ')" ' + (sitePassAdminEquipmentPageV736 >= totalPages ? 'disabled' : '') + '>다음 20대</button>' +
  '</div>';

  return '<div class="card sitepass-admin-section-card-v578 sitepass-admin-equipment-card-list-v736" style="box-shadow:none;">' +
    '<div class="sitepass-admin-section-head-v578"><div><h3>등록관리</h3><div class="small">회원아이디·장비명·장비번호·기사·인부 이름으로 검색합니다. 기사·인부 서버 인증현황도 장비번호 기준으로 같은 카드에 통합 표시합니다.</div></div><button type="button" class="ghost" style="white-space:nowrap;" onclick="return SitePassAdminEquipmentPersonnel.refreshActive(true)">인증정보 새로고침</button></div>' +
    '<div class="sitepass-admin-eq-search-v736">' +
      '<input id="sitePassAdminEquipmentSearchV736" type="text" value="' + escapeHtml(sitePassAdminEquipmentSearchV736) + '" placeholder="회원아이디 / 장비명 / 장비번호 / 기사 / 인부 검색" onkeydown="if(event.key===\'Enter\'){event.preventDefault();sitePassApplyAdminEquipmentSearchV736();}" />' +
      '<button type="button" class="primary" onclick="return sitePassApplyAdminEquipmentSearchV736()">검색</button>' +
      '<button type="button" class="ghost" onclick="return sitePassClearAdminEquipmentSearchV736()">초기화</button>' +
    '</div>' +
    '<div class="sitepass-admin-eq-card-list-v736">' +
      (cards || '<div class="empty">검색조건에 맞는 장비가 없습니다.</div>') +
    '</div>' +
    sitePassAdminEquipmentUnlinkedAuthHtmlV737(items) +
    pager +
  '</div>';
}

function sitePassRenderAdminPaymentsV578(ctx) {
  const active = (ctx.members || []).filter(function(member){ return member && !member.withdrawn && !member.isSuperAdminVirtual; });
  const countFolder = function(folder){
    try {
      const mod = window.SitePassAdminMembers || {};
      if (typeof mod.filterAdminMembersByFolder === 'function') return active.filter(function(m){ return mod.filterAdminMembersByFolder(m, folder); }).length;
    } catch (e) {}
    return 0;
  };
  const cards = [
    ['newPay','신규결제',countFolder('newPay')],
    ['extensionPay','연장결제',countFolder('extensionPay')],
    ['refundRequest','환불요청',countFolder('refundRequest')],
    ['due','만료예정',countFolder('due')],
    ['grace14','유예14일 이상',countFolder('grace14')],
    ['suspended','정지회원',countFolder('suspended')]
  ];
  return '<div class="card sitepass-admin-section-card-v578" style="box-shadow:none;">' +
    '<div class="sitepass-admin-section-head-v578"><div><h3>결제관리</h3><div class="small">기존 회원 결제/환불 관리 기능으로 바로 연결합니다.</div></div></div>' +
    '<div class="sitepass-admin-action-grid-v578">' + cards.map(function(card){
      return '<button type="button" onclick="return sitePassOpenAdminMemberFolderV578(\'' + card[0] + '\')"><b>' + escapeHtml(card[1]) + '</b><span>' + card[2] + '명</span><small>회원관리에서 보기</small></button>';
    }).join('') + '</div>' +
  '</div>';
}

function sitePassRenderAdminShareHistoryV578() {
  if (!isSuperAdminLoggedIn()) {
    return '<div class="card sitepass-admin-section-card-v578" style="box-shadow:none;"><h3>공유기록</h3><div class="notice blue-note">현재 서버 권한은 최고관리자 전체조회만 허용되어 있습니다. 일반관리자 공유기록 범위는 권한정책 확정 전까지 열지 않습니다.</div></div>';
  }

  if (
    !sitePassAdminShareHistoryFetchedAtV91 &&
    !sitePassAdminShareHistoryErrorV91
  ) {
    return '<div class="card sitepass-admin-section-card-v578" style="box-shadow:none;">' +
      '<div class="sitepass-admin-section-head-v578"><div><h3>공유기록</h3><div class="small">Recipient V2 서버 Summary를 불러오는 중입니다.</div></div></div>' +
      '<div class="empty">공유기록 장비별 집계를 불러오는 중입니다.</div>' +
    '</div>';
  }

  if (sitePassAdminShareHistoryErrorV91) {
    return '<div class="card sitepass-admin-section-card-v578" style="box-shadow:none;">' +
      '<div class="sitepass-admin-section-head-v578"><div><h3>공유기록</h3><div class="small">불완전하거나 미분류된 이력은 표시하지 않습니다.</div></div><button type="button" class="ghost" onclick="sitePassRefreshAdminShareHistoryFullV91(true)">다시 불러오기</button></div>' +
      '<div class="empty">공유 기록을 불러오지 못했습니다. ' +
        escapeHtml(sitePassAdminShareHistoryErrorV91) +
      '</div>' +
    '</div>';
  }

  const groups =
    sitePassAdminShareSummaryGroupsV3();

  const needle = String(
    sitePassAdminShareSearchV578 || ''
  ).trim().toLowerCase();

  let equipmentGroups = groups.slice();

  if (needle) {
    equipmentGroups = equipmentGroups.filter(function(group) {
      const meta =
        group.equipmentMeta || {};

      const hay = [
        group.equipmentNo,
        group.equipmentName,
        group.equipmentId,
        meta.ownerName,
        meta.ownerLoginId,
        meta.operationStatus,
        meta.serviceStatus,
        meta.paymentStatus
      ]
        .map(function(v) {
          return String(v || '').toLowerCase();
        })
        .join(' ');

      return hay.includes(needle);
    });
  }

  equipmentGroups.sort(function(a, b) {
    const aNo = String(a.equipmentNo || a.equipmentName || '');
    const bNo = String(b.equipmentNo || b.equipmentName || '');
    return aNo.localeCompare(bNo, 'ko');
  });

  const totalEquipmentPages = Math.max(
    1,
    Math.ceil(
      equipmentGroups.length /
      SITEPASS_ADMIN_SHARE_EQUIPMENT_PAGE_SIZE_V91
    )
  );

  sitePassAdminShareEquipmentPageV91 = Math.min(
    Math.max(1, sitePassAdminShareEquipmentPageV91),
    totalEquipmentPages
  );

  const equipmentPageStart =
    (sitePassAdminShareEquipmentPageV91 - 1) *
    SITEPASS_ADMIN_SHARE_EQUIPMENT_PAGE_SIZE_V91;

  const pageEquipmentGroups = equipmentGroups.slice(
    equipmentPageStart,
    equipmentPageStart +
      SITEPASS_ADMIN_SHARE_EQUIPMENT_PAGE_SIZE_V91
  );

  const totalCounts = {
    sent:Number(sitePassAdminShareSummaryTotalsV3.sent || 0),
    opened:Number(sitePassAdminShareSummaryTotalsV3.opened || 0),
    downloaded:Number(sitePassAdminShareSummaryTotalsV3.downloaded || 0),
    printed:Number(sitePassAdminShareSummaryTotalsV3.printed || 0),
    expired:Number(sitePassAdminShareSummaryTotalsV3.expired || 0),
    revoked:Number(sitePassAdminShareSummaryTotalsV3.revoked || 0),
    unsent:Number(sitePassAdminShareSummaryTotalsV3.unsentQrExpired || 0)
  };

  const totalExcludedUnsentExpired =
    totalCounts.unsent;

  function renderCountCell(label, value) {
    return '<div class="sitepass-admin-share-count-cell-v91">' +
      '<span>' + escapeHtml(label) + '</span>' +
      '<strong>' + Number(value || 0) + '</strong>' +
    '</div>';
  }

  function renderDetailRow(row, activeFolder) {
    const eventType = sitePassAdminShareRowEventTypeV91(row);
    const tokenId = sitePassAdminShareRowTokenIdV91(row);
    const channel = sitePassAdminRecipientChannelV577(
      row && row.channel
    );
    const at = sitePassAdminRecipientEventTimeV577(
      sitePassAdminShareRowEventAtV91(row)
    );
    const creator = sitePassAdminShareRowCreatorV91(row);

    let label = sitePassAdminRecipientEventLabelV577(
      eventType
    );
    let detail = '';

    if (eventType === 'expired') {
      if (activeFolder === 'unsent') {
        label = '미전송 QR 링크 만료';
        detail =
          '실제 전송(sent) 이력이 없는 자동 QR 준비 Token';
      } else {
        label = '공유링크 만료';
        detail =
          '실제 전송 이력이 있는 Recipient 공유링크';
      }
    } else {
      const documentId = String(
        row && (
          row.documentId ||
          row.document_id
        ) ||
        ''
      ).trim();

      const fileId = String(
        row && (
          row.fileId ||
          row.file_id
        ) ||
        ''
      ).trim();

      if (documentId || fileId) {
        detail =
          (documentId
            ? '문서 ' +
              sitePassAdminShareShortIdV91(documentId)
            : '') +
          (
            documentId && fileId
              ? ' · '
              : ''
          ) +
          (fileId
            ? '파일 ' +
              sitePassAdminShareShortIdV91(fileId)
            : '');
      }
    }

    return '<div class="sitepass-admin-share-detail-row-v91">' +
      '<div><b>' + escapeHtml(label) + '</b>' +
        '<span>' + escapeHtml(
          creator +
          (channel ? ' · ' + channel : '')
        ) + '</span></div>' +
      '<div><time>' + escapeHtml(at) + '</time>' +
        '<small>Token ' +
          escapeHtml(sitePassAdminShareShortIdV91(tokenId)) +
        '</small>' +
        (detail
          ? '<small>' + escapeHtml(detail) + '</small>'
          : '') +
      '</div>' +
    '</div>';
  }

  let body = '';

  if (pageEquipmentGroups.length) {
    body = pageEquipmentGroups.map(function(group) {
      const title = [
        group.equipmentNo || '장비번호 없음',
        group.equipmentName
      ].filter(Boolean).join(' · ');

      const equipmentMeta =
        group.equipmentMeta ||
        sitePassAdminShareEquipmentMetaV91(group);

      const expanded =
        sitePassAdminShareExpandedEquipmentV91 ===
        group.key;

      const mainCount =
        Number(group.rawEventCount || 0);

      const folderDefs = [
        { key:'sent', label:'링크보냄', count:Number(group.counts.sent || 0) },
        { key:'opened', label:'열람', count:Number(group.counts.opened || 0) },
        { key:'downloaded', label:'다운로드', count:Number(group.counts.downloaded || 0) },
        { key:'printed', label:'인쇄', count:Number(group.counts.printed || 0) },
        { key:'expired', label:'공유링크 만료', count:Number(group.counts.expired || 0) },
        { key:'revoked', label:'회수', count:Number(group.counts.revoked || 0) },
        { key:'unsent', label:'미전송 QR 만료', count:Number(group.excludedUnsentExpired || 0) }
      ];

      let activeFolder =
        String(sitePassAdminShareDetailFolderV91 || '')
          .trim()
          .toLowerCase();

      if (
        !folderDefs.some(function(def) {
          return def.key === activeFolder;
        })
      ) {
        activeFolder =
          sitePassAdminShareDefaultFolderV3(group);
      }

      function renderDetailFolderV91(def) {
        const active = def.key === activeFolder;

        return '<button type="button" class="sitepass-admin-share-folder-v91 ' +
          (active ? 'active' : '') +
          '" onclick="return sitePassOpenAdminShareDetailFolderV91(\'' +
          def.key +
          '\')">' +
            '<span>' + escapeHtml(def.label) + '</span>' +
            '<strong>' + Number(def.count || 0) + '</strong>' +
          '</button>';
      }

      const activeFolderDef =
        folderDefs.find(function(def) {
          return def.key === activeFolder;
        }) || folderDefs[0];

      const detailState =
        sitePassAdminShareDetailStateV3(
          group.equipmentId,
          activeFolder
        );

      const folderRows =
        detailState && Array.isArray(detailState.rows)
          ? detailState.rows
          : [];

      const expectedFolderCount =
        Number(activeFolderDef.count || 0);

      let folderRowsHtml = '';

      if (
        detailState &&
        detailState.error
      ) {
        folderRowsHtml =
          '<div class="empty sitepass-admin-share-folder-empty-v91">' +
            '상세 이력을 불러오지 못했습니다. ' +
            escapeHtml(detailState.error) +
          '</div>';
      } else if (
        (!detailState || !detailState.fetchedAt) &&
        expectedFolderCount > 0
      ) {
        folderRowsHtml =
          '<div class="empty sitepass-admin-share-folder-empty-v91">' +
            '상세 이력을 불러오는 중입니다.' +
          '</div>';
      } else if (folderRows.length) {
        folderRowsHtml =
          folderRows.map(function(row) {
            return renderDetailRow(
              row,
              activeFolder
            );
          }).join('');
      } else {
        folderRowsHtml =
          '<div class="empty sitepass-admin-share-folder-empty-v91">' +
            escapeHtml(activeFolderDef.label) +
            ' 이력이 없습니다.' +
          '</div>';
      }

      if (
        detailState &&
        detailState.loading &&
        folderRows.length
      ) {
        folderRowsHtml +=
          '<div class="small">다음 이력을 불러오는 중입니다.</div>';
      }

      if (
        detailState &&
        !detailState.error &&
        detailState.hasMore
      ) {
        folderRowsHtml +=
          '<div class="actions" style="margin-top:10px;">' +
            '<button type="button" class="ghost" onclick="return sitePassLoadMoreAdminShareDetailV3()" ' +
              (detailState.loading ? 'disabled' : '') +
            '>다음 ' +
              SITEPASS_ADMIN_SHARE_DETAIL_PAGE_SIZE_V3 +
              '건 불러오기</button>' +
            '<span class="small">현재 ' +
              folderRows.length +
              ' / ' +
              expectedFolderCount +
              '건</span>' +
          '</div>';
      }

      const detailHtml = expanded
        ? '<div class="sitepass-admin-share-detail-v91">' +
            '<div class="sitepass-admin-share-detail-head-v91">' +
              '<b>상세 공유 이력 ' +
                mainCount +
                '건</b>' +
              '<span>7개 폴더 합계 = 서버 Summary 전체 원본 이벤트 ' +
                mainCount +
                '건</span>' +
            '</div>' +
            '<div class="sitepass-admin-share-folders-v91">' +
              folderDefs.map(renderDetailFolderV91).join('') +
            '</div>' +
            '<div class="sitepass-admin-share-folder-panel-v91">' +
              '<div class="sitepass-admin-share-folder-panel-head-v91">' +
                '<b>' +
                  escapeHtml(activeFolderDef.label) +
                  ' 이력 ' +
                  expectedFolderCount +
                  '건</b>' +
                '<span>상세는 cursor 방식으로 ' +
                  SITEPASS_ADMIN_SHARE_DETAIL_PAGE_SIZE_V3 +
                  '건씩 조회 · 현재 ' +
                  folderRows.length +
                  '건 표시</span>' +
              '</div>' +
              '<div class="sitepass-admin-share-detail-list-v91">' +
                folderRowsHtml +
              '</div>' +
            '</div>' +
          '</div>'
        : '';

      return '<section class="sitepass-admin-share-equipment-card-v91">' +
        '<div class="sitepass-admin-share-equipment-head-v91">' +
          '<div class="sitepass-admin-share-equipment-title-v91"><h4>' + escapeHtml(title) + '</h4>' +
            '<div class="sitepass-admin-share-equipment-meta-v91">' +
              '<span class="sitepass-admin-share-owner-v91">소유자 <b>' +
                escapeHtml(equipmentMeta.ownerName) +
              '</b></span>' +
              '<span class="sitepass-admin-share-operation-v91 ' +
                escapeHtml(equipmentMeta.operationClass) +
              '">' +
                escapeHtml(equipmentMeta.operationStatus) +
              '</span>' +
              '<span>서비스 ' +
                escapeHtml(equipmentMeta.serviceStatus) +
              '</span>' +
              '<span>결제 ' +
                escapeHtml(equipmentMeta.paymentStatus) +
              '</span>' +
            '</div>' +
            '<span>최근 기록 ' +
              escapeHtml(
                sitePassAdminRecipientEventTimeV577(
                  group.latestAt
                )
              ) +
            '</span></div>' +
          '<button type="button" class="ghost sitepass-admin-share-detail-button-v91" data-sitepass-share-equipment-key="' +
            escapeHtml(group.key) +
          '" onclick="return sitePassToggleAdminShareEquipmentV91(this.dataset.sitepassShareEquipmentKey)">' +
            (expanded ? '상세닫기' : '상세보기') +
          '</button>' +
        '</div>' +
        '<div class="sitepass-admin-share-count-grid-v91">' +
          renderCountCell('링크보냄', group.counts.sent) +
          renderCountCell('열람', group.counts.opened) +
          renderCountCell('다운로드', group.counts.downloaded) +
          renderCountCell('인쇄', group.counts.printed) +
          renderCountCell('공유링크 만료', group.counts.expired) +
          renderCountCell('회수', group.counts.revoked) +
          renderCountCell('미전송 QR 만료', group.excludedUnsentExpired) +
        '</div>' +
        detailHtml +
      '</section>';
    }).join('');
  } else {
    body =
      '<div class="empty">조건에 맞는 장비 공유기록이 없습니다.</div>';
  }

  return '<div class="card sitepass-admin-section-card-v578 sitepass-admin-share-history-v91" style="box-shadow:none;">' +
    '<div class="sitepass-admin-section-head-v578"><div><h3>공유기록</h3><div class="small">Recipient V2 서버 Summary · 장비별 카드 · 상세 cursor 조회 · 10,000건 offset 상한 비의존</div></div><button type="button" class="ghost" onclick="sitePassRefreshAdminShareHistoryFullV91(true)">새로고침</button></div>' +

    '<div class="sitepass-admin-share-search-v578"><input id="sitepassAdminShareSearchV578" type="text" value="' +
      escapeHtml(sitePassAdminShareSearchV578) +
      '" placeholder="장비번호 / 장비명 / 소유자명 / 소유자 아이디 검색" onkeydown="if(event.key===\'Enter\'){event.preventDefault();sitePassApplyAdminShareSearchV578();}"/><button type="button" class="primary" onclick="return sitePassApplyAdminShareSearchV578()">검색</button><button type="button" class="ghost" onclick="return sitePassClearAdminShareSearchV578()">초기화</button></div>' +

    '<div class="sitepass-admin-share-overview-v91">' +
      renderCountCell('링크보냄', totalCounts.sent) +
      renderCountCell('열람', totalCounts.opened) +
      renderCountCell('다운로드', totalCounts.downloaded) +
      renderCountCell('인쇄', totalCounts.printed) +
      renderCountCell('공유링크 만료', totalCounts.expired) +
      renderCountCell('회수', totalCounts.revoked) +
      renderCountCell('미전송 QR 만료', totalCounts.unsent) +
    '</div>' +

    '<div class="small sitepass-admin-result-count-v578">장비 ' +
      equipmentGroups.length +
      '대 / 전체 이벤트 ' +
      Number(sitePassAdminShareHistoryTotalV91 || 0) +
      '건' +
      (
        totalExcludedUnsentExpired
          ? ' · 미전송 QR 만료 ' +
            totalExcludedUnsentExpired +
            '건'
          : ''
      ) +
      ' · 원본 이벤트 자동삭제 없음' +
    '</div>' +

    '<div class="sitepass-admin-share-equipment-list-v91">' +
      body +
    '</div>' +

    '<div class="sitepass-admin-share-pager-v91">' +
      '<button type="button" class="ghost" onclick="return sitePassGoAdminShareEquipmentPageV91(' +
        (sitePassAdminShareEquipmentPageV91 - 1) +
      ')" ' +
        (sitePassAdminShareEquipmentPageV91 <= 1 ? 'disabled' : '') +
      '>이전 20대</button>' +
      '<span>' +
        sitePassAdminShareEquipmentPageV91 +
        ' / ' +
        totalEquipmentPages +
        ' 페이지 · 검색결과 ' +
        equipmentGroups.length +
        '대</span>' +
      '<button type="button" class="ghost" onclick="return sitePassGoAdminShareEquipmentPageV91(' +
        (sitePassAdminShareEquipmentPageV91 + 1) +
      ')" ' +
        (sitePassAdminShareEquipmentPageV91 >= totalEquipmentPages ? 'disabled' : '') +
      '>다음 20대</button>' +
    '</div>' +
  '</div>';
}

function sitePassRenderAdminPlaceholderV578(title, text) {
  return '<div class="card sitepass-admin-section-card-v578" style="box-shadow:none;"><h3>' + escapeHtml(title) + '</h3><div class="notice blue-note">' + escapeHtml(text) + '</div></div>';
}

function sitePassRenderAdminSectionV578(ctx) {
  if (!sitePassAdminSectionAllowedV578(sitePassAdminSectionV578)) sitePassAdminSectionV578 = 'dashboard';

  if (sitePassAdminSectionV578 === 'members') {
    const memberModV683 = window.SitePassAdminMembers || {};
    if (typeof memberModV683.renderAdminMemberManager === 'function') {
      return memberModV683.renderAdminMemberManager(ctx.members || []);
    }
    return renderAdminStaffManager(ctx.members || []);
  }
  if (sitePassAdminSectionV578 === 'equipment') {
    const equipmentPersonnelV90R2 = window.SitePassAdminEquipmentPersonnel || null;
    const equipmentHtmlV90R2 = sitePassRenderAdminEquipmentV578(ctx);
    if (
      equipmentPersonnelV90R2 &&
      typeof equipmentPersonnelV90R2.render === 'function'
    ) {
      return equipmentPersonnelV90R2.render({
        equipmentHtml: equipmentHtmlV90R2
      });
    }
    return equipmentHtmlV90R2;
  }
  if (sitePassAdminSectionV578 === 'shares') return sitePassRenderAdminShareHistoryV578();
  // SITEPASS_68_ADMIN_CUSTOMER_CENTER_NOTIFICATION_BADGE_BRIDGE_V674
  if (sitePassAdminSectionV578 === 'contacts') {
    const inquiryFrontendV668 = window.SitePassAdminInquiryV675;
    if (inquiryFrontendV668 && typeof inquiryFrontendV668.renderSection === 'function') {
      return inquiryFrontendV668.renderSection();
    }
    return renderAdminContactManager();
  }
  if (sitePassAdminSectionV578 === 'payments') return sitePassRenderAdminPaymentsV578(ctx);
  if (sitePassAdminSectionV578 === 'admins' && isSuperAdminLoggedIn()) {
    const adminModV683 = window.SitePassAdminMembers || {};
    if (typeof adminModV683.renderAdminAccountManager === 'function') {
      return '<div class="notice blue-note sitepass-admin-section-note-v578"><b>최고관리자 전용</b> · 관리자 계정만 별도로 표시합니다.</div>' + adminModV683.renderAdminAccountManager(ctx.members || []);
    }
    return '<div class="notice blue-note sitepass-admin-section-note-v578"><b>최고관리자 전용</b></div>' + renderAdminStaffManager(ctx.members || []);
  }
  if (sitePassAdminSectionV578 === 'settings' && isSuperAdminLoggedIn()) {
    return sitePassRenderAdminPlaceholderV578('시스템설정', '관리자페이지 구조만 먼저 확정했습니다. 운영 정책·환경 설정 기능은 이후 공식 단계에서 서버 권한과 함께 구현하며, 현재 정상 설정은 변경하지 않습니다.');
  }
  if (sitePassAdminSectionV578 === 'audit' && isSuperAdminLoggedIn()) {
    return sitePassRenderAdminPlaceholderV578('감사기록', '보안·권한·관리자 조작 감사 화면 자리입니다. 현재 5구간의 Recipient 공유 이벤트 기록과 별개이며, 별도 감사정책을 확정한 뒤 연결합니다.');
  }
  if (sitePassAdminSectionV578 === 'push') {
    return '<div id="sitepassPushPanelHostV683" aria-live="polite"></div>';
  }
  if (sitePassAdminSectionV578 === 'errors') {
    return '';
  }

  if (sitePassAdminSectionV578 === 'dashboard') {
    const dashboardPageV727 = window.SitePassAdminDashboardPage || null;
    if (
      dashboardPageV727 &&
      typeof dashboardPageV727.render === 'function'
    ) {
      return dashboardPageV727.render(ctx.dashboardLocal || {});
    }
    return sitePassRenderAdminPlaceholderV578(
      '대시보드',
      '대시보드 모듈 연결을 확인할 수 없습니다.'
    );
  }

  return '';
}
function requestAdminRender487(delay) {
      clearTimeout(sitePassAdminRenderTimer487);
      sitePassAdminRenderTimer487 = setTimeout(function(){
        try { renderAdmin(); } catch (e) { console.warn('관리자 화면 안정화 렌더 실패:', e); }
      }, Number(delay || 90));
    }
window.sitePassRequestAdminRender487 = requestAdminRender487;
function renderAdmin() {
      if (sitePassAdminRenderBusy488) return;
      if (!isAdminLoggedIn()) { showScreen('signupScreen'); return; }
      sitePassAdminRenderBusy488 = true;
      try {
      try { sitePassEnsureAdminInquiryNotificationLinkV675(); } catch (e) {}

      const isDashboardV727 =
        sitePassAdminSectionV578 === 'dashboard';

      let adminContextV578 = {};

      if (isDashboardV727) {
        // STEP88: 대시보드는 장비/문의/공유 원본목록을 준비하지 않는다.
        // 기존 local 방문자/문의대기 숫자는 의미 변경 없이 유지한다.
        // 오늘 가입은 숫자 전용 서버 RPC 결과만 사용하며 회원 로컬 데이터를 보정/저장하지 않는다.
        const visitStatsV727 = getVisitStats();
        const todayKeyV727 = getLocalDateKey();
        const contactsV727 = getContacts();
        adminContextV578 = {
          dashboardLocal: {
            todayVisitors:
              Number((visitStatsV727.daily || {})[todayKeyV727] || 0),
            totalVisitors:
              Number(visitStatsV727.total || 0),
            waitingContacts:
              contactsV727.filter(x => x.status !== '답변완료').length
          }
        };
      } else {
        // 기존 비대시보드 관리자 기능은 v726 흐름을 그대로 유지한다.
        if (!sitePassEquipmentSyncing && (!sitePassEquipmentSyncedAt || Date.now() - sitePassEquipmentSyncedAt > 30000)) {
          try { syncSupabaseEquipmentItems(true); } catch (e) {}
        }
        const items = getAdminVisibleEquipmentItems();
        const members = ensureMemberIds();
        let rawEquipmentItems = getItems();
        try {
          if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') rawEquipmentItems = window.SitePassArchive.filterArchiveVisibleItems(rawEquipmentItems);
        } catch (e) {}
        const rawEquipmentCount = rawEquipmentItems.length;
        const total = items.length;
        const paused = items.filter(isQrPaused).length;
        const expiringDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료임박').length, 0);
        const expiredDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료').length, 0);
        const paymentDue = items.filter(item => {
          if (!item.trialEndsAt || item.serviceStatus === '유료사용') return false;
          const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 7;
        }).length;
        const grace14Items = items.filter(isServiceGrace14Over).length;
        const contacts = getContacts();
        const waitingContacts = contacts.filter(x => x.status !== '답변완료').length;
        const visitStats = getVisitStats();
        const todayKey = getLocalDateKey();
        const todayVisitors = Number((visitStats.daily || {})[todayKey] || 0);
        const totalVisitors = Number(visitStats.total || 0);
        const todaySignups = countTodaySignups(members);
        const totalEquipmentCount = total;
        const topSummary = '<div class="card" style="box-shadow:none;margin-top:12px;">' +
          '<h3>관리자 요약 현황</h3>' +
          '<div class="small">장비 서버동기화: ' + escapeHtml(sitePassEquipmentSyncMessage || (sitePassEquipmentSyncedAt ? '마지막 확인 ' + formatNullableDateTime(new Date(sitePassEquipmentSyncedAt).toISOString()) : '대기 중')) + ' · 원본장비 ' + rawEquipmentCount + '대 / 활성회원 연결장비 ' + totalEquipmentCount + '대</div>' +
          '<div class="actions" style="margin:8px 0 4px;"><button type="button" class="ghost" onclick="cleanupOrphanEquipmentForAdmin()">장비/큐알 정리</button></div>' +
          '<div class="admin-summary-rows">' +
            '<div class="admin-summary-row">' +
              '<div class="line"><b>오늘방문자수</b><span>' + todayVisitors + '명</span></div>' +
              '<div class="line"><b>토탈방문자수</b><span>' + totalVisitors + '명</span></div>' +
            '</div>' +
            '<div class="admin-summary-row">' +
              '<div class="line"><b>오늘가입자수</b><span>' + todaySignups + '명</span></div>' +
              renderAdminQuickLine('전체장비등록수', totalEquipmentCount + '대', 'openAdminListQuickFilter(\'all\')') +
            '</div>' +
          '</div>' +
        '</div>';
        adminContextV578 = {
          items,
          members,
          total,
          paused,
          expiringDocs,
          expiredDocs,
          paymentDue,
          grace14Items,
          waitingContacts,
          topSummary
        };
      }

      const adminBaseHtml488 =
        '<div class="sitepass-admin-shell-v578">' +
          '<div class="notice blue-note sitepass-admin-role-note-v578"><b>현재 권한: ' + escapeHtml(getCurrentAdminRoleName()) + '</b><br>' + (isSuperAdminLoggedIn() ? '최고관리자는 전체 관리 메뉴와 최고관리자 전용 메뉴를 사용할 수 있습니다.' : '일반관리자는 허용된 관리 메뉴만 표시되며 최고관리자 전용 기능은 서버에서도 차단됩니다.') + '</div>' +
          sitePassRenderAdminTopNavV578() +
          '<div class="sitepass-admin-content-v578">' + sitePassRenderAdminSectionV578(adminContextV578) + '</div>' +
        '</div>';
      const adminBox488 = document.getElementById('adminBox');
      if (adminBox488 && (sitePassAdminLastBaseHtml488 !== adminBaseHtml488 || !adminBox488.innerHTML.trim())) {
        sitePassAdminLastBaseHtml488 = adminBaseHtml488;
        adminBox488.innerHTML = adminBaseHtml488;
      }
      try { sitePassSyncAdminErrorMonitorVisibilityV682(); } catch (e) {}

      setTimeout(function(){
        try {
          if (window.SitePassPushNotify && typeof window.SitePassPushNotify.refreshPanel === 'function') {
            window.SitePassPushNotify.refreshPanel();
          }
        } catch (e) {}
      }, 30);

      if (isDashboardV727) {
        setTimeout(function(){
          try {
            if (
              window.SitePassAdminDashboardPage &&
              typeof window.SitePassAdminDashboardPage.refresh === 'function'
            ) {
              window.SitePassAdminDashboardPage.refresh(false);
            }
          } catch (e) {}
        }, 60);
      } else {
        // 기존 최근 history prefetch는 다른 비대시보드 화면에서 보존한다.
        // 공유기록 화면에서는 R9P 서버 Summary + 상세 cursor 조회를 사용한다.
        setTimeout(function(){
          try {
            if (
              sitePassAdminSectionV578 === 'shares' &&
              isSuperAdminLoggedIn()
            ) {
              refreshAdminShareHistoryFullV91(false);
            } else {
              refreshAdminRecipientShareEventsV577(false);
            }
          } catch (e) {}
        }, 60);
      }
      } finally {
        sitePassAdminRenderBusy488 = false;
      }
    }

    function deleteItem(code) {
      const archive = getArchiveModule();
      if (archive.deleteItem) return archive.deleteItem(code);
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function clearAll() {
      const archive = getArchiveModule();
      if (archive.clearAll) return archive.clearAll();
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function getDocStatus(doc) {
      if (!doc.fileName) return doc.required ? '미첨부' : '선택안함';
      const effectiveDate = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '';
      if (!doc.expiry || !effectiveDate) return '첨부됨';
      const today = new Date();
      today.setHours(0,0,0,0);
      const end = new Date(effectiveDate);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) return '만료';
      if (diff <= 30) return '만료임박';
      return '정상';
    }

    function getDdayText(dateValue) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateValue);
      const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (Number.isNaN(diff)) return '';
      if (diff < 0) return '만료 ' + Math.abs(diff) + '일 지남';
      if (diff === 0) return '오늘 만료';
      return 'D-' + diff;
    }

    function makeAlertSummary(docs) {
      // v23.7.350: 보관함/관리자 목록에 장비가 아닌 인부/기사 전용 항목이나
      // 저장공간 부족으로 docs가 축약된 항목이 섞여도 화면 렌더링이 멈추지 않게 방어합니다.
      docs = (docs && typeof docs === 'object') ? docs : {};
      const targets = ['equipmentInspection','insurancePolicy','ndtInspection','driverLicense','driverMachinerySafetyTraining'];
      const parts = targets
        .map(key => docs && docs[key])
        .filter(Boolean)
        .map(doc => ({ doc, expireDate:(window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '' }))
        .filter(row => !!row.expireDate)
        .map(row => (row.doc.title || '서류') + ' ' + getDdayText(row.expireDate));
      return parts.length ? parts.join(' / ') : '만료날짜 입력 없음';
    }

    function openPreviewModal(src) {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (frame) frame.src = '';
      modal.classList.remove('pdf');
      img.src = src;
      modal.classList.add('show');
    }

    function openPdfPreview(src) {
      if (!src) {
        alert('PDF 미리보기 파일이 없습니다. 파일선택으로 다시 첨부하면 바로 미리볼 수 있습니다.');
        return;
      }
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (img) img.src = '';
      if (frame) frame.src = src;
      modal.classList.add('pdf');
      modal.classList.add('show');
    }

    function closePreviewModal() {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      modal.classList.remove('show');
      modal.classList.remove('pdf');
      img.src = '';
      if (frame) frame.src = '';
    }

// ---- merged from app-admin-boot-12.js ----
// SitePass v23.7.350 - app-admin-boot finer split (12/14)
function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function escapeJs(value) {
      return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
    }

    function getActiveInstallGuidePanel() {
      const panels = Array.from(document.querySelectorAll('[data-install-manual-guide]'));
      return panels.find(panel => {
        const screen = panel.closest('.screen');
        return screen && !screen.classList.contains('hidden');
      }) || panels[0] || null;
    }

    function setHomeInstallStatus(message) {
      document.querySelectorAll('[data-install-status]').forEach(status => { status.innerHTML = message; });
    }

    function isHomeInstallGuidePanelOpen() {
      const guide = getActiveInstallGuidePanel();
      return !!(guide && !guide.classList.contains('hidden'));
    }

    function openHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (message) setHomeInstallStatus(message);
      if (guide) {
        guide.classList.remove('hidden');
        updateHomeInstallButtonState();
        try { guide.scrollIntoView({ behavior:'smooth', block:'center' }); } catch (e) {}
      }
    }

    function closeHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (guide) guide.classList.add('hidden');
      if (message) setHomeInstallStatus(message);
      updateHomeInstallButtonState();
    }

    function isSitePassStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function getSitePassInstallFallbackMessage() {
      const ua = navigator.userAgent || '';
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isKakao = /KAKAOTALK/i.test(ua);
      const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';

      if (isSitePassStandalone()) {
        return '이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.';
      }
      if (location.protocol === 'file:') {
        return '현재는 PC에서 파일을 직접 연 상태라 설치창이 뜨지 않습니다. 정식 https 주소에 올린 뒤 <b>바탕화면에 설치하기</b> 버튼을 확인해야 합니다.';
      }
      if (!isSecure) {
        return '설치창을 띄우려면 https 보안주소가 필요합니다. 정식 도메인 또는 HTTPS 베타 주소에서 다시 눌러주세요.';
      }
      if (isKakao) {
        return '카카오톡 안에서는 설치창이 잘 안 뜰 수 있습니다. 먼저 <b>외부 브라우저로 열기</b>를 누른 뒤 설치해주세요.';
      }
      if (isIOS) {
        return '아이폰은 버튼 한 번으로 설치창을 강제로 열 수 없습니다. 공유 버튼(□↑)에서 <b>홈 화면에 추가</b>를 눌러 저장합니다.';
      }
      return '브라우저가 아직 설치 가능 신호를 보내지 않았습니다. 20~30초 정도 사용 후 다시 누르거나, 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러주세요.';
    }

    function updateHomeInstallButtonState(message) {
      const buttons = Array.from(document.querySelectorAll('[data-install-primary-button]'));
      buttons.forEach(btn => {
        if (isSitePassStandalone()) {
          btn.textContent = '이미 설치됨';
          btn.disabled = true;
        } else if (isHomeInstallGuidePanelOpen()) {
          btn.textContent = '설치 안내 접기';
          btn.disabled = false;
        } else if (deferredSitePassInstallPrompt) {
          btn.textContent = '바탕화면에 설치하기';
          btn.disabled = false;
        } else {
          btn.textContent = '바탕화면에 설치하기';
          btn.disabled = false;
        }
      });
      if (message) setHomeInstallStatus(message);
    }

    async function addSitePassToHomeScreen(event) {
      if (event && event.preventDefault) event.preventDefault();

      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다. 필요하면 다시 <b>바탕화면에 설치하기</b>를 눌러주세요.');
        return false;
      }

      if (isSitePassStandalone()) {
        openHomeInstallGuidePanel('이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.');
        updateHomeInstallButtonState();
        return false;
      }

      if (deferredSitePassInstallPrompt) {
        try {
          deferredSitePassInstallPrompt.prompt();
          const choice = await deferredSitePassInstallPrompt.userChoice;
          deferredSitePassInstallPrompt = null;
          if (choice && choice.outcome === 'accepted') {
            closeHomeInstallGuidePanel('홈화면 추가가 진행되었습니다. 설치가 끝나면 현장서류패스 아이콘으로 들어오면 됩니다.');
          } else {
            openHomeInstallGuidePanel('설치창을 닫았습니다. 필요하면 아래 방법으로 직접 추가할 수 있습니다.');
          }
          updateHomeInstallButtonState();
        } catch (e) {
          deferredSitePassInstallPrompt = null;
          openHomeInstallGuidePanel('이 브라우저에서는 자동 설치창이 뜨지 않아 아래 방법으로 직접 추가하면 됩니다.');
          updateHomeInstallButtonState();
        }
        return false;
      }

      openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      return false;
    }

    function showHomeInstallGuide(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다.');
      } else {
        openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      }
      return false;
    }


    const SITEPASS_RECOMMEND_INSTALL_URL = 'https://sitepass.co.kr/recommend.html';

    function getSitePassQueryParam(name) {
      try { return new URLSearchParams(location.search || '').get(name) || ''; } catch (e) { return ''; }
    }

    function isSitePassRecommendInstallRequest() {
      const install = getSitePassQueryParam('install');
      const ref = getSitePassQueryParam('ref') || getSitePassQueryParam('from');
      return install === '1' || install === 'home' || install === 'app' || ref === 'recommend' || ref === 'invite';
    }

    function copyRecommendInstallLink() {
      copyTextFallback(SITEPASS_RECOMMEND_INSTALL_URL, '추천용 설치 링크를 복사했습니다.\n카카오톡/문자로 보내면 받은 사람이 설치화면으로 바로 들어옵니다.');
    }

    function openRecommendInstallLanding() {
      if (!isSitePassRecommendInstallRequest()) return false;
      if (isSitePassStandalone()) return false;
      showScreen('installScreen', { replace:true });
      const linkText = document.getElementById('recommendInstallLinkText');
      if (linkText) linkText.textContent = SITEPASS_RECOMMEND_INSTALL_URL;
      setHomeInstallStatus('추천링크로 접속했습니다. 아래 <b>바탕화면에 설치하기</b>를 누르면 설치 가능한 브라우저는 설치창이 열리고, 안 뜨면 수동 방법을 따라 추가하면 됩니다.');
      setTimeout(function() {
        if (!deferredSitePassInstallPrompt && !isSitePassStandalone()) {
          openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
        } else {
          updateHomeInstallButtonState('설치 준비가 완료되면 <b>바탕화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
        }
      }, 900);
      return true;
    }

    // v23.7.259: PWA 자동업데이트/서비스워커 등록은 assets/js/pwa-update.js로 분리했습니다.
    const SITEPASS_APP_VERSION = (window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.appVersion) || 'v23.7.282';
    const SITEPASS_FIXED_APP_URL = 'https://sitepass.co.kr/';

    window.SitePassPwaRuntime = window.SitePassPwaRuntime || {};
    Object.assign(window.SitePassPwaRuntime, {
      getAppVersion: function(){ return SITEPASS_APP_VERSION; },
      getFixedAppUrl: function(){ return SITEPASS_FIXED_APP_URL; },
      setHomeInstallStatus: function(message){ return setHomeInstallStatus(message); },
      isStandalone: function(){ return isSitePassStandalone(); },
      hasDeferredInstallPrompt: function(){ return !!deferredSitePassInstallPrompt; }
    });

    function getPwaUpdateModule() {
      return window.SitePassPwaUpdate || {};
    }

    async function checkSitePassAutoUpdate() {
      const mod = getPwaUpdateModule();
      if (mod.checkAutoUpdate) return mod.checkAutoUpdate();
    }

    function registerSitePassServiceWorker() {
      const mod = getPwaUpdateModule();
      if (mod.registerServiceWorker) return mod.registerServiceWorker();
      setHomeInstallStatus('PWA 업데이트 파일을 불러오지 못했습니다. assets/js/pwa-update.js 업로드를 확인해주세요.');
    }

    window.forceSitePassUpdateReload = function() {
      const mod = getPwaUpdateModule();
      if (mod.forceUpdateReload) return mod.forceUpdateReload(SITEPASS_APP_VERSION);
      location.reload();
    };

    window.addEventListener('load', function() {
      setTimeout(checkSitePassAutoUpdate, 600);
      setTimeout(openRecommendInstallLanding, 1100);
    });

    const DEMO_MANAGER_CODE = 'SP-DEMO-00BO0000';

    function makeDemoPreviewDataUrl(title, line1, line2) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1260" viewBox="0 0 900 1260">' +
        '<rect width="900" height="1260" fill="#ffffff"/>' +
        '<rect x="55" y="55" width="790" height="1150" rx="28" fill="#f8fbff" stroke="#c9d3e4" stroke-width="5"/>' +
        '<text x="450" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="#172033">' + escapeHtml(title) + '</text>' +
        '<rect x="125" y="220" width="650" height="4" fill="#2457d6"/>' +
        '<text x="130" y="320" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#26334d">' + escapeHtml(line1) + '</text>' +
        '<text x="130" y="395" font-family="Arial, sans-serif" font-size="34" fill="#667085">' + escapeHtml(line2) + '</text>' +
        '<text x="130" y="500" font-family="Arial, sans-serif" font-size="30" fill="#667085">SitePass 담당자 화면 데모용 미리보기입니다.</text>' +
        '<rect x="130" y="575" width="640" height="420" rx="18" fill="#ffffff" stroke="#d7dfed" stroke-width="4"/>' +
        '<text x="450" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#173f9f">첨부 서류 이미지</text>' +
        '<text x="450" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#667085">실제 서비스에서는 촬영/업로드 원본이 표시됩니다.</text>' +
        '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

// ---- merged from app-admin-boot-13.js ----
// SitePass v23.7.350 - app-admin-boot finer split (13/14)
function makeDemoDoc(key, groupKey, groupTitle, title, required, expiry, expireDate, fileName, index) {
      const preview = makeDemoPreviewDataUrl(title, '장비: 굴착기 / 00보0000', expireDate ? ('만료일: ' + expireDate) : '유효기간 확인용 서류');
      const doc = {
        key, groupKey, groupTitle, title, required:!!required, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:preview, originalDataUrl:preview, correctedDataUrl:preview, previewChoice:'preview', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'demo',
        fileType:'image/png',
        previewDataUrl:preview,
        originalDataUrl:preview,
        correctedDataUrl:preview,
        previewChoice:'preview',
        autoFit:'demo',
        driverPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        personPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        workerPhone:'',
        workerTask:'',
        authVerified:true,
        authVerifiedAt:new Date().toISOString()
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function ensureManagerDemoItem() {
      const nowIso = new Date().toISOString();
      const expireIso = addDaysIso(nowIso, 7);
      const demoDocs = {
        businessLicense: makeDemoDoc('businessLicense','equipment','장비서류','사업자등록증',true,false,'','굴착기_00보0000_사업자등록증.png'),
        equipmentRegistration: makeDemoDoc('equipmentRegistration','equipment','장비서류','장비등록증',true,false,'','굴착기_00보0000_장비등록증.png'),
        equipmentInspection: makeDemoDoc('equipmentInspection','equipment','장비서류','장비검사증',true,true,formatDateOnly(addDaysIso(nowIso, 120)),'굴착기_00보0000_장비검사증.png'),
        insurancePolicy: makeDemoDoc('insurancePolicy','equipment','장비서류','장비보험증권',true,true,formatDateOnly(addDaysIso(nowIso, 80)),'굴착기_00보0000_장비보험증권.png'),
        specSheet: makeDemoDoc('specSheet','equipment','장비서류','장비제원표',false,false,'','굴착기_00보0000_장비제원표.png'),
        driverIdCard: makeDemoDoc('driverIdCard','driver','장비기사서류','기사 신분증',true,false,'','굴착기_00보0000_기사신분증.png'),
        driverLicense: makeDemoDoc('driverLicense','driver','장비기사서류','기사면허증',true,false,'','굴착기_00보0000_기사면허증.png'),
        driverBasicSafetyTraining: makeDemoDoc('driverBasicSafetyTraining','driver','장비기사서류','기사 건설기초안전보건교육 이수증',true,false,'','굴착기_00보0000_기사기초안전교육.png')
      };
      const owner = getAdminSampleEquipmentOwner();
      const item = {
        code:DEMO_MANAGER_CODE,
        type:'BUNDLE',
        equipmentNo:'00보0000',
        equipmentName:'굴착기',
        ownerMemberId:owner.id,
        ownerSignupId:owner.signupId,
        ownerProviderId:owner.providerId,
        ownerName:owner.name,
        ownerPhone:owner.phone,
        bundleMeta:{ unit:'장비등록 1건', includedGroups:['equipment','driver'], includedGroupNames:['장비서류','장비기사서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:'실사용 베타 운영 중입니다' },
        workerPeople:[],
        qrLink:makeQrLink(DEMO_MANAGER_CODE),
        docs:demoDocs,
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:addDaysIso(nowIso, TRIAL_DAYS),
        serviceStatus:'실사용베타',
        paymentPlan:'trial',
        basicPlan:'실사용 베타 운영 중입니다',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:expireIso,
        demo:true
      };
      const items = getItems();
      const idx = items.findIndex(x => x.code === DEMO_MANAGER_CODE);
      if (idx >= 0) items[idx] = { ...items[idx], ...item };
      else items.unshift(item);
      setItems(items);
      return item;
    }



    const PAYMENT_TEST_MEMBER_PREFIX = 'MEM-PAYTEST-';
    const PAYMENT_TEST_CODE_PREFIX = 'SP-PAYTEST-';

    function isPaymentTestMember(member) {
      return String(member?.id || '').startsWith(PAYMENT_TEST_MEMBER_PREFIX) || member?.paymentConversionTest === true;
    }

    function isPaymentTestItem(item) {
      return String(item?.code || '').startsWith(PAYMENT_TEST_CODE_PREFIX) || item?.paymentConversionTest === true;
    }

    function getPaymentConversionTestStats(items, members) {
      const testItems = (items || getItems()).filter(isPaymentTestItem);
      const testMembers = (members || getMembers()).filter(isPaymentTestMember);
      const paidItems = testItems.filter(item => !isServiceShareBlocked(item)).length;
      const blockedItems = testItems.filter(item => isServiceShareBlocked(item)).length;
      const unpaidItems = testItems.filter(item => item.paymentTestPaid !== true).length;
      return { testMembers:testMembers.length, testItems:testItems.length, paidItems, blockedItems, unpaidItems };
    }

    function renderPaymentConversionTestPanel(items, members) {
      // 운영 화면에서는 유료전환 차단검사 및 임시 테스트 칸을 표시하지 않습니다.
      return '';
    }

    function makePaymentTestMember(index, paid) {
      const padded = String(index).padStart(2, '0');
      const nowIso = new Date().toISOString();
      const futureEnd = addDaysIso(nowIso, 365);
      const trialEnd = addDaysIso(nowIso, 7);
      return {
        id:PAYMENT_TEST_MEMBER_PREFIX + padded,
        name:'임시 회원' + padded,
        phone:'010-77' + String(1000 + index).slice(-4) + '-' + String(2000 + index).slice(-4),
        signupId:'paytest' + padded,
        provider:'SitePass',
        providerId:'SITEPASS-paytest' + padded,
        signupMethod:'SitePass 베타가입',
        status:paid ? '일반 연간이용권' : '실사용베타',
        paymentPlanLabel:paid ? '일반 연간이용권' : '실사용베타',
        memberPlan:paid ? '일반 연간이용권' : '실사용베타',
        paymentStartedAt:nowIso,
        paymentEndsAt:paid ? futureEnd : trialEnd,
        paymentStatus:paid ? '신규결제완료' : '베타사용중',
        createdAt:nowIso,
        lastLoginAt:nowIso,
        lastLoginMethod:'SitePass 베타가입',
        adminMemo:'유료전환 차단 확인용 임시 회원입니다.',
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    function makePaymentTestDoc(key, title, expiry, expireDate, equipmentName, equipmentNo) {
      const fileName = equipmentName + '_' + equipmentNo + '_' + title + '.png';
      const doc = {
        key, groupKey:'equipment', groupTitle:'장비서류', title, required:true, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:'', originalDataUrl:'', correctedDataUrl:'', previewChoice:'', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'payment-test',
        fileType:'image/png',
        previewDataUrl:'',
        originalDataUrl:'',
        correctedDataUrl:'',
        previewChoice:'',
        autoFit:'payment-test-light',
        storageLight:true
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function makePaymentTestItem(member, memberIndex, equipmentIndex, paid) {
      const nowIso = new Date().toISOString();
      const equipmentNo = String(10 + memberIndex).padStart(2, '0') + '보' + String(1000 + equipmentIndex).slice(-4);
      const equipmentName = equipmentIndex % 3 === 0 ? '지게차' : (equipmentIndex % 2 === 0 ? '덤프트럭' : '굴착기');
      const code = PAYMENT_TEST_CODE_PREFIX + String(equipmentIndex).padStart(3, '0');
      const trialEnd = addDaysIso(nowIso, 7);
      const paidEnd = addDaysIso(nowIso, 365);
      return {
        code,
        type:'BUNDLE',
        equipmentNo,
        equipmentName,
        ownerMemberId:member.id,
        ownerSignupId:member.signupId,
        ownerProviderId:member.providerId,
        ownerName:member.name,
        ownerPhone:member.phone,
        bundleMeta:{ unit:'장비등록 1건', includedGroups:['equipment'], includedGroupNames:['장비서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:paid ? '일반 연간이용권 결제완료' : '실사용베타 후 미결제 예정' },
        workerPeople:[],
        qrLink:makeQrLink(code),
        docs:{
          businessLicense:makePaymentTestDoc('businessLicense','사업자등록증',false,'',equipmentName,equipmentNo),
          equipmentRegistration:makePaymentTestDoc('equipmentRegistration','장비등록증',false,'',equipmentName,equipmentNo),
          equipmentInspection:makePaymentTestDoc('equipmentInspection','장비검사증',true,formatDateOnly(addDaysIso(nowIso, 90)),equipmentName,equipmentNo),
          insurancePolicy:makePaymentTestDoc('insurancePolicy','장비보험증권',true,formatDateOnly(addDaysIso(nowIso, 60)),equipmentName,equipmentNo)
        },
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:paid ? paidEnd : trialEnd,
        serviceStatus:paid ? '유료사용' : '실사용베타',
        paymentPlan:paid ? 'annual' : 'trial',
        basicPlan:paid ? '일반 연간결제 · 연 30,000원' : '실사용베타 후 결제대기',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        paidAt:paid ? nowIso : '',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:addDaysIso(nowIso, 7),
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    async function syncPaymentTestMembersToSupabase(testMembers) {
      if (!window.sitepassSupabase || !Array.isArray(testMembers) || !testMembers.length) {
        return { ok:false, total:0, saved:0, failed:0, skipped:!window.sitepassSupabase };
      }
      let saved = 0;
      let failed = 0;
      for (const member of testMembers) {
        try {
          await saveMemberToSupabase(member);
          saved += 1;
        } catch (error) {
          failed += 1;
          console.warn('임시 회원 Supabase 저장 실패:', member && member.signupId, error);
        }
      }
      return { ok:failed === 0, total:testMembers.length, saved, failed, skipped:false };
    }

    async function deletePaymentTestMembersFromSupabase() {
      if (!window.sitepassSupabase) return { ok:false, deleted:0, skipped:true };
      try {
        const { error } = await window.sitepassSupabase
          .from('sitepass_members')
          .delete()
          .like('login_id', 'paytest%');
        if (error) {
          console.warn('Supabase 임시 회원 삭제 실패:', error.message);
          return { ok:false, deleted:0, skipped:false };
        }
        console.log('Supabase 임시 회원 삭제 완료: paytest%');
        return { ok:true, deleted:50, skipped:false };
      } catch (error) {
        console.warn('Supabase 임시 회원 삭제 예외:', error);
        return { ok:false, deleted:0, skipped:false };
      }
    }

    async function createPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 생성은 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 생성할까요?\n\n기존 임시 데이터는 지우고 다시 만듭니다. 실제 회원/장비는 유지됩니다.')) return;
      const nowIso = new Date().toISOString();
      const existingMembers = getMembers().filter(member => !isPaymentTestMember(member));
      const existingItems = getItems().filter(item => !isPaymentTestItem(item));
      const testMembers = [];
      const testItems = [];
      for (let i = 1; i <= 50; i++) {
        const paid = i <= 20;
        const member = makePaymentTestMember(i, paid);
        testMembers.push(member);
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 1, paid));
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 2, paid));
      }
      const nextMembers = testMembers.concat(existingMembers);
      const nextItems = testItems.concat(existingItems);
      const savedItems = setItems(nextItems);
      if (!savedItems) {
        alert('임시 장비 100대 저장에 실패했습니다.\n\n브라우저 임시 저장공간이 부족하거나 기존 사진 데이터가 너무 큽니다. 기존 임시 데이터/큰 사진 서류를 삭제한 뒤 다시 시도해주세요.\n회원만 생성되고 장비가 0대로 보이는 오류를 막기 위해 이번 생성은 중단했습니다.');
        renderAdmin();
        return;
      }
      try {
        setMembers(nextMembers);
      } catch (error) {
        setItems(existingItems);
        alert('임시 회원 50명 저장에 실패했습니다.\n\n브라우저 저장공간을 비운 뒤 다시 시도해주세요. 장비 데이터는 이전 상태로 되돌렸습니다.');
        renderAdmin();
        return;
      }

      const supabaseResult = await syncPaymentTestMembersToSupabase(testMembers);
      const supabaseMessage = supabaseResult.skipped
        ? '\n\nSupabase 연결이 없어 브라우저에만 저장되었습니다.'
        : '\n\nSupabase sitepass_members 저장: ' + supabaseResult.saved + '명' + (supabaseResult.failed ? ' / 실패 ' + supabaseResult.failed + '명' : '');

      alert('임시 데이터 생성 완료\n\n회원 50명 / 장비 100대\n- 결제완료 회원 20명, 장비 40대\n- 실사용베타 회원 30명, 장비 60대' + supabaseMessage + '\n\n다음으로 [베타기간 강제 종료]를 누르면 미결제 장비 60대가 QR 차단 대상이 됩니다.');
      renderAdmin();
    }

// ---- merged from app-admin-boot-14.js ----
// SitePass v23.7.350 - app-admin-boot finer split (14/14)
function expireUnpaidPaymentTestData() {
      if (!isSuperAdminLoggedIn()) { alert('베타기간 종료 처리는 최고관리자만 가능합니다.'); return; }
      const items = getItems();
      const members = getMembers();
      const unpaidItems = items.filter(item => isPaymentTestItem(item) && item.paymentTestPaid !== true);
      if (!unpaidItems.length) { alert('강제 종료할 미결제 임시 장비가 없습니다. 먼저 임시 데이터를 생성해주세요.'); return; }
      const yesterday = addDaysIso(new Date().toISOString(), -1);
      const grace15 = addDaysIso(new Date().toISOString(), -15);
      const unpaidMemberIds = new Set();
      items.forEach(item => {
        if (isPaymentTestItem(item) && item.paymentTestPaid !== true) {
          const seq = Number(String(item.code || '').replace(PAYMENT_TEST_CODE_PREFIX, '')) || 0;
          item.trialEndsAt = seq > 80 ? grace15 : yesterday;
          item.serviceStatus = seq > 80 ? '유예14일경과' : '실사용베타만료';
          item.updatedAt = new Date().toISOString();
          item.managerExpireAt = yesterday;
          unpaidMemberIds.add(item.ownerMemberId);
        }
      });
      members.forEach(member => {
        if (isPaymentTestMember(member) && member.paymentTestPaid !== true) {
          const idx = Number(String(member.id || '').replace(PAYMENT_TEST_MEMBER_PREFIX, '')) || 0;
          member.status = idx > 40 ? '정지' : '미결제';
          member.paymentPlanLabel = '미결제';
          member.memberPlan = '미결제';
          member.paymentStatus = '베타종료 미결제';
          member.paymentEndsAt = idx > 40 ? grace15 : yesterday;
          member.updatedAt = new Date().toISOString();
        }
      });
      setItems(items);
      setMembers(members);
      alert('베타기간 강제 종료 완료\n\n미결제 임시 장비 60대가 QR 차단 대상입니다.\n그중 뒤쪽 20대는 유예 14일 이상으로 잡히게 했습니다.\n\n이제 [QR 차단검사]를 눌러 확인하세요.');
      renderAdmin();
    }

    function runPaymentConversionShareBlockTest() {
      const stats = getPaymentConversionTestStats();
      if (!stats.testItems) { alert('임시 데이터가 없습니다. 먼저 임시 50명 / 장비 100대를 생성해주세요.'); return; }
      const testItems = getItems().filter(isPaymentTestItem);
      const blocked = testItems.filter(item => isServiceShareBlocked(item));
      const allowed = testItems.filter(item => !isServiceShareBlocked(item));
      const expiredUnpaid = testItems.filter(item => item.paymentTestPaid !== true && item.trialEndsAt && new Date(item.trialEndsAt).getTime() < Date.now());
      if (!expiredUnpaid.length) { alert('아직 베타기간이 끝난 미결제 장비가 없습니다.\n먼저 [베타기간 강제 종료]를 눌러주세요.'); return; }
      const failed = expiredUnpaid.filter(item => !isServiceShareBlocked(item));
      const paidBlocked = testItems.filter(item => item.paymentTestPaid === true && isServiceShareBlocked(item));
      const resultOk = failed.length === 0 && paidBlocked.length === 0;
      alert('QR 차단검사 결과\n\n총 임시 장비: ' + testItems.length + '대\nQR 가능: ' + allowed.length + '대\nQR 차단: ' + blocked.length + '대\n베타종료 미결제 장비: ' + expiredUnpaid.length + '대\n\n베타종료 미결제인데 보내지는 오류: ' + failed.length + '대\n결제했는데 막히는 오류: ' + paidBlocked.length + '대\n\n' + (resultOk ? '정상입니다. 베타기간이 끝난 미결제 장비는 QR 보내기/링크열람이 차단됩니다.' : '오류가 있습니다. 위 숫자를 확인해야 합니다.'));
    }

    async function clearPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 삭제는 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 삭제할까요?\n실제 회원/장비는 유지됩니다.')) return;
      setMembers(getMembers().filter(member => !isPaymentTestMember(member)));
      setItems(getItems().filter(item => !isPaymentTestItem(item)));
      const supabaseResult = await deletePaymentTestMembersFromSupabase();
      const supabaseMessage = supabaseResult.skipped ? '\nSupabase 연결이 없어 브라우저 임시 데이터만 삭제했습니다.' : '\nSupabase sitepass_members의 paytest 임시 회원도 삭제 처리했습니다.';
      alert('임시 유료전환 임시 데이터를 삭제했습니다.' + supabaseMessage);
      renderAdmin();
    }

    function getLocalDateKey(value) {
      const date = value ? new Date(value) : new Date();
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function getVisitStats() {
      try {
        const saved = JSON.parse(localStorage.getItem(VISIT_STATS_KEY) || 'null');
        if (saved && typeof saved === 'object') {
          return {
            total: Number(saved.total || 0),
            daily: saved.daily && typeof saved.daily === 'object' ? saved.daily : {}
          };
        }
      } catch (e) {}
      return { total:0, daily:{} };
    }

    function setVisitStats(stats) {
      localStorage.setItem(VISIT_STATS_KEY, JSON.stringify({
        total:Number(stats?.total || 0),
        daily:stats?.daily && typeof stats.daily === 'object' ? stats.daily : {}
      }));
    }

    function recordSiteVisit() {
      const todayKey = getLocalDateKey();
      const stats = getVisitStats();
      stats.total = Number(stats.total || 0) + 1;
      stats.daily = stats.daily && typeof stats.daily === 'object' ? stats.daily : {};
      stats.daily[todayKey] = Number(stats.daily[todayKey] || 0) + 1;
      const recentDays = {};
      Object.keys(stats.daily).sort().slice(-31).forEach(key => { recentDays[key] = Number(stats.daily[key] || 0); });
      stats.daily = recentDays;
      setVisitStats(stats);
      return stats;
    }

    function countTodaySignups(members) {
      const todayKey = getLocalDateKey();
      return (members || []).filter(member => getLocalDateKey(member?.createdAt) === todayKey).length;
    }

    function renderAdminQuickLine(label, value, action) {
      if (!action) return '<div class="line"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></div>';
      return '<button type="button" class="admin-quick-line" onclick="' + action + '"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></button>';
    }

    function renderAdminTodoSummary(data) {
      const rows = [
        { label:'문의 답변대기', value:(data.waitingContacts || 0) + '건', action:"sitePassSetAdminSectionV578('contacts')" },
        { label:'QR 일시정지', value:(data.paused || 0) + '건', action:'openAdminListQuickFilter(\'paused\')' },
        { label:'서류 만료임박', value:(data.expiringDocs || 0) + '건', action:'openAdminListQuickFilter(\'expiring\')' },
        { label:'서류 만료', value:(data.expiredDocs || 0) + '건', action:'openAdminListQuickFilter(\'expired\')' },
        { label:'유예 14일 이상', value:(data.grace14Items || 0) + '건', action:'openAdminListQuickFilter(\'grace14\')' }
      ];
      const rowHtml = rows.map(item => renderAdminQuickLine(item.label, item.value, item.action)).join('');
      return '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>확인해야 할 사항</h3>' +
        '<div class="notice blue-note" style="margin-top:0;">중복되는 항목은 빼고, 바로 눌러서 이동할 항목만 남겼습니다. 유예 14일 이상 경과한 서류함도 별도로 확인합니다.</div>' +
        rowHtml +
      '</div>';
    }

    function ensureAdminSampleData() {
      // v23.7.112부터는 실제 가입 확인를 위해 샘플 회원/샘플 장비서류를 자동 생성하지 않습니다.
    }

    function resetSitePassTestDataOnce() {
      // v23.7.198부터 수정본 배포 시 실제 가입 회원/카카오/네이버/일반 회원 localStorage 데이터를 자동 삭제하지 않고, 탈퇴 카카오 계정은 자동로그인을 차단합니다.
      // 이전 베타 초기화 키가 없더라도 아무 데이터도 지우지 않고 방문자수만 기록합니다.
      return false;
    }

    function openManagerDemoView() {
      const item = ensureManagerDemoItem();
      openManagerPublicView(item.code, getManagerExpireAt(item));
    }

    function openManagerDemoDetail() {
      const item = ensureManagerDemoItem();
      renderDetail(item.code);
    }

    function checkHash() {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.startsWith('#pay=')) {
        handleAutoPaymentHash(hash);
        return true;
      }
      if (hash.startsWith('#manager=') || /(?:^\?|&)manager=/.test(search)) {
        const parsed = hash.startsWith('#manager=') ? parseManagerHash(hash) : parseManagerHash(search);
        if (parsed && parsed.code) {
          const target = new URL('./share.html', window.location.href);
          target.search = '';
          target.hash = '';
          target.searchParams.set('manager', String(parsed.code));
          if (parsed.sig) target.searchParams.set('sig', String(parsed.sig));
          target.searchParams.set('v', '23.7.553-recovery-test');
          window.location.replace(target.toString());
        }
        return true;
      }
      if (hash.startsWith('#qr=')) {
        const code = decodeURIComponent(hash.replace('#qr=', ''));
        renderPublic(code);
        return true;
      }
      if (hash === '#login' || hash === '#sitepass-login') {
        showScreen('signupScreen', { skipHistory:true });
        setTimeout(function(){
          try {
            if (typeof window.backToSitePassFirstLanding === 'function') window.backToSitePassFirstLanding();
          } catch (e) {}
        }, 20);
        return true;
      }
      if (hash === '#join' || hash === '#signup' || hash === '#sitepass-join' || hash === '#find-id' || hash === '#id-find' || hash === '#sitepass-find-id' || hash === '#find-password' || hash === '#password-find' || hash === '#sitepass-find-password') {
        showScreen('signupScreen', { skipHistory:true });
        setTimeout(function(){
          try {
            if (typeof window.restoreSitePassFirstAuthRoute === 'function') window.restoreSitePassFirstAuthRoute();
          } catch (e) {}
        }, 20);
        return true;
      }
      if (hash === '#admin' || hash === '#관리자') {
        showScreen(isAdminLoggedIn() ? 'adminScreen' : 'signupScreen');
        return true;
      }
      return false;
    }

    window.addEventListener('popstate', function(event) {
      const state = event.state || {};
      if (state.sitepassFirstAuthRoute) {
        sitePassHandlingPopState = true;
        showScreen('signupScreen', { skipHistory:true });
        sitePassHandlingPopState = false;
        setTimeout(function(){
          try {
            if (typeof window.restoreSitePassFirstAuthRoute === 'function') window.restoreSitePassFirstAuthRoute(state.sitepassFirstAuthRoute);
          } catch (e) {}
        }, 20);
        return;
      }
      if (state.sitepassScreen) {
        sitePassHandlingPopState = true;
        showScreen(state.sitepassScreen, { skipHistory:true });
        sitePassHandlingPopState = false;
        return;
      }
      if ((window.location.hash || window.location.search) && checkHash()) return;
      const fallbackScreen = isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen');
      sitePassHandlingPopState = true;
      showScreen(fallbackScreen, { skipHistory:true });
      sitePassHandlingPopState = false;
    });

    window.addEventListener('hashchange', checkHash);
    try { window.matchMedia('(display-mode: standalone)').addEventListener('change', updateQuickAuthUi); } catch (e) {}
    window.addEventListener('beforeinstallprompt', function(event) {
      event.preventDefault();
      deferredSitePassInstallPrompt = event;
      updateHomeInstallButtonState(isSitePassRecommendInstallRequest()
        ? '추천링크 설치 준비가 완료되었습니다. <b>바탕화면에 설치하기</b>를 누르면 설치창이 열립니다.'
        : '이 브라우저에서는 <b>바탕화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
    });

    window.addEventListener('appinstalled', function() {
      deferredSitePassInstallPrompt = null;
      closeHomeInstallGuidePanel('홈화면 추가가 완료되었습니다. 이제 현장서류패스 아이콘으로 들어오면 됩니다.');
      updateHomeInstallButtonState();
      updateQuickAuthUi();
    });

    async function bootSitePassApp() {
      try {
        updateSignupTermsUi();
        registerSitePassServiceWorker();
        updateHomeInstallButtonState();
        // v23.7.553-recovery-test: 담당자 링크는 head 단계에서 recipient.html로 이동합니다.
        // 메인 앱 부팅은 더 이상 담당자 화면을 강제로 고정하지 않습니다.
        clearLegacyAutoLoginState();
        const didCleanReset = resetSitePassTestDataOnce();
        ensureAdminSampleData();
        if (!didCleanReset) recordSiteVisit();

        renderDocCards();
        renderAlertPreview();
        setupRegistrationDraftAutoSave();
        setupJuminLimitDelegates();
        restorePwaAutoMemberSession();
        try {
          if (typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn())) {
            window.sitePassMemberEquipmentInitialSyncPendingV491 = true;
            window.sitePassMemberEquipmentInitialSyncErrorV491 = false;
          }
        } catch (e) {}
        refreshAdminUi();
        refreshMemberUi();
        try {
          setTimeout(function(){
            try {
              if (typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()) && typeof syncSupabaseMyEquipmentItems === 'function') {
                syncSupabaseMyEquipmentItems(true);
              } else if (typeof syncSupabaseEquipmentItems === 'function') {
                syncSupabaseEquipmentItems(true);
              }
            } catch (e) {}
          }, 30);
        } catch (e) {}
        updateQuickAuthUi();
        // v23.7.248: “로그인 확인 중입니다” 차단 화면을 더 이상 오래 띄우지 않습니다.
        // OAuth 확인은 뒤에서 진행하되, 사용자가 화면에 갇히지 않게 먼저 공개합니다.
        try { document.body.classList.remove('sitepass-booting'); } catch (e) {}
        // v23.7.246: 소셜 로그인 확인 과정이 외부 OAuth/Userinfo 응답 대기로 멈춰도
        // 화면이 '로그인 확인 중입니다'에 갇히지 않게 안전 타이머를 먼저 걸어둡니다.
        let sitePassBootWatchdogFired = false;
        const sitePassBootWatchdog = setTimeout(function(){
          if (document.body.classList.contains('sitepass-booting')) {
            sitePassBootWatchdogFired = true;
            try { removeSessionValue(SITEPASS_OAUTH_PENDING_KEY); } catch (e) {}
            document.body.classList.remove('sitepass-booting');
            alert('네이버 로그인 확인 시간이 길어져 중단했습니다.\n\nSupabase Edge Function의 Verify JWT가 OFF인지, 네이버 Provider의 Userinfo URL이 실제 함수 주소인지 확인해주세요.');
            showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
          }
        }, 18000);
        const handledOAuth = await handleSupabaseKakaoOAuthReturn();
        clearTimeout(sitePassBootWatchdog);
        if (sitePassBootWatchdogFired) return;
        if (!handledOAuth && !checkHash()) {
          let initialScreen = 'signupScreen';
          if (isAdminLoggedIn()) {
            initialScreen = 'adminScreen';
          } else if (isMemberLoggedIn()) {
            const allowedMemberScreens = ['homeScreen','registerScreen','listScreen','contactScreen','myAccountScreen','pricingScreen','usageGuideScreen'];
            let rememberedScreen = '';
            try { rememberedScreen = String(sessionStorage.getItem('sitepass_last_screen_v491') || (window.history.state && window.history.state.sitepassScreen) || ''); } catch (e) {}
            initialScreen = allowedMemberScreens.includes(rememberedScreen) ? rememberedScreen : 'homeScreen';
          }
          showScreen(initialScreen, { replace:true });
          if (initialScreen === 'contactScreen') {
            // v23.7.553-recovery-test: 새로고침 시 사용자가 보고 있던 알림방을 그대로 복원합니다.
            setTimeout(function(){
              try {
                if (typeof window.sitepassRestoreChatStateV532 === 'function') window.sitepassRestoreChatStateV532();
                else if (typeof window.sitepassOpenChatInbox460 === 'function') window.sitepassOpenChatInbox460({ preserveRememberedRoom:true });
              } catch (e) {}
            }, 180);
          }
          promptRegistrationDraftIfNeeded('startup');
        }
      } catch (e) {
        console.error('SitePass 초기 화면 처리 오류:', e);
        document.body.classList.remove('sitepass-booting');
        alert('첫 화면 처리 중 오류가 났습니다. 새로고침 후에도 반복되면 최신 수정본을 다시 올려주세요.\n' + (e?.message || ''));
        showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
      }
      setTimeout(function(){ document.body.classList.remove('sitepass-booting'); }, 3000);
    }
    bootSitePassApp();


    // v23.7.123 - 날짜 표시칸 깜박임 방지 보강
    (function setupDateInputBlinkFix(){
      if (window.__sitePassDateInputBlinkFix) return;
      window.__sitePassDateInputBlinkFix = true;

      document.addEventListener('focusin', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-display]')) {
          setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
          return;
        }
        if (input.matches('input[type="date"]')) input.style.caretColor = 'transparent';
      });

      document.addEventListener('change', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-real]')) syncCleanDatePicker(input);
        if (input.matches('input[type="date"]')) setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
      });
    })();

