import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';
import type { ExperimentRuntimeEcs } from './experiment-runtime.ecs';

import { ExperimentPhaseEcs } from './experiment-phase.ecs';

export class PlaceholderExperimentPhaseEcs extends ExperimentPhaseEcs {
	constructor(definition: ExperimentPhaseDefinition, runtime: ExperimentRuntimeEcs) {
		super(definition, runtime);
	}
}
