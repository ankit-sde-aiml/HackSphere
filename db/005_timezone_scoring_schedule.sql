-- HackSphere 2026-11-14: per-program timezones and assessment integrity.
-- Dedicated HackSphere project only. Non-destructive columns/policy hardening.

ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';

CREATE OR REPLACE FUNCTION app_private.validate_program_timezone()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=NEW.timezone) THEN
  RAISE EXCEPTION 'Invalid IANA timezone: %',NEW.timezone;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hacksphere_validate_program_timezone ON public.programs;
CREATE TRIGGER hacksphere_validate_program_timezone
BEFORE INSERT OR UPDATE OF timezone ON public.programs
FOR EACH ROW EXECUTE FUNCTION app_private.validate_program_timezone();

CREATE OR REPLACE FUNCTION app_private.program_today(p_program_id uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT (now() at time zone coalesce(
  (SELECT p.timezone FROM public.programs p WHERE p.id=p_program_id),
  'Asia/Kolkata'
))::date;
$$;
REVOKE ALL ON FUNCTION app_private.program_today(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION app_private.program_today(uuid) TO authenticated;

-- Public schedule metadata may be visible ahead of time, but private Meet join URL stays in app_private.meeting_links.
DROP POLICY IF EXISTS "session scheduled access" ON public.live_sessions;
CREATE POLICY "session scheduled access" ON public.live_sessions FOR SELECT TO authenticated USING (
 (select app_private.is_admin()) OR (select app_private.is_program_trainer(program_id))
 OR (select app_private.is_student_enrolled(program_id))
);

-- Student timeline items are released based on that program's trusted local date.
DROP POLICY IF EXISTS "timeline scheduled access" ON public.timeline_events;
CREATE POLICY "timeline scheduled access" ON public.timeline_events FOR SELECT TO authenticated USING (
 (select app_private.is_admin()) OR
 (phase='training' and (select app_private.is_program_trainer(program_id))) OR
 (phase='internship' and (select app_private.is_program_guide(program_id))) OR
 (scheduled_date <= (select app_private.program_today(program_id))
   and (select app_private.is_student_enrolled(program_id)))
);

DROP POLICY IF EXISTS "student submit unlocked work" ON public.submissions;
CREATE POLICY "student submit unlocked work" ON public.submissions FOR INSERT TO authenticated WITH CHECK (
 student_id=(select auth.uid()) and
 exists (select 1 from public.timeline_events ev where ev.id=event_id
  and ev.scheduled_date <= (select app_private.program_today(ev.program_id))
  and (select app_private.is_student_enrolled(ev.program_id)))
);

DROP POLICY IF EXISTS "guide recommend after internship" ON public.completion_recommendations;
CREATE POLICY "guide recommend after internship" ON public.completion_recommendations FOR INSERT TO authenticated
WITH CHECK (guide_user_id=(select auth.uid()) and (select app_private.is_student_guide(program_id,student_id))
and exists (select 1 from public.programs p where p.id=program_id
and (select app_private.program_today(p.id))>=p.start_date+p.training_days+p.internship_days-1));

CREATE OR REPLACE FUNCTION app_private.require_internship_started()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE start_on date;
BEGIN
 SELECT (start_date+training_days) INTO start_on FROM public.programs WHERE id=NEW.program_id;
 IF start_on IS NULL OR app_private.program_today(NEW.program_id) < start_on THEN
  RAISE EXCEPTION 'Internship Guide allocation allowed only from internship start date';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.enrollments e
 WHERE e.program_id=NEW.program_id AND e.student_id=NEW.student_id AND e.status='active') THEN
  RAISE EXCEPTION 'Student is not actively enrolled';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.staff_roles r
 WHERE r.user_id=NEW.guide_user_id AND r.role='guide') THEN
  RAISE EXCEPTION 'Guide role is not assigned';
 END IF;
 RETURN NEW;
END $$;

-- Assessment data must belong to a verified enrollment. Guide scores require Guide allocation.
CREATE OR REPLACE FUNCTION app_private.validate_evaluation_enrollment()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.enrollments e
  WHERE e.program_id=NEW.program_id AND e.student_id=NEW.student_id
  AND e.status IN ('active','completed')) THEN
   RAISE EXCEPTION 'Cannot score: student lacks verified enrollment in this program';
 END IF;
 IF NEW.phase='internship' AND NOT EXISTS (
  SELECT 1 FROM public.guide_allocations g
   WHERE g.program_id=NEW.program_id AND g.student_id=NEW.student_id
  ) THEN
   RAISE EXCEPTION 'Cannot score internship: no guide allocation exists';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hacksphere_eval_enrollment ON public.evaluations;
CREATE TRIGGER hacksphere_eval_enrollment BEFORE INSERT OR UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION app_private.validate_evaluation_enrollment();

-- Resource release depends on the activity's actual program timezone.
CREATE OR REPLACE FUNCTION app_private.may_read_course_file(path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; eid uuid;
BEGIN
 IF path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' THEN RETURN false; END IF;
 pid:=split_part(path,'/',1)::uuid;
 eid:=split_part(path,'/',2)::uuid;
 IF NOT EXISTS (SELECT 1 FROM public.timeline_events t
   WHERE t.id=eid AND t.program_id=pid) THEN RETURN false; END IF;
 IF app_private.is_admin() OR app_private.is_program_trainer(pid)
    OR app_private.is_program_guide(pid) THEN RETURN true; END IF;
 RETURN EXISTS(SELECT 1 FROM public.timeline_events t WHERE t.id=eid
  AND t.program_id=pid AND t.scheduled_date<=app_private.program_today(pid))
  AND app_private.is_student_enrolled(pid);
EXCEPTION WHEN others THEN RETURN false;
END $$;

CREATE INDEX IF NOT EXISTS ix_hs_session_date ON public.live_sessions(program_id,session_date);
