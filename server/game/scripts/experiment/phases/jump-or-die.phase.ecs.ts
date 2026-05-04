import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ANIMAL_SPAWN_CATALOG } from '../../animal/animal-spawn.catalog';
import { animalServerFactoryGenerator } from '../../../prefab/animal.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import type { GuiaV4ExperimentRuntimeEcs } from '../handlers/guia-v4.experiment-runtime.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';

export class JumpOrDieExperimentPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private failed = false;
	private wolfName: string | null = null;

	protected onMountPhase(): void {
		this.resolved = false;
		this.failed = false;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const entityName = this.runtime.entityName;

		this.onEvent(bus, WorldEventType.EntityJump, entityName, () => {
			this.handleOwnerJump();
		});

		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handleOwnerDeath();
		});

		this.onEvent(bus, WorldEventType.EntityFallVoid, entityName, () => {
			this.handleOwnerDeath();
		});

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

	private spawnWolf(): void {
		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		if (!slotPos) return;

		const wolfCatalog = ANIMAL_SPAWN_CATALOG.wolf;
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
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handleOwnerDeath(): void {
		if (this.resolved || this.failed) return;
		this.failed = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, 'Has muerto');
		});
	}
}
