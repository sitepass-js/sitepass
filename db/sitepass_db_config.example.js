// SitePass DB 연결 예시 파일
// 실제 사용 시 이 파일을 sitepass_db_config.js로 복사하고 값만 바꿉니다.
// 주의: service_role key는 절대 브라우저 코드에 넣으면 안 됩니다.

window.SITEPASS_DB_CONFIG = {
  provider: 'supabase',
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  storageBucket: 'sitepass-documents',
  appVersion: 'v23.7.122'
};
