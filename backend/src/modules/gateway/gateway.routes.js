import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as svc from './gateway.service.js';

const router = Router();

const regulatorRoles = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];
const canRead  = requireAccess({ permissions: ['ingestion:read']  });
const canWrite = requireAccess({ permissions: ['ingestion:write'] });

/* ═══════════════════════════════════════════════════════════════════════════
   Management routes — JWT auth (existing session users)
   ═══════════════════════════════════════════════════════════════════════════ */
const mgmt = Router();
mgmt.use(authenticate);

/* API key management */
mgmt.get('/keys', canRead, asyncHandler(async (req, res) => {
  const isRegulator = regulatorRoles.includes(req.user.role);
  if (isRegulator) {
    ok(res, await svc.listAllApiKeys({ status: req.query.status }));
  } else {
    if (!req.user.operatorId) throw ApiError.forbidden();
    ok(res, await svc.listApiKeys(req.user.operatorId));
  }
}));

mgmt.post('/keys', canWrite, asyncHandler(async (req, res) => {
  const isRegulator = regulatorRoles.includes(req.user.role);
  const operatorId  = isRegulator ? req.body.operatorId : req.user.operatorId;
  if (!operatorId) throw ApiError.badRequest('operatorId required');

  const result = await svc.createApiKey({
    operatorId,
    label:      req.body.label,
    scopes:     req.body.scopes,
    rateLimit:  req.body.rateLimit,
    expiresAt:  req.body.expiresAt,
    createdBy:  req.user.userId,
  });
  ok(res, result, 201);
}));

mgmt.delete('/keys/:keyId', canWrite, asyncHandler(async (req, res) => {
  await svc.revokeApiKey(req.params.keyId, req.user.userId);
  ok(res, { revoked: true });
}));

/* Push logs */
mgmt.get('/logs', canRead, asyncHandler(async (req, res) => {
  const isRegulator = regulatorRoles.includes(req.user.role);
  const operatorId  = isRegulator ? req.query.operatorId : req.user.operatorId;
  ok(res, await svc.getPushLogs({
    operatorId,
    keyId:  req.query.keyId,
    limit:  req.query.limit,
    offset: req.query.offset,
  }));
}));

mgmt.get('/stats', canRead, asyncHandler(async (req, res) => {
  const isRegulator = regulatorRoles.includes(req.user.role);
  const operatorId  = isRegulator ? req.query.operatorId : req.user.operatorId;
  ok(res, await svc.pushStats(operatorId));
}));

router.use('/mgmt', mgmt);

/* ═══════════════════════════════════════════════════════════════════════════
   Push routes — API key auth (operator systems)
   ═══════════════════════════════════════════════════════════════════════════ */
async function apiKeyAuth(req, res, next) {
  const header = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!header) throw ApiError.forbidden('API key required (X-Api-Key header)');
  try {
    req.apiKey = await svc.authenticateKey(header);
    req.operatorId = req.apiKey.operator_id;
    next();
  } catch (e) {
    next(e);
  }
}

function hasScope(scope) {
  return (req, _res, next) => {
    const scopes = req.apiKey?.scopes || [];
    const parsed = typeof scopes === 'string' ? JSON.parse(scopes) : scopes;
    if (!parsed.includes(scope)) throw ApiError.forbidden(`API key missing scope: ${scope}`);
    next();
  };
}

async function withPushLog(req, res, endpoint, handler) {
  const start = Date.now();
  let result, statusCode = 200;
  try {
    result     = await handler();
    statusCode = 200;
  } catch (e) {
    statusCode = e.status || 500;
    await svc.recordPush({
      keyId: req.apiKey.key_id, operatorId: req.operatorId,
      endpoint, statusCode,
      errorMsg:   e.message,
      ipAddress:  req.ip,
      durationMs: Date.now() - start,
    });
    throw e;
  }
  await svc.recordPush({
    keyId:        req.apiKey.key_id,
    operatorId:   req.operatorId,
    endpoint,
    statusCode,
    rowsReceived: result?.received ?? 0,
    rowsAccepted: result?.accepted ?? 0,
    ipAddress:    req.ip,
    durationMs:   Date.now() - start,
  });
  return result;
}

const push = Router();
push.use(asyncHandler(apiKeyAuth));

push.post('/pm', hasScope('push:pm'), asyncHandler(async (req, res) => {
  const result = await withPushLog(req, res, '/push/pm', () =>
    svc.pushPmData({ operatorId: req.operatorId, rows: req.body.rows ?? req.body }));
  ok(res, result);
}));

push.post('/kpi', hasScope('push:kpi'), asyncHandler(async (req, res) => {
  const result = await withPushLog(req, res, '/push/kpi', () =>
    svc.pushKpiData({ operatorId: req.operatorId, rows: req.body.rows ?? req.body }));
  ok(res, result);
}));

push.post('/alarms', hasScope('push:alarms'), asyncHandler(async (req, res) => {
  const result = await withPushLog(req, res, '/push/alarms', () =>
    svc.pushAlarms({ operatorId: req.operatorId, rows: req.body.rows ?? req.body }));
  ok(res, result);
}));

/* Heartbeat — lets operators verify their key works */
push.get('/ping', asyncHandler(async (req, res) => {
  ok(res, {
    ok: true,
    operator: req.apiKey.operator_name,
    scopes: typeof req.apiKey.scopes === 'string'
      ? JSON.parse(req.apiKey.scopes)
      : req.apiKey.scopes,
  });
}));

router.use('/push', push);

export default router;
