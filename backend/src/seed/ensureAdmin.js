import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/** Idempotently ensure a REGULATOR_ADMIN user exists (SQL seed can't bcrypt). */
export async function ensureSeedAdmin() {
  const { email, password, name } = env.seedAdmin;
  const existing = await query('SELECT user_id FROM users WHERE email = :email', { email });
  if (existing.length) return;

  const roleRows = await query("SELECT role_id FROM roles WHERE role_key = 'REGULATOR_ADMIN'");
  if (!roleRows.length) {
    logger.warn('REGULATOR_ADMIN role missing — seed.sql not applied yet');
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (email, password_hash, full_name, role_id, operator_id, is_active)
     VALUES (:email, :hash, :name, :roleId, NULL, 1)`,
    { email, hash, name, roleId: roleRows[0].role_id }
  );
  logger.info(`Seed admin created: ${email}`);
}
