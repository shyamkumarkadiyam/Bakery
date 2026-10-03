// Explicit one-time migration runner; never invoked by the application server.
const { loadEnvConfig } = require('@next/env');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
loadEnvConfig(path.join(__dirname, '..'));
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query('CREATE TABLE IF NOT EXISTS public.bakery_schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    await db.query('REVOKE ALL ON public.bakery_schema_migrations FROM anon, authenticated');
    for (const version of ['20261002100000_date_inventory','20261002110000_fix_inventory_order_alias']) {
      const existing = await db.query('SELECT 1 FROM public.bakery_schema_migrations WHERE version=$1', [version]);
      if (!existing.rowCount) {
        await db.query(fs.readFileSync(path.join(__dirname, '../supabase/migrations', version + '.sql'), 'utf8'));
        await db.query('INSERT INTO public.bakery_schema_migrations(version) VALUES($1)', [version]);
      }
    }
    await db.query('COMMIT');
    console.log('Inventory schema is up to date.');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });