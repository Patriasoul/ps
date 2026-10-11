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

commit;
