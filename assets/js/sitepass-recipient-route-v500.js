// SitePass v23.7.500 - 외부 담당자/QR 화면 전용 강제 유지
(function(){
  'use strict';
  function routeInfo(){
    var search=String(location.search||'');
    var hash=String(location.hash||'');
    var manager=/#manager=/i.test(hash)||/[?&]manager=/i.test(search);
    var pub=/#(?:qr|public|share)=/i.test(hash)||/[?&](?:public|share)=/i.test(search);
    return { external:manager||pub, target:manager?'managerPrintScreen':(pub?'publicScreen':'') };
  }
  var info=routeInfo();
  if(!info.external) return;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V500=true;
  window.__SITEPASS_EXTERNAL_SHARE_ROUTE_V499=true;
  window.__SITEPASS_RECIPIENT_TARGET_V500=info.target;
  try{
    document.documentElement.classList.add('sitepass-external-share-route-v500');
    document.documentElement.classList.add('sitepass-external-share-route-v499');
  }catch(e){}

  var enforcing=false;
  var scheduled=false;
  function enforce(){
    if(enforcing) return;
    enforcing=true;
    try{
      var current=routeInfo();
      if(!current.external||!current.target) return;
      window.__SITEPASS_RECIPIENT_TARGET_V500=current.target;
      var target=document.getElementById(current.target);
      if(!target) return;
      function setImportant(el,name,value){
        if(el.style.getPropertyValue(name)!==value || el.style.getPropertyPriority(name)!=='important') el.style.setProperty(name,value,'important');
      }
      document.querySelectorAll('.screen').forEach(function(screen){
        var keep=screen.id===current.target;
        if(keep){
          if(!screen.classList.contains('sitepass-recipient-route-active-v500')) screen.classList.add('sitepass-recipient-route-active-v500');
          if(screen.classList.contains('hidden')) screen.classList.remove('hidden');
          setImportant(screen,'display','block');
          setImportant(screen,'visibility','visible');
          setImportant(screen,'opacity','1');
          setImportant(screen,'pointer-events','auto');
          if(screen.style.getPropertyValue('height')) screen.style.removeProperty('height');
          if(screen.style.getPropertyValue('overflow')) screen.style.removeProperty('overflow');
        }else{
          if(screen.classList.contains('sitepass-recipient-route-active-v500')) screen.classList.remove('sitepass-recipient-route-active-v500');
          if(!screen.classList.contains('hidden')) screen.classList.add('hidden');
          setImportant(screen,'display','none');
          setImportant(screen,'visibility','hidden');
          setImportant(screen,'opacity','0');
          setImportant(screen,'pointer-events','none');
        }
      });
      if(document.body){
        document.body.classList.remove('sitepass-booting','sitepass-app-nav-active');
        document.body.classList.add('manager-view-mode');
      }
    }finally{ enforcing=false; }
  }
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(function(){ scheduled=false; enforce(); });
  }
  window.sitePassEnforceRecipientRouteV500=enforce;
  document.addEventListener('DOMContentLoaded',function(){
    enforce();
    [30,120,350,900,1800,3500].forEach(function(ms){ setTimeout(enforce,ms); });
    try{
      var root=document.querySelector('.app')||document.body;
      if(root) new MutationObserver(schedule).observe(root,{subtree:true,attributes:true,attributeFilter:['class','style']});
    }catch(e){}
  });
  window.addEventListener('pageshow',function(){ setTimeout(enforce,0); setTimeout(enforce,250); });
  window.addEventListener('hashchange',function(){ setTimeout(enforce,0); });
})();
