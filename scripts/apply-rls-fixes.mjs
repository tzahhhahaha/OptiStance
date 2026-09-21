/**
 * Apply RLS fixes to Supabase database
 * 
 * Usage:
 *   $env:PGPASSWORD="your-password"; node scripts/apply-rls-fixes.mjs
 * 
 * Or set the DATABASE_URL environment variable:
 *   $env:DATABASE_URL="postgresql://postgres:password@db.waxrmcnihuacxapvqpvj.supabase.co:5432/postgres"
 *   node scripts/apply-rls-fixes.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to load pg
let pg;
try {
  pg = (await import('pg')).default;
} catch (e) {
  console.error('❌ The "pg" package is not installed. Install it with: npm install pg');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL || 
  `postgresql://postgres:${encodeURIComponent(process.env.PGPASSWORD || '')}@db.waxrmcnihuacxapvqpvj.supabase.co:5432/postgres`;

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  console.log('✅ Connected to Supabase database');

  const sqlPath = join(__dirname, '..', 'supabase', 'fix_rls_policies.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  console.log('📝 Applying RLS policies...');
  await client.query('BEGIN');
  
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ RLS policies applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  // Verify policies
  console.log('\n📋 Current RLS policies:');
  const { rows } = await client.query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);
  
  for (const row of rows) {
    console.log(`  • ${row.tablename}.${row.policyname} (${row.cmd})`);
  }

  // Check stunts count
  const stunts = await client.query('SELECT COUNT(*) as count FROM stunts');
  console.log(`\n✅ Stunts table has ${stunts.rows[0].count} rows`);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
