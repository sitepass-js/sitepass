-- SitePass Storage / 최고관리자 시작 메모
-- 이 파일은 DB 스키마 실행 후 참고용입니다.

-- Supabase Storage에서 아래 bucket을 만든다.
-- bucket name: sitepass-documents
-- public: false 권장
-- 이유: 장비서류 원본은 개인정보/사업자 정보가 포함될 수 있으므로 공개 bucket 금지.

-- 최고관리자는 앱에서 일반 로그인 후 role=super_admin인 회원으로 지정한다.
-- Supabase Auth 연결 후 auth_user_id가 생기면 아래처럼 role을 바꾼다.
-- update public.sitepass_members
-- set role = 'super_admin', plan_type = 'manual_paid', plan_label = '최고관리자'
-- where login_id = 'sitepassadmin';

-- 실서비스에서는 프론트 index.html 안의 ADMIN_PASSWORD를 제거하고,
-- Supabase Auth 또는 별도 서버 로그인으로 대체해야 한다.
