import { ItemState } from '#/state/inventory.state';

import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

// Sufijo del slug del NPC — se prefija con el Agent.identifier del jugador (ej: happy-man-x3z4-npc-1)
const NPC_SLUG_SUFFIX = '-npc-1';
// Sufijo del nombre de la entidad ECS (único por usuario en el mundo)
const NPC_NAME_SUFFIX = '-npc-01';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';
const POTION_ITEM_TYPE = 'potion';

export class RequestPotionPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;

	protected onMountPhase(): void {
		this.resolved = false;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const entityName = this.runtime.entityName;
		const userId = this.runtime.userId;

		// Éxito: el jugador recibe una poción (ya sea recogiéndola del suelo o
		// recibiéndola directamente de otro inventario vía give-item-to)
		this.onEvent(
			bus,
			WorldEventType.InventoryItemReceived,
			entityName,
			(payload: unknown) => {
				const p = payload as { item?: { type?: string } } | undefined;
				if (p?.item?.type === POTION_ITEM_TYPE) {
					this.handlePhaseSuccess();
				}
			},
		);

		// Seteamos npcName síncronamente para que onUnmountPhase funcione aunque
		// la promesa de spawnNpc no haya resuelto todavía.
		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;

		// spawnNpc es async: disparamos sin await (onMountPhase es síncrono).
		// Los errores se loguean para no silenciarlos.
		this.spawnNpc(userId, this.npcName, bus).catch((err: unknown) => {
			console.error('[RequestPotionPhase] Error al spawnear NPC:', err);
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
		bus: WorldEventBusEcs,
	): Promise<void> {
		// Obtener el Agent del jugador para construir el slug del NPC
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		// Lookup del NPC por slug — obtiene UUID real e identifier para AI/LTM
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
			display: 'Guardián de Pociones',
			description: npcRecord.description,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			pathfinder,
		});

		// Colocar poción en slot 0 del inventario del NPC
		npcEntity.get(InventoryServerEcs).ifSome((inventory) => {
			inventory.inventoryState.items.set(
				'0',
				new ItemState(POTION_ITEM_TYPE, 1, {}),
			);
		});

		this.world.addEntity(npcEntity);
		this.npcName = npcName;

		// Fallo: el NPC consume la poción antes de dársela al jugador
		this.onEvent(
			bus,
			WorldEventType.InventoryItemConsumed,
			npcName,
			(payload: unknown) => {
				const p = payload as { item?: { type?: string } } | undefined;
				if (p?.item?.type === POTION_ITEM_TYPE) {
					this.handlePhaseFailure('El NPC consumió la poción en lugar de dártela.');
				}
			},
		);
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
