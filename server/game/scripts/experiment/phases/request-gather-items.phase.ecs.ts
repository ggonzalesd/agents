import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { boxServerFactory } from '$/game/prefab/box.server';
import { treeServerFactory } from '$/game/prefab/tree.server';
import { floatingTextServerFactory } from '$/game/prefab/floating-text.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { FloatingTextServerEcs } from '../../floating-text/floating-text.server.ecs';
import {
	WorldEventBusEcs,
	WorldEventType,
	type EntityDamagedPayload,
} from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

const NPC_SLUG_SUFFIX = '-npc-10';
const NPC_NAME_SUFFIX = '-npc-10';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';
const NPC_LIFE = 100;

const REQUIRED_BOX_BREAKS = 5;
const REQUIRED_ITEMS = ['meat', 'potion', 'apple'] as const;
const BOX_DROP_ITEMS = ['meat', 'potion', 'apple', 'sword', 'cookie', 'seeds', 'coin'];
const MAX_ACTIVE_BOXES = 6;
const BOX_SPAWN_RADIUS = 10;
const RESPAWN_INTERVAL_MS = 5000;
const TREE_COUNT = 3;
const TREE_SPAWN_RADIUS = 8;

export class RequestGatherItemsPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	private boxCounterName: string | null = null;
	private itemCounterName: string | null = null;
	private readonly spawnedBoxNames: string[] = [];
	private readonly spawnedTreeNames: string[] = [];
	private respawnInterval: ReturnType<typeof setInterval> | null = null;
	private boxCounter = 0;
	private boxSpawnCounter = 0;
	private readonly lastAttackerMap = new Map<string, string>();
	private readonly receivedItems = new Set<string>();

	protected onMountPhase(): void {
		this.resolved = false;
		this.spawnedBoxNames.length = 0;
		this.spawnedTreeNames.length = 0;
		this.boxCounter = 0;
		this.boxSpawnCounter = 0;
		this.lastAttackerMap.clear();
		this.receivedItems.clear();

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;
		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;
		this.boxCounterName = `${userId}-gather-box-counter`;
		this.itemCounterName = `${userId}-gather-item-counter`;

		const boxCounterEntity = floatingTextServerFactory({
			world: this.world,
			name: this.boxCounterName,
			pos: { x: slotPos.x - 2, y: slotPos.y + 2, z: slotPos.z },
			text: `Cajas: 0 / ${REQUIRED_BOX_BREAKS}`,
			foreground: '#ffaa00',
			background: '#222222',
			fontSize: 22,
		});
		this.world.addEntity(boxCounterEntity);

		const itemCounterEntity = floatingTextServerFactory({
			world: this.world,
			name: this.itemCounterName,
			pos: { x: slotPos.x + 2, y: slotPos.y + 4, z: slotPos.z },
			text: `Items: 0 / ${REQUIRED_ITEMS.length}`,
			foreground: '#44ff44',
			background: '#222222',
			fontSize: 22,
		});
		this.world.addEntity(itemCounterEntity);

		this.clearPlayerInventory(entityName);

		this.unsubs.push(
			bus.on<EntityDamagedPayload>(
				WorldEventType.EntityDamaged,
				(entityName, payload) => {
					if (this.spawnedBoxNames.includes(entityName)) {
						this.lastAttackerMap.set(entityName, payload.attackerId);
					}
				},
			),
		);

		this.unsubs.push(
			bus.on(WorldEventType.EntityDeath, (deadEntity) => {
				if (deadEntity === this.npcName) {
					this.handlePhaseFailure('Tu aliado ha caído.');
					return;
				}
				if (deadEntity === entityName) {
					this.handlePhaseFailure('Has muerto.');
					return;
				}
				if (!this.spawnedBoxNames.includes(deadEntity)) return;

				const attackerId = this.lastAttackerMap.get(deadEntity);
				const idx = this.spawnedBoxNames.indexOf(deadEntity);
				if (idx !== -1) this.spawnedBoxNames.splice(idx, 1);
				this.lastAttackerMap.delete(deadEntity);

				if (attackerId === this.npcName) {
					this.boxCounter++;
					this.updateBoxCounter();
					this.checkSuccess();
				}
			}),
		);

		this.onEvent(
			bus,
			WorldEventType.InventoryItemReceived,
			entityName,
			(payload: unknown) => {
				const p = payload as { item?: { type?: string }; giverEntityId?: string } | undefined;
				if (!p?.item?.type) return;
				if (p.giverEntityId !== this.npcName) return;
				const itemType = p.item.type;
				if ((REQUIRED_ITEMS as readonly string[]).includes(itemType)) {
					this.receivedItems.add(itemType);
					this.updateItemCounter();
					this.checkSuccess();
				}
			},
		);

		this.startBoxRespawn(userId, slotPos);
		this.spawnTrees(userId, slotPos);

		const npcName = this.npcName;
		if (npcName) {
			this.spawnNpc(userId, npcName).catch((err: unknown) => {
				console.error('[RequestGatherItems] Error al spawnear NPC:', err);
			});
		}
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

		if (this.boxCounterName) {
			this.world.getEntity(this.boxCounterName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.boxCounterName = null;
		}

		if (this.itemCounterName) {
			this.world.getEntity(this.itemCounterName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.itemCounterName = null;
		}

		for (const boxName of this.spawnedBoxNames) {
			this.world.getEntity(boxName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedBoxNames.length = 0;
		this.lastAttackerMap.clear();

		for (const treeName of this.spawnedTreeNames) {
			this.world.getEntity(treeName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedTreeNames.length = 0;
	}

	private clearPlayerInventory(entityName: string): void {
		this.world.getEntity(entityName).ifSome((entity) => {
			const inventory = entity.get(InventoryServerEcs).raw();
			if (!inventory) return;
			for (const slotStr of [...inventory.inventoryState.items.keys()]) {
				inventory.inventoryState.items.delete(slotStr);
			}
		});
	}

	private updateBoxCounter(): void {
		if (!this.boxCounterName) return;
		this.world.getEntity(this.boxCounterName).ifSome((entity) => {
			entity.get(FloatingTextServerEcs).ifSome((ft) => {
				ft.setText(`Cajas: ${this.boxCounter} / ${REQUIRED_BOX_BREAKS}`);
			});
		});
	}

	private updateItemCounter(): void {
		if (!this.itemCounterName) return;
		const count = this.receivedItems.size;
		this.world.getEntity(this.itemCounterName).ifSome((entity) => {
			entity.get(FloatingTextServerEcs).ifSome((ft) => {
				ft.setText(`Items: ${count} / ${REQUIRED_ITEMS.length}`);
			});
		});
	}

	private checkSuccess(): void {
		if (this.resolved) return;
		const allItemsReceived = (REQUIRED_ITEMS as readonly string[]).every((item) =>
			this.receivedItems.has(item),
		);
		if (this.boxCounter >= REQUIRED_BOX_BREAKS && allItemsReceived) {
			this.handlePhaseSuccess();
		}
	}

	private spawnSingleBox(userId: string, basePos: { x: number; y: number; z: number }): void {
		const angle = Math.random() * Math.PI * 2;
		const radius = 3 + Math.random() * (BOX_SPAWN_RADIUS - 3);
		const pos = {
			x: basePos.x + Math.cos(angle) * radius,
			y: basePos.y - 2,
			z: basePos.z + Math.sin(angle) * radius,
		};

		const boxName = `gather-box-${userId}-${this.boxSpawnCounter++}`;
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
				this.lastAttackerMap.delete(this.spawnedBoxNames[i]);
				this.spawnedBoxNames.splice(i, 1);
			}
		}
	}

	private startBoxRespawn(userId: string, basePos: { x: number; y: number; z: number }): void {
		for (let i = 0; i < MAX_ACTIVE_BOXES; i++) {
			this.spawnSingleBox(userId, basePos);
		}

		this.respawnInterval = setInterval(() => {
			if (this.resolved) return;
			this.pruneStaleBoxes();

			while (this.spawnedBoxNames.length < MAX_ACTIVE_BOXES) {
				this.spawnSingleBox(userId, basePos);
			}
		}, RESPAWN_INTERVAL_MS);
	}

	private spawnTrees(userId: string, basePos: { x: number; y: number; z: number }): void {
		for (let i = 0; i < TREE_COUNT; i++) {
			const angle = (i / TREE_COUNT) * Math.PI * 2;
			const pos = {
				x: basePos.x + Math.cos(angle) * TREE_SPAWN_RADIUS,
				y: basePos.y,
				z: basePos.z + Math.sin(angle) * TREE_SPAWN_RADIUS,
			};
			const treeName = `gather-tree-${userId}-${i}`;
			const tree = treeServerFactory({ world: this.world, name: treeName, pos });
			this.world.addEntity(tree);
			this.spawnedTreeNames.push(treeName);
		}
	}

	private async spawnNpc(userId: string, npcName: string): Promise<void> {
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
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const description = [
			npcRecord.description,
			'Eres un aventurerodispuesto a ayudar, pero solo si te lo piden explícitamente.',
			'No actúes por tu cuenta. Espera a que el jugador te pida algo antes de moverte.',
			'Si el jugador te pide que rompas cajas, acércate y atácalas con attack-entity o attack-until-resolved.',
			'Si el jugador te pide que recojas un item del suelo, muévete cerca y recógelo.',
			'Si el jugador te pide que le des un item, úselo give-item-to para entregárselo.',
			'No rompas cajas ni recojas items sin que te lo pidan primero.',
			'Habla en español. Sé conciso.',
		].join(' ');

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: npcName,
			display: 'Recolector',
			description,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos,
			life: NPC_LIFE,
			maxLife: NPC_LIFE,
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