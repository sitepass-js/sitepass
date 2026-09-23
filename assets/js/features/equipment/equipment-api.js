(function () {
  'use strict';

  var list = window.SitePassEquipmentList;
  var detail = window.SitePassEquipmentDetail;
  var register = window.SitePassEquipmentRegisterFeature;
  var update = window.SitePassEquipmentUpdate;

  if (!list || !detail || !register || !update) {
    throw new Error('[SitePass Step80] equipment public API modules are incomplete');
  }

  var publicApi = {
    version: 'step80-v2-update-isolation-boundary',
    list: list,
    detail: detail,
    register: register,
    update: update,

    getCapabilities: function () {
      return {
        list: !!(list && typeof list.render === 'function'),
        detail: !!(detail && typeof detail.open === 'function'),
        register: !!(register && typeof register.start === 'function'),
        update: !!(update && typeof update.start === 'function')
      };
    }
  };

  window.SitePassEquipment = Object.freeze(publicApi);
  window.SitePassEquipmentApi = window.SitePassEquipment;
})();
