-- Account-specific leaderboard position for the signed-in PatriaSoul member.
-- Prepared for review; adding this file does not apply it to Supabase.
begin;

create or replace function public.get_my_leaderboard_position(p_quiz_type text default null)
returns table (
  position bigint,
  display_name text,
  quizzes_played bigint,
  best_percentage numeric,
  average_percentage numeric
)
language sql
stable
security definer
set search_path = ''
as $function$
  with member_stats as (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.display_name), ''), 'Igrač') as member_name,
      count(q.id)::bigint as played,
      max(q.percentage)::numeric as best,
      round(avg(q.percentage), 2)::numeric as average
    from public.profiles p
    join public.quiz_results q on q.user_id = p.id
    where (p_quiz_type is null or q.quiz_type = p_quiz_type)
      and nullif(trim(p.display_name), '') is not null
    group by p.id, p.display_name
  ),
  ranked as (
    select
      row_number() over (
        order by best desc, average desc, played desc, member_name asc, user_id asc
      ) as rank_position,
      user_id,
      member_name,
      played,
      best,
      average
    from member_stats
  )
  select
    r.rank_position,
    r.member_name,
    r.played,
    r.best,
    r.average
  from ranked r
  where r.user_id = auth.uid()
  limit 1;
$function$;

revoke all on function public.get_my_leaderboard_position(text) from public;
revoke all on function public.get_my_leaderboard_position(text) from anon;
grant execute on function public.get_my_leaderboard_position(text) to authenticated;

commit;
