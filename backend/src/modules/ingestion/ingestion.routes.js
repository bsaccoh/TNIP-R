import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { env } from '../../config/env.js';
import * as c from './ingestion.controller.js';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxMb * 1024 * 1024 },
});

/**
 * @openapi
 * /ingestion/upload:
 *   post:
 *     tags: [Ingestion]
 *     summary: Upload a Huawei PM CSV for an operator (auto-parses, calculates KPIs, evaluates compliance)
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               operator_id: { type: integer }
 *     responses: { 201: { description: Ingested } }
 */
router.post(
  '/upload',
  requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN', 'OPERATOR_USER'),
  operatorScope,
  upload.single('file'),
  c.uploadController
);

/**
 * @openapi
 * /ingestion/batch:
 *   post:
 *     tags: [Ingestion]
 *     summary: Upload a .tar.gz / .gz archive of PM files (each CSV ingested independently)
 */
router.post(
  '/batch',
  requireRole('REGULATOR_ADMIN', 'SYSTEM_ADMIN', 'OPERATOR_USER'),
  operatorScope,
  upload.single('file'),
  c.batchUploadController
);

router.get('/files', operatorScope, c.listController);

export default router;
