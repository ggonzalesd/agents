import { ComponentEcs } from '#/ecs';
import { PlayerState } from '#/state/game.state';
import { vec3Set, type IVec2, type IVec3 } from '#/utils/math.util';

import { ServerDataEcs } from '../serverData.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';

export class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	public character: CharacterBodyServerEcs = null!;
	public movement: MovementServerEcs = null!;
	public serverData: ServerDataEcs = null!;

	constructor({ pos, username }: { pos: IVec3; username: string }) {
		super();

		this.state = new PlayerState(pos, username);

		this.onClientState = this.onClientState.bind(this);
		this.onClientActions = this.onClientActions.bind(this);
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const gameState = this.serverData.state;

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		gameState.players.set(parent.name, this.state);

		this.callOnDelete(() => {
			gameState.players.delete(parent.name);
		});

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');

		this.movement = parent
			.get(MovementServerEcs)
			.unwrap('MovementServerEcs not found');
	}

	onLoop(_delta: number): void {
		this.world.stacker
			.one(`client:${this.parent}:action`)
			.ifSome(this.onClientActions);

		this.world.stacker
			.one(`client:${this.parent}:state`)
			.ifSome(this.onClientState);

		vec3Set(this.state.character.position, this.character.body.translation());
	}

	onClientActions(message: unknown) {
		if (typeof message !== 'object' || message == null || !('type' in message))
			return;

		switch (message.type) {
			case 'jump':
				this.movement.isJumping = true;
				break;
			case 'message':
				// TODO:
				if ('message' in message && typeof message.message === 'string') {
					this.serverData.room.broadcast('agent:message', {
						id: this.parent,
						message: message.message,
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
			this.movement.isMoving = message.isMoving;
			this.state.character.isMoving = message.isMoving;
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
