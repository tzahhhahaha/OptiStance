/**
 * Create and confirm Supabase test accounts WITHOUT sending any email.
 *
 * Why this exists
 * ---------------
 * Supabase's built-in email service is hard rate-limited (a few emails per hour
 * per project) and that limit CANNOT be raised on the hosted platform. So a
 * "Confirm email" signup flow can only send a handful of confirmation links per
 * hour, which makes testing account creation painful.
 *
 * This script talks to the Supabase **Admin API** with the service role key and
 * creates users that are already confirmed, so no email is ever sent. It can
 * also retroactively confirm accounts that are stuck in "pending" state.
 *
 * Usage
 * -----
 *   node scripts/create-test-user.mjs
 *   node scripts/create-test-user.mjs --email me@test.com --password Secret123! --name "Me"
 *   node scripts/create-test-user.mjs --admin
 *   node scripts/create-test-user.mjs --confirm-pending          # confirm ALL unconfirmed accounts
 *   node scripts/create-test-user.mjs --confirm me@test.com      # confirm one account
 *
 * Required secret
 * ---------------
 *   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role secret)
 *
 * Put it in a git-ignored file called .env.admin.local:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx   (new key style)
 *   # or the legacy eyJ... service_role JWT
 *
 * NEVER expose this key in client code or in a VITE_* variable.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Environment loading (.env, .env.local, .env.admin.local — real env wins)
// ---------------------------------------------------------------------------
const parseEnvFile = (file) => {
  const path = join(root, file);
  if (!existsSync(path)) return {};
  const out = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

const fileEnv = {
  ...parseEnvFile('.env'),
  ...parseEnvFile('.env.local'),
  ...parseEnvFile('.env.admin.local'),
};
const readEnv = (key) => process.env[key] || fileEnv[key] || '';

const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL');
const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

const fail = (message) => {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
};

if (!supabaseUrl) {
  fail(
    'Missing Supabase URL. Set VITE_SUPABASE_URL in .env.local or SUPABASE_URL in the environment.'
  );
}
if (!serviceRoleKey) {
  fail(
    [
      'Missing SUPABASE_SERVICE_ROLE_KEY.',
      '',
      'Create a file called .env.admin.local in the project root (it is git-ignored) with:',
      '  SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret',
      '',
      'Find it in Supabase → Project Settings → API → Project API keys → service_role.',
      '(With the new key system it looks like sb_secret_... .)',
    ].join('\n')
  );
}

// Guard against accidentally using the anon/publishable key.
const decodeJwtRole = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
};
if (serviceRoleKey.startsWith('sb_publishable_')) {
  fail('That looks like the PUBLISHABLE (anon) key. Use the service_role secret instead.');
}
const jwtRole = decodeJwtRole(serviceRoleKey);
if (jwtRole && jwtRole !== 'service_role') {
  fail(`The provided key is a "${jwtRole}" key, not a service_role key. Admin API calls will fail.`);
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getValue = (name, fallback = undefined) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const listAllUsers = async () => {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
};

const findUserByEmail = async (email) => {
  const target = email.trim().toLowerCase();
  return (await listAllUsers()).find((u) => (u.email || '').toLowerCase() === target) || null;
};

/**
 * Make sure the public.users row and athlete_profiles row exist for an auth
 * user. Normally the handle_new_user trigger does this; this is a safety net for
 * projects where that trigger has not been installed yet.
 */
const ensureProfile = async (userId, email, fullName, role, { forceRole = false } = {}) => {
  const { data: existing, error: selectError } = await admin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (selectError) throw new Error(`Could not read public.users: ${selectError.message}`);

  if (!existing) {
    const { error } = await admin
      .from('users')
      .insert({ id: userId, email, full_name: fullName, role, is_active: true });
    if (error) throw new Error(`Could not create public.users row: ${error.message}`);
  } else if (forceRole) {
    const { error } = await admin
      .from('users')
      .update({ role, is_active: true })
      .eq('id', userId);
    if (error) throw new Error(`Could not update public.users row: ${error.message}`);
  }

  const { error: profileError } = await admin
    .from('athlete_profiles')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
  if (profileError) throw new Error(`Could not create athlete_profiles row: ${profileError.message}`);
};

const displayNameFor = (user) => user.user_metadata?.full_name || (user.email || '').split('@')[0] || 'User';

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
const confirmPending = async () => {
  const users = await listAllUsers();
  const pending = users.filter((u) => !u.email_confirmed_at);

  if (pending.length === 0) {
    console.log('✅ No unconfirmed accounts found — nothing to do.');
    return;
  }

  console.log(`Found ${pending.length} unconfirmed account(s). Confirming...\n`);
  for (const user of pending) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (error) {
      console.error(`  ✗ ${user.email}: ${error.message}`);
      continue;
    }
    await ensureProfile(user.id, user.email, displayNameFor(user), 'athlete');
    console.log(`  ✅ ${user.email}`);
  }
  console.log('\nDone. These accounts can now log in immediately with their original password.');
};

const confirmOne = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) fail(`No account found for ${email}`);
  const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
  if (error) fail(error.message);
  await ensureProfile(user.id, user.email, displayNameFor(user), 'athlete');
  console.log(`✅ Confirmed ${user.email} — you can log in now.`);
};

const createUser = async () => {
  const isAdmin = hasFlag('--admin');
  const email = getValue('--email', isAdmin ? 'test.admin@optistance.test' : 'test.athlete@optistance.test');
  const password = getValue('--password', 'TestPass123!');
  const name = getValue('--name', isAdmin ? 'Test Admin' : 'Test Athlete');
  const role = isAdmin ? 'admin' : getValue('--role', 'athlete');

  if (!['athlete', 'admin'].includes(role)) {
    fail(`Invalid --role "${role}". Use "athlete" or "admin".`);
  }

  let user = await findUserByEmail(email);

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) fail(error.message);
    user = data.user;
    console.log(`↻ Existing account updated + confirmed: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) fail(error.message);
    user = data.user;
    console.log(`✅ Confirmed account created: ${email}`);
  }

  await ensureProfile(user.id, email, name, role, { forceRole: true });

  console.log('\n──────────────────────────────────────────────');
  console.log('  Email:    ', email);
  console.log('  Password: ', password);
  console.log('  Role:     ', role);
  console.log('  User ID:  ', user.id);
  console.log('──────────────────────────────────────────────');
  console.log('No email was sent — log in right away.\n');
};

const main = async () => {
  const confirmTarget = getValue('--confirm');
  try {
    if (hasFlag('--confirm-pending')) {
      await confirmPending();
    } else if (confirmTarget) {
      await confirmOne(confirmTarget);
    } else {
      await createUser();
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
};

await main();
