// SitePass v23.7.256 split step 2 - 약관/회원판단 전용 파일
// 이 파일에는 일반 회원가입 약관 체크, 카카오/네이버 소셜 가입 약관 모달,
// 소셜 약관동의 완료 판별 함수만 둡니다.
// 주의: 이 파일은 app.bundle.js보다 먼저 불러와야 합니다.

    // v23.7.216 - 카카오/네이버 "계정으로 계속하기"를 눌렀을 때 처음 가입이면 약관동의창을 먼저 띄웁니다.
    // 기존 회원이면 약관창 없이 로그인만 처리하고, 신규 회원일 때만 동의 후 회원으로 저장합니다.
    function showSocialSignupTermsModal(providerLabel) {
      return new Promise(resolve => {
        const old = document.getElementById('socialSignupTermsOverlay');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'socialSignupTermsOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:18px;';
        overlay.innerHTML = `
          <div style="width:min(520px,100%);max-height:86vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:20px;">
            <h3 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${escapeHtml((String(providerLabel || '').includes('카카오') ? 'SitePass 카카오계정 연동 가입 약관' : (String(providerLabel || '').includes('네이버') ? 'SitePass 네이버계정 연동 가입 약관' : 'SitePass 소셜계정 연동 가입 약관')))}</h3>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#475569;">${escapeHtml(providerLabel || '소셜')} 공식 약관이 아니라 <b>SitePass 서비스 가입 약관</b>입니다. ${escapeHtml(providerLabel || '소셜')} 계정은 SitePass 로그인 식별과 계정 연동에만 사용합니다. SitePass 회원으로 새로 가입하려면 아래 SitePass 약관에 동의해야 합니다. 기존 약관동의 완료 회원이면 새 가입을 만들지 않고 로그인만 처리합니다.</p>
            <label style="display:flex;gap:8px;align-items:center;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:14px;line-height:1.35;color:#0f172a;box-sizing:border-box;"><input id="socialAgreeAll" type="checkbox" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <b style="line-height:1.35;white-space:nowrap;">전체 동의</b></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input class="socialRequiredTerm" type="checkbox" data-term="service" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;"><b>[필수] 서비스 이용약관</b><br>장비·기사·인부 서류 등록, QR/링크 공유, 관리자 확인 기능 이용에 동의합니다.</span></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input class="socialRequiredTerm" type="checkbox" data-term="privacy" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;"><b>[필수] 개인정보 수집·이용</b><br>이름, 연락처, 소셜 로그인 식별정보, 접속기록 등을 회원관리 목적으로 처리하는 데 동의합니다.</span></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input class="socialRequiredTerm" type="checkbox" data-term="documentStorage" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;"><b>[필수] 서류 보관·공유</b><br>현장 제출용 서류와 QR/링크가 SitePass에 저장·공유될 수 있음을 확인합니다.</span></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input class="socialRequiredTerm" type="checkbox" data-term="responsibility" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;"><b>[필수] 이용자 책임 확인</b><br>등록 서류의 정확성, 권한 없는 개인정보 등록 금지, 현장 제출 책임을 확인합니다.</span></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input id="socialMarketingTerm" type="checkbox" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;">[선택] 카카오톡·앱 광고성 정보 수신 동의</span></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input id="socialEmailMarketingTerm" type="checkbox" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;">[선택] 이메일 광고성 정보 수신 동의</span></label>
            <label style="display:flex;gap:8px;align-items:flex-start;padding:9px 10px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;font-size:13px;line-height:1.35;color:#334155;box-sizing:border-box;"><input id="socialSmsMarketingTerm" type="checkbox" style="width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;flex:0 0 16px;margin:2px 0 0;padding:0;accent-color:#2563eb;box-sizing:border-box;" /> <span style="display:block;line-height:1.4;word-break:keep-all;overflow-wrap:break-word;">[선택] 문자 광고성 정보 수신 동의</span></label>
            <div id="socialTermsMessage" style="font-size:12px;color:#dc2626;min-height:18px;margin:8px 0;"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
              <button id="socialTermsCancel" type="button" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:12px;padding:10px 14px;font-weight:700;">취소</button>
              <button id="socialTermsOk" type="button" style="border:0;background:#2563eb;color:#fff;border-radius:12px;padding:10px 16px;font-weight:800;">SitePass 약관 동의하고 가입</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const all = overlay.querySelector('#socialAgreeAll');
        const required = Array.from(overlay.querySelectorAll('.socialRequiredTerm'));
        const marketing = overlay.querySelector('#socialMarketingTerm');
        const emailMarketing = overlay.querySelector('#socialEmailMarketingTerm');
        const smsMarketing = overlay.querySelector('#socialSmsMarketingTerm');
        const optionalTerms = [marketing, emailMarketing, smsMarketing].filter(Boolean);
        const msg = overlay.querySelector('#socialTermsMessage');
        const cleanup = value => { overlay.remove(); resolve(value); };
        all.addEventListener('change', () => {
          required.forEach(input => input.checked = all.checked);
          optionalTerms.forEach(input => input.checked = all.checked);
          if (msg) msg.textContent = all.checked ? '' : '필수 약관에 모두 동의해야 가입할 수 있습니다.';
        });
        required.forEach(input => input.addEventListener('change', () => {
          const ok = required.every(x => x.checked);
          if (all) all.checked = ok && optionalTerms.every(input => input.checked);
          if (msg) msg.textContent = ok ? '' : '필수 약관에 모두 동의해야 가입할 수 있습니다.';
        }));
        optionalTerms.forEach(input => input.addEventListener('change', () => {
          const ok = required.every(x => x.checked);
          if (all) all.checked = ok && optionalTerms.every(item => item.checked);
        }));
        overlay.querySelector('#socialTermsCancel').addEventListener('click', () => cleanup(null));
        overlay.querySelector('#socialTermsOk').addEventListener('click', () => {
          const ok = required.every(x => x.checked);
          if (!ok) {
            if (msg) msg.textContent = '필수 약관에 모두 동의해주세요.';
            return;
          }
          cleanup({
            service:true,
            privacy:true,
            documentStorage:true,
            responsibility:true,
            marketing:!!(marketing?.checked || emailMarketing?.checked || smsMarketing?.checked),
            kakaoAppMarketing:!!marketing?.checked,
            emailMarketing:!!emailMarketing?.checked,
            smsMarketing:!!smsMarketing?.checked,
            socialProvider:providerLabel || '소셜',
            agreedAt:new Date().toISOString()
          });
        });
      });
    }



    function getSignupTermInputs() {
      return Array.from(document.querySelectorAll('.signup-term'));
    }

    function getSignupRequiredTermInputs() {
      return Array.from(document.querySelectorAll('.signup-required-term'));
    }

    function updateSignupTermsUi() {
      const allInput = document.getElementById('agreeAllTerms');
      const terms = getSignupTermInputs();
      const requiredTerms = getSignupRequiredTermInputs();
      const requiredOk = requiredTerms.length > 0 && requiredTerms.every(input => !!input.checked);
      const allOk = terms.length > 0 && terms.every(input => !!input.checked);
      const note = document.getElementById('termsOkNote');
      if (allInput) {
        allInput.checked = allOk;
        allInput.indeterminate = !allOk && terms.some(input => !!input.checked);
      }
      if (note) note.classList.toggle('show', requiredOk);
      return requiredOk;
    }

    function toggleAllSignupTerms(checked) {
      getSignupTermInputs().forEach(input => {
        input.checked = !!checked;
      });
      updateSignupTermsUi();
    }

    function requireSignupTerms() {
      if (updateSignupTermsUi()) return true;
      alert('회원가입을 진행하려면 필수 약관에 모두 동의해주세요.\n상단의 약관 전체동의를 체크하면 필수/선택 항목이 한 번에 선택됩니다.');
      document.querySelector('.terms-box')?.scrollIntoView({ behavior:'smooth', block:'start' });
      return false;
    }

    function getSignupAgreements() {
      const kakaoAppMarketing = !!document.getElementById('agreeMarketingTerms')?.checked;
      const emailMarketing = !!document.getElementById('agreeEmailMarketingTerms')?.checked;
      const smsMarketing = !!document.getElementById('agreeSmsMarketingTerms')?.checked;
      return {
        service: !!document.getElementById('agreeServiceTerms')?.checked,
        privacy: !!document.getElementById('agreePrivacyTerms')?.checked,
        // v23.7.419: 회원가입 기본 약관과 서류 등록/공유 약관을 분리합니다.
        // 서류 보관·현장 공유·고유식별/민감정보 동의는 각 서류 등록 화면에서 별도 동의로 받습니다.
        signupScope: 'member_account_only',
        documentStorage: false,
        sensitive: false,
        documentTermsDeferred: true,
        payment: !!document.getElementById('agreePaymentTerms')?.checked,
        responsibility: !!document.getElementById('agreeResponsibilityTerms')?.checked,
        alert: !!document.getElementById('agreeAlertTerms')?.checked,
        marketing: kakaoAppMarketing || emailMarketing || smsMarketing,
        kakaoAppMarketing,
        emailMarketing,
        smsMarketing,
        agreedAt: new Date().toISOString()
      };
    }



    // v23.7.250 - 네이버 약관창 누락 방지: OAuth 연결 흔적만으로는 약관동의 완료로 보지 않습니다.
    // termsAgreedAt 또는 실제 필수 약관 체크값이 있어야 관리자 상세목록의 약관회원/기존회원으로 인정합니다.
    function hasLocalSocialTermsAgreement(member) {
      if (!member) return false;
      const agreements = member.agreements || {};
      return !!(
        member.termsAgreedAt ||
        member.agreedAt ||
        agreements.agreedAt ||
        agreements.service ||
        agreements.privacy ||
        agreements.documentStorage ||
        agreements.sensitive ||
        agreements.payment ||
        agreements.responsibility
      );
    }



// v23.7.256 - app.bundle.js와 HTML onclick에서 사용할 수 있게 명시적으로 공개합니다.
window.showSocialSignupTermsModal = showSocialSignupTermsModal;
window.getSignupTermInputs = getSignupTermInputs;
window.getSignupRequiredTermInputs = getSignupRequiredTermInputs;
window.updateSignupTermsUi = updateSignupTermsUi;
window.toggleAllSignupTerms = toggleAllSignupTerms;
window.requireSignupTerms = requireSignupTerms;
window.getSignupAgreements = getSignupAgreements;
window.hasLocalSocialTermsAgreement = hasLocalSocialTermsAgreement;
window.SitePassTerms = {
  showSocialSignupTermsModal,
  getSignupTermInputs,
  getSignupRequiredTermInputs,
  updateSignupTermsUi,
  toggleAllSignupTerms,
  requireSignupTerms,
  getSignupAgreements,
  hasLocalSocialTermsAgreement
};
