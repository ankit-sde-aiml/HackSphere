# HackSphere

Training + project-based internship platform with independently scheduled programs.

## Stack
Cloudflare Workers (hosting), Supabase (Google Sign-In and Postgres), Google Meet REST API (meeting creation when OAuth configured), OBS recordings (manual upload), UPI QR with manual payment verification.

## Status
Production deployment requires a dedicated Supabase project, Google Auth provider setup, verified admin Google identity, and optional Google Meet OAuth client credentials. No credentials belong in the repository.

## Important rules
- Date-wise release of training and internship activities; not gated by training score.
- Admin allocates internship guide when internship starts.
- Staff may have Trainer and Guide roles with role switching.
- Trainer and Guide score independently; only Admin approves certificates.
- UPI payment must be manually verified against actual bank credit before activating enrollment.
