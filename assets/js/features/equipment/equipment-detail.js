(function () {
  'use strict';

  function renderDetailPublic(code, options) {
    if (typeof window.renderDetail !== 'function') {
      throw new Error('[SitePass Step80] equipment detail renderer unavailable');
    }
    return window.renderDetail(
      String(code || ''),
      options && typeof options === 'object'
        ? options
        : {}
    );
  }

  var api = {
    open: function (code, options) {
      return renderDetailPublic(code, options);
    },

    render: function (code, options) {
      return renderDetailPublic(code, options);
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
