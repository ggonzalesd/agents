import { Router } from 'express';

import {
	authLoginController,
	authRegisterController,
	profileAuthController,
	revokeTokensController,
} from '$/controllers/auth.controller';

import { parseMiddleware } from '$/middlewares/parse.middleware';
import { authMiddleware } from '$/middlewares/auth.middleware';
import { roleMiddleware } from '$/middlewares/role.middleware';

import {
	loginRequestSchema,
	registerRequestSchema,
	revokeRequestSchema,
} from '#/schema/auth.schema';

const router = Router();

router.get('/', async (_, res) => {
	res.json({ message: 'Auth route works' });
});

router.post(
	'/login',
	parseMiddleware(loginRequestSchema, 'body'),
	authLoginController,
);

router.post(
	'/register',
	authMiddleware(),
	roleMiddleware('ADMIN'),
	parseMiddleware(registerRequestSchema, 'body'),
	authRegisterController,
);

router.post(
	'/revoke',
	authMiddleware(),
	roleMiddleware('ADMIN'),
	parseMiddleware(revokeRequestSchema, 'body'),
	revokeTokensController,
);

router.get('/profile', authMiddleware(), profileAuthController);

router.post('/logout', (_, res) => {
	res.clearCookie('token');
	res.json({ message: 'Logged out successfully' });
});

export default router;
