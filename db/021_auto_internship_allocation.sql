-- Hacksphere v2 automated, auditable internship team allocation.
-- Reuses real enrollments and assigned program mentor capacity; never touches test batches.

create table if not exists public.internship_allocation_audit (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 attempted_at timestamptz not null default now(),
 outcome text not null check(outcome in ('allocated','pending','error')),
 details jsonb not null default '{}'::jsonb
);
create index if not exists hs_alloc_audit_recent on public.internship_allocation_audit(program_id,attempted_at desc);
alter table public.internship_allocation_audit enable row level security;
create policy "admins review internship allocation runs"
 on public.internship_allocation_audit for select to authenticated
 using((select app_private.is_admin()));
grant select on public.internship_allocation_audit to authenticated;

create or replace function app_private.allocate_five_student_teams(_program_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prog record; total_students int; full_groups int; i int:=0;
 current_team uuid; mentor uuid; candidate record; available_seats int;
begin
 perform pg_advisory_xact_lock(hashtextextended(_program_id::text, 2026));
 select * into prog from public.programs where id=_program_id for update;
 if not found then raise exception 'Program not found'; end if;
 if prog.is_test then raise exception 'Test programs cannot allocate real internships'; end if;
 if prog.status not in ('published','ongoing','completed')
 then raise exception 'Unpublished or archived program'; end if;
 if (now() at time zone prog.timezone)::date < prog.start_date+prog.training_days
 then raise exception 'Training has not completed'; end if;
 if exists(select 1 from public.internship_teams t where t.program_id=_program_id)
 then return jsonb_build_object('already_generated',true,
 'teams',(select count(*) from public.internship_teams t where t.program_id=_program_id)); end if;
 select count(*) into total_students from public.enrollments
 where program_id=_program_id and status='active' and not is_test;
 full_groups:=total_students/5;
 select coalesce(sum(max_internship_teams),0) into available_seats
 from public.program_mentors where program_id=_program_id and can_supervise_internship;
 if full_groups>available_seats
 then raise exception 'Insufficient mentor team capacity: need %, have %',full_groups,available_seats;end if;
 for candidate in select student_id from public.enrollments
  where program_id=_program_id and status='active' and not is_test
  order by approved_at,student_id limit full_groups*5
 loop
  if mod(i,5)=0 then
    select pm.mentor_id into mentor from public.program_mentors pm
    where pm.program_id=_program_id and pm.can_supervise_internship
    and (select count(*) from public.internship_teams t where t.program_id=_program_id
      and t.mentor_id=pm.mentor_id)<pm.max_internship_teams
    order by (select count(*) from public.internship_teams t where t.program_id=_program_id
      and t.mentor_id=pm.mentor_id),pm.mentor_id limit 1;
    if mentor is null then raise exception 'No eligible mentor capacity available';end if;
    insert into public.internship_teams(program_id,team_number,mentor_id)
    values(_program_id,i/5+1,mentor) returning id into current_team;
  end if;
  insert into public.internship_team_members(team_id,program_id,student_id)
  values(current_team,_program_id,candidate.student_id);
  i:=i+1;
 end loop;
 return jsonb_build_object('teams_created',full_groups,
  'students_allocated',full_groups*5,'students_waiting',total_students-full_groups*5);
end $$;

-- Public RPC retains Admin authorization and calls the same allocation logic.
create or replace function public.generate_internship_teams(_program_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not app_private.is_admin() then
  raise exception 'Admin required to generate internship teams';end if;
 return app_private.allocate_five_student_teams(_program_id);
end $$;
revoke all on function app_private.allocate_five_student_teams(uuid) from public,anon,authenticated;
revoke all on function public.generate_internship_teams(uuid) from public,anon;
grant execute on function public.generate_internship_teams(uuid) to authenticated;

-- This private function can be called by Supabase Cron as postgres.
create or replace function app_private.allocate_due_internship_teams()
returns integer language plpgsql security definer set search_path='' as $$
declare pr record; outcome jsonb; processed int:=0; description text;
begin
 for pr in select id,title from public.programs p
 where p.status in ('published','ongoing','completed')
 and not p.is_test
 and (now() at time zone p.timezone)::date >= p.start_date+p.training_days
 and not exists(select 1 from public.internship_teams t where t.program_id=p.id)
 loop
  begin
    outcome:=app_private.allocate_five_student_teams(pr.id);
    insert into public.internship_allocation_audit(program_id,outcome,details)
    values(pr.id,case when coalesce((outcome->>'teams_created')::int,0)>0 then 'allocated' else 'pending' end,outcome);
    if coalesce((outcome->>'students_waiting')::int,0)>0 then
      insert into public.notifications(recipient_id,category,title,body,href)
      select distinct sr.user_id,'internship','Internship students still waiting',
      pr.title||': '||(outcome->>'students_waiting')||' students need team allocation review',
      '/workspace/admin/teams'
      from public.staff_roles sr where sr.role='admin';
    end if;
    processed:=processed+1;
  exception when others then
    get stacked diagnostics description=message_text;
    insert into public.internship_allocation_audit(program_id,outcome,details)
    values(pr.id,'error',jsonb_build_object('message',left(description,400)));
    insert into public.notifications(recipient_id,category,title,body,href)
    select distinct sr.user_id,'internship','Automatic internship team allocation failed',
    pr.title||': '||left(description,250),'/workspace/admin/teams'
    from public.staff_roles sr where sr.role='admin';
  end;
 end loop;
 return processed;
end $$;
revoke all on function app_private.allocate_due_internship_teams() from public,anon,authenticated;
