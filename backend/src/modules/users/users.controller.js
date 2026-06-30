import { z } from 'zod';
import * as service from './users.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
  roleKey: z.string(),
  operatorId: z.number().optional().nullable(),
  permissions: z.array(z.string()).optional().default([]),
});

const updateSchema = z.object({
  fullName: z.string().optional(),
  roleKey: z.string().optional(),
  operatorId: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

const resetSchema = z.object({ newPassword: z.string().min(8) });

export const list = asyncHandler(async (_req, res) => ok(res, await service.listUsers()));
export const roles = asyncHandler(async (_req, res) => ok(res, await service.listRoles()));

export const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  ok(res, await service.createUser(data), 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  ok(res, await service.updateUser(Number(req.params.id), data));
});

export const reset = asyncHandler(async (req, res) => {
  const { newPassword } = resetSchema.parse(req.body);
  ok(res, await service.resetPassword(Number(req.params.id), newPassword));
});

export const remove = asyncHandler(async (req, res) => {
  ok(res, await service.deleteUser(Number(req.params.id)));
});
