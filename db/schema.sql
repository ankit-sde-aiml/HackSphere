-- HackSphere schema for a NEW, dedicated Supabase project only.
-- Review and run in the dedicated HackSphere project, NEVER in unrelated projects.
-- Google provider must be enabled in Supabase Auth settings separately.
-- Only a verified Google user may be bootstrapped as the first admin by project owner.

create extension if not exists pgcrypto;
create schema if not exists app_private;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text,
 created_at timestamptz not null default now()
);
create table if not exists public.staff_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','trainer','guide')),
 assigned_by uuid references auth.users(id),
 assigned_at timestamptz not null default now(),
 primary key(user_id,role)
);
create table if not exists public.staff_invitations (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 role text not null check (role in ('trainer','guide')),
 created_by uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','accepted','revoked')),
 expires_at timestamptz not null default (now()+interval '7 days'),
 created_at timestamptz not null default now(),
 unique(email,role,status)
);
create table if not exists public.programs (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title))>2),
 slug text unique,
 description text,
 start_date date not null,
 training_days integer not null check(training_days>0 and training_days<=3650),
 internship_days integer not null check(internship_days>0 and internship_days<=3650),
 fee_inr integer not null default 0 check(fee_inr>=0),
 mode text not null default 'Hybrid' check(mode in ('Hybrid','Live','Recorded')),
 status text not null default 'draft' check(status in ('draft','published','ongoing','completed','archived')),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.program_staff (
 program_id uuid not null references public.programs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role='trainer'),
 assigned_by uuid references auth.users(id),
 assigned_at timestamptz not null default now(),
 primary key(program_id,user_id,role)
);
create table if not exists public.enrollments (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','suspended','completed')),
 approved_at timestamptz not null default now(),
 approved_by uuid references auth.users(id),
 offer_letter_code text unique not null default ('HS-OL-'||upper(encode(gen_random_bytes(7),'hex'))),
 unique(program_id,student_id)
);
create table if not exists public.payment_claims (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete restrict,
 student_id uuid not null references auth.users(id) on delete restrict,
 utr text not null check(length(utr) between 6 and 100),
 amount_inr integer not null check(amount_inr>=0),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 review_note text,
 unique(program_id,student_id,utr)
);
create table if not exists public.timeline_events (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 phase text not null check(phase in ('training','internship')),
 activity_type text not null check(activity_type in ('lecture','recording','assignment','quiz','project','milestone','resource')),
 scheduled_date date not null,
 title text not null,
 description text,
 resource_url text,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.live_sessions (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 timeline_event_id uuid references public.timeline_events(id) on delete set null,
 title text not null,
 session_date date not null,
 start_time time not null,
 duration_minutes integer not null default 60 check(duration_minutes between 5 and 480),
 status text not null default 'scheduled' check(status in ('scheduled','cancelled','completed')),
 trainer_user_id uuid references auth.users(id),
 created_at timestamptz not null default now()
);
-- Private table, NOT reachable via PostgREST Data API.
create table if not exists app_private.meeting_links (
 session_id uuid primary key references public.live_sessions(id) on delete cascade,
 meet_uri text not null,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.guide_allocations (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 guide_user_id uuid not null references auth.users(id),
 allocated_by uuid not null references auth.users(id),
 allocated_at timestamptz not null default now(),
 unique(program_id,student_id)
);
create table if not exists public.submissions (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.timeline_events(id) on delete cascade,
 student_id uuid not null references auth.users(id),
 content text,
 submission_url text,
 status text not null default 'submitted' check(status in ('submitted','reviewed','changes_requested','approved')),
 submitted_at timestamptz not null default now(),
 unique(event_id,student_id)
);
create table if not exists public.evaluations (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id) on delete cascade,
 student_id uuid not null references auth.users(id),
 evaluator_id uuid not null references auth.users(id),
 phase text not null check(phase in ('training','internship')),
 activity_title text not null,
 score numeric(8,2) not null check(score>=0),
 max_score numeric(8,2) not null check(max_score>0),
 feedback text,
 created_at timestamptz not null default now(),
 constraint valid_score check(score<=max_score)
);
create table if not exists public.certificates (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id),
 student_id uuid not null references auth.users(id),
 code text not null unique default ('HS-CERT-'||upper(encode(gen_random_bytes(9),'hex'))),
 status text not null default 'approved' check(status in ('approved','revoked')),
 approved_by uuid not null references auth.users(id),
 issued_at timestamptz not null default now(),
 unique(program_id,student_id)
);
create table if not exists public.site_settings (
 key text primary key,
 value jsonb not null,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);

