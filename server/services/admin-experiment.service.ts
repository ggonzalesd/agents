import ExcelJS from 'exceljs';

import { getExperimentByKey } from '#/experiments/guia-experimentacion-v4';
import { HttpError } from '#/utils/HttpError';

import * as AdminExperimentRepository from '$/db/admin-experiment.db';
import { uploadFile, getSignedUrl } from '$/services/s3.service';

export const getAllAssignments = async () => {
	const assignments = await AdminExperimentRepository.getAllAssignments();
	return assignments.map((a) => ({
		id: a.id,
		userId: a.userId,
		username: a.user.username,
		role: a.user.role,
		experimentKey: a.experimentKey,
		enabled: a.enabled,
		createdAt: a.createdAt.toISOString(),
	}));
};

export const deleteAssignment = async (id: string) => {
	const assignment = await AdminExperimentRepository.getAssignmentById(id);
	if (!assignment) {
		throw HttpError.notFound('Assignment not found');
	}

	await AdminExperimentRepository.deleteAssignmentById(id);
	return { deleted: true };
};

export const updateExperiment = async (
	id: string,
	data: { status?: string; rating?: number | null; comment?: string | null },
) => {
	const experiment = await AdminExperimentRepository.getExperimentById(id);
	if (!experiment) {
		throw HttpError.notFound('Experiment not found');
	}

	const updateData: {
		status?: import('@prisma/client').ExperimentRunStatus;
		rating?: number | null;
		comment?: string | null;
	} = {};

	if (data.status) {
		updateData.status = data.status as import('@prisma/client').ExperimentRunStatus;
	}
	if (data.rating !== undefined) {
		updateData.rating = data.rating;
	}
	if (data.comment !== undefined) {
		updateData.comment = data.comment;
	}

	return AdminExperimentRepository.updateExperimentById(id, updateData);
};

export const updatePhase = async (
	id: string,
	data: { status?: string; failureCount?: number; attemptCount?: number },
) => {
	const phase = await AdminExperimentRepository.getPhaseById(id);
	if (!phase) {
		throw HttpError.notFound('Phase not found');
	}

	const updateData: {
		status?: import('@prisma/client').ExperimentPhaseStatus;
		failureCount?: number;
		attemptCount?: number;
	} = {};

	if (data.status) {
		updateData.status = data.status as import('@prisma/client').ExperimentPhaseStatus;
	}
	if (data.failureCount !== undefined) {
		updateData.failureCount = data.failureCount;
	}
	if (data.attemptCount !== undefined) {
		updateData.attemptCount = data.attemptCount;
	}

	return AdminExperimentRepository.updatePhaseById(id, updateData);
};

export const resetExperimentProgress = async (id: string) => {
	const experiment = await AdminExperimentRepository.getExperimentById(id);
	if (!experiment) {
		throw HttpError.notFound('Experiment not found');
	}

	return AdminExperimentRepository.resetExperimentProgressDb(id);
};

export const resetPhaseProgress = async (id: string) => {
	const phase = await AdminExperimentRepository.getPhaseById(id);
	if (!phase) {
		throw HttpError.notFound('Phase not found');
	}

	await AdminExperimentRepository.resetPhaseProgressDb(id);

	const experiment = await AdminExperimentRepository.getExperimentById(
		phase.experimentId,
	);
	if (!experiment) {
		throw HttpError.notFound('Experiment not found');
	}

	if (
		experiment.currentPhaseIndex > 0 &&
		phase.phaseIndex < experiment.currentPhaseIndex
	) {
		await AdminExperimentRepository.updateExperimentById(phase.experimentId, {
			status: 'NOT_STARTED',
		});
	}

	return { success: true };
};

export const deletePhase = async (id: string) => {
	const phase = await AdminExperimentRepository.getPhaseById(id);
	if (!phase) {
		throw HttpError.notFound('Phase not found');
	}

	const experiment = await AdminExperimentRepository.getExperimentById(
		phase.experimentId,
	);
	if (!experiment) {
		throw HttpError.notFound('Experiment not found');
	}

	const deletedPhaseIndex = phase.phaseIndex;

	await AdminExperimentRepository.deletePhaseById(id);
	await AdminExperimentRepository.reindexPhasesAfterDelete(
		phase.experimentId,
		deletedPhaseIndex,
	);

	const updatedExperiment = await AdminExperimentRepository.getExperimentById(
		phase.experimentId,
	);
	if (!updatedExperiment) {
		throw HttpError.notFound('Experiment not found after phase deletion');
	}

	if (updatedExperiment.phases.length === 0) {
		await AdminExperimentRepository.updateExperimentById(phase.experimentId, {
			status: 'COMPLETED',
			completedAt: new Date(),
			mountedAt: null,
			mountedRoomId: null,
		});
	} else if (experiment.currentPhaseIndex > deletedPhaseIndex) {
		await AdminExperimentRepository.updateExperimentById(phase.experimentId, {
			status: 'NOT_STARTED',
		});
	} else if (experiment.currentPhaseIndex === deletedPhaseIndex) {
		await AdminExperimentRepository.updateExperimentById(phase.experimentId, {
			status: 'NOT_STARTED',
		});
	}

	return { success: true };
};

