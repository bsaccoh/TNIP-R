import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { query } from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

function signAccess(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role_key, operatorId: user.operator_id, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.accessTtl }
  );
}

async function loadUserByEmail(email) {
  const rows = await query(
    `SELECT u.user_id, u.email, u.password_hash, u.full_name, u.is_active,
            u.operator_id, r.role_key
       FROM users u JOIN roles r ON r.role_id = u.role_id
      WHERE u.email = :email AND u.deleted_at IS NULL`,
    { email }
  );
  return rows[0] || null;
}

export async function login(email, password, ctx = {}) {
  const user = await loadUserByEmail(email);
  if (!user || !user.is_active) throw ApiError.unauthorized('Invalid credentials');
  const okPass = await bcrypt.compare(password, user.password_hash);
  if (!okPass) throw ApiError.unauthorized('Invalid credentials');

  const accessToken = signAccess(user);
  const refreshToken = uuid() + uuid();
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  const sessionId = uuid();
  const expires = new Date(Date.now() + env.jwt.refreshTtl * 1000);

  await query(
    `INSERT INTO sessions (session_id, user_id, refresh_hash, user_agent, ip_address, expires_at)
     VALUES (:sid, :uid, :hash, :ua, :ip, :exp)`,
    { sid: sessionId, uid: user.user_id, hash: refreshHash, ua: ctx.userAgent || null, ip: ctx.ip || null, exp: expires }
  );
  await query('UPDATE users SET last_login_at = NOW() WHERE user_id = :id', { id: user.user_id });

  return {
    accessToken,
    refreshToken: `${sessionId}.${refreshToken}`,
    user: {
      userId: user.user_id, email: user.email, fullName: user.full_name,
      role: user.role_key, operatorId: user.operator_id,
    },
  };
}

export async function refresh(compositeToken) {
  if (!compositeToken || !compositeToken.includes('.')) throw ApiError.unauthorized('Invalid refresh token');
  const [sessionId, raw] = compositeToken.split('.', 2);
  const rows = await query(
    `SELECT s.*, u.email, u.operator_id, r.role_key
       FROM sessions s JOIN users u ON u.user_id = s.user_id
       JOIN roles r ON r.role_id = u.role_id
      WHERE s.session_id = :sid`,
    { sid: sessionId }
  );
  const session = rows[0];
  if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }
  const valid = await bcrypt.compare(raw, session.refresh_hash);
  if (!valid) throw ApiError.unauthorized('Invalid refresh token');

  const accessToken = signAccess({
    user_id: session.user_id, role_key: session.role_key,
    operator_id: session.operator_id, email: session.email,
  });
  return { accessToken };
}

export async function logout(compositeToken) {
  if (!compositeToken || !compositeToken.includes('.')) return;
  const [sessionId] = compositeToken.split('.', 2);
  await query('UPDATE sessions SET revoked_at = NOW() WHERE session_id = :sid', { sid: sessionId });
}

export async function updateProfile(userId, { fullName, currentPassword, newPassword }) {
  const rows = await query('SELECT password_hash, full_name FROM users WHERE user_id = :id', { id: userId });
  if (!rows.length) throw ApiError.notFound('User not found');
  const user = rows[0];

  if (newPassword) {
    if (!currentPassword) throw ApiError.badRequest('Current password is required');
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw ApiError.unauthorized('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = :h, updated_at = NOW() WHERE user_id = :id', { h: hash, id: userId });
  }

  if (fullName) {
    await query('UPDATE users SET full_name = :n, updated_at = NOW() WHERE user_id = :id', { n: fullName.trim(), id: userId });
  }

  return me(userId);
}

export async function me(userId) {
  const rows = await query(
    `SELECT u.user_id, u.email, u.full_name, u.operator_id, r.role_key,
            o.operator_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN operators o ON o.operator_id = u.operator_id
      WHERE u.user_id = :id`,
    { id: userId }
  );
  if (!rows.length) throw ApiError.notFound('User not found');
  const u = rows[0];
  return {
    userId: u.user_id, email: u.email, fullName: u.full_name,
    role: u.role_key, operatorId: u.operator_id, operatorName: u.operator_name,
  };
}
