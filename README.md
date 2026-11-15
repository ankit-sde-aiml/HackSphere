# HackSphere — one existing project

The **single live Hacksphere application** runs in Cloudflare Worker `hacksphere`, reusing the existing Supabase project `wvipkluopmptwuvihecz` and its already-configured Google OAuth login.

## Live application
- Cloudflare Worker: `hacksphere`
- Public URL: https://hacksphere.sipl-test-dev.workers.dev/
- Source of truth: repository `main`, built with `node build.mjs` from `worker.js`, `index.html`, `assets/app.js` and `assets/style.css`.
- Mentors, training schedules, mini-projects, in-house internship teams, global sessions, notifications and security use the same Supabase project. DB migrations 017–023 are applied.
- UPI / QR enrollment with manual real bank-credit approval is the active payment implementation. Admin must enter the official UPI ID and optional HTTPS QR URL in UPI settings; until then students must not send payments.
- Razorpay is labeled **Coming Soon**. No automatic online payment checkout is active.
- Recorded lectures remain **Coming Soon**; activating R2/Stream or changing the storage pipeline is deferred.
- Supabase's existing real Google OAuth login is retained as-is; no second Auth or DB project has been created.

## Build and verify
```bash
node build.mjs
node --check assets/app.js
node --check dist/worker.js
```

## Operational guardrails
- Google OAuth sign-in returns to the same Worker origin.
- Protect RLS, video private endpoints and per-class/team mentor ownership.
- Verify actual bank credit before approving UPI claims.
- The old Next.js v2 experiment under the feature branch is not used for deployment; do not deploy it or create a second Worker.
- Current Worker production deployment settings and plaintext Supabase bindings must be preserved on upload.
