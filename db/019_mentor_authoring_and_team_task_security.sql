-- HackSphere v2: enforce schedule ownership for course files, academic
-- authoring and class sessions, plus student-safe team task progress.

create or replace function app_private.may_upload_course_file(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid;eid uuid;
begin
 if auth.uid() is null or path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
 then return false;end if;
 pid:=split_part(path,'/',1)::uuid;
 eid:=split_part(path,'/',2)::uuid;
 if not exists(select 1 from public.timeline_events ev
 where ev.id=eid and ev.program_id=pid) then return false;end if;
 return app_private.can_manage_lesson(eid,auth.uid());
exception when others then return false;
end $$;

drop policy if exists "staff create timeline" on public.timeline_events;
create policy "admin creates published program schedule" on public.timeline_events
for insert to authenticated with check((select app_private.is_admin()));
drop policy if exists "staff edit timeline" on public.timeline_events;
create policy "admin updates program schedule" on public.timeline_events
for update to authenticated using((select app_private.is_admin()))
with check((select app_private.is_admin()));

drop policy if exists "staff schedule session" on public.live_sessions;
create policy "admin schedules live classes" on public.live_sessions
for insert to authenticated with check((select app_private.is_admin()));
drop policy if exists "staff edit session" on public.live_sessions;
create policy "admin reschedules live classes" on public.live_sessions
for update to authenticated using((select app_private.is_admin()))
with check((select app_private.is_admin()));

-- Prevent changing a session's teacher without updating the source schedule.
create or replace function app_private.validate_live_session_owner()
returns trigger language plpgsql set search_path='' as $$
declare ev record;
begin
 if new.timeline_event_id is not null then
  select program_id,responsible_mentor_id,scheduled_date into ev
  from public.timeline_events where id=new.timeline_event_id;
  if not found or ev.program_id<>new.program_id then
   raise exception 'Live session does not match the scheduled program'; end if;
  if new.trainer_user_id is distinct from ev.responsible_mentor_id
   and ev.responsible_mentor_id is not null then
   raise exception 'Live session teacher must match the scheduled mentor';end if;
  if new.session_date<>ev.scheduled_date then
   raise exception 'Live class date must match the source schedule';end if;
 end if;
 return new;
end $$;
drop trigger if exists hs_v2_validate_live_session_owner on public.live_sessions;
create trigger hs_v2_validate_live_session_owner before insert or update of
 program_id,timeline_event_id,trainer_user_id,session_date on public.live_sessions
 for each row execute function app_private.validate_live_session_owner();

-- A team member can request task review, not self-certify completion.
create or replace function public.update_my_internship_task(
 _task_id uuid,_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare t record;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if _status not in ('in_progress','review')
 then raise exception 'Students can only start work or submit it for review';end if;
 select * into t from public.internship_tasks where id=_task_id for update;
 if not found or t.status='completed' then raise exception 'Task unavailable';end if;
 if not exists(select 1 from public.internship_team_members tm
 where tm.team_id=t.team_id and tm.student_id=auth.uid()) then
 raise exception 'Only team members can report progress';end if;
 if t.assigned_student_id is not null and t.assigned_student_id<>auth.uid()
 then raise exception 'Task assigned to another team member';end if;
 update public.internship_tasks set status=_status where id=_task_id;
 return true;
end $$;
revoke all on function public.update_my_internship_task(uuid,text) from public,anon;
grant execute on function public.update_my_internship_task(uuid,text) to authenticated;

-- Team mentor may evaluate enrolled team members; mentor-led training
-- reviewers belong to that program, with a traceable evaluator_id.
drop policy if exists "assigned evaluator scores" on public.evaluations;
create policy "v2 mentor scores enrolled students" on public.evaluations
 for insert to authenticated with check(
 evaluator_id=auth.uid() and (
 (select app_private.is_admin())
 or (phase='training' and app_private.is_program_mentor(program_id))
 or (phase='internship' and app_private.is_student_guide(program_id,student_id))
 ));
drop policy if exists "evaluator corrections" on public.evaluations;
create policy "v2 evaluator corrections" on public.evaluations
 for update to authenticated using(
 (select app_private.is_admin())
 or (evaluator_id=auth.uid()
 and ((phase='training' and app_private.is_program_mentor(program_id))
 or (phase='internship' and app_private.is_student_guide(program_id,student_id)))))
 with check(
 (select app_private.is_admin())
 or (evaluator_id=auth.uid()
 and ((phase='training' and app_private.is_program_mentor(program_id))
 or (phase='internship' and app_private.is_student_guide(program_id,student_id)))));

drop policy if exists "authorized staff review submission" on public.submissions;
create policy "owner mentor reviews own activity submissions" on public.submissions
 for update to authenticated
 using((select app_private.is_admin()) or app_private.can_manage_lesson(event_id,auth.uid()))
 with check((select app_private.is_admin()) or app_private.can_manage_lesson(event_id,auth.uid()));
