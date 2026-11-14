-- HackSphere FIRST ADMIN bootstrap template.
-- Only run AFTER the intended admin has signed into HackSphere with Google
-- and AFTER replacing the placeholder with the correct, authorized address.
-- Run in the SQL Editor of the DEDICATED HackSphere project ONLY.
-- This script intentionally grants no privileges if matching identity is missing.
DO $bootstrap$
DECLARE
  intended_admin_email text := 'REPLACE_WITH_AUTHORIZED_GOOGLE_EMAIL@example.com';
  approved_id uuid;
BEGIN
  IF intended_admin_email LIKE 'REPLACE_WITH_%' THEN
    RAISE EXCEPTION 'Replace the admin email placeholder with the authorized Google address';
  END IF;

  IF EXISTS (SELECT 1 FROM public.staff_roles WHERE role='admin') THEN
    RAISE EXCEPTION 'An administrator already exists. Use a deliberate admin management process.';
  END IF;

  SELECT u.id INTO approved_id
  FROM auth.users u
  JOIN auth.identities i ON i.user_id=u.id
  WHERE lower(u.email)=lower(intended_admin_email)
    AND i.provider='google'
    AND lower(i.identity_data->>'email')=lower(intended_admin_email)
    AND coalesce(lower(i.identity_data->>'email_verified'),'false')='true'
  LIMIT 1;

  IF approved_id IS NULL THEN
    RAISE EXCEPTION 'No matching verified Google login exists for this email. Sign in with Google first.';
  END IF;

  INSERT INTO public.staff_roles(user_id,role,assigned_by)
  VALUES(approved_id,'admin',approved_id)
  ON CONFLICT(user_id,role) DO NOTHING;

  RAISE NOTICE 'First administrator role created for verified Google identity %',approved_id;
END;
$bootstrap$;
