-- Daily 06:00 IST team allocation (00:30 UTC).
-- Only due, non-test programs with verified active enrollments are considered.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $cron$
begin
 if not exists(select 1 from cron.job where jobname='hacksphere-auto-internship-teams') then
  perform cron.schedule('hacksphere-auto-internship-teams','30 0 * * *',
    'select app_private.allocate_due_internship_teams();');
 end if;
end $cron$;
