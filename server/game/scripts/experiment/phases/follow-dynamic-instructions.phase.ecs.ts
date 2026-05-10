import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { boxServerFactory } from '$/game/prefab/box.server';
import { treeServerFactory } from '$/game/prefab/tree.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import {
	WorldEventBusEcs,
	WorldEventType,
} from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

const NPC_SLUG_SUFFIX = '-npc-7';
const NPC_NAME_SUFFIX = '-npc-07';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';

const BOX_DROP_ITEMS = ['sword', 'potion', 'cookie', 'seeds', 'coin'];
const MAX_ACTIVE_BOXES = 4;
const BOX_SPAWN_RADIUS = 8;
const RESPAWN_INTERVAL_MS = 5000;

const TREE_SPAWN_RADIUS = 6;

export class FollowDynamicInstructionsPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	private treeName: string | null = null;
	private readonly spawnedBoxNames: string[] = [];
	private respawnInterval: ReturnType<typeof setInterval> | null = null;
	private boxCounter = 0;

	protected onMountPhase(): void {
		this.resolved = false;
		this.spawnedBoxNames.length = 0;
		this.boxCounter = 0;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;
		this.treeName = `${userId}-instruction-tree`;

		this.onEvent<{ key: string }>(bus, WorldEventType.NpcSignal, this.npcName, (payload) => {
			if (payload.key === 'ok') {
				this.handlePhaseSuccess();
			} else if (payload.key === 'fail') {
				this.handlePhaseFailure('El instructor marcó la fase como fallida.');
			}
		});

		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handlePhaseFailure('Has muerto durante las instrucciones.');
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.npcName, () => {
			this.handlePhaseFailure('Tu instructor ha caído.');
		});

		this.spawnTree(userId, this.treeName);
		this.startBoxRespawn(userId);

		this.spawnNpc(userId, this.npcName).catch((err: unknown) => {
			console.error('[FollowDynamicInstructions] Error al spawnear NPC:', err);
		});
	}

	protected onUnmountPhase(): void {
		if (this.respawnInterval !== null) {
			clearInterval(this.respawnInterval);
			this.respawnInterval = null;
		}

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		if (this.treeName) {
			this.world.getEntity(this.treeName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.treeName = null;
		}

		for (const boxName of this.spawnedBoxNames) {
			this.world.getEntity(boxName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedBoxNames.length = 0;
	}

	private spawnTree(userId: string, treeName: string): void {
		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };
		const angle = Math.random() * Math.PI * 2;
		const pos = {
			x: slotPos.x + Math.cos(angle) * TREE_SPAWN_RADIUS,
			y: slotPos.y - 1,
			z: slotPos.z + Math.sin(angle) * TREE_SPAWN_RADIUS,
		};

		const tree = treeServerFactory({
			world: this.world,
			name: treeName,
			pos,
		});

		this.world.addEntity(tree);
	}

	private spawnSingleBox(userId: string): void {
		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };

		const angle = Math.random() * Math.PI * 2;
		const radius = 3 + Math.random() * (BOX_SPAWN_RADIUS - 3);
		const pos = {
			x: slotPos.x + Math.cos(angle) * radius,
			y: slotPos.y - 2,
			z: slotPos.z + Math.sin(angle) * radius,
		};

		const boxName = `instruction-box-${userId}-${this.boxCounter++}`;
		const box = boxServerFactory({
			world: this.world,
			name: boxName,
			pos,
			skin: Math.random() > 0.5 ? 'box_stacked' : 'crate',
			dropItems: BOX_DROP_ITEMS,
		});

		this.world.addEntity(box);
		this.spawnedBoxNames.push(boxName);
	}

	private pruneStaleBoxes(): void {
		for (let i = this.spawnedBoxNames.length - 1; i >= 0; i--) {
			const entity = this.world.getEntity(this.spawnedBoxNames[i]).raw();
			if (!entity) {
				this.spawnedBoxNames.splice(i, 1);
			}
		}
	}

	private startBoxRespawn(userId: string): void {
		for (let i = 0; i < MAX_ACTIVE_BOXES; i++) {
			this.spawnSingleBox(userId);
		}

		this.respawnInterval = setInterval(() => {
			this.pruneStaleBoxes();

			while (this.spawnedBoxNames.length < MAX_ACTIVE_BOXES) {
				this.spawnSingleBox(userId);
			}
		}, RESPAWN_INTERVAL_MS);
	}

	private async spawnNpc(
		userId: string,
		npcName: string,
	): Promise<void> {
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		const npcRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: npcSlug },
			include: { entity: { include: { agent: true } } },
		});

		const slotPos = getSlotPosition(userId);
		const pos = slotPos
			? { x: slotPos.x + 3, y: slotPos.y, z: slotPos.z + 3 }
			: { x: 3, y: 0, z: 3 };

		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const dynamicDescription = [
			npcRecord.description,
			'Le das instrucciones al jugador sobre qué hacer. Puedes pedirle que vaya a sitios, que golpee cajas, que recoja items del suelo, etc.',
			'Cuando el jugador haya cumplido tus instrucciones satisfactoriamente, usa la acción send-signal con key "ok" para marcar la fase como completada.',
			'Si el jugador se niega rotundamente a cooperar o hace algo inaceptable, usa send-signal con key "fail".',
			'Sé creativo y variado en tus instrucciones. No repitas siempre lo mismo.',
			'Habla en español. Sé claro y conciso en tus instrucciones.',
		].join(' ');

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: npcName,
			display: 'Instructor',
			description: dynamicDescription,
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
