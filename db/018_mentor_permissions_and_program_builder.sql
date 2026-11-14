-- HackSphere v2: permissions, unified mentor invite and program creation.
-- Additive; existing records and legacy role values are preserved.
alter table public.staff_roles drop constraint if exists staff_roles_role_check;
alter table public.staff_roles add constraint staff_roles_role_check
 check(role in ('admin','mentor','trainer','guide'));
alter table public.staff_invitations drop constraint if exists staff_invitations_role_check;
alter table public.staff_invitations add constraint staff_invitations_role_check
 check(role in ('mentor','trainer','guide'));

create or replace function app_private.validate_program_mentor()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(
  select 1 from public.staff_roles r where r.user_id=new.mentor_id
  and r.role in ('mentor','trainer','guide','admin')
 ) then raise exception 'An invited, authorized mentor account is required'; end if;
 return new;
end $$;
drop trigger if exists hs_v2_validate_program_mentor on public.program_mentors;
create trigger hs_v2_validate_program_mentor
 before insert or update of mentor_id on public.program_mentors
 for each row execute function app_private.validate_program_mentor();

-- Admin-owned batch creation, independent of number of teaching mentors.
create or replace function public.create_program_v2(
 _title text,_description text,_start_date date,
 _training_days integer,_internship_days integer,_fee_inr integer,
 _mode text default 'Hybrid',_timezone text default 'Asia/Kolkata',
 _batch_name text default null,_enrollment_capacity integer default null,
 _course_catalog_id uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null or not app_private.is_admin() then
   raise exception 'Administrator required'; end if;
 if length(trim(coalesce(_title,'')))<3 or length(_title)>180
 then raise exception 'Program title must contain 3–180 characters'; end if;
 if _training_days not between 1 and 3650 or _internship_days not between 1 and 3650
 then raise exception 'Valid training and internship duration required'; end if;
 if _fee_inr is null or _fee_inr<0 then raise exception 'Invalid fee'; end if;
 if _mode not in ('Hybrid','Live','Recorded') then raise exception 'Invalid learning mode'; end if;
 if _start_date is null or _start_date < current_date-interval '730 days' then
 raise exception 'Invalid start date'; end if;
 if _enrollment_capacity is not null and _enrollment_capacity<=0
 then raise exception 'Enrollment capacity must be positive'; end if;
 if _timezone is null or length(_timezone)>80
 then raise exception 'Valid timezone required'; end if;
 insert into public.programs(title,description,start_date,training_days,internship_days,
 fee_inr,mode,status,timezone,created_by,batch_name,enrollment_capacity,course_catalog_id)
 values(trim(_title),nullif(trim(_description),''),_start_date,_training_days,_internship_days,
 _fee_inr,_mode,'draft',_timezone,auth.uid(),_batch_name,
 _enrollment_capacity,_course_catalog_id)
 returning id into new_id;
 return new_id;
end $$;
revoke all on function public.create_program_v2(
 text,text,date,integer,integer,integer,text,text,text,integer,uuid
) from public,anon;
grant execute on function public.create_program_v2(
 text,text,date,integer,integer,integer,text,text,text,integer,uuid
) to authenticated;

create policy "mentors see enrolled students" on public.enrollments
 for select to authenticated using (app_private.is_program_mentor(program_id));

create policy "program mentors see enrolled student profiles" on public.profiles
 for select to authenticated using(exists(
 select 1 from public.enrollments e where e.student_id=profiles.id
 and app_private.is_program_mentor(e.program_id)));

create policy "program mentors see assessment records" on public.evaluations
 for select to authenticated using(app_private.is_program_mentor(program_id));
create policy "program mentors see training submissions" on public.submissions
 for select to authenticated using(exists(select 1 from public.timeline_events e
 where e.id=event_id and app_private.is_program_mentor(e.program_id)));
create policy "program mentors see quiz attempts" on public.quiz_attempts
 for select to authenticated using(exists(select 1 from public.quizzes q
 join public.timeline_events e on e.id=q.timeline_event_id
 where q.id=quiz_id and app_private.is_program_mentor(e.program_id)));
create policy "mentors see certificate recommendations" on public.completion_recommendations
 for select to authenticated using(app_private.is_program_mentor(program_id));

-- In-house team ownership replaces per-student guide assignment where present.
create or replace function app_private.is_student_guide(p_id uuid,student uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guide_allocations a
 where a.guide_user_id=auth.uid() and a.program_id=p_id and a.student_id=student)
 or exists(select 1 from public.internship_teams t
 join public.internship_team_members tm on tm.team_id=t.id
 where t.program_id=p_id and tm.student_id=student and t.mentor_id=auth.uid())
$$;

-- Published resources and recordings are read-only to all program mentors.
create or replace function app_private.may_view_video(video_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.videos v
 join public.timeline_events ev on ev.id=v.lesson_event_id and ev.program_id=v.course_id
 where v.id=video_id and v.status='ready'
 and (
 app_private.is_admin()
 or app_private.is_program_mentor(v.course_id)
 or (ev.phase='training' and app_private.is_program_trainer(v.course_id))
 or (ev.phase='internship' and app_private.is_program_guide(v.course_id))
 or (v.published and ev.published_to_students
 and ev.scheduled_date<=app_private.program_today(v.course_id)
 and exists(select 1 from public.enrollments en where en.program_id=v.course_id
  and en.student_id=auth.uid() and en.status in ('active','completed'))
 and exists(select 1 from public.purchases pu where pu.course_id=v.course_id
  and pu.student_id=auth.uid() and pu.status='active'))
 )
) $$;
create or replace function app_private.may_read_course_file(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid;eid uuid;
begin
 if auth.uid() is null or path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
 then return false; end if;
 pid:=split_part(path,'/',1)::uuid;
 eid:=split_part(path,'/',2)::uuid;
 if not exists(select 1 from public.timeline_events ev
 where ev.id=eid and ev.program_id=pid) then return false; end if;
 if app_private.is_admin() or app_private.is_program_mentor(pid)
 or app_private.is_program_trainer(pid) or app_private.is_program_guide(pid)
 then return true; end if;
 if not app_private.is_student_enrolled(pid) then return false; end if;
 return exists(select 1 from public.timeline_events ev
 where ev.id=eid and ev.program_id=pid and ev.published_to_students
 and ev.scheduled_date<=app_private.program_today(pid)
 and (
   exists(select 1 from public.lesson_resources res
   where res.event_id=ev.id and res.storage_path=path and res.published)
   or ev.resource_url='storage://hacksphere-course-files/'||path));
exception when others then return false;
end $$;

-- Program mentors may join class sessions; only the scheduled host may
-- register a fresh Google Meet link (Admin can override).
create or replace function public.register_meet_space(_session_id uuid,_meet_uri text,
 _space_name text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare ses record;evt record;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into ses from public.live_sessions where id=_session_id for update;
 if not found or ses.status<>'scheduled' then raise exception 'Scheduled session not found';end if;
 select * into evt from public.timeline_events where id=ses.timeline_event_id;
 if not app_private.is_admin() and not(
    app_private.is_program_mentor(ses.program_id)
    and ses.trainer_user_id=auth.uid()
    and evt.responsible_mentor_id=auth.uid()
 ) then raise exception 'Only the scheduled teaching mentor can create Meet';end if;
 if _meet_uri !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}([?][a-zA-Z0-9&=._-]+)?$'
 then raise exception 'Unexpected Google Meet link'; end if;
 if _space_name is not null and _space_name !~ '^spaces/[a-zA-Z0-9_-]+$'
 then raise exception 'Invalid Meet space identifier';end if;
 insert into app_private.meeting_links(session_id,meet_uri,created_by)
 values(_session_id,_meet_uri,auth.uid())
 on conflict(session_id) do update set meet_uri=excluded.meet_uri,
 created_by=excluded.created_by,created_at=now();
 update public.live_sessions set meet_status='ready',meet_error=null,
 provider_space_name=_space_name
 where id=_session_id;
 return true;
end $$;
revoke all on function public.register_meet_space(uuid,text,text) from public,anon;
grant execute on function public.register_meet_space(uuid,text,text) to authenticated;

create or replace function public.get_my_session_join_uri(_session_id uuid)
returns text language plpgsql stable security definer set search_path='' as $$
declare ses record;scheduled_at timestamptz;v_url text;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select ls.*,pr.timezone into ses from public.live_sessions ls
 join public.programs pr on pr.id=ls.program_id where ls.id=_session_id;
 if not found or ses.status<>'scheduled' or ses.meet_status<>'ready'
 then raise exception 'Meeting unavailable'; end if;
 if not (app_private.is_admin() or app_private.is_program_mentor(ses.program_id)
 or app_private.is_program_trainer(ses.program_id)
 or app_private.is_program_guide(ses.program_id)) then
  if not app_private.is_student_enrolled(ses.program_id)
  then raise exception 'Enrollment required';end if;
  scheduled_at:=((ses.session_date::text||' '||ses.start_time::text)::timestamp
  at time zone ses.timezone);
  if now()<scheduled_at-interval '15 minutes' or
     now()>scheduled_at+make_interval(mins=>ses.duration_minutes+15)
  then raise exception 'Join is only available near class time';end if;
 end if;
 select meet_uri into v_url from app_private.meeting_links
 where session_id=_session_id;
 if v_url is null then raise exception 'Meet link is pending';end if;
 return v_url;
end $$;
revoke all on function public.get_my_session_join_uri(uuid) from public,anon;
grant execute on function public.get_my_session_join_uri(uuid) to authenticated;

-- Admin can correct team membership without deleting the rest of a cohort.
create policy "admin reassigns team members" on public.internship_team_members
 for update to authenticated using((select app_private.is_admin()))
 with check((select app_private.is_admin()));
create policy "admin removes team members" on public.internship_team_members
 for delete to authenticated using((select app_private.is_admin()));
grant update,delete on public.internship_team_members to authenticated;
