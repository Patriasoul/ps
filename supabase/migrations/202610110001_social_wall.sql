-- PatriaSoul / Čuvari nasljeđa — prva verzija društvenog zida.
-- Ova je migracija pripremljena za pregled i ručno primjenjivanje.
-- Samo spremanje datoteke u GitHub NE mijenja produkcijsku bazu.
begin;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  image_path text,
  link_url text,
  link_title text,
  link_type text not null default 'link' check (link_type in ('forum','quiz','event','link')),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_content_check check (
    char_length(content) <= 5000 and (char_length(btrim(content)) > 0 or image_path is not null or link_url is not null)
  ),
  constraint community_posts_link_url_check check (
    link_url is null or link_url ~ '^https://(ps\.patriasoul\.workers\.dev|patriasoul\.github\.io)(/|$)'
  )
);
create index if not exists community_posts_feed_idx on public.community_posts(status, created_at desc);
create index if not exists community_posts_author_idx on public.community_posts(author_id, created_at desc);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists community_post_comments_post_idx on public.community_post_comments(post_id, created_at);

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'heart' check (reaction in ('heart','support','pride')),
  created_at timestamptz not null default now(),
  constraint community_post_reactions_one_per_user unique(post_id,user_id)
);
create index if not exists community_post_reactions_post_idx on public.community_post_reactions(post_id);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','action_taken')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  moderation_note text,
  created_at timestamptz not null default now(),
  constraint community_post_reports_once unique(post_id,reporter_id)
);
create index if not exists community_post_reports_status_idx on public.community_post_reports(status,created_at);

create table if not exists public.community_user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_user_blocks_not_self check (blocker_id <> blocked_id),
  constraint community_user_blocks_unique unique(blocker_id,blocked_id)
);
create index if not exists community_user_blocks_blocker_idx on public.community_user_blocks(blocker_id,blocked_id);

alter table public.community_posts enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_reports enable row level security;
alter table public.community_user_blocks enable row level security;

