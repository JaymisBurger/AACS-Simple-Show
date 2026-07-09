import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';

const expectedMigrations = [
  '001_initial_schema',
  '002_create_shows.sql',
  '003_create_floor_maps.sql',
  '004_create_booths.sql',
  '005_create_vendor_management.sql',
  '006_vendor_show_exclusions.sql',
  '007_create_booth_assignments.sql',
  '008_create_vendor_communications.sql',
  '009_create_event_day_tools.sql',
  '010_create_qa_and_ops_tables.sql',
  '011_create_booth_change_requests.sql'
];

const requiredTables = [
  'users', 'vendor_profiles', 'shows', 'show_tier_windows', 'show_maps', 'map_objects',
  'booths', 'show_vendors', 'booth_assignments', 'assignment_history', 'vendor_communications',
  'show_public_settings', 'vendor_check_ins', 'qa_checklist_results', 'booth_change_requests',
  'schema_migrations', 'seed_runs'
];

export async function runSetupChecks() {
  const checks = [];
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const envPath = path.join(backendRoot, '.env');

  checks.push(await fileCheck('Backend .env exists', envPath));
  checks.push(check('Required env vars', ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'].every((key) => Boolean(process.env[key])), 'Required backend variables are present.', 'Missing one or more required backend variables.'));
  checks.push(check('JWT secret length', String(env.jwtSecret || '').length >= 24, 'JWT secret looks long enough.', 'JWT secret should be a long random value.'));
  checks.push(check('Frontend origin', Boolean(env.frontendOrigin), `Frontend origin configured as ${env.frontendOrigin}.`, 'FRONTEND_ORIGIN is missing.'));

  try {
    await pool.query('SELECT 1');
    checks.push(check('Database connection', true, 'Database connected.', ''));
  } catch (error) {
    checks.push(check('Database connection', false, '', 'Database connection failed.'));
  }

  for (const table of requiredTables) {
    try {
      const [rows] = await pool.query(`SHOW TABLES LIKE ?`, [table]);
      checks.push(check(`Table ${table}`, rows.length > 0, 'Table exists.', 'Migration missing.'));
    } catch {
      checks.push(check(`Table ${table}`, false, '', 'Unable to check table.'));
    }
  }

  try {
    await fs.mkdir(env.uploadDir, { recursive: true });
    await fs.access(env.uploadDir);
    checks.push(check('Upload directory writable', true, env.uploadDir, ''));
  } catch {
    checks.push(check('Upload directory writable', false, '', 'Upload directory is not writable.'));
  }

  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = TRUE");
    checks.push(check('Active admin exists', Number(rows[0]?.total || 0) > 0, 'At least one active admin exists.', 'Run npm run seed:admin.'));
  } catch {
    checks.push(check('Active admin exists', false, '', 'Unable to check admin users.'));
  }

  const migrationStatus = await getMigrationStatus();
  checks.push(check('Migration status', migrationStatus.missing.length === 0, 'Expected migrations are recorded.', `${migrationStatus.missing.length} expected migration(s) missing.`));

  return {
    ok: checks.every((item) => item.status === 'pass'),
    checks,
    migrationStatus
  };
}

export async function getMigrationStatus() {
  let applied = [];
  try {
    const [rows] = await pool.query('SELECT migration_name, applied_at FROM schema_migrations ORDER BY migration_name ASC');
    applied = rows.map((row) => ({ migrationName: row.migration_name, appliedAt: row.applied_at }));
  } catch {
    applied = [];
  }
  const appliedNames = new Set(applied.map((item) => item.migrationName));
  return {
    knownVersion: expectedMigrations.at(-1),
    expected: expectedMigrations,
    applied,
    missing: expectedMigrations.filter((name) => !appliedNames.has(name))
  };
}

async function fileCheck(name, filePath) {
  try {
    await fs.access(filePath);
    return check(name, true, 'File found.', '');
  } catch {
    return check(name, false, '', 'Missing .env file.');
  }
}

function check(name, passed, passMessage, failMessage) {
  return {
    name,
    status: passed ? 'pass' : 'fail',
    message: passed ? passMessage : failMessage
  };
}
