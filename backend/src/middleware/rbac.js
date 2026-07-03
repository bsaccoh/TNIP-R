import { ApiError } from '../utils/ApiError.js';
import { query } from '../config/db.js';

/** Allow only the given role keys. Usage: requireRole('REGULATOR_ADMIN','SYSTEM_ADMIN') */
export function requireRole(...roleKeys) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roleKeys.includes(req.user.roleKey)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    return next();
  };
}

/**
 * Effective permissions for a user = role defaults ∪ per-user custom grants.
 * Returns a Set of perm_key strings. Mirrors auth.service.me().
 */
export async function getEffectivePermissions(userId, roleKey) {
  const [rolePerms, userPerms] = await Promise.all([
    query(
      `SELECT p.perm_key FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.permission_id
         JOIN roles r ON r.role_id = rp.role_id
        WHERE r.role_key = :role`,
      { role: roleKey }
    ),
    query('SELECT perm_key FROM user_permissions WHERE user_id = :uid', { uid: userId }),
  ]);
  return new Set([...rolePerms.map((p) => p.perm_key), ...userPerms.map((p) => p.perm_key)]);
}

/**
 * Grant access if the user's ROLE is in `roles` OR their effective permissions
 * include at least one key from `permissions`. This is the server-side twin of
 * the frontend <RoleGuard> — the UI and API enforce the exact same rule.
 *
 * Usage: requireAccess({ roles: ['SYSTEM_ADMIN','REGULATOR_ADMIN'], permissions: ['operators:write'] })
 *
 * Role matches are resolved from the JWT (no DB hit). Only the permission
 * fallback queries the DB, so admins pay nothing.
 */
export function requireAccess({ roles = [], permissions = [] } = {}) {
  return async (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());

    // Fast path: role alone satisfies the guard.
    if (roles.includes(req.user.roleKey)) return next();

    // Fallback: effective permissions (role defaults ∪ custom grants).
    if (permissions.length) {
      try {
        const granted = await getEffectivePermissions(req.user.userId, req.user.roleKey);
        if (permissions.some((p) => granted.has(p))) return next();
      } catch (err) {
        return next(err);
      }
    }

    return next(ApiError.forbidden('Insufficient permissions'));
  };
}

/**
 * Operator data isolation. OPERATOR_USER may only touch their own operator_id.
 * Resolves the effective operatorId from the route/query and enforces scope.
 * Attaches req.scope.operatorId (number | null=all-operators for regulator).
 */
export function operatorScope(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  const requested =
    req.params.operatorId ?? req.query.operatorId ?? req.body?.operator_id ?? null;
  const requestedId = requested != null ? Number(requested) : null;

  if (req.user.roleKey === 'OPERATOR_USER') {
    if (req.user.operatorId == null) {
      return next(ApiError.forbidden('Operator user has no operator binding'));
    }
    if (requestedId != null && requestedId !== req.user.operatorId) {
      return next(ApiError.forbidden('Cannot access another operator\'s data'));
    }
    req.scope = { operatorId: req.user.operatorId, crossOperator: false };
  } else {
    // Regulator/system roles: requestedId narrows the view, null = all operators.
    req.scope = { operatorId: requestedId, crossOperator: requestedId == null };
  }
  return next();
}
