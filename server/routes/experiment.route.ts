import { Router } from 'express';

import { submitExperimentFeedbackRequestSchema } from '#/schema/experiment.schema';

import * as AuthMiddleware from '$/middlewares/auth.middleware';
import * as ParseMiddleware from '$/middlewares/parse.middleware';
import * as RoleMiddleware from '$/middlewares/role.middleware';

import * as ExperimentController from '$/controllers/experiment.controller';

const router = Router();

router.get(
	'/me/available',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'USER'),
	ExperimentController.getMyAvailableExperimentsController,
);

router.get(
	'/me/:experimentKey',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'USER'),
	ExperimentController.getMyExperimentController,
);

router.get(
	'/admin/active',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN'),
	ExperimentController.getActiveExperimentsForAdminController,
);

router.post(
	'/me/feedback',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'USER'),
	ParseMiddleware.parseWithSchema(submitExperimentFeedbackRequestSchema, 'body'),
	ExperimentController.submitExperimentFeedbackController,
);

router.post(
	'/me/reset',
	AuthMiddleware.validateJwtToken(),
	RoleMiddleware.withRoles('ADMIN', 'USER'),
	ExperimentController.resetExperimentController,
);

export default router;