-- Prevent anonymous access. Authenticated members can read published posts only,
-- except their own posts and content visible to authorized moderators.
drop policy if exists "wall posts read by members" on public.community_posts;
create policy "wall posts read by members" on public.community_posts for select to authenticated
using (
  (status = 'published' or author_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')
  ))
  and not exists (
    select 1 from public.community_user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
       or (b.blocker_id = author_id and b.blocked_id = auth.uid())
  )
);
drop policy if exists "members create own wall posts" on public.community_posts;
create policy "members create own wall posts" on public.community_posts for insert to authenticated
with check (author_id = auth.uid() and status = 'published');
drop policy if exists "authors and moderators update wall posts" on public.community_posts;
create policy "authors and moderators update wall posts" on public.community_posts for update to authenticated
using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')))
with check (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')));
drop policy if exists "authors and moderators delete wall posts" on public.community_posts;
create policy "authors and moderators delete wall posts" on public.community_posts for delete to authenticated
using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')));

drop policy if exists "read comments on visible posts" on public.community_post_comments;
create policy "read comments on visible posts" on public.community_post_comments for select to authenticated
using (exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "members create own comments" on public.community_post_comments;
create policy "members create own comments" on public.community_post_comments for insert to authenticated
with check (author_id = auth.uid() and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "authors and moderators delete comments" on public.community_post_comments;
create policy "authors and moderators delete comments" on public.community_post_comments for delete to authenticated
using (author_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')));

drop policy if exists "read reactions on visible posts" on public.community_post_reactions;
create policy "read reactions on visible posts" on public.community_post_reactions for select to authenticated
using (exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "members add own reactions" on public.community_post_reactions;
create policy "members add own reactions" on public.community_post_reactions for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "members remove own reactions" on public.community_post_reactions;
create policy "members remove own reactions" on public.community_post_reactions for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "members report visible posts" on public.community_post_reports;
create policy "members report visible posts" on public.community_post_reports for insert to authenticated
with check (reporter_id = auth.uid() and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "reporters read own reports" on public.community_post_reports;
create policy "reporters read own reports" on public.community_post_reports for select to authenticated
using (reporter_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')));
drop policy if exists "moderators review reports" on public.community_post_reports;
create policy "moderators review reports" on public.community_post_reports for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor')));

drop policy if exists "members manage own blocks" on public.community_user_blocks;
create policy "members read relevant blocks" on public.community_user_blocks for select to authenticated
using (blocker_id = auth.uid() or blocked_id = auth.uid());
drop policy if exists "members block others" on public.community_user_blocks;
create policy "members block others" on public.community_user_blocks for insert to authenticated
with check (blocker_id = auth.uid() and blocked_id <> auth.uid());
drop policy if exists "members unblock others" on public.community_user_blocks;
create policy "members unblock others" on public.community_user_blocks for delete to authenticated
using (blocker_id = auth.uid());

-- Explicit API privileges: no anonymous access, and no client-side changes to author/status.
revoke all on public.community_posts, public.community_post_comments, public.community_post_reactions, public.community_post_reports, public.community_user_blocks from anon;
grant select, insert, delete on public.community_posts to authenticated;
grant update (content, image_path, updated_at, status) on public.community_posts to authenticated;
grant select, insert, delete on public.community_post_comments to authenticated;
grant select, insert, delete on public.community_post_reactions to authenticated;
grant select, insert on public.community_post_reports to authenticated;
grant update (status, reviewed_by, reviewed_at, moderation_note) on public.community_post_reports to authenticated;
grant select, insert, delete on public.community_user_blocks to authenticated;

-- Private image bucket. Images are visible only when attached to a published post,
-- or to the member who uploaded them.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('community-media','community-media',false,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload own community images" on storage.objects;
create policy "members upload own community images" on storage.objects for insert to authenticated
with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "members read attached community images" on storage.objects;
create policy "members read attached community images" on storage.objects for select to authenticated
using (
  bucket_id = 'community-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.community_posts p
      where p.image_path = name and p.status = 'published'
        and not exists (
          select 1 from public.community_user_blocks b
          where (b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
             or (b.blocker_id = p.author_id and b.blocked_id = auth.uid())
        )
    )
  )
);
drop policy if exists "members delete own community images" on storage.objects;
create policy "members delete own community images" on storage.objects for delete to authenticated
using (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);


-- Grupe zajednice
create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_groups_created_idx on public.community_groups(created_at desc);
create table if not exists public.community_group_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create index if not exists community_group_members_user_idx on public.community_group_members(user_id,joined_at desc);

alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
drop policy if exists "members read accessible groups" on public.community_groups;
create policy "members read accessible groups" on public.community_groups for select to authenticated
using (visibility='public' or owner_id=auth.uid());
drop policy if exists "members create groups" on public.community_groups;
create policy "members create groups" on public.community_groups for insert to authenticated
with check(owner_id=auth.uid());
drop policy if exists "owners and moderators update groups" on public.community_groups;
create policy "owners and moderators update groups" on public.community_groups for update to authenticated
using(owner_id=auth.uid() or exists(select 1 from public.community_group_members gm where gm.group_id=id and gm.user_id=auth.uid() and gm.role='moderator') or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','editor')))
with check(owner_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
drop policy if exists "members read group membership" on public.community_group_members;
create policy "members read group membership" on public.community_group_members for select to authenticated
using(user_id=auth.uid() or exists(select 1 from public.community_groups g where g.id=group_id and (g.visibility='public' or g.owner_id=auth.uid())));
drop policy if exists "members join public groups" on public.community_group_members;
create policy "members join public groups" on public.community_group_members for insert to authenticated
with check(user_id=auth.uid() and ((role='member' and exists(select 1 from public.community_groups g where g.id=group_id and g.visibility='public' and g.owner_id<>auth.uid())) or (role='owner' and exists(select 1 from public.community_groups g where g.id=group_id and g.owner_id=auth.uid())));
drop policy if exists "members leave groups" on public.community_group_members;
create policy "members leave groups" on public.community_group_members for delete to authenticated
using(user_id=auth.uid() and role='member');

-- Događaji i odaziv
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.community_groups(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  location text not null default '' check (char_length(location) <= 180),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_events_time_check check (ends_at is null or ends_at >= starts_at)
);
create index if not exists community_events_starts_idx on public.community_events(starts_at asc);
create table if not exists public.community_event_attendees (
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default 'going' check(response in ('going','interested')),
  created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
alter table public.community_events enable row level security;
alter table public.community_event_attendees enable row level security;
drop policy if exists "members read community events" on public.community_events;
create policy "members read community events" on public.community_events for select to authenticated using(true);
drop policy if exists "members create community events" on public.community_events;
create policy "members create community events" on public.community_events for insert to authenticated with check(host_id=auth.uid());
drop policy if exists "hosts and moderators update events" on public.community_events;
create policy "hosts and moderators update events" on public.community_events for update to authenticated
using(host_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','editor')))
with check(host_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','editor')));
drop policy if exists "members read event attendance" on public.community_event_attendees;
create policy "members read event attendance" on public.community_event_attendees for select to authenticated using(true);
drop policy if exists "members respond to events" on public.community_event_attendees;
create policy "members respond to events" on public.community_event_attendees for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.community_events e where e.id=event_id));
drop policy if exists "members change or remove their response" on public.community_event_attendees;
create policy "members change or remove their response" on public.community_event_attendees for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "members cancel their response" on public.community_event_attendees;
create policy "members cancel their response" on public.community_event_attendees for delete to authenticated using(user_id=auth.uid());

revoke all on public.community_groups,public.community_group_members,public.community_events,public.community_event_attendees from anon;
grant select,insert,update on public.community_groups to authenticated;
grant select,insert,delete on public.community_group_members to authenticated;
grant select,insert,update on public.community_events to authenticated;
grant select,insert,update,delete on public.community_event_attendees to authenticated;

commit;
