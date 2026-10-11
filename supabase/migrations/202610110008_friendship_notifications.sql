-- PatriaSoul / Čuvari nasljeđa — obavijesti za zahtjeve prijateljstva.
-- Pripremljeno za pregled. Ne primjenjuje se automatski na produkcijsku bazu.
begin;

create or replace function public.notify_community_friendship_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  select coalesce(nullif(btrim(display_name), ''), 'Čuvar nasljeđa')
    into actor_name
  from public.profiles
  where id = case
    when TG_OP = 'INSERT' then NEW.sender_id
    else NEW.recipient_id
  end;

  if TG_OP = 'INSERT' and NEW.status = 'pending' then
    insert into public.user_notifications (user_id, title, body, kind, target_url)
    values (
      NEW.recipient_id,
      'Novi zahtjev za prijateljstvo',
      actor_name || ' želi se povezati s tobom na PatriaSoul zajednici.',
      'friend_request',
      'profil.html'
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.status = 'pending'
     and NEW.status in ('accepted', 'declined') then
    select coalesce(nullif(btrim(display_name), ''), 'Čuvar nasljeđa')
      into actor_name
    from public.profiles where id = NEW.recipient_id;

    insert into public.user_notifications (user_id, title, body, kind, target_url)
    values (
      NEW.sender_id,
      case when NEW.status = 'accepted'
        then 'Zahtjev za prijateljstvo prihvaćen'
        else 'Odgovor na zahtjev za prijateljstvo'
      end,
      case when NEW.status = 'accepted'
        then actor_name || ' je prihvatio/la tvoj zahtjev za prijateljstvo.'
        else actor_name || ' trenutačno nije prihvatio/la tvoj zahtjev za prijateljstvo.'
      end,
      case when NEW.status = 'accepted' then 'friend_accepted' else 'friend_declined' end,
      'profil.html'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists community_friendship_notify_insert on public.community_friendships;
create trigger community_friendship_notify_insert
after insert on public.community_friendships
for each row execute function public.notify_community_friendship_activity();

drop trigger if exists community_friendship_notify_update on public.community_friendships;
create trigger community_friendship_notify_update
after update of status on public.community_friendships
for each row execute function public.notify_community_friendship_activity();

commit;
