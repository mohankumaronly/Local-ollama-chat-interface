import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

function resolveMigrationsFolder(): string {
  if (process.env.MIGRATIONS_FOLDER) {
    return process.env.MIGRATIONS_FOLDER;
  }
  const candidates = [
    '/app/drizzle',
    path.resolve(process.cwd(), 'drizzle'),
    path.resolve(process.cwd(), 'apps/server/drizzle'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return '/app/drizzle';
}

async function run(): Promise<void> {
  const migrationsAuto = process.env.MIGRATIONS_AUTO ?? 'true';
  if (migrationsAuto === 'false') {
    console.log('[migrations] migrations skipped (MIGRATIONS_AUTO=false)');
    process.exit(0);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[migrations] DATABASE_URL is not set');
    process.exit(1);
  }

  const migrationsFolder = resolveMigrationsFolder();
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  if (!fs.existsSync(migrationsFolder) || !fs.existsSync(journalPath)) {
    console.error(`[migrations] migrations folder not found or missing meta/_journal.json at: ${migrationsFolder}`);
    process.exit(1);
  }

  let journalEntries: Array<{ when: number; tag: string }> = [];
  try {
    const rawJournal = fs.readFileSync(journalPath, 'utf8');
    const parsed = JSON.parse(rawJournal);
    journalEntries = parsed.entries || [];
  } catch (err) {
    console.error('[migrations] failed to parse _journal.json:', (err as Error).message);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const retryMax = parseInt(process.env.MIGRATIONS_RETRY_MAX || '30', 10);
  let connected = false;

  for (let attempt = 1; attempt <= retryMax; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        connected = true;
        break;
      } finally {
        client.release();
      }
    } catch (err) {
      if (attempt === retryMax) {
        console.error(`[migrations] database connection failed after ${retryMax} attempts:`, (err as Error).message);
        await pool.end();
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (!connected) {
    console.error('[migrations] could not establish database connection');
    await pool.end();
    process.exit(1);
  }

  const existingAppliedTimestamps = new Set<string>();
  try {
    const result = await pool.query<{ created_at: string }>(
      'SELECT created_at FROM drizzle.__drizzle_migrations'
    );
    for (const row of result.rows) {
      existingAppliedTimestamps.add(String(row.created_at));
    }
  } catch {
    // Schema or tracking table does not exist yet; drizzle will create it
  }

  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder,
      migrationsTable: '__drizzle_migrations',
      migrationsSchema: 'drizzle',
    });
  } catch (err) {
    console.error('[migrations] migration execution failed:', (err as Error).message);
    await pool.end();
    process.exit(1);
  }

  let newlyApplied = 0;
  try {
    const resultAfter = await pool.query<{ created_at: string }>(
      'SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC'
    );
    for (const row of resultAfter.rows) {
      const ts = String(row.created_at);
      if (!existingAppliedTimestamps.has(ts)) {
        newlyApplied++;
        const entry = journalEntries.find((e) => String(e.when) === ts);
        const name = entry ? `${entry.tag}.sql` : `migration ${ts}`;
        console.log(`[migrations] applied ${name}`);
      }
    }
  } catch (err) {
    console.error('[migrations] failed to verify applied migrations:', (err as Error).message);
  }

  if (newlyApplied === 0) {
    console.log('[migrations] migrations up to date');
  } else {
    console.log(`[migrations] ${newlyApplied} migration(s) applied successfully`);
  }

  await pool.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('[migrations] unexpected fatal error:', err);
  process.exit(1);
});
