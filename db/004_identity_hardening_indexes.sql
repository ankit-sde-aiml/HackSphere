-- Security hardening for the dedicated HackSphere database.
-- The invited email MUST match the actual verified Google identity email,
-- not merely a mutable Supabase account email string.

create or replace function public.accept_my_staff_invitation()
returns integer language plpgsql security definer set search_path='' as $$
declare caller_id uuid := auth.uid(); matching_email text; added integer := 0;
begin
 if caller_id is null then raise exception 'Google authentication required'; end if;
 select lower(i.identity_data->>'email') into matching_email
 from auth.identities i
 where i.user_id=caller_id and i.provider='google'
 and nullif(i.identity_data->>'email','') is not null
 and coalesce(lower(i.identity_data->>'email_verified'),'false')='true'
 order by i.updated_at desc
 limit 1;
 if matching_email is null then
   raise exception 'Verified Google identity required for invitation';
 end if;
 with eligible as (
  update public.staff_invitations invite set status='accepted'
  where lower(invite.email)=matching_email and invite.status='pending'
  and invite.expires_at>now()
  returning invite.role,invite.created_by
 ), new_roles as (
  insert into public.staff_roles(user_id,role,assigned_by)
  select caller_id,e.role,e.created_by from eligible e
  on conflict(user_id,role) do nothing returning role
 ) select count(*) into added from new_roles;
 return added;
end $$;
revoke all on function public.accept_my_staff_invitation() from public,anon;
grant execute on function public.accept_my_staff_invitation() to authenticated;

-- Account email is managed by Supabase Auth, not directly editable via profiles API.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Cover common access paths and FK joins to avoid unexpectedly slow LMS timelines and reviews.
create index if not exists ix_hs_enrollments_student on public.enrollments(student_id,status,program_id);
create index if not exists ix_hs_enrollments_program on public.enrollments(program_id,status);
create index if not exists ix_hs_payments_student on public.payment_claims(student_id,created_at desc);
create index if not exists ix_hs_payments_queue on public.payment_claims(status,created_at desc);
create index if not exists ix_hs_events_program_date on public.timeline_events(program_id,scheduled_date);
create index if not exists ix_hs_live_sessions_program_date on public.live_sessions(program_id,session_date,start_time);
create index if not exists ix_hs_scores_student on public.evaluations(student_id,program_id,created_at desc);
create index if not exists ix_hs_scores_evaluator on public.evaluations(evaluator_id);
create index if not exists ix_hs_submissions_student on public.submissions(student_id,submitted_at desc);
create index if not exists ix_hs_guide_allocations_guide on public.guide_allocations(guide_user_id,program_id);
create index if not exists ix_hs_certificates_student on public.certificates(student_id);
create index if not exists ix_hs_recommendations_guide on public.completion_recommendations(guide_user_id);
create index if not exists ix_hs_programs_created_by on public.programs(created_by);
create index if not exists ix_hs_staff_roles_assigned_by on public.staff_roles(assigned_by);

-- Document holder names are snapshotted at time of issuance; changes to profile do not alter issued credentials.
