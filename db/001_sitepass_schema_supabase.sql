-- SitePass v23.7.122 실사용 DB 시작 스키마
-- 대상: Supabase PostgreSQL
-- 사용 방법: Supabase 프로젝트 생성 후 SQL Editor에 이 파일 전체를 붙여넣고 실행

create extension if not exists pgcrypto;

-- updated_at 자동 갱신 함수
create or replace function public.sitepass_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. 회원 / 권한
create table if not exists public.sitepass_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  login_id text unique,
  name text not null default '',
  phone text,
  company_name text,
  business_no text,
  signup_method text not null default 'sitepass',
  role text not null default 'member' check (role in ('member', 'operator_admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'withdrawn')),
  plan_type text not null default 'beta' check (plan_type in ('beta', 'monthly', 'annual', 'free_month', 'manual_paid')),
  plan_label text not null default '실사용베타',
  plan_started_at timestamptz,
  plan_ends_at timestamptz,
  last_login_at timestamptz,
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sitepass_members_updated_at on public.sitepass_members;
create trigger trg_sitepass_members_updated_at
before update on public.sitepass_members
for each row execute function public.sitepass_set_updated_at();

-- 2. 요금제
create table if not exists public.sitepass_payment_plans (
  id text primary key,
  label text not null,
  amount_krw integer not null check (amount_krw >= 0),
  duration_days integer not null check (duration_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sitepass_payment_plans_updated_at on public.sitepass_payment_plans;
create trigger trg_sitepass_payment_plans_updated_at
before update on public.sitepass_payment_plans
for each row execute function public.sitepass_set_updated_at();

insert into public.sitepass_payment_plans (id, label, amount_krw, duration_days, is_active)
values
  ('monthly', '월 결제', 2000, 30, true),
  ('annual', '연 결제', 19900, 365, true)
on conflict (id) do update set
  label = excluded.label,
  amount_krw = excluded.amount_krw,
  duration_days = excluded.duration_days,
  is_active = excluded.is_active,
  updated_at = now();

-- 3. 서류함 / 코드
create table if not exists public.sitepass_document_boxes (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references public.sitepass_members(id) on delete cascade,
  box_type text not null check (box_type in ('equipment', 'driver', 'worker', 'bundle')),
  code text not null unique,
  display_title text not null default '',
  equipment_no text,
  equipment_name text,
  driver_name text,
  worker_group_name text,
  service_status text not null default '실사용베타',
  service_ends_at timestamptz,
  share_enabled boolean not null default true,
  blocked_reason text,
  qr_last_generated_at timestamptz,
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_document_boxes_owner on public.sitepass_document_boxes(owner_member_id);
create index if not exists idx_sitepass_document_boxes_code on public.sitepass_document_boxes(code);
create index if not exists idx_sitepass_document_boxes_type on public.sitepass_document_boxes(box_type);

drop trigger if exists trg_sitepass_document_boxes_updated_at on public.sitepass_document_boxes;
create trigger trg_sitepass_document_boxes_updated_at
before update on public.sitepass_document_boxes
for each row execute function public.sitepass_set_updated_at();

-- 4. 현재 서류 상태
create table if not exists public.sitepass_documents (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.sitepass_document_boxes(id) on delete cascade,
  doc_group text not null check (doc_group in ('equipment', 'driver', 'worker', 'other')),
  doc_key text not null,
  doc_title text not null,
  is_required boolean not null default false,
  file_name text,
  storage_bucket text default 'sitepass-documents',
  storage_path text,
  file_mime text,
  file_size bigint,
  issue_date date,
  expire_date date,
  status text not null default 'registered' check (status in ('missing', 'registered', 'expiring', 'expired', 'replaced', 'deleted')),
  latest_version integer not null default 1,
  uploaded_by uuid references public.sitepass_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (box_id, doc_key)
);

create index if not exists idx_sitepass_documents_box on public.sitepass_documents(box_id);
create index if not exists idx_sitepass_documents_expire on public.sitepass_documents(expire_date);
create index if not exists idx_sitepass_documents_status on public.sitepass_documents(status);

drop trigger if exists trg_sitepass_documents_updated_at on public.sitepass_documents;
create trigger trg_sitepass_documents_updated_at
before update on public.sitepass_documents
for each row execute function public.sitepass_set_updated_at();

-- 5. 서류 교체 이력
create table if not exists public.sitepass_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.sitepass_documents(id) on delete cascade,
  version_no integer not null,
  file_name text,
  storage_bucket text default 'sitepass-documents',
  storage_path text,
  file_mime text,
  file_size bigint,
  issue_date date,
  expire_date date,
  changed_by uuid references public.sitepass_members(id) on delete set null,
  change_memo text,
  created_at timestamptz not null default now(),
  unique (document_id, version_no)
);

create index if not exists idx_sitepass_document_versions_doc on public.sitepass_document_versions(document_id);

-- 6. 담당자 공유 링크 / 7일 유효
create table if not exists public.sitepass_share_links (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.sitepass_document_boxes(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  recipient_role text check (recipient_role in ('subcontractor', 'general_contractor', 'manager', 'other')),
  recipient_name text,
  recipient_phone text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_by uuid references public.sitepass_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sitepass_share_links_box on public.sitepass_share_links(box_id);
create index if not exists idx_sitepass_share_links_token on public.sitepass_share_links(token);
create index if not exists idx_sitepass_share_links_expire on public.sitepass_share_links(expires_at);

-- 7. 결제 / 연장 기록
create table if not exists public.sitepass_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.sitepass_members(id) on delete cascade,
  box_id uuid references public.sitepass_document_boxes(id) on delete set null,
  plan_id text references public.sitepass_payment_plans(id) on delete set null,
  amount_krw integer not null,
  status text not null default 'requested' check (status in ('requested', 'paid', 'failed', 'cancelled', 'refunded', 'manual_confirmed')),
  payment_provider text,
  provider_payment_id text,
  paid_at timestamptz,
  service_started_at timestamptz,
  service_ends_at timestamptz,
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_payments_member on public.sitepass_payments(member_id);
create index if not exists idx_sitepass_payments_box on public.sitepass_payments(box_id);
create index if not exists idx_sitepass_payments_status on public.sitepass_payments(status);

drop trigger if exists trg_sitepass_payments_updated_at on public.sitepass_payments;
create trigger trg_sitepass_payments_updated_at
before update on public.sitepass_payments
for each row execute function public.sitepass_set_updated_at();

-- 8. 알림 발송 대기/이력
create table if not exists public.sitepass_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.sitepass_members(id) on delete cascade,
  box_id uuid references public.sitepass_document_boxes(id) on delete cascade,
  document_id uuid references public.sitepass_documents(id) on delete set null,
  notification_type text not null check (notification_type in ('doc_expire_soon', 'doc_expired', 'payment_soon', 'payment_expired', 'draft_reminder', 'admin_manual')),
  channel text not null check (channel in ('kakao', 'sms', 'push', 'in_app')),
  recipient_phone text,
  message text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_notifications_member on public.sitepass_notifications(member_id);
create index if not exists idx_sitepass_notifications_status on public.sitepass_notifications(status);
create index if not exists idx_sitepass_notifications_schedule on public.sitepass_notifications(scheduled_for);

drop trigger if exists trg_sitepass_notifications_updated_at on public.sitepass_notifications;
create trigger trg_sitepass_notifications_updated_at
before update on public.sitepass_notifications
for each row execute function public.sitepass_set_updated_at();

-- 9. 자주 보내는 담당자
create table if not exists public.sitepass_favorite_recipients (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references public.sitepass_members(id) on delete cascade,
  label text not null,
  company_name text,
  person_name text,
  phone text,
  role text check (role in ('subcontractor', 'general_contractor', 'manager', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_favorite_recipients_owner on public.sitepass_favorite_recipients(owner_member_id);

drop trigger if exists trg_sitepass_favorite_recipients_updated_at on public.sitepass_favorite_recipients;
create trigger trg_sitepass_favorite_recipients_updated_at
before update on public.sitepass_favorite_recipients
for each row execute function public.sitepass_set_updated_at();

-- 10. 문의 / 피드백
create table if not exists public.sitepass_inquiries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.sitepass_members(id) on delete set null,
  category text not null default 'feedback',
  title text,
  content text not null,
  status text not null default 'open' check (status in ('open', 'checking', 'done', 'closed')),
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sitepass_inquiries_member on public.sitepass_inquiries(member_id);
create index if not exists idx_sitepass_inquiries_status on public.sitepass_inquiries(status);

drop trigger if exists trg_sitepass_inquiries_updated_at on public.sitepass_inquiries;
create trigger trg_sitepass_inquiries_updated_at
before update on public.sitepass_inquiries
for each row execute function public.sitepass_set_updated_at();

-- 11. 관리자 작업 기록
create table if not exists public.sitepass_admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_member_id uuid references public.sitepass_members(id) on delete set null,
  target_member_id uuid references public.sitepass_members(id) on delete set null,
  target_box_id uuid references public.sitepass_document_boxes(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sitepass_admin_logs_admin on public.sitepass_admin_logs(admin_member_id);
create index if not exists idx_sitepass_admin_logs_created on public.sitepass_admin_logs(created_at);

-- RLS 기본 설정: 실제 Auth 연결 전까지는 정책을 보수적으로 둔다.
alter table public.sitepass_members enable row level security;
alter table public.sitepass_payment_plans enable row level security;
alter table public.sitepass_document_boxes enable row level security;
alter table public.sitepass_documents enable row level security;
alter table public.sitepass_document_versions enable row level security;
alter table public.sitepass_share_links enable row level security;
alter table public.sitepass_payments enable row level security;
alter table public.sitepass_notifications enable row level security;
alter table public.sitepass_favorite_recipients enable row level security;
alter table public.sitepass_inquiries enable row level security;
alter table public.sitepass_admin_logs enable row level security;

-- 요금제는 로그인하지 않아도 읽을 수 있게 허용
drop policy if exists "payment plans are readable" on public.sitepass_payment_plans;
create policy "payment plans are readable"
on public.sitepass_payment_plans
for select
using (is_active = true);

-- 아래 정책은 Supabase Auth 연결 후 사용하는 기본안이다.
-- auth.uid()와 sitepass_members.auth_user_id가 연결된 회원은 자기 데이터만 읽고 수정한다.
drop policy if exists "members can read own profile" on public.sitepass_members;
create policy "members can read own profile"
on public.sitepass_members
for select
using (auth.uid() = auth_user_id);

drop policy if exists "members can update own profile" on public.sitepass_members;
create policy "members can update own profile"
on public.sitepass_members
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "members can read own boxes" on public.sitepass_document_boxes;
create policy "members can read own boxes"
on public.sitepass_document_boxes
for select
using (
  owner_member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "members can manage own boxes" on public.sitepass_document_boxes;
create policy "members can manage own boxes"
on public.sitepass_document_boxes
for all
using (
  owner_member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
)
with check (
  owner_member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "members can read own documents" on public.sitepass_documents;
create policy "members can read own documents"
on public.sitepass_documents
for select
using (
  box_id in (
    select b.id
    from public.sitepass_document_boxes b
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
);

drop policy if exists "members can manage own documents" on public.sitepass_documents;
create policy "members can manage own documents"
on public.sitepass_documents
for all
using (
  box_id in (
    select b.id
    from public.sitepass_document_boxes b
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
)
with check (
  box_id in (
    select b.id
    from public.sitepass_document_boxes b
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
);

-- 관리자 판별 함수
create or replace function public.sitepass_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.sitepass_members
    where auth_user_id = auth.uid()
      and role in ('operator_admin', 'super_admin')
      and status = 'active'
  );
$$;

-- 관리자는 주요 테이블 조회 가능
drop policy if exists "admins can read members" on public.sitepass_members;
create policy "admins can read members"
on public.sitepass_members
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can read boxes" on public.sitepass_document_boxes;
create policy "admins can read boxes"
on public.sitepass_document_boxes
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can read documents" on public.sitepass_documents;
create policy "admins can read documents"
on public.sitepass_documents
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can read payments" on public.sitepass_payments;
create policy "admins can read payments"
on public.sitepass_payments
for select
using (public.sitepass_is_admin());

-- 주의: 담당자 공유 링크 공개 조회는 Edge Function/API에서 token 검증 후 처리하는 방식 권장.
-- 프론트에서 anon key만으로 모든 서류를 직접 열람하게 만들지 않는다.

-- 추가 RLS 정책: 관련 보조 테이블

drop policy if exists "members can read own document versions" on public.sitepass_document_versions;
create policy "members can read own document versions"
on public.sitepass_document_versions
for select
using (
  document_id in (
    select d.id
    from public.sitepass_documents d
    join public.sitepass_document_boxes b on b.id = d.box_id
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
);

drop policy if exists "members can manage own document versions" on public.sitepass_document_versions;
create policy "members can manage own document versions"
on public.sitepass_document_versions
for all
using (
  document_id in (
    select d.id
    from public.sitepass_documents d
    join public.sitepass_document_boxes b on b.id = d.box_id
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
)
with check (
  document_id in (
    select d.id
    from public.sitepass_documents d
    join public.sitepass_document_boxes b on b.id = d.box_id
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
);

drop policy if exists "members can manage own share links" on public.sitepass_share_links;
create policy "members can manage own share links"
on public.sitepass_share_links
for all
using (
  box_id in (
    select b.id
    from public.sitepass_document_boxes b
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
)
with check (
  box_id in (
    select b.id
    from public.sitepass_document_boxes b
    join public.sitepass_members m on m.id = b.owner_member_id
    where m.auth_user_id = auth.uid()
  )
);

drop policy if exists "members can read own payments" on public.sitepass_payments;
create policy "members can read own payments"
on public.sitepass_payments
for select
using (
  member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "members can create own payment requests" on public.sitepass_payments;
create policy "members can create own payment requests"
on public.sitepass_payments
for insert
with check (
  member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "members can read own notifications" on public.sitepass_notifications;
create policy "members can read own notifications"
on public.sitepass_notifications
for select
using (
  member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "members can manage own favorite recipients" on public.sitepass_favorite_recipients;
create policy "members can manage own favorite recipients"
on public.sitepass_favorite_recipients
for all
using (
  owner_member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
)
with check (
  owner_member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "members can manage own inquiries" on public.sitepass_inquiries;
create policy "members can manage own inquiries"
on public.sitepass_inquiries
for all
using (
  member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
)
with check (
  member_id in (select id from public.sitepass_members where auth_user_id = auth.uid())
);

drop policy if exists "admins can read all document versions" on public.sitepass_document_versions;
create policy "admins can read all document versions"
on public.sitepass_document_versions
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can read share links" on public.sitepass_share_links;
create policy "admins can read share links"
on public.sitepass_share_links
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can manage notifications" on public.sitepass_notifications;
create policy "admins can manage notifications"
on public.sitepass_notifications
for all
using (public.sitepass_is_admin())
with check (public.sitepass_is_admin());

drop policy if exists "admins can read favorites" on public.sitepass_favorite_recipients;
create policy "admins can read favorites"
on public.sitepass_favorite_recipients
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can manage inquiries" on public.sitepass_inquiries;
create policy "admins can manage inquiries"
on public.sitepass_inquiries
for all
using (public.sitepass_is_admin())
with check (public.sitepass_is_admin());

drop policy if exists "admins can read admin logs" on public.sitepass_admin_logs;
create policy "admins can read admin logs"
on public.sitepass_admin_logs
for select
using (public.sitepass_is_admin());

drop policy if exists "admins can create admin logs" on public.sitepass_admin_logs;
create policy "admins can create admin logs"
on public.sitepass_admin_logs
for insert
with check (public.sitepass_is_admin());
