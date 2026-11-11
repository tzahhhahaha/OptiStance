# Database Schema & Seed Files

The canonical database schema, Row-Level Security (RLS) policies, and migrations for **OptiStance** live in the [`supabase/`](../supabase/) directory and are designed for Supabase PostgreSQL (incorporating `auth.users` and `auth.uid()`).

## Recommended Setup (Supabase)

Follow [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for the complete database setup:
1. Run [`supabase/schema.sql`](../supabase/schema.sql) in the Supabase SQL Editor.
2. Run [`supabase/fix_user_sync.sql`](../supabase/fix_user_sync.sql) to install the `auth.users` → `public.users` sync trigger.
3. Apply all migrations in [`supabase/migrations/`](../supabase/migrations/) in chronological order.
4. Optionally run [`supabase/seed.sql`](../supabase/seed.sql) to seed sample stunts and ICU joint angle standards.

## Creating Admin & Test Users

Because user credentials are managed by Supabase Auth (`auth.users`) and `public.users` rows are created via the `handle_new_user` trigger:
- Use `npm run create:test-user -- --admin` (see [SUPABASE_SETUP.md](../SUPABASE_SETUP.md#step-8-create-initial-admin-user-or-test-accounts)), or
- Create a user in **Supabase Dashboard → Authentication → Users** and promote them in the SQL Editor:
  ```sql
  UPDATE public.users SET role = 'admin' WHERE email = 'admin@optistances.com';
  ```

> **Note on `database/schema.sql` and `database/seed.sql`**: These files are legacy reference copies. Always use [`supabase/schema.sql`](../supabase/schema.sql) and [`supabase/migrations/`](../supabase/migrations/) as the source of truth.
