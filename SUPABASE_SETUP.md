# Supabase Integration Setup Guide

## Overview
This guide walks you through setting up Supabase as your backend database for the OptiStances app.

## Prerequisites
- Supabase account (https://supabase.com)
- npm/pnpm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `optistances`
   - **Database Password**: Create a strong password
   - **Region**: Select closest to your users
4. Click "Create new project" and wait for initialization (5-10 minutes)

## Step 2: Get Your Credentials

1. After project creation, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Public Key** → `VITE_SUPABASE_ANON_KEY`
   - **Service Role Key** → `VITE_SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-side only)

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 4: Initialize the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click **Run**
6. Wait for the schema to be created (should see success messages)

## Step 4b: Enable Automatic User Sync (REQUIRED for signup)

Signup creates `public.users` / `athlete_profiles` rows via a database trigger.
Without it, signup fails with
`Failed to create user profile: new row violates row-level security policy`.

1. In **SQL Editor**, copy the entire contents of `supabase/fix_user_sync.sql`
2. Click **Run** (creates the `handle_new_user` trigger on `auth.users`)
3. Verify you see `✅ User sync trigger created`

> The SQL Editor runs as the `postgres` role, so RLS does not block these inserts.
> The trigger is marked `SECURITY DEFINER`, so it also bypasses RLS when run
> automatically during real signups. Client-side `users` inserts are intentionally
> blocked by RLS — relying on this trigger is by design.

## Step 5: Set Up Authentication

### Email/Password Auth (Recommended)
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email settings in **Auth** → **Email Templates**

### Google OAuth (Optional)
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials from Google Cloud Console

### Signup flow & email verification (how the app behaves)

Signup is now **frictionless**: the app creates the account and goes straight to
the home screen — it never asks for or requests a confirmation email during
signup. Email confirmation is a separate, **optional** action the user takes from
the **Profile** screen ("Confirm email" card). What happens depends on the
**Confirm email** setting (Authentication → Providers → Email):

| "Confirm email" | At signup | In-app verification |
| --- | --- | --- |
| **OFF** (recommended for local testing) | Supabase returns a session → the user is fully logged in | nothing to do — the account is auto-confirmed (the Profile card is not shown) |
| **ON** | No session is issued, so the user enters the app in an *unverified* state | the Profile screen shows a **Confirm email** card with a button that sends the confirmation link on demand |

When confirmation is ON, an unverified account is limited to local data (no
Supabase session means no cloud sync) until the user clicks the link sent from
the Profile action. They can confirm whenever they choose; after the link is
clicked, the next app launch detects the session and signs them in fully.

## Step 5b: Configure Auth Redirect URLs (REQUIRED for email links)

Confirmation / password-reset links break with **"couldn't connect to server"**
if the redirect target isn't allowed. Supabase only honors a redirect URL if it
is listed here.

1. Go to **Authentication** → **URL Configuration**
2. **Site URL**: set it to where you run the app, e.g. `http://localhost:5173`
   (Vite's default port — NOT the Supabase default `http://localhost:3000`)
3. **Redirect URLs**: add every origin you use. One per line:
   - `http://localhost:5173`
   - `http://localhost:5173/**`
   - `https://your-production-domain.com/**` (when deployed)
   - If you ship the native (Capacitor) app: `capacitor://localhost` and `http://localhost`
4. Save

The app sends `emailRedirectTo: window.location.origin` whenever a confirmation
or reset email is sent on demand (Profile → "Confirm email", and the password
reset flow) — the link returns to exactly where you're running the app, provided
that origin is in the list above.

## Step 6: Configure Row-Level Security (RLS)

The schema already includes RLS policies. To verify:
1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `users` table
   - `practice_sessions` table
   - `support_tickets` table

## Step 6b: Verification Gating (unlock Intermediate & Advanced poses)

Premium poses (Intermediate + Advanced) are gated behind an `is_verified` flag
on the user's profile row. Guests and new accounts are unverified (`false`) and
only see Beginner poses; verified athletes see everything. The flag is flipped
manually for an athlete (admin action).

### 1. Run the migration

Open the **SQL Editor** and run `supabase/add_verification.sql` — or copy/paste:

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.users REPLICA IDENTITY FULL;
```

The `REPLICA IDENTITY FULL` line is required: Supabase Realtime only includes
updated column values in `postgres_changes` UPDATE payloads when the table uses
`FULL` replica identity. Without it, the app's live listener
(`subscribeToVerification`) would receive just the primary key and would never
see `is_verified` flip.

### 2. Verify an athlete

Flip the flag for a user whenever they should be granted premium access:

```sql
UPDATE public.users
   SET is_verified = true
 WHERE id = '<auth user uuid>';
```

Sanity check:

```sql
SELECT id, email, is_verified FROM public.users ORDER BY created_at DESC;
```

### 3. How the app reacts (no reload needed)

- `src/services/supabaseApi.ts` → `getVerificationStatus()` fetches the flag on
  login/startup; `subscribeToVerification()` listens for live changes.
- `src/app/App.tsx` subscribes while signed in and pushes the value into the
  session user (`isVerified`).
- `src/app/utils/access.ts` → `isPoseLocked()` / `visiblePosesFor()` apply the
  rule to the gallery (`PoseCard` lock overlay + "Verify to Unlock") and the AI
  camera (target selector filtered to Beginner; a stale/premium target shows the
  **Access Denied: Verification Required** modal and stops the stream).

## Step 7: Set Up Storage Buckets

1. Go to **Storage** in the left sidebar
2. Create a new bucket:
   - **Name**: `practice-media`
   - **Public**: No (keep private, use signed URLs)
3. Create another bucket:
   - **Name**: `stunt-references`
   - **Public**: Yes (for reference images/videos)

### Storage Policies
Add policies to allow:
- Athletes to upload to their own session folders
- Admins to manage all files

```sql
-- Allow authenticated users to upload to their own session folder
CREATE POLICY "Users can upload to their session folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to read all files
CREATE POLICY "Admins can read all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-media' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::uuid AND role = 'admin'
  )
);
```

## Step 8: Install Dependencies

```bash
npm install @supabase/supabase-js
# or
pnpm add @supabase/supabase-js
```

## Step 9: Test the Connection

Create a test file `src/services/__test__/supabase.test.ts`:

```typescript
import supabase from '@/services/supabaseService';

