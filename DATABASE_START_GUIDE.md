# SitePass DB 시작 가이드

이 버전은 화면은 그대로 유지하고, 실제 서버 DB로 넘어가기 위한 시작 파일을 추가했습니다.

## 확정 요금

```text
월 결제: 2,000원
연 결제: 19,900원
담당자 공유 링크: 7일 유효
실사용 베타 기간: 60일
```

## 왜 DB가 필요한가

GitHub Pages는 화면 파일을 보여주는 역할만 합니다. 여러 회원의 서류, 결제, 관리자 대시보드, 휴대폰 변경 시 복구, QR 링크 만료 검증은 중앙 DB가 있어야 안정적으로 됩니다.

## 이번 파일에 추가한 DB 구성

```text
db/
├── 001_sitepass_schema_supabase.sql
├── 002_sitepass_storage_and_admin_notes.sql
└── sitepass_db_config.example.js
```

## 처음 만들 DB 테이블

- `sitepass_members`: 회원, 권한, 요금상태
- `sitepass_payment_plans`: 월 2,000원 / 연 19,900원 요금제
- `sitepass_document_boxes`: 장비/기사/인부 서류함과 QR 코드
- `sitepass_documents`: 현재 서류 상태와 만료일
- `sitepass_document_versions`: 서류 교체 이력
- `sitepass_share_links`: 담당자 공유 링크, 7일 유효
- `sitepass_payments`: 결제/연장 기록
- `sitepass_notifications`: 문자/카카오/푸시 알림 이력
- `sitepass_favorite_recipients`: 자주 보내는 담당자
- `sitepass_inquiries`: 문의/피드백
- `sitepass_admin_logs`: 관리자 작업 기록

## 실제 연결 순서

1. Supabase 프로젝트 생성
2. SQL Editor에서 `db/001_sitepass_schema_supabase.sql` 실행
3. Storage에서 `sitepass-documents` bucket 생성, public은 꺼둠
4. `db/sitepass_db_config.example.js`를 `sitepass_db_config.js`로 복사
5. Supabase URL과 anon key 입력
6. 다음 개발 단계에서 `index.html`의 localStorage 저장 함수를 DB 저장 함수로 하나씩 교체

## 가장 먼저 DB로 옮길 기능 순서

1. 회원가입/로그인
2. 장비서류함 생성과 코드 저장
3. 서류 파일 업로드
4. 관리자 회원/장비 목록 조회
5. 7일 담당자 링크 검증
6. 만료일 알림
7. 결제/연장

## 보안 주의

- `service_role key`는 절대 GitHub나 브라우저 코드에 넣지 않습니다.
- 원본 서류 Storage bucket은 public으로 열지 않습니다.
- 담당자 링크는 DB에서 token과 만료일을 확인한 뒤 열어야 합니다.
- 최고관리자 비밀번호를 `index.html` 안에 두는 방식은 DB 연결 후 제거해야 합니다.
