-- PatriaSoul / Čuvari nasljeđa — primjena privatnosti na fotografije.
-- Migracija je pripremljena za pregled; samo spremanje u GitHub ne mijenja bazu.
begin;

-- Privatni bucket ne smije zaobići postavku "Fotografije" preko izravnog URL-a.
-- Vlasnik i dalje može pristupiti vlastitim datotekama; ostali članovi samo
-- fotografijama profila/objava koje su im dopuštene prema pravilima privatnosti.
drop policy if exists "members read attached community images" on storage.objects;
create policy "members read attached community images" on storage.objects
for select to authenticated
using (
  bucket_id = 'community-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.profiles cover
      where cover.cover_image_path = name
        and (
          cover.photos_visibility = 'public'
          or (
            cover.photos_visibility = 'friends'
            and exists (
              select 1 from public.community_friendships f
              where f.status = 'accepted'
                and (
                  (f.sender_id = auth.uid() and f.recipient_id = cover.id)
                  or (f.sender_id = cover.id and f.recipient_id = auth.uid())
                )
            )
          )
        )
    )
    or exists (
      select 1
      from public.community_posts p
      join public.profiles owner_profile on owner_profile.id = p.author_id
      where p.image_path = name
        and p.status = 'published'
        and (
          owner_profile.photos_visibility = 'public'
          or (
            owner_profile.photos_visibility = 'friends'
            and exists (
              select 1 from public.community_friendships f
              where f.status = 'accepted'
                and (
                  (f.sender_id = auth.uid() and f.recipient_id = owner_profile.id)
                  or (f.sender_id = owner_profile.id and f.recipient_id = auth.uid())
                )
            )
          )
        )
        and (
          owner_profile.posts_visibility = 'public'
          or (
            owner_profile.posts_visibility = 'friends'
            and exists (
              select 1 from public.community_friendships f
              where f.status = 'accepted'
                and (
                  (f.sender_id = auth.uid() and f.recipient_id = owner_profile.id)
                  or (f.sender_id = owner_profile.id and f.recipient_id = auth.uid())
                )
            )
          )
        )
        and not exists (
          select 1 from public.community_user_blocks b
          where (b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
             or (b.blocker_id = p.author_id and b.blocked_id = auth.uid())
        )
    )
  )
);

commit;
