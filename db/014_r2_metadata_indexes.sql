create index if not exists ix_hs_lesson_resources_creator_fk on public.lesson_resources(created_by);
create index if not exists ix_hs_purchases_approver_fk on public.purchases(approved_by) where approved_by is not null;
create index if not exists ix_hs_videos_event_fk on public.videos(lesson_event_id);
create index if not exists ix_hs_videos_uploader_fk on public.videos(uploaded_by);