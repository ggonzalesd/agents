import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

// Sufijo del slug del NPC — se prefija con el Agent.identifier del jugador
const NPC_SLUG_SUFFIX = '-npc-2';
// Sufijo del nombre de la entidad ECS (único por usuario en el mundo)
const NPC_NAME_SUFFIX = '-npc-02';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';

export class ProvokeDefeatNpcPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	/** true en cuanto el NPC golpea al jugador por primera vez */
	private npcHasAttacked = false;

	protected onMountPhase(): void {
		this.resolved = false;
		this.npcHasAttacked = false;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;

		// Fallo: el jugador golpea al NPC antes de que el NPC haya atacado primero
		this.onEvent(
			bus,
			WorldEventType.EntityDamaged,
			this.npcName,
			(payload: unknown) => {
				const p = payload as { attackerId?: string } | undefined;
				if (p?.attackerId === entityName && !this.npcHasAttacked) {
					this.handlePhaseFailure(
						'Golpeaste al NPC antes de que él te atacara. Debes provocarlo con palabras.',
					);
				}
			},
		);

		// Marcar que el NPC ya atacó al jugador (a partir de aquí el jugador puede defenderse)
		this.onEvent(
			bus,
			WorldEventType.EntityDamaged,
			entityName,
			(payload: unknown) => {
				const p = payload as { attackerId?: string } | undefined;
				if (p?.attackerId === this.npcName) {
					this.npcHasAttacked = true;
				}
			},
		);

		// Éxito: el NPC muere (el jugador lo venció tras ser atacado)
		this.onEvent(bus, WorldEventType.EntityDeath, this.npcName, () => {
			this.handlePhaseSuccess();
		});

		// Fallo: el jugador muere
		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handlePhaseFailure('Has muerto. Intenta de nuevo.');
		});

		// spawnNpc es async: disparamos sin await (onMountPhase es síncrono).
		this.spawnNpc(userId, this.npcName, bus).catch((err: unknown) => {
			console.error('[ProvokeDefeatNpcPhase] Error al spawnear NPC:', err);
		});
	}

	protected onUnmountPhase(): void {
		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}
	}

	private async spawnNpc(
		userId: string,
		npcName: string,
		_bus: WorldEventBusEcs,
	): Promise<void> {
		// Obtener el Agent del jugador para construir el slug del NPC
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		// Lookup del NPC por slug
		const npcRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: npcSlug },
			include: { entity: { include: { agent: true } } },
		});

		const npcUuid = npcRecord.id;
		const npcIdentifier = npcRecord.entity.agent.identifier;

		const slotPos = getSlotPosition(userId);
		const pos = slotPos
			? { x: slotPos.x + 3, y: slotPos.y, z: slotPos.z + 3 }
			: { x: 3, y: 0, z: 3 };

		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcUuid,
			identifier: npcIdentifier,
			name: npcName,
			display: 'Rufián',
			description: npcRecord.description,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(reason: string): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, reason);
		});
	}
}
