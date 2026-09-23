// SitePass STEP89 v731R2 - member-management read-only API/state
(function(){
  'use strict';

  var RPC_NAME = 'sitepass_admin_list_member_equipment_counts_v1';
  var LINK_RPC_NAME = 'sitepass_admin_list_member_equipment_link_details_v1';

  var state = {
    rows: [],
    byAuth: Object.create(null),
    byLogin: Object.create(null),

    linkRows: [],
    linkByOwnerMemberId: Object.create(null),
    linkByLinkedMemberId: Object.create(null),
    linkError: '',
    linkFetchedAt: 0,

    loading: false,
    error: '',
    fetchedAt: 0,
    requestId: 0
  };

  function key(value){
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function number(value){
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function normalizeRow(row){
    row = row && typeof row === 'object' ? row : {};
    return {
      memberId: String(row.member_id || '').trim(),
      authUserId: String(row.auth_user_id || '').trim(),
      loginId: String(row.login_id || '').trim(),
      owned: number(row.owned_equipment_count),
      linkedOut: number(row.linked_out_equipment_count),
      linkedIn: number(row.linked_in_equipment_count)
    };
  }

  function rebuildIndexes(rows){
    var byAuth = Object.create(null);
    var byLogin = Object.create(null);

    rows.forEach(function(row){
      var authKey = key(row.authUserId);
      var loginKey = key(row.loginId);
      if (authKey) byAuth[authKey] = row;
      if (loginKey) byLogin[loginKey] = row;
    });

    state.byAuth = byAuth;
    state.byLogin = byLogin;
  }

  function normalizeLinkRow(row){
    row = row && typeof row === 'object' ? row : {};
    return {
      linkId: String(row.linkId || row.link_id || '').trim(),
      linkStatus: String(row.linkStatus || row.link_status || '').trim(),
      linkedAt: String(row.linkedAt || row.linked_at || '').trim(),

      equipmentId: String(row.equipmentId || row.equipment_id || '').trim(),
      equipmentCode: String(row.equipmentCode || row.equipment_code || '').trim(),
      equipmentNo: String(row.equipmentNo || row.equipment_no || '').trim(),
      equipmentName: String(row.equipmentName || row.equipment_name || '').trim(),
      equipmentLifecycleStatus: String(row.equipmentLifecycleStatus || row.equipment_lifecycle_status || '').trim(),

      ownerMemberId: String(row.ownerMemberId || row.owner_member_id || '').trim(),
      ownerAuthUserId: String(row.ownerAuthUserId || row.owner_auth_user_id || '').trim(),
      ownerLoginId: String(row.ownerLoginId || row.owner_login_id || '').trim(),
      ownerName: String(row.ownerName || row.owner_name || '').trim(),
      ownerPhoneLast4: String(row.ownerPhoneLast4 || row.owner_phone_last4 || '').replace(/[^0-9]/g, '').slice(-4),

      linkedMemberId: String(row.linkedMemberId || row.linked_member_id || '').trim(),
      linkedAuthUserId: String(row.linkedAuthUserId || row.linked_auth_user_id || '').trim(),
      linkedLoginId: String(row.linkedLoginId || row.linked_login_id || '').trim(),
      linkedName: String(row.linkedName || row.linked_name || '').trim(),
      linkedPhoneLast4: String(row.linkedPhoneLast4 || row.linked_phone_last4 || '').replace(/[^0-9]/g, '').slice(-4)
    };
  }

  function rebuildLinkIndexes(rows){
    var byOwner = Object.create(null);
    var byLinked = Object.create(null);

    rows.forEach(function(row){
      var ownerKey = key(row.ownerMemberId);
      var linkedKey = key(row.linkedMemberId);

      if (ownerKey) {
        if (!byOwner[ownerKey]) byOwner[ownerKey] = [];
        byOwner[ownerKey].push(row);
      }

      if (linkedKey) {
        if (!byLinked[linkedKey]) byLinked[linkedKey] = [];
        byLinked[linkedKey].push(row);
      }
    });

    state.linkByOwnerMemberId = byOwner;
    state.linkByLinkedMemberId = byLinked;
  }

  function getApi(){
    var api = window.SitePassSupabaseApi || null;
    return api && typeof api.rpc === 'function' ? api : null;
  }

  function getState(){
    return {
      rows: state.rows.slice(),
      linkRows: state.linkRows.slice(),
      linkError: state.linkError,
      linkFetchedAt: state.linkFetchedAt,
      loading: state.loading,
      error: state.error,
      fetchedAt: state.fetchedAt,
      requestId: state.requestId
    };
  }

  function getForMember(member){
    member = member && typeof member === 'object' ? member : {};

    var authKeys = [
      member.supabaseAuthUserId,
      member.authUserId,
      member.auth_user_id,
      member.userId
    ].map(key).filter(Boolean);

    var loginKeys = [
      member.supabaseLoginId,
      member.signupId,
      member.login_id,
      member.loginId
    ].map(key).filter(Boolean);

    var matches = [];

    authKeys.forEach(function(k){
      if (state.byAuth[k]) matches.push(state.byAuth[k]);
    });

    loginKeys.forEach(function(k){
      if (state.byLogin[k]) matches.push(state.byLogin[k]);
    });

    var unique = [];
    var seen = Object.create(null);

    matches.forEach(function(row){
      var rowKey = key(row.memberId) || key(row.authUserId) || key(row.loginId);
      if (!rowKey || seen[rowKey]) return;
      seen[rowKey] = true;
      unique.push(row);
    });

    if (unique.length !== 1) {
      return {
        ready: state.fetchedAt > 0 && !state.loading && !state.error,
        found: false,
        ambiguous: unique.length > 1,
        owned: 0,
        linkedOut: 0,
        linkedIn: 0,
        error: state.error || ''
      };
    }

    return {
      ready: true,
      found: true,
      ambiguous: false,
      memberId: unique[0].memberId,
      owned: unique[0].owned,
      linkedOut: unique[0].linkedOut,
      linkedIn: unique[0].linkedIn,
      error: ''
    };
  }


  function getLinkDetailsForMember(member){
    var summary = getForMember(member);

    if (!summary || summary.found !== true || !summary.memberId) {
      return {
        ready: state.linkFetchedAt > 0 && !state.loading,
        foundMember: false,
        outgoing: [],
        incoming: [],
        error: state.linkError || ''
      };
    }

    var memberKey = key(summary.memberId);

    return {
      ready: state.linkFetchedAt > 0 && !state.loading,
      foundMember: true,
      memberId: summary.memberId,
      outgoing: (state.linkByOwnerMemberId[memberKey] || []).slice(),
      incoming: (state.linkByLinkedMemberId[memberKey] || []).slice(),
      error: state.linkError || ''
    };
  }

  async function refresh(force){
    var now = Date.now();

    if (state.loading) {
      return { ok:true, loading:true };
    }

    if (
      !force &&
      state.fetchedAt &&
      now - state.fetchedAt < 15000
    ) {
      return { ok:!state.error, cached:true, rows:state.rows.slice(), error:state.error };
    }

    var api = getApi();
    if (!api) {
      state.error = 'SITEPASS_SUPABASE_API_NOT_READY';
      state.fetchedAt = Date.now();
      return { ok:false, error:state.error };
    }

    var requestId = ++state.requestId;
    state.loading = true;
    state.error = '';

    try {
      var result = await api.rpc(RPC_NAME, {});
      if (requestId !== state.requestId) return { ok:false, stale:true };
      if (result && result.error) throw result.error;

      var rows = result ? result.data : [];
      if (typeof rows === 'string') {
        try { rows = JSON.parse(rows); } catch (e) {}
      }
      if (!Array.isArray(rows)) throw new Error('MEMBER_EQUIPMENT_COUNTS_NOT_ARRAY');

      var normalized = rows.map(normalizeRow);
      state.rows = normalized;
      rebuildIndexes(normalized);
      state.error = '';
      state.fetchedAt = Date.now();

      /* STEP90 R2E:
         연동 상대방 상세는 별도 최고관리자 READ-ONLY RPC에서 가져옵니다.
         실패해도 기존 회원목록/카운트는 깨지지 않게 분리합니다. */
      try {
        var linkResult = await api.rpc(LINK_RPC_NAME, {});
        if (requestId !== state.requestId) return { ok:false, stale:true };
        if (linkResult && linkResult.error) throw linkResult.error;

        var linkPayload = linkResult ? linkResult.data : null;
        if (typeof linkPayload === 'string') {
          try { linkPayload = JSON.parse(linkPayload); } catch (e) {}
        }

        var linkItems = linkPayload && Array.isArray(linkPayload.items)
          ? linkPayload.items
          : [];

        state.linkRows = linkItems.map(normalizeLinkRow);
        rebuildLinkIndexes(state.linkRows);
        state.linkError = '';
        state.linkFetchedAt = Date.now();
      } catch (linkError) {
        state.linkRows = [];
        rebuildLinkIndexes([]);
        state.linkError = linkError && linkError.message
          ? linkError.message
          : String(linkError || 'MEMBER_LINK_DETAILS_ERROR');
        state.linkFetchedAt = Date.now();
      }

      return {
        ok:true,
        rows:normalized.slice(),
        linkRows:state.linkRows.slice(),
        linkError:state.linkError
      };
    } catch (e) {
      if (requestId === state.requestId) {
        state.rows = [];
        rebuildIndexes([]);
        state.error = e && e.message
          ? e.message
          : String(e || 'MEMBER_EQUIPMENT_COUNTS_ERROR');
        state.fetchedAt = Date.now();
      }
      return { ok:false, error:state.error || 'MEMBER_EQUIPMENT_COUNTS_ERROR' };
    } finally {
      if (requestId === state.requestId) state.loading = false;
    }
  }

  function invalidate(){
    state.requestId += 1;
    state.rows = [];
    rebuildIndexes([]);
    state.linkRows = [];
    rebuildLinkIndexes([]);
    state.linkError = '';
    state.linkFetchedAt = 0;
    state.loading = false;
    state.error = '';
    state.fetchedAt = 0;
  }

  (function bindSignedOutInvalidation(){
    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.subscribe !== 'function') return;
    if (window.__sitePassAdminMembersApiSignedOutV731R2) return;
    window.__sitePassAdminMembersApiSignedOutV731R2 = true;

    authSession.subscribe(function(event){
      if (event === 'SIGNED_OUT') invalidate();
    });
  })();

  window.SitePassAdminMembersApi = Object.freeze({
    RPC_NAME: RPC_NAME,
    LINK_RPC_NAME: LINK_RPC_NAME,
    refresh: refresh,
    getState: getState,
    getForMember: getForMember,
    getLinkDetailsForMember: getLinkDetailsForMember,
    invalidate: invalidate
  });
})();
