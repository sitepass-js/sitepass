(function(){'use strict';
function need(name){var fn=window[name];if(typeof fn!=='function')throw new Error('[SitePass Step81] document viewer dependency unavailable: '+name);return fn;}
function clean(value){return String(value||'').trim();}
function validIndex(value){return Number.isInteger(Number(value))&&Number(value)>=0;}
function validMode(value){return ['preview','original','corrected'].indexOf(String(value||''))>=0;}
var api={
 openPreview:function(source){
  var src=clean(source);
  if(!src)return {ok:false,reason:'empty-source'};
  return need('openPreviewModal')(src);
 },
 openPage:function(docKey,index,mode,code){
  var key=clean(docKey);
  if(!key)return {ok:false,reason:'empty-doc-key'};
  if(!validIndex(index))return {ok:false,reason:'invalid-page-index'};
  if(!validMode(mode))return {ok:false,reason:'invalid-view-mode'};
  return need('openDocPagePreview')(key,Number(index),String(mode),clean(code));
 },
 openPublic:function(code,key){
  var finalCode=clean(code),finalKey=clean(key);
  if(!finalCode)return {ok:false,reason:'empty-code'};
  if(!finalKey)return {ok:false,reason:'empty-doc-key'};
  return need('openPublicDocPreview')(finalCode,finalKey);
 },
 openQr:function(code){
  var finalCode=clean(code);
  if(!finalCode)return {ok:false,reason:'empty-code'};
  return need('openQrPublicView')(finalCode);
 },
 getCapabilities:function(){
  return {
   preview:typeof window.openPreviewModal==='function',
   page:typeof window.openDocPagePreview==='function',
   publicDocument:typeof window.openPublicDocPreview==='function',
   qr:typeof window.openQrPublicView==='function'
  };
 }
};
window.SitePassDocumentViewer=Object.freeze(api);
})();