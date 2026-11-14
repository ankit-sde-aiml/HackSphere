
alter table public.videos add column if not exists multipart_upload_id text;
alter table public.videos drop constraint if exists videos_size_bytes_check;
alter table public.videos add constraint videos_size_bytes_check check(size_bytes between 1 and 536870912);

create or replace function public.prepare_video_upload(
 _event_id uuid,_title text,_size_bytes bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ev record;v_id uuid:=gen_random_uuid();v_key text;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Google Sign-In required';end if;
 if _size_bytes is null or _size_bytes<1 or _size_bytes>536870912 then
    raise exception 'MP4 size must be 1 byte to 512 MiB';end if;
 if length(trim(coalesce(_title,'')))<3 or length(_title)>180 then
    raise exception 'Recording title length must be 3–180';end if;
 select ev.program_id into v_ev from public.timeline_events ev where ev.id=_event_id;
 if not found then raise exception 'Class not found';end if;
 if not app_private.may_upload_lesson_video(_event_id,v_uid) then
    raise exception 'Only the designated Trainer/Guide who took this class can upload';end if;
 v_key:=v_ev.program_id::text||'/'||_event_id::text||'/'||v_id::text||'.mp4';
 insert into public.videos(id,course_id,lesson_event_id,uploaded_by,title,object_key,size_bytes,mime_type)
 values(v_id,v_ev.program_id,_event_id,v_uid,trim(_title),v_key,_size_bytes,'video/mp4');
 return jsonb_build_object('id',v_id,'object_key',v_key,'max_size_bytes',536870912);
end $$;

create or replace function public.authorize_video_upload(_video_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v record;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Login required';end if;
 select * into v from public.videos where id=_video_id and uploaded_by=v_uid and status='uploading';
 if not found or not app_private.may_upload_lesson_video(v.lesson_event_id,v_uid)
 or now()>v.created_at+interval '24 hours' then
   raise exception 'Recording upload not allowed';end if;
 return jsonb_build_object('id',v.id,'object_key',v.object_key,
   'size_bytes',v.size_bytes,'mime_type',v.mime_type,'multipart_upload_id',v.multipart_upload_id);
end $$;


create or replace function public.set_video_multipart(_video_id uuid,_upload_id text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v record;
begin
 if auth.uid() is null or length(coalesce(_upload_id,''))<5 or length(_upload_id)>300
 then raise exception 'Invalid multipart registration';end if;
 select * into v from public.videos where id=_video_id and uploaded_by=auth.uid()
 and status='uploading' and size_bytes>99614720 for update;
 if not found or v.multipart_upload_id is not null
 or now()>v.created_at+interval '24 hours'
 or not app_private.may_upload_lesson_video(v.lesson_event_id,auth.uid()) then
 raise exception 'Multipart upload not authorized';end if;
 update public.videos set multipart_upload_id=_upload_id where id=_video_id;
 return true;
end $$;
revoke all on function public.set_video_multipart(uuid,text) from public,anon;
grant execute on function public.set_video_multipart(uuid,text) to authenticated;
