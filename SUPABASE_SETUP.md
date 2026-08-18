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

## Step 5: Set Up Authentication

### Email/Password Auth (Recommended)
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email settings in **Auth** → **Email Templates**

### Google OAuth (Optional)
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials from Google Cloud Console

## Step 6: Configure Row-Level Security (RLS)

The schema already includes RLS policies. To verify:
1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `users` table
   - `practice_sessions` table
   - `support_tickets` table

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

1. In Supabase **Authentication** → **Users**, create a new user manually, or
2. Run this SQL in SQL Editor:

```sql
-- Create admin user (replace with your email)
INSERT INTO users (email, full_name, role)
VALUES ('admin@optistances.com', 'Admin User', 'admin');

-- Create athlete profile
INSERT INTO athlete_profiles (user_id)
SELECT id FROM users WHERE email = 'admin@optistances.com';
```

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
