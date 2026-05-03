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
		key: 'NPCS-SIN-LLMS',
		title: 'NPCs sin LLMs',
		description: 'Experimento de interacción con NPCs clásicos sin uso de modelos de lenguaje.',
		phases: [
			{
				key: 'request-gold-coin-1',
				componentKey: 'request-gold-coin',
				index: 0,
				title: 'Fase 1: Pedir una moneda de oro',
				description: 'Habla con el aldeano y convéncelo de que te entregue una moneda de oro. Hay varias formas de lograrlo.',
			},
			// {
			// 	key: 'defeat-villain-npc-2',
			// 	componentKey: 'defeat-villain-npc',
			// 	index: 1,
			// 	title: 'Fase 2: Vencer a un NPC villano',
			// 	description: 'Derrota al NPC villano que aparecerá en el escenario.',
			// },
			// {
			// 	key: 'help-hunt-deer-3',
			// 	componentKey: 'help-hunt-deer',
			// 	index: 2,
			// 	title: 'Fase 3: Ayudar al NPC a cazar ciervos',
			// 	description: 'Ayuda al NPC cazador a matar 3 ciervos.',
			// },
			// {
			// 	key: 'collect-apples-4',
			// 	componentKey: 'collect-apples',
			// 	index: 3,
			// 	title: 'Fase 4: Recolectar manzanas verdes',
			// 	description: 'Ayuda al NPC a obtener 5 manzanas verdes.',
			// },
			// {
			// 	key: 'escort-npc-5',
			// 	componentKey: 'escort-npc',
			// 	index: 4,
			// 	title: 'Fase 5: Escoltar al NPC',
			// 	description: 'Escolta al NPC desde el punto A hasta el punto B sin que sufra daño.',
			// },
			// {
			// 	key: 'trade-sword-potion-6',
			// 	componentKey: 'trade-sword-potion',
			// 	index: 5,
			// 	title: 'Fase 6: Intercambio de objetos',
			// 	description: 'Intercambia una espada por una poción con el NPC.',
			// },
			// {
			// 	key: 'follow-npc-7',
			// 	componentKey: 'follow-npc',
			// 	index: 6,
			// 	title: 'Fase 7: Seguir al NPC',
			// 	description: 'Sigue al NPC durante su recorrido sin perderlo de vista.',
			// },
			// {
			// 	key: 'defend-npc-boss-8',
			// 	componentKey: 'defend-npc-boss',
			// 	index: 7,
			// 	title: 'Fase 8: Defender al NPC del jefe',
			// 	description: 'Defiende al NPC del Toro Negro durante 1 minuto y medio.',
			// },
			// {
			// 	key: 'deliver-message-9',
			// 	componentKey: 'deliver-message',
			// 	index: 8,
			// 	title: 'Fase 9: Entregar un mensaje',
			// 	description: 'Lleva el mensaje del NPC a otro NPC en el escenario.',
			// },
			// {
			// 	key: 'collect-special-item-10',
			// 	componentKey: 'collect-special-item',
			// 	index: 9,
			// 	title: 'Fase 10: Recolectar objeto especial',
			// 	description: 'Encuentra y entrega el objeto específico que el NPC te solicita.',
			// },
		],
	},
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
