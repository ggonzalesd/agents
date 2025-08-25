import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import { PlayerState } from '#/state/game.state';

import { ServerDataEcs } from '../scripts/serverData.ecs';

class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	constructor(pos: { x: number; y: number; z: number }) {
		super();

		this.state = new PlayerState(pos);
	}

	onStart(): void {
		const serverDataOp = this.world.get(ServerDataEcs);

		const gameState = serverDataOp
			.map((serverData) => serverData.state)
			.unwrap();

		const parentOpt = this.world.getEntity(this.parent);

		gameState.players.set(parentOpt.unwrap().name, this.state);

		this.callOnDelete(() => {
			gameState.players.delete(parentOpt.unwrap().name);
		});
	}

	onLoop(_delta: number): void {
		if (Math.random() < 0.1) {
			this.state.life += 1;
		}
	}
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) =>
	(name: string, pos: { x: number; y: number; z: number }) => {
		return new EntityEcs({
			name,
			world,
			components: {
				[PlayerServerBehavior.name]: new PlayerServerBehavior(pos),
			},
		});
	};
