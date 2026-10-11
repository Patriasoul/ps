-- Omogući organizatoru da ukloni vlastiti događaj; administratorska prava ostaju netaknuta.
begin;

drop policy if exists "hosts delete own community events" on public.community_events;
create policy "hosts delete own community events"
on public.community_events
for delete to authenticated
using (host_id = auth.uid());

grant delete on public.community_events to authenticated;

commit;
