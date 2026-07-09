import { pool } from '../config/db.js';
import { runSetupChecks } from '../services/setupCheckService.js';

try {
  const result = await runSetupChecks();
  console.log(result.ok ? 'Setup checks passed.' : 'Setup needs attention.');
  for (const check of result.checks) {
    console.log(`${check.status === 'pass' ? 'PASS' : 'FAIL'} ${check.name}: ${check.message}`);
  }
  console.log(`Known schema version: ${result.migrationStatus.knownVersion}`);
  if (result.migrationStatus.missing.length) {
    console.log(`Missing migrations: ${result.migrationStatus.missing.join(', ')}`);
  }
  process.exitCode = result.ok ? 0 : 1;
} finally {
  await pool.end();
}
