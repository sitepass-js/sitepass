/*
 * SitePass STEP82 V28 TEST_ONLY
 * Equipment relation badge rendering only.
 * Document/service badges remain in the archive UI module.
 */
(function () {
  'use strict';

  var root =
    window.SitePassEquipmentLinkV82 =
      window.SitePassEquipmentLinkV82 || {};

  function renderRelationBadges(item) {
    var relation = String(
      item && item.relationType
        ? item.relationType
        : ''
    );

    if (relation === 'linked_in') {
      return (
        '<span class="sp562-badge relation linked-in">' +
        '연동받은 장비' +
        '</span>'
      );
    }

    if (relation === 'linked_out') {
      return (
        '<span class="sp562-badge relation owned">내 장비</span>' +
        '<span class="sp562-badge relation linked-out">' +
        '1명에게 연동중' +
        '</span>'
      );
    }

    return (
      '<span class="sp562-badge relation owned">' +
      '내 장비' +
      '</span>'
    );
  }

  root.badge = Object.freeze({
    renderRelationBadges: renderRelationBadges
  });
})();
