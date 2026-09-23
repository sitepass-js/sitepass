/*
 * SitePass STEP82 V28 TEST_ONLY
 * Equipment-link revoke server responsibility only.
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

  async function revoke(options) {
    options = options || {};

    var result = await api().rpc(
      'sitepass_revoke_equipment_member_link_with_chat_v1',
      {
        p_equipment_id:
          String(options.equipmentId || '').trim(),
        p_reason:
          String(options.reason || '').trim(),
        p_idempotency_key:
          api().newIdempotencyKey()
      }
    );

    if (!result || result.ok !== true) {
      throw new Error('연동 해제 결과를 확인하지 못했습니다.');
    }

    if (
      result.changed === true &&
      (
        result.chatNotificationCreated !== true ||
        !String(result.chatRoomId || '').trim() ||
        !String(result.chatMessageId || '').trim() ||
        !String(result.chatMessageText || '').trim()
      )
    ) {
      throw new Error(
        '상대 회원의 연동 해제 알림 결과를 확인하지 못했습니다.'
      );
    }

    return result;
  }

  root.revoke = Object.freeze({
    revoke: revoke
  });
})();
