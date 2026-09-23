// SitePass STEP90 R2 - equipment/personnel admin state only
(function(){
  'use strict';

  var activeTab = 'equipment';
  var allowedTabs = ['equipment', 'driver', 'worker'];

  function normalizeTab(value) {
    var key = String(value || 'equipment').trim().toLowerCase();
    return allowedTabs.indexOf(key) >= 0 ? key : 'equipment';
  }

  function getActiveTab() {
    return activeTab;
  }

  function setActiveTab(value) {
    activeTab = normalizeTab(value);
    return activeTab;
  }

  function reset() {
    activeTab = 'equipment';
  }

  window.SitePassAdminEquipmentPersonnelState = Object.freeze({
    getActiveTab: getActiveTab,
    setActiveTab: setActiveTab,
    normalizeTab: normalizeTab,
    reset: reset
  });
})();
