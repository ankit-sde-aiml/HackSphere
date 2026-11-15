-- HackSphere 020: transactional admin schedule API, and in-app notification foundation.
-- No QA data or unrelated resources are deleted.

create or replace function public.create_scheduled_lesson_v2(
 _program_id uuid,_title text,_description text,_scheduled_date date,
 _activity_type text,_responsible_mentor_id uuid,
 _start_time time default null,_duration_minutes integer default 60,
 _published boolean default false
) returns uuid language plpgsql security definer set search_path='' as $$
declare pr record; event_id uuid; phase_name text;
begin
 if auth.uid() is null or not app_private.is_admin() then raise exception 'Admin only';end if;
 select * into pr from public.programs where id=_program_id for update;
 if not found then raise exception 'Program not found';end if;
 if _scheduled_date<pr.start_date or _scheduled_date>=pr.start_date+pr.training_days+pr.internship_days
 then raise exception 'Scheduled date is outside program';end if;
 if _activity_type not in ('lecture','project','assignment','quiz','milestone','resource')
 then raise exception 'Invalid class or activity type';end if;
 if length(trim(coalesce(_title,'')))<3 or length(_title)>160
 then raise exception 'Activity title must be between 3 and 160 characters';end if;
 if not exists(select 1 from public.program_mentors pm where pm.program_id=_program_id
 and pm.mentor_id=_responsible_mentor_id)
 then raise exception 'Mentor is not assigned to the program';end if;
 if _activity_type='lecture' and (_start_time is null or _duration_minutes not between 5 and 480)
 then raise exception 'Live lectures need a time and valid duration';end if;
 phase_name:=case when _scheduled_date<pr.start_date+pr.training_days then 'training' else 'internship' end;
 insert into public.timeline_events(program_id,title,description,scheduled_date,phase,activity_type,
  responsible_mentor_id,created_by,published_to_students)
 values(_program_id,trim(_title),nullif(trim(coalesce(_description,'')),''),
  _scheduled_date,phase_name,_activity_type,_responsible_mentor_id,auth.uid(),_published)
 returning id into event_id;
 if _activity_type='lecture' then
  insert into public.live_sessions(program_id,timeline_event_id,title,session_date,start_time,
    duration_minutes,status,trainer_user_id,meet_status)
  values(_program_id,event_id,trim(_title),_scheduled_date,_start_time,
    _duration_minutes,'scheduled',_responsible_mentor_id,'pending_authorization');
 end if;
 return event_id;
end $$;
revoke all on function public.create_scheduled_lesson_v2(
 uuid,text,text,date,text,uuid,time,integer,boolean) from public,anon;
grant execute on function public.create_scheduled_lesson_v2(
 uuid,text,text,date,text,uuid,time,integer,boolean) to authenticated;

create or replace function public.update_scheduled_lesson_v2(
 _event_id uuid,_title text,_scheduled_date date,_responsible_mentor_id uuid,
 _start_time time default null,_duration_minutes integer default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare ev record;pr record; changed boolean; ses record;
begin
 if auth.uid() is null or not app_private.is_admin() then raise exception 'Admin only';end if;
 select * into ev from public.timeline_events where id=_event_id for update;
 if not found then raise exception 'Scheduled activity not found';end if;
 select * into pr from public.programs where id=ev.program_id for update;
 if _scheduled_date<pr.start_date or _scheduled_date>=pr.start_date+pr.training_days+pr.internship_days
 then raise exception 'Date is outside program';end if;
 if length(trim(coalesce(_title,'')))<3 or length(_title)>160 then
 raise exception 'Topic name must be 3–160 characters';end if;
 if not exists(select 1 from public.program_mentors pm where pm.program_id=ev.program_id
 and pm.mentor_id=_responsible_mentor_id)
 then raise exception 'Mentor is not a program member';end if;
 select * into ses from public.live_sessions where timeline_event_id=_event_id
 and status<>'cancelled' limit 1 for update;
 if found and (_start_time is null or _duration_minutes not between 5 and 480)
 then raise exception 'Live lecture requires start time and valid duration';end if;
 changed:=ev.responsible_mentor_id is distinct from _responsible_mentor_id
 or ev.scheduled_date is distinct from _scheduled_date;
 update public.timeline_events
 set title=trim(_title),scheduled_date=_scheduled_date,
 phase=case when _scheduled_date<pr.start_date+pr.training_days then 'training' else 'internship' end,
 responsible_mentor_id=_responsible_mentor_id
 where id=_event_id;
 if ses.id is not null then
  changed:=changed or ses.start_time is distinct from _start_time
    or ses.duration_minutes is distinct from _duration_minutes;
  update public.live_sessions
  set title=trim(_title),session_date=_scheduled_date,start_time=_start_time,
    duration_minutes=_duration_minutes,trainer_user_id=_responsible_mentor_id,
    meet_status=case when changed then 'pending_authorization' else meet_status end
  where id=ses.id;
  if changed then delete from app_private.meeting_links where session_id=ses.id;end if;
 end if;
 return true;
end $$;
revoke all on function public.update_scheduled_lesson_v2(uuid,text,date,uuid,time,integer)
 from public,anon;
grant execute on function public.update_scheduled_lesson_v2(uuid,text,date,uuid,time,integer)
 to authenticated;

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in (
  'global_event','learning','internship','payment','certificate','system')),
 title text not null check(length(title) between 1 and 200),
 body text not null default '',
 href text check(href is null or (href like '/%' and href not like '//%')),
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists hs_notifications_inbox on public.notifications(recipient_id,created_at desc);
alter table public.notifications enable row level security;
create policy "my notifications only" on public.notifications for select to authenticated
 using(recipient_id=auth.uid());
create policy "mark own notification read" on public.notifications for update to authenticated
 using(recipient_id=auth.uid())
 with check(recipient_id=auth.uid());
grant select,update on public.notifications to authenticated;
revoke insert,delete on public.notifications from anon,authenticated;

-- Initial in-app fanout for real students on global session publication.
-- QA enrollments cannot receive public-session notifications.
create or replace function app_private.notify_on_global_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='published'
 and (tg_op='INSERT' or old.status is distinct from 'published') then
  insert into public.notifications(recipient_id,category,title,body,href)
  select distinct e.student_id,'global_event',
  'New Industry Connect session',new.title,'/workspace/student/global-events'
  from public.enrollments e
  where e.status='active' and not e.is_test;
 end if;
 return new;
end $$;
drop trigger if exists hs_notify_global_events on public.global_events;
create trigger hs_notify_global_events after insert or update of status on public.global_events
for each row execute function app_private.notify_on_global_event();

-- Harden in-app status: no recipient/category/title edits by a user with UPDATE grant.
create or replace function app_private.guard_notification_update()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.recipient_id is distinct from old.recipient_id
 or new.category is distinct from old.category
 or new.title is distinct from old.title
 or new.body is distinct from old.body
 or new.href is distinct from old.href
 or new.created_at is distinct from old.created_at
 then raise exception 'Only read status can be updated';end if;
 return new;
end $$;
drop trigger if exists hs_notification_read_only on public.notifications;
create trigger hs_notification_read_only before update on public.notifications
for each row execute function app_private.guard_notification_update();
