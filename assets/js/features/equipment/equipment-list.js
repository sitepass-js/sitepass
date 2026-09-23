(function () {
  'use strict';

  function archiveV562() {
    return window.SitePassArchiveV562 || null;
  }

  function legacyArchive() {
    return window.SitePassArchive || null;
  }

  function missing(name) {
    throw new Error('[SitePass Step80] equipment list API unavailable: ' + name);
  }

  var api = {
    render: function () {
      var archive = archiveV562() || legacyArchive();
      if (!archive || typeof archive.renderList !== 'function') {
        return missing('renderList');
      }
      return archive.renderList.apply(archive, arguments);
    },

    reload: function () {
      var archive = archiveV562();
      if (archive && typeof archive.reload === 'function') {
        return archive.reload.apply(archive, arguments);
      }
      return api.render.apply(api, arguments);
    },

    openDetail: function (equipmentId, code) {
      var archive = archiveV562();
      if (archive && typeof archive.openDetail === 'function') {
        return archive.openDetail(equipmentId, code);
      }

      var detail = window.SitePassEquipmentDetail;
      if (detail && typeof detail.open === 'function') {
        return detail.open(code || equipmentId);
      }

      return missing('openDetail');
    },

    editOwner: function (code) {
      var archive = archiveV562();
      if (archive && typeof archive.editOwner === 'function') {
        return archive.editOwner(code);
      }

      var update = window.SitePassEquipmentUpdate;
      if (update && typeof update.start === 'function') {
        return update.start(code);
      }

      return missing('editOwner');
    },

    getState: function () {
      var archive = archiveV562();
      if (archive && typeof archive.getState === 'function') {
        return archive.getState();
      }
      return null;
    },

    getHomeSnapshot: function () {
      var archive = archiveV562();
      if (archive && typeof archive.getHomeSnapshot === 'function') {
        return archive.getHomeSnapshot.apply(archive, arguments);
      }
      return null;
    },

    resetAuthScopedState: function () {
      var archive = archiveV562();
      if (archive && typeof archive.resetAuthScopedState === 'function') {
        return archive.resetAuthScopedState();
      }
      return false;
    }
  };

  window.SitePassEquipmentList = Object.freeze(api);
})();
