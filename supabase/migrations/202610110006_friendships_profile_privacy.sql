-- PatriaSoul / Čuvari nasljeđa — prijateljstva i privatnost profila.
-- Migracija je pripremljena za pregled; samo spremanje u GitHub ne mijenja bazu.
begin;

create table if not exists public.community_friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_friendships_not_self check (sender_id <> recipient_id),
  constraint community_friendships_pair_unique unique(sender_id, recipient_id)
);
create index if not exists community_friendships_recipient_status_idx
  on public.community_friendships(recipient_id,status,created_at desc);
create index if not exists community_friendships_sender_status_idx
  on public.community_friendships(sender_id,status,created_at desc);
alter table public.community_friendships enable row level security;
drop policy if exists "members read own friendship records" on public.community_friendships;
create policy "members read own friendship records" on public.community_friendships
for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists "members send friendship requests" on public.community_friendships;
create policy "members send friendship requests" on public.community_friendships
for insert to authenticated with check(sender_id=auth.uid() and status='pending' and sender_id<>recipient_id);
drop policy if exists "recipients answer friendship requests" on public.community_friendships;
create policy "recipients answer friendship requests" on public.community_friendships
for update to authenticated using(recipient_id=auth.uid() and status='pending')
with check(recipient_id=auth.uid() and status in ('accepted','declined'));
drop policy if exists "participants cancel friendship records" on public.community_friendships;
create policy "participants cancel friendship records" on public.community_friendships
for delete to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid());
revoke all on public.community_friendships from anon;
grant select,insert,update,delete on public.community_friendships to authenticated;

alter table public.profiles
  add column if not exists posts_visibility text not null default 'public'
    check(posts_visibility in ('public','friends','private')),
  add column if not exists photos_visibility text not null default 'public'
    check(photos_visibility in ('public','friends','private')),
  add column if not exists friends_visibility text not null default 'friends'
    check(friends_visibility in ('public','friends','private')),
  add column if not exists profile_info_visibility text not null default 'public'
    check(profile_info_visibility in ('public','friends','private'));

-- Omogućujemo korisniku mijenjati samo vlastite postavke privatnosti.
grant update (posts_visibility,photos_visibility,friends_visibility,profile_info_visibility)
  on public.profiles to authenticated;
revoke update (posts_visibility,photos_visibility,friends_visibility,profile_info_visibility)
  on public.profiles from anon;

commit;
