import { z } from 'zod';
import * as service from './compliance.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { audit } from '../../utils/audit.js';

export const matrixController = asyncHandler(async (req, res) =>
  ok(res, await service.complianceMatrix(req.query.period))
);

export const summaryController = asyncHandler(async (req, res) =>
  ok(res, await service.complianceSummary(req.scope?.operatorId ?? null))
);

export const alertsController = asyncHandler(async (req, res) =>
  ok(res, await service.listAlerts({ operatorId: req.scope?.operatorId ?? null, limit: 50 }))
);

export const evaluateController = asyncHandler(async (req, res) => {
  const operatorId = Number(z.string().or(z.number()).parse(req.body.operator_id));
  const result = await service.evaluateOperatorPeriod(operatorId);
  await audit({ userId: req.user.userId, operatorId, action: 'COMPLIANCE_EVALUATE', detail: result, ip: req.ip });
  return ok(res, result);
});
