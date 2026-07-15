// SitePass v23.7.504 - 담당자 링크 진입/이탈 및 화면 고정 안정화
(function(){
  'use strict';

  var RECIPIENT_CLASSES = [
    'sitepass-external-share-route-v504',
    'sitepass-external-share-route-v503',
    'sitepass-external-share-route-v502',
    'sitepass-external-share-route-v500',
    'sitepass-external-share-route-v499'
  ];
  var BODY_CLASSES = ['manager-view-mode','sitepass-recipient-body-v504','sitepass-recipient-body-v503','sitepass-recipient-body-v502'];
  var ACTIVE_CLASSES = ['sitepass-recipient-route-active-v504','sitepass-recipient-route-active-v503','sitepass-recipient-route-active-v502','sitepass-recipient-route-active-v500'];

  function decodePart(value){
    try { return decodeURIComponent(value || ''); } catch(e) { return String(value || ''); }
  }

  function readRoute(){
    var search = String(location.search || '');
    var hash = String(location.hash || '');
    var params;
    try { params = new URLSearchParams(search); } catch(e) { params = new URLSearchParams(); }
    var manager = String(params.get('manager') || '').trim();
    var pub = String(params.get('public') || params.get('share') || '').trim();
    if (!manager && /^#manager=/i.test(hash)) manager = decodePart(hash.replace(/^#manager=/i, '').split('&')[0]).trim();
    if (!pub && /^#(?:qr|public|share)=/i.test(hash)) pub = decodePart(hash.replace(/^#(?:qr|public|share)=/i, '').split('&')[0]).trim();
    return {
      external: !!(manager || pub),
      manager: manager,
      pub: pub,
      target: manager ? 'managerPrintScreen' : (pub ? 'publicScreen' : '')
    };
  }

  function removeImportantRouteStyles(screen){
    if (!screen) return;
    ['display','visibility','opacity','pointer-events','height','min-height','overflow'].forEach(function(name){
      try { screen.style.removeProperty(name); } catch(e) {}
    });
    ACTIVE_CLASSES.forEach(function(name){ screen.classList.remove(name); });
  }

  function releaseRoute(){
    try {
      RECIPIENT_CLASSES.forEach(function(name){ document.documentElement.classList.remove(name); });
      if (document.body) BODY_CLASSES.forEach(function(name){ document.body.classList.remove(name); });
      document.querySelectorAll('.screen').forEach(removeImportantRouteStyles);
      var nav = document.getElementById('sitepassBottomAppNav');
      if (nav) nav.style.removeProperty('display');
      var topbar = document.querySelector('.topbar');
      if (topbar) topbar.style.removeProperty('display');
    } catch(e) {}
    window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V504 = false;
    window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V503 = false;
    window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V502 = false;
    window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V500 = false;
    window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V499 = false;
    window.__SITEPASS_EXTERNAL_SHARE_CODE_V504 = '';
    window.__SITEPASS_EXTERNAL_SHARE_CODE_V503 = '';
    window.__SITEPASS_EXTERNAL_SHARE_CODE_V502 = '';
  }

  function canonicalizeLegacyManagerRoute(info){
    if (!info || !info.manager || !/^#manager=/i.test(String(location.hash || ''))) return;
    try {
      var url = new URL(location.href);
      url.hash = '';
      url.searchParams.set('manager', info.manager);
      history.replaceState({sitepassRecipient:true, managerCode:info.manager}, document.title || 'SitePass', url.pathname + url.search);
    } catch(e) {}
  }

  function setImportant(el, name, value){
    if (!el) return;
    try { el.style.setProperty(name, value, 'important'); } catch(e) {}
  }

  function ensureLoadingMessage(info){
    if (!info || !info.manager) return;
    var box = document.getElementById('managerPrintBox');
    if (!box || String(box.innerHTML || '').trim()) return;
    box.innerHTML = '<div class="sitepass-recipient-loading-v504"><div class="sitepass-recipient-spinner-v504" aria-hidden="true"></div><b>담당자 서류를 불러오는 중입니다.</b><span>서버에서 최신 서류를 확인하고 있습니다.</span></div>';
  }

  var enforcing = false;
  function enforce(){
    if (enforcing) return;
    if (window.__SITEPASS_ALLOW_RECIPIENT_EXIT_V504) {
      releaseRoute();
      return;
    }
    var info = readRoute();
    if (!info.external || !info.target) {
      releaseRoute();
      return;
    }
    enforcing = true;
    try {
      canonicalizeLegacyManagerRoute(info);
      window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V504 = true;
      window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V503 = true;
      window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V502 = true;
      window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V500 = true;
      window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V499 = true;
      if (info.manager) {
        window.__SITEPASS_EXTERNAL_SHARE_CODE_V504 = info.manager;
        window.__SITEPASS_EXTERNAL_SHARE_CODE_V503 = info.manager;
        window.__SITEPASS_EXTERNAL_SHARE_CODE_V502 = info.manager;
      }
      RECIPIENT_CLASSES.forEach(function(name){ document.documentElement.classList.add(name); });
      ensureLoadingMessage(info);
      var target = document.getElementById(info.target);
      if (!target) return;
      document.querySelectorAll('.screen').forEach(function(screen){
        var keep = screen.id === info.target;
        screen.classList.toggle('hidden', !keep);
        if (keep) {
          screen.classList.add('sitepass-recipient-route-active-v504');
          setImportant(screen,'display','block');
          setImportant(screen,'visibility','visible');
          setImportant(screen,'opacity','1');
          setImportant(screen,'pointer-events','auto');
          screen.style.removeProperty('height');
          screen.style.removeProperty('overflow');
        } else {
          ACTIVE_CLASSES.forEach(function(name){ screen.classList.remove(name); });
          setImportant(screen,'display','none');
          setImportant(screen,'visibility','hidden');
          setImportant(screen,'opacity','0');
          setImportant(screen,'pointer-events','none');
        }
      });
      if (document.body) {
        document.body.classList.remove('sitepass-booting','sitepass-app-nav-active','sitepass-first-screen-active','sitepass-fast-shell-loading');
        document.body.classList.add('manager-view-mode','sitepass-recipient-body-v504');
      }
      var nav = document.getElementById('sitepassBottomAppNav');
      if (nav) setImportant(nav,'display','none');
      var topbar = document.querySelector('.topbar');
      if (topbar) setImportant(topbar,'display','none');
    } finally {
      enforcing = false;
    }
  }

  function chooseExitTarget(preferred){
    if (preferred) return preferred;
    try {
      if (window.__SITEPASS_INTERNAL_MANAGER_PREVIEW_V504) return window.__SITEPASS_MANAGER_RETURN_SCREEN_V504 || 'listScreen';
      if (typeof window.isMemberLoggedIn === 'function' && window.isMemberLoggedIn()) return 'listScreen';
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return 'adminScreen';
    } catch(e) {}
    return 'signupScreen';
  }

  function exitRecipientRoute(preferred){
    window.__SITEPASS_ALLOW_RECIPIENT_EXIT_V504 = true;
    window.__SITEPASS_INTERNAL_MANAGER_PREVIEW_V504 = false;
    try { if (typeof window.closeManagerDocDetailV504 === 'function') window.closeManagerDocDetailV504(); } catch(e) {}
    try { if (typeof window.closeManagerDocDetailV503 === 'function') window.closeManagerDocDetailV503(); } catch(e) {}
    try {
      var url = new URL(location.href);
      ['manager','public','share','exp','sig','spfresh'].forEach(function(key){ url.searchParams.delete(key); });
      if (/^#(?:manager|qr|public|share)=/i.test(url.hash || '')) url.hash = '';
      history.replaceState({sitepassRecipient:false}, document.title || 'SitePass', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + (url.hash || ''));
    } catch(e) {}
    releaseRoute();
    var target = chooseExitTarget(preferred);
    setTimeout(function(){
      try {
        if (typeof window.showScreen === 'function') window.showScreen(target, {replace:true});
        else {
          document.querySelectorAll('.screen').forEach(function(screen){ screen.classList.add('hidden'); removeImportantRouteStyles(screen); });
          var screen = document.getElementById(target);
          if (screen) screen.classList.remove('hidden');
        }
        window.scrollTo(0,0);
      } catch(e) {}
      setTimeout(function(){ window.__SITEPASS_ALLOW_RECIPIENT_EXIT_V504 = false; }, 80);
    }, 0);
  }

  window.sitePassEnforceRecipientRouteV504 = enforce;
  window.sitePassEnforceRecipientRouteV503 = enforce;
  window.sitePassEnforceRecipientRouteV502 = enforce;
  window.sitePassEnforceRecipientRouteV500 = enforce;
  window.sitePassReleaseRecipientRouteV504 = releaseRoute;
  window.exitManagerRecipientViewV504 = exitRecipientRoute;
  window.exitManagerRecipientToMemberV504 = function(){ exitRecipientRoute(window.__SITEPASS_MANAGER_RETURN_SCREEN_V504 || 'listScreen'); };
  window.exitManagerRecipientToStartV504 = function(){ exitRecipientRoute('signupScreen'); };

  var first = readRoute();
  if (first.external) {
    window.__SITEPASS_ALLOW_RECIPIENT_EXIT_V504 = false;
    enforce();
    [20,80,180,400,900,1800,3500,7000,12000].forEach(function(ms){ setTimeout(enforce, ms); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enforce, {once:true});
  else setTimeout(enforce,0);
  window.addEventListener('pageshow', function(){ setTimeout(enforce,0); setTimeout(enforce,250); });
  window.addEventListener('hashchange', function(){ setTimeout(enforce,0); });
  window.addEventListener('popstate', function(){ setTimeout(enforce,0); });
})();
