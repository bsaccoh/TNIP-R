import { z } from 'zod';
import * as service from './kpi.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';

export const definitionsController = asyncHandler(async (_req, res) =>
  ok(res, await service.listDefinitions())
);

export const timeSeriesController = asyncHandler(async (req, res) => {
  const operatorId = req.scope?.operatorId ?? Number(req.params.operatorId);
  if (!operatorId) throw ApiError.badRequest('operatorId required');
  const kpiKey = z.string().parse(req.query.kpi);
  const data = await service.kpiTimeSeries({
    operatorId, kpiKey, from: req.query.from, to: req.query.to,
  });
  return ok(res, data);
});

export const comparisonController = asyncHandler(async (_req, res) =>
  ok(res, await service.comparisonMatrix())
);

export const analyticsController = asyncHandler(async (_req, res) =>
  ok(res, await service.operatorAnalytics())
);

export const validateController = asyncHandler(async (req, res) => {
  const expression = z.string().min(1).parse(req.body.expression);
  try {
    return ok(res, service.validateFormula(expression));
  } catch (err) {
    throw ApiError.badRequest(`Invalid formula: ${err.message}`);
  }
});

export const recalcController = asyncHandler(async (req, res) => {
  const pmFileId = Number(z.string().or(z.number()).parse(req.body.pm_file_id));
  const operatorId = Number(z.string().or(z.number()).parse(req.body.operator_id));
  return ok(res, await service.calculateForFile(pmFileId, operatorId));
});
