/*
 * SitePass STEP82 V28 TEST_ONLY
 * Equipment-link request server responsibility only.
 */
(function () {
  'use strict';

  var root =
    window.SitePassEquipmentLinkV82 =
      window.SitePassEquipmentLinkV82 || {};

  function api() {
    if (
      !root.api ||
      typeof root.api.rpc !== 'function' ||
      typeof root.api.newIdempotencyKey !== 'function'
    ) {
      throw new Error('장비연동 공통 API 모듈을 확인하지 못했습니다.');
    }
    return root.api;
  }

  function ensureIdempotencyKey(value) {
    var key = String(value || '').trim();
    return key || api().newIdempotencyKey();
  }

  async function create(options) {
    options = options || {};

    var equipmentIds = Array.isArray(options.equipmentIds)
      ? options.equipmentIds.map(function (value) {
          return String(value || '').trim();
        })
      : [];

    var targetLoginId =
      String(options.targetLoginId || '').trim();

    var idempotencyKey =
      ensureIdempotencyKey(options.idempotencyKey);

    var expectedCount =
      Number(options.expectedCount || equipmentIds.length);

    var result = await api().rpc(
      'sitepass_create_member_link_chat_request_v1',
      {
        p_equipment_ids: equipmentIds,
        p_target_login_id: targetLoginId,
        p_batch_idempotency_key: idempotencyKey
      }
    );

    if (
      !result ||
      result.ok !== true ||
      result.atomic !== true ||
      result.chatEnabled !== true ||
      !String(result.chatRoomId || '').trim() ||
      !String(result.requestGroupId || '').trim() ||
      Number(result.requestedCount || 0) !== expectedCount
    ) {
      throw new Error(
        '회원 채팅 연동 요청 결과를 확인하지 못했습니다.'
      );
    }

    return result;
  }

  root.request = Object.freeze({
    ensureIdempotencyKey: ensureIdempotencyKey,
    create: create
  });
})();
