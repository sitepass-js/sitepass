// SitePass v23.7.273 split step - 결제/이용권 보조 파일
// 요금제, 만료일, QR 일시정지/차단 판단처럼 결제와 이용권에 관련된 순수 보조 기능입니다.
// 실제 결제 버튼, 자동결제 테스트, 관리자 환불/정지 처리는 안정성을 위해 app.bundle.js/admin-detail.js에 남겨두고 다음 단계에서 더 나눕니다.
(function(){
  'use strict';

  function normalizePlan(plan) {
    return plan === 'annual' ? 'annual' : 'monthly';
  }

  function getPlanInfo(plan, options) {
    const cleanPlan = normalizePlan(plan);
    const additional = typeof options === 'boolean' ? options : !!(options && options.additional);
    if (cleanPlan === 'annual') {
      const price = additional ? '연 9,900원' : '연 19,900원';
      const label = additional ? '추가등록 연 결제' : '1대 등록 연 결제';
      return { key:'annual', label, price, days:365, serviceStatus:'유료사용', planText:label + ' · ' + price, additional };
    }
    const price = additional ? '월 1,000원' : '월 2,000원';
    const label = additional ? '추가등록 월 결제' : '1대 등록 월 결제';
    return { key:'monthly', label, price, days:30, serviceStatus:'유료사용', planText:label + ' · ' + price, additional };
  }

  function addDaysIso(baseIso, days) {
    const d = baseIso ? new Date(baseIso) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString();
  }

  function getPaymentDueDays(item) {
    if (!item || !item.trialEndsAt) return null;
    const end = new Date(item.trialEndsAt).getTime();
    if (Number.isNaN(end)) return null;
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function isPaymentDueSoon(item, thresholdDays) {
    const diff = getPaymentDueDays(item);
    const threshold = Number.isFinite(Number(thresholdDays)) ? Number(thresholdDays) : 7;
    return diff !== null && diff <= threshold;
  }

  function getPaymentDueText(item) {
    if (!item || !item.trialEndsAt) return '종료일 미설정';
    const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
    if (Number.isNaN(diff)) return '종료일 오류';
    if (diff < 0) return Math.abs(diff) + '일 지남';
    if (diff === 0) return '오늘 종료';
    return diff + '일 남음';
  }

  function getServiceOverdueDays(item) {
    if (!item || !item.trialEndsAt) return null;
    const end = new Date(item.trialEndsAt);
    if (Number.isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff < 0 ? Math.abs(diff) : 0;
  }

  function isServiceGrace14Over(item) {
    const overdueDays = getServiceOverdueDays(item);
    return overdueDays !== null && overdueDays >= 14;
  }

  function isQrPaused(item) {
    if (!item) return false;
    if (item.serviceStatus === '정지') return true;
    if (!item.trialEndsAt) return false;
    const end = new Date(item.trialEndsAt).getTime();
    if (Number.isNaN(end)) return false;
    return end < Date.now();
  }

  function isServiceShareBlocked(item) {
    return isQrPaused(item);
  }

  function getServiceBlockReason(item) {
    if (!item) return '서류함 없음';
    if (item.serviceStatus === '정지') return '관리자 정지';
    if (!item.trialEndsAt) return '결제기간 미설정';
    const overdueDays = getServiceOverdueDays(item);
    if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과';
    return '실사용 베타기간/결제기간 만료';
  }

  function getShareBlockedItems(items) {
    return (items || []).filter(item => item && isServiceShareBlocked(item));
  }

  function formatDateOnly(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function getServiceStatusText(item) {
    if (!item) return '상태 없음';
    if (isQrPaused(item)) {
      const overdueDays = getServiceOverdueDays(item);
      if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과 / QR 일시정지';
      return '실사용 베타 만료 / QR 일시정지';
    }
    const endText = item.trialEndsAt ? formatDateOnly(item.trialEndsAt) : '기간 미설정';
    return (item.serviceStatus || '실사용베타') + ' · 종료일 ' + endText;
  }

  window.SitePassAdminPayments = {
    normalizePlan,
    getPlanInfo,
    addDaysIso,
    getPaymentDueDays,
    isPaymentDueSoon,
    getPaymentDueText,
    getServiceOverdueDays,
    isServiceGrace14Over,
    isQrPaused,
    isServiceShareBlocked,
    getServiceBlockReason,
    getShareBlockedItems,
    formatDateOnly,
    getServiceStatusText
  };
})();