-- Private authorization helpers; only return yes/no based on trusted DB rows.
create or replace function app_private.is_admin()
returns boolean language sql stable security definer
set search_path='' as $$
 select exists(select 1 from public.staff_roles s
   where s.user_id=(select auth.uid()) and s.role='admin')
$$;
create or replace function app_private.is_program_trainer(p_id uuid)
returns boolean language sql stable security definer
set search_path='' as $$
 select exists(select 1 from public.program_staff a
 join public.staff_roles sr on sr.user_id=a.user_id and sr.role='trainer'
 where a.user_id=(select auth.uid()) and a.program_id=p_id and a.role='trainer')
$$;
create or replace function app_private.is_program_guide(p_id uuid)
returns boolean language sql stable security definer
set search_path='' as $$
 select exists(select 1 from public.guide_allocations a
 join public.staff_roles sr on sr.user_id=a.guide_user_id and sr.role='guide'
 where a.guide_user_id=(select auth.uid()) and a.program_id=p_id)
$$;
create or replace function app_private.is_student_enrolled(p_id uuid)
returns boolean language sql stable security definer
set search_path='' as $$
 select exists(select 1 from public.enrollments e
 where e.student_id=(select auth.uid()) and e.program_id=p_id and e.status='active')
$$;
create or replace function app_private.is_student_guide(p_id uuid, student uuid)
returns boolean language sql stable security definer
set search_path='' as $$
 select exists(select 1 from public.guide_allocations a
 where a.guide_user_id=(select auth.uid()) and a.program_id=p_id and a.student_id=student)
$$;
revoke all on all functions in schema app_private from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_program_trainer(uuid) to authenticated;
grant execute on function app_private.is_program_guide(uuid) to authenticated;
grant execute on function app_private.is_student_enrolled(uuid) to authenticated;
grant execute on function app_private.is_student_guide(uuid,uuid) to authenticated;
revoke all on schema app_private from anon;

-- Profile data comes from Auth; metadata is used for display only, NEVER access control.
create or replace function app_private.on_auth_user_created()
returns trigger language plpgsql security definer
set search_path='' as $$
begin
 insert into public.profiles(id,email,full_name)
 values(new.id, coalesce(new.email,''),new.raw_user_meta_data->>'full_name')
 on conflict (id) do update set email=excluded.email;
 return new;
end $$;
drop trigger if exists hacksphere_profile_from_auth on auth.users;
create trigger hacksphere_profile_from_auth after insert on auth.users
for each row execute function app_private.on_auth_user_created();

-- Date checks are done with authoritative database time in India timezone.
create or replace function app_private.require_valid_timeline_date()
returns trigger language plpgsql set search_path='' as $$
declare p record; n integer;
begin
 select start_date,training_days,internship_days into p from public.programs where id=new.program_id;
 if not found then raise exception 'Program not found'; end if;
 n := new.scheduled_date-p.start_date;
 if n<0 or n>=p.training_days+p.internship_days then raise exception 'Activity date outside program'; end if;
 if new.phase='training' and n>=p.training_days then raise exception 'Training activity outside training phase'; end if;
 if new.phase='internship' and n<p.training_days then raise exception 'Internship activity before internship phase'; end if;
 return new;
end $$;
drop trigger if exists hacksphere_validate_timeline on public.timeline_events;
create trigger hacksphere_validate_timeline before insert or update on public.timeline_events
for each row execute function app_private.require_valid_timeline_date();

-- Enforce the explicitly requested "allocate guide at internship start" rule.
create or replace function app_private.require_internship_started()
returns trigger language plpgsql set search_path='' as $$
declare start_on date;
begin
 select (start_date+training_days) into start_on from public.programs where id=new.program_id;
 if ((now() at time zone 'Asia/Kolkata')::date < start_on) then
   raise exception 'Internship guide allocation allowed only from internship start date';
 end if;
 if not exists(select 1 from public.enrollments e where e.program_id=new.program_id and e.student_id=new.student_id and e.status='active') then
   raise exception 'Student is not actively enrolled';
 end if;
 if not exists(select 1 from public.staff_roles r where r.user_id=new.guide_user_id and r.role='guide') then
   raise exception 'Guide role is not assigned';
 end if;
 return new;
