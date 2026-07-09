import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { upsertTierWindows } from '../models/showModel.js';
import { regeneratePublicToken, updatePublicSettings } from '../models/eventDayModel.js';

const confirm = process.env.DEMO_SEED_CONFIRM === 'I_UNDERSTAND_DEMO_DATA';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD || `DemoAdmin-${Math.random().toString(36).slice(2, 10)}!`;
const vendorPassword = process.env.DEMO_VENDOR_PASSWORD || `DemoVendor-${Math.random().toString(36).slice(2, 10)}!`;
const tiers = ['platinum', 'gold', 'silver', 'bronze'];

if (!confirm || process.env.NODE_ENV === 'production') {
  console.error('Demo seeding requires DEMO_SEED_CONFIRM=I_UNDERSTAND_DEMO_DATA and is disabled in production.');
  process.exit(1);
}

const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await connection.execute(
    `INSERT INTO users (email, password_hash, role, is_active)
     VALUES ('demo.admin@example.com', ?, 'admin', TRUE)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = TRUE`,
    [adminHash]
  );
  const [[admin]] = await connection.query("SELECT id FROM users WHERE email = 'demo.admin@example.com'");

  const vendorHash = await bcrypt.hash(vendorPassword, 12);
  for (const tier of tiers) {
    const email = `demo.${tier}@example.com`;
    await connection.execute(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES (?, ?, 'vendor', TRUE)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = TRUE`,
      [email, vendorHash]
    );
    const [[user]] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    await connection.execute(
      `INSERT INTO vendor_profiles (user_id, company_name, contact_name, phone, website, description, tier, is_profile_complete)
       VALUES (?, ?, ?, '555-0100', ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE company_name = VALUES(company_name), contact_name = VALUES(contact_name),
         website = VALUES(website), description = VALUES(description), tier = VALUES(tier), is_profile_complete = TRUE`,
      [user.id, `[DEMO] ${capitalize(tier)} Vendor`, `${capitalize(tier)} Contact`, `https://demo-${tier}.example.com`, `Demo ${tier} vendor profile.`, tier]
    );
  }

  await connection.execute(
    `INSERT INTO shows (name, venue_name, venue_address, start_date, end_date, vendor_selection_deadline, timezone, status, created_by)
     VALUES ('[DEMO] Association Expo', 'Demo Convention Center', '100 Demo Way', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), 'America/Denver', 'published', ?)`,
    [admin.id]
  );
  const showId = Number((await connection.query("SELECT id FROM shows WHERE name = '[DEMO] Association Expo' ORDER BY id DESC LIMIT 1"))[0][0].id);
  await connection.commit();

  await upsertTierWindows(showId, {
    platinum: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    gold: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
    silver: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    bronze: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  await updatePublicSettings(showId, { publicMapEnabled: true, publicDirectoryEnabled: true, displayOptions: { assignedOnly: false } });
  await regeneratePublicToken(showId);
  await pool.execute('INSERT INTO seed_runs (seed_name, action, notes) VALUES (?, ?, ?)', ['demo_data', 'seeded', `Demo show ${showId}`]);

  console.log('Demo data created.');
  console.log(`Demo admin: demo.admin@example.com / ${adminPassword}`);
  console.log(`Demo vendors: demo.platinum@example.com, demo.gold@example.com, demo.silver@example.com, demo.bronze@example.com / ${vendorPassword}`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
