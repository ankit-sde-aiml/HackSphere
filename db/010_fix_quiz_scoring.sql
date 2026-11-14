-- Fix PL/pgSQL variable / SQL alias collision found by impersonated Student quiz test.
create or replace function public.submit_quiz(_quiz_id uuid,_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();
 quiz_meta record;
 question_record record;
 choice integer;
 earned numeric:=0;
 possible numeric:=0;
 used_attempts integer:=0;
begin
 if v_uid is null or jsonb_typeof(_answers)<>'object' then raise exception 'Invalid quiz submission'; end if;
 select ev.program_id,ev.scheduled_date,z.max_attempts,z.published
 into quiz_meta
 from public.quizzes z join public.timeline_events ev on ev.id=z.timeline_event_id
 where z.id=_quiz_id;
 if not found or not quiz_meta.published
 or quiz_meta.scheduled_date>app_private.program_today(quiz_meta.program_id)
 or not app_private.is_student_enrolled(quiz_meta.program_id)
 then raise exception 'Quiz not released or student not enrolled'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||_quiz_id::text,0));
 select count(*) into used_attempts from public.quiz_attempts
 where quiz_id=_quiz_id and student_id=v_uid;
 if used_attempts>=quiz_meta.max_attempts then raise exception 'Maximum quiz attempts used'; end if;
 for question_record in
   select ques.id,ques.points,ans.correct_index
   from public.quiz_questions ques
   join app_private.quiz_answers ans on ans.question_id=ques.id
   where ques.quiz_id=_quiz_id
 loop
   possible:=possible+question_record.points;
   if _answers ? (question_record.id::text) and
      (_answers->>(question_record.id::text)) ~ '^[0-5]$' then
     choice:=(_answers->>(question_record.id::text))::integer;
     if choice=question_record.correct_index then earned:=earned+question_record.points; end if;
   end if;
 end loop;
 if possible<=0 then raise exception 'Quiz has no questions'; end if;
 insert into public.quiz_attempts(quiz_id,student_id,answers,score,max_score)
 values(_quiz_id,v_uid,_answers,earned,possible);
 return jsonb_build_object('score',earned,'max_score',possible,
 'percentage',round(earned*100/possible,2),'attempt',used_attempts+1);
end $$;
revoke all on function public.submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.submit_quiz(uuid,jsonb) to authenticated;
