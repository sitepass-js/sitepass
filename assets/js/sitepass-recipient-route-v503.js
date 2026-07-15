// SitePass v23.7.503 - 담당자 링크 빈 화면 방지 및 수신화면 안정화
(function(){
  'use strict';

  function readRoute(){
    var search=String(location.search||'');
    var hash=String(location.hash||'');
    var params;
    try { params=new URLSearchParams(search); } catch(e) { params=new URLSearchParams(); }
    var manager=String(params.get('manager')||'').trim();
    var pub=String(params.get('public')||params.get('share')||'').trim();
    if(!manager && /^#manager=/i.test(hash)) {
      try { manager=decodeURIComponent(hash.replace(/^#manager=/i,'').split('&')[0]||''); } catch(e) {}
    }
    if(!pub && /^#(?:qr|public|share)=/i.test(hash)) {
      try { pub=decodeURIComponent(hash.replace(/^#(?:qr|public|share)=/i,'').split('&')[0]||''); } catch(e) {}
    }
    if(!manager && window.__SITEPASS_EXTERNAL_SHARE_CODE_V503) manager=String(window.__SITEPASS_EXTERNAL_SHARE_CODE_V503||'');
    return { external:!!(manager||pub), manager:manager, pub:pub, target:manager?'managerPrintScreen':(pub?'publicScreen':'') };
  }

  var first=readRoute();
  if(!first.external) return;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V503=true;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V502=true;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V500=true;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V499=true;
  if(first.manager) {
    window.__SITEPASS_EXTERNAL_SHARE_CODE_V503=first.manager;
    window.__SITEPASS_EXTERNAL_SHARE_CODE_V502=first.manager;
  }
  try {
    document.documentElement.classList.add('sitepass-external-share-route-v503','sitepass-external-share-route-v502','sitepass-external-share-route-v500','sitepass-external-share-route-v499');
  } catch(e) {}

  function restoreCanonicalRoute(info){
    if(!info || !info.manager) return;
    try {
      var params=new URLSearchParams(location.search||'');
      if(params.get('manager')===info.manager && !location.hash) return;
      var url=new URL(location.origin+location.pathname);
      url.searchParams.set('manager',info.manager);
      history.replaceState({sitepassRecipient:true,managerCode:info.manager},document.title||'SitePass',url.pathname+url.search);
    } catch(e) {}
  }

  function setImportant(el,name,value){
    if(!el) return;
    if(el.style.getPropertyValue(name)!==value || el.style.getPropertyPriority(name)!=='important') {
      el.style.setProperty(name,value,'important');
    }
  }

  function ensureLoadingMessage(target, info){
    if(!target || !info || !info.manager) return;
    var box=document.getElementById('managerPrintBox');
    if(!box || String(box.innerHTML||'').trim()) return;
    box.innerHTML='<div class="sitepass-recipient-loading-v503"><div class="sitepass-recipient-spinner-v503" aria-hidden="true"></div><b>담당자 서류를 불러오는 중입니다.</b><span>잠시만 기다려주세요.</span></div>';
  }

  var enforcing=false;
  function enforce(){
    if(enforcing) return;
    enforcing=true;
    try {
      var info=readRoute();
      if(!info.external || !info.target) return;
      if(info.manager) restoreCanonicalRoute(info);
      var target=document.getElementById(info.target);
      if(!target) return;
      ensureLoadingMessage(target, info);
      document.querySelectorAll('.screen').forEach(function(screen){
        var keep=screen.id===info.target;
        screen.classList.toggle('hidden',!keep);
        if(keep){
          screen.classList.add('sitepass-recipient-route-active-v503');
          setImportant(screen,'display','block');
          setImportant(screen,'visibility','visible');
          setImportant(screen,'opacity','1');
          setImportant(screen,'pointer-events','auto');
          screen.style.removeProperty('height');
          screen.style.removeProperty('overflow');
        } else {
          screen.classList.remove('sitepass-recipient-route-active-v503');
          setImportant(screen,'display','none');
          setImportant(screen,'visibility','hidden');
          setImportant(screen,'opacity','0');
          setImportant(screen,'pointer-events','none');
        }
      });
      if(document.body){
        document.body.classList.remove('sitepass-booting','sitepass-app-nav-active','sitepass-first-screen-active','sitepass-fast-shell-loading');
        document.body.classList.add('manager-view-mode','sitepass-recipient-body-v503');
      }
      var nav=document.getElementById('sitepassBottomAppNav');
      if(nav) setImportant(nav,'display','none');
      var topbar=document.querySelector('.topbar');
      if(topbar) setImportant(topbar,'display','none');
    } finally { enforcing=false; }
  }

  window.sitePassEnforceRecipientRouteV503=enforce;
  window.sitePassEnforceRecipientRouteV502=enforce;
  window.sitePassEnforceRecipientRouteV500=enforce;

  function start(){
    enforce();
    [20,80,180,400,900,1800,3500,7000,12000].forEach(function(ms){ setTimeout(enforce,ms); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('pageshow',function(){setTimeout(enforce,0);setTimeout(enforce,250);});
  window.addEventListener('hashchange',function(){setTimeout(enforce,0);});
  window.addEventListener('popstate',function(){setTimeout(enforce,0);});
})();
