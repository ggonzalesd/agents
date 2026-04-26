import type { Room } from 'colyseus';

import type { WorldEcs } from '#/ecs';
import type { EntityType } from '$/models/Mission.model';
import type { GameState } from '#/state/game.state';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { ItemState } from '#/state/inventory.state';
import type { MissionDB } from '$/models/Mission.model';
import { itemServerFactory } from '$/game/prefab/item.server';

import { NPCContextEcs } from '../ai/npc-context.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';

export function notifyNpcs(
	world: WorldEcs,
	message: string,
	data: Record<string, unknown>,
) {
	world
		.getEntityLike({ context: NPCContextEcs, event: NPCEventQueueEcs })
		.forEach(({ components: { event } }) => {
			event.pushEvent(message, data, 5);
		});
}

export function notifyEntity(
	room: Room<GameState>,
	world: WorldEcs,
	targetId: string,
	targetType: EntityType,
	payload: Record<string, unknown>,
) {
	if (targetType === 'USER') {
		sendToUser(room, targetId, 'mission:event', payload);
	} else {
		notifyNpcById(world, targetId, payload);
	}
}

export function notifyEntityById(
	room: Room<GameState>,
	world: WorldEcs,
	targetId: string,
	payload: Record<string, unknown>,
) {
	const sent = sendToUser(room, targetId, 'mission:event', payload);
	if (!sent) {
		notifyNpcById(world, targetId, payload);
	}
}

export function sendToUser(
	room: Room<GameState>,
	entityId: string,
	messageType: string,
	payload: Record<string, unknown>,
): boolean {
	for (const client of room.clients) {
		const userInfo = client.userData?.userInfo as
			| { entity?: { id: string } }
			| undefined;
		if (userInfo?.entity?.id === entityId) {
			client.send(messageType, payload);
			return true;
		}
	}
	return false;
}

function notifyNpcById(
	world: WorldEcs,
	npcDbId: string,
	payload: Record<string, unknown>,
) {
	const eventType = payload.type as string;
	const title = (payload.missionTitle as string) ?? '';
	const message = `Mission event: ${eventType} - "${title}"`;

	world
		.getEntityLike({ context: NPCContextEcs, event: NPCEventQueueEcs })
		.forEach(({ components: { context, event } }) => {
			if (context.missionsContext.getNpcId() === npcDbId) {
				event.pushEvent(message, payload, 8);
			}
		});
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory helpers for mission rewards (agnostic: USER or NPC)
// ─────────────────────────────────────────────────────────────────────────────

export function consumeRewardFromInventory(
	inventory: InventoryServerEcs,
	itemType: string,
	qty: number,
): { slot: number; item: ItemState } | null {
	for (const [slotStr, item] of inventory.inventoryState.items.entries()) {
		if (item.type === itemType && item.quantity >= qty) {
			const slot = Number(slotStr);
			if (item.quantity === qty) {
				inventory.inventoryState.items.delete(slotStr);
			} else {
				item.quantity -= qty;
			}
			return { slot, item: new ItemState(itemType, qty) };
		}
	}
	return null;
}

export function giveRewardToAgent(
	world: WorldEcs,
	agentDbId: string,
	mission: MissionDB,
): boolean {
	if (!mission.rewardItemType || !mission.rewardItemQty) return true;

	const result = findEntityByDbId(world, agentDbId);
	if (!result) return false;

	const slot = result.inventory.getAvailableSlot();
	if (slot !== null) {
		result.inventory.inventoryState.items.set(
			slot.toString(),
			new ItemState(mission.rewardItemType, mission.rewardItemQty),
		);
	} else {
		spawnItemNearEntity(
			world,
			result.entity,
			mission.rewardItemType,
			mission.rewardItemQty,
		);
	}
	return true;
}

export function returnRewardToCreator(
	world: WorldEcs,
	mission: MissionDB,
): void {
	if (!mission.rewardItemType || !mission.rewardItemQty) return;

	const result = findEntityByDbId(world, mission.creatorId);
	if (!result) return;

	const slot = result.inventory.getAvailableSlot();
	if (slot !== null) {
		result.inventory.inventoryState.items.set(
			slot.toString(),
			new ItemState(mission.rewardItemType, mission.rewardItemQty),
		);
	} else {
		spawnItemNearEntity(
			world,
			result.entity,
			mission.rewardItemType,
			mission.rewardItemQty,
		);
	}
}

function findEntityByDbId(
	world: WorldEcs,
	dbId: string,
): { inventory: InventoryServerEcs; entity: string } | null {
	const results = world.getEntityLike({
		record: RecordEcs,
		inventory: InventoryServerEcs,
	});

	for (const {
		entity,
		components: { record, inventory },
	} of results) {
		const db = record.getRecord<{ id: string }>('db').raw();
		if (db?.id === dbId) return { inventory, entity: entity.name };
	}

	return null;
}

function spawnItemNearEntity(
	world: WorldEcs,
	entityName: string,
	itemType: string,
	qty: number,
): void {
	const pos = world
		.getEntity(entityName)
		.map((e) => e.getUnsafe(CharacterBodyServerEcs))
		.map((c) => c.body.translation())
		.raw() ?? { x: 0, y: 0, z: 0 };

	const itemEntity = itemServerFactory({
		world,
		name: `reward-${itemType}-${Date.now()}`,
		pos,
		stats: { amount: qty, type: itemType },
	});

	world.addEntity(itemEntity);
}
