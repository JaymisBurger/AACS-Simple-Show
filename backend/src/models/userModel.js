import { pool } from '../config/db.js';

const publicUserFields = 'id, email, role, is_active, requires_password_change, created_at, updated_at';

export async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, email, password_hash, role, is_active, requires_password_change,
       activation_token_hash, activation_expires_at, reset_token_hash, reset_expires_at,
       created_at, updated_at
     FROM users
     WHERE email = ?`,
    [email]
  );

  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT ${publicUserFields}
     FROM users
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
}

export async function findUserByActivationTokenHash(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT id, email, password_hash, role, is_active, requires_password_change,
       activation_token_hash, activation_expires_at, reset_token_hash, reset_expires_at,
       created_at, updated_at
     FROM users
     WHERE activation_token_hash = ?`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function findUserByResetTokenHash(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT id, email, password_hash, role, is_active, requires_password_change,
       activation_token_hash, activation_expires_at, reset_token_hash, reset_expires_at,
       created_at, updated_at
     FROM users
     WHERE reset_token_hash = ?`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function createUser({ email, passwordHash, role, isActive = true, requiresPasswordChange = false }, connection = pool) {
  const [result] = await connection.execute(
    `INSERT INTO users (email, password_hash, role, is_active, requires_password_change)
     VALUES (?, ?, ?, ?, ?)`,
    [email, passwordHash, role, isActive, requiresPasswordChange]
  );

  return findUserById(result.insertId);
}

export async function updateUserAccount(userId, updates, connection = pool) {
  const fields = [];
  const params = [];

  if (updates.email) {
    fields.push('email = ?');
    params.push(updates.email);
  }
  if (typeof updates.isActive === 'boolean') {
    fields.push('is_active = ?');
    params.push(updates.isActive);
  }
  if (typeof updates.requiresPasswordChange === 'boolean') {
    fields.push('requires_password_change = ?');
    params.push(updates.requiresPasswordChange);
  }
  if (updates.passwordHash) {
    fields.push('password_hash = ?');
    params.push(updates.passwordHash);
  }
  if ('activationTokenHash' in updates) {
    fields.push('activation_token_hash = ?');
    params.push(updates.activationTokenHash);
  }
  if ('activationExpiresAt' in updates) {
    fields.push('activation_expires_at = ?');
    params.push(updates.activationExpiresAt);
  }
  if ('resetTokenHash' in updates) {
    fields.push('reset_token_hash = ?');
    params.push(updates.resetTokenHash);
  }
  if ('resetExpiresAt' in updates) {
    fields.push('reset_expires_at = ?');
    params.push(updates.resetExpiresAt);
  }

  if (fields.length === 0) return findUserById(userId);

  await connection.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...params, userId]);
  return findUserById(userId);
}

export function toPublicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.is_active),
    requiresPasswordChange: Boolean(user.requires_password_change),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}
