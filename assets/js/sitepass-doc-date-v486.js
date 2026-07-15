/* SitePass v23.7.486-test - 안전교육 이수일 + 3년 호환 처리 */
(function(){
  'use strict';

  function iso(value){
    var text = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  }

  function addYears(value, years){
    var text = iso(value);
    if (!text) return '';
    var parts = text.split('-').map(Number);
    var targetYear = parts[0] + Number(years || 0);
    var month = parts[1];
    var day = parts[2];
    var lastDay = new Date(targetYear, month, 0).getDate();
    var safeDay = Math.min(day, lastDay);
    return String(targetYear).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(safeDay).padStart(2, '0');
  }

  function isMachinerySafety(doc){
    if (!doc || typeof doc !== 'object') return false;
    var key = String(doc.key || doc.docKey || doc.doc_kind || '');
    var title = String(doc.title || doc.docTitle || doc.name || '');
    return key === 'driverMachinerySafetyTraining' ||
      doc.dateMode === 'educationPlus3Years' ||
      (title.indexOf('건설기계조종사') >= 0 && title.indexOf('안전교육') >= 0);
  }

  function educationDate(doc){
    if (!isMachinerySafety(doc)) return '';
    var explicit = iso(doc.educationDate || doc.trainingDate || doc.issueDate || doc.completedDate || '');
    if (explicit) return explicit;
    var raw = iso(doc.expireDate || doc.expiryDate || '');
    if (!raw) return '';
    // v478 이후 축약 서버자료는 교육일 필드가 빠지고 계산된 예정일만 남을 수 있었습니다.
    // 날짜 라벨이 이미 '이수일'이면 raw를 다시 3년 더하지 않고 예정일로 유지합니다.
    var label = String(doc.dateLabel || '');
    if (label.indexOf('이수일') >= 0) return '';
    // v478 이전 자료는 사용자가 입력한 교육일이 expireDate 칸에 그대로 저장되었습니다.
    return raw;
  }

  function effectiveExpireDate(doc){
    if (!doc || typeof doc !== 'object') return '';
    if (isMachinerySafety(doc)) {
      var edu = educationDate(doc);
      if (edu) return addYears(edu, 3);
      return iso(doc.expireDate || doc.expiryDate || '');
    }
    return iso(doc.expireDate || doc.expiryDate || doc.expiredAt || '');
  }

  function normalizeDoc(doc){
    if (!doc || typeof doc !== 'object' || !isMachinerySafety(doc)) return doc;
    var edu = educationDate(doc);
    var due = edu ? addYears(edu, 3) : iso(doc.expireDate || doc.expiryDate || '');
    if (edu) doc.educationDate = edu;
    if (due) doc.expireDate = due;
    doc.dateMode = 'educationPlus3Years';
    return doc;
  }

  function normalizeItem(item){
    if (!item || typeof item !== 'object') return item;
    var docs = item.docs;
    if (docs && typeof docs === 'object') Object.keys(docs).forEach(function(key){ normalizeDoc(docs[key]); });
    return item;
  }

  function normalizeItems(items){
    return (Array.isArray(items) ? items : []).map(normalizeItem);
  }

  window.sitePassIsMachinerySafetyDocV486 = isMachinerySafety;
  window.sitePassGetEducationDateV486 = educationDate;
  window.sitePassGetEffectiveDocExpireDateV486 = effectiveExpireDate;
  window.sitePassNormalizeDocDateV486 = normalizeDoc;
  window.sitePassNormalizeItemDocDatesV486 = normalizeItem;
  window.sitePassNormalizeItemsDocDatesV486 = normalizeItems;
})();
