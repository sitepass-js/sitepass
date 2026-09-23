(function () {
  'use strict';

  const VERSION = '23.7.730r4-step88-admin-isolation-global-card-removal';
  const CARD_ID = 'sitepassStep76IsolationCardV702';
  const state = {
    loading: false,
    loaded: false,
    ok: false,
    error: '',
    items: [],
    hasMore: false,
    lastLoadedAt: 0
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isSuperAdmin() {
    try {
      if (typeof window.isSuperAdminLoggedIn === 'function') {
        return !!window.isSuperAdminLoggedIn();
      }
      if (typeof isSuperAdminLoggedIn === 'function') {
        return !!isSuperAdminLoggedIn();
      }
    } catch (e) {}
    return false;
  }

  function reasonLabel(code) {
    const labels = {
      PENDING_OWNER_REVIEW: '소유자 확인 대기',
      OWNER_MEMBER_UUID_MISSING: '소유 회원 UUID 없음',
      OWNER_MEMBER_NOT_EXACTLY_ONE: '소유 회원 연결 수 불일치',
      OWNER_MEMBER_NOT_ACTIVE: '소유 회원 비활성',
      OWNER_MEMBER_ROLE_MISMATCH: '소유 회원 역할 불일치',
      OWNER_MEMBER_AUTH_UID_MISSING: '소유 회원 Auth UID 없음',
      EQUIPMENT_OWNER_AUTH_UID_MISSING: '장비 소유 Auth UID 없음',
      OWNER_AUTH_UID_MEMBER_MISMATCH: '장비·회원 Auth UID 불일치',
      TARGET_DOCUMENT_STATUS_NOT_VERIFIED: '문서 상태 미검증',
      TARGET_FILE_VERIFICATION_NOT_VERIFIED: '파일 검증상태 오류',
      TARGET_FILE_STORAGE_OBJECT_MISSING: 'Storage 원본 누락',
      TARGET_FILE_COUNT_MISMATCH: '현재 파일 수 불일치',
      DOCUMENT_COUNT_MISMATCH: '문서 수 불일치',
      CURRENT_VERSION_COUNT_MISMATCH: '현재 버전 수 불일치',
      SOURCE_LINEAGE_COUNT_MISMATCH: '원본 파일 계보 수 불일치',
      VERIFIED_FILE_COUNT_MISMATCH: '검증 파일 수 불일치',
      LEGACY_DRY_RUN_BLOCKED: '이전 사전검사 차단'
    };
    return labels[String(code || '')] || String(code || '원인 미확인');
  }

  function reasonDetail(reason) {
    const r = reason && typeof reason === 'object' ? reason : {};
    const parts = [];
    if (r.documentType) parts.push('문서: ' + r.documentType);
    if (r.documentStatus) parts.push('상태: ' + r.documentStatus);
    if (r.nonVerifiedFileCount != null) parts.push('미검증 파일: ' + Number(r.nonVerifiedFileCount) + '건');
    if (r.currentFileCount != null) parts.push('현재 파일: ' + Number(r.currentFileCount) + '건');
    if (r.storageObjectCount != null) parts.push('Storage 객체: ' + Number(r.storageObjectCount) + '건');
    if (r.expected != null) parts.push('기대: ' + r.expected);
    if (r.actual != null) parts.push('실제: ' + r.actual);
    if (r.actualVerified != null) parts.push('실제 검증파일: ' + r.actualVerified);
    if (r.parserDecision) parts.push('판정: ' + r.parserDecision);
    return parts.join(' · ');
  }

  function formatAt(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('ko-KR');
  }

  function getReasons(row) {
    const evidence = row && row.last_evidence && typeof row.last_evidence === 'object'
      ? row.last_evidence
      : {};
    return Array.isArray(evidence.reasons) ? evidence.reasons : [];
  }

  function renderReason(reason) {
    const r = reason && typeof reason === 'object' ? reason : {};
    const code = String(r.code || 'UNKNOWN');
    const detail = reasonDetail(r);
    return '<div class="line" style="align-items:flex-start;">' +
      '<b>' + esc(reasonLabel(code)) + '</b>' +
      '<span>' + esc(detail || code) +
        '<br><small style="word-break:break-all;">' + esc(code) + '</small>' +
      '</span>' +
    '</div>';
  }

  function renderRows() {
    if (state.loading && !state.loaded) {
      return '<div class="small">격리 원인을 불러오는 중입니다.</div>';
    }
    if (state.error) {
      return '<div class="notice" style="margin-top:8px;">격리 원인을 불러오지 못했습니다. 기존 관리자 기능은 계속 사용할 수 있습니다.<br><small>' +
        esc(state.error) + '</small></div>';
    }
    if (!state.items.length) {
      return '<div class="small">현재 격리된 이전 장비가 없습니다.</div>';
    }
    return state.items.map(function (row) {
      const no = row && (row.equipment_no || row.equipmentNo) || '-';
      const name = row && (row.equipment_name || row.equipmentName) || '';
      const reasons = getReasons(row);
      const reasonHtml = reasons.length
        ? reasons.map(renderReason).join('')
        : '<div class="small">세부 원인이 없습니다. 서버 reasonCodes를 확인하세요.</div>';
      return '<div class="card" style="box-shadow:none;margin-top:10px;padding:12px;">' +
        '<div class="sitepass-admin-section-head-v578">' +
          '<div><h3 style="margin:0;">' + esc(no) + (name ? ' · ' + esc(name) : '') + '</h3>' +
          '<div class="small">마지막 확인: ' + esc(formatAt(row && row.last_checked_at)) + '</div></div>' +
          '<span class="badge">' + esc(row && row.isolation_status || 'pending') + '</span>' +
        '</div>' +
        reasonHtml +
      '</div>';
    }).join('');
  }

  function renderBody() {
    const card = document.getElementById(CARD_ID);
    if (!card) return false;
    const body = card.querySelector('#sitepassStep76IsolationBodyV702');
    if (!body) return false;
    body.innerHTML = renderRows();
    return true;
  }

  function cardHtml() {
    return '<section id="' + CARD_ID + '" class="card" style="box-shadow:none;margin-top:12px;" aria-live="polite">' +
      '<div class="sitepass-admin-section-head-v578">' +
        '<div><h3 style="margin:0;">이전 불일치 격리</h3>' +
        '<div class="small">Step 76 · owner / document / file 불일치 원인</div></div>' +
        '<button type="button" class="ghost" onclick="return window.SitePassStep76IsolationV702.refresh()">새로고침</button>' +
      '</div>' +
      '<div class="notice blue-note" style="margin-top:8px;">불일치 장비는 자동 전환에서 제외되며, 아래 원인은 서버 격리 기록을 그대로 표시합니다.</div>' +
      '<div id="sitepassStep76IsolationBodyV702">' + renderRows() + '</div>' +
    '</section>';
  }

  function ensureCard() {
    /*
     * STEP88 v730R4:
     * Step76 격리 데이터/RPC는 보존하되 관리자 공통 shell 자동삽입은 금지한다.
     * 이전 버전 카드가 DOM에 남아 있으면 제거하고, 어떤 관리자 상위 폴더에서도
     * 이 모듈이 자체적으로 UI를 다시 mount하지 않는다.
     */
    const existing = document.getElementById(CARD_ID);
    if (existing) existing.remove();
    return false;
  }

  async function load(force) {
    if (!isSuperAdmin()) {
      state.loading = false;
      state.loaded = false;
      state.ok = false;
      state.error = '';
      state.items = [];
      ensureCard();
      return { ok: false, skipped: true, reason: 'SUPER_ADMIN_UI_REQUIRED' };
    }

    if (state.loading) return { ok: true, loading: true };

    if (!force && state.loaded && Date.now() - state.lastLoadedAt < 15000) {
      ensureCard();
      return { ok: state.ok, cached: true, items: state.items.slice() };
    }

    if (!window.sitepassSupabase || typeof window.sitepassSupabase.rpc !== 'function') {
      state.error = 'Supabase RPC 연결을 확인할 수 없습니다.';
      state.ok = false;
      state.loaded = true;
      state.lastLoadedAt = Date.now();
      ensureCard();
      renderBody();
      return { ok: false, error: state.error };
    }

    state.loading = true;
    state.error = '';
    ensureCard();
    renderBody();

    try {
      const result = await window.sitepassSupabase.rpc(
        'sitepass_list_admin_legacy_conversion_isolations_v1',
        {
          p_status: 'pending',
          p_limit: 50,
          p_before_last_checked_at: null,
          p_before_isolation_id: null
        }
      );

      if (result && result.error) throw result.error;

      const payload = Array.isArray(result && result.data)
        ? (result.data[0] || {})
        : ((result && result.data) || {});

      if (!payload || payload.ok !== true || !Array.isArray(payload.items)) {
        throw new Error('STEP76_ISOLATION_LIST_RESPONSE_INVALID');
      }

      state.items = payload.items;
      state.hasMore = !!payload.hasMore;
      state.ok = true;
      state.loaded = true;
      state.lastLoadedAt = Date.now();
      state.error = '';

      return { ok: true, items: state.items.slice(), hasMore: state.hasMore };

    } catch (e) {
      state.ok = false;
      state.loaded = true;
      state.lastLoadedAt = Date.now();
      state.error = String(e && (e.message || e.code) || e || 'UNKNOWN_ERROR');

      return { ok: false, error: state.error };

    } finally {
      state.loading = false;
      ensureCard();
      renderBody();
    }
  }

  function selfTest() {
    const doc = renderReason({
      code: 'TARGET_DOCUMENT_STATUS_NOT_VERIFIED',
      type: 'document',
      documentType: 'businessLicense',
      documentStatus: 'error'
    });

    const file = renderReason({
      code: 'TARGET_FILE_VERIFICATION_NOT_VERIFIED',
      type: 'file',
      documentType: 'businessLicense',
      nonVerifiedFileCount: 1
    });

    const storage = renderReason({
      code: 'TARGET_FILE_STORAGE_OBJECT_MISSING',
      type: 'file',
      documentType: 'businessLicense',
      currentFileCount: 1,
      storageObjectCount: 0
    });

    const pass =
      doc.includes('문서 상태 미검증') &&
      file.includes('파일 검증상태 오류') &&
      storage.includes('Storage 원본 누락');

    return {
      result: 'SITEPASS_STEP76_ADMIN_CAUSE_RENDER_SELFTEST_' + (pass ? 'PASS' : 'FAIL'),
      documentCause: doc.includes('TARGET_DOCUMENT_STATUS_NOT_VERIFIED'),
      fileCause: file.includes('TARGET_FILE_VERIFICATION_NOT_VERIFIED'),
      storageCause: storage.includes('TARGET_FILE_STORAGE_OBJECT_MISSING'),
      pass: pass
    };
  }

  window.SitePassStep76IsolationV702 = {
    version: VERSION,
    refresh: function () { load(true); return false; },
    load: load,
    ensureCard: ensureCard,
    getState: function () {
      return {
        loading: state.loading,
        loaded: state.loaded,
        ok: state.ok,
        error: state.error,
        itemCount: state.items.length,
        hasMore: state.hasMore,
        lastLoadedAt: state.lastLoadedAt,
        globalAutoMount: false,
        uiMode: 'headless'
      };
    },
    selfTest: selfTest
  };

  /*
   * STEP88 v730R4:
   * 관리자 공통 shell 전체에서 Step76 카드가 자동으로 따라다니는 동작을 제거한다.
   * MutationObserver 자동 재삽입은 사용하지 않는다.
   * 부팅 시 이전 DOM 잔존 카드만 1회 제거한다.
   */
  function boot() {
    ensureCard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
