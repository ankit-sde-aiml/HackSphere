-- HackSphere v2: additive foundations for course/batch, mentor-owned lessons,
-- global industry events, and five-student in-house internships.
-- Existing QA data, legacy roles, payments, and videos remain untouched.

create table if not exists public.course_catalog (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
 title text not null check (length(trim(title)) >= 3),
 description text,
 is_published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.course_catalog enable row level security;
create policy "catalog published or admin" on public.course_catalog
 for select to anon, authenticated
 using (is_published or (select app_private.is_admin()));
create policy "admin manages catalog" on public.course_catalog
 for all to authenticated using ((select app_private.is_admin()))
 with check ((select app_private.is_admin()));
grant select,insert,update,delete on public.course_catalog to authenticated;
grant select on public.course_catalog to anon;

alter table public.programs
 add column if not exists course_catalog_id uuid references public.course_catalog(id),
 add column if not exists batch_name text,
 add column if not exists enrollment_capacity integer check(enrollment_capacity is null or enrollment_capacity > 0);

create table if not exists public.program_mentors (
 program_id uuid not null references public.programs(id) on delete cascade,
 mentor_id uuid not null references auth.users(id) on delete cascade,
 can_supervise_internship boolean not null default true,
 max_internship_teams integer not null default 5 check(max_internship_teams between 0 and 50),
 assigned_at timestamptz not null default now(),
 primary key (program_id, mentor_id)
);
create index if not exists hs_program_mentors_person_idx on public.program_mentors(mentor_id,program_id);
alter table public.program_mentors enable row level security;
create or replace function app_private.is_program_mentor(_program_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.program_mentors pm
 where pm.program_id=_program_id and pm.mentor_id=auth.uid())
$$;
revoke all on function app_private.is_program_mentor(uuid) from public,anon;
grant execute on function app_private.is_program_mentor(uuid) to authenticated;
create policy "program mentors and admin can view membership" on public.program_mentors
 for select to authenticated
 using ((select app_private.is_admin()) or app_private.is_program_mentor(program_id));
create policy "admin controls program mentors" on public.program_mentors
 for all to authenticated
 using ((select app_private.is_admin())) with check ((select app_private.is_admin()));
grant select,insert,update,delete on public.program_mentors to authenticated;

-- Honor existing trainer/guide assignments without changing anyone's credentials.
insert into public.program_mentors(program_id,mentor_id)
select program_id,user_id from public.program_staff
union select program_id,user_id from public.program_guides
on conflict(program_id,mentor_id) do nothing;

create policy "assigned mentors see their programs" on public.programs
 for select to authenticated using(app_private.is_program_mentor(id));

-- The owner is set by Admin's full schedule, not by a mentor uploading content.
alter table public.timeline_events
 add column if not exists responsible_mentor_id uuid references auth.users(id);
create index if not exists hs_timeline_owner_idx on public.timeline_events(responsible_mentor_id,scheduled_date);
update public.timeline_events ev set responsible_mentor_id=ls.trainer_user_id
from public.live_sessions ls
where ls.timeline_event_id=ev.id and ls.trainer_user_id is not null and ev.responsible_mentor_id is null;
create or replace function app_private.check_scheduled_mentor()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.responsible_mentor_id is not null and not exists(
   select 1 from public.program_mentors pm where pm.program_id=new.program_id
   and pm.mentor_id=new.responsible_mentor_id
 ) then raise exception 'Scheduled mentor must belong to this program'; end if;
 return new;
end $$;
drop trigger if exists hs_v2_check_scheduled_mentor on public.timeline_events;
create trigger hs_v2_check_scheduled_mentor before insert or update of program_id,responsible_mentor_id
on public.timeline_events for each row execute function app_private.check_scheduled_mentor();

create or replace function app_private.can_manage_lesson(_event_id uuid, _mentor_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.timeline_events e where e.id=_event_id
 and (_mentor_id=auth.uid())
 and (
   app_private.is_admin()
   or (e.responsible_mentor_id is not null
      and e.responsible_mentor_id=_mentor_id
      and app_private.is_program_mentor(e.program_id))
   or (e.responsible_mentor_id is null
     and ((e.phase='training' and app_private.is_program_trainer(e.program_id))
       or (e.phase='internship' and app_private.is_program_guide(e.program_id))))
 ))
$$;
revoke all on function app_private.can_manage_lesson(uuid,uuid) from public,anon;
grant execute on function app_private.can_manage_lesson(uuid,uuid) to authenticated;

-- All assigned mentors view full curriculum; only the scheduled owner edits uploads.
create policy "program mentor reads schedule" on public.timeline_events
 for select to authenticated using(app_private.is_program_mentor(program_id));
create policy "program mentor reads live schedule" on public.live_sessions
 for select to authenticated using(app_private.is_program_mentor(program_id));

drop policy if exists "assigned staff publishes lesson resources" on public.lesson_resources;
create policy "mentor owns lesson resource insert" on public.lesson_resources
 for insert to authenticated
 with check(created_by=auth.uid()
  and app_private.can_manage_lesson(event_id,auth.uid())
  and (storage_path is null or exists (
    select 1 from public.timeline_events e where e.id=event_id
    and split_part(storage_path,'/',1)=e.program_id::text
    and split_part(storage_path,'/',2)=e.id::text)));
drop policy if exists "assigned staff edits lesson resources" on public.lesson_resources;
create policy "mentor owns lesson resource update" on public.lesson_resources
 for update to authenticated
 using(app_private.can_manage_lesson(event_id,auth.uid()))
 with check(app_private.can_manage_lesson(event_id,auth.uid())
  and (storage_path is null or exists(
    select 1 from public.timeline_events e where e.id=event_id
    and split_part(storage_path,'/',1)=e.program_id::text
    and split_part(storage_path,'/',2)=e.id::text)));
create policy "program mentors see lesson resources" on public.lesson_resources
 for select to authenticated using (exists(
 select 1 from public.timeline_events e where e.id=event_id
 and app_private.is_program_mentor(e.program_id)));
grant delete on public.lesson_resources to authenticated;
create policy "mentor owns lesson resource delete" on public.lesson_resources
 for delete to authenticated using(app_private.can_manage_lesson(event_id,auth.uid()));

drop policy if exists "staff create quiz" on public.quizzes;
create policy "scheduled mentor creates quiz" on public.quizzes
 for insert to authenticated
 with check(created_by=auth.uid() and app_private.can_manage_lesson(timeline_event_id,auth.uid()));
drop policy if exists "staff update quiz" on public.quizzes;
create policy "scheduled mentor updates quiz" on public.quizzes
 for update to authenticated using(app_private.can_manage_lesson(timeline_event_id,auth.uid()))
 with check(app_private.can_manage_lesson(timeline_event_id,auth.uid()));
create policy "program mentors see quizzes" on public.quizzes
 for select to authenticated using (exists(
 select 1 from public.timeline_events e where e.id=timeline_event_id
 and app_private.is_program_mentor(e.program_id)));

-- Preserve existing quiz engine; replace only the authoring check.
create or replace function public.add_quiz_question(
 _quiz_id uuid,_prompt text,_options jsonb,_correct_index integer,_points numeric default 1
) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid; event_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select timeline_event_id into event_id from public.quizzes where id=_quiz_id;
 if event_id is null or not app_private.can_manage_lesson(event_id,auth.uid())
 then raise exception 'Not assigned to author this quiz'; end if;
 if jsonb_typeof(_options)<>'array' or jsonb_array_length(_options) not between 2 and 6
    or _correct_index < 0 or _correct_index >= jsonb_array_length(_options)
    or _points <= 0 then raise exception 'Invalid question'; end if;
 insert into public.quiz_questions(quiz_id,prompt,options,position,points)
 values(_quiz_id,_prompt,_options,
 (select coalesce(max(position),0)+1 from public.quiz_questions where quiz_id=_quiz_id),_points)
 returning id into new_id;
 insert into app_private.quiz_answers(question_id,correct_index) values(new_id,_correct_index);
 return new_id;
end $$;
revoke all on function public.add_quiz_question(uuid,text,jsonb,integer,numeric) from public,anon;
grant execute on function public.add_quiz_question(uuid,text,jsonb,integer,numeric) to authenticated;

-- Recording upload rights follow the schedule owner, including the time gate.
create or replace function app_private.may_upload_lesson_video(event_id uuid,staff_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
select exists(
 select 1 from public.timeline_events ev join public.programs pr on pr.id=ev.program_id
 where ev.id=event_id and staff_id=auth.uid()
 and app_private.can_manage_lesson(ev.id,staff_id)
 and (
   not exists(select 1 from public.live_sessions ls
     where ls.timeline_event_id=ev.id and ls.status<>'cancelled')
   or exists(select 1 from public.live_sessions ls
     where ls.timeline_event_id=ev.id and ls.status<>'cancelled'
       and (ls.trainer_user_id=staff_id or (ev.responsible_mentor_id=staff_id and ls.trainer_user_id is null))
       and now() >= ((ls.session_date+ls.start_time) at time zone pr.timezone)
         + make_interval(mins=>ls.duration_minutes))
 )
) $$;
revoke all on function app_private.may_upload_lesson_video(uuid,uuid) from public,anon;
grant execute on function app_private.may_upload_lesson_video(uuid,uuid) to authenticated;

-- Admin-controlled, program-independent industry sessions.
create table if not exists public.global_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title))>=3),
 description text,
 speaker_name text not null,
 speaker_role text,
 speaker_company text,
 starts_at timestamptz not null,
 duration_minutes integer not null default 60 check(duration_minutes between 15 and 480),
 status text not null default 'draft' check(status in ('draft','published','cancelled','completed')),
 recording_url text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists hs_global_events_calendar on public.global_events(status,starts_at);
