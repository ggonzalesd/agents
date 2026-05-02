import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';

import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import type { ExperimentRuntimeEcs } from '../experiment-runtime.ecs';
import { ANIMAL_SPAWN_CATALOG } from '../../animal/animal-spawn.catalog';
import { animalServerFactoryGenerator } from '../../../prefab/animal.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import type { GuiaV4ExperimentRuntimeEcs } from '../handlers/guia-v4.experiment-runtime.ecs';

export class JumpOrDieExperimentPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private failed = false;
	private wolfName: string | null = null;

	constructor(
		definition: ExperimentPhaseDefinition,
		runtime: ExperimentRuntimeEcs,
	) {
		super(definition, runtime);
	}

	protected onMountPhase(): void {
		this.resolved = false;
		this.failed = false;

		console.log(
			'Mounting JumpOrDieExperimentPhaseEcs for user:',
			this.runtime?.userId,
		);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus || !this.runtime) return;

		console.log(
			'Subscribing to world events for entity:',
			this.runtime.entityName,
		);

		const entityName = this.runtime.entityName;

		console.log('Setting up event listeners for entity:', entityName);
		this.onEvent(bus, WorldEventType.EntityJump, entityName, () => {
			console.log('Jump detected for entity:', entityName);
			this.handleOwnerJump();
		});

		console.log('Subscribing to death and fall events for entity:', entityName);
		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			console.log('Death detected for entity:', entityName);
			this.handleOwnerDeath();
		});

		console.log('Subscribing to fall void events for entity:', entityName);
		this.onEvent(bus, WorldEventType.EntityFallVoid, entityName, () => {
			console.log('Fall void detected for entity:', entityName);
			this.handleOwnerDeath();
		});

		console.log('Finished setting up event listeners for entity:', entityName);
		if (this.definition.config?.spawnWolf) {
			this.spawnWolf();
		}
	}

	protected onUnmountPhase(): void {
		if (this.wolfName) {
			this.world.getEntity(this.wolfName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.wolfName = null;
		}
	}

	public onRestartPhase(): void {
		this.resolved = false;
		this.failed = false;
	}

	private spawnWolf(): void {
		if (!this.runtime) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		if (!slotPos) return;

		const wolfCatalog = ANIMAL_SPAWN_CATALOG['wolf'];
		const wolfVariant = wolfCatalog?.variants[0];
		if (!wolfVariant) return;

		const wolfName = `wolf-exp-${userId}`;
		const factory = animalServerFactoryGenerator(this.world);

		const pathfinder = (this.runtime as GuiaV4ExperimentRuntimeEcs).experimentPathfinder ?? undefined;

		const wolfEntity = factory({
			name: wolfName,
			display: 'Lobo',
			pos: { x: slotPos.x + 5, y: slotPos.y, z: slotPos.z },
			skin: wolfVariant.skin,
			life: wolfVariant.life,
			maxLife: wolfVariant.maxLife,
			profile: wolfVariant.profile,
			pathfinder,
		});

		this.world.addEntity(wolfEntity);
		this.wolfName = wolfName;
	}

	private handleOwnerJump(): void {
		if (this.resolved || this.failed) return;
		this.resolved = true;
		void this.runtime?.resolveCurrentPhase();
	}

	private handleOwnerDeath(): void {
		if (this.resolved || this.failed) return;
		this.failed = true;
		void this.runtime?.failCurrentAttempt();
	}
}
