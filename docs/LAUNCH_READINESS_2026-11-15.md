# HackSphere release readiness — 15 Nov 2026

**Repository:** ankit-sde-aiml/HackSphere  
**Release candidate branch:** `feature/mentor-led-platform-v2`  
**Cloudflare live Worker:** `hacksphere` (legacy HTML/JS app; do not remove yet)  
**New app location:** `apps/web` (Next.js/TypeScript/Tailwind/shadcn-compatible UI)  
**Supabase project:** `wvipkluopmptwuvihecz` (existing database; migrations 017–023)

## Verified automatic checks

- [x] Next.js/TypeScript production build passed.
- [x] Cloudflare vinext compatibility check and production build passed.
- [x] Chromium browser smoke: landing page, program catalog, login, mobile layout and unauthenticated workspace redirects passed.
- [x] SQL transaction smoke (rolled back) created program, assigned mentor, created lecture and Meet schedule atomically, updated lecture and meeting together, and denied unrelated user Admin program creation.
- [x] Core Supabase access checks: unrelated authenticated user could not read program mentor membership or private notifications.
- [x] Certificate SQL trigger requires non-QA enrollment, internship period finished, responsible mentor recommendation, genuine team/guide assignment, and an individual internship evaluation.
- [x] Printable certificate route added. Printing layout not yet visually approved with a real issued certificate.

Latest known CI reference: https://github.com/ankit-sde-aiml/HackSphere/actions/runs/43677233719

## Account-level blockers that cannot safely be bypassed

1. **Cloudflare video:** R2 API replied `Please enable R2 through the Cloudflare Dashboard` (HTTP 403). Stream API replied `Cloudflare Stream not enabled` (HTTP 403). Owner must enable appropriate service/billing and required scope. Do not substitute public video files for protected classroom recordings.
2. **Cloudflare preview:** Connecting HackSphere GitHub repository to Cloudflare Builds returned `project is disconnected from your Git account` (HTTP 404). The live `hacksphere` Worker is deliberately untouched.
3. **Deployment via GitHub Actions:** `preview-deploy` is preconfigured, behind `ENABLE_HACKSPHERE_PREVIEW_DEPLOY` (Actions variable) and requires `CLOUDFLARE_API_TOKEN` and `SUPABASE_PUBLISHABLE_KEY` (Actions secrets). Use a token scoped to Workers Scripts Edit in the correct Cloudflare account. Set these without posting secret values in chat or committing them to Git.
4. **Google OAuth:** Add the *actual, deployed* `https://<preview-worker-domain>/auth/callback` to Supabase Auth URL Configuration after obtaining the preview URL. Then test Google login with a real Admin, Mentor and Student account.
5. **Email:** Cloudflare Email Sending limits API returned HTTP 401 Unauthorized. Domain/sender and email service activation must be established; only in-app notifications are active. Do not send from an unrelated existing zone.
6. **Razorpay:** Merchant onboarding, key ID, key secret and webhook secret have not been supplied/connected. Current enrollment path is **manual official UPI QR/UTR + bank-credit verification**. Do not automatically approve screenshots.
7. **Real live QA:** Browser/SQL synthetic checks pass, but real OAuth, authorized mentor account, real UPI bank receipt, recording upload/playback and printable approved certificate need tests against provisioned services.

## Safe deployment path

1. Enable GitHub repo secrets and `ENABLE_HACKSPHERE_PREVIEW_DEPLOY=true`; trigger a new commit on feature branch (or re-run the workflow).
2. Review GitHub Actions success and obtain the real `hacksphere-next-preview` URL from Cloudflare.
3. Add preview OAuth callback redirect allow-list; validate actual login.
4. Test one **non-test** program end-to-end: create batch, assign program mentors, schedule a lecture/quiz/mini-project, publish, enroll with manually verified bank credit, access only own content, generate five-student in-house groups, submit tasks, mentor evaluation, certificate print/verify.
5. Enable protected video service and configure any provider-specific credentials in server/Workers secrets only.
6. After preview is accepted, promote/replace production Worker and monitor auth, payments, recording and RLS errors.
7. **Only then** remove unused legacy `assets/app.js`, HTML/CSS Worker and obsolete database objects after taking a backup, checking consumers and applying reversible migrations.

## Never turn off

- RLS and DB-side authorization.
- Manual bank-credit verification while only static UPI QR/UTR is available.
- Exact responsible-mentor edit permissions.
- Test-cohort exclusions from real certificates.
- Private meeting link time gates.
- Verified completion evidence.
