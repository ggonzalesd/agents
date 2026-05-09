export const EXPERIMENT_ROOM_ID = 'main-room';

export type ExperimentPhaseDefinition = {
	key: string;
	componentKey: string;
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
		description:
			'Experimento de interacción con NPCs clásicos sin uso de modelos de lenguaje.',
		phases: [
			{
				key: 'request-gold-coin-1',
				componentKey: 'request-gold-coin',
				title: 'Fase 1: Pedir una moneda de oro',
				description:
					'Habla con el aldeano y convéncelo de que te entregue una moneda de oro. Hay varias formas de lograrlo.',
			},
			{
				key: 'defeat-villain-npc-2',
				componentKey: 'defeat-villain-npc',
				title: 'Fase 2: Vencer a un NPC villano',
				description: 'Derrota al NPC villano que aparecerá en el escenario.',
			},
			{
				key: 'hunt-animals-3',
				componentKey: 'hunt-animals',
				title: 'Fase 3: Ayudar al NPC a cazar ciervos',
				description: 'Trabaja con el NPC cazador para eliminar 10 ciervos.',
			},
			{
				key: 'collect-apples-4',
				componentKey: 'collect-apples',
				title: 'Fase 4: Recolectar manzanas verdes',
				description: 'Ayuda al NPC a obtener 5 manzanas verdes de los árboles.',
			},
			{
				key: 'escort-npc-5',
				componentKey: 'escort-npc',
				title: 'Fase 5: Escoltar al NPC',
				description:
					'Escolta al NPC a través del laberinto hasta el final sin que sufra daño.',
			},
			{
				key: 'trade-item-6',
				componentKey: 'trade-item',
				title: 'Fase 6: Intercambio de objetos',
				description:
					'Consigue una espada de una caja y cámbiala por una poción con el mercader.',
				config: { giveItem: 'sword', receiveItem: 'potion' },
			},
			{
				key: 'follow-npc-7',
				componentKey: 'follow-npc',
				title: 'Fase 7: Seguir al NPC',
				description: 'Sigue al NPC durante su recorrido sin perderlo de vista.',
			},
			{
				key: 'survive-bull-11',
				componentKey: 'survive-bull',
				title: 'Fase 11: Sobrevivir al toro',
				description:
					'Sobrevive durante 30 segundos contra un toro negro agresivo que no para de atacar.',
			},
			{
				key: 'deliver-message-9',
				componentKey: 'deliver-message',
				title: 'Fase 9: Entregar un mensaje',
				description: 'Lleva el mensaje del NPC a otro NPC en el escenario.',
			},
			{
				key: 'collect-special-item-10',
				componentKey: 'collect-item',
				title: 'Fase 10: Recolectar objeto especial',
				description:
					'Encuentra y entrega el objeto específico que el NPC te solicita.',
				config: {
					targetItem: 'seeds',
					requiredAmount: 3,
					dropItems: ['seeds', 'coin', 'cookie'],
				},
			},
		],
	},
	{
		key: 'NPCS-CON-LLMS',
		title: 'NPCs con LLMs',
		description:
			'Experimento de interacción con NPCs potenciados por modelos de lenguaje.',
		phases: [
			{
				key: 'request-potion-1',
				componentKey: 'request-potion',
				title: 'Fase 1: Pedir una poción',
				description:
					'Habla con el NPC y convéncelo de que te entregue una poción.',
			},
			{
				key: 'provoke-defeat-npc-2',
				componentKey: 'provoke-defeat-npc',
				title: 'Fase 2: Provocar y vencer al NPC',
				description:
					'Provoca al NPC mediante el diálogo hasta que él inicie el combate. Si atacas primero, fallas.',
			},
			{
				key: 'hunt-animals-llm-3',
				componentKey: 'hunt-animals-llm',
				title: 'Fase 3: Ayudar al NPC a matar 3 venados',
				description: 'Trabaja con el NPC cazador para eliminar 3 venados.',
				config: { requiredKills: 3 },
			},
			{
				key: 'collect-red-apples-4',
				componentKey: 'collect-red-apples',
				title: 'Fase 4: Ayudar al NPC a obtener 5 manzanas rojas',
				description:
					'Ayuda al NPC a recolectar 5 manzanas rojas de los árboles.',
				config: { targetItem: 'red_apple', requiredAmount: 5 },
			},
			{
				key: 'convince-escort-npc-5',
				componentKey: 'convince-escort-npc',
				title: 'Fase 5: Convencer al NPC de desplazarse al hábitat',
				description:
					'Convence al NPC mediante el diálogo de que se desplace al hábitat de venados.',
			},
			{
				key: 'negotiate-item-6',
				componentKey: 'negotiate-item',
				title: 'Fase 6: Negociar para obtener un objeto',
				description:
					'Negocia con el NPC mercader para obtener un arma o recurso.',
			},
			{
				key: 'follow-dynamic-instructions-7',
				componentKey: 'follow-dynamic-instructions',
				title: 'Fase 7: Seguir instrucciones dinámicas del NPC',
				description:
					'El NPC te dará instrucciones en lenguaje natural para llegar al punto B. Interprétalas y síguelas.',
			},
			{
				key: 'coordinate-survive-bull-8',
				componentKey: 'coordinate-survive-bull',
				title: 'Fase 8: Coordinar supervivencia vs toro negro',
				description:
					'Coordínate con el NPC aliado para sobrevivir 1 minuto y medio al ataque del toro negro.',
				config: { durationMs: 90_000 },
			},
			{
				key: 'request-deliver-info-9',
				componentKey: 'request-deliver-info',
				title: 'Fase 9: Solicitar al NPC que entregue información',
				description:
					'Pide al NPC que lleve un mensaje o información a otro NPC en el escenario.',
			},
			{
				key: 'request-gather-items-10',
				componentKey: 'request-gather-items',
				title: 'Fase 10: Pedir al NPC que consiga 3 ítems',
				description: 'Pide al NPC que consiga 1 carne, 1 poción y 1 manzana.',
				config: {
					requiredItems: ['meat', 'potion', 'apple'],
				},
			},
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
				title: 'Fase temporal 1: saltar sin morir',
				description:
					'Fase temporal de prueba. Completa la fase al saltar. Si mueres, el intento falla y la fase se reinicia.',
				config: { spawnWolf: true },
			},
			{
				key: 'jump-or-die-2',
				componentKey: 'jump-or-die',
				title: 'Fase temporal 2: saltar sin morir',
				description:
					'Fase temporal de prueba. Completa la fase al saltar. Si mueres, el intento falla y la fase se reinicia.',
			},
		],
	},
];

export const getExperimentByKey = (
	key: string,
): ExperimentCatalogEntry | null =>
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

// Backward compatibility
export const EXPERIMENT_KEY = EXPERIMENT_CATALOG[0].key;
export const EXPERIMENT_PHASES = EXPERIMENT_CATALOG[0].phases;