export const generateExcelExport = async () => {
	const [assignments, experiments] = await Promise.all([
		AdminExperimentRepository.getAllAssignments(),
		AdminExperimentRepository.getAllExperimentsForExport(),
	]);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Admin Panel';
	workbook.created = new Date();

	// ── Assignments Sheet ──
	const assignmentsSheet = workbook.addWorksheet('Asignaciones', {
		properties: { defaultColWidth: 20 },
	});
	assignmentsSheet.addRow([
		'ID',
		'User ID',
		'Username',
		'Role',
		'Experiment Key',
		'Enabled',
		'Created At',
	]);
	for (const a of assignments) {
		assignmentsSheet.addRow([
			a.id,
			a.userId,
			a.user.username,
			a.user.role,
			a.experimentKey,
			a.enabled ? 'Yes' : 'No',
			a.createdAt.toISOString(),
		]);
	}

	// ── Experiments Progress Sheet ──
	const experimentsSheet = workbook.addWorksheet('Progreso Experimentos', {
		properties: { defaultColWidth: 20 },
	});
	experimentsSheet.addRow([
		'ID',
		'User ID',
		'Username',
		'Role',
		'Experiment Key',
		'Title',
		'Status',
		'Current Phase',
		'Completed Phases',
		'Total Phases',
		'Rating',
		'Comment',
		'Started At',
		'Completed At',
		'Created At',
	]);
	for (const e of experiments) {
		const catalogEntry = getExperimentByKey(e.experimentKey);
		const completedPhases = e.phases.filter(
			(p) => p.status === 'COMPLETED',
		).length;
		experimentsSheet.addRow([
			e.id,
			e.userId,
			e.user.username,
			e.user.role,
			e.experimentKey,
			catalogEntry?.title ?? e.experimentKey,
			e.status,
			e.currentPhaseIndex,
			completedPhases,
			e.phases.length,
			e.rating ?? '',
			e.comment ?? '',
			e.startedAt?.toISOString() ?? '',
			e.completedAt?.toISOString() ?? '',
			e.createdAt.toISOString(),
		]);
	}

	// ── Phases Progress Sheet ──
	const phasesSheet = workbook.addWorksheet('Progreso Fases', {
		properties: { defaultColWidth: 20 },
	});
	phasesSheet.addRow([
		'Experiment ID',
		'Username',
		'Experiment Key',
		'Phase ID',
		'Phase Key',
		'Phase Index',
		'Title',
		'Status',
		'Attempt Count',
		'Failure Count',
		'Total Time (ms)',
		'Current Attempt',
		'Current Attempt Elapsed (ms)',
		'Mounted At',
		'Completed At',
	]);
	for (const e of experiments) {
		const catalogEntry = getExperimentByKey(e.experimentKey);
		for (const p of e.phases) {
			const phaseDef = catalogEntry?.phases.find(
				(cat) => cat.key === p.phaseKey,
			);
			phasesSheet.addRow([
				e.id,
				e.user.username,
				e.experimentKey,
				p.id,
				p.phaseKey,
				p.phaseIndex,
				phaseDef?.title ?? p.phaseKey,
				p.status,
				p.attemptCount,
				p.failureCount,
				p.totalTimeMs,
				p.currentAttemptNumber,
				p.currentAttemptElapsedMs,
				p.mountedAt?.toISOString() ?? '',
				p.completedAt?.toISOString() ?? '',
			]);
		}
	}

	// ── Attempts Sheet ──
	const attemptsSheet = workbook.addWorksheet('Intentos', {
		properties: { defaultColWidth: 20 },
	});
	attemptsSheet.addRow([
		'Username',
		'Experiment Key',
		'Phase Key',
		'Phase Index',
		'Attempt Number',
		'Status',
		'Failure Count',
		'Elapsed (ms)',
		'Started At',
		'Ended At',
	]);
	for (const e of experiments) {
		for (const p of e.phases) {
			for (const a of p.attempts) {
				attemptsSheet.addRow([
					e.user.username,
					e.experimentKey,
					p.phaseKey,
					p.phaseIndex,
					a.attemptNumber,
					a.status,
					a.failureCount,
					a.elapsedMs,
					a.startedAt.toISOString(),
					a.endedAt?.toISOString() ?? '',
				]);
			}
		}
	}

	const buffer = await workbook.xlsx.writeBuffer();
	const key = `exports/experiments-${Date.now()}.xlsx`;

	await uploadFile(key, Buffer.from(buffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

	const url = await getSignedUrl(key, 3600);

	return { url };
};