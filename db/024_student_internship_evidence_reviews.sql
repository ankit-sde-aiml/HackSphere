-- HackSphere 024: student internship work evidence and mentor review history.
-- Additive migration on the existing Supabase project; no student data removed.

alter table public.internship_tasks
 add column if not exists work_url text,
 add column if not exists student_note text,
 add column if not exists submitted_at timestamptz,
 add column if not exists mentor_feedback text,
 add column if not exists reviewed_at timestamptz,
 add column if not exists reviewed_by uuid references auth.users(id);

alter table public.internship_tasks drop constraint if exists internship_tasks_status_check;
alter table public.internship_tasks
 add constraint internship_tasks_status_check
 check (status in ('todo','in_progress','review','changes_requested','completed'));
alter table public.internship_tasks
 add constraint hs_task_work_url_https
 check (work_url is null or (length(work_url)<=2000 and work_url ~ '^https://[^[:space:]]+$'));
alter table public.internship_tasks
 add constraint hs_task_notes_length
 check ((student_note is null or length(student_note)<=2000)
    and (mentor_feedback is null or length(mentor_feedback)<=2000));

create table if not exists public.internship_task_reviews(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.internship_tasks(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id),
 result text not null check(result in ('approved','changes_requested')),
 feedback text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists hs_task_review_history on public.internship_task_reviews(task_id,created_at desc);
alter table public.internship_task_reviews enable row level security;
create policy "team members see project task review history"
 on public.internship_task_reviews for select to authenticated
 using(exists(
  select 1 from public.internship_tasks t
  where t.id=task_id and ((select app_private.is_admin()) or app_private.is_my_internship_team(t.team_id))
 ));
revoke all on public.internship_task_reviews from anon,authenticated;
grant select on public.internship_task_reviews to authenticated;

create or replace function public.save_my_internship_work(
 _task_id uuid,_status text,_work_url text default null,_student_note text default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare t record; new_url text; new_note text;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if _status not in ('in_progress','review') then
  raise exception 'Students may start work or submit it for mentor review'; end if;
 select * into t from public.internship_tasks where id=_task_id for update;
 if not found then raise exception 'Task not found';end if;
 if t.assigned_student_id is not null and t.assigned_student_id<>auth.uid() then
  raise exception 'Only the assigned student may submit this task'; end if;
 if not exists (select 1 from public.internship_team_members m
  where m.team_id=t.team_id and m.student_id=auth.uid()) then
  raise exception 'Only team members may update their tasks';end if;
 if t.status in ('review','completed') then
  raise exception 'This task is under review or already approved';end if;
 new_url:=nullif(btrim(coalesce(_work_url,t.work_url,'')),'');
 new_note:=nullif(btrim(coalesce(_student_note,t.student_note,'')),'');
 if new_url is not null and (length(new_url)>2000 or new_url !~ '^https://[^[:space:]]+$') then
  raise exception 'Provide a valid HTTPS GitHub, pull request or demo link';end if;
 if new_note is not null and length(new_note)>2000 then
  raise exception 'Notes exceed 2000 characters';end if;
 if _status='review' and new_url is null then
  raise exception 'Add a GitHub, pull request or working demo link to request review';end if;
 update public.internship_tasks set
  status=_status,work_url=new_url,student_note=new_note,
  submitted_at=case when _status='review' then now() else t.submitted_at end,
  reviewed_at=case when _status='review' then null else t.reviewed_at end,
  reviewed_by=case when _status='review' then null else t.reviewed_by end
 where id=_task_id;
 return true;
end $$;
revoke all on function public.save_my_internship_work(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.save_my_internship_work(uuid,text,text,text) to authenticated;

-- Compatibility for existing clients; no submission can bypass evidence rules.
create or replace function public.update_my_internship_task(_task_id uuid,_status text)
returns boolean language sql security invoker set search_path='' as $$
 select public.save_my_internship_work(_task_id,_status,null,null);
$$;
revoke all on function public.update_my_internship_task(uuid,text) from public,anon,authenticated;
grant execute on function public.update_my_internship_task(uuid,text) to authenticated;

create or replace function public.review_internship_work(
 _task_id uuid,_decision text,_feedback text default ''
) returns boolean language plpgsql security definer set search_path='' as $$
declare t record; feedback_clean text;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if _decision not in ('approved','changes_requested') then
  raise exception 'Review decision must be approved or changes_requested';end if;
 select task.*,team.mentor_id into t
 from public.internship_tasks task join public.internship_teams team on team.id=task.team_id
 where task.id=_task_id for update of task;
 if not found then raise exception 'Task not found';end if;
 if t.mentor_id<>auth.uid() and not app_private.is_admin() then
  raise exception 'Only the allocated team mentor may review this task';end if;
 if t.status<>'review' or t.work_url is null then
  raise exception 'Student work must be submitted with evidence before review';end if;
 feedback_clean:=btrim(coalesce(_feedback,''));
 if length(feedback_clean)>2000 then raise exception 'Feedback too long';end if;
 if _decision='changes_requested' and length(feedback_clean)<3 then
  raise exception 'Please explain what the student needs to improve';end if;
 update public.internship_tasks set
  status=case when _decision='approved' then 'completed' else 'changes_requested' end,
  mentor_feedback=nullif(feedback_clean,''),
  reviewed_at=now(),reviewed_by=auth.uid()
 where id=_task_id;
 insert into public.internship_task_reviews(task_id,reviewer_id,result,feedback)
 values(_task_id,auth.uid(),_decision,feedback_clean);
 return true;
end $$;
revoke all on function public.review_internship_work(uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_internship_work(uuid,text,text) to authenticated;
