export const EXPERIMENT_ROOM_ID = 'main-room';

export type ExperimentPhaseDefinition = {
	key: string;
	componentKey: string;
	index: number;
	title: string;
	description: string;
	config?: Record<string, unknown>;
};

export type ExperimentCatalogEntry = {
	key: string;
	title: string;
	description: string;
	phases: ExperimentPhaseDefinition[];
};

export const EXPERIMENT_CATALOG: ExperimentCatalogEntry[] = [
	{
		key: 'GUIA-EXPERIMENTACION-V4',
		title: 'Guía de Experimentación V4',
		description: 'Experimento de prueba de comportamiento en el mundo.',
		phases: [
			{
				key: 'jump-or-die-1',
				componentKey: 'jump-or-die',
				index: 0,
				title: 'Fase temporal 1: saltar sin morir',
				description:
					'Fase temporal de prueba. Completa la fase al saltar. Si mueres, el intento falla y la fase se reinicia.',
				config: { spawnWolf: true },
			},
			{
				key: 'jump-or-die-2',
				componentKey: 'jump-or-die',
				index: 1,
				title: 'Fase temporal 2: saltar sin morir',
				description:
					'Fase temporal de prueba. Completa la fase al saltar. Si mueres, el intento falla y la fase se reinicia.',
			},
		],
	},
];

export const getExperimentByKey = (key: string): ExperimentCatalogEntry | null =>
	EXPERIMENT_CATALOG.find((e) => e.key === key) ?? null;

export const getExperimentPhaseByKey = (
	phaseKey: string,
	experimentKey?: string,
): ExperimentPhaseDefinition | null => {
	if (experimentKey) {
		const exp = getExperimentByKey(experimentKey);
		return exp?.phases.find((p) => p.key === phaseKey) ?? null;
	}
	for (const exp of EXPERIMENT_CATALOG) {
		const phase = exp.phases.find((p) => p.key === phaseKey);
		if (phase) return phase;
	}
	return null;
};

export const getExperimentPhaseByIndex = (
	index: number,
	experimentKey?: string,
): ExperimentPhaseDefinition | null => {
	if (experimentKey) {
		const exp = getExperimentByKey(experimentKey);
		return exp?.phases.find((p) => p.index === index) ?? null;
	}
	for (const exp of EXPERIMENT_CATALOG) {
		const phase = exp.phases.find((p) => p.index === index);
		if (phase) return phase;
	}
	return null;
};

// Backward compatibility
export const EXPERIMENT_KEY = EXPERIMENT_CATALOG[0].key;
export const EXPERIMENT_PHASES = EXPERIMENT_CATALOG[0].phases;
