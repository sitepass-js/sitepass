// SitePass v23.7.299 - app-admin-boot split continue (07/08)
function makeDemoDoc(key, groupKey, groupTitle, title, required, expiry, expireDate, fileName, index) {
      const preview = makeDemoPreviewDataUrl(title, '장비: 굴착기 / 00보0000', expireDate ? ('만료일: ' + expireDate) : '유효기간 확인용 서류');
      const doc = {
        key, groupKey, groupTitle, title, required:!!required, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:preview, originalDataUrl:preview, correctedDataUrl:preview, previewChoice:'preview', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'demo',
        fileType:'image/png',
        previewDataUrl:preview,
        originalDataUrl:preview,
        correctedDataUrl:preview,
        previewChoice:'preview',
        autoFit:'demo',
        driverPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        personPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        workerPhone:'',
        workerTask:'',
        authVerified:true,
        authVerifiedAt:new Date().toISOString()
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function ensureManagerDemoItem() {
      const nowIso = new Date().toISOString();
      const expireIso = addDaysIso(nowIso, 7);
      const demoDocs = {
        businessLicense: makeDemoDoc('businessLicense','equipment','장비서류','사업자등록증',true,false,'','굴착기_00보0000_사업자등록증.png'),
        equipmentRegistration: makeDemoDoc('equipmentRegistration','equipment','장비서류','장비등록증',true,false,'','굴착기_00보0000_장비등록증.png'),
        equipmentInspection: makeDemoDoc('equipmentInspection','equipment','장비서류','장비검사증',true,true,formatDateOnly(addDaysIso(nowIso, 120)),'굴착기_00보0000_장비검사증.png'),
        insurancePolicy: makeDemoDoc('insurancePolicy','equipment','장비서류','장비보험증권',true,true,formatDateOnly(addDaysIso(nowIso, 80)),'굴착기_00보0000_장비보험증권.png'),
        specSheet: makeDemoDoc('specSheet','equipment','장비서류','장비제원표',false,false,'','굴착기_00보0000_장비제원표.png'),
        driverIdCard: makeDemoDoc('driverIdCard','driver','장비기사서류','기사 신분증',true,false,'','굴착기_00보0000_기사신분증.png'),
        driverLicense: makeDemoDoc('driverLicense','driver','장비기사서류','기사면허증',true,false,'','굴착기_00보0000_기사면허증.png'),
        driverBasicSafetyTraining: makeDemoDoc('driverBasicSafetyTraining','driver','장비기사서류','기사 건설기초안전보건교육 이수증',true,false,'','굴착기_00보0000_기사기초안전교육.png')
      };
      const owner = getAdminSampleEquipmentOwner();
      const item = {
        code:DEMO_MANAGER_CODE,
        type:'BUNDLE',
        equipmentNo:'00보0000',
        equipmentName:'굴착기',
        ownerMemberId:owner.id,
        ownerSignupId:owner.signupId,
        ownerProviderId:owner.providerId,
        ownerName:owner.name,
        ownerPhone:owner.phone,
        bundleMeta:{ unit:'통합 서류함 1건', includedGroups:['equipment','driver'], includedGroupNames:['장비서류','장비기사서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:'실사용 베타 운영 중입니다' },
        workerPeople:[],
        qrLink:makeQrLink(DEMO_MANAGER_CODE),
        docs:demoDocs,
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:addDaysIso(nowIso, TRIAL_DAYS),
        serviceStatus:'실사용베타',
        paymentPlan:'monthly',
        basicPlan:'실사용 베타 운영 중입니다',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:expireIso,
        demo:true
      };
      const items = getItems();
      const idx = items.findIndex(x => x.code === DEMO_MANAGER_CODE);
      if (idx >= 0) items[idx] = { ...items[idx], ...item };
      else items.unshift(item);
      setItems(items);
      return item;
    }



    const PAYMENT_TEST_MEMBER_PREFIX = 'MEM-PAYTEST-';
    const PAYMENT_TEST_CODE_PREFIX = 'SP-PAYTEST-';

    function isPaymentTestMember(member) {
      return String(member?.id || '').startsWith(PAYMENT_TEST_MEMBER_PREFIX) || member?.paymentConversionTest === true;
    }

    function isPaymentTestItem(item) {
      return String(item?.code || '').startsWith(PAYMENT_TEST_CODE_PREFIX) || item?.paymentConversionTest === true;
    }

    function getPaymentConversionTestStats(items, members) {
      const testItems = (items || getItems()).filter(isPaymentTestItem);
      const testMembers = (members || getMembers()).filter(isPaymentTestMember);
      const paidItems = testItems.filter(item => !isServiceShareBlocked(item)).length;
      const blockedItems = testItems.filter(item => isServiceShareBlocked(item)).length;
      const unpaidItems = testItems.filter(item => item.paymentTestPaid !== true).length;
      return { testMembers:testMembers.length, testItems:testItems.length, paidItems, blockedItems, unpaidItems };
    }

    function renderPaymentConversionTestPanel(items, members) {
      // 운영 화면에서는 유료전환 차단검사 및 임시 테스트 칸을 표시하지 않습니다.
      return '';
    }

    function makePaymentTestMember(index, paid) {
      const padded = String(index).padStart(2, '0');
      const nowIso = new Date().toISOString();
      const futureEnd = addDaysIso(nowIso, 30);
      const trialEnd = addDaysIso(nowIso, 7);
      return {
        id:PAYMENT_TEST_MEMBER_PREFIX + padded,
        name:'임시 회원' + padded,
        phone:'010-77' + String(1000 + index).slice(-4) + '-' + String(2000 + index).slice(-4),
        signupId:'paytest' + padded,
        provider:'SitePass',
        providerId:'SITEPASS-paytest' + padded,
        signupMethod:'SitePass 베타가입',
        status:paid ? '1개월권' : '실사용베타',
        paymentPlanLabel:paid ? '1개월권' : '실사용베타',
        memberPlan:paid ? '1개월권' : '실사용베타',
        paymentStartedAt:nowIso,
        paymentEndsAt:paid ? futureEnd : trialEnd,
        paymentStatus:paid ? '신규결제완료' : '베타사용중',
        createdAt:nowIso,
        lastLoginAt:nowIso,
        lastLoginMethod:'SitePass 베타가입',
        adminMemo:'유료전환 차단 확인용 임시 회원입니다.',
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    function makePaymentTestDoc(key, title, expiry, expireDate, equipmentName, equipmentNo) {
      const fileName = equipmentName + '_' + equipmentNo + '_' + title + '.png';
      const doc = {
        key, groupKey:'equipment', groupTitle:'장비서류', title, required:true, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:'', originalDataUrl:'', correctedDataUrl:'', previewChoice:'', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'payment-test',
        fileType:'image/png',
        previewDataUrl:'',
        originalDataUrl:'',
        correctedDataUrl:'',
        previewChoice:'',
        autoFit:'payment-test-light',
        storageLight:true
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function makePaymentTestItem(member, memberIndex, equipmentIndex, paid) {
      const nowIso = new Date().toISOString();
      const equipmentNo = String(10 + memberIndex).padStart(2, '0') + '보' + String(1000 + equipmentIndex).slice(-4);
      const equipmentName = equipmentIndex % 3 === 0 ? '지게차' : (equipmentIndex % 2 === 0 ? '덤프트럭' : '굴착기');
      const code = PAYMENT_TEST_CODE_PREFIX + String(equipmentIndex).padStart(3, '0');
      const trialEnd = addDaysIso(nowIso, 7);
      const paidEnd = addDaysIso(nowIso, 30);
      return {
        code,
        type:'BUNDLE',
        equipmentNo,
        equipmentName,
        ownerMemberId:member.id,
        ownerSignupId:member.signupId,
        ownerProviderId:member.providerId,
        ownerName:member.name,
        ownerPhone:member.phone,
        bundleMeta:{ unit:'통합 서류함 1건', includedGroups:['equipment'], includedGroupNames:['장비서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:paid ? '1개월권 결제완료' : '실사용베타 후 미결제 예정' },
        workerPeople:[],
        qrLink:makeQrLink(code),
        docs:{
          businessLicense:makePaymentTestDoc('businessLicense','사업자등록증',false,'',equipmentName,equipmentNo),
          equipmentRegistration:makePaymentTestDoc('equipmentRegistration','장비등록증',false,'',equipmentName,equipmentNo),
          equipmentInspection:makePaymentTestDoc('equipmentInspection','장비검사증',true,formatDateOnly(addDaysIso(nowIso, 90)),equipmentName,equipmentNo),
          insurancePolicy:makePaymentTestDoc('insurancePolicy','장비보험증권',true,formatDateOnly(addDaysIso(nowIso, 60)),equipmentName,equipmentNo)
        },
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:paid ? paidEnd : trialEnd,
        serviceStatus:paid ? '유료사용' : '실사용베타',
        paymentPlan:paid ? 'monthly' : 'trial',
        basicPlan:paid ? '월 결제 · 월 2,000원' : '실사용베타 후 결제대기',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        paidAt:paid ? nowIso : '',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:addDaysIso(nowIso, 7),
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    async function syncPaymentTestMembersToSupabase(testMembers) {
      if (!window.sitepassSupabase || !Array.isArray(testMembers) || !testMembers.length) {
        return { ok:false, total:0, saved:0, failed:0, skipped:!window.sitepassSupabase };
      }
      let saved = 0;
      let failed = 0;
      for (const member of testMembers) {
        try {
          await saveMemberToSupabase(member);
          saved += 1;
        } catch (error) {
          failed += 1;
          console.warn('임시 회원 Supabase 저장 실패:', member && member.signupId, error);
        }
      }
      return { ok:failed === 0, total:testMembers.length, saved, failed, skipped:false };
    }

    async function deletePaymentTestMembersFromSupabase() {
      if (!window.sitepassSupabase) return { ok:false, deleted:0, skipped:true };
      try {
        const { error } = await window.sitepassSupabase
          .from('sitepass_members')
          .delete()
          .like('login_id', 'paytest%');
        if (error) {
          console.warn('Supabase 임시 회원 삭제 실패:', error.message);
          return { ok:false, deleted:0, skipped:false };
        }
        console.log('Supabase 임시 회원 삭제 완료: paytest%');
        return { ok:true, deleted:50, skipped:false };
      } catch (error) {
        console.warn('Supabase 임시 회원 삭제 예외:', error);
        return { ok:false, deleted:0, skipped:false };
      }
    }

    async function createPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 생성은 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 생성할까요?\n\n기존 임시 데이터는 지우고 다시 만듭니다. 실제 회원/장비는 유지됩니다.')) return;
      const nowIso = new Date().toISOString();
      const existingMembers = getMembers().filter(member => !isPaymentTestMember(member));
      const existingItems = getItems().filter(item => !isPaymentTestItem(item));
      const testMembers = [];
      const testItems = [];
      for (let i = 1; i <= 50; i++) {
        const paid = i <= 20;
        const member = makePaymentTestMember(i, paid);
        testMembers.push(member);
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 1, paid));
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 2, paid));
      }
      const nextMembers = testMembers.concat(existingMembers);
      const nextItems = testItems.concat(existingItems);
      const savedItems = setItems(nextItems);
      if (!savedItems) {
        alert('임시 장비 100대 저장에 실패했습니다.\n\n브라우저 임시 저장공간이 부족하거나 기존 사진 데이터가 너무 큽니다. 기존 임시 데이터/큰 사진 서류를 삭제한 뒤 다시 시도해주세요.\n회원만 생성되고 장비가 0대로 보이는 오류를 막기 위해 이번 생성은 중단했습니다.');
        renderAdmin();
        return;
      }
      try {
        setMembers(nextMembers);
      } catch (error) {
        setItems(existingItems);
        alert('임시 회원 50명 저장에 실패했습니다.\n\n브라우저 저장공간을 비운 뒤 다시 시도해주세요. 장비 데이터는 이전 상태로 되돌렸습니다.');
        renderAdmin();
        return;
      }

      const supabaseResult = await syncPaymentTestMembersToSupabase(testMembers);
      const supabaseMessage = supabaseResult.skipped
        ? '\n\nSupabase 연결이 없어 브라우저에만 저장되었습니다.'
        : '\n\nSupabase sitepass_members 저장: ' + supabaseResult.saved + '명' + (supabaseResult.failed ? ' / 실패 ' + supabaseResult.failed + '명' : '');

      alert('임시 데이터 생성 완료\n\n회원 50명 / 장비 100대\n- 결제완료 회원 20명, 장비 40대\n- 실사용베타 회원 30명, 장비 60대' + supabaseMessage + '\n\n다음으로 [베타기간 강제 종료]를 누르면 미결제 장비 60대가 QR 차단 대상이 됩니다.');
      renderAdmin();
    }
