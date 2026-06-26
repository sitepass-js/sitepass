# SitePass

건설현장 장비·기사·인부 서류를 등록하고 QR/링크로 공유하는 모바일 웹/PWA입니다.

이 정리본은 **실사용 베타 + DB 시작본 v23.7.122**입니다. 현장 흐름을 실제로 확인하면서 계속 수정하는 기준 파일입니다.

## 지금 바로 가능한 것

- 일반 로그인 화면 1개
- 회원가입 화면
- 카카오톡/네이버 간편 로그인 UI
- SitePass 자체 회원가입 UI
- 최고관리자/운영관리자도 일반 로그인 후 권한에 따라 관리자 화면 자동 이동
- 장비/기사/인부 통합 서류함 등록
- 사진찍기/파일선택/미리보기/자동 보정 흐름
- 코드 보관함
- QR/7일 담당자 링크 공유 흐름
- 담당자 다운로드/프린트 화면
- 관리자 대시보드/회원/장비/만료서류/QR 정지 관리 화면
- PWA manifest 및 service worker
- Supabase/PostgreSQL DB 시작 스키마

## 현재 베타의 중요한 한계

이 버전은 DB 시작 스키마를 포함하지만, 화면은 아직 `index.html` 중심으로 동작합니다.

따라서 GitHub Pages에 올리면 화면은 열리지만, 데이터는 **각 사용자 기기 브라우저 localStorage**에 저장됩니다.

즉, 서버를 붙이기 전에는 아래 기능이 정식으로 보장되지 않습니다.

- 여러 회원의 데이터를 최고관리자가 중앙에서 모아 보기
- 휴대폰 변경 시 자동 데이터 이전
- 실제 카카오/문자 인증 발송
- 실제 네이버/카카오 OAuth 로그인
- 실제 PG 자동결제
- 서버 파일 저장/백업
- 관리자 접근기록
- 비밀번호 암호화 저장
- 개인정보 접근권한 통제

## 실사용 베타 운영 기준

처음에는 아래 방식으로 운영합니다.

1. GitHub 저장소는 Private 권장
2. GitHub Pages 또는 임시 HTTPS 주소로 배포
3. 대표/관리자 기기에서 먼저 가입·로그인·등록·QR 공유 흐름 확인
4. 실제 장비업자 1~3명만 먼저 현장 베타 테스트
5. 개인정보가 많이 들어가는 원본 서류는 서버 저장 전까지 신중하게 사용
6. 문제가 확인되면 `index.html`을 수정하고 GitHub에 다시 올림
7. 중앙회원관리/실제 결제/문자·카카오 알림이 필요해지는 시점에 `db/001_sitepass_schema_supabase.sql` 기준으로 서버 DB 연결

## 베타 관리자 계정

현재 최고관리자도 일반 로그인 화면에서 접속합니다.

```text
ID: sitepassadmin
PW: sitepass-admin-beta-2026
```

주의: 이 비밀번호는 프론트 코드 안에 들어 있는 **임시 베타 비밀번호**입니다. 사이트 주소를 아는 사람이 개발자도구로 코드를 보면 확인할 수 있습니다. 정식 운영에서는 반드시 서버 로그인으로 교체해야 합니다.

## 가격 기준

현재 화면 기준 가격은 아래로 맞췄습니다.

```text
월 결제: 2,000원
연 결제: 19,900원
실사용 베타 기간: 60일
담당자 공유 링크: 7일 유효
```

## 파일 구조

```text
.
├── index.html
├── sitepass.webmanifest
├── sw.js
├── js-construction-logo.png
├── inline_check.js
├── db/
│   ├── 001_sitepass_schema_supabase.sql
│   ├── 002_sitepass_storage_and_admin_notes.sql
│   └── sitepass_db_config.example.js
├── icons/
│   ├── sitepass-icon-180.png
│   ├── sitepass-icon-192.png
│   └── sitepass-icon-512.png
├── GITHUB_START_GUIDE.md
├── REAL_USE_BETA_GUIDE.md
├── DATABASE_START_GUIDE.md
├── 변경내용_v23_7_121.txt
└── 변경내용_v23_7_122.txt
```

## 실행 방법

브라우저에서 `index.html`을 직접 열어도 확인할 수 있습니다.

로컬 서버로 확인하려면 아래처럼 실행합니다.

```bash
python -m http.server 8000
```

그 다음 브라우저에서 아래 주소를 엽니다.

```text
http://localhost:8000
```

## GitHub Pages 배포

이 프로젝트는 빌드 과정이 없는 정적 웹앱입니다. GitHub Pages에서 `main` 브랜치의 root(`/`)를 배포 대상으로 설정하면 됩니다.

## 다음 개발 우선순위

1. GitHub 업로드 및 Pages 배포
2. 휴대폰 설치/PWA 확인
3. 회원가입 → 로그인 → 관리자 자동 이동 확인
4. 장비 1대 실제 등록
5. 담당자 QR/링크 7일 유효 확인
6. 관리자 보관함에서 알림 보내기/QR 링크 확인
7. Supabase DB 생성 및 스키마 실행
8. 회원가입/서류함 저장부터 DB 연결
9. 실제 문자·카카오·결제 API 연결

