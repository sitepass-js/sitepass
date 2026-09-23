// SitePass v23.7.710-78-core-modularization - common core Supabase singleton
window.SITEPASS_DB_CONFIG = {
    provider: 'supabase',
    supabaseUrl: 'https://kbshbjrsjyqegacbtxme.supabase.co',
    supabaseAnonKey: 'sb_publishable_vtGzfisU-fVqJQ7JhDUB0A_8zBtXPfo',
    storageBucket: 'sitepass-documents',
    // v23.7.561-test: Storage 비공개 + 15분 기간제 signed URL 사용
    storageAccessMode: 'signed',
    storageSignedUrlTtlSeconds: 900,
    appVersion: 'v23.7.784r14-step93-admin-support-chats-security-reinforcement',
    appUrl: 'https://sitepass.co.kr/',
    pushFunctionName: 'send-push',
    // VAPID public key는 Edge Function에서 자동으로 받아옵니다.
    // 직접 넣고 싶으면 아래 주석을 풀고 public key를 넣어도 됩니다.
    // vapidPublicKey: ''
  };

  window.sitepassSupabase = window.supabase.createClient(
    window.SITEPASS_DB_CONFIG.supabaseUrl,
    window.SITEPASS_DB_CONFIG.supabaseAnonKey
  );

window.SitePassCoreSupabase = Object.freeze({
  getClient: function(){ return window.sitepassSupabase || null; },
  hasClient: function(){ return !!window.sitepassSupabase; },
  getConfig: function(){ return window.SITEPASS_DB_CONFIG || {}; }
});
try { console.info('[SitePass Step78] common core Supabase singleton ready'); } catch (e) {}
