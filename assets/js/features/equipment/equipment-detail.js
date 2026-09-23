(function () {
  'use strict';

  function renderDetailPublic(code) {
    if (typeof window.renderDetail !== 'function') {
      throw new Error('[SitePass Step80] equipment detail renderer unavailable');
    }
    return window.renderDetail(String(code || ''));
  }

  var api = {
    open: function (code) {
      return renderDetailPublic(code);
    },

    render: function (code) {
      return renderDetailPublic(code);
    },

    refresh: function (code) {
      if (
        window.SitePassEquipmentList &&
        typeof window.SitePassEquipmentList.openDetail === 'function'
      ) {
        return window.SitePassEquipmentList.openDetail('', code);
      }
      return renderDetailPublic(code);
    }
  };

  window.SitePassEquipmentDetail = Object.freeze(api);
})();
