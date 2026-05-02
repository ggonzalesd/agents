import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';

import type { SubmitExperimentFeedbackRequest } from '#/schema/experiment.schema';
import { EXPERIMENT_ROOM_ID } from '#/experiments/guia-experimentacion-v4';
import { HttpError } from '#/utils/HttpError';
import { jsonResponse } from '#/utils/HttpResponse';

import { getAuth } from '$/utils/req.utils';

import * as ExperimentService from '$/services/experiment-orchestrator.service';
import { MainRoom } from '$/game/main.room';

const getActor = (req: Request) => {
	const { payload } = getAuth(req);
	return {
		userId: payload.id,
		username: payload.username,
		role: payload.role,
	};
};

export const getMyAvailableExperimentsController = async (
	req: Request,
	res: Response,
) => {
	const experiments = await ExperimentService.getAvailableExperimentsForUser(
		getActor(req),
	);

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Available experiments retrieved successfully' },
		),
	);
};

export const getMyExperimentController = async (
	req: Request,
	res: Response,
) => {
	const actor = getActor(req);
	const { experimentKey } = req.params;

	if (!experimentKey) {
		throw HttpError.badRequest('experimentKey is required');
	}

	const experiment = await ExperimentService.getExperimentStateForUser(
		actor,
		experimentKey,
	);

	res.json(
		jsonResponse.ok(
			{ experiment },
			{ message: 'Experiment state retrieved successfully' },
		),
	);
};

export const getActiveExperimentsForAdminController = async (
	_req: Request,
	res: Response,
) => {
	const room = await matchMaker.getLocalRoomById(EXPERIMENT_ROOM_ID);
	if (!(room instanceof MainRoom)) {
		res.json(jsonResponse.ok({ experiments: [] }, { message: 'Room not active' }));
		return;
	}

	const experiments = await ExperimentService.getActiveExperimentsForAdmin(
		room.roomId,
	);

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Active experiments retrieved successfully' },
		),
	);
};

export const submitExperimentFeedbackController = async (
	req: Request,
	res: Response,
) => {
	const actor = getActor(req);
	const payload = req.body as SubmitExperimentFeedbackRequest;

	await ExperimentService.submitExperimentFeedback({ actor, payload });

	const experiment = await ExperimentService.getExperimentStateForUser(
		actor,
		payload.experimentKey,
	);

	res.json(
		jsonResponse.ok(
			{ experiment },
			{ message: 'Experiment feedback submitted successfully' },
		),
	);
};

export const resetExperimentController = async (
	req: Request,
	res: Response,
) => {
	const actor = getActor(req);
	const { experimentKey } = req.body as { experimentKey: string };

	if (!experimentKey) {
		throw HttpError.badRequest('experimentKey is required');
	}

	await ExperimentService.resetExperiment({ actor, experimentKey });

	const experiment = await ExperimentService.getExperimentStateForUser(
		actor,
		experimentKey,
	);

	res.json(
		jsonResponse.ok(
			{ experiment },
			{ message: 'Experiment reset successfully' },
		),
	);
};
