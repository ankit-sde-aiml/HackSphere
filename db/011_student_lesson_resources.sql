-- HackSphere — Student Classroom resource model (2026-11-14).
-- Private upload paths: <program_uuid>/<timeline_event_uuid>/<file_name>.
-- Run after core LMS migrations. Read access is tied to enrollment + schedule + published state.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('hacksphere-course-files','hacksphere-course-files',false,52428800,
 array['video/mp4','video/webm','application/pdf','image/png','image/jpeg'])
on conflict(id) do nothing;

create table if not exists public.lesson_resources (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.timeline_events(id) on delete cascade,
 kind text not null check(kind in ('video','notes','file','link')),
 title text not null check(length(trim(title)) between 2 and 180),
 storage_path text,
 external_url text,
 note_text text,
 published boolean not null default true,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 constraint lesson_resource_has_content check (
 (storage_path is not null and external_url is null)
 or (external_url is not null and storage_path is null)
 or (kind='notes' and note_text is not null and storage_path is null and external_url is null)),
 constraint lesson_resource_storage_scope check (
 storage_path is null or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'),
 constraint lesson_resource_https_only check (external_url is null or external_url ~ '^https://[^ ]+$')
);
create index if not exists ix_hacksphere_resources_event on public.lesson_resources(event_id,created_at);
alter table public.lesson_resources enable row level security;
grant select,insert,update,delete on public.lesson_resources to authenticated;

drop policy if exists "student released or assigned staff lesson resources" on public.lesson_resources;
create policy "student released or assigned staff lesson resources" on public.lesson_resources
for select to authenticated
using(exists(select 1 from public.timeline_events e where e.id=lesson_resources.event_id
 and ((select app_private.is_admin())
 or (e.phase='training' and (select app_private.is_program_trainer(e.program_id)))
 or (e.phase='internship' and (select app_private.is_program_guide(e.program_id)))
 or (lesson_resources.published and e.scheduled_date<=app_private.program_today(e.program_id)
     and (select app_private.is_student_enrolled(e.program_id))))));

drop policy if exists "assigned staff publishes lesson resources" on public.lesson_resources;
create policy "assigned staff publishes lesson resources" on public.lesson_resources
for insert to authenticated
with check(created_by=(select auth.uid()) and exists(
 select 1 from public.timeline_events e where e.id=lesson_resources.event_id
 and ((select app_private.is_admin())
 or (e.phase='training' and (select app_private.is_program_trainer(e.program_id)))
 or (e.phase='internship' and (select app_private.is_program_guide(e.program_id))))
 and (lesson_resources.storage_path is null or (
 split_part(lesson_resources.storage_path,'/',1)=e.program_id::text
 and split_part(lesson_resources.storage_path,'/',2)=e.id::text))));

drop policy if exists "assigned staff edits lesson resources" on public.lesson_resources;
create policy "assigned staff edits lesson resources" on public.lesson_resources
for update to authenticated
using(exists(select 1 from public.timeline_events e where e.id=lesson_resources.event_id
 and ((select app_private.is_admin())
 or (e.phase='training' and (select app_private.is_program_trainer(e.program_id)))
 or (e.phase='internship' and (select app_private.is_program_guide(e.program_id))))))
with check(exists(select 1 from public.timeline_events e where e.id=lesson_resources.event_id
 and ((select app_private.is_admin())
 or (e.phase='training' and (select app_private.is_program_trainer(e.program_id)))
 or (e.phase='internship' and (select app_private.is_program_guide(e.program_id))))
 and (lesson_resources.storage_path is null or (
 split_part(lesson_resources.storage_path,'/',1)=e.program_id::text
 and split_part(lesson_resources.storage_path,'/',2)=e.id::text))));

-- Metadata's published flag gates downloads as well as API visibility;
-- a previously known storage path must not bypass unpublishing.
create or replace function app_private.may_read_course_file(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare
 v_program uuid;v_event uuid;
begin
 if auth.uid() is null or path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' then return false; end if;
 v_program:=split_part(path,'/',1)::uuid;
 v_event:=split_part(path,'/',2)::uuid;
 if not exists(select 1 from public.timeline_events e where e.id=v_event and e.program_id=v_program) then return false; end if;
 if app_private.is_admin() or app_private.is_program_trainer(v_program) or app_private.is_program_guide(v_program) then return true; end if;
 if not app_private.is_student_enrolled(v_program) then return false; end if;
 return exists(
   select 1 from public.timeline_events e
   where e.id=v_event and e.program_id=v_program
     and e.scheduled_date<=app_private.program_today(v_program)
     and (
       exists(select 1 from public.lesson_resources r
         where r.event_id=e.id and r.storage_path=path and r.published)
       or e.resource_url='storage://hacksphere-course-files/'||path
     )
 );
exception when others then return false;
end $$;
revoke all on function app_private.may_read_course_file(text) from public,anon;
grant execute on function app_private.may_read_course_file(text) to authenticated;
