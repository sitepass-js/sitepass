// SitePass v23.7.266 split step 13 - 장비서류 등록 전용 보조 파일
// 이 파일에는 장비/기사/인부 등록 서류 정의, 기본 입력 검증, 통합서류함 메타데이터 생성을 둡니다.
// 실제 사진 보정/저장/결제 이동은 아직 app.bundle.js에 남겨두고, 다음 단계에서 더 나눕니다.
(function(){
  'use strict';

  const DOC_GROUPS = [
    {
      key:'equipment', title:'장비서류', required:true, enabled:true,
      summary:'장비 1대 기준 기본 필수서류입니다.',
      docs:[
        { key:'businessLicense', title:'사업자등록증', required:true, expiry:false, note:'사업자등록증은 필수입니다.' },
        { key:'equipmentRegistration', title:'장비등록증', required:true, expiry:false, note:'장비등록증은 필수입니다.' },
        { key:'equipmentInspection', title:'장비검사증', required:true, expiry:true, dateKey:'inspectionExpireDate', dateLabel:'장비검사증 만료날짜', note:'장비검사증은 필수이며 만료날짜를 입력합니다.' },
        { key:'insurancePolicy', title:'장비보험증권', required:true, expiry:true, dateKey:'insuranceExpireDate', dateLabel:'장비보험증권 만료날짜', note:'장비보험증권은 필수이며 만료날짜를 입력합니다.' },
        { key:'ndtInspection', title:'장비비파괴검사증', required:false, expiry:true, dateKey:'ndtExpireDate', dateLabel:'비파괴검사 만료날짜', optionalExpiry:true, note:'선택 서류입니다. 첨부하는 경우 만료날짜를 입력하면 알림 관리가 가능합니다.' },
        { key:'equipmentLedger', title:'장비갑원부', required:false, expiry:false, note:'선택 서류입니다. 없어도 저장 가능합니다.' },
        { key:'specSheet', title:'장비제원표', required:false, expiry:false, note:'선택 서류입니다. 장비 제원 확인이 필요한 현장에 제출합니다.' },
        { key:'otherEquipment', title:'기타서류', required:false, expiry:false, note:'선택 서류입니다. 필요한 장비서류를 추가로 올릴 수 있습니다.' }
      ]
    },
    {
      key:'driver', title:'장비기사서류', required:false, enabled:false,
      summary:'체크하면 장비 기사 서류를 같은 QR에 포함합니다.',
      docs:[
        { key:'driverIdCard', title:'기사 신분증', required:true, expiry:false, extraPhone:true, note:'기사서류를 포함하면 필수입니다. 전화번호는 신분증 사진 아래 표시용으로 선택 입력합니다.' },
        { key:'driverLicense', title:'기사면허증', required:true, expiry:false, note:'기사서류를 포함하면 필수입니다.' },
        { key:'driverBasicSafetyTraining', title:'기사 건설기초안전보건교육 이수증', required:true, expiry:false, note:'기사서류를 포함하면 필수입니다.' },
        { key:'driverMachinerySafetyTraining', title:'기사 건설기계조종사 안전교육 이수증', required:false, expiry:true, dateKey:'driverMachinerySafetyTrainingDate', dateLabel:'건설기계조종사 안전교육 날짜', optionalExpiry:true, note:'선택 서류입니다. 3년마다 이수해야 하므로 기준 날짜를 입력합니다.' },
        { key:'driverSpecialHealthCheck', title:'특수건강검진', required:false, expiry:false, note:'선택 서류입니다. 현장 요구 시 첨부합니다.' },
        { key:'otherDriverDoc', title:'기타서류', required:false, expiry:false, note:'선택 서류입니다. 필요한 기사서류를 추가로 올릴 수 있습니다.' }
      ]
    },
    {
      key:'worker', title:'인부서류', required:false, enabled:false,
      summary:'보통인부/특수인부를 2명, 3명 이상 같은 QR에 포함합니다.',
      docs:[]
    }
  ];

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  }

  function getDocGroups() {
    return clone(DOC_GROUPS);
  }

  function getDocs() {
    return DOC_GROUPS.flatMap(group => group.docs.map(doc => ({ ...doc, groupKey:group.key, groupTitle:group.title })));
  }

  function getGroup(groupKey) {
    return getDocGroups().find(group => group.key === groupKey) || null;
  }

  function getDocDef(docKey) {
    return getDocs().find(doc => doc.key === docKey) || null;
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeEquipmentNo(value) {
    return normalizeText(value).replace(/\s+/g, '').toUpperCase();
  }

  function collectBasicFields(doc) {
    const root = doc || document;
    const noEl = root.getElementById ? root.getElementById('equipmentNo') : null;
    const nameEl = root.getElementById ? root.getElementById('equipmentName') : null;
    return {
      equipmentNo: normalizeEquipmentNo(noEl ? noEl.value : ''),
      equipmentName: normalizeText(nameEl ? nameEl.value : ''),
      equipmentNoRaw: noEl ? String(noEl.value || '') : '',
      equipmentNameRaw: nameEl ? String(nameEl.value || '') : ''
    };
  }

  function validateBasicFields(fields) {
    const equipmentNo = normalizeEquipmentNo(fields && fields.equipmentNo);
    const equipmentName = normalizeText(fields && fields.equipmentName);
    if (!equipmentNo) return { ok:false, field:'equipmentNo', focusId:'equipmentNo', message:'장비 등록번호를 입력해주세요.' };
    if (equipmentNo.length < 4) return { ok:false, field:'equipmentNo', focusId:'equipmentNo', message:'장비 등록번호를 너무 짧게 입력했습니다. 예: 00가0000' };
    if (!equipmentName) return { ok:false, field:'equipmentName', focusId:'equipmentName', message:'장비명을 입력해주세요.' };
    return { ok:true, equipmentNo, equipmentName };
  }

  function buildBundleMeta(options) {
    const docGroups = Array.isArray(options && options.docGroups) ? options.docGroups : getDocGroups();
    const includedGroups = Array.isArray(options && options.includedGroups) ? options.includedGroups : ['equipment'];
    const workerPeople = Array.isArray(options && options.workerPeople) ? options.workerPeople : [];
    const normalWorkerCount = workerPeople.filter(p => p && p.type !== 'special').length;
    const specialWorkerCount = workerPeople.filter(p => p && p.type === 'special').length;
    const includedGroupNames = docGroups.filter(group => includedGroups.includes(group.key)).map(group => group.title);
    return {
      unit:'통합 서류함 1건',
      includedGroups,
      includedGroupNames,
      workerPeopleCount: workerPeople.length,
      normalWorkerCount,
      specialWorkerCount,
      workerPeople,
      paymentText:'실사용 베타 운영 중입니다'
    };
  }

  function getRequiredDocTitles(groupKey) {
    return getDocs().filter(doc => (!groupKey || doc.groupKey === groupKey) && doc.required).map(doc => doc.groupTitle + ' - ' + doc.title);
  }

  function getExpiryDocTitles(groupKey) {
    return getDocs().filter(doc => (!groupKey || doc.groupKey === groupKey) && doc.expiry).map(doc => doc.groupTitle + ' - ' + doc.title);
  }

  window.SitePassEquipmentRegister = {
    getDocGroups,
    getDocs,
    getGroup,
    getDocDef,
    normalizeText,
    normalizeEquipmentNo,
    collectBasicFields,
    validateBasicFields,
    buildBundleMeta,
    getRequiredDocTitles,
    getExpiryDocTitles
  };
})();
