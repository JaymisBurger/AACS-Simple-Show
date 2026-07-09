import { pool } from '../config/db.js';

if (process.env.DEMO_CLEANUP_CONFIRM !== 'DELETE_DEMO_DATA' || process.env.NODE_ENV === 'production') {
  console.error('Demo cleanup requires DEMO_CLEANUP_CONFIRM=DELETE_DEMO_DATA and is disabled in production.');
  process.exit(1);
}

const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const [shows] = await connection.query("SELECT id FROM shows WHERE name LIKE '[DEMO]%'");
  for (const show of shows) {
    await connection.execute('DELETE FROM shows WHERE id = ?', [show.id]);
  }
  await connection.execute("DELETE FROM users WHERE email LIKE 'demo.%@example.com'");
  await connection.execute('INSERT INTO seed_runs (seed_name, action, notes) VALUES (?, ?, ?)', ['demo_data', 'cleaned', 'Removed demo users and shows']);
  await connection.commit();
  console.log('Demo data cleaned.');
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
