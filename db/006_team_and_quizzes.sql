-- HackSphere 2026-11: designated staff at program creation; QA seats; secure quizzes.
create table if not exists public.program_guides (
 program_id uuid not null references public.programs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 assigned_by uuid not null references auth.users(id),
 assigned_at timestamptz not null default now(),
 primary key(program_id,user_id)
);
alter table public.program_guides enable row level security;
create policy "designated program guides" on public.program_guides for select to authenticated
 using((select app_private.is_admin()) or user_id=(select auth.uid()));
create policy "admin designates guide" on public.program_guides for insert to authenticated
 with check((select app_private.is_admin()) and assigned_by=(select auth.uid()) and
 exists(select 1 from public.staff_roles sr where sr.user_id=program_guides.user_id and sr.role='guide'));
create policy "admin changes guide" on public.program_guides for delete to authenticated
 using((select app_private.is_admin()));
grant select,insert,delete on public.program_guides to authenticated;

-- A designated guide can prepare internship curriculum before it starts.
-- Per-student access remains scoped to allocations and internship date.
create or replace function app_private.is_program_guide(p_id uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.program_guides g join public.staff_roles sr
 on sr.user_id=g.user_id and sr.role='guide'
 where g.program_id=p_id and g.user_id=(select auth.uid())
 ) or exists(
 select 1 from public.guide_allocations ga
 join public.staff_roles sr on sr.user_id=ga.guide_user_id and sr.role='guide'
 where ga.program_id=p_id and ga.guide_user_id=(select auth.uid())
 ) $$;

-- Prevent allocating a student to a guide not designated for that program.
create or replace function app_private.require_internship_started()
 returns trigger language plpgsql set search_path='' as $$
declare start_on date;
begin
 select (start_date+training_days) into start_on from public.programs where id=new.program_id;
 if start_on is null or app_private.program_today(new.program_id)<start_on then
  raise exception 'Internship Guide allocation allowed only from internship start date'; end if;
 if not exists(select 1 from public.enrollments e where e.program_id=new.program_id and e.student_id=new.student_id and e.status='active') then
  raise exception 'Student is not actively enrolled'; end if;
 if not exists(select 1 from public.program_guides g join public.staff_roles s
 on s.user_id=g.user_id and s.role='guide' where g.program_id=new.program_id and g.user_id=new.guide_user_id) then
  raise exception 'Guide must be designated on the program'; end if;
 return new;
end $$;

alter table public.programs add column if not exists is_test boolean not null default false;
alter table public.enrollments add column if not exists is_test boolean not null default false;
alter table public.enrollments add column if not exists enrollment_source text not null default 'verified_upi'
check(enrollment_source in ('verified_upi','qa_test','admin_scholarship'));
alter table public.enrollments add column if not exists admin_note text;

-- Hide QA programs from public search and unauthorised students.
drop policy if exists "public published programs only" on public.programs;
create policy "public published non test programs" on public.programs for select to anon
 using(status in ('published','ongoing','completed') and not is_test);
drop policy if exists "signed in programs" on public.programs;
create policy "authenticated published or accessible programs" on public.programs for select to authenticated
 using(
 (status in ('published','ongoing','completed') and not is_test) or
 (select app_private.is_admin()) or
 (select app_private.is_program_trainer(id)) or
 (select app_private.is_program_guide(id)) or
 exists(select 1 from public.enrollments en where en.program_id=programs.id and en.student_id=(select auth.uid()) and en.status='active')
);

-- QA enrollment is not proof of a real bank transfer and shall never be a verified public credential.
create or replace function public.verify_hacksphere_document(document_code text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if document_code is null or length(document_code)>80 then return jsonb_build_object('valid',false); end if;
 select jsonb_build_object('valid',true,'kind','certificate','code',c.code,
 'holder_name',coalesce(c.issued_name,p.full_name,'Student'),'program',pr.title,
 'issued_at',c.issued_at,'status',c.status)
 into result from public.certificates c join public.programs pr on pr.id=c.program_id
 left join public.profiles p on p.id=c.student_id
 join public.enrollments en on en.program_id=c.program_id and en.student_id=c.student_id and not en.is_test
 where c.code=document_code and c.status='approved' and not pr.is_test;
 if result is not null then return result; end if;
 select jsonb_build_object('valid',true,'kind','offer_letter','code',e.offer_letter_code,
 'holder_name',coalesce(e.offer_letter_name,p.full_name,'Student'),
 'program',pr.title,'issued_at',e.approved_at,'status',e.status)
 into result from public.enrollments e join public.programs pr on pr.id=e.program_id
 left join public.profiles p on p.id=e.student_id
 where e.offer_letter_code=document_code and e.status in ('active','completed')
 and not e.is_test and not pr.is_test;
 return coalesce(result,jsonb_build_object('valid',false));
end $$;

-- QA enrollment cannot be certified as genuine completion.
create or replace function app_private.require_certificate_recommendation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.programs p where p.id=new.program_id and p.is_test) or
    exists(select 1 from public.enrollments en where en.program_id=new.program_id and en.student_id=new.student_id and en.is_test)
 then raise exception 'QA enrollment cannot receive a verified certificate'; end if;
 if not exists(select 1 from public.completion_recommendations r
 where r.program_id=new.program_id and r.student_id=new.student_id and r.recommendation='recommended')
 then raise exception 'Completion must be recommended by Guide'; end if;
 if not exists(select 1 from public.enrollments en where en.program_id=new.program_id and en.student_id=new.student_id and en.status in ('active','completed')) then
 raise exception 'Verified enrollment required'; end if;
 return new;
