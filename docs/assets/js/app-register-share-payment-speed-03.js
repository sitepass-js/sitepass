// SitePass v23.7.350 - speed optimized medium chunk (app-register-share-payment-speed 03/04)
// ---- merged from app-register-share-payment-09.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (09/15)
function shareOneListItemEmail(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemEmail) return archive.shareOneListItemEmail(code);
    }

    function shareSelectedListItemsKakao() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsKakao) return archive.shareSelectedListItemsKakao();
    }

    function shareSelectedListItemsSms() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsSms) return archive.shareSelectedListItemsSms();
    }

    function shareSelectedListItemsEmail() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsEmail) return archive.shareSelectedListItemsEmail();
    }

    function buildManagerShareText(items) {
      const archive = getArchiveModule();
      if (archive.buildManagerShareText) return archive.buildManagerShareText(items);
      return '[SitePass] 담당자 서류 공유';
    }

    function renderManagerSharePreviewPanel(item) {
      const archive = getArchiveModule();
      return archive.renderManagerSharePreviewPanel ? archive.renderManagerSharePreviewPanel(item) : '';
    }

    const PUBLIC_SHARE_TABLE = 'sitepass_public_shares';

    function getSitePassSupabaseClient() {
      return window.sitepassSupabase || null;
    }

    // v23.7.350: 담당자 공유 링크로 받은 자료는 수신자 기기의 localStorage에 의존하지 않고
    // 서버에서 받은 payload를 메모리에만 보관해 바로 렌더링합니다.
    window.sitePassManagerShareCache = window.sitePassManagerShareCache || {};

    function normalizeManagerShareItemForRuntime(item, code, expiresAt, sig) {
      if (!item) return null;
      const copy = JSON.parse(JSON.stringify(item || {}));
      const linkCode = String(code || copy.publicShareCode || copy.managerShareCode || copy.share_code || copy.code || '').trim();
      const originalCode = String(copy.code || copy.equipmentCode || copy.equipment_code || '').trim();
      if (linkCode) {
        if (originalCode && originalCode !== linkCode) copy.originalEquipmentCode = originalCode;
        copy.code = linkCode;
        copy.share_code = linkCode;
        copy.publicShareCode = linkCode;
        copy.managerShareCode = linkCode;
      }
      if (expiresAt) copy.managerExpireAt = new Date(Number(expiresAt)).toISOString();
      if (sig) copy.managerShareSig = sig;
      copy.isPublicShareRuntime = true;
      copy.publicShareLoadedAt = new Date().toISOString();
      return copy;
    }

    function rememberManagerShareItem(code, item, expiresAt, sig) {
      const normalized = normalizeManagerShareItemForRuntime(item, code, expiresAt, sig);
      if (!normalized || !normalized.code) return normalized || null;
      window.sitePassManagerShareCache[normalized.code] = normalized;
      if (code) window.sitePassManagerShareCache[String(code)] = normalized;
      if (normalized.publicShareCode) window.sitePassManagerShareCache[String(normalized.publicShareCode)] = normalized;
      if (normalized.managerShareCode) window.sitePassManagerShareCache[String(normalized.managerShareCode)] = normalized;
      return normalized;
    }

    function getManagerShareRuntimeItem(code) {
      const key = String(code || '').trim();
      if (!key) return null;
      return (window.sitePassManagerShareCache && window.sitePassManagerShareCache[key]) || null;
    }

    function getRuntimeItemByCode(code) {
      return getManagerShareRuntimeItem(code) || getItemByCode(code);
    }

    function getManagerShareCodeCandidate(item) {
      if (!item) return '';
      const candidates = [
        item.code, item.share_code, item.shareCode, item.publicShareCode, item.managerShareCode,
        item.qr_code, item.qrCode, item.equipment_code, item.equipmentCode, item.id,
        item.item_json && item.item_json.code, item.payload && item.payload.code, item.item_data && item.item_data.code
      ];
      for (const value of candidates) {
        const text = String(value || '').trim();
        if (text) return text;
      }
      return '';
    }

    function getManagerShareSeed(item) {
      const raw = [
        item && (item.equipmentNo || item.equipment_no || item.vehicle_number || item.registration_no),
        item && (item.equipmentName || item.equipment_name || item.title),
        item && (item.createdAt || item.created_at || item.updatedAt || item.updated_at),
        item && JSON.stringify(item && item.docs ? Object.keys(item.docs).sort() : [])
      ].join('|');
      return raw.replace(/\s+/g, '').slice(0, 180) || ('seed-' + Date.now());
    }

    function makeFallbackManagerShareCode() {
      const block = () => Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(2, 8).padEnd(6, 'X');
      return 'MSH-' + Date.now().toString(36).toUpperCase() + '-' + block();
    }

    function ensureManagerShareCodeForItem(item) {
      if (!item) return '';
      let code = getManagerShareCodeCandidate(item);
      if (code) {
        item.code = code;
        item.publicShareCode = code;
        item.managerShareCode = code;
        return code;
      }
      const mapKey = 'SITEPASS_PUBLIC_SHARE_CODE_MAP_V1';
      const seed = getManagerShareSeed(item);
      try {
        const map = JSON.parse(localStorage.getItem(mapKey) || '{}');
        code = map[seed] || makeFallbackManagerShareCode();
        map[seed] = code;
        localStorage.setItem(mapKey, JSON.stringify(map));
      } catch (e) {
        code = makeFallbackManagerShareCode();
      }
      item.code = code;
      item.publicShareCode = code;
      item.managerShareCode = code;
      return code;
    }

    function cloneShareItemForServer(item, expireAt, sig) {
      const code = ensureManagerShareCodeForItem(item);
      const copy = JSON.parse(JSON.stringify(item || {}));
      copy.code = code;
      copy.publicShareCode = code;
      copy.managerShareCode = code;
      copy.managerExpireAt = new Date(Number(expireAt || getManagerExpireAt(item))).toISOString();
      copy.managerShareToken = item?.managerShareToken || getOrCreateManagerShareToken(code);
      copy.managerShareSig = sig || getManagerLinkSignature(code, Number(expireAt || getManagerExpireAt(item)));
      copy.publicShareSavedAt = new Date().toISOString();
      return copy;
    }

    function upsertSharedItemIntoLocalCache(item) {
      // v23.7.350: 수신자 링크 조회는 서버 payload를 메모리에만 저장합니다.
      // 받은 사람 휴대폰의 localStorage 용량/예전 보관함 상태 때문에 조회 실패가 나지 않게 합니다.
      return rememberManagerShareItem(item?.code || item?.share_code || item?.publicShareCode || item?.managerShareCode || '', item);
    }

    async function saveManagerShareItemsToSupabase(items) {
      const qrShare = getQrShareModule();
      if (qrShare.saveManagerShareItemsToSupabase) {
        return await qrShare.saveManagerShareItemsToSupabase(items, {
          getClient: getSitePassSupabaseClient,
          getExpireAt: getManagerExpireAt,
          getSignature: getManagerLinkSignature,
          cloneItem: cloneShareItemForServer,
          getLabel: getShareItemLabel
        });
      }
      const client = getSitePassSupabaseClient();
      if (!client) {
        return { ok:false, message:'Supabase 연결 객체가 없습니다.' };
      }
      const safeItems = (items || []).filter(Boolean);
      if (!safeItems.length) return { ok:true, saved:0 };
      try {
        const nowIso = new Date().toISOString();
        const rows = safeItems.map(item => {
          const code = ensureManagerShareCodeForItem(item);
          const expireAt = getManagerExpireAt(item);
          const sig = getManagerLinkSignature(code, expireAt);
          const shareItem = cloneShareItemForServer(item, expireAt, sig);
          return {
            code: String(code || ''),
            share_code: String(code || ''),
            share_sig: String(sig || ''),
            expires_at: new Date(expireAt).toISOString(),
            item_data: shareItem,
            payload: shareItem,
            share_title: getShareItemLabel(item),
            equipment_no: String(item.equipmentNo || ''),
            equipment_name: String(item.equipmentName || ''),
            owner_login_id: String(item.ownerSignupId || item.ownerProviderId || ''),
            updated_at: nowIso
          };
        }).filter(row => row.share_code && row.share_sig);
        if (!rows.length) return { ok:false, message:'저장할 담당자 링크 정보가 없습니다.' };
        const { error } = await client
          .from(PUBLIC_SHARE_TABLE)
          .upsert(rows, { onConflict:'share_code' });
        if (error) return { ok:false, message:error.message || 'Supabase 저장 오류' };
        return { ok:true, saved:rows.length };
      } catch (e) {
        return { ok:false, message:e?.message || String(e) };
      }
    }

    async function loadManagerShareItemFromSupabase(code, sig) {
      const qrShare = getQrShareModule();
      if (qrShare.loadManagerShareItemFromSupabase) {
        return await qrShare.loadManagerShareItemFromSupabase(code, sig, {
          getClient: getSitePassSupabaseClient,
          upsertLocalCache: upsertSharedItemIntoLocalCache
        });
      }
      if (!getSitePassSupabaseClient() || !code) return { ok:false, message:'Supabase 연결 또는 링크 코드가 없습니다.' };
      return { ok:false, message:'QR 공유 모듈 연결 실패' };
    }

    function showManagerLinkLoadMessage(message) {
      const box = document.getElementById('managerPrintBox');
      if (box) box.innerHTML = '<div class="empty">' + escapeHtml(message || '담당자 링크를 확인하고 있습니다.') + '</div>';
      showScreen('managerPrintScreen');
    }

    async function renderManagerPrintFromHash(parsed) {
      if (!parsed || !parsed.code) {
        showManagerLinkLoadMessage('담당자 링크 정보가 없습니다. 링크를 다시 확인해주세요.');
        return;
      }
      let item = getRuntimeItemByCode(parsed.code);
      if (!item) {
        showManagerLinkLoadMessage('서버에서 담당자 링크를 불러오는 중입니다.');
        const loaded = await loadManagerShareItemFromSupabase(parsed.code, parsed.sig);
        if (loaded.ok) {
          item = rememberManagerShareItem(parsed.code, loaded.item, loaded.expiresAt || parsed.exp, parsed.sig);
          parsed.exp = loaded.expiresAt || parsed.exp;
        }
        else if (loaded.expired) {
          const box = document.getElementById('managerPrintBox');
          if (box) box.innerHTML = '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 1일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
          showScreen('managerPrintScreen');
          return;
        } else {
          const msg = loaded.notFound
            ? '조회할 수 없는 코드입니다.<br>장비업자가 1일 링크를 다시 공유해야 합니다.'
            : '담당자 링크를 서버에서 불러오지 못했습니다.<br>장비업자에게 새 링크를 다시 받아주세요.<br><span class="small">' + escapeHtml(loaded.message || '') + '</span>';
          const box = document.getElementById('managerPrintBox');
          if (box) box.innerHTML = '<div class="empty">' + msg + '</div>';
          showScreen('managerPrintScreen');
          return;
        }
      }
      renderManagerPrint(parsed.code, parsed.exp, parsed.sig);
    }

    function shareManagerItems(items) {
      shareManagerItemsByChannel(items, 'kakao');
    }

    async function shareManagerItemsByChannel(items, channel) {
      const requestedItems = (items || []).filter(Boolean).map(item => { ensureManagerShareCodeForItem(item); return item; });
      if (!canUseQrShareItems(requestedItems, '담당자 QR·링크 보내기')) return;
      const refreshedItems = refreshManagerExpiryForCodes(requestedItems.map(item => ensureManagerShareCodeForItem(item)));
      const safeItems = (refreshedItems && refreshedItems.length ? refreshedItems : requestedItems).filter(Boolean).map(item => { ensureManagerShareCodeForItem(item); return item; });
      if (!safeItems.length) return;

      const saved = await saveManagerShareItemsToSupabase(safeItems);
      if (!saved.ok) {
        alert('담당자 링크를 서버에 저장하지 못했습니다.\n지금 보내면 받은 사람 휴대폰에서 조회할 수 없는 코드가 나올 수 있습니다.\n\nSupabase SQL Editor에서 v23.7.350 public shares SQL을 먼저 실행한 뒤 다시 1일 링크 공유를 눌러주세요.\n\n오류: ' + (saved.message || '알 수 없는 오류'));
        return;
      }

      const text = buildManagerShareText(safeItems);
      const first = safeItems[0];
      const firstCode = ensureManagerShareCodeForItem(first);
      const firstLink = makeManagerLink(firstCode, getManagerExpireAt(first));
      if (channel === 'sms') {
        openSmsShare(text);
        return;
      }
      if (channel === 'email') {
        openEmailShare(text, safeItems);
        return;
      }
      openKakaoShare(text, firstLink, safeItems.length);
    }

    function openKakaoShare(text, firstLink, itemCount) {
      if (navigator.share) {
        const payload = itemCount === 1
          ? { title:'SitePass 담당자 서류', text:'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n1일 뒤에는 담당자 QR·링크 접속이 차단됩니다.', url:firstLink }
          : { title:'SitePass 담당자 서류', text };
        navigator.share(payload).catch(() => copyTextFallback(text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.'));
      } else {
        copyTextFallback(text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.');
      }
    }

// ---- merged from app-register-share-payment-10.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (10/15)
function normalizePhoneForShare(phone) {
      const qrShare = getQrShareModule();
      if (qrShare.normalizePhoneForShare) return qrShare.normalizePhoneForShare(phone);
      return String(phone || '').replace(/[^0-9+]/g, '');
    }

    function openSmsShare(text) {
      const phoneRaw = prompt('받는 사람 휴대폰번호를 입력해주세요.\n예: 01012345678');
      if (phoneRaw === null) return;
      const phone = normalizePhoneForShare(phoneRaw);
      if (!phone) { alert('휴대폰번호를 입력해야 문자로 보낼 수 있습니다.'); return; }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(phone) + '?body=' + body;
    }

    function openSmsShareToPhones(phones, text) {
      const targets = Array.from(new Set((phones || []).map(normalizePhoneForShare).filter(Boolean)));
      if (!targets.length) {
        alert('문자를 보낼 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(targets.join(',')) + '?body=' + body;
    }

    function buildAdminOwnerAlertText(items) {
      const safeItems = (items || []).filter(Boolean);
      const rows = safeItems.map((item, index) => {
        const prefix = safeItems.length > 1 ? (index + 1) + '. ' : '- ';
        return prefix + getShareItemLabel(item) + ' · ' + makeAlertSummary(item.docs || {});
      }).join('\n');
      return '[SitePass 관리자 알림]\n아래 장비서류의 만료 상태를 확인해주세요.\n' + rows + '\n\nSitePass 로그인 후 장비/기사/인부 보관함에서 서류를 수정/갱신해주세요.';
    }

    function shareSelectedAdminOwnerAlertSms() {
      const items = getSelectedListItemsForShare();
      if (!items.length) return;
      const phones = [];
      const missing = [];
      items.forEach(item => {
        const phone = normalizePhoneForShare(item?.ownerPhone || '');
        if (phone) phones.push(phone);
        else missing.push(getShareItemLabel(item));
      });
      if (!phones.length) {
        alert('선택한 장비에 등록된 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      if (missing.length) {
        alert('아래 장비는 장비업자 휴대폰번호가 없어 알림 대상에서 제외됩니다.\n\n' + missing.join('\n'));
      }
      const text = buildAdminOwnerAlertText(items);
      openSmsShareToPhones(phones, text);
    }

    function shareAdminOwnerAlertSmsForCode(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('알림을 보낼 장비서류를 찾을 수 없습니다.'); return; }
      const phone = normalizePhoneForShare(item.ownerPhone || '');
      if (!phone) { alert('이 장비서류에는 장비업자 휴대폰번호가 등록되어 있지 않습니다.'); return; }
      openSmsShareToPhones([phone], buildAdminOwnerAlertText([item]));
    }

    function openEmailShare(text, items) {
      const email = prompt('받는 사람 이메일을 입력해주세요.\n예: site@example.com');
      if (email === null) return;
      const cleanEmail = String(email || '').trim();
      if (!cleanEmail || !cleanEmail.includes('@')) { alert('받는 사람 이메일을 정확히 입력해주세요.'); return; }
      const subjectBase = getShareTitleForItems(items || []);
      const subject = encodeURIComponent('[SitePass] ' + subjectBase + ' QR·링크');
      const body = encodeURIComponent(text);
      window.location.href = 'mailto:' + cleanEmail + '?subject=' + subject + '&body=' + body;
    }

    function openAdminQrLink(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('QR을 열 장비서류를 찾을 수 없습니다.'); return; }
      if (isServiceShareBlocked(item)) {
        const box = document.getElementById('detailBox');
        if (box) {
          box.innerHTML = renderServiceBlockedBox(item) + '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 결제/갱신 알림</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>';
          showScreen('detailScreen');
        }
        return;
      }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 240);
      const docs = getDisplayDocs(item);
      const docHtml = docs.map(doc => renderDocDetail(doc)).join('');
      document.getElementById('detailBox').innerHTML =
        '<div class="notice blue-note"><b>관리자 큐알링크</b><br>이 QR은 회원이 등록한 해당 장비서류 담당자 화면으로 바로 연결됩니다. 담당자는 코드 입력 없이 다운로드/프린트 화면을 봅니다.</div>' +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">' +
          '<img alt="담당자 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 화면 바로 열림</div>' +
        '</div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>장비업자</b><span>' + escapeHtml(getItemOwnerText(item)) + '</span></div>' +
        '<div class="line"><b>담당자 링크</b><span style="word-break:break-all;">' + escapeHtml(currentDetailLink) + '</span></div>' +
        '<div class="line"><b>담당자 QR·링크 만료</b><span>' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 알림 보내기</button><button class="ghost" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">링크 복사</button><button class="primary" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 열기</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>' +
        '<h3>등록 서류</h3>' + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>');
      showScreen('detailScreen');
    }

    function renderDetail(code) {
      const item = getItems().find(x => x.code === code);
      if (!item) { alert('통합 서류함 정보를 찾을 수 없습니다.'); showScreen('listScreen'); return; }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 180);
      const docHtml = getDisplayDocs(item).map(doc => renderDocDetail(doc)).join('');
      const renewalHtml = isAdminLoggedIn() ? '<div class="notice blue-note">관리자 상세보기에서는 수정/갱신·결제연장 버튼을 숨깁니다. 장비업자에게 알림만 보내고, 실제 수정/갱신은 회원 보관함에서 처리합니다.</div>' : renderRenewPanel(item);

      document.getElementById('detailBox').innerHTML =
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>결제단위</b><span>' + escapeHtml(item?.bundleMeta?.paymentText || '장비 및 인력 통합 1세트 결제') + '</span></div>' +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        '<div class="line"><b>요금제 기준</b><span>' + escapeHtml(item.basicPlan || BASIC_PRICE_TEXT) + '<br>' + escapeHtml(item.alertPlan || ALERT_PRICE_TEXT) + '</span></div>' +
        '<div class="line"><b>전달 정책</b><span>' + escapeHtml(item.forwardPolicy || '공유 후 1일 재전송 가능 예정') + '</span></div>' +
        renewalHtml +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">' +
          '<img alt="통합 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 다운로드/프린트 화면 바로 열림</div>' +
        '</div>' +
        '<h3>등록 서류</h3>' + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>');
      showScreen('detailScreen');
    }

    function renderDocDetail(doc) {
      const pages = getDocPagesFromDoc(doc);
      const badgeClass = doc.fileName ? 'done' : (doc.required ? 'need' : '');
      const badgeText = doc.fileName ? ((doc.status || '첨부됨') + (pages.length ? ' · ' + pages.length + '장' : '')) : (doc.required ? '미첨부' : '선택안함');
      const attachInfo = (!pages.length && !doc.fileName) ? '<div class="selected-file">미첨부</div>' : '';
      const dateHtml = doc.expiry ? '<div class="line"><b>만료날짜</b><span>' + (doc.expireDate ? escapeHtml(doc.expireDate + ' / ' + getDdayText(doc.expireDate)) : '미입력') + '</span></div>' : '';
      return '<div class="doc-card"><div class="doc-head"><div class="doc-title">' + escapeHtml((doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title) + '</div><span class="badge ' + badgeClass + '">' + escapeHtml(badgeText) + '</span></div>' + attachInfo + renderPreviewHtml(doc) + dateHtml + '</div>';
    }

    function getDdayTextWithDays(dateValue) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getDdayTextWithDays) {
        return recipientView.getDdayTextWithDays(dateValue, { getDdayText });
      }
      const text = getDdayText(dateValue);
      if (!text) return '';
      return /^D-\d+$/.test(text) ? text + '일' : text;
    }

    function getExpiryPeriodLabel(doc) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getExpiryPeriodLabel) return recipientView.getExpiryPeriodLabel(doc);
      const title = String(doc?.title || '서류');
      if (title.includes('보험')) return '보험만료기간';
      if (title.includes('검사')) return title.includes('비파괴') ? '비파괴검사 만료기간' : '검사만료기간';
      if (title.includes('안전교육') || title.includes('교육')) return '교육만료기간';
      if (title.includes('면허')) return '면허만료기간';
      return '서류만료기간';
    }

