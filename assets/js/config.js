// SitePass v23.7.489-test - 만료 알림 숫자·방·읽음 통합 및 즉시 테스트
window.SITEPASS_DB_CONFIG = {
    provider: 'supabase',
    supabaseUrl: 'https://fipbgzvdwgjsmazmswaj.supabase.co',
    supabaseAnonKey: 'sb_publishable_thd7o7GUgf8EcetTFndW9A_Nxh6oIAO',
    storageBucket: 'sitepass-documents',
    appVersion: 'v23.7.489',
    pushFunctionName: 'send-push',
    // VAPID public key는 Edge Function에서 자동으로 받아옵니다.
    // 직접 넣고 싶으면 아래 주석을 풀고 public key를 넣어도 됩니다.
    // vapidPublicKey: ''
  };

  window.sitepassSupabase = window.supabase.createClient(
    window.SITEPASS_DB_CONFIG.supabaseUrl,
    window.SITEPASS_DB_CONFIG.supabaseAnonKey
  );

try { console.info('[SitePass deploy] v23.7.489-test expiry-test-four-badge-read-fix'); } catch (e) {}
