-- HackSphere: secure enrollment screenshots and released-date private media access.
alter table public.payment_claims add column if not exists proof_path text;
alter table public.payment_claims drop constraint if exists proof_owned_by_student;
alter table public.payment_claims add constraint proof_owned_by_student
check (proof_path is null or split_part(proof_path,'/',1)=student_id::text);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hacksphere-payment-proofs','hacksphere-payment-proofs',false,5242880,
array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists "student upload payment proof" on storage.objects;
create policy "student upload payment proof" on storage.objects
for insert to authenticated with check (
bucket_id='hacksphere-payment-proofs'
and split_part(name,'/',1)=(select auth.uid())::text
and name ~ '^[0-9a-f-]{36}/[a-zA-Z0-9_.-]+$'
);
drop policy if exists "proof visible to payer and admin" on storage.objects;
create policy "proof visible to payer and admin" on storage.objects
for select to authenticated using (
bucket_id='hacksphere-payment-proofs'
and (split_part(name,'/',1)=(select auth.uid())::text or (select app_private.is_admin()))
);

-- Private resource paths follow program_id / timeline_event_id / filename.
create or replace function app_private.may_read_course_file(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid; eid uuid;
begin
 if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' then return false; end if;
 pid:=split_part(path,'/',1)::uuid;
 eid:=split_part(path,'/',2)::uuid;
 if not exists(select 1 from public.timeline_events t
   where t.id=eid and t.program_id=pid) then return false; end if;
 if app_private.is_admin() or app_private.is_program_trainer(pid)
    or app_private.is_program_guide(pid) then return true; end if;
 return exists(select 1 from public.timeline_events t
   where t.id=eid and t.program_id=pid
   and t.scheduled_date <= (now() at time zone 'Asia/Kolkata')::date)
   and app_private.is_student_enrolled(pid);
exception when others then return false;
end $$;
create or replace function app_private.may_upload_course_file(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid; eid uuid; phase text;
begin
 if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' then return false; end if;
 pid:=split_part(path,'/',1)::uuid;
 eid:=split_part(path,'/',2)::uuid;
 select t.phase into phase from public.timeline_events t where t.id=eid and t.program_id=pid;
 if phase is null then return false; end if;
 return app_private.is_admin() or
 (phase='training' and app_private.is_program_trainer(pid)) or
 (phase='internship' and app_private.is_program_guide(pid));
exception when others then return false;
end $$;
revoke all on function app_private.may_read_course_file(text) from public;
revoke all on function app_private.may_upload_course_file(text) from public;
grant execute on function app_private.may_read_course_file(text) to authenticated;
grant execute on function app_private.may_upload_course_file(text) to authenticated;

drop policy if exists "staff upload assigned resources" on storage.objects;
drop policy if exists "staff access uploaded resources" on storage.objects;
create policy "upload scheduled course media by assigned staff" on storage.objects
for insert to authenticated with check (
bucket_id='hacksphere-course-files' and (select app_private.may_upload_course_file(name))
);
create policy "read released course media" on storage.objects
for select to authenticated using (
bucket_id='hacksphere-course-files' and (select app_private.may_read_course_file(name))
);

-- Ensure new payment claims include a supporting screenshot path; not proof of bank credit.
drop policy if exists "student submit valid pending claim" on public.payment_claims;
create policy "student submit valid pending claim" on public.payment_claims
for insert to authenticated with check (
student_id=(select auth.uid()) and status='pending' and proof_path is not null
and split_part(proof_path,'/',1)=(select auth.uid())::text
and exists(select 1 from public.programs p
 where p.id=program_id and p.status in ('published','ongoing') and p.fee_inr=amount_inr)
);

-- Ensure only allocated student's records can be viewed by a Guide.
drop policy if exists "enrollment read" on public.enrollments;
create policy "enrollment read" on public.enrollments for select to authenticated
using (
student_id=(select auth.uid()) or (select app_private.is_admin())
or (select app_private.is_program_trainer(program_id))
or (select app_private.is_student_guide(program_id,student_id))
);
