# Supabase Integration Setup Guide

## Overview
This guide walks you through setting up Supabase as the backend database, authentication provider, and media storage for **OptiStance**.

## Prerequisites
- Supabase account (https://supabase.com)
- Node.js 18+ and npm/pnpm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Fill in:
   - **Name**: `optistances`
   - **Database Password**: Create a strong password
   - **Region**: Select closest to your users
4. Click **Create new project** and wait for initialization

## Step 2: Get Your Credentials

1. After project creation, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Public Key** → `VITE_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY` (**secret — never put in a `VITE_*` variable; only place in `.env.admin.local` for CLI scripts**)

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root (see `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=CheerPose
```

> ⚠️ **Security Note**: Never add `VITE_SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. Any `VITE_*` variable is bundled into the client app. Keep your Service Role Key in a separate git-ignored `.env.admin.local` file (`SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret`) exclusively for local CLI admin scripts (`scripts/create-test-user.mjs`).

## Step 4: Initialize the Database Schema and Migrations

1. In the Supabase dashboard, go to **SQL Editor** → **New Query**
2. Copy and run the contents of `supabase/schema.sql` (or `supabase/setup_all.sql` for a one-shot baseline)
3. Apply every file in `supabase/migrations/` in filename order (from oldest to newest):
   - `20260927000000_add_verification_requests.sql` — Adds `verification_status`, `is_verified` (`GENERATED ALWAYS` column), and `request_verification` / `review_verification` RPCs
   - `20260927001000_auto_verify_on_email.sql` — Decouples athlete verification from email confirmation
   - `20260927002000_auto_approve_verification.sql` — Auto-approves `request_verification()` immediately
   - `20260927003000_fix_admin_policy_recursion.sql` — Introduces `public.is_admin()` helper to prevent RLS recursion
   - `20260927004000_admin_password_reset.sql` — Adds `admin_set_user_password` RPC and `password_reset_audit` table
   - `20260927005000_allow_ticket_insert.sql` — Allows authenticated athletes to submit support tickets
   - `20260927006000_pose_images.sql` — Adds `pose_key` to `stunts` and creates the `pose-images` storage bucket (5 MB limit)
   - `20260927007000_rls_hardening.sql` — Hardens RLS policies across all tables
   - `20260927008000_stunt_lock_realtime.sql` — Configures realtime publication for `stunts`
   - `20260928002000_update_pose_reference_images.sql` — Updates default bundled pose image paths
   - `20260929001000_add_low_v_stunt.sql` — Adds `Low V` to the `stunts` syllabus
   - `20260929002000_add_is_locked_to_stunts.sql` — Adds `is_locked` column to `stunts`
   - `20261013000000_pose_videos.sql` — Creates the `pose-videos` storage bucket (50 MB limit) and admin policies
   - `20261027020000_last_seen_at.sql` — Stores last-online timestamps through an athlete-scoped RPC

## Step 4b: Enable Automatic User Sync (REQUIRED for signup)

Signup creates `public.users` and `public.athlete_profiles` rows via a database trigger on `auth.users`.

1. In **SQL Editor**, copy and run the entire contents of `supabase/fix_user_sync.sql`
2. Verify you see `✅ User sync trigger created`

> The trigger is marked `SECURITY DEFINER`, so it bypasses RLS during real signups while direct client-side `INSERT`s into `public.users` remain blocked by RLS.

## Step 5: Set Up Authentication & Redirect URLs

### Email/Password Auth
1. Go to **Authentication** → **Providers** and enable **Email**
2. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173` (or your production domain)
   - **Redirect URLs**:
     - `http://localhost:5173`
     - `http://localhost:5173/**`
     - `capacitor://localhost`
     - `http://localhost`

### Signup Flow & Email Confirmation
Signup is frictionless: the app creates the account and enters the library immediately without requiring an email round-trip first.
- If **Confirm email** is **OFF** (recommended for local development), Supabase returns an active session immediately.
- If **Confirm email** is **ON**, the user can request a confirmation link on demand from the **Profile** screen ("Confirm email" card).

## Step 6: Athlete Verification Gating (Intermediate & Advanced Poses)

Intermediate and Advanced poses are gated behind `is_verified` on `public.users`.
- `verification_status` (`'unverified' | 'pending' | 'verified' | 'rejected'`) is the single source of truth.
- `is_verified` is a `GENERATED ALWAYS AS (verification_status = 'verified') STORED` column (created by `20260927000000_add_verification_requests.sql`).
- Ensure `ALTER TABLE public.users REPLICA IDENTITY FULL;` is applied (via `supabase/add_verification.sql`) so `subscribeToVerification()` in `src/services/supabaseApi.ts` receives live updates.

### How Verification Works
1. **In-App Request (Auto-Approved)**: When a signed-in athlete taps **Request Verification** on `ProfileScreen.tsx`, the app calls the `request_verification()` RPC (`20260927002000_auto_approve_verification.sql`), which sets `verification_status = 'verified'` immediately.
2. **Admin Review / Moderation**: System Managers can approve or revoke verification from `DarkAdminUsers.tsx` (which calls the `review_verification` RPC), or via SQL:
   ```sql
   -- Grant or revoke verification (update verification_status, NOT the generated is_verified column)
   UPDATE public.users
      SET verification_status = 'verified'
    WHERE id = '<auth user uuid>';
   ```

## Step 7: Storage Buckets (`pose-images` & `pose-videos`)

Storage buckets and RLS policies are created automatically by the migrations:
- **`pose-images`** (`20260927006000_pose_images.sql`): Publicly readable, admin-writable (`public.is_admin()`), 5 MB file size limit (`image/jpeg`, `image/png`, `image/webp`, `image/gif`). Managed via `src/services/poseImages.ts`.
- **`pose-videos`** (`20261013000000_pose_videos.sql`): Publicly readable, admin-writable (`public.is_admin()`), 50 MB file size limit (`video/mp4`, `video/webm`, `video/quicktime`, `video/ogg`). Managed via `src/services/poseImages.ts` and `src/app/components/admin/PoseVideoInput.tsx`.

## Step 8: Create Initial Admin User or Test Accounts

### Option A — Promote an Existing User in SQL Editor
1. Create a user via **Authentication** → **Users** → **Add user** (or sign up in the app).
2. Run in **SQL Editor**:
   ```sql
   UPDATE public.users SET role = 'admin' WHERE email = 'admin@optistances.com';
   ```

### Option B — Use the CLI Admin Helper (Bypasses Email Rate Limits)
1. Create `.env.admin.local` (git-ignored) in the project root:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
   ```
2. Run:
   ```bash
   npm run create:test-user                          # creates test.athlete@optistance.test / TestPass123!
   npm run create:test-user -- --admin               # creates a confirmed admin account
   npm run confirm:users                             # confirms all pending accounts
   ```

## Step 9: Seed Sample Data

In the Supabase **SQL Editor**, copy and execute `supabase/seed.sql` to populate sample stunts and ICU joint angle standards.

---

*Last updated: October 27, 2026*
