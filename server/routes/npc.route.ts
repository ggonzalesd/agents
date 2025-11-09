import z from 'zod';
import { Router } from 'express';

import { createNpcRequestSchema } from '#/schema/npc.schema';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';
import * as ParseMiddleware from '$/middlewares/parse.middleware';

import * as NPCController from '$/controllers/npc.controller';

const router = Router();

router.get(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(z.object({ id: z.uuid() }), 'params'),
	NPCController.getOneNPCController,
);

router.get(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	NPCController.getAllNPCsController,
);

router.post(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD'),
	ParseMiddleware.parseWithSchema(createNpcRequestSchema, 'body'),
	NPCController.createNPCController,
);

router.put(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD'),
	ParseMiddleware.parseWithSchema(z.object({ id: z.uuid() }), 'params'),
	ParseMiddleware.parseWithSchema(createNpcRequestSchema.partial(), 'body'),
	NPCController.updateNPCController,
);

export default router;
