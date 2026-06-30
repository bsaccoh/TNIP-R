import { z } from 'zod';
import * as service from './ingestion.service.js';
import * as kpiEngine from '../kpi/kpi.service.js';
import * as compliance from '../compliance/compliance.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate, pageMeta } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from '../../utils/audit.js';

export const uploadController = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name: file)');
  const operatorId = Number(z.string().or(z.number()).parse(req.body.operator_id ?? req.scope?.operatorId));
  if (!operatorId) throw ApiError.badRequest('operator_id is required');

  // Operator users may only upload for their own operator.
  if (req.user.roleKey === 'OPERATOR_USER' && operatorId !== req.user.operatorId) {
    throw ApiError.forbidden('Cannot upload for another operator');
  }

  const result = await service.ingestHuaweiCsv({
    operatorId,
    fileName: req.file.originalname,
    buffer: req.file.buffer,
    uploadedBy: req.user.userId,
  });

  // Auto-run the calc → compliance pipeline for this file (the vertical slice).
  let kpiSummary = null;
  let complianceSummary = null;
  if (req.body.autoProcess !== 'false') {
    kpiSummary = await kpiEngine.calculateForFile(result.pmFileId, operatorId);
    complianceSummary = await compliance.evaluateOperatorPeriod(operatorId);
  }

  await audit({ userId: req.user.userId, operatorId, action: 'PM_UPLOAD', entityType: 'pm_file', entityId: result.pmFileId, detail: { rows: result.rows }, ip: req.ip });
  return created(res, { ingestion: result, kpi: kpiSummary, compliance: complianceSummary });
});

export const batchUploadController = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name: file)');
  const operatorId = Number(z.string().or(z.number()).parse(req.body.operator_id ?? req.scope?.operatorId));
  if (!operatorId) throw ApiError.badRequest('operator_id is required');
  if (req.user.roleKey === 'OPERATOR_USER' && operatorId !== req.user.operatorId) {
    throw ApiError.forbidden('Cannot upload for another operator');
  }
  const result = await service.ingestArchive({
    operatorId, fileName: req.file.originalname, buffer: req.file.buffer, uploadedBy: req.user.userId,
  });

  // Run KPI + compliance for each successfully ingested file.
  let kpiTotal = 0;
  let complianceSummary = null;
  for (const r of result.results) {
    if (r.status === 'ok' && r.pmFileId) {
      try {
        const kpiResult = await kpiEngine.calculateForFile(r.pmFileId, operatorId);
        r.kpis = kpiResult.kpisCalculated;
        kpiTotal += kpiResult.kpisCalculated;
      } catch (err) {
        r.kpiError = err.message;
      }
    }
  }
  if (kpiTotal > 0) {
    try { complianceSummary = await compliance.evaluateOperatorPeriod(operatorId); } catch {}
  }

  await audit({ userId: req.user.userId, operatorId, action: 'PM_BATCH_UPLOAD', detail: { total: result.total, ok: result.ok, kpis: kpiTotal }, ip: req.ip });
  return created(res, { ...result, kpiTotal, compliance: complianceSummary });
});

export const listController = asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, total } = await service.listFiles({
    operatorId: req.scope?.operatorId ?? null, limit, offset,
  });
  return ok(res, rows, pageMeta(page, limit, total));
});
