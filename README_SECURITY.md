# Security, Authentication & Privacy Notes

## Backend & Authentication (`Supabase`)
- **Authentication & RLS**: OptiStance uses **Supabase Authentication** and PostgreSQL **Row-Level Security (RLS)** (`supabase/schema.sql` and `supabase/migrations/`).
- **Environment Keys**:
  - Client-side code (`src/services/supabaseService.ts`) uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` environment variable. If needed for local CLI scripts (`scripts/create-test-user.mjs`), store it only in `.env.admin.local` (git-ignored).
- **Server-Owned Profile Fields**:
  - `role` (`'athlete' | 'admin'`), `is_verified`, and `verification_status` on `public.users` are controlled strictly on the server via `SECURITY DEFINER` RPCs (`request_verification`, `review_verification`, `admin_set_user_password`) and RLS policies (`public.is_admin()`).
  - Client profile edits are restricted at the type and API level to `EditableProfileFields` (`Pick<UserProfile, 'name' | 'specialty'>` in `src/app/types.ts`).

## Per-Account Local Storage Isolation
- `src/services/accountStorage.ts` namespaces cached practice sessions and pose mastery by user ID (`optistance_sessions:<userId>`, `optistance_poses:<userId>`, `optistance_synced_sessions:<userId>`).
- Signing out calls `supabaseSignOut()` and `clearAccountData(accountId)` so subsequent users or guests on a shared device cannot view or inherit a previous athlete's history.

## Storage Bucket Policies
- **`pose-images`** (5 MB max) and **`pose-videos`** (50 MB max) are public-read for syllabus display, while `INSERT`, `UPDATE`, and `DELETE` are restricted by RLS to authenticated administrators (`public.is_admin()`).

## Recommended Production Hardening
1. Enforce HTTPS and HSTS on web hosting; Capacitor Android uses `androidScheme: "https"` in `capacitor.config.json`.
2. Configure custom SMTP in Supabase Authentication for production email delivery and password resets.
3. Keep all migrations in `supabase/migrations/` applied so `joint_angle_standards`, `users`, `practice_sessions`, and `support_tickets` retain strict RLS enforcement.
4. Run `npm audit` and `npm run ci` regularly in CI (`.github/workflows/ci.yml`).