end $$;

-- Admin creates a program and initial staff designations in one atomic step.
create or replace function public.create_program_with_team(
 _title text,_description text,_start_date date,_training_days integer,
 _internship_days integer,_fee_inr integer,_mode text,_status text,
 _timezone text,_trainer_id uuid,_guide_id uuid,_is_test boolean default false
) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null or not app_private.is_admin() then raise exception 'Administrator required'; end if;
 if not exists(select 1 from public.staff_roles r where r.user_id=_trainer_id and r.role='trainer') then raise exception 'Trainer role required'; end if;
 if not exists(select 1 from public.staff_roles r where r.user_id=_guide_id and r.role='guide') then raise exception 'Guide role required'; end if;
 insert into public.programs(title,description,start_date,training_days,internship_days,fee_inr,mode,status,timezone,created_by,is_test)
 values(_title,_description,_start_date,_training_days,_internship_days,_fee_inr,_mode,_status,_timezone,auth.uid(),_is_test)
 returning id into new_id;
 insert into public.program_staff(program_id,user_id,role,assigned_by) values(new_id,_trainer_id,'trainer',auth.uid());
 insert into public.program_guides(program_id,user_id,assigned_by) values(new_id,_guide_id,auth.uid());
 return new_id;
end $$;
revoke all on function public.create_program_with_team(text,text,date,integer,integer,integer,text,text,text,uuid,uuid,boolean) from public,anon;
grant execute on function public.create_program_with_team(text,text,date,integer,integer,integer,text,text,text,uuid,uuid,boolean) to authenticated;

-- Quiz metadata and questions; correct answers are never exposed to student clients.
create table if not exists public.quizzes(
 id uuid primary key default gen_random_uuid(),
 timeline_event_id uuid not null unique references public.timeline_events(id) on delete cascade,
 title text not null,
 time_limit_minutes integer not null default 20 check(time_limit_minutes between 1 and 240),
 max_attempts integer not null default 2 check(max_attempts between 1 and 10),
 published boolean not null default false,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.quiz_questions(
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid not null references public.quizzes(id) on delete cascade,
 prompt text not null,
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 6),
 position integer not null default 1,
 points numeric not null default 1 check(points>0)
);
create table if not exists app_private.quiz_answers(
 question_id uuid primary key references public.quiz_questions(id) on delete cascade,
 correct_index integer not null check(correct_index between 0 and 5)
);
create table if not exists public.quiz_attempts(
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid not null references public.quizzes(id) on delete cascade,
 student_id uuid not null references auth.users(id),
 answers jsonb not null,
 score numeric not null,
 max_score numeric not null,
 submitted_at timestamptz not null default now()
);
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table app_private.quiz_answers enable row level security;
grant select,insert,update on public.quizzes to authenticated;
grant select on public.quiz_questions to authenticated;
grant select on public.quiz_attempts to authenticated;
create policy "quiz visibility" on public.quizzes for select to authenticated
using((select app_private.is_admin()) or exists(
 select 1 from public.timeline_events e where e.id=timeline_event_id and
 ((e.phase='training' and (select app_private.is_program_trainer(e.program_id))) or
 (e.phase='internship' and (select app_private.is_program_guide(e.program_id))) or
 (published and e.scheduled_date<=app_private.program_today(e.program_id) and (select app_private.is_student_enrolled(e.program_id)))
 )));
create policy "staff create quiz" on public.quizzes for insert to authenticated
with check(created_by=(select auth.uid()) and exists(
 select 1 from public.timeline_events e where e.id=timeline_event_id and
 ((select app_private.is_admin()) or
 (e.phase='training' and (select app_private.is_program_trainer(e.program_id))) or
 (e.phase='internship' and (select app_private.is_program_guide(e.program_id))))));
