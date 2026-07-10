// SitePass v23.7.272 split step - 카메라/문서스캔 보조 파일
// 사진찍기, 촬영모드, 스캔 파일명, A4/카드 모드 판단에 필요한 순수 보조 기능입니다.
// 실제 촬영/캔버스 보정 본체는 안정성을 위해 app.bundle.js에 남겨두고, 이번 단계에서는 판단/표시/파일명 생성 기능부터 분리합니다.
(function(){
  'use strict';

  const CARD_DOC_KEYS = [
    'driveridcard',
    'driverlicense',
    'driverbasicsafetytraining',
    'workeridcard',
    'workersafetytraining'
  ];

  function normalizeDocKey(docKey) {
    return String(docKey || '').toLowerCase().replace(/_[a-z0-9-]+$/i, '');
  }

  function isCardDocumentKey(docKey) {
    return CARD_DOC_KEYS.includes(normalizeDocKey(docKey));
  }

  function getDefaultScanMode(docKey) {
    return isCardDocumentKey(docKey) ? 'card' : 'a4';
  }

  function normalizeScanMode(mode, docKey) {
    if (mode === 'card' && isCardDocumentKey(docKey)) return 'card';
    return 'a4';
  }

  function getModeTexts(docKey, mode, docTitle) {
    const normalized = normalizeScanMode(mode, docKey);
    const title = String(docTitle || '서류');
    if (normalized === 'card') {
      return {
        mode:'card',
        label:'현재 촬영모드: 카드/이수증 A4 상단 1/2 배치 · ' + title,
        help:'카드를 가로 노란틀에 크게 맞추세요. 촬영 후 A4 상단 1/2 칸에 크게 배치됩니다.',
        status:'카드를 가로 노란틀에 맞춰주세요',
        note:'카드/이수증만 이 모드를 씁니다 · 밝기보정 없음'
      };
    }
    return {
      mode:'a4',
      label:'현재 촬영모드: A4 서류 전체 맞춤 · ' + title,
      help:'서류를 세로 노란틀에 크게 맞추세요. 촬영 후 A4 한 장 크기로 맞춥니다.',
      status:'A4 서류를 세로 노란틀에 맞춰주세요',
      note:'장비서류는 A4 모드입니다 · 밝기보정 없음'
    };
  }

  function buildScanFileName(prefix) {
    const safePrefix = String(prefix || 'sitepass_scan').replace(/[^a-zA-Z0-9_-]/g, '_') || 'sitepass_scan';
    return safePrefix + '_' + Date.now() + '.jpg';
  }

  function getScanSourceLabel(mode, sourceLabel) {
    const label = String(sourceLabel || '사진촬영');
    return normalizeScanMode(mode) === 'card' ? label + ' · 카드형 A4 상단 1/2 위치맞춤' : label + ' · A4 크기맞춤';
  }

  window.SitePassCameraScan = {
    normalizeDocKey,
    isCardDocumentKey,
    getDefaultScanMode,
    normalizeScanMode,
    getModeTexts,
    buildScanFileName,
    getScanSourceLabel
  };
})();
