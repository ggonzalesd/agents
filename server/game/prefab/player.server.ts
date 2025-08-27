import { ComponentEcs } from '#/ecs/Component.ecs';
import { PlayerState } from '#/state/game.state';
import { vec3Set, type IVec3 } from '#/utils/math.util';
import { EntityEcs, type WorldEcs } from '#/ecs';

import { ServerDataEcs } from '../scripts/serverData.ecs';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';

class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	public character: CharacterBodyServerEcs = null!;

	constructor(pos: IVec3) {
		super();

		this.state = new PlayerState(pos);
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
		this.world.stacker.one(`client:${this.parent}:jump`).ifSome((_) => {
			/// this.character.body.applyImpulse({ x: 0, y: 5, z: 0 }, true);
			this.character.isJumping = true;
		});

		vec3Set(this.state.position, this.character.body.translation());
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
