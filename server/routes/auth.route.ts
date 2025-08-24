import { Router } from 'express';

import { parseMiddleware } from '$/middlewares/parse.middleware';
import {
	authLoginController,
	authRegisterController,
} from '$/controllers/auth.controller';

import {
	loginRequestSchema,
	registerRequestSchema,
} from '#/schema/auth.schema';
import { authMiddlewareFactory } from '$/middlewares/auth.middleware';

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
	authMiddlewareFactory(),
	parseMiddleware(registerRequestSchema, 'body'),
	authRegisterController,
);

router.post('/logout', (_, res) => {
	res.clearCookie('token');
	res.json({ message: 'Logged out successfully' });
});

export default router;