// ---- merged from app-register-share-payment-11.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (11/15)
function renderDocExpiryStrip(doc) {
      if (!doc || !doc.expireDate) return '';
      const label = getExpiryPeriodLabel(doc);
      const dday = getDdayTextWithDays(doc.expireDate);
      return '<div class="doc-expiry-strip"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(dday + (doc.expireDate ? ' · ' + doc.expireDate : '')) + '</span></div>';
    }

    function getEquipmentNoForDocLabel(code) {
      const item = code ? getRuntimeItemByCode(code) : null;
      return String(item?.equipmentNo || document.getElementById('equipmentNo')?.value || '').trim();
    }

    function makeDocFileTopLabel(doc, code) {
      const equipmentNo = getEquipmentNoForDocLabel(code);
      const title = String(doc?.title || doc?.docTitle || '첨부서류').trim();
      return (equipmentNo ? equipmentNo + ' ' : '') + title;
    }

    function renderIdExtraStrip(doc) {
      if (!doc) return '';
      const phoneValue = doc.driverPhone || doc.workerPhone || doc.personPhone || doc.authPhone || '';
      const nameValue = doc.authPersonName || '';
      const verifiedAt = doc.authVerifiedAt || '';
      const identityStatus = doc.identityStatus || '미완료';
      const nameStrip = nameValue ? '<div><b>이름</b>: ' + escapeHtml(nameValue) + '</div>' : '';
      const phoneStrip = phoneValue ? '<div><b>휴대폰</b>: ' + escapeHtml(phoneValue) + '</div>' : '';
      const verifiedStrip = (nameStrip || phoneStrip) ? '<div><b>휴대폰 인증</b>: 완료' + (verifiedAt ? ' / ' + escapeHtml(new Date(verifiedAt).toLocaleString('ko-KR')) : '') + '</div><div><b>본인확인</b>: ' + escapeHtml(identityStatus) + '</div><div class="small">※ 위 이름과 첨부 신분증 이름이 일치하는지 확인하세요.</div>' : '';
      const taskStrip = doc.workerTask ? '<div><b>작업내용</b>: ' + escapeHtml(doc.workerTask) + '</div>' : '';
      return (nameStrip || phoneStrip || taskStrip) ? '<div class="id-extra-strip sp351-id-extra-strip">' + nameStrip + phoneStrip + verifiedStrip + taskStrip + '</div>' : '';
    }

    function renderPreviewHtml(doc) {
      const pages = getDocPagesFromDoc(doc);
      if (!doc.fileName && !pages.length) return '';
      if (pages.length) {
        const extraStrip = renderIdExtraStrip(doc);
        const label = makeDocFileTopLabel(doc, '');
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:'', docLabel:label }) + renderDocExpiryStrip(doc) + extraStrip + '</div>';
      }
      if ((doc.fileType || '').includes('pdf') || String(doc.fileName || '').toLowerCase().endsWith('.pdf')) {
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div>' +
          '<div class="preview-pdf">PDF 첨부됨<br><span class="small">현재 베타 파일은 서버 저장 전이라 파일명 중심으로 표시됩니다.</span></div>' + renderIdExtraStrip(doc) + '</div>';
      }
      const extraStrip = renderIdExtraStrip(doc);
      if (extraStrip) {
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 정보</span></div>' + extraStrip + '</div>';
      }
      return '';
    }

    function openQrPublicView(code) {
      const link = makeQrLink(code);
      window.location.hash = '#qr=' + encodeURIComponent(code);
      renderPublic(code);
    }

    function openCurrentQrLink() {
      if (!currentDetailLink) return;
      if (currentDetailLink.includes('#manager=') || currentDetailLink.includes('?manager=') || currentDetailLink.includes('&manager=')) {
        const parsed = parseManagerHash(currentDetailLink.includes('#manager=') ? '#' + currentDetailLink.split('#')[1] : currentDetailLink);
        if (parsed.code) openManagerPublicView(parsed.code, parsed.exp, parsed.sig);
        return;
      }
      const code = decodeURIComponent((currentDetailLink.split('#qr=')[1] || '').trim());
      if (code) openQrPublicView(code);
    }


    function openManagerByInput() {
      const code = (document.getElementById('managerCodeInput')?.value || '').trim();
      if (!code) { alert('담당자에게 받은 링크나 QR로 접속해주세요.'); return; }
      openManagerPublicView(code);
    }

    function openManagerPublicView(code, expireAt, sig) {
      const item = getRuntimeItemByCode(code);
      if (!item) {
        document.getElementById('managerPrintBox').innerHTML = '<div class="empty">조회할 수 없는 코드입니다.<br>코드를 다시 확인해주세요.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      const exp = expireAt ? Number(expireAt) : getManagerExpireAt(item);
      const linkSig = sig || getManagerLinkSignature(code, exp);
      window.location.hash = '#manager=' + encodeURIComponent(code) + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(linkSig);
      renderManagerPrint(code, exp, linkSig);
    }


    function renderManagerPrint(code, expireAt, sig) {
      const item = getRuntimeItemByCode(code);
      const box = document.getElementById('managerPrintBox');
      if (!item) {
        box.innerHTML = '<div class="empty">조회할 수 없는 코드입니다.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      if (isServiceShareBlocked(item)) {
        box.innerHTML = renderServiceBlockedBox(item);
        showScreen('managerPrintScreen');
        return;
      }
      // v23.7.350: 서버 sitepass_public_shares에서 직접 불러온 1일 공유링크는
      // URL에 exp/sig를 붙이지 않는 단일 코드 방식입니다. 이 경우 만료/폐기 검증은
      // Supabase RPC(sitepass_get_public_share_item)가 이미 수행하므로, 예전 URL 서명 검사를 건너뜁니다.
      const isServerLoadedManagerShare = !!(item && (item.isPublicShareRuntime || item.publicShareLoadedFromServer || item.publicShareLoadedAt));
      if (expireAt && !isServerLoadedManagerShare && !isManagerLinkSignatureValid(item, expireAt, sig)) {
        const recipientView = getRecipientViewModule();
        box.innerHTML = recipientView.getInvalidManagerLinkHtml ? recipientView.getInvalidManagerLinkHtml() : '<div class="manager-expire-box"><b>올바르지 않은 담당자 QR·링크입니다.</b><br>만료시간이 변경되었거나 이미 폐기된 링크입니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      if (isManagerExpired(item, expireAt)) {
        const recipientView = getRecipientViewModule();
        box.innerHTML = recipientView.getExpiredManagerLinkHtml ? recipientView.getExpiredManagerLinkHtml() : '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 1일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.<br><span class="small">장비업자의 원본 서류함과 수정/갱신 화면은 그대로 유지됩니다.</span></div>';
        showScreen('managerPrintScreen');
        return;
      }
      currentDetailLink = makeManagerLink(item.code, expireAt || getManagerExpireAt(item));
      const docs = getAttachedDisplayDocs(item);
      const docHtml = docs.map((doc, index) => renderManagerDocLine(doc, item.code, index)).join('');
      const recipientView = getRecipientViewModule();
      const remainingDays = recipientView.getManagerRemainingDays ? recipientView.getManagerRemainingDays(expireAt || getManagerExpireAt(item)) : Math.ceil(((expireAt || getManagerExpireAt(item)) - Date.now()) / (1000 * 60 * 60 * 24));
      box.innerHTML =
        '<div class="manager-received-hero"><div class="eyebrow">QR·링크로 받은 담당자 화면</div><h3>' + escapeHtml(getShareItemLabel(item)) + ' 서류</h3><p>이 화면은 하도급/원청 담당자가 카톡·문자 링크나 QR을 눌렀을 때 바로 보는 다운로드/프린트 전용 화면입니다.</p><div class="manager-status-grid"><div>코드입력 없음</div><div>1일 유효</div><div>수정/갱신 불가</div></div></div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="manager-expire-box">담당자 접속 만료일: ' + escapeHtml(getManagerExpireText(expireAt || getManagerExpireAt(item))) + '<br>남은 기간: 약 ' + remainingDays + '일<br><span class="small">1일 후 담당자 QR·링크 접속만 차단됩니다.</span></div>' +
        renderManagerDownloadToolbar(item) +
        '<h3 style="margin-top:14px">다운로드/프린트 서류</h3>' + renderPrintSelectRow(item.code) + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>') +
        (recipientView.renderSponsorBox ? recipientView.renderSponsorBox() : '<div class="sponsor-box"><div class="small">운영·개발: 제이에스건설</div><a href="https://www.songwongeo.co.kr" target="_blank" rel="noopener">송원건설 홈페이지 바로가기</a></div>');
      showScreen('managerPrintScreen');
    }

// ---- merged from app-register-share-payment-12.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (12/15)
function renderManagerDownloadToolbar(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.renderDownloadToolbar) {
        return recipientView.renderDownloadToolbar(item, {
          mode:'manager',
          showSelection:true,
          deps:{ getDisplayDocs:getAttachedDisplayDocs, getDocPagesFromDoc, expandPrintablePages, escapeJs }
        });
      }
      const code = item.code || '';
      const printableCount = getAttachedDisplayDocs(item).reduce((sum, doc) => sum + expandPrintablePages([doc]).length, 0);
      const attachedPageCount = getAttachedDisplayDocs(item).reduce((sum, doc) => sum + getDocPagesFromDoc(doc).length, 0);
      return '<div class="print-toolbar download-toolbar">' +
        '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
        '<button type="button" class="primary" onclick="downloadAllDocsBundle(\'' + escapeJs(code) + '\')">전체 다운로드</button>' +
        '<button type="button" class="primary" onclick="printAllDocs(\'' + escapeJs(code) + '\')">전체 프린트</button>' +
        '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' +
        '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' +
        '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + escapeJs(code) + '\')">선택 다운로드</button>' +
        '<button type="button" class="okBtn" onclick="printSelectedDocs(\'' + escapeJs(code) + '\')">선택 프린트</button>' +
      '</div>';
    }

    function renderManagerDocLine(doc, code, index) {
      const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
      const pages = getDocPagesFromDoc(doc);
      const pageText = pages.length ? ' · ' + pages.length + '장' : '';
      const expiryText = doc.expireDate ? ' / ' + escapeHtml(getExpiryPeriodLabel(doc) + ' ' + getDdayTextWithDays(doc.expireDate)) : '';
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + expiryText;
      const hasPrintablePreview = docHasPrintablePreview(doc);
      const previewHtml = renderPreviewHtmlForPublic(doc, code) || (doc.fileName ? '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div><div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>' + renderIdExtraStrip(doc) + '</div>' : '');
      const disabledNote = (doc.fileName && !hasPrintablePreview) ? '<div class="print-disabled-note">현재 이 첨부는 이미지 저장본이 없어 바로 인쇄는 제한될 수 있습니다. 서버 저장 단계에서 원본 보기/인쇄로 연결합니다.</div>' : '';
      return '<div class="manager-doc-card" data-public-doc-key="' + escapeHtml(doc.key) + '">' +
        '<div class="manager-doc-row"><label><input type="checkbox" data-print-doc-check value="' + escapeHtml(doc.key) + '" ' + (!doc.fileName ? 'disabled' : '') + ' /> <span>' + (index + 1) + '. ' + escapeHtml(title) + '</span></label><span class="badge ' + (doc.fileName ? 'done' : (doc.required ? 'need' : '')) + '">' + (doc.fileName ? statusText : (doc.required ? '미첨부' : '선택안함')) + '</span></div>' +
        previewHtml + disabledNote +
      '</div>';
    }

    function copyManagerCode(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      if (!canUseQrShareItems([item], '담당자 QR·링크 복사')) return;
      const expireAt = getManagerExpireAt(item);
      const link = makeManagerLink(item.code, expireAt);
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\n' +
        '장비: ' + getItemTitle(item) + '\n' +
        'QR·링크: ' + link + '\n' +
        '만료일: ' + getManagerExpireText(expireAt) + '\n' +
        '1일 뒤에는 담당자 QR·링크 접속이 차단됩니다.';
      copyTextFallback(text, '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 담당자가 코드 입력 없이 바로 열 수 있습니다.');
    }

    function downloadAllDocsBundle(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) return;
      downloadDocsBundle(item, getAttachedDisplayDocs(item), '전체서류');
    }

    function downloadSelectedDocsBundle(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) return;
      const keys = getSelectedPrintDocKeys();
      if (!keys.length) { alert('다운로드할 서류를 체크해주세요.'); return; }
      downloadDocsBundle(item, getDocsByKeys(item, keys), '선택서류');
    }

    function downloadSingleDocBundle(code, key) {
      const item = getRuntimeItemByCode(code);
      if (!item) return;
      downloadDocsBundle(item, getDocsByKeys(item, [key]), '단일서류');
    }


    function downloadDocsBundle(item, docs, label) {
      const out = getDocumentOutputModule();
      if (out.downloadDocsBundle) return out.downloadDocsBundle(item, docs, label, getDocumentOutputDeps());
      alert('문서 다운로드 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }


    function buildDownloadHtml(item, pages, blockedPages) {
      const out = getDocumentOutputModule();
      if (out.buildDownloadHtml) return out.buildDownloadHtml(item, pages, blockedPages, getDocumentOutputDeps());
      return buildPrintHtml(item, pages, blockedPages);
    }


    function renderPublicDocLine(doc, code, index) {
      const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
      const pages = getDocPagesFromDoc(doc);
      const pageText = pages.length ? ' · ' + pages.length + '장' : '';
      const expiryText = doc.expireDate ? ' / ' + escapeHtml(getExpiryPeriodLabel(doc) + ' ' + getDdayTextWithDays(doc.expireDate)) : '';
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + expiryText;
      const hasPrintablePreview = docHasPrintablePreview(doc);
      const disabledNote = (doc.fileName && !hasPrintablePreview) ? '<div class="print-disabled-note">현재 이 첨부는 이미지 저장본이 없어 바로 인쇄는 제한될 수 있습니다. 서버 저장 단계에서 원본 파일 인쇄로 연결합니다.</div>' : '';
      const previewHtml = renderPreviewHtmlForPublic(doc, code) || (doc.fileName ? '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div><div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>' + renderIdExtraStrip(doc) + '</div>' : '');
      return '<div class="public-doc-card printable" data-public-doc-key="' + escapeHtml(doc.key) + '">' +
        '<div class="doc-head"><label class="print-check-label"><input type="checkbox" data-print-doc-check value="' + escapeHtml(doc.key) + '" ' + (!doc.fileName ? 'disabled' : '') + ' /> <span>' + (index + 1) + '. ' + escapeHtml(title) + '</span></label><span class="badge ' + (doc.fileName ? 'done' : (doc.required ? 'need' : '')) + '">' + (doc.fileName ? statusText : (doc.required ? '미첨부' : '선택안함')) + '</span></div>' +
        previewHtml + disabledNote + '</div>';
    }

    function renderPreviewHtmlForPublic(doc, code) {
      const pages = getDocPagesFromDoc(doc);
      if (!pages.length) return renderPreviewHtml(doc);
      const extraStrip = renderIdExtraStrip(doc);
      const label = makeDocFileTopLabel(doc, code);
      return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:code, docLabel:label }) + renderDocExpiryStrip(doc) + extraStrip + '</div>';
    }

    function renderPublic(code) {
      const item = getItems().find(x => x.code === code);
      if (!item) {
        document.getElementById('publicBox').innerHTML = '<div class="empty">조회할 수 없는 코드입니다.</div>';
        showScreen('publicScreen');
        return;
      }
      currentDetailLink = item.qrLink;
      if (isServiceShareBlocked(item)) {
        document.getElementById('publicBox').innerHTML = renderServiceBlockedBox(item);
        showScreen('publicScreen');
        return;
      }
      const paused = isQrPaused(item);
      const recipientView = getRecipientViewModule();
      const publicDocs = getAttachedDisplayDocs(item);
      const docHtml = publicDocs.map((doc, index) => renderPublicDocLine(doc, item.code, index)).join('');
      document.getElementById('publicBox').innerHTML =
        '<div class="manager-received-hero"><div class="eyebrow">QR 서류 확인 화면</div><h3>' + escapeHtml(getShareItemLabel(item)) + ' 서류</h3><p>QR을 찍은 현장 담당자가 보는 화면입니다. 장비명과 장비번호를 먼저 보여줍니다.</p></div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        renderShortcutPanel(item) +
        renderPrintToolbar(item, true) +
        '<h3 style="margin-top:14px">서류 상태</h3>' + renderPrintSelectRow(item.code) + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>') +
        (recipientView.renderSponsorBox ? recipientView.renderSponsorBox() : '<div class="sponsor-box"><div class="small">운영·개발: 제이에스건설</div><a href="https://www.songwongeo.co.kr" target="_blank" rel="noopener">송원건설 홈페이지 바로가기</a></div>');
      showScreen('publicScreen');
    }


    function renderPrintToolbar(item, showSelection) {
      if (!item) return '';
      const recipientView = getRecipientViewModule();
      if (recipientView.renderDownloadToolbar) {
        return recipientView.renderDownloadToolbar(item, {
          mode:'public',
          showSelection: !!showSelection,
          deps:{ getDisplayDocs:getAttachedDisplayDocs, getDocPagesFromDoc, expandPrintablePages, escapeJs }
        });
      }
      const code = item.code || '';
      const printableCount = getAttachedDisplayDocs(item).reduce((sum, doc) => sum + expandPrintablePages([doc]).length, 0);
      const attachedPageCount = getAttachedDisplayDocs(item).reduce((sum, doc) => sum + getDocPagesFromDoc(doc).length, 0);
      return '<div class="print-toolbar download-toolbar">' +
        '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
        '<button type="button" class="okBtn" onclick="downloadAllDocsBundle(\'' + escapeJs(code) + '\')">전체 서류 다운로드</button>' +
        '<button type="button" class="primary" onclick="printAllDocs(\'' + escapeJs(code) + '\')">전체 서류 인쇄</button>' +
        (showSelection ? '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' : '') +
        (showSelection ? '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' : '') +
        (showSelection ? '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + escapeJs(code) + '\')">선택 다운로드</button>' : '<button type="button" class="okBtn" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 다운로드</button>') +
        (showSelection ? '<button type="button" class="primary" onclick="printSelectedDocs(\'' + escapeJs(code) + '\')">선택 인쇄</button>' : '<button type="button" class="primary" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 인쇄</button>') +
      '</div>';
    }

    function renderPrintSelectRow(code) {
      return '';
    }

    function selectAllPrintDocs(checked) {
      document.querySelectorAll('[data-print-doc-check]').forEach(input => {
        if (!input.disabled) input.checked = !!checked;
      });
    }

    function toggleSinglePrintCheck(key) {
      const input = document.querySelector('[data-print-doc-check][value="' + cssEscapeValue(key) + '"]');
      if (input && !input.disabled) input.checked = !input.checked;
    }

    function getSelectedPrintKeys() {
      return Array.from(document.querySelectorAll('[data-print-doc-check]:checked')).map(input => input.value);
    }

    function getSelectedPrintDocKeys() {
      return getSelectedPrintKeys();
    }

    function openPublicDocPreview(code, key) {
      const item = getRuntimeItemByCode(code);
      const doc = item ? getAttachedDisplayDocs(item).find(d => d.key === key) : null;
      if (!doc || !doc.fileName) { alert('미첨부 서류입니다.'); return; }
      const pages = getDocPagesFromDoc(doc);
      const firstPreview = pages.find(page => page.previewDataUrl);
      if (firstPreview) { openPreviewModal(firstPreview.previewDataUrl); return; }
      if (doc.previewDataUrl) { openPreviewModal(doc.previewDataUrl); return; }
      alert('현재 베타 저장본에는 크게 볼 이미지가 없습니다.\nPDF 원본보기/서버 파일보기는 다음 서버 저장 단계에서 붙입니다.\n\n파일명: ' + (doc.fileName || ''));
    }

    function printAllDocs(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const docs = getAttachedDisplayDocs(item);
      printDocs(item, docs);
    }

    function printSelectedDocs(code) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const keys = getSelectedPrintKeys();
      if (!keys.length) { alert('인쇄할 서류를 체크해주세요.'); return; }
      const docs = getDocsByKeys(item, keys);
      printDocs(item, docs);
    }

    function printSingleDoc(code, key) {
      const item = getRuntimeItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const docs = getDocsByKeys(item, [key]);
      printDocs(item, docs);
    }

    function printDocs(item, docs) {
      const out = getDocumentOutputModule();
      if (out.printDocs) return out.printDocs(item, docs, getDocumentOutputDeps());
      alert('문서 인쇄 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }


    function expandPrintablePages(docs) {
      const out = getDocumentOutputModule();
      if (out.expandPrintablePages) return out.expandPrintablePages(docs, getDocumentOutputDeps());
      return [];
    }


    function expandBlockedPages(docs) {
      const out = getDocumentOutputModule();
      if (out.expandBlockedPages) return out.expandBlockedPages(docs, getDocumentOutputDeps());
      return [];
    }


    function buildPrintHtml(item, pages, blockedPages) {
      const out = getDocumentOutputModule();
      if (out.buildPrintHtml) return out.buildPrintHtml(item, pages, blockedPages, getDocumentOutputDeps());
      return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>SitePass</title></head><body>문서 인쇄 기능 파일을 불러오지 못했습니다.</body></html>';
    }


    function renderPlainExtra(doc) {
      const out = getDocumentOutputModule();
      if (out.renderPlainExtra) return out.renderPlainExtra(doc, getDocumentOutputDeps());
      return '';
    }

