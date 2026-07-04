// SitePass v23.7.292 - compatibility loader for old index.html app.bundle.js references
(function(){
  if (window.__SITEPASS_APP_SPLIT_VERSION === 'v23.7.292' || window.__SITEPASS_APP_SPLIT_LOADER_ACTIVE) return;
  window.__SITEPASS_APP_SPLIT_LOADER_ACTIVE = true;
  var version = '23.7.292';
  var files = [
    './assets/js/app-core-auth.js',
    './assets/js/app-camera-docs.js',
    './assets/js/app-register-share-payment.js',
    './assets/js/app-admin-boot.js'
  ];
  function withVersion(src){ return src + '?v=' + version; }
  if (document.readyState === 'loading') {
    document.write(files.map(function(src){ return '<script src="' + withVersion(src) + '"><\/script>'; }).join(''));
    return;
  }
  function loadNext(index){
    if (index >= files.length) return;
    var script = document.createElement('script');
    script.src = withVersion(files[index]);
    script.onload = function(){ loadNext(index + 1); };
    script.onerror = function(){ console.error('[SitePass] split script load failed:', files[index]); loadNext(index + 1); };
    (document.head || document.documentElement).appendChild(script);
  }
  loadNext(0);
})();