end $$;
drop trigger if exists hacksphere_check_allocation on public.guide_allocations;
create trigger hacksphere_check_allocation before insert or update on public.guide_allocations
for each row execute function app_private.require_internship_started();

-- Payment approval generates the corresponding active enrollment once; only admin can approve.
create or replace function app_private.activate_verified_enrollment()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and old.status<>'approved' then
   if new.reviewed_by is null then raise exception 'Approved payments require a reviewer'; end if;
   if not exists(select 1 from public.staff_roles r where r.user_id=new.reviewed_by and r.role='admin') then
     raise exception 'Approver must be admin'; end if;
   insert into public.enrollments(program_id,student_id,approved_by)
   values(new.program_id,new.student_id,new.reviewed_by)
   on conflict (program_id,student_id) do update set status='active',approved_by=excluded.approved_by,approved_at=now();
 end if;
 return new;
end $$;
drop trigger if exists hacksphere_payment_approval on public.payment_claims;
create trigger hacksphere_payment_approval after update of status on public.payment_claims
for each row execute function app_private.activate_verified_enrollment();

-- All public tables have row-level security. No permissive public writes.
alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.programs enable row level security;
alter table public.program_staff enable row level security;
alter table public.enrollments enable row level security;
alter table public.payment_claims enable row level security;
alter table public.timeline_events enable row level security;
alter table public.live_sessions enable row level security;
alter table public.guide_allocations enable row level security;
alter table public.submissions enable row level security;
alter table public.evaluations enable row level security;
alter table public.certificates enable row level security;
alter table public.site_settings enable row level security;

create policy "profile self and admin read" on public.profiles for select to authenticated
 using(id=(select auth.uid()) or (select app_private.is_admin()));
create policy "profile self update" on public.profiles for update to authenticated
 using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "staff roles self or admin read" on public.staff_roles for select to authenticated
 using(user_id=(select auth.uid()) or (select app_private.is_admin()));
create policy "admin assign roles" on public.staff_roles for insert to authenticated
 with check((select app_private.is_admin()));
create policy "admin revoke roles" on public.staff_roles for delete to authenticated
 using((select app_private.is_admin()));
create policy "admin read invitations" on public.staff_invitations for select to authenticated
 using((select app_private.is_admin()));
create policy "admin create invitations" on public.staff_invitations for insert to authenticated
 with check((select app_private.is_admin()) and created_by=(select auth.uid()));
create policy "admin update invitations" on public.staff_invitations for update to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()));
create policy "public published programs" on public.programs for select to anon,authenticated
 using(status in ('published','ongoing','completed') or (select app_private.is_admin()) or (select app_private.is_program_trainer(id)) or (select app_private.is_program_guide(id)));
create policy "admin create programs" on public.programs for insert to authenticated
 with check((select app_private.is_admin()));
create policy "admin edit programs" on public.programs for update to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()));
create policy "admin read assigned trainers" on public.program_staff for select to authenticated
 using(user_id=(select auth.uid()) or (select app_private.is_admin()));
create policy "admin assign trainers" on public.program_staff for insert to authenticated
 with check((select app_private.is_admin()));
create policy "admin remove trainers" on public.program_staff for delete to authenticated
 using((select app_private.is_admin()));
create policy "enrollment read" on public.enrollments for select to authenticated
 using(student_id=(select auth.uid()) or (select app_private.is_admin()) or (select app_private.is_program_trainer(program_id)) or (select app_private.is_program_guide(program_id)));
create policy "admin insert enrollment" on public.enrollments for insert to authenticated
 with check((select app_private.is_admin()));
create policy "admin update enrollment" on public.enrollments for update to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()));
create policy "payment self and admin read" on public.payment_claims for select to authenticated
 using(student_id=(select auth.uid()) or (select app_private.is_admin()));
create policy "student submit pending payment" on public.payment_claims for insert to authenticated
 with check(student_id=(select auth.uid()) and status='pending');
create policy "admin review payment" on public.payment_claims for update to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()) and reviewed_by=(select auth.uid()));
create policy "timeline scheduled access" on public.timeline_events for select to authenticated
 using((select app_private.is_admin()) or
   (phase='training' and (select app_private.is_program_trainer(program_id))) or
   (phase='internship' and (select app_private.is_program_guide(program_id))) or
   (scheduled_date <= (now() at time zone 'Asia/Kolkata')::date and (select app_private.is_student_enrolled(program_id))));
