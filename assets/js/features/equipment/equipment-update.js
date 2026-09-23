(function () {
  'use strict';

  var activeEditBaseline = null;
  var activeEditFormBaselineV6 = '';

  function fail(message) {
    throw new Error('[SitePass Step80] equipment update API unavailable: ' + message);
  }

  function call(name) {
    var fn = window[name];
    if (typeof fn !== 'function') return fail(name);
    return fn;
  }

  function currentEditingCode() {
    try {
      return typeof editingCode !== 'undefined'
        ? String(editingCode || '').trim()
        : '';
    } catch (error) {
      return '';
    }
  }

  function setEditingCode(value) {
    if (typeof editingCode === 'undefined') {
      return fail('editingCode');
    }
    editingCode = String(value || '').trim();
    return editingCode;
  }

  function compactMediaSignatureV6(value) {
    var text = String(value || '');
    if (!text) return '';
    if (text.length <= 160) return text;
    return (
      String(text.length) +
      ':' +
      text.slice(0, 72) +
      ':' +
      text.slice(-72)
    );
  }

  function normalizeEditDocV6(doc) {
    doc = doc && typeof doc === 'object' ? doc : {};
    var pages = Array.isArray(doc.pages) ? doc.pages : [];
    return {
      key: String(doc.key || ''),
      docKind: String(doc.docKind || ''),
      groupKey: String(doc.groupKey || ''),
      fileName: String(doc.fileName || ''),
      fileSource: String(doc.fileSource || ''),
      fileType: String(doc.fileType || ''),
      expireDate: String(doc.expireDate || ''),
      driverPhone: String(doc.driverPhone || ''),
      workerPhone: String(doc.workerPhone || ''),
      personPhone: String(doc.personPhone || ''),
      workerTask: String(doc.workerTask || ''),
      authVerified: doc.authVerified === true,
      authVerifiedAt: String(doc.authVerifiedAt || ''),
      pages: pages.map(function (page) {
        page = page && typeof page === 'object' ? page : {};
        return {
          fileName: String(page.fileName || ''),
          fileSource: String(page.fileSource || ''),
          fileType: String(page.fileType || ''),
          storageBucket: String(
            page.storageBucket || page.storage_bucket || ''
          ),
          storagePath: String(
            page.storagePath ||
            page.storage_path ||
            page.filePath ||
            page.file_path ||
            ''
          ),
          previewDataUrl: compactMediaSignatureV6(
            page.previewDataUrl
          ),
          originalDataUrl: compactMediaSignatureV6(
            page.originalDataUrl
          ),
          correctedDataUrl: compactMediaSignatureV6(
            page.correctedDataUrl
          ),
          editDataUrl: compactMediaSignatureV6(
            page.editDataUrl
          ),
          fileDataUrl: compactMediaSignatureV6(
            page.fileDataUrl
          ),
          fileObjectUrl: compactMediaSignatureV6(
            page.fileObjectUrl
          )
        };
      }),
      previewDataUrl: compactMediaSignatureV6(
        doc.previewDataUrl
      ),
      originalDataUrl: compactMediaSignatureV6(
        doc.originalDataUrl
      ),
      correctedDataUrl: compactMediaSignatureV6(
        doc.correctedDataUrl
      ),
      editDataUrl: compactMediaSignatureV6(
        doc.editDataUrl
      ),
      fileDataUrl: compactMediaSignatureV6(
        doc.fileDataUrl
      ),
      storagePath: String(
        doc.storagePath ||
        doc.storage_path ||
        doc.filePath ||
        doc.file_path ||
        ''
      )
    };
  }

  function captureEditFormSnapshotV6() {
    var docs = call('collectDocData')() || {};
    var docKeys = Object.keys(docs).sort();
    var includeDriver =
      document.getElementById('includeDriverDocs');
    var includeWorker =
      document.getElementById('includeWorkerDocs');
    var equipmentNo =
      document.getElementById('equipmentNo');
    var equipmentName =
      document.getElementById('equipmentName');

    var workers = [];
    try {
      if (
        typeof window.collectWorkerPeopleMeta ===
        'function'
      ) {
        workers = window.collectWorkerPeopleMeta() || [];
      }
    } catch (error) {}

    return JSON.stringify({
      equipmentNo: String(
        equipmentNo ? equipmentNo.value || '' : ''
      ).trim(),
      equipmentName: String(
        equipmentName ? equipmentName.value || '' : ''
      ).trim(),
      includeDriver: !!(includeDriver && includeDriver.checked),
      includeWorker: !!(includeWorker && includeWorker.checked),
      workerPeople: workers,
      docs: docKeys.map(function (key) {
        var normalized = normalizeEditDocV6(docs[key]);
        normalized.key = key;
        return normalized;
      })
    });
  }

  function refreshEditFormBaselineV6() {
    try {
      activeEditFormBaselineV6 =
        captureEditFormSnapshotV6();
      return true;
    } catch (error) {
      activeEditFormBaselineV6 = '';
      return false;
    }
  }

  function hasUnsavedEditChangesV6() {
    if (!currentEditingCode()) return false;
    if (!activeEditFormBaselineV6) return true;
    try {
      return (
        captureEditFormSnapshotV6() !==
        activeEditFormBaselineV6
      );
    } catch (error) {
      return true;
    }
  }

  function wireEditUiBoundary() {
    var banner = document.getElementById('editModeBanner');
    if (banner) {
      var cancelButton = banner.querySelector('button');
      if (cancelButton) {
        cancelButton.removeAttribute('onclick');
        cancelButton.onclick = function () {
          return api.cancel();
        };
      }
    }

    if (typeof window.sitePassApplyRegistrationStep472 === 'function') {
      window.sitePassApplyRegistrationStep472(
        'equipment',
        { persist: true, scroll: false }
      );
    }
  }

  function hasRealDocumentAttachment(doc) {
    var upload =
      window.SitePassDocument &&
      window.SitePassDocument.upload;
    if (
      upload &&
      typeof upload.hasRealAttachment === 'function'
    ) {
      return upload.hasRealAttachment(doc);
    }
    return !!(
      doc &&
      String(doc.fileName || '').trim()
    );
  }

  function validateFormForUpdate(oldItem) {
    var equipmentNoEl = document.getElementById('equipmentNo');
    var equipmentNameEl = document.getElementById('equipmentName');
    var equipmentNo = String(
      equipmentNoEl ? equipmentNoEl.value || '' : ''
    ).trim();
    var equipmentName = String(
      equipmentNameEl ? equipmentNameEl.value || '' : ''
    ).trim();

    if (!equipmentNo) {
      alert('장비 등록번호를 입력해주세요.');
      if (typeof window.focusAndScrollToMissingTarget === 'function') {
        window.focusAndScrollToMissingTarget(equipmentNoEl);
      }
      return null;
    }

    if (!equipmentName) {
      alert('장비명을 입력해주세요.');
      if (typeof window.focusAndScrollToMissingTarget === 'function') {
        window.focusAndScrollToMissingTarget(equipmentNameEl);
      }
      return null;
    }

    var originalEquipmentNo =
      String(oldItem && oldItem.equipmentNo || '').trim();

    if (
      originalEquipmentNo &&
      equipmentNo !== originalEquipmentNo
    ) {
      alert(
        '수정 중에는 장비 등록번호를 변경할 수 없습니다. ' +
        '기존 장비번호를 유지한 상태에서 다시 시도해주세요.'
      );
      if (equipmentNoEl) equipmentNoEl.value = originalEquipmentNo;
      return null;
    }

    var docs = call('collectDocData')();
    var activeDefs = call('getActiveDocDefs')();
    var workerValidation = call('validateWorkerPeople')(docs);
    var missingFiles = activeDefs
      .filter(function (def) {
        return (
          def.required &&
          !hasRealDocumentAttachment(docs[def.key])
        );
      })
      .map(function (def) {
        return def.groupTitle + ' - ' + def.title;
      });
    var missingDates = activeDefs
      .filter(function (def) {
        return (
          def.required &&
          def.expiry &&
          !(docs[def.key] && docs[def.key].expireDate)
        );
      })
      .map(function (def) {
        return def.groupTitle + ' - ' + def.title + ' 날짜';
      });

    activeDefs
      .filter(function (def) { return def.optionalExpiry; })
      .forEach(function (def) {
        var doc = docs[def.key];
        if (
          hasRealDocumentAttachment(doc) &&
          !doc.expireDate
        ) {
          missingDates.push(
            def.groupTitle + ' - ' + def.title + ' 날짜'
          );
        }
      });

    if (
      workerValidation &&
      Array.isArray(workerValidation.missingFiles)
    ) {
      missingFiles.push.apply(
        missingFiles,
        workerValidation.missingFiles
      );
    }

    var missingAuth = Object.values(docs)
      .filter(function (doc) {
        return (
          doc &&
          doc.groupKey !== 'equipment' &&
          hasRealDocumentAttachment(doc) &&
          !doc.authVerified
        );
      })
      .map(function (doc) {
        return (
          (doc.groupTitle || '개인정보서류') +
          ' - ' +
          doc.title
        );
      });

    if (missingAuth.length) {
      alert(
        '인증 미완료 서류가 있습니다.\n\n' +
        missingAuth.join('\n')
      );
      var firstAuthDoc = Object.values(docs).find(
        function (doc) {
          return (
            doc &&
            doc.groupKey !== 'equipment' &&
            hasRealDocumentAttachment(doc) &&
            !doc.authVerified
          );
        }
      );
      if (
        firstAuthDoc &&
        typeof window.focusDocMissingField === 'function'
      ) {
        window.focusDocMissingField(firstAuthDoc, 'file');
      }
      return null;
    }

    if (missingFiles.length || missingDates.length) {
      alert(
        '필수 항목을 확인해주세요.\n\n' +
        '미첨부 서류:\n' +
        (missingFiles.join('\n') || '없음') +
        '\n\n미입력 날짜:\n' +
        (missingDates.join('\n') || '없음') +
        '\n\n확인을 누르면 첫 번째 미입력 위치로 자동 이동합니다.'
      );
      if (
        typeof window.focusFirstMissingRequiredItem ===
        'function'
      ) {
        window.focusFirstMissingRequiredItem(
          activeDefs,
          docs,
          workerValidation
        );
      }
      return null;
    }

    return {
      equipmentNo: originalEquipmentNo || equipmentNo,
      equipmentName: equipmentName,
      docs: docs
    };
  }

  async function saveUpdateOnly() {
    var targetCode = currentEditingCode();
    if (!targetCode) {
      return {
        ok: false,
        reason: 'no-edit-target',
        writes: 0
      };
    }

    var items = call('getItems')();
    var editIndex = items.findIndex(function (item) {
      return (
        String(item && item.code || '').trim() === targetCode
      );
    });

    if (editIndex < 0) {
      alert(
        '수정 대상 장비를 찾지 못해 저장을 중단했습니다. ' +
        '새 장비 등록으로 전환하지 않습니다.'
      );
      return {
        ok: false,
        reason: 'edit-target-not-found',
        writes: 0
      };
    }

    var listedItem = items[editIndex];
    var oldItem =
      activeEditBaseline &&
      String(activeEditBaseline.code || '').trim() === targetCode
        ? activeEditBaseline
        : listedItem;
    var form = validateFormForUpdate(oldItem);
    if (!form) {
      return {
        ok: false,
        reason: 'validation-failed',
        writes: 0
      };
    }

    var bundleMeta = call('getBundleMeta')();
    var nowIso = new Date().toISOString();
    var item = Object.assign({}, oldItem, {
      code: oldItem.code,
      type: oldItem.type || 'BUNDLE',
      equipmentNo: form.equipmentNo,
      equipmentName: form.equipmentName,
      bundleMeta: bundleMeta,
      workerPeople:
        bundleMeta &&
        Array.isArray(bundleMeta.workerPeople)
          ? bundleMeta.workerPeople
          : [],
      docs: form.docs,
      createdAt: oldItem.createdAt || nowIso,
      updatedAt: nowIso
    });

    if (
      typeof window.sitePassValidateRegistrationItemForSave ===
      'function'
    ) {
      var attachmentCheck =
        window.sitePassValidateRegistrationItemForSave(item);
      if (
        !attachmentCheck ||
        attachmentCheck.ok === false
      ) {
        alert(
          attachmentCheck &&
          attachmentCheck.message ||
          '첨부서류 사진 데이터가 없어 수정을 중단합니다. 서류를 다시 첨부해주세요.'
        );
        return {
          ok: false,
          reason: 'attachment-validation-failed',
          writes: 0
        };
      }
    }

    item.updateHistory = Array.isArray(oldItem.updateHistory)
      ? oldItem.updateHistory.slice()
      : [];

    if (
      typeof window.requirePrivateEditReverification ===
      'function' &&
      !window.requirePrivateEditReverification(oldItem, item)
    ) {
      return {
        ok: false,
        reason: 'private-reverification-failed',
        writes: 0
      };
    }

    if (typeof window.buildUpdateSummary === 'function') {
      item.updateHistory.unshift({
        at: nowIso,
        summary: window
          .buildUpdateSummary(oldItem, item)
          .slice(0, 12)
      });
    }

    if (
      typeof window.setSitePassRegistrationUploadBusyV515 ===
      'function'
    ) {
      window.setSitePassRegistrationUploadBusyV515(
        true,
        '서류 저장중'
      );
    }

    var editUploadResult = null;
    try {
      try {
        if (
          typeof window.saveRegistrationDraftNow ===
          'function'
        ) {
          window.saveRegistrationDraftNow();
        }
      } catch (error) {}

      var documentUpload =
        window.SitePassDocument &&
        window.SitePassDocument.upload;
      if (
        !documentUpload ||
        typeof documentUpload.persistEquipmentDocuments !== 'function'
      ) {
        throw new Error(
          '[SitePass Step81] document upload public API unavailable'
        );
      }
      var editProgress =
        typeof window.updateSitePassRegistrationUploadProgressV515 ===
          'function'
          ? window.updateSitePassRegistrationUploadProgressV515
          : undefined;

      var activeRenewalResult = null;
      if (
        typeof documentUpload.persistActiveEquipmentRenewal ===
        'function'
      ) {
        activeRenewalResult =
          await documentUpload.persistActiveEquipmentRenewal(
            oldItem,
            item,
            'step81_v5_active_document_renewal',
            editProgress
          );
      }

      if (
        activeRenewalResult &&
        activeRenewalResult.handled === true
      ) {
        editUploadResult = activeRenewalResult;
      } else {
        editUploadResult =
          await documentUpload.persistEquipmentDocuments(
            item,
            'edit_storage_verified_v517',
            editProgress
          );
      }
    } catch (error) {
      editUploadResult = {
        ok: false,
        error: error
      };
    } finally {
      if (
        typeof window.setSitePassRegistrationUploadBusyV515 ===
        'function'
      ) {
        window.setSitePassRegistrationUploadBusyV515(false);
      }
    }

    if (
      !editUploadResult ||
      !editUploadResult.ok ||
      !editUploadResult.item
    ) {
      var message =
        editUploadResult &&
        editUploadResult.error
          ? (
              editUploadResult.error.message ||
              editUploadResult.error
            )
          : '서류 서버 저장 실패';

      alert(
        '수정내용을 저장하지 않았습니다.\n\n' +
        message +
        '\n\n현재 정상서류는 성공 확인 전까지 기존 current 상태를 유지합니다.'
      );
      return {
        ok: false,
        reason: 'persist-failed',
        writes: 0
      };
    }

    var savedEditItem = editUploadResult.item;
    if (
      String(savedEditItem.code || '').trim() !== targetCode
    ) {
      alert(
        '수정 저장 결과의 장비 식별자가 달라 저장을 중단했습니다.'
      );
      return {
        ok: false,
        reason: 'saved-identity-mismatch',
        writes: 0
      };
    }

    items[editIndex] = savedEditItem;
    var saveResult = call('setItemsWithFallback')(items);
    if (saveResult && saveResult.ok === false) {
      alert(
        '수정 결과의 로컬 보관함 반영에 실패했습니다. ' +
        '서버 상태를 다시 확인해주세요.'
      );
      return {
        ok: false,
        reason: 'local-cache-save-failed',
        writes: 0
      };
    }

    var note =
      typeof window.getStorageFallbackNote === 'function'
        ? window.getStorageFallbackNote(saveResult)
        : '';

    alert(
      '수정내용이 저장되었습니다.\n\n' +
      'Storage 확인: ' +
      Number(savedEditItem.storageVerifiedCount || 0) +
      '개\n포함: ' +
      (
        bundleMeta &&
        Array.isArray(bundleMeta.includedGroupNames)
          ? bundleMeta.includedGroupNames.join(', ')
          : ''
      ) +
      note
    );

    if (typeof window.clearRegistrationDraft === 'function') {
      window.clearRegistrationDraft();
    }
    setEditingCode('');
    activeEditBaseline = null;
    activeEditFormBaselineV6 = '';
    call('resetForm')(false);

    if (
      window.SitePassEquipment &&
      window.SitePassEquipment.detail &&
      typeof window.SitePassEquipment.detail.open === 'function'
    ) {
      window.SitePassEquipment.detail.open(targetCode);
    } else if (typeof window.renderDetail === 'function') {
      window.renderDetail(targetCode);
    }

    return {
      ok: true,
      reason: 'updated',
      writes: 1,
      code: targetCode
    };
  }

  var api = {
    start: async function (code) {
      var targetCode = String(code || '').trim();
      if (!targetCode) {
        return {
          ok: false,
          reason: 'empty-code'
        };
      }

      var item = call('getItemByCode')(targetCode);
      if (!item) {
        alert('수정할 장비등록을 찾을 수 없습니다.');
        return {
          ok: false,
          reason: 'not-found'
        };
      }

      try {
        var documentUpload =
          window.SitePassDocument &&
          window.SitePassDocument.upload;

        if (
          !documentUpload ||
          typeof documentUpload.hydrateActiveDocumentState !==
            'function'
        ) {
          throw new Error(
            '[SitePass Step81 V5] canonical document hydration unavailable'
          );
        }

        item =
          await documentUpload.hydrateActiveDocumentState(
            item
          );

        if (
          typeof window.sitePassHydrateItemStorageAccessUrlsV523 ===
          'function'
        ) {
          item =
            await window.sitePassHydrateItemStorageAccessUrlsV523(
              item,
              true
            );
        }
      } catch (error) {
        console.warn(
          '수정화면 canonical 서류 준비 실패:',
          error
        );
        alert(
          '현재 서류 원본을 서버에서 정확히 확인하지 못해 수정화면을 열지 않습니다.\n\n' +
          (error && error.message ? error.message : error)
        );
        return {
          ok: false,
          reason: 'canonical-hydration-failed'
        };
      }

      activeEditBaseline = item;
      setEditingCode(targetCode);

      var includeDriver =
        document.getElementById('includeDriverDocs');
      var includeWorker =
        document.getElementById('includeWorkerDocs');
      var included =
        item &&
        item.bundleMeta &&
        Array.isArray(item.bundleMeta.includedGroups)
          ? item.bundleMeta.includedGroups
          : [];
      var docs = item.docs || {};
      var docRows = Object.values(docs);
      var hasDriverDocs = docRows.some(function (doc) {
        return (
          doc &&
          doc.groupKey === 'driver' &&
          doc.fileName
        );
      });
      var hasWorkerDocs = docRows.some(function (doc) {
        return (
          doc &&
          doc.groupKey === 'worker' &&
          doc.fileName
        );
      });

      if (includeDriver) {
        includeDriver.checked =
          included.indexOf('driver') >= 0 ||
          hasDriverDocs;
      }
      if (includeWorker) {
        includeWorker.checked =
          included.indexOf('worker') >= 0 ||
          hasWorkerDocs;
      }

      call('renderDocCards')();

      var noInput =
        document.getElementById('equipmentNo');
      var nameInput =
        document.getElementById('equipmentName');
      if (noInput) noInput.value = item.equipmentNo || '';
      if (nameInput) nameInput.value = item.equipmentName || '';

      if (includeWorker && includeWorker.checked) {
        call('renderWorkerPeopleForEdit')(item);
      }

      call('fillDocsForEdit')(item);
      call('renderAlertPreview')();
      call('renderBundleSummary')();
      call('updateRegisterModeUi')();
      call('showScreen')('registerScreen');
      wireEditUiBoundary();
      refreshEditFormBaselineV6();

      return {
        ok: true,
        reason: 'edit-opened',
        code: targetCode
      };
    },

    startCurrent: function () {
      var link = '';
      try {
        link =
          typeof currentDetailLink !== 'undefined'
            ? String(currentDetailLink || '')
            : '';
      } catch (error) {}

      var code = decodeURIComponent(
        (link.split('#qr=')[1] || '').trim()
      );

      if (!code) {
        return {
          ok: false,
          reason: 'no-current-detail'
        };
      }

      return api.start(code);
    },

    save: function () {
      return saveUpdateOnly();
    },

    cancel: function () {
      var targetCode = currentEditingCode();
      if (
        targetCode &&
        !confirm(
          '수정 중인 내용을 취소하고 처음 등록 화면으로 돌아갈까요?'
        )
      ) {
        return {
          ok: false,
          reason: 'cancel-denied'
        };
      }

      setEditingCode('');
      activeEditBaseline = null;
      activeEditFormBaselineV6 = '';

      if (
        typeof window.discardRegistrationDraftCompletely ===
        'function'
      ) {
        window.discardRegistrationDraftCompletely();
      }

      call('resetForm')(false);

      if (
        typeof window.discardRegistrationDraftCompletely ===
        'function'
      ) {
        window.discardRegistrationDraftCompletely();
      }

      call('updateRegisterModeUi')();
      call('showScreen')('registerScreen');

      if (
        typeof window.sitePassApplyRegistrationStep472 ===
        'function'
      ) {
        window.sitePassApplyRegistrationStep472(
          'equipment',
          { persist: true, scroll: false }
        );
      }

      return {
        ok: true,
        reason: 'cancelled'
      };
    },

    hasUnsavedChanges: function () {
      return hasUnsavedEditChangesV6();
    },

    discardForNavigation: function () {
      var targetCode = currentEditingCode();

      setEditingCode('');
      activeEditBaseline = null;
      activeEditFormBaselineV6 = '';

      try {
        if (
          typeof window.sitePassDiscardLegacyEquipmentEditDraftV6 ===
          'function'
        ) {
          window.sitePassDiscardLegacyEquipmentEditDraftV6();
        }
      } catch (error) {}

      try {
        call('resetForm')(false);
      } catch (error) {}

      try {
        call('updateRegisterModeUi')();
      } catch (error) {}

      return {
        ok: true,
        reason: 'navigation-discarded',
        code: targetCode
      };
    },

    getState: function () {
      return {
        editingCode: currentEditingCode(),
        hasUnsavedChanges: hasUnsavedEditChangesV6()
      };
    }
  };

  window.SitePassEquipmentUpdate = Object.freeze(api);
})();
