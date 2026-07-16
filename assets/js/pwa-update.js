// SitePass v23.7.538-test - 담당자 링크 보존 + 반복 spfresh 이동 방지
// 이 파일에는 새 버전 확인, 캐시 삭제, 강제 새로고침, 서비스워커 등록 기능을 둡니다.
(function(){
  'use strict';

  function runtime(){ return window.SitePassPwaRuntime || {}; }
  function getAppVersion(){
    const rt = runtime();
    return String((rt.getAppVersion && rt.getAppVersion()) || window.SITEPASS_DB_CONFIG?.appVersion || 'v23.7.277').trim() || 'v23.7.277';
  }
  function getFixedAppUrl(){
    const rt = runtime();
    return String((rt.getFixedAppUrl && rt.getFixedAppUrl()) || window.SITEPASS_DB_CONFIG?.appUrl || 'https://sitepass-js.github.io/sitepass/');
  }
  function setHomeStatus(message){
    const rt = runtime();
    try { if (rt.setHomeInstallStatus) rt.setHomeInstallStatus(message); } catch (e) {}
  }
  function isStandalone(){
    const rt = runtime();
    try { return rt.isStandalone ? !!rt.isStandalone() : false; } catch (e) { return false; }
  }
  function hasDeferredInstallPrompt(){
    const rt = runtime();
    try { return rt.hasDeferredInstallPrompt ? !!rt.hasDeferredInstallPrompt() : false; } catch (e) { return false; }
  }

  const VERSION_KEY = 'sitepass_current_app_version';
  const UPDATE_RELOAD_KEY = 'sitepass_last_update_reload_version';
  const UPDATE_NOTICE_KEY = 'sitepass_last_update_notice_version';

  function isOfficialGithubUrl(){
    return location.hostname === 'sitepass-js.github.io' && location.pathname.indexOf('/sitepass') === 0;
  }


  function getExternalShareRouteV502(){
    try {
      const url = new URL(location.href);
      let manager = String(url.searchParams.get('manager') || '').trim();
      let publicCode = String(url.searchParams.get('public') || url.searchParams.get('share') || '').trim();
      const hash = String(url.hash || '');
      if (!manager && /^#manager=/i.test(hash)) manager = decodeURIComponent(hash.replace(/^#manager=/i, '').split('&')[0] || '');
      if (!publicCode && /^#(?:public|share|qr)=/i.test(hash)) publicCode = decodeURIComponent(hash.replace(/^#(?:public|share|qr)=/i, '').split('&')[0] || '');
      return { external:!!(manager || publicCode), manager, publicCode };
    } catch (e) { return { external:false, manager:'', publicCode:'' }; }
  }

  function makeVersionReloadUrlV502(targetVersion){
    const route = getExternalShareRouteV502();
    const cleanBase = isOfficialGithubUrl() ? getFixedAppUrl() : (location.origin + location.pathname.replace(/index\.html$/i, ''));
    const url = new URL(cleanBase, location.href);
    if (route.manager) url.searchParams.set('manager', route.manager);
    else if (route.publicCode) url.searchParams.set('public', route.publicCode);
    url.searchParams.set('v', String(targetVersion).replace(/^v/i,''));
    url.searchParams.delete('spfresh');
    url.searchParams.delete('updated');
    return url.toString();
  }

  function normalizeFixedUrl(){
    if (!isOfficialGithubUrl()) return;
    const needsCleanUrl = /\/index\.html$/i.test(location.pathname) || /[?&](?:v|spfresh|updated)=/.test(location.search || '');
    if (!needsCleanUrl) return;
    try {
      const params = new URLSearchParams(location.search || '');
      // v23.7.495: expirytest는 세션 플래그로 옮기고 URL에서는 제거해 일반 앱 라우팅과 완전히 분리합니다.
      try {
        if (params.get('expirytest') === '1') sessionStorage.setItem('sitepass_expiry_test_mode_v481', '1');
        else if (params.get('expirytest') === '0') sessionStorage.removeItem('sitepass_expiry_test_mode_v481');
      } catch (e) {}
      params.delete('v');
      params.delete('expirytest');
      params.delete('spfresh');
      params.delete('updated');
      const query = params.toString();
      history.replaceState(history.state || {}, document.title, '/sitepass/' + (query ? ('?' + query) : '') + (location.hash || ''));
    } catch (e) {}
  }

  async function clearBrowserCache(){
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => /^sitepass/i.test(key) || /sitepass/i.test(key)).map(key => caches.delete(key)));
      }
    } catch (e) {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.update().catch(() => null)));
      }
    } catch (e) {}
  }

  async function prepareSoftUpdate(){
    // v23.7.495: 버전이 바뀔 때 모든 캐시를 삭제하면 휴대폰이 CSS·JS·이미지를
    // 다시 전부 내려받아 느려집니다. 기존 파일 캐시는 남기고 서비스워커만 갱신합니다.
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(reg){ return reg.update().catch(function(){ return null; }); }));
      }
    } catch (e) {}
  }

  async function forceUpdateReload(nextVersion){
    const appVersion = getAppVersion();
    const targetVersion = nextVersion || appVersion;
    const targetUrl = makeVersionReloadUrlV502(targetVersion);
    const guardKey = 'sitepass_update_once:' + String(targetVersion);
    try {
      if (sessionStorage.getItem(guardKey) === '1') {
        normalizeFixedUrl();
        document.documentElement.classList.remove('sitepass-version-gate-v500');
        return;
      }
      sessionStorage.setItem(guardKey, '1');
      localStorage.setItem(VERSION_KEY, targetVersion);
    } catch (e) {}
    await prepareSoftUpdate();
    try { location.replace(targetUrl); }
    catch (e) { location.href = targetUrl; }
  }

  function normalizeVersionV531(value){
    return String(value || '').trim().replace(/^v/i, '');
  }

  async function checkAutoUpdate(){
    const appVersion = getAppVersion();
    const normalizedAppVersion = normalizeVersionV531(appVersion);
    normalizeFixedUrl();
    let storedVersion = '';
    try { storedVersion = localStorage.getItem(VERSION_KEY) || ''; } catch (e) {}

    // v23.7.277: 브라우저 저장 버전과 현재 실행 버전이 다른 것만으로 자동 새로고침하지 않습니다.
    // 이전 방식은 config/app-version 캐시가 한 박자 어긋날 때 "새 버전" 알림이 반복될 수 있었습니다.
    if (normalizeVersionV531(storedVersion) !== normalizedAppVersion) {
      try { localStorage.setItem(VERSION_KEY, appVersion); } catch (e) {}
    }

    try {
      const res = await fetch('./app-version.json?ts=' + Date.now(), { cache:'no-store' });
      if (!res.ok) return;
      const info = await res.json();
      const latestVersion = String(info.version || '').trim();
      if (!latestVersion || normalizeVersionV531(latestVersion) === normalizedAppVersion) {
        try { document.documentElement.classList.remove('sitepass-version-gate-v500'); } catch (e) {}
        return;
      }
      const externalRouteV502 = getExternalShareRouteV502();
      if (externalRouteV502.external) {
        try { localStorage.setItem(VERSION_KEY, latestVersion); } catch (e) {}
        try { await prepareSoftUpdate(); } catch (e) {}
        return;
      }
      const reloadKey = latestVersion + ':remote';
      try {
        // 같은 최신버전으로 이미 새로고침을 시도했다면 알림을 반복하지 않습니다.
        if (localStorage.getItem(UPDATE_RELOAD_KEY) === reloadKey) {
          return;
        }
        localStorage.setItem(UPDATE_RELOAD_KEY, reloadKey);
        localStorage.setItem(UPDATE_NOTICE_KEY, latestVersion);
      } catch (e) {}
      try { document.documentElement.classList.add('sitepass-version-gate-v500'); } catch (e) {}
      await forceUpdateReload(latestVersion);
    } catch (e) {
      // app-version.json이 아직 없거나 네트워크가 막힌 경우 현재 HTML 버전을 사용합니다.
    }
  }

  function registerServiceWorker(){
    if (!('serviceWorker' in navigator)) {
      setHomeStatus('이 브라우저는 서비스워커를 지원하지 않아 앱 설치 기능이 제한될 수 있습니다.');
      return;
    }
    if (!(window.isSecureContext || location.hostname === 'localhost')) {
      setHomeStatus('서비스워커와 설치창은 https 주소 또는 localhost에서만 정상 작동합니다.');
      return;
    }
    const appVersion = getAppVersion();
    navigator.serviceWorker.register('./sw.js?v=' + encodeURIComponent(appVersion)).then(function(reg) {
      try { reg.update(); } catch (e) {}
      if (!hasDeferredInstallPrompt() && !isStandalone()) {
        setHomeStatus('설치 준비 중입니다. 브라우저가 설치 가능하다고 판단하면 <b>바탕화면에 설치하기</b> 버튼으로 설치창이 열립니다.');
      }
    }).catch(function() {
      setHomeStatus('서비스워커 등록이 되지 않았습니다. 정식 배포 시 sw.js 파일이 같은 폴더에 있어야 합니다.');
    });
  }

  window.SitePassPwaUpdate = {
    getAppVersion,
    normalizeFixedUrl,
    clearBrowserCache,
    prepareSoftUpdate,
    forceUpdateReload,
    checkAutoUpdate,
    registerServiceWorker
  };
})();
