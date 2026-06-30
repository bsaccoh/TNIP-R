import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

async function setUserPermissions(userId, permKeys) {
  await query('DELETE FROM user_permissions WHERE user_id = :uid', { uid: userId });
  for (const key of permKeys) {
    await query(
      'INSERT IGNORE INTO user_permissions (user_id, perm_key) VALUES (:uid, :key)',
      { uid: userId, key }
    );
  }
}

export async function listUsers() {
  const rows = await query(
    `SELECT u.user_id, u.email, u.full_name, u.is_active, u.mfa_enabled,
            u.last_login_at, u.created_at, r.role_key, r.name AS role_name,
            o.operator_name,
            GROUP_CONCAT(up.perm_key ORDER BY up.perm_key SEPARATOR ',') AS custom_permissions
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       LEFT JOIN operators o ON o.operator_id = u.operator_id
       LEFT JOIN user_permissions up ON up.user_id = u.user_id
      WHERE u.deleted_at IS NULL
      GROUP BY u.user_id
      ORDER BY u.created_at DESC`
  );
  return rows.map((u) => ({
    ...u,
    custom_permissions: u.custom_permissions ? u.custom_permissions.split(',') : [],
  }));
}

export async function createUser({ email, password, fullName, roleKey, operatorId, permissions = [] }) {
  const [existing] = await query('SELECT user_id FROM users WHERE email = :email AND deleted_at IS NULL', { email });
  if (existing) throw ApiError.conflict('Email already in use');

  const [role] = await query('SELECT role_id FROM roles WHERE role_key = :rk', { rk: roleKey });
  if (!role) throw ApiError.badRequest('Invalid role');

  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role_id, operator_id, is_active)
     VALUES (:email, :hash, :name, :rid, :opId, 1)`,
    { email, hash, name: fullName || null, rid: role.role_id, opId: operatorId || null }
  );

  if (permissions.length) await setUserPermissions(result.insertId, permissions);

  return { userId: result.insertId, email, fullName, roleKey };
}

export async function updateUser(userId, { fullName, roleKey, operatorId, isActive, permissions }) {
  const [user] = await query('SELECT user_id FROM users WHERE user_id = :id AND deleted_at IS NULL', { id: userId });
  if (!user) throw ApiError.notFound('User not found');

  const fields = [];
  const params = { id: userId };

  if (fullName !== undefined) { fields.push('full_name = :name'); params.name = fullName; }
  if (isActive !== undefined) { fields.push('is_active = :active'); params.active = isActive ? 1 : 0; }
  if (operatorId !== undefined) { fields.push('operator_id = :opId'); params.opId = operatorId || null; }

  if (roleKey !== undefined) {
    const [role] = await query('SELECT role_id FROM roles WHERE role_key = :rk', { rk: roleKey });
    if (!role) throw ApiError.badRequest('Invalid role');
    fields.push('role_id = :rid');
    params.rid = role.role_id;
  }

  if (fields.length) {
    await query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = :id`, params);
  }

  if (permissions !== undefined) await setUserPermissions(userId, permissions);

  return { userId };
}

export async function resetPassword(userId, newPassword) {
  const [user] = await query('SELECT user_id FROM users WHERE user_id = :id AND deleted_at IS NULL', { id: userId });
  if (!user) throw ApiError.notFound('User not found');
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = :hash WHERE user_id = :id', { hash, id: userId });
  return { userId };
}

export async function deleteUser(userId) {
  await query('UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE user_id = :id', { id: userId });
  return { userId };
}

export async function listRoles() {
  return query('SELECT role_key, name FROM roles ORDER BY role_id');
}
