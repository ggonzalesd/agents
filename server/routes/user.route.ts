import z from 'zod';
import { Router } from 'express';

import { createUserRequestSchema } from '#/schema/user.schema';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';
import * as ParseMiddleware from '$/middlewares/parse.middleware';

import * as UserController from '$/controllers/user.controller';

const router = Router();

router.get(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(z.object({ id: z.uuid() }), 'params'),
	UserController.getOneUserController,
);

router.get(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	UserController.getAllUsersController,
);

router.post(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(createUserRequestSchema, 'body'),
	UserController.createUserController,
);

router.put(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(z.object({ id: z.uuid() }), 'params'),
	ParseMiddleware.parseWithSchema(createUserRequestSchema.partial(), 'body'),
	UserController.updateUserController,
);

export default router;
