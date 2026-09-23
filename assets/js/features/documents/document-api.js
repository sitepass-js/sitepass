(function(){'use strict';
function req(name,value){if(!value)throw new Error('[SitePass Step81] missing document module: '+name);return value;}
var upload=req('upload',window.SitePassDocumentUpload);
var verification=req('verification',window.SitePassDocumentVerification);
var viewer=req('viewer',window.SitePassDocumentViewer);
var renewal=req('renewal',window.SitePassDocumentRenewal);
var selection=req('selection',window.SitePassDocumentSelection);
var api={
 version:'step81-v5-active-canonical-renewal',
 upload:upload,verification:verification,viewer:viewer,renewal:renewal,selection:selection,
 getCapabilities:function(){return {upload:!!upload,verification:!!verification,viewer:!!viewer,renewal:!!renewal,selection:!!selection};}
};
window.SitePassDocument=Object.freeze(api);
})();