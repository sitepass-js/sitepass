(function () {
  'use strict';

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var FINISH_QUEUE_KEY = 'sitepass_v23_7_730_registration_draft_finish_queue';
  var touchInFlight = new Map();
  var finishInFlight = new Map();

  function createDraftId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        var hex = Array.from(bytes).map(function (b) {
          return b.toString(16).padStart(2, '0');
        }).join('');
        return [
          hex.slice(0, 8),
          hex.slice(8, 12),
          hex.slice(12, 16),
          hex.slice(16, 20),
          hex.slice(20)
        ].join('-');
      }
    } catch (e) {}
    return '';
  }

  function normalizeDraftId(value) {
    var id = String(value || '').trim();
    return UUID_RE.test(id) ? id : '';
  }

  function api() {
    var value = window.SitePassSupabaseApi;
    return value && typeof value.rpc === 'function' ? value : null;
  }

  function normalizeAuthUserId(value) {
    var id = String(value || '').trim().toLowerCase();
    return UUID_RE.test(id) ? id : '';
  }

  async function authenticatedOwnerScope() {
    var result = null;
    try {
      if (
        window.SitePassAuthSession &&
        typeof window.SitePassAuthSession.getSession === 'function'
      ) {
        result = await window.SitePassAuthSession.getSession();
      } else {
        var coreClient =
          window.SitePassCoreSupabase &&
          typeof window.SitePassCoreSupabase.getClient === 'function'
            ? window.SitePassCoreSupabase.getClient()
            : window.sitepassSupabase;
        if (
          coreClient &&
          coreClient.auth &&
          typeof coreClient.auth.getSession === 'function'
        ) {
          result = await coreClient.auth.getSession();
        }
      }
    } catch (e) {
      result = null;
    }

    var session =
      result &&
      result.data &&
      result.data.session;

    var authUserId = normalizeAuthUserId(
      session &&
      session.user &&
      session.user.id
    );

    return authUserId
      ? 'auth-' + authUserId
      : '';
  }

  function currentOwnerScope() {
    try {
      var member = typeof window.getEquipmentRegistrationOwnerMember === 'function'
        ? window.getEquipmentRegistrationOwnerMember()
        : (typeof window.getCurrentMemberTest === 'function' ? window.getCurrentMemberTest() : null);
      return String(member && member.id || '').trim();
    } catch (e) {
      return '';
    }
  }

  function readFinishQueue() {
    try {
      var parsed = JSON.parse(localStorage.getItem(FINISH_QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(function (row) {
        return row && normalizeDraftId(row.draftId) && (row.status === 'completed' || row.status === 'cancelled');
      }) : [];
    } catch (e) {
      return [];
    }
  }

  function writeFinishQueue(rows) {
    try {
      var safe = (Array.isArray(rows) ? rows : []).slice(-30).map(function (row) {
        return {
          draftId: normalizeDraftId(row && row.draftId),
          status: row && row.status === 'completed' ? 'completed' : 'cancelled',
          ownerScope: String(row && row.ownerScope || '').trim(),
          queuedAt: String(row && row.queuedAt || new Date().toISOString())
        };
      }).filter(function (row) { return !!row.draftId; });
      if (safe.length) localStorage.setItem(FINISH_QUEUE_KEY, JSON.stringify(safe));
      else localStorage.removeItem(FINISH_QUEUE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function queueFinish(draftId, status, ownerScope) {
    var id = normalizeDraftId(draftId);
    if (!id) return false;
    var normalizedStatus = status === 'completed' ? 'completed' : 'cancelled';

    // STEP88 v730R3R1: finish queue는 반드시 Supabase 인증사용자 scope를 가져야 한다.
    // owner가 불명확한 작업을 현재/다음 로그인 회원에게 추측 귀속하지 않는다.
    var scope = String(ownerScope || '').trim();
    if (!scope) return false;

    var rows = readFinishQueue().filter(function (row) {
      return !(row.draftId === id && row.status === normalizedStatus);
    });
    rows.push({
      draftId: id,
      status: normalizedStatus,
      ownerScope: scope,
      queuedAt: new Date().toISOString()
    });
    return writeFinishQueue(rows);
  }

  function removeQueuedFinish(draftId, status) {
    var id = normalizeDraftId(draftId);
    var rows = readFinishQueue().filter(function (row) {
      return !(row.draftId === id && (!status || row.status === status));
    });
    writeFinishQueue(rows);
  }

  async function touch(draftId) {
    var id = normalizeDraftId(draftId);
    if (!id) return { ok: false, skipped: true, reason: 'invalid_draft_id' };

    var client = api();
    if (!client) return { ok: false, skipped: true, reason: 'rpc_unavailable' };

    if (touchInFlight.has(id)) return touchInFlight.get(id);

    var task = (async function () {
      var result = await client.rpc('sitepass_touch_my_equipment_registration_draft_v1', {
        p_draft_id: id
      });
      if (result && result.error) {
        return { ok: false, error: result.error };
      }
      return { ok: true, data: result && result.data };
    })().catch(function (error) {
      return { ok: false, error: error };
    }).finally(function () {
      touchInFlight.delete(id);
    });

    touchInFlight.set(id, task);
    return task;
  }

  async function finish(draftId, status, options) {
    var id = normalizeDraftId(draftId);
    if (!id) return { ok: false, skipped: true, reason: 'invalid_draft_id' };

    // STEP88 v730R2: touch가 서버의 기존 canonical active draft를 반환하는 동안
    // 사용자가 즉시 취소/완료하더라도 잘못된 신규 UUID를 finish하지 않도록
    // 같은 requested id의 진행 중 touch를 먼저 기다린다.
    var pendingTouch = touchInFlight.get(id);
    if (pendingTouch) {
      try {
        var touchResult = await pendingTouch;
        var canonicalId = normalizeDraftId(
          touchResult &&
          touchResult.ok === true &&
          touchResult.data &&
          touchResult.data.draftId
        );
        if (canonicalId) id = canonicalId;
      } catch (e) {}
    }

    var normalizedStatus = status === 'completed' ? 'completed' : 'cancelled';

    // STEP88 v730R3R1: DB finish는 인증 세션의 auth user scope를 기준으로만 실행/queue한다.
    // 로그아웃 상태나 다른 계정 scope를 전달한 호출은 RPC에 도달시키지 않는다.
    var ownerScope = await authenticatedOwnerScope();
    if (!ownerScope) {
      return {
        ok: false,
        queued: false,
        skipped: true,
        reason: 'active_auth_session_required'
      };
    }

    var requestedOwnerScope = String(options && options.ownerScope || '').trim();
    if (requestedOwnerScope && requestedOwnerScope !== ownerScope) {
      return {
        ok: false,
        queued: false,
        skipped: true,
        reason: 'finish_queue_owner_scope_mismatch'
      };
    }

    var key = id + ':' + normalizedStatus;

    if (finishInFlight.has(key)) return finishInFlight.get(key);

    var task = (async function () {
      var client = api();
      if (!client) {
        var queuedWithoutApi = queueFinish(id, normalizedStatus, ownerScope);
        return {
          ok: false,
          queued: queuedWithoutApi,
          reason: queuedWithoutApi
            ? 'rpc_unavailable'
            : 'finish_queue_owner_scope_required'
        };
      }

      var rpcName = normalizedStatus === 'completed'
        ? 'sitepass_complete_my_equipment_registration_draft_v1'
        : 'sitepass_cancel_my_equipment_registration_draft_v1';

      var result = await client.rpc(rpcName, { p_draft_id: id });
      if (result && result.error) {
        var queuedAfterRpcError = queueFinish(id, normalizedStatus, ownerScope);
        return {
          ok: false,
          queued: queuedAfterRpcError,
          error: result.error
        };
      }

      removeQueuedFinish(id);
      return { ok: true, data: result && result.data };
    })().catch(function (error) {
      var queuedAfterThrow = queueFinish(id, normalizedStatus, ownerScope);
      return {
        ok: false,
        queued: queuedAfterThrow,
        error: error
      };
    }).finally(function () {
      finishInFlight.delete(key);
    });

    finishInFlight.set(key, task);
    return task;
  }

  async function flushFinishQueue() {
    var rows = readFinishQueue();
    if (!rows.length) {
      return { ok: true, attempted: 0, remaining: 0 };
    }

    // STEP88 v730R3R1:
    // 1) 로그아웃 상태에서는 어떤 finish RPC도 재시도하지 않는다.
    // 2) ownerScope가 없는 legacy queue는 삭제/귀속/실행하지 않는다.
    // 3) 현재 Supabase auth user와 정확히 같은 scope만 실행한다.
    var ownerScope = await authenticatedOwnerScope();
    if (!ownerScope) {
      return {
        ok: true,
        skipped: true,
        reason: 'active_auth_session_required',
        attempted: 0,
        remaining: rows.length
      };
    }

    var attempted = 0;

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var rowOwnerScope = String(row && row.ownerScope || '').trim();

      if (!rowOwnerScope) continue;
      if (rowOwnerScope !== ownerScope) continue;

      attempted += 1;
      await finish(row.draftId, row.status, {
        ownerScope: rowOwnerScope
      });
    }

    return {
      ok: true,
      attempted: attempted,
      remaining: readFinishQueue().length
    };
  }

  function getState() {
    var rows = readFinishQueue();
    return {
      finishQueueCount: rows.length,
      unscopedFinishQueueCount: rows.filter(function (row) {
        return !String(row && row.ownerScope || '').trim();
      }).length,
      scopedFinishQueueCount: rows.filter(function (row) {
        return !!String(row && row.ownerScope || '').trim();
      }).length,
      touchInFlightCount: touchInFlight.size,
      finishInFlightCount: finishInFlight.size
    };
  }

  try {
    var authSession = window.SitePassAuthSession;
    if (authSession && typeof authSession.subscribe === 'function') {
      authSession.subscribe(function (event) {
        if (event && event.type === 'SIGNED_IN') {
          window.setTimeout(function () { flushFinishQueue(); }, 500);
        }
      });
    }
  } catch (e) {}

  window.setTimeout(function () {
    try { flushFinishQueue(); } catch (e) {}
  }, 1800);

  window.SitePassRegistrationDraftLifecycleV730 = Object.freeze({
    createDraftId: createDraftId,
    touch: touch,
    finish: finish,
    flushFinishQueue: flushFinishQueue,
    getState: getState
  });
})();
