(function(){'use strict';
function need(name){var fn=window[name];if(typeof fn!=='function')throw new Error('[SitePass Step81] document verification dependency unavailable: '+name);return fn;}
var api={
 requirePrivate:function(card){
  if(!card)return false;
  return need('requirePrivateDocAuth')(card)===true;
 },
 isPrivate:function(card){
  if(!card)return false;
  return need('isPrivateDocCard')(card)===true;
 },
 isVerified:function(card){
  if(!card)return false;
  return need('isPrivateDocAuthVerified')(card)===true;
 },
 getCapabilities:function(){
  return {
   requirePrivate:typeof window.requirePrivateDocAuth==='function',
   isPrivate:typeof window.isPrivateDocCard==='function',
   isVerified:typeof window.isPrivateDocAuthVerified==='function'
  };
 }
};
window.SitePassDocumentVerification=Object.freeze(api);
})();