# HackSphere — Student LMS + Private R2 Video Integration QA

**Audit date:** 14 November 2026  
**Live site:** https://hacksphere.sipl-test-dev.workers.dev  
**Repository:** https://github.com/ankit-sde-aiml/HackSphere  
**Supabase project:** wvipkluopmptwuvihecz  
**Cloudflare Worker:** `hacksphere`

## Release verdict

**PARTIALLY COMPLETE — NOT YET APPROVED FOR LIVE VIDEO PRODUCTION**

The Student/Trainer/Guide interfaces, secure backend models, and Worker code are deployed.
**Cloudflare R2 is not enabled on this account**, so the requested `private-course-videos` bucket cannot yet be created, the `COURSE_VIDEOS` binding cannot be attached, and an actual MP4 upload/play/seek cannot be completed.

Cloudflare API `GET /accounts/{account_id}/r2/buckets` and `POST /accounts/{account_id}/r2/buckets` both returned **HTTP 403 / error 10042: Please enable R2 through the Cloudflare Dashboard**.

No production video was fabricated or uploaded. No fake payment approval was recorded.

## Implemented database changes

- `public.courses`: one-to-one mapped to existing `programs` (keeps catalog, dates and fees in one source of truth).
- `public.purchases`: student/course, status `active/pending/refunded/revoked`, verified source, QA flag; Admin-only writes and Student self-only SELECT with RLS.
- `public.videos`: MP4 metadata, R2 object key, uploader, lesson, status, ready/published flags, byte length, optional multipart upload ID. **No large MP4 blobs stored in Postgres**.
- Triggers create one purchase after verified Admin-approved enrollment or explicit QA authorization, not after a UTR claim alone.
- Approved QA Python test seat is separately marked `qa_test` and does not imply bank credit.
- Server RPCs `prepare_video_upload`, `authorize_video_upload`, `set_video_multipart`, `finish_video_upload`, `authorize_video_stream`, `set_video_published` implement authorization.
- Four missing FK indexes added after Supabase performance advisor review.

### Teaching and calendar authorization

- Training video upload: **designated Trainer** for the program.
- Internship video upload: **designated Internship Guide** for the program.
- If a scheduled live class is tied to the lesson, only its **designated host** can upload a recording **after the planned class end time**.
- Admin cannot publish classroom lessons without an assigned teaching role.
- Student lesson list requires **both** Trainer/Guide publication and scheduled date; scores never control timeline unlocking.
- Notes, quizzes, assignments, videos and old protected course files also respect publication/date restrictions.
- Completed legitimate enrollments retain purchased course access. Suspended/revoked/refunded purchases block video streaming.

## Cloudflare Worker gateway (deployed, R2 binding pending)

| Route | Function |
|---|---|
| `GET /api/videos/status` | Reports R2 binding availability |
| `POST /api/videos/prepare` | Verifies Supabase JWT + teacher authorization; creates upload metadata |
| `PUT /api/videos/{id}/upload` | Streams a single MP4 up to 95 MiB |
| `PUT /api/videos/{id}/parts/{n}` | Uploads one 8 MiB R2 multipart chunk |
| `POST /api/videos/{id}/complete` | Completes/validates a multipart recording up to 512 MiB |
| `POST /api/videos/{id}/session` | Checks active purchase/released lesson and issues a scoped HttpOnly session cookie |
| `GET/HEAD /api/videos/{id}/stream` | Verifies authenticated identity and active purchase, serves R2 with `Range` / `206 Partial Content` |

Each streaming request validates Supabase identity plus the database authorization RPC. R2 object keys are **not** public URLs. No public R2 domain is planned.

**Current live endpoint result:** `GET /api/videos/status` returned `{"r2Connected":false,"maxUploadBytes":536870912,"chunkBytes":8388608,"accept":"video/mp4"}`.

## QA test evidence

