-- PatriaSoul account lifecycle requests.
-- Requests are recorded for administrator review; this migration does not deactivate or delete accounts by itself.
begin;

create table if not exists public.account_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('deactivate','delete')),
  account_email text,
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending','in_review','completed','rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null,
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000)
);

create index if not exists account_lifecycle_requests_user_idx
  on public.account_lifecycle_requests(user_id, created_at desc);
create index if not exists account_lifecycle_requests_pending_idx
  on public.account_lifecycle_requests(user_id, request_type)
  where status in ('pending','in_review');

alter table public.account_lifecycle_requests enable row level security;
revoke all on public.account_lifecycle_requests from anon;
grant select, insert on public.account_lifecycle_requests to authenticated;
grant update (status, processed_at, processed_by, admin_note) on public.account_lifecycle_requests to authenticated;

drop policy if exists "members submit own lifecycle requests" on public.account_lifecycle_requests;
create policy "members submit own lifecycle requests"
on public.account_lifecycle_requests for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and processed_at is null
  and processed_by is null
  and admin_note is null
);

drop policy if exists "members read own lifecycle requests" on public.account_lifecycle_requests;
create policy "members read own lifecycle requests"
on public.account_lifecycle_requests for select to authenticated
using (
  user_id = auth.uid()
  or (auth.jwt() ->> 'email') = 'patriasoul@protonmail.com'
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "administrators process lifecycle requests" on public.account_lifecycle_requests;
create policy "administrators process lifecycle requests"
on public.account_lifecycle_requests for update to authenticated
using ((auth.jwt() ->> 'email') = 'patriasoul@protonmail.com' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check ((auth.jwt() ->> 'email') = 'patriasoul@protonmail.com' or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

commit;
