// SitePass STEP83 V34 - share/share-create 책임 분리
// 서버 서명 public share 저장과 Recipient Token V2 생성/폐기를 담당합니다.
(function(){
  'use strict';

  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async function saveManagerShareItemsToSupabase(items, deps) {
    deps = deps || {};
    const qrShare =
      typeof deps.getQrShareModule === 'function'
        ? deps.getQrShareModule()
        : null;

    if (!qrShare || typeof qrShare.saveManagerShareItemsToSupabase !== 'function') {
      return {
        ok:false,
        message:'SERVER_SIGNATURE_MODULE_REQUIRED',
        serverSignatureModuleRequired:true
      };
    }

    return await qrShare.saveManagerShareItemsToSupabase(items, {
      getClient: deps.getClient,
      getExpireAt: deps.getExpireAt,
      cloneItem: deps.cloneItem,
      getLabel: deps.getLabel,
      getMember: deps.getMember
    });
  }

  async function revokeRecipientTokenBundle(bundle, deps) {
    deps = deps || {};
    const client =
      typeof deps.getClient === 'function'
        ? deps.getClient()
        : null;

    if (!client || typeof client.rpc !== 'function') return;

    const entries =
      bundle && Array.isArray(bundle.entries)
        ? bundle.entries
        : [];

    for (const entry of entries) {
      const tokenId = String(entry && entry.token_id || '').trim();
      if (!tokenId) continue;

      try {
        await client.rpc(
          'sitepass_revoke_recipient_share_token_v2',
          { p_token_id:tokenId }
        );
      } catch (e) {}
    }
  }

  async function createRecipientTokenBundle(items, deps) {
    deps = deps || {};

    const client =
      typeof deps.waitForClient === 'function'
        ? await deps.waitForClient(4000)
        : null;

    if (!client || typeof client.rpc !== 'function') {
      return {
        ok:false,
        message:'Supabase 연결 객체가 없습니다.',
        entries:[]
      };
    }

    const safeItems = (items || []).filter(Boolean);

    if (!safeItems.length) {
      return {
        ok:false,
        message:'공유할 장비가 없습니다.',
        entries:[]
      };
    }

    const bundle = {
      ok:false,
      entries:[]
    };

    for (const item of safeItems) {
      const equipmentId =
        typeof deps.getEquipmentId === 'function'
          ? deps.getEquipmentId(item)
          : '';

      if (!equipmentId) {
        await revokeRecipientTokenBundle(bundle, deps);
        return {
          ok:false,
          message:'수신자 링크에 필요한 장비 식별정보를 확인하지 못했습니다.',
          entries:[]
        };
      }

      let result;

      try {
        result = await client.rpc(
          'sitepass_create_recipient_share_token_v2',
          { p_equipment_id:equipmentId }
        );
      } catch (e) {
        await revokeRecipientTokenBundle(bundle, deps);
        return {
          ok:false,
          message:e && e.message
            ? e.message
            : String(e || 'Token V2 생성 오류'),
          entries:[]
        };
      }

      if (result && result.error) {
        const error = result.error;

        await revokeRecipientTokenBundle(bundle, deps);

        return {
          ok:false,
          message:[
            error.code,
            error.message,
            error.details,
            error.hint
          ].map(function(v){
            return String(v || '').trim();
          }).filter(Boolean).join(' / ') || 'Token V2 생성 오류',
          entries:[]
        };
      }

      const data =
        typeof deps.normalizeRpcData === 'function'
          ? deps.normalizeRpcData(result && result.data)
          : (result && result.data);

      if (data && data.ok === false) {
        await revokeRecipientTokenBundle(bundle, deps);
        return {
          ok:false,
          message:data.message || data.error || 'Token V2 생성 실패',
          entries:[]
        };
      }

      const rawToken = String(
        data && (
          data.recipient_token ||
          data.token ||
          data.raw_token
        ) || ''
      ).trim();

      const tokenId = String(
        data && (
          data.token_id ||
          data.id
        ) || ''
      ).trim();

      const expiresAt = String(
        data && (
          data.expires_at ||
          data.expire_at
        ) || ''
      ).trim();

      const tempEntry = {
        item:item,
        equipment_id:equipmentId,
        token:rawToken,
        token_id:tokenId,
        expires_at:expiresAt
      };

      if (
        !TOKEN_PATTERN.test(rawToken) ||
        !UUID_PATTERN.test(tokenId)
      ) {
        if (tokenId) bundle.entries.push(tempEntry);
        await revokeRecipientTokenBundle(bundle, deps);

        return {
          ok:false,
          message:'Token V2 서버 응답 형식이 올바르지 않습니다.',
          entries:[]
        };
      }

      bundle.entries.push(tempEntry);
    }

    bundle.ok = true;
    return bundle;
  }

  window.SitePassShareCreate = Object.freeze({
    saveManagerShareItemsToSupabase,
    revokeRecipientTokenBundle,
    createRecipientTokenBundle
  });
})();
