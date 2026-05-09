import { ItemState } from '#/state/inventory.state';

import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { boxServerFactory } from '$/game/prefab/box.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

const NPC_SLUG_SUFFIX = '-npc-6';
const NPC_NAME_SUFFIX = '-npc-06';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';

const APPLE_ITEM_TYPE = 'apple';

const BOX_DROP_ITEMS = ['sword', 'potion', 'cookie', 'seeds', 'coin'];
const WANTED_ITEM_NAMES: Record<string, string> = {
	sword: 'una espada',
	potion: 'una poción',
	cookie: 'una galleta',
	seeds: 'semillas',
	coin: 'una moneda',
};

const MAX_ACTIVE_BOXES = 4;
const BOX_SPAWN_RADIUS = 8;
const RESPAWN_INTERVAL_MS = 5000;

const CHECK_INTERVAL_MS = 1000;

function pickRandomWantedItem(): string {
	const keys = Object.keys(WANTED_ITEM_NAMES);
	return keys[Math.floor(Math.random() * keys.length)];
}

export class NegotiateItemPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	private readonly spawnedBoxNames: string[] = [];
	private respawnInterval: ReturnType<typeof setInterval> | null = null;
	private checkInterval: ReturnType<typeof setInterval> | null = null;
	private boxCounter = 0;
	private wantedItem: string | null = null;

	protected onMountPhase(): void {
		this.resolved = false;
		this.spawnedBoxNames.length = 0;
		this.boxCounter = 0;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const entityName = this.runtime.entityName;
		const userId = this.runtime.userId;

		this.clearPlayerInventory(entityName);

		this.wantedItem = pickRandomWantedItem();

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;

		this.onEvent(
			bus,
			WorldEventType.InventoryItemReceived,
			entityName,
			(payload: unknown) => {
				const p = payload as { item?: { type?: string } } | undefined;
				if (p?.item?.type === APPLE_ITEM_TYPE) {
					this.handlePhaseSuccess();
				}
			},
		);

		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handlePhaseFailure('Has muerto durante la negociación.');
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.npcName, () => {
			this.handlePhaseFailure('Tu aliado ha caído.');
		});

		this.startBoxRespawn(userId);

		this.spawnNpc(userId, this.npcName).catch((err: unknown) => {
			console.error('[NegotiateItem] Error al spawnear NPC:', err);
		});

		this.checkInterval = setInterval(() => {
			this.checkPlayerHasApple(entityName);
		}, CHECK_INTERVAL_MS);
	}

	protected onUnmountPhase(): void {
		if (this.respawnInterval !== null) {
			clearInterval(this.respawnInterval);
			this.respawnInterval = null;
		}

		if (this.checkInterval !== null) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		for (const boxName of this.spawnedBoxNames) {
			this.world.getEntity(boxName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedBoxNames.length = 0;
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

	private checkPlayerHasApple(entityName: string): void {
		if (this.resolved) return;

		this.world.getEntity(entityName).ifSome((entity) => {
			const inventory = entity.get(InventoryServerEcs).raw();
			if (!inventory) return;

			for (const item of inventory.inventoryState.items.values()) {
				if (item.type === APPLE_ITEM_TYPE) {
					this.handlePhaseSuccess();
					return;
				}
			}
		});
	}

	private spawnSingleBox(userId: string): void {
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		const angle = Math.random() * Math.PI * 2;
		const radius = 3 + Math.random() * (BOX_SPAWN_RADIUS - 3);
		const pos = {
			x: basePos.x + Math.cos(angle) * radius,
			y: basePos.y,
			z: basePos.z + Math.sin(angle) * radius,
		};

		const boxName = `negotiate-box-${userId}-${this.boxCounter++}`;
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

		const wantedName = WANTED_ITEM_NAMES[this.wantedItem ?? pickRandomWantedItem()];

		const dynamicDescription = [
			npcRecord.description,
			`Tu objetivo principal: quieres recibir ${wantedName} del jugador.`,
			`Si el jugador te ofrece ${wantedName} o tienes ${wantedName} en tu inventario, dale tu manzana (apple) usando give-item-to.`,
			'Tienes UNA manzana en tu inventario. NO la consumas. Dásela al jugador a cambio de lo que quieres.',
		].join(' ');

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: npcName,
			display: 'Intercambiador',
			description: dynamicDescription,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			pathfinder,
		});

		npcEntity.get(InventoryServerEcs).ifSome((inventory) => {
			inventory.inventoryState.items.set(
				'0',
				new ItemState(APPLE_ITEM_TYPE, 1, {}),
			);
		});

		this.world.addEntity(npcEntity);
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;

		if (this.checkInterval !== null) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(reason: string): void {
		if (this.resolved) return;
		this.resolved = true;

		if (this.checkInterval !== null) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}

		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, reason);
		});
	}
}