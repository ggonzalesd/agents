import { Router } from 'express';

import * as AuthController from '$/controllers/auth.controller';

import * as ParseMiddleware from '$/middlewares/parse.middleware';
import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';

import {
	loginRequestSchema,
	registerRequestSchema,
	revokeRequestSchema,
	redeemTokenLoginRequestSchema,
	createRedeemTokenRequestSchema,
} from '#/schema/auth.schema';

const router = Router();

router.get('/', async (_, res) => {
	res.json({ message: 'Auth route works' });
});

// ─── Credential login ────────────────────────────────────────────────────────
router.post(
	'/login',
	ParseMiddleware.parseWithSchema(loginRequestSchema, 'body'),
	AuthController.authLoginController,
);

// ─── Redeem token login ──────────────────────────────────────────────────────
router.post(
	'/login/redeem',
	ParseMiddleware.parseWithSchema(redeemTokenLoginRequestSchema, 'body'),
	AuthController.authRedeemLoginController,
);

// ─── Refresh token ───────────────────────────────────────────────────────────
router.post('/refresh', AuthController.refreshTokenController);

// ─── Register (admin) ────────────────────────────────────────────────────────
router.post(
	'/register',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(registerRequestSchema, 'body'),
	AuthController.authRegisterController,
);

// ─── Revoke (admin) ──────────────────────────────────────────────────────────
router.post(
	'/revoke',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(revokeRequestSchema, 'body'),
	AuthController.revokeTokensController,
);

// ─── Profile ─────────────────────────────────────────────────────────────────
router.get(
	'/profile',
	AuthMiddleware.validateJwtToken(),
	AuthController.profileAuthController,
);

// ─── Logout ──────────────────────────────────────────────────────────────────
router.post('/logout', AuthController.logoutController);

// ─── Redeem Token CRUD (admin) ───────────────────────────────────────────────
router.post(
	'/redeem-token',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(createRedeemTokenRequestSchema, 'body'),
	AuthController.createRedeemTokenController,
);

router.get(
	'/redeem-token',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AuthController.listRedeemTokensController,
);

router.delete(
	'/redeem-token/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AuthController.deleteRedeemTokenController,
);

export default router;
