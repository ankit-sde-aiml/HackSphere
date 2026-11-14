-- Import dated training/internship curriculum and schedule live classes in one atomic transaction.
-- Google Meet spaces are not claimed to exist until trainer OAuth grants the API scope.
alter table public.live_sessions add column if not exists meet_status text not null default 'pending_authorization'
check(meet_status in ('pending_authorization','ready','failed','not_required'));
alter table public.live_sessions add column if not exists meet_error text;
alter table public.live_sessions add column if not exists provider_space_name text;
create index if not exists ix_hs_session_pending_meet on public.live_sessions(meet_status,session_date)
where meet_status in ('pending_authorization','failed');

drop policy if exists "session scheduled access" on public.live_sessions;
create policy "session scheduled access" on public.live_sessions for select to authenticated
using((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id))
or (select app_private.is_program_guide(program_id)) or (select app_private.is_student_enrolled(program_id)));
drop policy if exists "staff schedule session" on public.live_sessions;
create policy "staff schedule session" on public.live_sessions for insert to authenticated
with check((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id))
or (select app_private.is_program_guide(program_id)));
drop policy if exists "staff edit session" on public.live_sessions;
create policy "staff edit session" on public.live_sessions for update to authenticated
using((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id))
or (select app_private.is_program_guide(program_id)))
with check((select app_private.is_admin()) or (select app_private.is_program_trainer(program_id))
or (select app_private.is_program_guide(program_id)));

create or replace function public.import_program_schedule(_program_id uuid,_rows jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_program record; rec jsonb; n integer; phase_name text; typ text; event_date date;
 start_at time; mins integer; event_id uuid; done integer:=0; duplicate_count integer:=0; live_count integer:=0;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 select * into v_program from public.programs where id=_program_id;
 if not found then raise exception 'Program not found'; end if;
 if jsonb_typeof(_rows)<>'array' or jsonb_array_length(_rows)=0 or jsonb_array_length(_rows)>3650
 then raise exception 'CSV must contain 1–3650 rows'; end if;
 for rec in select value from jsonb_array_elements(_rows) loop
  if coalesce(rec->>'day','') !~ '^[0-9]{1,4}$' then raise exception 'Invalid day number'; end if;
  n:=(rec->>'day')::integer;
  if n<1 or n>v_program.training_days+v_program.internship_days then raise exception 'Day % outside program',n; end if;
  phase_name:=case when n<=v_program.training_days then 'training' else 'internship' end;
  if coalesce(rec->>'phase','')<>phase_name then raise exception 'Day % must be % phase',n,phase_name; end if;
  if not (app_private.is_admin() or (phase_name='training' and app_private.is_program_trainer(_program_id))
   or (phase_name='internship' and app_private.is_program_guide(_program_id))) then raise exception 'Not assigned to %',phase_name; end if;
  typ:=coalesce(rec->>'activity_type','');
  if typ not in ('lecture','recording','assignment','quiz','project','milestone','resource') then
   raise exception 'Invalid activity type at day %',n; end if;
  if length(trim(coalesce(rec->>'title','')))<3 or length(rec->>'title')>160 then raise exception 'Invalid activity title at day %',n; end if;
  event_date:=v_program.start_date+n-1;
  if exists(select 1 from public.timeline_events e where e.program_id=_program_id and e.scheduled_date=event_date and e.title=(rec->>'title')) then
   duplicate_count:=duplicate_count+1;continue;end if;
  insert into public.timeline_events(program_id,phase,activity_type,scheduled_date,title,description,created_by)
   values(_program_id,phase_name,typ,event_date,rec->>'title',left(coalesce(rec->>'description',''),8000),auth.uid())
   returning id into event_id;
  done:=done+1;
  if lower(coalesce(rec->>'live','no')) in ('yes','true','1') then
   if typ not in ('lecture','project','milestone') then raise exception 'Live class only for lecture/project/milestone at day %',n; end if;
   if coalesce(rec->>'start_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid class time at day %',n; end if;
   start_at:=(rec->>'start_time')::time;
   mins:=coalesce(nullif(rec->>'duration_minutes','')::integer,60);
   if mins<5 or mins>480 then raise exception 'Invalid class duration at day %',n; end if;
   insert into public.live_sessions(program_id,timeline_event_id,title,session_date,start_time,duration_minutes,status,trainer_user_id,meet_status)
   values(_program_id,event_id,'Live: '||(rec->>'title'),event_date,start_at,mins,'scheduled',
     coalesce(
       case when phase_name='training' then (select ps.user_id from public.program_staff ps where ps.program_id=_program_id and ps.role='trainer' order by ps.assigned_at limit 1)
       else (select pg.user_id from public.program_guides pg where pg.program_id=_program_id order by pg.assigned_at limit 1) end,
       auth.uid()),
       'pending_authorization');
   live_count:=live_count+1;
  end if;
 end loop;
 return jsonb_build_object('inserted',done,'duplicates_skipped',duplicate_count,'live_classes_scheduled',live_count,
 'meet_creation_status','pending_trainer_oauth');
end $$;
revoke all on function public.import_program_schedule(uuid,jsonb) from public,anon;
grant execute on function public.import_program_schedule(uuid,jsonb) to authenticated;

-- Ensure only verified enrolled users can attempt a quiz, and scores cannot be written by clients.
revoke insert,update,delete on public.quiz_questions from authenticated,anon;
revoke insert,update,delete on public.quiz_attempts from authenticated,anon;
