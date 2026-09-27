import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export async function runMigrations(): Promise<{ success: boolean; applied: string[]; error?: string }> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('ℹ️ DATABASE_URL is not set. TeleAgent is configured to use file-backed JsonRepository.');
    console.log('   To initialize a PostgreSQL database, set DATABASE_URL=postgresql://user:pass@host:port/dbname and re-run.');
    return { success: true, applied: [] };
  }

  console.log('====================================================');
  console.log('🐘 RUNNING TELEAGENT POSTGRESQL DATABASE MIGRATIONS');
  console.log('====================================================\n');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  const applied: string[] = [];

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully.');

    // 1. Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Discover migration files
    const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    const fallbackMigrationsDir = path.join(process.cwd(), 'dist', 'db', 'migrations');
    const targetDir = fs.existsSync(migrationsDir) ? migrationsDir : fallbackMigrationsDir;

    let files: string[] = [];
    if (fs.existsSync(targetDir)) {
      files = fs.readdirSync(targetDir).filter(f => f.endsWith('.sql')).sort();
    } else {
      // Direct fallback to schema.sql in db directory
      const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        files = ['001_initial_schema.sql'];
      }
    }

    console.log(`Found ${files.length} migration file(s) in ${targetDir}`);

    for (const file of files) {
      const { rows } = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
      if (rows.length > 0) {
        console.log(`  ⏭️  Migration ${file} is already applied. Skipping.`);
        continue;
      }

      console.log(`  ▶️  Applying migration: ${file}...`);
      let sqlPath = path.join(targetDir, file);
      if (!fs.existsSync(sqlPath)) {
        sqlPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
      }

      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

      // Execute in transaction
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ Applied migration: ${file}`);
        applied.push(file);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed to apply migration ${file}:`, err.message);
        throw err;
      }
    }

    client.release();
    await pool.end();

    console.log('\n====================================================');
    console.log(`🎉 ALL POSTGRESQL MIGRATIONS COMPLETED SUCCESSFULLY (${applied.length} new)`);
    console.log('====================================================\n');

    return { success: true, applied };
  } catch (err: any) {
    await pool.end().catch(() => {});
    console.error('❌ Migration failed:', err.message);
    return { success: false, applied, error: err.message };
  }
}

// Allow direct CLI execution
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  runMigrations().then(res => {
    if (!res.success) {
      process.exit(1);
    }
  });
}
