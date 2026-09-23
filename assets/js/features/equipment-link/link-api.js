/*
 * SitePass STEP82 V28 TEST_ONLY
 * Equipment-link common RPC transport and secure idempotency UUID only.
 */
(function () {
  'use strict';

  var root =
    window.SitePassEquipmentLinkV82 =
      window.SitePassEquipmentLinkV82 || {};

  function parseRpcData(value) {
    var parsed = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {}
    }
    return parsed;
  }

  async function rpc(name, params) {
    var api = window.SitePassSupabaseApi;
    if (!api || typeof api.rpc !== 'function') {
      throw new Error('Supabase RPC 연결을 확인하지 못했습니다.');
    }

    var result = await api.rpc(name, params || {});
    if (result && result.error) throw result.error;
    return parseRpcData(result ? result.data : null);
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

    if (
      !window.crypto ||
      typeof window.crypto.getRandomValues !== 'function'
    ) {
      throw new Error('안전한 요청 식별키를 만들 수 없습니다.');
    }

    var bytes = new Uint8Array(16);
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

  root.api = Object.freeze({
    rpc: rpc,
    newIdempotencyKey: newIdempotencyKey
  });
})();
