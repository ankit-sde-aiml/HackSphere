-- HackSphere 023: certificates must be backed by supervised internship evaluation.
-- Prevent bypass through direct REST inserts regardless of UI checks.
create or replace function app_private.require_certificate_recommendation()
returns trigger
language plpgsql security definer set search_path='' as $$
declare pr record;
begin
  select id,is_test,start_date,training_days,internship_days into pr
  from public.programs where id=new.program_id;
  if not found then raise exception 'Program not found';end if;
  if pr.is_test or exists(
    select 1 from public.enrollments en
    where en.program_id=new.program_id and en.student_id=new.student_id and en.is_test
  ) then raise exception 'QA enrollment cannot receive verified certificates'; end if;
  if not exists(
    select 1 from public.enrollments en
    where en.program_id=new.program_id and en.student_id=new.student_id
      and en.status in ('active','completed') and not en.is_test
  ) then raise exception 'Verified enrollment is required';end if;
  if app_private.program_today(new.program_id) <
     (pr.start_date+pr.training_days+pr.internship_days-1)
  then raise exception 'Internship period has not finished';end if;
  if not exists(
    select 1 from public.completion_recommendations r
    where r.program_id=new.program_id and r.student_id=new.student_id
      and r.recommendation='recommended'
      and (
         exists(select 1 from public.internship_teams t
           join public.internship_team_members m on m.team_id=t.id
           where m.student_id=new.student_id and t.program_id=new.program_id
           and t.mentor_id=r.guide_user_id and t.status in ('submitted','completed'))
         or (
          not exists(select 1 from public.internship_teams t where t.program_id=new.program_id)
          and exists(select 1 from public.guide_allocations g
             where g.program_id=new.program_id and g.student_id=new.student_id
               and g.guide_user_id=r.guide_user_id)
         )
      )
  ) then raise exception 'The assigned internship mentor must recommend completed work';end if;
  if not exists(
     select 1 from public.evaluations v
     where v.program_id=new.program_id and v.student_id=new.student_id
       and v.phase='internship' and v.max_score>0 and v.score>=0
       and v.evaluator_id is not null
       and (
         exists(select 1 from public.internship_teams t
            join public.internship_team_members m on m.team_id=t.id
            where t.program_id=new.program_id and m.student_id=new.student_id
            and t.mentor_id=v.evaluator_id)
         or exists(select 1 from public.guide_allocations g
            where g.program_id=new.program_id and g.student_id=new.student_id
              and g.guide_user_id=v.evaluator_id)
       )
  ) then raise exception 'Individual internship evaluation by the responsible mentor is required';end if;
  return new;
end $$;
