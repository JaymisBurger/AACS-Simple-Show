import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { createUser, findUserByEmail } from '../models/userModel.js';
import { hashPassword } from '../services/passwordService.js';

async function seedAdmin() {
  if (!env.seedAdminEmail || !env.seedAdminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.');
  }

  const email = env.seedAdminEmail.toLowerCase();
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    console.log(`Admin seed skipped. User already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(env.seedAdminPassword);
  const user = await createUser({ email, passwordHash, role: 'admin' });

  console.log(`Development admin created: ${user.email}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
