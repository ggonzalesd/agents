import { Router } from 'express';

import * as AuthController from '$/controllers/auth.controller';

import * as ParseMiddleware from '$/middlewares/parse.middleware';
import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';

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
	ParseMiddleware.parseWithSchema(loginRequestSchema, 'body'),
	AuthController.authLoginController,
);

router.post(
	'/register',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(registerRequestSchema, 'body'),
	AuthController.authRegisterController,
);

router.post(
	'/revoke',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(revokeRequestSchema, 'body'),
	AuthController.revokeTokensController,
);

router.get(
	'/profile',
	AuthMiddleware.validateJwtToken(),
	AuthController.profileAuthController,
);

router.post('/logout', (_, res) => {
	res.clearCookie('token');
	res.json({ message: 'Logged out successfully' });
});

export default router;
