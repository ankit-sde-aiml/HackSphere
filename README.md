# HackSphere

Training + project-based internship platform. This repo was reset for the new HackSphere platform. Previous repository contents are deliberately not carried over.

## Current deployment
Cloudflare Workers serves the public landing page and prepares a Supabase-connected application.
The dashboard uses **real Supabase OAuth and RLS** once a dedicated HackSphere project is configured. Until then it does not accept real enrollment or payment information.

## Project structure
- index.html — responsive public website, role-aware dashboard UI, and Google Sign-In client
- worker.js — Cloudflare Worker application entrypoint and public API configuration
- build.mjs — bundles index.html into Worker for deployment
- db/schema.sql — planned dedicated Supabase schema and row security

## Production configuration required
1. Create a dedicated **HackSphere** Supabase project, without touching any unrelated projects.
2. Run and review the SQL schema in that project, configure Google OAuth provider and authorized redirect URLs.
3. Set Cloudflare Worker secrets/configuration: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (publishable, not service role). NEVER expose privileged keys in frontend or GitHub.
4. Bootstrap the first admin with a verified Google identity after first sign-in.
5. Configure UPI ID and QR and verify actual bank credit before activating enrollments.
6. Configure Google Meet REST API OAuth for trainers and a secure server endpoint for joining classes. The frontend only previews this pending integration.
7. Configure private recording file storage, PDF document generator, and verified sending domain for email.

## Business rules
- Schedule always unlocks **by date**, regardless of assessment scores.
- Training and internship may run sequentially (e.g. 60 + 30 days), with independent per-program dates.
- Admin assigns Internship Guide **at internship start**.
- Same user can hold Trainer and Internship Guide roles and switch contexts.
- Trainer and Guide grade independently; ONLY Admin approves the final certificate.
- Payment is UPI QR + manual real-bank confirmation, not automatic UTR/screenshot trust.
- Google Sign-In only, invitations for staff.
- Do not claim enrollment, payments, Meet integration or certificates are functional without backend tests.
