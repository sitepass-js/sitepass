// SitePass v23.7.503-test - 담당자 서류 복원·상세보기·공유기록 수정
window.SITEPASS_DB_CONFIG = {
    provider: 'supabase',
    supabaseUrl: 'https://fipbgzvdwgjsmazmswaj.supabase.co',
    supabaseAnonKey: 'sb_publishable_thd7o7GUgf8EcetTFndW9A_Nxh6oIAO',
    storageBucket: 'sitepass-documents',
    appVersion: 'v23.7.503',
    pushFunctionName: 'send-push',
    // VAPID public key는 Edge Function에서 자동으로 받아옵니다.
    // 직접 넣고 싶으면 아래 주석을 풀고 public key를 넣어도 됩니다.
    // vapidPublicKey: ''
  };

  window.sitepassSupabase = window.supabase.createClient(
    window.SITEPASS_DB_CONFIG.supabaseUrl,
    window.SITEPASS_DB_CONFIG.supabaseAnonKey
  );

try { console.info('[SitePass deploy] v23.7.503-test manager-docs-detail-history-fix'); } catch (e) {}
