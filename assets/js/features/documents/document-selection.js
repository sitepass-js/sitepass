(function(){'use strict';
function need(name){var fn=window[name];if(typeof fn!=='function')throw new Error('[SitePass Step81] document selection dependency unavailable: '+name);return fn;}
function clean(value){return String(value||'').trim();}
function validIndex(value){return Number.isInteger(Number(value))&&Number(value)>=0;}
var api={
 selectPageVersion:function(docKey,index,mode){
  var key=clean(docKey);
  var finalMode=String(mode||'');
  if(!key)return {ok:false,reason:'empty-doc-key',writes:0};
  if(!validIndex(index))return {ok:false,reason:'invalid-page-index',writes:0};
  if(finalMode!=='original'&&finalMode!=='corrected')return {ok:false,reason:'invalid-selection-mode',writes:0};
  return need('selectDocPageVersion')(key,Number(index),finalMode);
 },
 switchFolder:function(folderId,groupKey){
  var folder=clean(folderId);
  var group=clean(groupKey);
  if(!folder)return {ok:false,reason:'empty-folder-id'};
  if(['equipment','driver','worker'].indexOf(group)<0)return {ok:false,reason:'invalid-group'};
  return need('switchDocFolderV486')(folder,group);
 },
 getCapabilities:function(){
  return {
   pageVersion:typeof window.selectDocPageVersion==='function',
   folder:typeof window.switchDocFolderV486==='function'
  };
 }
};
window.SitePassDocumentSelection=Object.freeze(api);
})();