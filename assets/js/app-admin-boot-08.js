// SitePass v23.7.299 - app-admin-boot split continue (08/08)
function expireUnpaidPaymentTestData() {
      if (!isSuperAdminLoggedIn()) { alert('베타기간 종료 처리는 최고관리자만 가능합니다.'); return; }
      const items = getItems();
      const members = getMembers();
      const unpaidItems = items.filter(item => isPaymentTestItem(item) && item.paymentTestPaid !== true);
      if (!unpaidItems.length) { alert('강제 종료할 미결제 임시 장비가 없습니다. 먼저 임시 데이터를 생성해주세요.'); return; }
      const yesterday = addDaysIso(new Date().toISOString(), -1);
      const grace15 = addDaysIso(new Date().toISOString(), -15);
      const unpaidMemberIds = new Set();
      items.forEach(item => {
        if (isPaymentTestItem(item) && item.paymentTestPaid !== true) {
          const seq = Number(String(item.code || '').replace(PAYMENT_TEST_CODE_PREFIX, '')) || 0;
          item.trialEndsAt = seq > 80 ? grace15 : yesterday;
          item.serviceStatus = seq > 80 ? '유예14일경과' : '실사용베타만료';
          item.updatedAt = new Date().toISOString();
          item.managerExpireAt = yesterday;
          unpaidMemberIds.add(item.ownerMemberId);
        }
      });
      members.forEach(member => {
        if (isPaymentTestMember(member) && member.paymentTestPaid !== true) {
          const idx = Number(String(member.id || '').replace(PAYMENT_TEST_MEMBER_PREFIX, '')) || 0;
          member.status = idx > 40 ? '정지' : '미결제';
          member.paymentPlanLabel = '미결제';
          member.memberPlan = '미결제';
          member.paymentStatus = '베타종료 미결제';
          member.paymentEndsAt = idx > 40 ? grace15 : yesterday;
          member.updatedAt = new Date().toISOString();
        }
      });
      setItems(items);
      setMembers(members);
      alert('베타기간 강제 종료 완료\n\n미결제 임시 장비 60대가 QR 차단 대상입니다.\n그중 뒤쪽 20대는 유예 14일 이상으로 잡히게 했습니다.\n\n이제 [QR 차단검사]를 눌러 확인하세요.');
      renderAdmin();
    }

    function runPaymentConversionShareBlockTest() {
      const stats = getPaymentConversionTestStats();
      if (!stats.testItems) { alert('임시 데이터가 없습니다. 먼저 임시 50명 / 장비 100대를 생성해주세요.'); return; }
      const testItems = getItems().filter(isPaymentTestItem);
      const blocked = testItems.filter(item => isServiceShareBlocked(item));
      const allowed = testItems.filter(item => !isServiceShareBlocked(item));
      const expiredUnpaid = testItems.filter(item => item.paymentTestPaid !== true && item.trialEndsAt && new Date(item.trialEndsAt).getTime() < Date.now());
      if (!expiredUnpaid.length) { alert('아직 베타기간이 끝난 미결제 장비가 없습니다.\n먼저 [베타기간 강제 종료]를 눌러주세요.'); return; }
      const failed = expiredUnpaid.filter(item => !isServiceShareBlocked(item));
      const paidBlocked = testItems.filter(item => item.paymentTestPaid === true && isServiceShareBlocked(item));
      const resultOk = failed.length === 0 && paidBlocked.length === 0;
      alert('QR 차단검사 결과\n\n총 임시 장비: ' + testItems.length + '대\nQR 가능: ' + allowed.length + '대\nQR 차단: ' + blocked.length + '대\n베타종료 미결제 장비: ' + expiredUnpaid.length + '대\n\n베타종료 미결제인데 보내지는 오류: ' + failed.length + '대\n결제했는데 막히는 오류: ' + paidBlocked.length + '대\n\n' + (resultOk ? '정상입니다. 베타기간이 끝난 미결제 장비는 QR 보내기/링크열람이 차단됩니다.' : '오류가 있습니다. 위 숫자를 확인해야 합니다.'));
    }

    async function clearPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 삭제는 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 삭제할까요?\n실제 회원/장비는 유지됩니다.')) return;
      setMembers(getMembers().filter(member => !isPaymentTestMember(member)));
      setItems(getItems().filter(item => !isPaymentTestItem(item)));
      const supabaseResult = await deletePaymentTestMembersFromSupabase();
      const supabaseMessage = supabaseResult.skipped ? '\nSupabase 연결이 없어 브라우저 임시 데이터만 삭제했습니다.' : '\nSupabase sitepass_members의 paytest 임시 회원도 삭제 처리했습니다.';
      alert('임시 유료전환 임시 데이터를 삭제했습니다.' + supabaseMessage);
      renderAdmin();
    }

    function getLocalDateKey(value) {
      const date = value ? new Date(value) : new Date();
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function getVisitStats() {
      try {
        const saved = JSON.parse(localStorage.getItem(VISIT_STATS_KEY) || 'null');
        if (saved && typeof saved === 'object') {
          return {
            total: Number(saved.total || 0),
            daily: saved.daily && typeof saved.daily === 'object' ? saved.daily : {}
          };
        }
      } catch (e) {}
      return { total:0, daily:{} };
    }

    function setVisitStats(stats) {
      localStorage.setItem(VISIT_STATS_KEY, JSON.stringify({
        total:Number(stats?.total || 0),
        daily:stats?.daily && typeof stats.daily === 'object' ? stats.daily : {}
      }));
    }

    function recordSiteVisit() {
      const todayKey = getLocalDateKey();
      const stats = getVisitStats();
      stats.total = Number(stats.total || 0) + 1;
      stats.daily = stats.daily && typeof stats.daily === 'object' ? stats.daily : {};
      stats.daily[todayKey] = Number(stats.daily[todayKey] || 0) + 1;
      const recentDays = {};
      Object.keys(stats.daily).sort().slice(-31).forEach(key => { recentDays[key] = Number(stats.daily[key] || 0); });
      stats.daily = recentDays;
      setVisitStats(stats);
      return stats;
    }

    function countTodaySignups(members) {
      const todayKey = getLocalDateKey();
      return (members || []).filter(member => getLocalDateKey(member?.createdAt) === todayKey).length;
    }

    function renderAdminQuickLine(label, value, action) {
      if (!action) return '<div class="line"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></div>';
      return '<button type="button" class="admin-quick-line" onclick="' + action + '"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></button>';
    }

    function renderAdminTodoSummary(data) {
      const rows = [
        { label:'문의 답변대기', value:(data.waitingContacts || 0) + '건', action:'openAdminContactManager()' },
        { label:'QR 일시정지', value:(data.paused || 0) + '건', action:'openAdminListQuickFilter(\'paused\')' },
        { label:'서류 만료임박', value:(data.expiringDocs || 0) + '건', action:'openAdminListQuickFilter(\'expiring\')' },
        { label:'서류 만료', value:(data.expiredDocs || 0) + '건', action:'openAdminListQuickFilter(\'expired\')' },
        { label:'유예 14일 이상', value:(data.grace14Items || 0) + '건', action:'openAdminListQuickFilter(\'grace14\')' }
      ];
      const rowHtml = rows.map(item => renderAdminQuickLine(item.label, item.value, item.action)).join('');
      return '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>확인해야 할 사항</h3>' +
        '<div class="notice blue-note" style="margin-top:0;">중복되는 항목은 빼고, 바로 눌러서 이동할 항목만 남겼습니다. 유예 14일 이상 경과한 서류함도 별도로 확인합니다.</div>' +
        rowHtml +
      '</div>';
    }

    function ensureAdminSampleData() {
      // v23.7.112부터는 실제 가입 확인를 위해 샘플 회원/샘플 장비서류를 자동 생성하지 않습니다.
    }

    function resetSitePassTestDataOnce() {
      // v23.7.198부터 수정본 배포 시 실제 가입 회원/카카오/네이버/일반 회원 localStorage 데이터를 자동 삭제하지 않고, 탈퇴 카카오 계정은 자동로그인을 차단합니다.
      // 이전 베타 초기화 키가 없더라도 아무 데이터도 지우지 않고 방문자수만 기록합니다.
      return false;
    }

    function openManagerDemoView() {
      const item = ensureManagerDemoItem();
      openManagerPublicView(item.code, getManagerExpireAt(item));
    }

    function openManagerDemoDetail() {
      const item = ensureManagerDemoItem();
      renderDetail(item.code);
    }

    function checkHash() {
      const hash = window.location.hash || '';
      if (hash.startsWith('#pay=')) {
        handleAutoPaymentHash(hash);
        return true;
      }
      if (hash.startsWith('#manager=')) {
        const parsed = parseManagerHash(hash);
        renderManagerPrintFromHash(parsed);
        return true;
      }
      if (hash.startsWith('#qr=')) {
        const code = decodeURIComponent(hash.replace('#qr=', ''));
        renderPublic(code);
        return true;
      }
      if (hash === '#admin' || hash === '#관리자') {
        showScreen(isAdminLoggedIn() ? 'adminScreen' : 'signupScreen');
        return true;
      }
      return false;
    }

    window.addEventListener('popstate', function(event) {
      const state = event.state || {};
      if (state.sitepassScreen) {
        sitePassHandlingPopState = true;
        showScreen(state.sitepassScreen, { skipHistory:true });
        sitePassHandlingPopState = false;
        return;
      }
      if (window.location.hash && checkHash()) return;
      const fallbackScreen = isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen');
      sitePassHandlingPopState = true;
      showScreen(fallbackScreen, { skipHistory:true });
      sitePassHandlingPopState = false;
    });

    window.addEventListener('hashchange', checkHash);
    try { window.matchMedia('(display-mode: standalone)').addEventListener('change', updateQuickAuthUi); } catch (e) {}
    window.addEventListener('beforeinstallprompt', function(event) {
      event.preventDefault();
      deferredSitePassInstallPrompt = event;
      updateHomeInstallButtonState(isSitePassRecommendInstallRequest()
        ? '추천링크 설치 준비가 완료되었습니다. <b>홈화면에 설치하기</b>를 누르면 설치창이 열립니다.'
        : '이 브라우저에서는 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
    });

    window.addEventListener('appinstalled', function() {
      deferredSitePassInstallPrompt = null;
      closeHomeInstallGuidePanel('홈화면 추가가 완료되었습니다. 이제 현장서류패스 아이콘으로 들어오면 됩니다.');
      updateHomeInstallButtonState();
      updateQuickAuthUi();
    });

    async function bootSitePassApp() {
      try {
        updateSignupTermsUi();
        registerSitePassServiceWorker();
        updateHomeInstallButtonState();
        clearLegacyAutoLoginState();
        const didCleanReset = resetSitePassTestDataOnce();
        ensureAdminSampleData();
        if (!didCleanReset) recordSiteVisit();

        renderDocCards();
        renderAlertPreview();
        setupRegistrationDraftAutoSave();
        setupJuminLimitDelegates();
        restorePwaAutoMemberSession();
        refreshAdminUi();
        refreshMemberUi();
        try { setTimeout(function(){ syncSupabaseEquipmentItems(true); }, 600); } catch (e) {}
        updateQuickAuthUi();
        // v23.7.248: “로그인 확인 중입니다” 차단 화면을 더 이상 오래 띄우지 않습니다.
        // OAuth 확인은 뒤에서 진행하되, 사용자가 화면에 갇히지 않게 먼저 공개합니다.
        try { document.body.classList.remove('sitepass-booting'); } catch (e) {}
        // v23.7.246: 소셜 로그인 확인 과정이 외부 OAuth/Userinfo 응답 대기로 멈춰도
        // 화면이 '로그인 확인 중입니다'에 갇히지 않게 안전 타이머를 먼저 걸어둡니다.
        let sitePassBootWatchdogFired = false;
        const sitePassBootWatchdog = setTimeout(function(){
          if (document.body.classList.contains('sitepass-booting')) {
            sitePassBootWatchdogFired = true;
            try { removeSessionValue(SITEPASS_OAUTH_PENDING_KEY); } catch (e) {}
            document.body.classList.remove('sitepass-booting');
            alert('네이버 로그인 확인 시간이 길어져 중단했습니다.\n\nSupabase Edge Function의 Verify JWT가 OFF인지, 네이버 Provider의 Userinfo URL이 실제 함수 주소인지 확인해주세요.');
            showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
          }
        }, 18000);
        const handledOAuth = await handleSupabaseKakaoOAuthReturn();
        clearTimeout(sitePassBootWatchdog);
        if (sitePassBootWatchdogFired) return;
        if (!handledOAuth && !checkHash()) {
          const initialScreen = isAdminLoggedIn()
            ? 'adminScreen'
            : (isMemberLoggedIn() ? (isSitePassInstalledAppMode() ? 'listScreen' : 'homeScreen') : 'signupScreen');
          showScreen(initialScreen, { replace:true });
          promptRegistrationDraftIfNeeded('startup');
        }
      } catch (e) {
        console.error('SitePass 초기 화면 처리 오류:', e);
        document.body.classList.remove('sitepass-booting');
        alert('첫 화면 처리 중 오류가 났습니다. 새로고침 후에도 반복되면 최신 수정본을 다시 올려주세요.\n' + (e?.message || ''));
        showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
      }
      setTimeout(function(){ document.body.classList.remove('sitepass-booting'); }, 3000);
    }
    bootSitePassApp();


    // v23.7.123 - 날짜 표시칸 깜박임 방지 보강
    (function setupDateInputBlinkFix(){
      if (window.__sitePassDateInputBlinkFix) return;
      window.__sitePassDateInputBlinkFix = true;

      document.addEventListener('focusin', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-display]')) {
          setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
          return;
        }
        if (input.matches('input[type="date"]')) input.style.caretColor = 'transparent';
      });

      document.addEventListener('change', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-real]')) syncCleanDatePicker(input);
        if (input.matches('input[type="date"]')) setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
      });
    })();
