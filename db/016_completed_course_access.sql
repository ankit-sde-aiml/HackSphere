create or replace function app_private.is_student_enrolled(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.enrollments e
 where e.student_id=(select auth.uid()) and e.program_id=p_id
 and e.status in ('active','completed'))
$$;