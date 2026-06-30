// SitePass v23.7.270 update notice fix - Supabase/config 설정 전용 파일
window.SITEPASS_DB_CONFIG = {
    provider: 'supabase',
    supabaseUrl: 'https://fipbgzvdwgjsmazmswaj.supabase.co',
    supabaseAnonKey: 'sb_publishable_thd7o7GUgf8EcetTFndW9A_Nxh6oIAO',
    storageBucket: 'sitepass-documents',
    appVersion: 'v23.7.270'
  };

  window.sitepassSupabase = window.supabase.createClient(
    window.SITEPASS_DB_CONFIG.supabaseUrl,
    window.SITEPASS_DB_CONFIG.supabaseAnonKey
  );
