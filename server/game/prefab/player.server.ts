import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { PlayerState } from '#/state/game.state';
import { ServerDataEcs } from '../scripts/serverData.ecs';

class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState = null!;

	constructor() {
		super();

		const gameState = this.world
			.get(ServerDataEcs)
			.map((serverData) => serverData.state)
			.unsafe();

		gameState.players.set(this.entity.unsafe().name, this.state);
	}

	onStart(): void {}
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) => (name: string) =>
		new EntityEcs({
			name,
			world,
			components: {
				[PlayerServerBehavior.name]: new PlayerServerBehavior(),
			},
		});