| Test | Status | Evidence |
|---|---|---|
| Supabase `courses/videos/purchases` tables created | PASS | SQL schema inspected |
| Existing QA enrollment generates a test purchase | PASS | `qa_test` active row |
| Student attempts to self-create purchase | PASS: DENIED | Purchase RLS error `42501` |
| Trainer requests 120 MiB upload metadata | PASS | SQL role test, transaction rolled back |
| Student requests upload metadata | PASS: DENIED | `prepare_video_upload` rejects request |
| Future live-class host attempts premature upload | PASS: DENIED | Server-side date/time guard |
| Student sees only released published lesson metadata | PASS | Day 1: 2 QA items; future: 0 |
| Trainer published notes release the lesson | PASS | Transactional insert test, rolled back |
| Admin-only publication attempt | PASS: DENIED | Database trigger rejected |
| Student accesses today’s active purchased test video metadata | PASS | Synthetic metadata transaction, rolled back |
| Student sees future recording | PASS: DENIED | RLS returned zero rows |
| Revoked purchase attempts video access | PASS: DENIED | RLS returned zero rows |
| HTTP Range parser: full, prefix, open-ended, suffix, invalid | PASS | 8 / 8 isolated parser cases |
| Mobile 390px Student Overview horizontal overflow | PASS | Live Cloudflare Browser Rendering: 0px |
| Tablet 768px Classroom horizontal overflow and tabs | PASS | Live browser HTML: 0px, four tabs |
| Full desktop visual regression across every view | PARTIAL | Earlier desktop preview checks; latest complete regression not run |
| Actual R2 bucket creation/private domain check | BLOCKED | R2 subscription not enabled |
| Real MP4 upload to R2 | BLOCKED | No bucket/binding |
| Real 206 response containing MP4 bytes | BLOCKED | No bucket/object |
| Real browser seek on protected MP4 | BLOCKED | No uploaded file |
| End-to-end Trainer/Guide with real consent/sessions | UNVERIFIED | Needs real logins and class video |

Tests use real Supabase role-based SQL checks for identity boundaries. Temporary metadata rows were rolled back. These are not substitutes for a live MP4 upload test.

## Student and teaching experience

Student:
- Clean navy/white/lavender Student dashboard with My Courses, Explore Programs, Course Information, Enrollment and Calendar.
- Video-first responsive Classroom with Overview, Notes, Tasks and Quiz tabs.
- Only staff-published lessons that have reached their calendar date are shown.
- Protected R2 playback is preferred when available; no fabricated recording is shown.
- Mobile navigation uses five main destinations with larger touch targets.

Trainer/Guide:
- Assigned class recording upload UI.
- MP4 single upload or 8 MiB chunked multipart upload, limit 512 MiB per file.
- Resource authoring remains for small PDF/notes/images in Supabase Storage, not MP4 video BLOBs.
- Quiz, assignment and published lesson controls preserved.
- Publish/hide recording button available to the uploader.

## Free-tier usage

R2 Standard is planned for video bytes and Supabase for small metadata and notes. This reduces Supabase storage pressure and avoids routing heavy MP4 traffic through Postgres. Worker streams data rather than buffering an entire recording. Multipart uploads use 8 MiB parts.

As of the verified Cloudflare documentation, R2 Standard includes 10 GB-month of storage, 1 million Class A and 10 million Class B operations per month free, and no egress charge. **The R2 subscription requires Dashboard activation and usage beyond free allowances can be billable.** The 512 MiB limit is an app-level safeguard, not a guarantee that aggregate usage stays free.

Official sources:
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

## Exact unresolved dependency

1. Owner opens Cloudflare Dashboard → Storage & Databases → R2 and completes the **R2 activation/checkout** after reviewing any billing terms.
2. Create **private** bucket `private-course-videos` with **Standard** class, or re-run the connected API action.
3. Explicitly ensure managed `r2.dev` access **disabled** and no R2 custom public domain enabled.
4. Bind the bucket to the existing `hacksphere` Worker as `COURSE_VIDEOS`, preserving Supabase environment configuration; redeploy.
5. Sign in as an assigned Trainer, upload an actual eligible MP4, publish it, and test Student purchase/unauthorized user cases.
6. Validate real `206 Content-Range`, seeking to middle/end, multi-device playback, upload failure recovery and long-video token renewal.

**Owner action is required for step 1. All later R2-dependent steps remain pending until R2 is enabled.**

## Remaining caveats

- Live gateway MP4 streaming was not exercised because no R2 objects exist; unit-tested range logic must not be confused with an integration test.
- Some browser render attempts were rate-limited by Cloudflare (HTTP 429); tablet and mobile samples passed, full cross-browser approval still pending.
- You should not describe the platform as entirely bug-free or fully production-approved until video and payment-gateway flows have real end-to-end evidence.
- Passwords, service-role keys, billing credentials and private access tokens are not required in GitHub or the chat.

## Decision

**Backend security and Student presentation changes: ACCEPTED for continued testing.**  
**R2 video production release: NOT APPROVED YET (R2 activation + real media QA outstanding).**
