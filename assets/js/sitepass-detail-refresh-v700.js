/* SitePass v23.7.700-75-detail-refresh-restore-v2
   Scope: member equipment detail refresh restoration only.
   - Do NOT store detailScreen in sitepass_last_screen_v491.
   - Keep the existing listScreen boot path intact.
   - On an actual browser reload only, reopen the exact remembered detail
     after the existing member equipment sync finishes.
   - Existing renderDetail() rebuilds document URLs and recipient QR/link.
   - No DB/RPC/RLS/Storage writes are introduced here.
*/
(function () {
  'use strict';

  var VERSION = '23.7.700-75-detail-refresh-restore-v2';
  var LEGACY_SCREEN_KEY = 'sitepass_last_screen_v491';
  var DETAIL_CODE_KEY = 'sitepass_last_detail_code_v700';
  var DETAIL_ACTIVE_KEY = 'sitepass_detail_active_v700';
  var BROKEN_V699_DETAIL_CODE_KEY = 'sitepass_last_detail_code_v699';

  var restoring = false;
  var restoreDone = false;
  var restoreTimer = null;
  var restoreVisualGuardActive = false;

  function holdRestoreVisualGuard() {
    if (!restoreRequestedAtStartup) return false;
    try {
      document.body.classList.add('sitepass-booting');
      restoreVisualGuardActive = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function releaseRestoreVisualGuard() {
    if (!restoreVisualGuardActive) return false;
    try {
      document.body.classList.remove('sitepass-booting');
    } catch (e) {}
    restoreVisualGuardActive = false;
    return true;
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function safeGet(key) {
    try { return text(sessionStorage.getItem(key)); } catch (e) { return ''; }
  }

  function safeSet(key, value) {
    try { sessionStorage.setItem(key, String(value)); return true; } catch (e) { return false; }
  }

  function safeRemove(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  function isReloadNavigation() {
    try {
      var entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (entries && entries.length && String(entries[0].type || '') === 'reload') return true;
    } catch (e) {}
    try {
      if (performance.navigation && Number(performance.navigation.type) === 1) return true;
    } catch (e) {}
    return false;
  }

  /*
    V699 wrote an unsupported screen id into the shared boot key.
    Clean only that exact broken value. All valid existing screen values stay untouched.
  */
  var legacyScreenAtLoad = safeGet(LEGACY_SCREEN_KEY);
  var brokenV699CodeAtLoad = safeGet(BROKEN_V699_DETAIL_CODE_KEY);
  if (legacyScreenAtLoad === 'detailScreen') {
    safeSet(LEGACY_SCREEN_KEY, 'listScreen');
  }
  if (!safeGet(DETAIL_CODE_KEY) && brokenV699CodeAtLoad) {
    safeSet(DETAIL_CODE_KEY, brokenV699CodeAtLoad);
  }

  /*
    Capture refresh intent before the normal boot changes screens.
    We restore only for a true reload and only when the previous page was detail.
  */
  var restoreRequestedAtStartup =
    isReloadNavigation() &&
    (
      safeGet(DETAIL_ACTIVE_KEY) === '1' ||
      legacyScreenAtLoad === 'detailScreen'
    ) &&
    !!safeGet(DETAIL_CODE_KEY);

  function currentDetailCode() {
    return text(
      window.sitePassCurrentDetailCodeV519 ||
      safeGet(DETAIL_CODE_KEY)
    );
  }

  function rememberDetail(code) {
    code = text(code);
    if (!code) return false;
    safeSet(DETAIL_CODE_KEY, code);
    safeSet(DETAIL_ACTIVE_KEY, '1');
    return true;
  }

  function clearDetailActive() {
    safeRemove(DETAIL_ACTIVE_KEY);
  }

  function wrapRenderDetail() {
    if (window.__sitepassDetailRefreshRenderWrappedV700) return true;
    if (typeof window.renderDetail !== 'function') return false;

    var previous = window.renderDetail;
    window.__sitepassOriginalRenderDetailV700 = previous;

    window.renderDetail = function (code) {
      var normalized = text(code);
      if (normalized) rememberDetail(normalized);
      return previous.apply(this, arguments);
    };

    window.__sitepassDetailRefreshRenderWrappedV700 = true;
    return true;
  }

  function wrapShowScreen() {
    if (window.__sitepassDetailRefreshShowScreenWrappedV700) return true;
    if (typeof window.showScreen !== 'function') return false;

    var previous = window.showScreen;
    window.__sitepassOriginalShowScreenV700 = previous;

    window.showScreen = function (id, options) {
      var target = text(id);

      /*
        Normal SPA navigation away from detail must cancel stale restore state.
        During startup restore, the normal boot may briefly open listScreen;
        restoreRequestedAtStartup is already captured in this closure, so clearing
        DETAIL_ACTIVE_KEY here cannot cancel the current reload restoration.
      */
      if (target && target !== 'detailScreen') {
        clearDetailActive();
      }

      /*
        The reload restoration must not push an extra history entry.
        The existing boot already replaced the current entry with listScreen.
        We reuse the same current entry for detail and keep browser Back = list.
      */
      if (restoring && target === 'detailScreen') {
        var merged = Object.assign({}, options || {}, { skipHistory:true });
        var detailResult = previous.call(this, target, merged);
        releaseRestoreVisualGuard();
        return detailResult;
      }

      if (
        restoreRequestedAtStartup &&
        !restoreDone &&
        target === 'listScreen'
      ) {
        /*
          Keep the locked V700 list boot path intact, including render/sync.
          showScreen() removes sitepass-booting internally, so reapply the
          existing boot mask synchronously before the browser can paint list.
        */
        var listResult = previous.apply(this, arguments);
        holdRestoreVisualGuard();
        return listResult;
      }

      return previous.apply(this, arguments);
    };

    window.__sitepassDetailRefreshShowScreenWrappedV700 = true;
    return true;
  }

  function loggedMember() {
    try {
      return typeof window.isMemberLoggedIn === 'function' &&
             window.isMemberLoggedIn() &&
             !(
               typeof window.isAdminLoggedIn === 'function' &&
               window.isAdminLoggedIn()
             );
    } catch (e) {
      return false;
    }
  }

  function memberSyncFinished() {
    return window.sitePassMemberEquipmentInitialSyncPendingV491 === false;
  }

  // Step79 linked_in refresh repair:
  // Normal detail entry goes through SitePassArchiveV562.openDetail(), which
  // resolves the server detail and rebuilds the runtime item. A browser reload
  // previously skipped that path and called renderDetail() directly.
  function legacyDetailItem(code) {
    try {
      return typeof window.getItemByCode === 'function'
        ? window.getItemByCode(String(code || ''))
        : null;
    } catch (e) {
      return null;
    }
  }

  function archiveSummaryForCode(code) {
    try {
      var map = window.sitePassArchiveSummaryByCodeV562;
      return map instanceof Map
        ? (map.get(String(code || '')) || null)
        : null;
    } catch (e) {
      return null;
    }
  }

  function archiveState() {
    try {
      return window.SitePassArchiveV562 &&
             typeof window.SitePassArchiveV562.getState === 'function'
        ? window.SitePassArchiveV562.getState()
        : null;
    } catch (e) {
      return null;
    }
  }

  function finishHistoryAsDetail(code) {
    try {
      if (!window.history || !window.history.replaceState) return;
      var state = Object.assign({}, window.history.state || {}, {
        sitepassScreen: 'detailScreen',
        sitepassDetailCode: code
      });
      window.history.replaceState(
        state,
        document.title || 'SitePass',
        window.location.pathname + window.location.search + window.location.hash
      );
    } catch (e) {}
  }

  function requestRestore() {
    if (!restoreRequestedAtStartup || restoreDone || restoring) return;

    var code = safeGet(DETAIL_CODE_KEY);
    if (!code) return;

    var tries = 0;
    var maxTries = 180;

    if (restoreTimer) clearInterval(restoreTimer);

    restoreTimer = setInterval(function () {
      tries += 1;
      wrapRenderDetail();
      wrapShowScreen();

      var ready =
        loggedMember() &&
        memberSyncFinished() &&
        typeof window.renderDetail === 'function';

      if (ready) {
        var legacyItem = legacyDetailItem(code);
        var summary = archiveSummaryForCode(code);
        var archive = archiveState();

        /*
          Preserve the existing own-equipment path.
          If no legacy item exists yet, wait for the archive summary instead of
          rendering an incomplete linked item. This wait applies only while the
          archive identity has not been established.
        */
        if (
          !legacyItem &&
          !summary &&
          archive &&
          !archive.error &&
          tries < maxTries
        ) {
          return;
        }

        clearInterval(restoreTimer);
        restoreTimer = null;
        restoring = true;

        /*
          linked_in only: reuse the already-normal openDetail() path.
          This performs resolveItem() -> RPC detail -> runtime item registration
          -> signed URL preparation before renderDetail().
          All other detail restores keep the original V700 renderDetail() path.
        */
        if (
          summary &&
          String(summary.relationType || '') === 'linked_in' &&
          window.SitePassArchiveV562 &&
          typeof window.SitePassArchiveV562.openDetail === 'function'
        ) {
          var equipmentId = text(
            summary.equipmentId ||
            summary.equipment_id
          );

          if (!equipmentId) {
            restoring = false;
            releaseRestoreVisualGuard();
            console.warn('[SitePass Detail Refresh V700]', {
              result:'SITEPASS_LINKED_IN_REFRESH_EQUIPMENT_ID_MISSING',
              version:VERSION,
              code:code
            });
            return;
          }

          rememberDetail(code);

          Promise.resolve(
            window.SitePassArchiveV562.openDetail(
              equipmentId,
              code
            )
          ).then(function () {
            var runtimeMap =
              window.sitePassArchiveRuntimeItemsV562;
            var runtimeItem =
              runtimeMap instanceof Map
                ? runtimeMap.get(String(code || ''))
                : null;

            if (!runtimeItem) {
              throw new Error(
                'linked_in runtime item was not restored'
              );
            }

            finishHistoryAsDetail(code);
            restoreDone = true;

            console.info('[SitePass Detail Refresh V700]', {
              result:'SITEPASS_LINKED_IN_DETAIL_REFRESH_RESTORED',
              version:VERSION,
              code:code,
              equipmentId:equipmentId,
              memberSyncError:
                window.sitePassMemberEquipmentInitialSyncErrorV491 === true
            });
          }).catch(function (error) {
            releaseRestoreVisualGuard();
            console.warn(
              '[SitePass Detail Refresh V700] linked_in restore failed:',
              error
            );
          }).finally(function () {
            restoring = false;
          });

          return;
        }

        try {
          rememberDetail(code);
          window.renderDetail(code, {
            skipServerRefresh:false,
            sitepassRefreshRestoreV700:true
          });
          finishHistoryAsDetail(code);
          restoreDone = true;

          console.info('[SitePass Detail Refresh V700]', {
            result:'SITEPASS_DETAIL_REFRESH_RESTORE_REQUESTED',
            version:VERSION,
            code:code,
            memberSyncError:window.sitePassMemberEquipmentInitialSyncErrorV491 === true
          });
        } catch (error) {
          console.warn('[SitePass Detail Refresh V700] restore failed:', error);
        } finally {
          restoring = false;
        }
        return;
      }

      if (tries >= maxTries) {
        clearInterval(restoreTimer);
        restoreTimer = null;
        releaseRestoreVisualGuard();
        console.warn('[SitePass Detail Refresh V700]', {
          result:'SITEPASS_DETAIL_REFRESH_RESTORE_TIMEOUT',
          version:VERSION,
          memberLoggedIn:loggedMember(),
          syncPending:window.sitePassMemberEquipmentInitialSyncPendingV491
        });
      }
    }, 100);
  }

  wrapRenderDetail();
  wrapShowScreen();

  document.addEventListener('DOMContentLoaded', function () {
    wrapRenderDetail();
    wrapShowScreen();
    requestRestore();
  }, { once:true });

  window.addEventListener('pageshow', function () {
    wrapRenderDetail();
    wrapShowScreen();
    requestRestore();
  });

  window.sitepassRememberDetailRefreshV700 = rememberDetail;
  window.sitepassRequestDetailRefreshRestoreV700 = requestRestore;
})();
