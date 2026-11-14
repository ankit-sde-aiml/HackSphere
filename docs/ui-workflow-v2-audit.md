# HackSphere — UI/UX v2.2 workflow map & verification

## Brand
Original midnight navy `#0B2230`, deep teal `#087F7B`, warm amber `#F2B654`, warm pearl `#F5F9F7`.
Mobile responsive sidebar, action-first dashboard, accessible focus styles and step-specific forms.

## Distinct URL screens
- Admin: `/workspace/admin/overview`, `/workspace/admin/programs`, `/workspace/admin/program-new`, `/workspace/admin/program-detail/:id`, `/workspace/admin/program-edit/:id`, `/workspace/admin/students`, `/workspace/admin/timeline`, `/workspace/admin/payments`, `/workspace/admin/payment-history`, `/workspace/admin/payment-settings`, `/workspace/admin/staff`, `/workspace/admin/staff-invite`, `/workspace/admin/guides`, `/workspace/admin/reviews`, `/workspace/admin/performance`, `/workspace/admin/complete`, `/workspace/admin/settings`.
- Student: `/workspace/student/overview`, `/workspace/student/courses`, `/workspace/student/classroom/:id`, `/workspace/student/timeline`, `/workspace/student/submissions`, `/workspace/student/sessions`, `/workspace/student/enrollment`, `/workspace/student/performance`, `/workspace/student/documents`, `/workspace/student/profile`.
- Trainer: own programs, timeline, live sessions, submission reviews, training scores, profile.
- Guide: own assigned programs, internship timeline, submission reviews, internship scores, recommendations, profile.
- Isolated demonstration: `/preview/<role>/<screen>`, clearly labelled and does NOT write to the live database.

## Verified results
- Verified first administrator's Google OAuth identity and existing Admin assignment in Supabase.
- Real Supabase has **one Admin**, no real programs/enrollments yet; none were fabricated.
- Cloudflare script deployed to 100% traffic.
- Visual browser checks on desktop and mobile.
- Program wizard preview submitted to program directory with real browser interaction (preview state only).
- Transaction-only database tests, rolled back: training/internship valid dates, rejection of early internship tasks, premature Guide allocation, invalid timezone, and grading without an active enrollment.

## Production blockers
- Trainer-specific Google Meet REST API OAuth, server-side meeting creation, guarded join redirect not yet implemented.
- Configure official UPI ID and QR; bank-credit manual verification required.
- Google OAuth Audience/Publishing for other real students; testing-mode test-user eligibility.
- Secure external email sending for automated invitations is pending a verified sending domain.
- Document print/QR UI exists, but durable auto-generated PDF archival and full real-user QA remain incomplete.
- Free Supabase Storage quotas apply; no promise of unlimited video recording storage.

Keep private Google OAuth client secrets / Supabase elevated keys out of GitHub and frontend code.
