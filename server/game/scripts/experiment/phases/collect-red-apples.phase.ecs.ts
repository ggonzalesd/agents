import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { treeServerFactory } from '$/game/prefab/tree.server';
import { floatingTextServerFactory } from '$/game/prefab/floating-text.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { FloatingTextServerEcs } from '../../floating-text/floating-text.server.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import {
	WorldEventBusEcs,
	WorldEventType,
} from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

const NPC_SLUG_SUFFIX = '-npc-4';
const NPC_NAME_SUFFIX = '-npc-04';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';

const REQUIRED_APPLES = 5;
const TREE_SPAWN_MIN_RADIUS = 6;
const TREE_SPAWN_MAX_RADIUS = 12;
const APPLE_ITEM_TYPE = 'apple';
const TREE_IDENTIFIER = 'collect-red-apples-tree';



export class CollectRedApplesPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	private treeName: string | null = null;
	private counterName: string | null = null;

	protected onMountPhase(): void {
		this.resolved = false;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;
		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;
		this.counterName = `${userId}-apple-counter`;

		const counterEntity = floatingTextServerFactory({
			world: this.world,
			name: this.counterName,
			pos: { x: slotPos.x, y: slotPos.y + 4, z: slotPos.z },
			text: `0 / ${REQUIRED_APPLES}`,
			foreground: '#ff4444',
			background: '#222222',
			fontSize: 22,
		});
		this.world.addEntity(counterEntity);

		this.spawnTree(userId, slotPos);
		this.spawnNpc(userId).catch((err: unknown) => {
			console.error('[CollectRedApples] Error al spawnear NPC:', err);
		});

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		this.unsubs.push(
			bus.on(WorldEventType.EntityDeath, (deadEntity) => {
				if (deadEntity === this.npcName) {
					this.handlePhaseFailure('Tu aliado ha caído.');
					return;
				}
				if (deadEntity === entityName) {
					this.handlePhaseFailure('Has muerto.');
				}
			}),
		);

		this.startAppleCountCheck();
	}

	protected onUnmountPhase(): void {
		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		if (this.counterName) {
			this.world.getEntity(this.counterName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.counterName = null;
		}

		if (this.treeName) {
			const serverData = this.world.get(ServerDataEcs).raw();
			if (serverData) {
				serverData.room.broadcast('experiment:instance:remove', {
					id: this.treeName,
				});
			}

			this.world.getEntity(this.treeName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.treeName = null;
		}
	}

	private spawnTree(
		userId: string,
		basePos: { x: number; y: number; z: number },
	): void {
		const treeName = `${TREE_IDENTIFIER}-${userId}`;
		this.treeName = treeName;

		const angle = Math.random() * Math.PI * 2;
		const radius =
			TREE_SPAWN_MIN_RADIUS +
			Math.random() * (TREE_SPAWN_MAX_RADIUS - TREE_SPAWN_MIN_RADIUS);
		const pos = {
			x: basePos.x + Math.cos(angle) * radius,
			y: basePos.y - 1,
			z: basePos.z + Math.sin(angle) * radius,
		};

		const treeEntity = treeServerFactory({
			world: this.world,
			name: treeName,
			pos,
		});
		this.world.addEntity(treeEntity);

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData) {
			serverData.room.broadcast('experiment:instance:create', {
				id: treeName,
				type: 'tree',
				x: pos.x,
				y: pos.y,
				z: pos.z,
				metadata: {},
			});
		}
	}

	private async spawnNpc(userId: string): Promise<void> {
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		const npcRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: npcSlug },
			include: { entity: { include: { agent: true } } },
		});

		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };
		const pos = { x: slotPos.x + 2, y: slotPos.y, z: slotPos.z + 2 };

		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs)
				.experimentPathfinder ?? undefined;

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: this.npcName!,
			display: 'Recolector',
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

	private countNpcApples(): number {
		if (!this.npcName) return 0;

		const npcEntity = this.world.getEntity(this.npcName).raw();
		if (!npcEntity) return 0;

		const inventory = npcEntity.get(InventoryServerEcs).raw();
		if (!inventory) return 0;

		let count = 0;
		for (const item of inventory.inventoryState.items.values()) {
			if (item.type === APPLE_ITEM_TYPE) {
				count += item.quantity;
			}
		}
		return count;
	}

	private updateCounter(): void {
		if (!this.counterName) return;
		const appleCount = this.countNpcApples();
		this.world.getEntity(this.counterName).ifSome((entity) => {
			entity.get(FloatingTextServerEcs).ifSome((ft) => {
				ft.setText(`${appleCount} / ${REQUIRED_APPLES}`);
			});
		});
	}

	private startAppleCountCheck(): void {
		const interval = setInterval(() => {
			if (this.resolved) {
				clearInterval(interval);
				return;
			}

			const appleCount = this.countNpcApples();
			this.updateCounter();

			if (appleCount >= REQUIRED_APPLES) {
				clearInterval(interval);
				this.handlePhaseSuccess();
			}
		}, 1000);
		this.callOnDelete(() => clearInterval(interval));
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