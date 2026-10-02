// SitePass STEP95 - migrations page renderer
(function(){
  'use strict';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function shortId(value){
    var text = String(value || '');
    return text.length > 12 ? text.slice(0, 8) + '…' + text.slice(-4) : text;
  }

  function dateText(value){
    if (!value) return '-';
    var d = new Date(value);
    return Number.isNaN(d.getTime()) ? esc(value) : esc(d.toLocaleString());
  }

  function summaryHtml(summary){
    var keys = Object.keys(summary || {}).sort();
    if (!keys.length) return '<span class="small">상태 집계 없음</span>';
    return keys.map(function(key){
      return '<span class="small" style="display:inline-block;margin-right:10px;"><b>' +
        esc(key) + '</b> ' + esc(summary[key]) + '</span>';
    }).join('');
  }

  function render(){
    var api = window.SitePassAdminMigrationsV95 || null;
    if (!api || typeof api.getState !== 'function') {
      return '<div class="notice">이전관리 모듈을 불러오지 못했습니다.</div>';
    }

    var state = api.getState();
    var rows = state.items || [];
    var statusOptions = ['', 'blocked_auth', 'planned', 'copied', 'verified', 'cutover', 'retired', 'error'];

    var controls =
      '<div class="actions" style="margin:8px 0;">' +
        '<select id="sitepassStep95MigrationStatus" aria-label="이전 상태 필터">' +
          statusOptions.map(function(value){
            var label = value || '전체 상태';
            return '<option value="' + esc(value) + '"' + (state.status === value ? ' selected' : '') + '>' + esc(label) + '</option>';
          }).join('') +
        '</select>' +
        '<button type="button" class="ghost" onclick="return SitePassAdminStep95Page.applyMigrationFilter()">필터 적용</button>' +
        '<button type="button" class="ghost" onclick="return SitePassAdminStep95Page.refreshActive()">새로고침</button>' +
      '</div>';

    if (state.loading && !state.loaded) {
      return '<div class="notice blue-note">이전 상태를 1회 조회 중입니다.</div>' + controls;
    }

    if (state.error) {
      return '<div class="notice">이전 상태 조회 실패: ' + esc(state.error) + '</div>' + controls;
    }

    if (!state.loaded) {
      return '<div class="notice blue-note">이전 상태를 불러오기 전입니다.</div>' + controls;
    }

    var table = rows.length
      ? '<div style="overflow:auto;"><table style="width:100%;border-collapse:collapse;">' +
          '<thead><tr><th>파일</th><th>원본 bucket</th><th>대상 bucket</th><th>상태</th><th>대상경로 준비</th><th>갱신시각</th></tr></thead>' +
          '<tbody>' + rows.map(function(row){
            return '<tr>' +
              '<td><code>' + esc(shortId(row.fileId)) + '</code></td>' +
              '<td>' + esc(row.sourceBucket || '-') + '</td>' +
              '<td>' + esc(row.targetBucket || '-') + '</td>' +
              '<td>' + esc(row.migrationStatus || '-') + (row.blockedReason ? '<div class="small">' + esc(row.blockedReason) + '</div>' : '') + '</td>' +
              '<td>' + (row.targetPathReady ? '준비됨' : '미준비') + '</td>' +
              '<td>' + dateText(row.updatedAt) + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
      : '<div class="notice">조건에 맞는 이전 대상이 없습니다.</div>';

    var pageNo = Math.floor(state.offset / state.limit) + 1;
    var hasPrev = state.offset > 0;
    var hasNext = state.offset + rows.length < state.filteredCount;

    return controls +
      '<div style="margin:8px 0;">' +
        summaryHtml(state.statusSummary) +
        '<div class="small" style="margin-top:4px;">필터 결과 ' + esc(state.filteredCount) + '건 · ' + pageNo + '페이지</div>' +
      '</div>' +
      table +
      '<div class="actions" style="margin-top:10px;">' +
        '<button type="button" class="ghost" ' + (hasPrev ? '' : 'disabled ') + 'onclick="return SitePassAdminStep95Page.migrationPrev()">이전</button>' +
        '<button type="button" class="ghost" ' + (hasNext ? '' : 'disabled ') + 'onclick="return SitePassAdminStep95Page.migrationNext()">다음</button>' +
      '</div>';
  }

  window.SitePassAdminMigrationsPageV95 = Object.freeze({ render: render });
})();
