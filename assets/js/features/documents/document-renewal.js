(function(){'use strict';
function updateApi(){var e=window.SitePassEquipment,u=e&&e.update;if(!u||typeof u.start!=='function')throw new Error('[SitePass Step81] equipment update public API unavailable');return u;}
var api={
 open:function(code){var target=String(code||'').trim();if(!target)return {ok:false,reason:'empty-code'};return updateApi().start(target);},
 openCurrent:function(){var u=updateApi();if(typeof u.startCurrent!=='function')throw new Error('[SitePass Step81] equipment current-update public API unavailable');return u.startCurrent();},
 getCapabilities:function(){var e=window.SitePassEquipment,u=e&&e.update;return {open:!!(u&&typeof u.start==='function'),openCurrent:!!(u&&typeof u.startCurrent==='function')};}
};
window.SitePassDocumentRenewal=Object.freeze(api);
})();