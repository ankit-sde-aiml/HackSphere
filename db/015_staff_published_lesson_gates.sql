-- Student sees only content deliberately published by assigned Trainer/Guide.
-- The calendar still unlocks by date, never by quiz marks or assignment scores.
alter table public.timeline_events
 add column if not exists published_to_students boolean not null default false;

drop policy if exists "timeline scheduled access" on public.timeline_events;
create policy "timeline scheduled access" on public.timeline_events for select to authenticated
using(
 (select app_private.is_admin())
 or (phase='training' and (select app_private.is_program_trainer(program_id)))
 or (phase='internship' and (select app_private.is_program_guide(program_id)))
 or (published_to_students and scheduled_date<=app_private.program_today(program_id)
     and (select app_private.is_student_enrolled(program_id)))
);

-- No admin-only role or student can mark teaching material as published.
create or replace function app_private.staff_controls_lesson_publication()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.published_to_students is distinct from old.published_to_students and auth.uid() is not null then
  if not ((new.phase='training' and app_private.is_program_trainer(new.program_id))
     or (new.phase='internship' and app_private.is_program_guide(new.program_id)))
  then raise exception 'Only the assigned Trainer/Guide can publish classroom content';end if;
 end if;
 return new;
end $$;
drop trigger if exists hs_lesson_publication_staff_only on public.timeline_events;
create trigger hs_lesson_publication_staff_only
 before update of published_to_students on public.timeline_events
 for each row execute function app_private.staff_controls_lesson_publication();

-- Trainer/Guide-published lesson resource releases its parent lesson metadata.
create or replace function app_private.publish_from_lesson_resource()
returns trigger language plpgsql security definer set search_path='' as $$
declare event_info record;
begin
 if new.published then
  select program_id,phase into event_info from public.timeline_events where id=new.event_id;
  if found and ((event_info.phase='training' and app_private.is_program_trainer(event_info.program_id))
     or (event_info.phase='internship' and app_private.is_program_guide(event_info.program_id)))
  then
   update public.timeline_events set published_to_students=true where id=new.event_id;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists hs_staff_resource_releases_lesson on public.lesson_resources;
create trigger hs_staff_resource_releases_lesson after insert or update of published on public.lesson_resources
 for each row execute function app_private.publish_from_lesson_resource();

-- Trainer/Guide may publish a quiz only after real questions have been added.
create or replace function app_private.publish_from_quiz()
returns trigger language plpgsql security definer set search_path='' as $$
declare event_info record;
begin
 if new.published then
  if not exists(select 1 from public.quiz_questions qq where qq.quiz_id=new.id) then
    raise exception 'Add quiz questions before publishing';end if;
  select program_id,phase into event_info from public.timeline_events where id=new.timeline_event_id;
  if found and ((event_info.phase='training' and app_private.is_program_trainer(event_info.program_id))
     or (event_info.phase='internship' and app_private.is_program_guide(event_info.program_id)))
  then update public.timeline_events set published_to_students=true where id=new.timeline_event_id;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists hs_staff_quiz_releases_lesson on public.quizzes;
create trigger hs_staff_quiz_releases_lesson after insert or update of published on public.quizzes
 for each row execute function app_private.publish_from_quiz();

-- New video becomes a published lesson only after the class host finishes upload.
create or replace function app_private.publish_from_ready_video()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='ready' and new.published and
 app_private.may_upload_lesson_video(new.lesson_event_id,new.uploaded_by) then
  update public.timeline_events set published_to_students=true where id=new.lesson_event_id;
 end if;
 return new;
end $$;
drop trigger if exists hs_ready_video_releases_lesson on public.videos;
create trigger hs_ready_video_releases_lesson after update of status on public.videos
 for each row when(new.status='ready') execute function app_private.publish_from_ready_video();

drop policy if exists "student released or assigned staff lesson resources" on public.lesson_resources;
create policy "student released or assigned staff lesson resources" on public.lesson_resources
for select to authenticated using(exists(select 1 from public.timeline_events e
 where e.id=lesson_resources.event_id and
 ((select app_private.is_admin())
  or (e.phase='training' and (select app_private.is_program_trainer(e.program_id)))
  or (e.phase='internship' and (select app_private.is_program_guide(e.program_id)))
  or (e.published_to_students and lesson_resources.published
      and e.scheduled_date<=app_private.program_today(e.program_id)
      and (select app_private.is_student_enrolled(e.program_id))))
));

