# Customer (Public Enrollment) — Remaining Setup

This package is the public student enrollment site.

## What is already coded
- Full enrollment form matching original fields, validation, honeypot, 2 MB image limits
- Client-side upload of passport + signature to Supabase Storage
- INSERT into `Enrollments` via Supabase JS client (required for Realtime)
- Original styles.css + logo

## What YOU must do on Linux

1. `cd niksmarvel-customer && npm install`
2. Copy `.env.example` → `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (default `enrollments`)
3. In Supabase Dashboard:
   - Create private Storage bucket `enrollments`
   - Enable Realtime replication on table `Enrollments`
   - RLS: allow `anon` to INSERT on `Enrollments`
   - RLS / Storage policies: allow `anon` to upload to `passport/*` and `signature/*`
4. Deploy to Netlify (separate site from Admin). Set the same public env vars in Netlify UI.
5. Optional: change the footer “Admin portal” URL once you know the admin Netlify domain.

## Shared with Admin
Both sites use the **same** Supabase project and the same `Enrollments` table / Storage bucket.
