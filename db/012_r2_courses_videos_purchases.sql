-- HackSphere private R2 course video + purchase access model, 2026-11-14.
-- Program remains the existing source of truth; courses.id == programs.id.
-- No media BLOBs, Supabase Storage MP4, or payment credentials are stored in Postgres.

create table if not exists public.courses(
 id uuid primary key references public.programs(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.courses enable row level security;
grant select on public.courses to authenticated,anon;
create or replace function app_private.ensure_program_course()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.courses(id) values(new.id) on conflict do nothing;
 return new;
end $$;
drop trigger if exists hacksphere_course_sync on public.programs;
create trigger hacksphere_course_sync after insert on public.programs
for each row execute function app_private.ensure_program_course();
insert into public.courses(id) select id from public.programs on conflict do nothing;

create table if not exists public.purchases(
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'active'
  check(status in ('active','pending','refunded','revoked')),
 source text not null
  check(source in ('verified_upi','qa_test','admin_scholarship','razorpay')),
 is_test boolean not null default false,
 approved_by uuid references auth.users(id),
 purchased_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(course_id,student_id)
);
create index if not exists hs_purchases_student_status on public.purchases(student_id,status,course_id);
alter table public.purchases enable row level security;
revoke all on public.purchases from anon,authenticated;
grant select,insert,update,delete on public.purchases to authenticated;
create policy "student owns purchase records" on public.purchases
 for select to authenticated using(student_id=(select auth.uid()) or (select app_private.is_admin()));
create policy "admin only inserts purchase" on public.purchases
 for insert to authenticated with check((select app_private.is_admin()) and approved_by=(select auth.uid()));
create policy "admin only updates purchase" on public.purchases
 for update to authenticated using((select app_private.is_admin()))
 with check((select app_private.is_admin()));
create policy "admin only removes purchase" on public.purchases
 for delete to authenticated using((select app_private.is_admin()));

-- Enrollment is issued ONLY by existing Admin verification flow or explicit QA grant.
-- A submitted UTR alone never creates a purchase.
create or replace function app_private.sync_enrollment_purchase()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('active','completed') and (new.is_test or new.approved_by is not null) then
   insert into public.courses(id) values(new.program_id) on conflict do nothing;
   insert into public.purchases(course_id,student_id,status,source,is_test,approved_by)
   values(new.program_id,new.student_id,'active',
     case when new.is_test then 'qa_test'
     when new.enrollment_source='admin_scholarship' then 'admin_scholarship'
     else 'verified_upi' end,
     new.is_test,new.approved_by)
   on conflict(course_id,student_id) do update set
    status=case when public.purchases.status='refunded' then 'refunded' else 'active' end,
    updated_at=now(),source=excluded.source,is_test=excluded.is_test,
    approved_by=excluded.approved_by;
 elsif new.status='suspended' then
   update public.purchases set status='revoked',updated_at=now()
   where course_id=new.program_id and student_id=new.student_id and status<>'refunded';
 end if;
 return new;
end $$;
drop trigger if exists hacksphere_purchase_from_enrollment on public.enrollments;
create trigger hacksphere_purchase_from_enrollment
after insert or update of status,approved_by,is_test on public.enrollments
for each row execute function app_private.sync_enrollment_purchase();
insert into public.purchases(course_id,student_id,status,source,is_test,approved_by,purchased_at)
select e.program_id,e.student_id,
 case when e.status='suspended' then 'revoked' else 'active' end,
 case when e.is_test then 'qa_test'
      when e.enrollment_source='admin_scholarship' then 'admin_scholarship'
      else 'verified_upi' end,
 e.is_test,e.approved_by,e.approved_at
from public.enrollments e
where (e.is_test or e.approved_by is not null)
on conflict(course_id,student_id) do nothing;

create policy "course public or member access" on public.courses for select to authenticated
using(exists(select 1 from public.programs pr where pr.id=courses.id and (
  (pr.status in ('published','ongoing','completed') and not pr.is_test)
  or (select app_private.is_admin())
  or (select app_private.is_program_trainer(pr.id))
  or (select app_private.is_program_guide(pr.id))
  or exists(select 1 from public.enrollments e where e.program_id=pr.id
    and e.student_id=(select auth.uid()) and e.status in ('active','completed'))
)));
create policy "public listed courses" on public.courses for select to anon
using(exists(select 1 from public.programs pr where pr.id=courses.id
 and pr.status in ('published','ongoing','completed') and not pr.is_test));

create table if not exists public.videos(
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 lesson_event_id uuid not null references public.timeline_events(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id),
 title text not null check(length(trim(title)) between 3 and 180),
 object_key text not null unique check(length(object_key) between 35 and 256),
 mime_type text not null default 'video/mp4' check(mime_type='video/mp4'),
 size_bytes bigint not null check(size_bytes between 1 and 99614720),
 status text not null default 'uploading' check(status in ('uploading','ready','failed')),
 published boolean not null default true,
 created_at timestamptz not null default now(),
 ready_at timestamptz
);
create index if not exists hs_videos_course_lesson on public.videos(course_id,lesson_event_id,status);
alter table public.videos enable row level security;
revoke all on public.videos from anon,authenticated;
grant select on public.videos to authenticated;

-- A trainer / guide may upload only for their assigned phase. If an actual live
-- class is attached, only the scheduled host who has finished that class may upload.
create or replace function app_private.may_upload_lesson_video(event_id uuid,staff_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.timeline_events ev
 join public.programs pr on pr.id=ev.program_id
 where ev.id=event_id
 and (
 (ev.phase='training' and exists(select 1 from public.program_staff ps
    join public.staff_roles sr on sr.user_id=ps.user_id and sr.role='trainer'
    where ps.program_id=ev.program_id and ps.user_id=staff_id and ps.role='trainer'))
 or (ev.phase='internship' and exists(select 1 from public.program_guides pg
    join public.staff_roles sr on sr.user_id=pg.user_id and sr.role='guide'
    where pg.program_id=ev.program_id and pg.user_id=staff_id))
 )
 and (
 not exists(select 1 from public.live_sessions ls
    where ls.timeline_event_id=ev.id and ls.status<>'cancelled')
 or exists(select 1 from public.live_sessions ls
    where ls.timeline_event_id=ev.id and ls.status<>'cancelled'
    and ls.trainer_user_id=staff_id
    and now() >= ((ls.session_date+ls.start_time) at time zone pr.timezone)
       +make_interval(mins=>ls.duration_minutes))
 )
) $$;

create or replace function public.prepare_video_upload(
 _event_id uuid,_title text,_size_bytes bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ev record;v_id uuid:=gen_random_uuid();v_key text;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Google Sign-In required';end if;
 if _size_bytes is null or _size_bytes<1 or _size_bytes>99614720 then
    raise exception 'MP4 size must be 1 byte to 95 MiB';end if;
 if length(trim(coalesce(_title,'')))<3 or length(_title)>180 then
    raise exception 'Recording title length must be 3–180';end if;
 select ev.program_id into v_ev from public.timeline_events ev where ev.id=_event_id;
 if not found then raise exception 'Class not found';end if;
 if not app_private.may_upload_lesson_video(_event_id,v_uid) then
    raise exception 'Only the designated Trainer/Guide who took this class can upload';end if;
 v_key:=v_ev.program_id::text||'/'||_event_id::text||'/'||v_id::text||'.mp4';
 insert into public.videos(id,course_id,lesson_event_id,uploaded_by,title,object_key,size_bytes,mime_type)
 values(v_id,v_ev.program_id,_event_id,v_uid,trim(_title),v_key,_size_bytes,'video/mp4');
 return jsonb_build_object('id',v_id,'object_key',v_key,'max_size_bytes',99614720);
end $$;

create or replace function public.authorize_video_upload(_video_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v record;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Login required';end if;
 select * into v from public.videos where id=_video_id and uploaded_by=v_uid and status='uploading';
 if not found or not app_private.may_upload_lesson_video(v.lesson_event_id,v_uid)
 or now()>v.created_at+interval '24 hours' then
   raise exception 'Recording upload not allowed';end if;
 return jsonb_build_object('id',v.id,'object_key',v.object_key,
   'size_bytes',v.size_bytes,'mime_type',v.mime_type);
end $$;

create or replace function public.finish_video_upload(_video_id uuid,_size_bytes bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare v record;
begin
 if auth.uid() is null then raise exception 'Login required';end if;
 select * into v from public.videos where id=_video_id and status='uploading'
   and uploaded_by=auth.uid() for update;
 if not found or v.size_bytes<>_size_bytes
 or not app_private.may_upload_lesson_video(v.lesson_event_id,auth.uid()) then
   raise exception 'Recording completion not allowed';end if;
 update public.videos set status='ready',ready_at=now() where id=_video_id;
 return true;
end $$;

create or replace function app_private.may_view_video(video_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.videos v
 join public.timeline_events ev on ev.id=v.lesson_event_id and ev.program_id=v.course_id
 where v.id=video_id and v.status='ready'
 and (
   (select app_private.is_admin())
   or (ev.phase='training' and (select app_private.is_program_trainer(v.course_id)))
   or (ev.phase='internship' and (select app_private.is_program_guide(v.course_id)))
   or (
     v.published
     and ev.scheduled_date<=app_private.program_today(v.course_id)
     and exists(select 1 from public.enrollments e
       where e.program_id=v.course_id and e.student_id=(select auth.uid())
       and e.status in ('active','completed'))
     and exists(select 1 from public.purchases pu
       where pu.course_id=v.course_id and pu.student_id=(select auth.uid())
       and pu.status='active')
   )
 )
 ) $$;
create policy "approved purchase and calendar video visibility" on public.videos
 for select to authenticated
 using((select app_private.may_view_video(id)));

create or replace function public.authorize_video_stream(_video_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v record;
begin
 if auth.uid() is null or not app_private.may_view_video(_video_id)
 then raise exception 'Video unavailable or purchase not active'; end if;
 select object_key,size_bytes,mime_type,id into v from public.videos where id=_video_id and status='ready';
 if not found then raise exception 'Recording not ready';end if;
 return jsonb_build_object('id',v.id,'object_key',v.object_key,
   'size_bytes',v.size_bytes,'mime_type',v.mime_type);
end $$;

create or replace function public.set_video_published(_video_id uuid,_published boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v record;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into v from public.videos where id=_video_id for update;
 if not found or v.uploaded_by<>auth.uid()
 or not app_private.may_upload_lesson_video(v.lesson_event_id,auth.uid()) then
 raise exception 'Only the class host can publish or hide the recording';end if;
 if v.status<>'ready' then raise exception 'Video upload not complete';end if;
 update public.videos set published=_published where id=_video_id;
 return true;
end $$;

revoke all on function public.prepare_video_upload(uuid,text,bigint) from public,anon;
revoke all on function public.authorize_video_upload(uuid) from public,anon;
revoke all on function public.finish_video_upload(uuid,bigint) from public,anon;
revoke all on function public.authorize_video_stream(uuid) from public,anon;
revoke all on function public.set_video_published(uuid,boolean) from public,anon;
grant execute on function public.prepare_video_upload(uuid,text,bigint) to authenticated;
grant execute on function public.authorize_video_upload(uuid) to authenticated;
grant execute on function public.finish_video_upload(uuid,bigint) to authenticated;
grant execute on function public.authorize_video_stream(uuid) to authenticated;
grant execute on function public.set_video_published(uuid,boolean) to authenticated;