create policy "staff create timeline" on public.timeline_events for insert to authenticated
 with check((select app_private.is_admin()) or (phase='training' and (select app_private.is_program_trainer(program_id))) or (phase='internship' and (select app_private.is_program_guide(program_id))));
create policy "staff edit timeline" on public.timeline_events for update to authenticated
 using((select app_private.is_admin()) or (phase='training' and (select app_private.is_program_trainer(program_id))) or (phase='internship' and (select app_private.is_program_guide(program_id))))
 with check((select app_private.is_admin()) or (phase='training' and (select app_private.is_program_trainer(program_id))) or (phase='internship' and (select app_private.is_program_guide(program_id))));
create policy "session scheduled access" on public.live_sessions for select to authenticated
 using((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id)) or
  ((select app_private.is_student_enrolled(program_id)) and session_date<=(now() at time zone 'Asia/Kolkata')::date));
create policy "staff schedule session" on public.live_sessions for insert to authenticated
 with check((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id)));
create policy "staff edit session" on public.live_sessions for update to authenticated
 using((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id)))
 with check((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id)));
create policy "guide allocations read" on public.guide_allocations for select to authenticated
 using(student_id=(select auth.uid()) or guide_user_id=(select auth.uid()) or (select app_private.is_admin()) or (select app_private.is_program_trainer(program_id)));
create policy "admin allocate guides" on public.guide_allocations for insert to authenticated
 with check((select app_private.is_admin()) and allocated_by=(select auth.uid()));
create policy "admin reallocate guides" on public.guide_allocations for update to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()) and allocated_by=(select auth.uid()));
create policy "student and guide see submissions" on public.submissions for select to authenticated
 using(student_id=(select auth.uid()) or (select app_private.is_admin()) or
 exists(select 1 from public.timeline_events te where te.id=event_id and
 ((te.phase='training' and (select app_private.is_program_trainer(te.program_id))) or
  (te.phase='internship' and (select app_private.is_student_guide(te.program_id,student_id))))));
create policy "student submit unlocked work" on public.submissions for insert to authenticated
 with check(student_id=(select auth.uid()) and exists(select 1 from public.timeline_events te
 where te.id=event_id and te.scheduled_date<=(now() at time zone 'Asia/Kolkata')::date
 and (select app_private.is_student_enrolled(te.program_id))));
create policy "student edit own submission" on public.submissions for update to authenticated
 using(student_id=(select auth.uid())) with check(student_id=(select auth.uid()));
create policy "scores visible to student and evaluators" on public.evaluations for select to authenticated
 using(student_id=(select auth.uid()) or evaluator_id=(select auth.uid()) or (select app_private.is_admin()) or
 (phase='training' and (select app_private.is_program_trainer(program_id))) or
 (phase='internship' and (select app_private.is_student_guide(program_id,student_id))));
create policy "assigned evaluator scores" on public.evaluations for insert to authenticated
 with check(evaluator_id=(select auth.uid()) and
 ((phase='training' and (select app_private.is_program_trainer(program_id))) or
  (phase='internship' and (select app_private.is_student_guide(program_id,student_id))) or
  (select app_private.is_admin())));
create policy "evaluator corrections" on public.evaluations for update to authenticated
 using(evaluator_id=(select auth.uid()) or (select app_private.is_admin()))
 with check((evaluator_id=(select auth.uid()) or (select app_private.is_admin())) and
 ((phase='training' and (select app_private.is_program_trainer(program_id))) or
 (phase='internship' and (select app_private.is_student_guide(program_id,student_id))) or
 (select app_private.is_admin())));
create policy "student own certificates" on public.certificates for select to authenticated
 using(student_id=(select auth.uid()) or (select app_private.is_admin()));
create policy "admin approve certificate" on public.certificates for insert to authenticated
 with check((select app_private.is_admin()) and approved_by=(select auth.uid()));
create policy "admin revoke certificate" on public.certificates for update to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()));
create policy "admin settings only" on public.site_settings for all to authenticated
 using((select app_private.is_admin())) with check((select app_private.is_admin()));

grant select on public.programs to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
-- Private meeting_links is never granted to anon or authenticated.
revoke all on all tables in schema app_private from anon,authenticated;

-- FIRST ADMIN BOOTSTRAP, run ONLY after approved person signs in with Google:
-- insert into public.staff_roles(user_id,role)
-- values('<VERIFIED_AUTH_USER_UUID>','admin');
-- Never give admin role based on user-editable metadata or an email typed in the UI.