export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('stunts')
      .select('count(*)', { count: 'exact' })
      .limit(0);
    
    if (error) throw error;
    console.log('✓ Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('✗ Connection failed:', err);
    return false;
  }
}
```

## Step 10: Create Initial Admin User

Because of RLS, direct `INSERT INTO users` from the app is blocked — the
`handle_new_user` trigger must own the row. Recommended flow:

1. In Supabase **Authentication** → **Users**, click **Add user** and create an
   admin account (the trigger from Step 4b will create its `users` +
   `athlete_profiles` rows automatically).
2. Then promote that user to admin in **SQL Editor** (replace the email):

```sql
-- Promote an existing auth user to admin
UPDATE users SET role = 'admin'
WHERE email = 'admin@optistances.com';

-- (Verify)
SELECT id, email, role, is_active FROM users WHERE email = 'admin@optistances.com';
```

> If you still want to create the row directly in the SQL Editor, `users.id`
> must equal the `auth.users.id` of the corresponding auth account — the
> `DEFAULT uuid_generate_v4()` in the schema will NOT produce a matching id.

## Step 11: Seed Sample Data

Run the seed script:

```bash
npm run seed:supabase
```

Or manually execute `supabase/seed.sql` in SQL Editor.

## Troubleshooting

### "Unauthorized" Error
- Check that your `VITE_SUPABASE_ANON_KEY` is correct
- Verify RLS policies are enabled
- Check that user role allows the operation

### "Table not found"
- Re-run the schema.sql file in SQL Editor
- Check spelling of table names

### Authentication Issues
- Verify email provider is enabled in Authentication → Providers
- Check email templates are configured correctly

### "Couldn't connect to server" after clicking the confirmation link
The link redirected to the wrong host/port — Supabase's **Site URL** (often the
default `http://localhost:3000`) instead of where the app actually runs.
1. **Authentication → URL Configuration**: set **Site URL** to `http://localhost:5173`
2. Add `http://localhost:5173/**` to **Redirect URLs** (see Step 5b)
3. Your account is already confirmed anyway — you can usually just open the app and log in.

