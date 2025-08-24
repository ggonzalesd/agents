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
	parseMiddleware(registerRequestSchema, 'body'),
	authRegisterController,
);

export default router;
