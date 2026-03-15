import z from 'zod';
import { Router } from 'express';

import { createMissionSchema } from '#/schema/mission.schema';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';
import * as ParseMiddleware from '$/middlewares/parse.middleware';

import * as MissionController from '$/controllers/mission.controller';

const router = Router();

// Get my created missions (must be before /:id)
router.get(
	'/me/created',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	MissionController.getMyCreatedMissionsController,
);

// Get my accepted missions (must be before /:id)
router.get(
	'/me/accepted',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	MissionController.getMyAcceptedMissionsController,
);

// Get open missions (public for authenticated users)
router.get(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	MissionController.getOpenMissionsController,
);

// Get missions by entity identifier (for viewing another player's missions)
router.get(
	'/entity/:identifier',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(
		z.object({ identifier: z.string().min(1) }),
		'params',
	),
	MissionController.getMissionsByEntityIdController,
);

// Get mission by ID
router.get(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(
		z.object({ id: z.string().uuid() }),
		'params',
	),
	MissionController.getMissionByIdController,
);

// Create a new mission
router.post(
	'/',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(createMissionSchema, 'body'),
	MissionController.createMissionController,
);

// Accept a mission
router.post(
	'/:id/accept',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(
		z.object({ id: z.string().uuid() }),
		'params',
	),
	MissionController.acceptMissionController,
);

// Complete a mission (only creator can do this)
router.post(
	'/:id/complete/:acceptorId',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(
		z.object({ id: z.string().uuid(), acceptorId: z.string().uuid() }),
		'params',
	),
	MissionController.completeMissionController,
);

// Abandon a mission
router.post(
	'/:id/abandon',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(
		z.object({ id: z.string().uuid() }),
		'params',
	),
	MissionController.abandonMissionController,
);

// Cancel a mission (only creator can do this)
router.delete(
	'/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'MOD', 'USER'),
	ParseMiddleware.parseWithSchema(
		z.object({ id: z.string().uuid() }),
		'params',
	),
	MissionController.cancelMissionController,
);

export default router;
