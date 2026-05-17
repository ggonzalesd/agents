import type { Request, Response } from 'express';

import { jsonResponse } from '#/utils/HttpResponse';

import * as AdminExperimentService from '$/services/admin-experiment.service';
import * as ExperimentService from '$/services/experiment-orchestrator.service';

export const getAssignmentsController = async (
	_req: Request,
	res: Response,
) => {
	const assignments = await AdminExperimentService.getAllAssignments();

	res.json(
		jsonResponse.ok(
			{ assignments },
			{ message: 'Assignments retrieved successfully' },
		),
	);
};

export const deleteAssignmentController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;

	const result = await AdminExperimentService.deleteAssignment(id);

	res.json(
		jsonResponse.ok(result, { message: 'Assignment deleted successfully' }),
	);
};

export const updateExperimentController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;
	const data = req.body;

	await AdminExperimentService.updateExperiment(id, data);

	const experiments = await ExperimentService.getAllExperimentsForAdmin();

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Experiment updated successfully' },
		),
	);
};

export const resetExperimentProgressController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;

	await AdminExperimentService.resetExperimentProgress(id);

	const experiments = await ExperimentService.getAllExperimentsForAdmin();

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Experiment progress reset successfully' },
		),
	);
};

export const updatePhaseController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;
	const data = req.body;

	await AdminExperimentService.updatePhase(id, data);

	const experiments = await ExperimentService.getAllExperimentsForAdmin();

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Phase updated successfully' },
		),
	);
};

export const deletePhaseController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;

	await AdminExperimentService.deletePhase(id);

	const experiments = await ExperimentService.getAllExperimentsForAdmin();

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Phase deleted successfully' },
		),
	);
};

export const resetPhaseProgressController = async (
	req: Request,
	res: Response,
) => {
	const { id } = req.params;

	await AdminExperimentService.resetPhaseProgress(id);

	const experiments = await ExperimentService.getAllExperimentsForAdmin();

	res.json(
		jsonResponse.ok(
			{ experiments },
			{ message: 'Phase progress reset successfully' },
		),
	);
};

export const exportExcelController = async (
	_req: Request,
	res: Response,
) => {
	const result = await AdminExperimentService.generateExcelExport();

	res.json(
		jsonResponse.ok(result, { message: 'Excel export generated successfully' }),
	);
};