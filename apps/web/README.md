# HackSphere — Next.js 16 migration workspace

This is the new TypeScript + Next.js App Router + Tailwind CSS v4 + shadcn/ui-compatible shell **inside the existing HackSphere repository**. It reuses the existing Supabase project (not a new database).

## Current scope

- Working source scaffolding: marketing, program listing/details, Google OAuth callback, protected Admin/Mentor/Student dashboard entry points.
- Supabase migrations `017`–`022` are **already applied to the existing HackSphere database**, covering shared mentors, scheduled lesson owners, RLS controls, in-house team groups, in-app event notifications and automated internship allocation (daily 06:00 IST).
- The existing root HTML/JS Worker remains the live application; the Next.js app is an independent source migration until release acceptance.
- Admin: course templates, independent batch builder, mentor allocation, scheduled lectures and weekly mini-projects, Google Meet links, company-agnostic global guest events, internship team generation, UPI QR settings, actual bank-credit payment approval, and certificate approval.
- Mentor: common program schedule and progress, assigned lesson notes/PDFs/quizzes, assigned team major projects, student task approvals, final internship evaluation and completion recommendations.
- Student: public program catalog, official UPI proof upload and enrollment verification, secure lessons, quizzes, individual mini-project submissions, team internship work, Google Meet joining, global events and certificate verification.
- Source compilation (Next.js TS + vinext/Workers) has passed GitHub Actions for earlier commits. Always check the latest feature-branch run for newly added screens.
- **Not yet complete:** Cloudflare preview/runtime deployment, browser E2E + production OAuth redirect allow-list; Cloudflare Stream/R2 enablement and video pipeline; fully automated email notifications, real Razorpay integration (merchant credentials needed), and full certificate layout/print QA.
- No payment confirmation may be based solely on a UPI screenshot or UTR; Admin must verify real bank credit.

## Setup

1. In `apps/web`, run `npm install`.
2. Copy `.env.example` to `.env.local`, insert the **publishable** Supabase key (not a service-role key).
3. Add `http://localhost:3000/auth/callback` and eventual production callback URL to Supabase Auth redirect allow-list.
4. Run `npm run dev` and then `npm run typecheck && npm run build`.
5. When local verification succeeds, initialize Cloudflare vinext:
   `npx vinext check`
   `npx vinext init --platform=cloudflare --name hacksphere-next-preview --cdn-cache=none --data-cache=none --image-optimization=none --no-prerender`
6. Commit generated `vite.config.ts` and `cloudflare.config.ts`; run `npx @vinext/cloudflare deploy` to the **preview** Worker first. Do not target the current `hacksphere` Worker until the replacement passes acceptance tests.

Cloudflare documentation: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

## Security baseline

- Authenticated server components call `supabase.auth.getUser()` and rely on Supabase RLS.
- Users cannot select a role client-side to bypass Admin or Mentor permissions.
- Existing Worker payment, video and meeting secrets must not be moved into `NEXT_PUBLIC_` variables.
- Configure **no caching of private personalized pages** at the edge.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## Rollout checklist

- [x] CI TypeScript/Next.js build passed on earlier commits; check the latest run
- [x] CI Cloudflare vinext/Workers build passed on earlier commits; check the latest run
- [ ] Google OAuth callback works with authorized redirect URL
- [ ] Real student account cannot reach Admin/Mentor actions
- [ ] Course and program pages render without leaking unpublished test data
- [ ] Mentor can manage only assigned classes and teams
- [ ] Guest event private join URLs are not exposed early
- [ ] UPI payment verification is reviewed against actual bank credit
- [ ] Cloudflare preview deployment and smoke tests pass

No automatic deletions of legacy files, Cloudflare Workers, or Supabase tables should happen before the replacement passes these checks.

