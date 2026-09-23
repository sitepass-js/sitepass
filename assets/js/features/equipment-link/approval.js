/*
 * SitePass STEP82 V28 TEST_ONLY
 * Equipment-link approval/rejection server responsibility only.
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

  async function respond(options) {
    options = options || {};

    var result = await api().rpc(
      'sitepass_respond_member_link_chat_request_group_v1',
      {
        p_request_group_id:
          String(options.requestGroupId || '').trim(),
        p_decision:
          String(options.decision || '').trim(),
        p_idempotency_key:
          api().newIdempotencyKey()
      }
    );

    if (!result || result.ok !== true) {
      throw new Error(
        '연동 요청 처리 결과를 확인하지 못했습니다.'
      );
    }

    return result;
  }

  root.approval = Object.freeze({
    respond: respond
  });
})();
