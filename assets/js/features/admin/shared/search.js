// SitePass STEP87 - stateless admin search helpers
(function(){
  'use strict';

  function normalize(value){
    return String(value == null ? '' : value).trim().toLocaleLowerCase('ko-KR');
  }

  function includes(value, query){
    var q = normalize(query);
    if (!q) return true;
    return normalize(value).includes(q);
  }

  function any(values, query){
    var list = Array.isArray(values) ? values : [values];
    return list.some(function(value){ return includes(value, query); });
  }

  window.SitePassAdminSearch = Object.freeze({
    normalize: normalize,
    includes: includes,
    any: any
  });
})();
