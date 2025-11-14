import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import type { IVec2 } from '#/utils/math.util';
import type { PlayerState } from '#/state/player.state';

import { ServerDataEcs } from '../serverData.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { NPCContextEcs } from '../ai/npc-context.ecs';

const sessionSchema = z
	.object({
		id: z.string(),
	})
	.loose();

export class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	public movement: MovementServerEcs = null!;
	public serverData: ServerDataEcs = null!;
	public inventory: InventoryServerEcs = null!;
	public record: RecordEcs = null!;

	constructor({ state }: { state: PlayerState }) {
		super();

		this.state = state;

		this.onClientState = this.onClientState.bind(this);
		this.onClientActions = this.onClientActions.bind(this);
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const gameState = this.serverData.state;

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		this.record = parent.get(RecordEcs).unwrap('RecordEcs not found');

		this.record
			.getRecord('session')
			.ifSome(sessionSchema.parse)
			.unwrap('Session record not found');

		this.inventory = parent
			.get(InventoryServerEcs)
			.unwrap('InventoryServerEcs not found');

		gameState.players.set(parent.name, this.state);

		this.callOnDelete(() => {
			gameState.players.delete(parent.name);
		});

		this.movement = parent
			.get(MovementServerEcs)
			.unwrap('MovementServerEcs not found');

		this.movement.movementState = this.state.movement;
	}

	onLoop(_delta: number): void {
		const session =
			this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');

		this.world.stacker
			.one(`client:${session.id}:action`)
			.ifSome(this.onClientActions);

		this.world.stacker
			.one(`client:${session.id}:state`)
			.ifSome(this.onClientState);
	}

	onClientActions(message: unknown) {
		if (typeof message !== 'object' || message == null || !('type' in message))
			return;

		switch (message.type) {
			case 'jump':
				this.movement.movementState.isJumping = true;
				break;
			case 'pick': {
				console.log('PICK ACTION', message);

				const itemId =
					((message as any)?.itemParent as string | undefined) ?? '';

				const newId = this.inventory.getAvailableSlot();

				console.log('PICK ACTION', { itemId, newId });

				if (itemId && newId != null) {
					this.inventory.pickItemEntity(itemId, newId);
				}
				break;
			}
			case 'drop': {
				console.log('DROP ACTION', message);

				const slot = ((message as any)?.itemId as number | undefined) ?? null;

				if (slot != null) {
					this.inventory.dropItem(slot);
				}

				break;
			}
			case 'message':
				// TODO:
				if ('message' in message && typeof message.message === 'string') {
					this.serverData.room.broadcast('agent:message', {
						id: this.parent,
						message: message.message,
					});

					this.world
						.getEntityLike({ context: NPCContextEcs, event: NPCEventQueueEcs })
						.forEach(({ entity: _, components: { context, event } }) => {
							context.lastMessages.addMessage(
								message.message as string,
								this.parent ?? 'Unknown',
							);

							event.pushEvent(
								`${this.parent} says something.`,
								{
									from: this.parent,
									message: message.message,
								},
								10,
							);
						});
				}
				break;
		}
	}

	onClientState(message: unknown) {
		if (typeof message !== 'object' || message == null) return;

		if (
			'isMoving' in message &&
			message.isMoving != null &&
			typeof message.isMoving === 'boolean'
		) {
			this.movement.movementState.isMoving = message.isMoving;
		}

		if (
			'direction' in message &&
			message.direction != null &&
			typeof message.direction === 'number'
		) {
			const angle = message.direction;
			const direction: IVec2 = {
				x: Math.cos(angle),
				y: -Math.sin(angle),
			};
			this.movement.clientDirection = direction;
			this.state.character.rotationY = angle;
		}
	}
}
