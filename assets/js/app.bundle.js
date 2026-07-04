// SitePass v23.7.297 - compatibility loader for old index.html app.bundle.js references
(function(){
  if (window.__SITEPASS_APP_SPLIT_VERSION === 'v23.7.297' || window.__SITEPASS_APP_SPLIT_LOADER_ACTIVE) return;
  window.__SITEPASS_APP_SPLIT_LOADER_ACTIVE = true;
  var version = '23.7.297';
  var files = [
    './assets/js/app-core-auth-01.js',
    './assets/js/app-core-auth-02.js',
    './assets/js/app-core-auth-03.js',
    './assets/js/app-core-auth-04.js',
    './assets/js/app-core-auth-05.js',
    './assets/js/app-core-auth-06.js',
    './assets/js/app-camera-docs-01.js',
    './assets/js/app-camera-docs-02.js',
    './assets/js/app-camera-docs-03.js',
    './assets/js/app-camera-docs-04.js',
    './assets/js/app-register-share-payment-01.js',
    './assets/js/app-register-share-payment-02.js',
    './assets/js/app-register-share-payment-03.js',
    './assets/js/app-register-share-payment-04.js',
    './assets/js/app-register-share-payment-05.js',
    './assets/js/app-admin-boot-01.js',
    './assets/js/app-admin-boot-02.js',
    './assets/js/app-admin-boot-03.js',
    './assets/js/app-admin-boot-04.js'
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
