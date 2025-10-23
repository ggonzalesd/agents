import { ComponentEcs } from '#/ecs';
import type { IVec2 } from '#/utils/math.util';
import type { PlayerState } from '#/state/player.state';

import { ServerDataEcs } from '../serverData.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';

export class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	public movement: MovementServerEcs = null!;
	public serverData: ServerDataEcs = null!;
	public inventory: InventoryServerEcs = null!;

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
		this.world.stacker
			.one(`client:${this.parent}:action`)
			.ifSome(this.onClientActions);

		this.world.stacker
			.one(`client:${this.parent}:state`)
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
				const itemId =
					((message as any)?.itemParent as string | undefined) ?? '';

				const newId = this.inventory.getAvailableSlot();

				if (itemId && newId != null) {
					this.inventory.pickItemEntity(itemId, newId);
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
						.getFromEntitiesWith(NPCEventQueueEcs)
						.forEach(({ component }) =>
							component.pushEvent(
								{
									type: 'message',
									from: this.parent,
									message: message.message,
								},
								10,
							),
						);
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
