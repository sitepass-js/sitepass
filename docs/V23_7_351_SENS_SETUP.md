# SitePass v23.7.351 네이버 SENS 문자 인증 적용 설명서

## 이번 수정 범위

- 회원가입 휴대폰 인증번호를 네이버 SENS로 실제 발송
- 기사 휴대폰 인증번호를 네이버 SENS로 실제 발송
- 인부 휴대폰 인증번호를 네이버 SENS로 실제 발송
- 인증번호 5분 만료
- 재발송 60초 제한
- 5회 실패 제한
- 인증 성공 후 이름/생년월일/휴대폰번호 수정 잠금
- 신분증 하단 검증정보 표시: 이름, 휴대폰, 휴대폰 인증상태, 본인확인 상태
- NICE/KCB/PASS 본인확인 연동 준비 테이블과 Edge Function 자리 추가
- API Key/Secret은 GitHub에 넣지 않고 Supabase Secrets에서만 사용

## 대표님이 직접 해야 할 일

### 1. 네이버클라우드 SENS 준비

1. 네이버클라우드 콘솔 접속
2. SENS SMS 서비스 생성
3. 발신번호 등록 및 승인
4. SMS Service ID 확인
5. Access Key 확인
6. Secret Key 확인

### 2. Supabase Secrets 저장

아래 값은 채팅창이나 GitHub에 올리지 말고 PC 터미널에서 Supabase CLI로 저장합니다.

```bash
supabase secrets set SENS_ACCESS_KEY="네이버클라우드 Access Key"
supabase secrets set SENS_SECRET_KEY="네이버클라우드 Secret Key"
supabase secrets set SENS_SERVICE_ID="SENS SMS 서비스 ID"
supabase secrets set SENS_FROM_NUMBER="등록 완료된 발신번호"
supabase secrets set SITEPASS_VERIFY_PEPPER="직접 만든 긴 랜덤 문자열"

# Supabase가 자동 제공하지 않는 환경이면 아래도 저장합니다.
supabase secrets set SITEPASS_SERVICE_ROLE_KEY="Supabase service_role key"

# NICE/KCB/PASS 계약 전 기본값
supabase secrets set IDENTITY_PROVIDER="none"
```

### 3. Supabase SQL 적용

Supabase Dashboard → SQL Editor에서 아래 파일 실행:

```txt
supabase/migrations/20260708_v23_7_351_auth_consent.sql
```

생성 테이블:

- `sitepass_terms_consents`
- `sitepass_phone_verifications`
- `sitepass_identity_verifications`

### 4. Edge Function 배포

Supabase CLI에서 실행:

```bash
supabase functions deploy send-phone-code
supabase functions deploy verify-phone-code
supabase functions deploy prepare-identity-check
```

### 5. GitHub Pages 배포

이 ZIP의 GitHub 파일 전체를 기존 SitePass 저장소에 올립니다.

- `index.html`
- `assets/js/sitepass-v23-7-351-sens-integration.js`
- 수정된 기존 JS 파일들
- `supabase/` 폴더는 GitHub Pages에 반드시 올릴 필요는 없지만, 관리용으로 저장소에 같이 보관해도 키가 들어있지 않으므로 괜찮습니다.

## 테스트 순서

1. Supabase SQL 적용 확인
2. Supabase Secrets 저장 확인
3. Edge Function 3개 배포 확인
4. GitHub Pages 새로고침, 캐시 비우기
5. 회원가입 화면에서 이름/생년월일/휴대폰/통신사 입력
6. 인증요청 클릭
7. 실제 휴대폰으로 문자 수신 확인
8. 인증번호 입력 후 인증확인
9. 인증 완료 후 이름/생년월일/휴대폰번호가 잠기는지 확인
10. 기사서류 체크 후 기사 인증번호 발송 확인
11. 기사 인증 완료 후 기사 신분증 업로드가 열리는지 확인
12. 인부서류 체크 후 인부 인증번호 발송 확인
13. 인부 인증 완료 후 인부 서류첨부창이 자동으로 열리는지 확인
14. 저장 후 받은 사람 화면에서 신분증 하단 검증정보가 보이는지 확인
15. 인쇄/다운로드에도 이름/휴대폰/인증상태가 들어가는지 확인

## 주의사항

- SENS는 휴대폰 번호 사용 가능 여부 확인입니다.
- NICE/KCB/PASS 계약 전까지 화면에는 `휴대폰 인증 완료 / 본인확인 미완료`로 표시합니다.
- 주민등록번호 전체는 SitePass DB에 저장하지 않습니다.
- 신분증 원본 이미지는 수정하지 않고, 표시/인쇄/다운로드용 하단 정보만 붙입니다.
- API Key/Secret은 절대 GitHub, HTML, JS 파일에 넣지 않습니다.
