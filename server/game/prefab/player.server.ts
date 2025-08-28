import { ComponentEcs } from '#/ecs/Component.ecs';
import { PlayerState } from '#/state/game.state';
import { vec3Set, type IVec2, type IVec3 } from '#/utils/math.util';
import { EntityEcs, type WorldEcs } from '#/ecs';

import { ServerDataEcs } from '../scripts/serverData.ecs';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';

class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	public character: CharacterBodyServerEcs = null!;

	constructor(pos: IVec3) {
		super();

		this.state = new PlayerState(pos);

		this.onClientState = this.onClientState.bind(this);
		this.onClientActions = this.onClientActions.bind(this);
	}

	onStart(): void {
		const serverDataOp = this.world.get(ServerDataEcs);

		const gameState = serverDataOp
			.map((serverData) => serverData.state)
			.unwrap('GameState not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		gameState.players.set(parent.name, this.state);

		this.callOnDelete(() => {
			gameState.players.delete(parent.name);
		});

		this.character = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');
	}

	onLoop(_delta: number): void {
		this.world.stacker
			.one(`client:${this.parent}:action`)
			.ifSome(this.onClientActions);

		this.world.stacker
			.one(`client:${this.parent}:state`)
			.ifSome(this.onClientState);

		vec3Set(this.state.position, this.character.body.translation());
	}

	onClientActions(message: unknown) {
		if (typeof message !== 'object' || message == null || !('type' in message))
			return;

		switch (message.type) {
			case 'jump':
				this.character.isJumping = true;
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
			this.character.isMoving = message.isMoving;
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
			this.character.clientDirection = direction;
		}
	}
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) => (name: string, pos: IVec3) => {
		return new EntityEcs({
			name,
			world,
			components: {
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(pos),
				[PlayerServerBehavior.name]: new PlayerServerBehavior(pos),
			},
		});
	};
