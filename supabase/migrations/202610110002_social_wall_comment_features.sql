-- PatriaSoul: reakcije, odgovori i fotografije u komentarima.
-- Pripremljeno na razvojnoj grani; nije primijenjeno na Supabase.
begin;
alter table public.community_post_comments add column if not exists parent_comment_id uuid references public.community_post_comments(id) on delete cascade;
alter table public.community_post_comments add column if not exists image_path text;
alter table public.community_post_comments drop constraint if exists community_post_comments_content_check;
alter table public.community_post_comments add constraint community_post_comments_content_check check (char_length(btrim(content)) between 1 and 1000 or (image_path is not null and char_length(btrim(content)) = 0));
create index if not exists community_post_comments_parent_idx on public.community_post_comments(parent_comment_id, created_at);
create table if not exists public.community_comment_reactions (
 id uuid primary key default gen_random_uuid(),
 comment_id uuid not null references public.community_post_comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 reaction text not null default 'heart' check (reaction in ('heart')),
 created_at timestamptz not null default now(),
 constraint community_comment_reactions_one_per_user unique(comment_id,user_id)
);
create index if not exists community_comment_reactions_comment_idx on public.community_comment_reactions(comment_id);
alter table public.community_comment_reactions enable row level security;
drop policy if exists "members read comment reactions" on public.community_comment_reactions;
create policy "members read comment reactions" on public.community_comment_reactions for select to authenticated using (true);
drop policy if exists "members add own comment reactions" on public.community_comment_reactions;
create policy "members add own comment reactions" on public.community_comment_reactions for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "members remove own comment reactions" on public.community_comment_reactions;
create policy "members remove own comment reactions" on public.community_comment_reactions for delete to authenticated using (user_id=auth.uid());
grant select, insert, delete on public.community_comment_reactions to authenticated;
commit;
