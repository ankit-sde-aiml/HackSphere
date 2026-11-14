-- Only assigned staff can register an actual Google-created space, and only
-- verified active students can obtain a link near a class's scheduled window.
create or replace function public.register_meet_space(
 _session_id uuid,_meet_uri text,_space_name text default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare ses record; pr record;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 select * into ses from public.live_sessions where id=_session_id;
 if not found then raise exception 'Live session not found'; end if;
 if not (app_private.is_admin() or app_private.is_program_trainer(ses.program_id) or
  app_private.is_program_guide(ses.program_id)) then raise exception 'Assigned teaching staff required'; end if;
 if _meet_uri !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}([?][a-zA-Z0-9&=._-]+)?$' then
  raise exception 'Google Meet meeting URI must have the expected format'; end if;
 if _space_name is not null and _space_name !~ '^spaces/[a-zA-Z0-9_-]+$' then
  raise exception 'Invalid Google Meet space name'; end if;
 insert into app_private.meeting_links(session_id,meet_uri,created_by)
 values(_session_id,_meet_uri,auth.uid())
 on conflict(session_id) do update set meet_uri=excluded.meet_uri,created_by=excluded.created_by,created_at=now();
 update public.live_sessions set meet_status='ready',meet_error=null,provider_space_name=_space_name,trainer_user_id=auth.uid()
 where id=_session_id;
 return true;
end $$;
revoke all on function public.register_meet_space(uuid,text,text) from public,anon;
grant execute on function public.register_meet_space(uuid,text,text) to authenticated;

create or replace function public.get_my_session_join_uri(_session_id uuid)
returns text language plpgsql stable security definer set search_path='' as $$
declare ses record; scheduled_at timestamptz; link text;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 select ls.*,pr.timezone into ses from public.live_sessions ls
 join public.programs pr on pr.id=ls.program_id where ls.id=_session_id;
 if not found or ses.status<>'scheduled' or ses.meet_status<>'ready' then
  raise exception 'Meeting is not available'; end if;
 if not (app_private.is_admin() or app_private.is_program_trainer(ses.program_id) or
  app_private.is_program_guide(ses.program_id)) then
  if not app_private.is_student_enrolled(ses.program_id) then raise exception 'Enrollment required'; end if;
  scheduled_at:=((ses.session_date::text||' '||ses.start_time::text)::timestamp at time zone ses.timezone);
  if now()<scheduled_at-interval '15 minutes' or
      now()>scheduled_at+make_interval(mins=>ses.duration_minutes+15) then
   raise exception 'Meeting is accessible only near its scheduled class time'; end if;
 end if;
 select ml.meet_uri into link from app_private.meeting_links ml where ml.session_id=_session_id;
 if link is null then raise exception 'Meeting link not yet created'; end if;
 return link;
end $$;
revoke all on function public.get_my_session_join_uri(uuid) from public,anon;
grant execute on function public.get_my_session_join_uri(uuid) to authenticated;

-- Do not expose meeting links through direct client database SELECT.
revoke all on app_private.meeting_links from anon,authenticated;