create policy "staff update quiz" on public.quizzes for update to authenticated
using(exists(select 1 from public.timeline_events e where e.id=timeline_event_id and
 ((select app_private.is_admin()) or (e.phase='training' and (select app_private.is_program_trainer(e.program_id))) or
 (e.phase='internship' and (select app_private.is_program_guide(e.program_id))))))
with check(exists(select 1 from public.timeline_events e where e.id=timeline_event_id and
 ((select app_private.is_admin()) or (e.phase='training' and (select app_private.is_program_trainer(e.program_id))) or
 (e.phase='internship' and (select app_private.is_program_guide(e.program_id))))));
create policy "questions inherit quiz" on public.quiz_questions for select to authenticated
using(exists(select 1 from public.quizzes q where q.id=quiz_id));
create policy "own quiz attempts" on public.quiz_attempts for select to authenticated
using(student_id=(select auth.uid()) or (select app_private.is_admin()) or exists(
 select 1 from public.quizzes q join public.timeline_events e on e.id=q.timeline_event_id where q.id=quiz_id
 and ((e.phase='training' and (select app_private.is_program_trainer(e.program_id))) or
 (e.phase='internship' and (select app_private.is_student_guide(e.program_id,quiz_attempts.student_id))))
));
-- No direct quiz_question or quiz_attempt write grants for students.
create or replace function public.add_quiz_question(_quiz_id uuid,_prompt text,_options jsonb,_correct_index integer,_points numeric default 1)
returns uuid language plpgsql security definer set search_path='' as $$
declare qid uuid; e record; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 select t.program_id,t.phase into e from public.quizzes q join public.timeline_events t on t.id=q.timeline_event_id where q.id=_quiz_id;
 if not found then raise exception 'Quiz not found'; end if;
 if not (app_private.is_admin() or
 (e.phase='training' and app_private.is_program_trainer(e.program_id)) or
 (e.phase='internship' and app_private.is_program_guide(e.program_id))) then
 raise exception 'Assigned Trainer or Guide required'; end if;
 if jsonb_typeof(_options)<>'array' or jsonb_array_length(_options)<2 or jsonb_array_length(_options)>6 or
 _correct_index<0 or _correct_index>=jsonb_array_length(_options) then raise exception 'Invalid answers'; end if;
 insert into public.quiz_questions(quiz_id,prompt,options,position,points)
 values(_quiz_id,_prompt,_options,(select coalesce(max(position),0)+1 from public.quiz_questions where quiz_id=_quiz_id),_points)
 returning id into new_id;
 insert into app_private.quiz_answers(question_id,correct_index) values(new_id,_correct_index);
 return new_id;
end $$;
revoke all on function public.add_quiz_question(uuid,text,jsonb,integer,numeric) from public,anon;
grant execute on function public.add_quiz_question(uuid,text,jsonb,integer,numeric) to authenticated;

create or replace function public.submit_quiz(_quiz_id uuid,_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid :=auth.uid(); ev record; q record; got integer; points numeric:=0; possible numeric:=0; attempts integer; 
begin
 if uid is null or jsonb_typeof(_answers)<>'object' then raise exception 'Invalid submission'; end if;
 select t.program_id,t.scheduled_date,q.max_attempts,q.published into ev from public.quizzes q
 join public.timeline_events t on t.id=q.timeline_event_id where q.id=_quiz_id;
 if not found or not ev.published or ev.scheduled_date>app_private.program_today(ev.program_id) or
 not app_private.is_student_enrolled(ev.program_id) then raise exception 'Quiz not released or not enrolled'; end if;
 select count(*) into attempts from public.quiz_attempts where quiz_id=_quiz_id and student_id=uid;
 if attempts>=ev.max_attempts then raise exception 'Maximum attempts reached'; end if;
 for q in select qq.id,qq.points,qa.correct_index from public.quiz_questions qq
 join app_private.quiz_answers qa on qa.question_id=qq.id where qq.quiz_id=_quiz_id loop
 possible:=possible+q.points;
 if _answers ? (q.id::text) and (_answers->>(q.id::text)) ~ '^[0-5]$' then
 got:=(_answers->>(q.id::text))::integer;
 if got=q.correct_index then points:=points+q.points; end if;
 end if;
 end loop;
 if possible<=0 then raise exception 'Quiz has no questions'; end if;
 insert into public.quiz_attempts(quiz_id,student_id,answers,score,max_score)
 values(_quiz_id,uid,_answers,points,possible);
 return jsonb_build_object('score',points,'max_score',possible,'percentage',round(points*100/possible,2),'attempt',attempts+1);
end $$;
revoke all on function public.submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.submit_quiz(uuid,jsonb) to authenticated;
create index if not exists hs_quiz_questions_quiz on public.quiz_questions(quiz_id,position);
create index if not exists hs_quiz_attempt_student on public.quiz_attempts(student_id,quiz_id);
