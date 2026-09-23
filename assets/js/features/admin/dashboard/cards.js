// SitePass STEP88 - admin dashboard cards
(function(){
  'use strict';

  function esc(value){
    return String(value == null ? '' : value)
      .replace(/[&<>"']/g, function(ch){
        return ({
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        })[ch];
      });
  }

  function n(value){
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function quickLine(label, value, action){
    if (!action) {
      return '<div class="line"><b>' + esc(label) + '</b><span>' +
        esc(value) + '</span></div>';
    }
    return '<button type="button" class="admin-quick-line" onclick="' +
      esc(action) + '"><b>' + esc(label) + '</b><span>' +
      esc(value) + '</span></button>';
  }

  function renderTop(local, summary){
    local = local || {};
    summary = summary || {};
    var eq = summary.equipment || {};
    var members = summary.members || {};
    var generatedAt = summary.generatedAt || '';
    var generatedText = generatedAt
      ? '요약갱신 ' + esc(generatedAt)
      : '서버 요약 대기 중';

    return '<div class="card sitepass-admin-dashboard-card-v727 sitepass-admin-dashboard-summary-v730r5" style="box-shadow:none;margin-top:12px;">' +
      '<h3>관리자 요약 현황</h3>' +
      '<div class="small">' + generatedText +
        ' · 방문자 2개 항목은 현재 브라우저 집계이며 서버 방문자 집계는 후속 단계에서 연결합니다.</div>' +
      '<div class="admin-summary-rows">' +
        '<div class="admin-summary-row sitepass-admin-dashboard-summary-row-v730r5">' +
          '<div class="line"><b>오늘 방문자</b><span>' + n(local.todayVisitors) + '명</span></div>' +
          '<div class="line"><b>누적 방문자</b><span>' + n(local.totalVisitors) + '명</span></div>' +
          '<div class="line"><b>오늘 가입</b><span>' + n(members.todaySignups) + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row sitepass-admin-dashboard-summary-row-v730r5">' +
          '<div class="line"><b>오늘 장비등록 완료</b><span>' + n(eq.todayCompleted) + '대</span></div>' +
          '<div class="line"><b>장비등록 대기</b><span>' + n(eq.registrationWaiting) + '건</span></div>' +
          '<div class="line"><b>누적 장비등록 완료</b><span>' + n(eq.totalCompleted) + '대</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderTodo(local, summary){
    local = local || {};
    summary = summary || {};
    var eq = summary.equipment || {};

    var rows = [
      { label:'장비등록 대기', count:n(eq.registrationWaiting), unit:'건', action:"sitePassSetAdminSectionV578('equipment')" },
      { label:'문의 답변대기', count:n(local.waitingContacts), unit:'건', action:"sitePassSetAdminSectionV578('contacts')" },
      { label:'QR 일시정지', count:n(eq.paused), unit:'건', action:"openAdminListQuickFilter('paused')" },
      { label:'서류 만료임박', count:n(eq.expiringDocs), unit:'건', action:"openAdminListQuickFilter('expiring')" },
      { label:'서류 만료', count:n(eq.expiredDocs), unit:'건', action:"openAdminListQuickFilter('expired')" },
      { label:'유예 14일 이상', count:n(eq.grace14Items), unit:'건', action:"openAdminListQuickFilter('grace14')" }
    ].filter(function(row){
      return row.count > 0;
    });

    if (!rows.length) return '';

    return '<div class="card sitepass-admin-dashboard-card-v727 sitepass-admin-dashboard-todo-v730r5" style="box-shadow:none;margin-top:12px;">' +
      '<h3>확인해야 할 사항</h3>' +
      rows.map(function(row){
        return quickLine(row.label, row.count + row.unit, row.action);
      }).join('') +
    '</div>';
  }

  function renderShare(summary){
    summary = summary || {};
    var share = summary.share || {};
    return '<div class="card sitepass-admin-dashboard-share-v578 sitepass-admin-dashboard-card-v727" style="box-shadow:none;margin-top:12px;">' +
      '<div class="sitepass-admin-section-head-v578"><div><h3>공유기록 현황</h3>' +
      '<div class="small">Recipient V2 최근 ' + n(share.windowLimit || 200) + '개 이벤트 서버 요약</div></div>' +
      '<button type="button" class="ghost" onclick="return sitePassSetAdminSectionV578(\'shares\')">공유기록 열기</button></div>' +
      '<div class="sitepass-admin-kpi-grid-v578">' +
        '<div><b>전송</b><span>' + n(share.sent) + '</span></div>' +
        '<div><b>열람</b><span>' + n(share.opened) + '</span></div>' +
        '<div><b>다운로드</b><span>' + n(share.downloaded) + '</span></div>' +
        '<div><b>인쇄</b><span>' + n(share.printed) + '</span></div>' +
        '<div><b>만료</b><span>' + n(share.expired) + '</span></div>' +
        '<div><b>회수</b><span>' + n(share.revoked) + '</span></div>' +
      '</div>' +
    '</div>';
  }

  window.SitePassAdminDashboardCards = Object.freeze({
    renderTop: renderTop,
    renderTodo: renderTodo,
    renderShare: renderShare
  });
})();
