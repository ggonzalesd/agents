import { EntityEcs, type WorldEcs } from '#/ecs';
import { PlayerState } from '#/state/player.state';
import { type IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { InventoryServerEcs } from '../scripts/entity/InventoryServer.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';
import { PlayerServerBehavior } from '../scripts/player/playerServerBehavior.ecs';

interface PlayerServerFactoryParams {
	name: string;
	pos: IVec3;
	username: string;
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) =>
	({ name, pos, username }: PlayerServerFactoryParams) => {
		const state = new PlayerState({ pos, skin: username });

		return new EntityEcs({
			name,
			world,
			components: {
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
					state.character,
				),
				[MovementServerEcs.name]: new MovementServerEcs(state.movement),
				[InventoryServerEcs.name]: new InventoryServerEcs(state.inventory),
				[PlayerServerBehavior.name]: new PlayerServerBehavior({ state }),
			},
		});
	};
