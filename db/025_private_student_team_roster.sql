-- HackSphere 025: privacy-safe, authenticated team roster names.
-- Returns only names of fellow members of the caller's own internship teams,
-- never emails or other profile fields.
create or replace function public.get_my_internship_roster()
returns table(id uuid, full_name text)
language sql stable security definer set search_path='' as $$
 select distinct pr.id,coalesce(nullif(btrim(pr.full_name),''),'Student') as full_name
 from public.profiles pr
 where auth.uid() is not null
 and exists (
  select 1 from public.internship_team_members teammate
  join public.internship_team_members mine
    on mine.team_id=teammate.team_id and mine.student_id=auth.uid()
  where teammate.student_id=pr.id
 )
$$;
revoke all on function public.get_my_internship_roster() from public,anon,authenticated;
grant execute on function public.get_my_internship_roster() to authenticated;
