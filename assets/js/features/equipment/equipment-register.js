(function () {
  'use strict';

  function requireLegacy(name) {
    var fn = window[name];
    if (typeof fn !== 'function') {
      throw new Error('[SitePass Step80] equipment register API unavailable: ' + name);
    }
    return fn;
  }

  var api = {
    start: function () {
      return requireLegacy('startNewRegistration').apply(window, arguments);
    },

    save: function () {
      return requireLegacy('saveEquipment').apply(window, arguments);
    },

    getBuilder: function () {
      return window.SitePassEquipmentRegister || null;
    }
  };

  window.SitePassEquipmentRegisterFeature = Object.freeze(api);
})();