drop policy if exists "quiz visibility" on public.quizzes;
create policy "quiz visibility" on public.quizzes for select to authenticated
using((select app_private.is_admin()) or exists(
 select 1 from public.timeline_events e where e.id=timeline_event_id and
 ((e.phase='training' and (select app_private.is_program_trainer(e.program_id)))
 or (e.phase='internship' and (select app_private.is_program_guide(e.program_id)))
 or (e.published_to_students and quizzes.published
     and e.scheduled_date<=app_private.program_today(e.program_id)
     and (select app_private.is_student_enrolled(e.program_id))))
));

drop policy if exists "student submit unlocked work" on public.submissions;
create policy "student submit unlocked work" on public.submissions for insert to authenticated
with check(student_id=(select auth.uid()) and exists(
 select 1 from public.timeline_events ev where ev.id=submissions.event_id
 and ev.activity_type in ('assignment','project','milestone')
 and ev.published_to_students
 and ev.scheduled_date<=app_private.program_today(ev.program_id)
 and (select app_private.is_student_enrolled(ev.program_id))
));

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
 or (v.published and ev.published_to_students
 and ev.scheduled_date<=app_private.program_today(v.course_id)
 and exists(select 1 from public.enrollments en where en.program_id=v.course_id
   and en.student_id=(select auth.uid()) and en.status in ('active','completed'))
 and exists(select 1 from public.purchases pu where pu.course_id=v.course_id
   and pu.student_id=(select auth.uid()) and pu.status='active'))
 )
) $$;

create or replace function app_private.may_read_course_file(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_program uuid;v_event uuid;
begin
 if auth.uid() is null or path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' then return false;end if;
 v_program:=split_part(path,'/',1)::uuid;
 v_event:=split_part(path,'/',2)::uuid;
 if not exists(select 1 from public.timeline_events ev where ev.id=v_event and ev.program_id=v_program) then return false;end if;
 if app_private.is_admin() or app_private.is_program_trainer(v_program) or app_private.is_program_guide(v_program) then return true;end if;
 if not app_private.is_student_enrolled(v_program) then return false;end if;
 return exists(select 1 from public.timeline_events ev where ev.id=v_event and ev.program_id=v_program
 and ev.published_to_students and ev.scheduled_date<=app_private.program_today(v_program)
 and (exists(select 1 from public.lesson_resources res
   where res.event_id=ev.id and res.storage_path=path and res.published)
  or ev.resource_url='storage://hacksphere-course-files/'||path));
exception when others then return false;
end $$;

create or replace function public.submit_quiz(_quiz_id uuid,_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();quiz_meta record;question_record record;
 choice integer;earned numeric:=0;possible numeric:=0;used_attempts integer:=0;
begin
 if v_uid is null or jsonb_typeof(_answers)<>'object' then raise exception 'Invalid quiz submission';end if;
 select ev.program_id,ev.scheduled_date,ev.published_to_students,z.max_attempts,z.published
 into quiz_meta from public.quizzes z join public.timeline_events ev on ev.id=z.timeline_event_id where z.id=_quiz_id;
 if not found or not quiz_meta.published or not quiz_meta.published_to_students
 or quiz_meta.scheduled_date>app_private.program_today(quiz_meta.program_id)
 or not app_private.is_student_enrolled(quiz_meta.program_id) then
 raise exception 'Quiz not released or Student not enrolled';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||_quiz_id::text,0));
 select count(*) into used_attempts from public.quiz_attempts where quiz_id=_quiz_id and student_id=v_uid;
 if used_attempts>=quiz_meta.max_attempts then raise exception 'Maximum attempts reached';end if;
 for question_record in select ques.id,ques.points,ans.correct_index
 from public.quiz_questions ques join app_private.quiz_answers ans on ans.question_id=ques.id
 where ques.quiz_id=_quiz_id loop
 possible:=possible+question_record.points;
 if _answers?(question_record.id::text) and (_answers->>(question_record.id::text)) ~ '^[0-5]$' then
 choice:=(_answers->>(question_record.id::text))::integer;
 if choice=question_record.correct_index then earned:=earned+question_record.points;end if;
 end if;
 end loop;
 if possible<=0 then raise exception 'Quiz has no questions';end if;
 insert into public.quiz_attempts(quiz_id,student_id,answers,score,max_score)
 values(_quiz_id,v_uid,_answers,earned,possible);
 return jsonb_build_object('score',earned,'max_score',possible,
 'percentage',round(earned*100/possible,2),'attempt',used_attempts+1);
end $$;
revoke all on function public.submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.submit_quiz(uuid,jsonb) to authenticated;
