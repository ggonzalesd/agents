import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import { PlayerState } from '#/state/game.state';

import { ServerDataEcs } from '../scripts/serverData.ecs';

class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	constructor() {
		super();

		this.state = new PlayerState();
	}

	onStart(): void {
		const serverDataOp = this.world.get(ServerDataEcs);

		const gameState = serverDataOp
			.map((serverData) => serverData.state)
			.unwrap();

		const parentOpt = this.world.getEntity(this.parent);

		gameState.players.set(parentOpt.unwrap().name, this.state);
	}

	onDelete(): void {
		const serverDataOp = this.world.get(ServerDataEcs);

		const gameState = serverDataOp
			.map((serverData) => serverData.state)
			.unwrap();

		const parentOpt = this.world.getEntity(this.parent);

		gameState.players.delete(parentOpt.unwrap().name);
	}
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) => (name: string) => {
		return new EntityEcs({
			name,
			world,
			components: {
				[PlayerServerBehavior.name]: new PlayerServerBehavior(),
			},
		});
	};
