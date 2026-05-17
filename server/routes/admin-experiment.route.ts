import { Router } from 'express';

import { adminExperimentUpdateSchema, adminPhaseUpdateSchema } from '#/schema/experiment.schema';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as ParseMiddleware from '$/middlewares/parse.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';

import * as AdminExperimentController from '$/controllers/admin-experiment.controller';

const router = Router();

router.get(
	'/assignments',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AdminExperimentController.getAssignmentsController,
);

router.delete(
	'/assignments/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AdminExperimentController.deleteAssignmentController,
);

router.patch(
	'/experiments/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(adminExperimentUpdateSchema, 'body'),
	AdminExperimentController.updateExperimentController,
);

router.delete(
	'/experiments/:id/progress',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AdminExperimentController.resetExperimentProgressController,
);

router.patch(
	'/phases/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ParseMiddleware.parseWithSchema(adminPhaseUpdateSchema, 'body'),
	AdminExperimentController.updatePhaseController,
);

router.delete(
	'/phases/:id',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AdminExperimentController.deletePhaseController,
);

router.delete(
	'/phases/:id/attempts',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AdminExperimentController.resetPhaseProgressController,
);

router.get(
	'/export/excel',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	AdminExperimentController.exportExcelController,
);

export default router;