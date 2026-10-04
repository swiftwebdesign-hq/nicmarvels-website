# Niksmarvel Fashion Academy — Next.js + Supabase + Prisma + Clerk

Full rebuild of the original Appwrite-based enrollment form and admin portal.

Architecture follows the two provided migration documents:

- **Public form** writes via **Supabase JS client** (so Realtime fires).
- **Admin portal** reads via **Prisma** (type-safe) + subscribes to **Supabase Realtime**.
- **Clerk** provides the admin lock (`org:admin` role) at middleware + page level.
- **Supabase Storage** holds passport photos and signatures.
- Dual Prisma connection strings for PgBouncer / Supavisor compatibility.

## Stack (researched versions)

| Package | Version range used | Notes |
|---------|--------------------|-------|
| Next.js | 16.x | App Router, supported on Netlify via OpenNext |
| React | 19.x | |
| Prisma | 6.x | + `@prisma/adapter-pg` for driver adapter |
| @clerk/nextjs | 6.x | `createRouteMatcher` still works (deprecated in later majors) |
| @supabase/supabase-js | 2.x | |
| Node | ≥ 20 | |

## 1. Supabase setup

1. Create a Supabase project.
2. In SQL Editor run (create dedicated Prisma user):

```sql
create user "prisma" with password 'YOUR_STRONG_PASSWORD' bypassrls createdb;
grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

3. Create a **private** Storage bucket named `enrollments` (or set `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`).
4. Enable Realtime for the `Enrollments` table:
   - Database → Replication → toggle `Enrollments`.
5. Add RLS policies that allow:
   - `anon` INSERT on `Enrollments` (public form)
   - Storage: allow `anon` upload to the bucket paths `passport/*` and `signature/*`.

## 2. Prisma dual connections

`.env` (never commit):

```env
# Runtime (Transaction pooler – port 6543)
DATABASE_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migrations / CLI (Session pooler or direct – port 5432)
DIRECT_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=enrollments
```

Then:

```bash
npm install
npx prisma generate
npx prisma db push   # or migrate dev
```

## 3. Clerk admin lock

1. Create a Clerk application.
2. Create an Organization (e.g. “Ideal Opportunities Admin”).
3. Invite / add your admin user and assign the **org:admin** role.
4. The middleware + admin page both enforce `org:admin`.

Sign-in / sign-up routes are at `/sign-in` and `/sign-up`.

## 4. Local development

```bash
cp .env.example .env.local
# fill values
npm run dev
```

- Public form: http://localhost:3000
- Admin: http://localhost:3000/admin (requires Clerk org:admin)

## 5. Deploy to Netlify

1. Connect the repository.
2. Build command: `npm run build` (already runs `prisma generate`).
3. Add **all** environment variables from `.env.example` in Netlify UI.
4. Deploy.

## Architecture reminder

```
Public Form (Supabase JS) ──INSERT──► Enrollments table ──Realtime──► Admin Dashboard
                                         ▲
Admin (Prisma) ──────────────────────────┘ (reads + mark processed)
```

Do **not** write public enrollments with Prisma if you need instant Realtime updates.

## Common errors (from the pasted docs)

| Error | Fix |
|-------|-----|
| prepared statement already exists | Add `?pgbouncer=true` to `DATABASE_URL` |
| Max client connections | `connection_limit=1` on serverless |
| Realtime not firing | Write via Supabase client, not Prisma |
| Drift detected | Only migrate your own public tables |

This rebuild keeps the exact enrollment fields, file size/type limits, honeypot, and visual language of the original projects while implementing the hybrid Supabase + Prisma + Clerk architecture you specified.
