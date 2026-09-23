(function () {
  'use strict';

  if (window.__SITEPASS_SHADOW_LOOKUP_V698_INSTALLED) return;
  window.__SITEPASS_SHADOW_LOOKUP_V698_INSTALLED = true;

  var VERSION = '23.7.698-75-shadow-lookup-scale';
  var PAGE_SIZE = 50;
  var MAX_LIST_PAGES = 100;
  var DETAIL_BATCH_SIZE = 10;
  var DETAIL_CONCURRENCY = 3;
  var DETAIL_BATCH_PAUSE_MS = 60;
  var AUTO_THROTTLE_MS = 60000;

  var runningPromise = null;
  var scheduledTimer = null;
  var lastAutoStartedAt = 0;
  var lastResult = null;

  function parseRpcData(value) {
    var parsed = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {}
    }
    return parsed;
  }

  function errorText(error) {
    if (!error) return 'UNKNOWN_ERROR';
    return String(
      error.message ||
      error.details ||
      error.hint ||
      error.error_description ||
      error
    ).slice(0, 500);
  }

  function isMemberMode() {
    try {
      return !!(
        typeof window.isMemberLoggedIn === 'function' &&
        window.isMemberLoggedIn() &&
        !(
          typeof window.isAdminLoggedIn === 'function' &&
          window.isAdminLoggedIn()
        )
      );
    } catch (error) {
      return false;
    }
  }

  async function callRpc(name, params) {
    var api = window.SitePassSupabaseApi;
    if (!api || typeof api.rpc !== 'function') {
      throw new Error('SUPABASE_RPC_UNAVAILABLE');
    }

    var result = await api.rpc(name, params || {});
    if (result && result.error) throw result.error;
    return parseRpcData(result ? result.data : null);
  }

  function validArchive(data) {
    return !!(
      data &&
      typeof data === 'object' &&
      data.ok === true &&
      data.contractVersion === 'sitepass-equipment-archive-v1' &&
      data.counts &&
      data.paging &&
      Array.isArray(data.items)
    );
  }

  function validNewList(data) {
    return !!(
      data &&
      typeof data === 'object' &&
      Array.isArray(data.items)
    );
  }

  async function fetchAllOldOwned() {
    var page = 1;
    var allItems = [];
    var first = null;

    while (page <= MAX_LIST_PAGES) {
      var data = await callRpc(
        'sitepass_list_my_equipment_archive_v1',
        {
          p_page: page,
          p_page_size: PAGE_SIZE,
          p_relation_type: 'owned',
          p_search: null
        }
      );

      if (!validArchive(data)) {
        throw new Error('ARCHIVE_RESPONSE_INVALID');
      }

      if (!first) first = data;

      allItems = allItems.concat(data.items);

      var pageCount = Number(
        data.paging.pageCount ||
        data.paging.totalPages ||
        1
      );

      if (!Number.isFinite(pageCount) || pageCount < 1) {
        pageCount = 1;
      }

      if (page >= pageCount) break;
      page += 1;
    }

    if (page > MAX_LIST_PAGES) {
      throw new Error('ARCHIVE_PAGING_LIMIT_EXCEEDED');
    }

    var registeredCount = Number(
      first && first.counts
        ? first.counts.registeredCount
        : allItems.length
    );

    if (!Number.isFinite(registeredCount)) {
      registeredCount = allItems.length;
    }

    return {
      items: allItems,
      registeredCount: registeredCount
    };
  }

  async function fetchAllNewOwned() {
    var allItems = [];
    var cursorUpdatedAt = null;
    var cursorEquipmentId = null;
    var page = 0;
    var seenCursor = {};

    while (page < MAX_LIST_PAGES) {
      page += 1;

      var data = await callRpc(
        'sitepass_list_my_equipment_v1',
        {
          p_limit: PAGE_SIZE,
          p_cursor_updated_at: cursorUpdatedAt,
          p_cursor_equipment_id: cursorEquipmentId
        }
      );

      if (!validNewList(data)) {
        throw new Error('NEW_LIST_RESPONSE_INVALID');
      }

      allItems = allItems.concat(data.items);

      if (data.has_more !== true) {
        return {
          items: allItems,
          pageCount: page
        };
      }

      var nextUpdatedAt = data.next_cursor_updated_at;
      var nextEquipmentId = data.next_cursor_equipment_id;

      if (!nextUpdatedAt || !nextEquipmentId) {
        throw new Error('NEW_LIST_CURSOR_MISSING');
      }

      var cursorKey =
        String(nextUpdatedAt) + '|' + String(nextEquipmentId);

      if (seenCursor[cursorKey]) {
        throw new Error('NEW_LIST_CURSOR_REPEATED');
      }

      seenCursor[cursorKey] = true;
      cursorUpdatedAt = nextUpdatedAt;
      cursorEquipmentId = nextEquipmentId;
    }

    throw new Error('NEW_LIST_PAGING_LIMIT_EXCEEDED');
  }

  function oldEquipmentId(item) {
    return String(
      item && (
        item.equipmentId ||
        item.equipment_id
      ) || ''
    ).trim();
  }

  function oldEquipmentNo(item) {
    return String(
      item && (
        item.equipmentNo ||
        item.equipment_no
      ) || ''
    ).trim();
  }

  function newEquipmentId(item) {
    return String(
      item && (
        item.equipment_id ||
        item.equipmentId
      ) || ''
    ).trim();
  }

  function getLegacyItem(code) {
    var key = String(code || '').trim();
    if (!key) return null;

    try {
      if (typeof window.getItemByCode === 'function') {
        var direct = window.getItemByCode(key);
        if (direct) return direct;
      }
    } catch (error) {}

    try {
      var runtimeMap = window.sitePassArchiveRuntimeItemsV562;
      if (runtimeMap && typeof runtimeMap.get === 'function') {
        var runtime = runtimeMap.get(key);
        if (runtime) return runtime;
      }
    } catch (error2) {}

    try {
      var snapshotMap = window.sitePassArchiveItemSnapshotV538;
      if (snapshotMap && typeof snapshotMap.get === 'function') {
        var snapshot = snapshotMap.get(key);
        if (snapshot) return snapshot;
      }
    } catch (error3) {}

    return null;
  }

  function countLegacyFilesForArchiveItem(archiveItem) {
    var summary =
      archiveItem &&
      archiveItem.documentSummary &&
      typeof archiveItem.documentSummary === 'object'
        ? archiveItem.documentSummary
        : {};

    var documentTypes = Array.isArray(summary.documentTypes)
      ? summary.documentTypes.slice()
      : [];

    var legacy = getLegacyItem(archiveItem ? archiveItem.code : '');
    var docs =
      legacy &&
      legacy.docs &&
      typeof legacy.docs === 'object'
        ? legacy.docs
        : null;

    if (!docs) {
      return {
        available: false,
        count: null,
        reason: 'LEGACY_ITEM_DOCS_UNAVAILABLE'
      };
    }

    if (!documentTypes.length) {
      return {
        available: Number(summary.documentCount || 0) === 0,
        count: Number(summary.documentCount || 0) === 0 ? 0 : null,
        reason:
          Number(summary.documentCount || 0) === 0
            ? ''
            : 'ARCHIVE_DOCUMENT_TYPES_UNAVAILABLE'
      };
    }

    var total = 0;

    for (var i = 0; i < documentTypes.length; i += 1) {
      var type = String(documentTypes[i] || '');
      var doc = docs[type];

      if (!doc || typeof doc !== 'object') {
        return {
          available: false,
          count: null,
          reason: 'LEGACY_DOCUMENT_OBJECT_UNAVAILABLE'
        };
      }

      if (Array.isArray(doc.pages)) {
        total += doc.pages.length;
        continue;
      }

      var pageCount = Number(doc.pageCount);
      if (Number.isFinite(pageCount) && pageCount >= 0) {
        total += pageCount;
        continue;
      }

      var hasSingleFile = !!(
        doc.storagePath ||
        doc.storage_path ||
        doc.fileName ||
        doc.fileUrl ||
        doc.downloadUrl ||
        doc.previewDataUrl ||
        doc.originalDataUrl
      );

      total += hasSingleFile ? 1 : 0;
    }

    return {
      available: true,
      count: total,
      reason: ''
    };
  }

  function countNewDetail(detail) {
    var documents =
      detail && Array.isArray(detail.documents)
        ? detail.documents
        : null;

    if (!documents) {
      throw new Error('DETAIL_DOCUMENTS_INVALID');
    }

    var fileCount = 0;

    documents.forEach(function (documentRow) {
      var version =
        documentRow &&
        documentRow.current_version &&
        typeof documentRow.current_version === 'object'
          ? documentRow.current_version
          : {};

      var files = Array.isArray(version.files)
        ? version.files
        : [];

      fileCount += files.length;
    });

    return {
      documentCount: documents.length,
      fileCount: fileCount
    };
  }

  async function mapLimit(items, limit, worker) {
    var results = new Array(items.length);
    var cursor = 0;

    async function runWorker() {
      while (true) {
        var index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    }

    var workers = [];
    var workerCount = Math.min(limit, items.length);

    for (var i = 0; i < workerCount; i += 1) {
      workers.push(runWorker());
    }

    await Promise.all(workers);
    return results;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function mapInBatches(items, batchSize, concurrency, pauseMs, worker) {
    var results = new Array(items.length);
    var safeBatchSize = Math.max(1, Number(batchSize) || 1);
    var safeConcurrency = Math.max(1, Number(concurrency) || 1);
    var totalBatches = Math.ceil(items.length / safeBatchSize);

    for (var batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
      var start = batchIndex * safeBatchSize;
      var batch = items.slice(start, start + safeBatchSize);

      var batchResults = await mapLimit(
        batch,
        safeConcurrency,
        async function (item, localIndex) {
          return worker(item, start + localIndex);
        }
      );

      for (var i = 0; i < batchResults.length; i += 1) {
        results[start + i] = batchResults[i];
      }

      if (
        batchIndex + 1 < totalBatches &&
        Number(pauseMs) > 0
      ) {
        await sleep(Number(pauseMs));
      }
    }

    return {
      results: results,
      totalBatches: totalBatches
    };
  }

  function sortedUnique(values) {
    return Array.from(
      new Set(
        values
          .map(function (value) {
            return String(value || '').trim();
          })
          .filter(Boolean)
      )
    ).sort();
  }

  function setLast(result, logLevel) {
    lastResult = result;

    try {
      window.__SITEPASS_SHADOW_LOOKUP_V698_LAST = result;
    } catch (error) {}

    try {
      if (logLevel === 'warn') {
        console.warn('[SitePass Step75 Shadow]', result);
      } else {
        console.info('[SitePass Step75 Shadow]', result);
      }
    } catch (error2) {}

    return result;
  }

  async function executeShadow(reason) {
    if (!isMemberMode()) {
      return setLast(
        {
          result: 'SITEPASS_STEP75_SHADOW_LOOKUP_SKIPPED_NOT_MEMBER',
          version: VERSION,
          reason: String(reason || ''),
          uiUntouched: true,
          persistentWrite: false
        },
        'info'
      );
    }

    try {
      var oldOwned = await fetchAllOldOwned();
      var newOwned = await fetchAllNewOwned();

      var oldIds = sortedUnique(
        oldOwned.items.map(oldEquipmentId)
      );

      var newIds = sortedUnique(
        newOwned.items.map(newEquipmentId)
      );

      var missingInNew = oldIds.filter(function (id) {
        return newIds.indexOf(id) < 0;
      });

      var unexpectedInNew = newIds.filter(function (id) {
        return oldIds.indexOf(id) < 0;
      });

      var equipmentCountMatch =
        oldOwned.registeredCount === newOwned.items.length &&
        oldIds.length === newIds.length &&
        missingInNew.length === 0 &&
        unexpectedInNew.length === 0;

      var oldById = {};
      oldOwned.items.forEach(function (item) {
        var id = oldEquipmentId(item);
        if (id) oldById[id] = item;
      });

      var detailBatchResult = await mapInBatches(
        newOwned.items,
        DETAIL_BATCH_SIZE,
        DETAIL_CONCURRENCY,
        DETAIL_BATCH_PAUSE_MS,
        async function (newItem) {
          var id = newEquipmentId(newItem);
          var oldItem = oldById[id] || null;

          if (!oldItem) {
            return {
              equipmentId: id,
              equipmentNo: '',
              oldDocumentCount: null,
              newDocumentCount: null,
              oldFileCount: null,
              newFileCount: null,
              documentMatch: false,
              fileMatch: false,
              oldFileCountAvailable: false,
              reason: 'OLD_ARCHIVE_ITEM_MISSING'
            };
          }

          var detail = await callRpc(
            'sitepass_get_equipment_detail_v1',
            {
              p_equipment_id: id
            }
          );

          var newCounts = countNewDetail(detail);

          var summary =
            oldItem.documentSummary &&
            typeof oldItem.documentSummary === 'object'
              ? oldItem.documentSummary
              : {};

          var oldDocumentCount = Number(
            summary.documentCount || 0
          );

          var legacyFiles =
            countLegacyFilesForArchiveItem(oldItem);

          return {
            equipmentId: id,
            equipmentNo: oldEquipmentNo(oldItem),
            oldDocumentCount: oldDocumentCount,
            newDocumentCount: newCounts.documentCount,
            oldFileCount: legacyFiles.count,
            newFileCount: newCounts.fileCount,
            documentMatch:
              oldDocumentCount === newCounts.documentCount,
            fileMatch:
              legacyFiles.available === true &&
              legacyFiles.count === newCounts.fileCount,
            oldFileCountAvailable: legacyFiles.available,
            oldFileCountUnavailableReason:
              legacyFiles.reason || ''
          };
        }
      );

      var perEquipment = detailBatchResult.results;

      var oldDocumentTotal = 0;
      var newDocumentTotal = 0;
      var oldFileTotal = 0;
      var newFileTotal = 0;
      var allOldFileCountsAvailable = true;
      var documentMismatchCount = 0;
      var fileMismatchCount = 0;

      perEquipment.forEach(function (row) {
        oldDocumentTotal += Number(
          row.oldDocumentCount || 0
        );
        newDocumentTotal += Number(
          row.newDocumentCount || 0
        );

        if (row.oldFileCountAvailable !== true) {
          allOldFileCountsAvailable = false;
        } else {
          oldFileTotal += Number(row.oldFileCount || 0);
        }

        newFileTotal += Number(row.newFileCount || 0);

        if (row.documentMatch !== true) {
          documentMismatchCount += 1;
        }

        if (
          row.oldFileCountAvailable === true &&
          row.fileMatch !== true
        ) {
          fileMismatchCount += 1;
        }
      });

      var documentCountMatch =
        documentMismatchCount === 0 &&
        oldDocumentTotal === newDocumentTotal;

      var fileCountMatch =
        allOldFileCountsAvailable &&
        fileMismatchCount === 0 &&
        oldFileTotal === newFileTotal;

      var resultCode;

      if (!allOldFileCountsAvailable) {
        resultCode =
          'SITEPASS_STEP75_SHADOW_LOOKUP_INCONCLUSIVE_LEGACY_FILE_COUNT';
      } else if (
        equipmentCountMatch &&
        documentCountMatch &&
        fileCountMatch
      ) {
        resultCode =
          'SITEPASS_STEP75_SHADOW_LOOKUP_MATCH';
      } else {
        resultCode =
          'SITEPASS_STEP75_SHADOW_LOOKUP_MISMATCH_DETECTED';
      }

      return setLast(
        {
          result: resultCode,
          version: VERSION,
          reason: String(reason || ''),
          equipment: {
            oldRegisteredCount: oldOwned.registeredCount,
            oldFetchedCount: oldOwned.items.length,
            newCount: newOwned.items.length,
            exactMatch: equipmentCountMatch,
            missingInNewCount: missingInNew.length,
            unexpectedInNewCount: unexpectedInNew.length
          },
          documents: {
            oldCount: oldDocumentTotal,
            newCount: newDocumentTotal,
            exactMatch: documentCountMatch,
            mismatchEquipmentCount: documentMismatchCount
          },
          files: {
            oldCount:
              allOldFileCountsAvailable
                ? oldFileTotal
                : null,
            newCount: newFileTotal,
            oldCountAvailable: allOldFileCountsAvailable,
            exactMatch: fileCountMatch,
            mismatchEquipmentCount: fileMismatchCount
          },
          scale: {
            equipmentProcessed: perEquipment.length,
            detailBatchSize: DETAIL_BATCH_SIZE,
            detailConcurrency: DETAIL_CONCURRENCY,
            detailBatchPauseMs: DETAIL_BATCH_PAUSE_MS,
            detailBatchCount: detailBatchResult.totalBatches,
            fullDetailComparisonCompleted: true
          },
          perEquipment: perEquipment,
          uiUntouched: true,
          persistentWrite: false
        },
        resultCode === 'SITEPASS_STEP75_SHADOW_LOOKUP_MATCH'
          ? 'info'
          : 'warn'
      );
    } catch (error) {
      return setLast(
        {
          result:
            'SITEPASS_STEP75_SHADOW_LOOKUP_ERROR_DETECTED',
          version: VERSION,
          reason: String(reason || ''),
          error: errorText(error),
          uiUntouched: true,
          persistentWrite: false
        },
        'warn'
      );
    }
  }

  function runNow(reason) {
    if (runningPromise) return runningPromise;

    runningPromise = executeShadow(
      reason || 'manual'
    );

    return runningPromise.finally(function () {
      runningPromise = null;
    });
  }

  function schedule(reason) {
    if (!isMemberMode()) return;

    var now = Date.now();
    if (
      now - lastAutoStartedAt <
      AUTO_THROTTLE_MS
    ) {
      return;
    }

    if (scheduledTimer) {
      clearTimeout(scheduledTimer);
    }

    scheduledTimer = setTimeout(function () {
      scheduledTimer = null;

      if (!isMemberMode()) return;

      lastAutoStartedAt = Date.now();

      runNow(reason || 'auto').catch(function () {
        /* runNow 자체가 오류를 결과로 격리하므로 UI로 전파하지 않는다. */
      });
    }, 250);
  }

  window.SitePassShadowLookupV698 = {
    version: VERSION,
    runNow: runNow,
    schedule: schedule,
    getLast: function () {
      return lastResult;
    },
    getLimits: function () {
      return {
        pageSize: PAGE_SIZE,
        maxListPages: MAX_LIST_PAGES,
        detailBatchSize: DETAIL_BATCH_SIZE,
        detailConcurrency: DETAIL_CONCURRENCY,
        detailBatchPauseMs: DETAIL_BATCH_PAUSE_MS,
        fixedDetailEquipmentLimit: null
      };
    }
  };

  try {
    window.addEventListener(
      'sitepass-member-equipment-sync-v491',
      function () {
        schedule('member-equipment-sync');
      }
    );

    window.addEventListener(
      'pageshow',
      function () {
        schedule('pageshow');
      }
    );
  } catch (error) {}

  try {
    setTimeout(function () {
      schedule('initial');
    }, 1200);
  } catch (error2) {}
})();
