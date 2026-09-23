// SitePass v23.7.710 Step78 - common cache core
(function(){
  'use strict';
  var maps = Object.create(null);

  function key(value){ return String(value == null ? '' : value).trim(); }

  function getMap(namespace){
    var name = key(namespace);
    if (!name) throw new Error('SITEPASS_CACHE_NAMESPACE_REQUIRED');
    if (!maps[name]) maps[name] = new Map();
    return maps[name];
  }

  function clear(namespace){
    var name = key(namespace);
    if (!name) return false;
    if (!maps[name]) return false;
    maps[name].clear();
    return true;
  }

  function getState(){
    var out = {};
    Object.keys(maps).forEach(function(name){ out[name] = maps[name].size; });
    return out;
  }

  window.SitePassCoreCache = Object.freeze({
    getMap:getMap,
    clear:clear,
    getState:getState
  });
})();
