// SitePass v23.7.710 Step78 - common feature-flags facade
(function(){
  'use strict';

  function get(name, fallbackValue){
    var key = String(name || '');
    try {
      if (key === 'testNoPaymentMode') return !!window.SITEPASS_TEST_NO_PAYMENT_MODE;
      var source = window.SITEPASS_FEATURE_FLAGS;
      if (source && Object.prototype.hasOwnProperty.call(source, key)) return source[key];
    } catch(e) {}
    return fallbackValue;
  }

  window.SitePassCoreFeatureFlags = Object.freeze({
    get:get
  });
})();
