import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import { loginController, refreshController, logoutController, meController, updateProfileController } from './auth.controller.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and receive access + refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { email: {type: string}, password: {type: string} }
 *     responses: { 200: { description: OK } }
 */
router.post('/login', loginLimiter, loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.get('/me', authenticate, meController);
router.put('/profile', authenticate, updateProfileController);

export default router;
