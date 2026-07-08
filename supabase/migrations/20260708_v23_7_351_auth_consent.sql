-- SitePass v23.7.351
-- SENS 휴대폰 인증 + 본인확인 준비 + 약관/동의 저장 구조
-- 주의: 주민등록번호 원문은 저장하지 않습니다.

create extension if not exists pgcrypto;

create table if not exists public.sitepass_terms_consents (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('member','driver','worker')),
  subject_id text,
  purpose text not null default 'phone_verification',
  name text not null,
  birth_date date,
  phone_hash text,
  phone_last4 text,
  terms_version text not null default 'v23.7.351',
  privacy_version text not null default 'v23.7.351',
  sms_terms_version text not null default 'v23.7.351',
  identity_terms_version text not null default 'v23.7.351',
  agreed_flags jsonb not null default '{}'::jsonb,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sitepass_terms_consents_subject
  on public.sitepass_terms_consents(subject_type, subject_id, created_at desc);

create table if not exists public.sitepass_phone_verifications (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('member','driver','worker')),
  subject_id text,
  purpose text not null default 'signup',
  name text not null,
  birth_date date,
  phone_hash text not null,
  phone_last4 text not null,
  code_hash text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  resend_after timestamptz not null,
  verified_at timestamptz,
  sens_request_id text,
  send_result jsonb,
  ip_hash text,
  user_agent text,
  consent_id uuid references public.sitepass_terms_consents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_phone_verifications_phone_recent
  on public.sitepass_phone_verifications(phone_hash, created_at desc);

create index if not exists idx_sitepass_phone_verifications_subject
  on public.sitepass_phone_verifications(subject_type, subject_id, created_at desc);

create table if not exists public.sitepass_identity_verifications (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('member','driver','worker')),
  subject_id text,
  provider text not null default 'none',
  provider_tx_id text,
  verified_name text,
  verified_birth_date date,
  verified_phone_hash text,
  verified_phone_last4 text,
  ci_hash text,
  di_hash text,
  identity_status text not null default 'not_configured'
    check (identity_status in ('not_configured','ready','pending','verified','failed','cancelled')),
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  result_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_identity_verifications_subject
  on public.sitepass_identity_verifications(subject_type, subject_id, created_at desc);

create or replace function public.sitepass_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sitepass_phone_verifications_updated_at on public.sitepass_phone_verifications;
create trigger trg_sitepass_phone_verifications_updated_at
before update on public.sitepass_phone_verifications
for each row execute function public.sitepass_touch_updated_at();

drop trigger if exists trg_sitepass_identity_verifications_updated_at on public.sitepass_identity_verifications;
create trigger trg_sitepass_identity_verifications_updated_at
before update on public.sitepass_identity_verifications
for each row execute function public.sitepass_touch_updated_at();

alter table public.sitepass_terms_consents enable row level security;
alter table public.sitepass_phone_verifications enable row level security;
alter table public.sitepass_identity_verifications enable row level security;

-- 별도 공개 정책은 만들지 않습니다.
-- Edge Function이 service_role로만 쓰도록 유지합니다.

comment on table public.sitepass_phone_verifications is 'SitePass v23.7.351 SENS 휴대폰 인증 기록. 인증번호 원문 저장 금지.';
comment on table public.sitepass_identity_verifications is 'SitePass v23.7.351 NICE/KCB/PASS 본인확인 준비 테이블. 주민등록번호 원문 저장 금지.';
comment on table public.sitepass_terms_consents is 'SitePass v23.7.351 약관/개인정보/SMS/본인확인 동의 기록.';
