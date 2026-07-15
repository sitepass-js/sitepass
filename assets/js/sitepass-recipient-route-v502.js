// SitePass v23.7.502 - 담당자 링크 전용 화면 강제 유지
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
    if(!manager && window.__SITEPASS_EXTERNAL_SHARE_CODE_V502) manager=String(window.__SITEPASS_EXTERNAL_SHARE_CODE_V502||'');
    return { external:!!(manager||pub), manager:manager, pub:pub, target:manager?'managerPrintScreen':(pub?'publicScreen':'') };
  }
  var first=readRoute();
  if(!first.external) return;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V502=true;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V500=true;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V499=true;
  if(first.manager) window.__SITEPASS_EXTERNAL_SHARE_CODE_V502=first.manager;
  try { document.documentElement.classList.add('sitepass-external-share-route-v502','sitepass-external-share-route-v500','sitepass-external-share-route-v499'); } catch(e) {}

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

  var enforcing=false, scheduled=false;
  function setImportant(el,name,value){
    if(!el) return;
    if(el.style.getPropertyValue(name)!==value || el.style.getPropertyPriority(name)!=='important') el.style.setProperty(name,value,'important');
  }
  function enforce(){
    if(enforcing) return;
    enforcing=true;
    try {
      var info=readRoute();
      if(!info.external || !info.target) return;
      if(info.manager) restoreCanonicalRoute(info);
      var target=document.getElementById(info.target);
      if(!target) return;
      document.querySelectorAll('.screen').forEach(function(screen){
        var keep=screen.id===info.target;
        screen.classList.toggle('hidden',!keep);
        if(keep){
          screen.classList.add('sitepass-recipient-route-active-v502');
          setImportant(screen,'display','block');
          setImportant(screen,'visibility','visible');
          setImportant(screen,'opacity','1');
          setImportant(screen,'pointer-events','auto');
          screen.style.removeProperty('height');
          screen.style.removeProperty('overflow');
        } else {
          screen.classList.remove('sitepass-recipient-route-active-v502');
          setImportant(screen,'display','none');
          setImportant(screen,'visibility','hidden');
          setImportant(screen,'opacity','0');
          setImportant(screen,'pointer-events','none');
        }
      });
      if(document.body){
        document.body.classList.remove('sitepass-booting','sitepass-app-nav-active','sitepass-first-screen-active');
        document.body.classList.add('manager-view-mode','sitepass-recipient-body-v502');
      }
      var nav=document.getElementById('sitepassBottomAppNav');
      if(nav) setImportant(nav,'display','none');
    } finally { enforcing=false; }
  }
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(function(){ scheduled=false; enforce(); });
  }
  window.sitePassEnforceRecipientRouteV502=enforce;
  window.sitePassEnforceRecipientRouteV500=enforce;
  document.addEventListener('DOMContentLoaded',function(){
    enforce();
    [20,80,180,400,900,1800,3500,7000].forEach(function(ms){setTimeout(enforce,ms);});
    try { new MutationObserver(schedule).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class','style']}); } catch(e) {}
  });
  window.addEventListener('pageshow',function(){setTimeout(enforce,0);setTimeout(enforce,250);});
  window.addEventListener('hashchange',function(){setTimeout(enforce,0);});
  window.addEventListener('popstate',function(){setTimeout(enforce,0);});
})();
