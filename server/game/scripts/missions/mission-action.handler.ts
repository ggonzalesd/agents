import type { Room } from 'colyseus';

import type { WorldEcs } from '#/ecs';
import type { EntityType } from '$/models/Mission.model';
import type { GameState } from '#/state/game.state';

import { NPCContextEcs } from '../ai/npc-context.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';

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