alter table public.global_events enable row level security;
create policy "global events for enrolled students" on public.global_events
 for select to authenticated using(
   (select app_private.is_admin())
   or (
     status in ('published','completed') and exists(
     select 1 from public.enrollments en
     where en.student_id=auth.uid() and en.status in ('active','completed')
       and not en.is_test)
   )
   or (status in ('published','completed') and exists (
     select 1 from public.program_mentors pm where pm.mentor_id=auth.uid()))
 );
create policy "only admin manages global events" on public.global_events
 for all to authenticated using((select app_private.is_admin()))
 with check((select app_private.is_admin()));
grant select,insert,update,delete on public.global_events to authenticated;

create table if not exists app_private.global_event_links(
 event_id uuid primary key references public.global_events(id) on delete cascade,
 join_url text not null check(join_url ~ '^https://'),
 updated_at timestamptz not null default now()
);
revoke all on app_private.global_event_links from public,anon,authenticated;
create or replace function public.set_global_event_join_url(_event_id uuid,_url text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not app_private.is_admin() then
  raise exception 'Admin access required'; end if;
 if _url !~ '^https://[^ ]+$' or length(_url)>2000
 then raise exception 'A valid HTTPS meeting URL is required'; end if;
 insert into app_private.global_event_links(event_id,join_url) values(_event_id,_url)
 on conflict(event_id) do update set join_url=excluded.join_url, updated_at=now();
 return true;
end $$;
revoke all on function public.set_global_event_join_url(uuid,text) from public,anon;
grant execute on function public.set_global_event_join_url(uuid,text) to authenticated;
create or replace function public.get_global_event_join_url(_event_id uuid)
returns text language plpgsql stable security definer set search_path='' as $$
declare event_row record; v_url text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into event_row from public.global_events where id=_event_id;
 if not found then raise exception 'Event not found'; end if;
 if not app_private.is_admin() then
  if event_row.status<>'published' or not exists(
   select 1 from public.enrollments e where e.student_id=auth.uid()
   and e.status='active' and not e.is_test
  ) then raise exception 'Active enrollment required'; end if;
  if now()<event_row.starts_at-interval '15 minutes' or
    now()>event_row.starts_at + make_interval(mins=>event_row.duration_minutes+15)
  then raise exception 'Join link available near event time'; end if;
 end if;
 select join_url into v_url from app_private.global_event_links where event_id=_event_id;
 return v_url;
end $$;
revoke all on function public.get_global_event_join_url(uuid) from public,anon;
grant execute on function public.get_global_event_join_url(uuid) to authenticated;

-- In-house internship: each team has one major project and one responsible mentor.
create table if not exists public.internship_teams (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 team_number integer not null check(team_number>0),
 mentor_id uuid not null references auth.users(id),
 project_title text,
 project_brief text,
 repository_url text,
 status text not null default 'planning'
  check(status in ('planning','active','submitted','completed')),
 due_date date,
 created_at timestamptz not null default now(),
 unique(program_id,team_number),
 unique(id,program_id),
 foreign key(program_id,mentor_id) references public.program_mentors(program_id,mentor_id)
);
create index if not exists hs_teams_mentor on public.internship_teams(mentor_id,program_id);
create table if not exists public.internship_team_members (
 team_id uuid not null,
 program_id uuid not null,
 student_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(team_id,student_id),
 unique(program_id,student_id),
 foreign key(team_id,program_id) references public.internship_teams(id,program_id) on delete cascade
);
create index if not exists hs_team_members_student on public.internship_team_members(student_id);
create or replace function app_private.is_my_internship_team(_team_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.internship_teams t where t.id=_team_id and t.mentor_id=auth.uid())
 or exists(select 1 from public.internship_team_members m where m.team_id=_team_id and m.student_id=auth.uid())
$$;
revoke all on function app_private.is_my_internship_team(uuid) from public,anon;
grant execute on function app_private.is_my_internship_team(uuid) to authenticated;
alter table public.internship_teams enable row level security;
alter table public.internship_team_members enable row level security;
create policy "teams visible to owner and members" on public.internship_teams
 for select to authenticated using((select app_private.is_admin()) or app_private.is_my_internship_team(id));
create policy "team mentor can update own project" on public.internship_teams
 for update to authenticated using((select app_private.is_admin()) or mentor_id=auth.uid())
 with check((select app_private.is_admin()) or mentor_id=auth.uid());
create policy "only admin creates teams" on public.internship_teams
 for insert to authenticated with check((select app_private.is_admin()));
create policy "team members visible to own team" on public.internship_team_members
 for select to authenticated using((select app_private.is_admin()) or app_private.is_my_internship_team(team_id));
create policy "only admin allocates team members" on public.internship_team_members
 for insert to authenticated with check((select app_private.is_admin()));
grant select,insert,update on public.internship_teams to authenticated;
grant select,insert on public.internship_team_members to authenticated;

create table if not exists public.internship_tasks (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.internship_teams(id) on delete cascade,
 assigned_student_id uuid references auth.users(id),
 title text not null check(length(trim(title))>=3),
 description text,
 status text not null default 'todo'
  check(status in ('todo','in_progress','review','completed')),
 due_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists hs_internship_task_team on public.internship_tasks(team_id,status);
alter table public.internship_tasks enable row level security;
create policy "internship tasks team visibility" on public.internship_tasks
 for select to authenticated using((select app_private.is_admin()) or app_private.is_my_internship_team(team_id));
create policy "team mentor creates tasks" on public.internship_tasks
 for insert to authenticated with check(
 created_by=auth.uid() and ((select app_private.is_admin())
 or exists(select 1 from public.internship_teams t where t.id=team_id and t.mentor_id=auth.uid()))
 and (assigned_student_id is null or exists(
 select 1 from public.internship_team_members m
 where m.team_id=internship_tasks.team_id and m.student_id=internship_tasks.assigned_student_id)));
create policy "team mentor updates tasks" on public.internship_tasks
 for update to authenticated using((select app_private.is_admin()) or exists(
 select 1 from public.internship_teams t where t.id=team_id and t.mentor_id=auth.uid()))
 with check((select app_private.is_admin()) or exists(
 select 1 from public.internship_teams t where t.id=team_id and t.mentor_id=auth.uid()));
grant select,insert,update on public.internship_tasks to authenticated;

-- Idempotent, capacity-aware five-person grouping for when training has ended.
-- Safe to call multiple times. Remaining 1-4 students stay unallocated
-- until the cohort is adjusted, rather than silently making smaller teams.
create or replace function public.generate_internship_teams(_program_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p record; total_students integer; full_teams integer;
 i integer:=0; current_team uuid; selected_mentor uuid; student_row record;
begin
 if auth.uid() is null or not app_private.is_admin() then
  raise exception 'Only Admin can generate teams'; end if;
 perform pg_advisory_xact_lock(hashtext(_program_id::text)::bigint);
 select * into p from public.programs where id=_program_id for update;
 if not found then raise exception 'Program not found'; end if;
 if p.is_test then raise exception 'Test cohorts do not receive real internships'; end if;
 if app_private.program_today(_program_id) < p.start_date + p.training_days
 then raise exception 'Training is not complete yet'; end if;
 if exists(select 1 from public.internship_teams where program_id=_program_id)
 then return jsonb_build_object('already_generated',true,
  'teams',(select count(*) from public.internship_teams where program_id=_program_id)); end if;
 select count(distinct student_id) into total_students from public.enrollments
 where program_id=_program_id and status='active' and not is_test;
 full_teams:=total_students/5;
 if full_teams > coalesce((select sum(max_internship_teams) from public.program_mentors
    where program_id=_program_id and can_supervise_internship),0)
 then raise exception 'Not enough internship mentor capacity'; end if;
 for student_row in
   select e.student_id from public.enrollments e
   where e.program_id=_program_id and e.status='active' and not e.is_test
   order by e.approved_at,e.student_id
   limit full_teams*5
 loop
   if mod(i,5)=0 then
     select pm.mentor_id into selected_mentor from public.program_mentors pm
     where pm.program_id=_program_id and pm.can_supervise_internship
       and (select count(*) from public.internship_teams t
         where t.program_id=_program_id and t.mentor_id=pm.mentor_id)<pm.max_internship_teams
     order by (select count(*) from public.internship_teams t
       where t.program_id=_program_id and t.mentor_id=pm.mentor_id),pm.mentor_id limit 1;
     if selected_mentor is null then raise exception 'No mentor capacity'; end if;
     insert into public.internship_teams(program_id,team_number,mentor_id)
     values(_program_id,i/5+1,selected_mentor) returning id into current_team;
   end if;
   insert into public.internship_team_members(team_id,program_id,student_id)
   values(current_team,_program_id,student_row.student_id);
   i:=i+1;
 end loop;
 return jsonb_build_object('teams_created',full_teams,
  'students_allocated',full_teams*5,'students_waiting',total_students-full_teams*5);
end $$;
revoke all on function public.generate_internship_teams(uuid) from public,anon;
grant execute on function public.generate_internship_teams(uuid) to authenticated;
