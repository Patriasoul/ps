-- Vlasnik može ukloniti vlastitu grupu; članstvo se uklanja kaskadno.
begin;

drop policy if exists "owners delete own community groups" on public.community_groups;
create policy "owners delete own community groups"
on public.community_groups
for delete to authenticated
using (owner_id = auth.uid());

grant delete on public.community_groups to authenticated;

commit;
