import { z } from 'zod';
import * as authService from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { audit } from '../../utils/audit.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  await audit({ userId: result.user.userId, operatorId: result.user.operatorId, action: 'LOGIN', ip: req.ip });
  return ok(res, result);
});

export const refreshController = asyncHandler(async (req, res) => {
  const token = z.object({ refreshToken: z.string() }).parse(req.body).refreshToken;
  return ok(res, await authService.refresh(token));
});

export const logoutController = asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken);
  return ok(res, { loggedOut: true });
});

export const meController = asyncHandler(async (req, res) => {
  return ok(res, await authService.me(req.user.userId));
});

const profileSchema = z.object({
  fullName: z.string().min(1).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export const updateProfileController = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  return ok(res, await authService.updateProfile(req.user.userId, data));
});