### Signup fails with "new row violates row-level security policy for table users"
This is expected when the user-sync trigger is missing — the app is not allowed
to insert into `users` directly (by design), and the `handle_new_user` trigger
is what creates the row during signup.
1. Open **SQL Editor**
2. Run the entire contents of `supabase/fix_user_sync.sql`
3. Sign up again

See **Step 4b** above.

### "Email rate limit exceeded" — can't create test accounts / no confirmation link arrives
Supabase's **built-in** email service is hard rate-limited (only a few emails per
hour per project) and the limit **cannot be raised** on the hosted platform.
Every signup/resend consumes one of those emails, so testing quickly gets stuck.
Pick one of these three fixes:

**Option A — Disable email confirmation (fastest, best for local testing)**
1. **Authentication → Sign In / Providers → Email**
2. Turn **Confirm email** OFF and save.
3. Sign up again — the app logs in immediately and **no email is sent at all**.

**Option B — Custom SMTP (proper fix, use for production)**
1. Create an SMTP provider (Resend, Brevo, SendGrid, Mailgun, Amazon SES, …).
2. **Authentication → Emails → SMTP Settings → Enable Custom SMTP** and enter the
   host, port, username, password, and a verified sender address.
3. Custom SMTP bypasses the built-in rate limit (the provider's own limits apply).
   Keep **Confirm email** ON if you want verified accounts.

**Option C — Create already-confirmed accounts with the Admin API (no email)**
Use this when you want to keep email confirmation ON but need test accounts now.
It also confirms accounts that are already stuck in "pending".

```bash
# 1. Put the service role secret in a git-ignored file:
#    .env.admin.local
#    SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret

npm run create:test-user                          # creates test.athlete@optistance.test / TestPass123!
npm run create:test-user -- --email me@test.com --password Secret123! --name "Me"
npm run create:test-user -- --admin               # creates a confirmed admin account
npm run confirm:users                             # confirm ALL pending accounts
npm run create:test-user -- --confirm me@test.com # confirm one account
```

The script uses `auth.admin.createUser({ email_confirm: true })`, so **no email is
sent** and the rate limit is irrelevant. It also creates the matching `public.users`
and `athlete_profiles` rows, so it works even before the Step 4b trigger is installed.

> ⚠️ The service role key bypasses all RLS. Keep it in `.env.admin.local`
> (git-ignored), never in a `VITE_*` variable, and never commit it.

### Storage Upload Issues
- Verify bucket name matches in code
- Check storage policies are set up
- Ensure bucket is not public if you want private access

## Migration from localStorage

To migrate existing data from localStorage to Supabase:

1. Export data from localStorage
2. Use `src/services/supabaseService.ts` functions to import
3. Update components to use Supabase service instead of localStorage

See `MIGRATION.md` for detailed instructions.

## Best Practices

1. **Never expose Service Role Key** - Use only on server-side
2. **Use RLS Policies** - Enforce permissions at database level
3. **Index Frequently Queried Columns** - Already done in schema
4. **Regular Backups** - Supabase handles this, but verify settings
5. **Monitor Storage Usage** - Use analytics to track media storage
6. **Cache Results** - Use React Query or SWR for caching
7. **Limit Query Results** - Use pagination for large datasets

## Next Steps

- Update admin panel components to use Supabase services
- Implement real-time subscriptions for live updates
- Set up Cloud Functions for automated analytics
- Configure email notifications for support tickets
