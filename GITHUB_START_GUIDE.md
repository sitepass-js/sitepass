# SitePass GitHub 시작 순서

## 1. GitHub 저장소 만들기

1. GitHub 로그인
2. 오른쪽 위 `+` 버튼 클릭
3. `New repository` 클릭
4. Repository name: `sitepass`
5. Public/Private 선택
   - 처음 개발/현장 베타는 **Private 권장**
   - GitHub Pages로 외부 테스트 주소를 만들면 사이트 화면은 인터넷에서 열릴 수 있음
6. `Create repository` 클릭

## 2. 파일 올리기

가장 쉬운 방법:

1. 만든 저장소 화면에서 `Add file` 클릭
2. `Upload files` 클릭
3. 이 폴더 안의 파일들을 모두 드래그해서 업로드
4. Commit message: `Initial SitePass real-use beta`
5. `Commit changes` 클릭

## 3. GitHub Pages 켜기

1. 저장소의 `Settings` 클릭
2. 왼쪽 메뉴 `Pages` 클릭
3. Source: `Deploy from a branch`
4. Branch: `main`
5. Folder: `/root`
6. Save 클릭

배포가 끝나면 GitHub Pages 주소가 생성됩니다.

## 4. 처음 확인할 순서

1. 생성된 주소를 PC Chrome/Edge에서 열기
2. 회원가입 화면이 먼저 뜨는지 확인
3. SitePass 휴대폰 가입 선택
4. 임시 인증번호 `123456`으로 가입
5. 일반 회원은 홈/보관함으로 가는지 확인
6. 일반 로그인 화면에서 아래 계정으로 최고관리자 접속

```text
ID: sitepassadmin
PW: sitepass-admin-beta-2026
```

7. 관리자 화면이 자동으로 뜨는지 확인
8. 장비 1대 등록
9. QR/담당자 링크 열기
10. 휴대폰 홈화면 설치 확인

## 5. 절대 주의

- 이 단계에서는 실제 주민등록증 원본, 건강검진 원본처럼 유출 피해가 큰 서류를 많이 넣지 않는 것이 안전합니다.
- 서버/DB 전에는 데이터가 각 브라우저에 저장됩니다.
- 최고관리자가 모든 회원 데이터를 중앙에서 보는 구조는 서버 연결 후 가능합니다.
- 관리자 임시 비밀번호는 정식 보안이 아닙니다.



## DB 시작

DB는 `DATABASE_START_GUIDE.md`와 `db/001_sitepass_schema_supabase.sql`을 기준으로 시작합니다. GitHub Pages는 DB를 제공하지 않으므로 Supabase 같은 외부 DB를 연결해야 중앙 회원관리와 서류 저장이 가능합니다.
