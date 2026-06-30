import { ApiError } from '../utils/ApiError.js';

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
