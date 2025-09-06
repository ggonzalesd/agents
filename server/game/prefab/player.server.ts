import { EntityEcs, type WorldEcs } from '#/ecs';
import { PlayerState } from '#/state/player.state';
import { type IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';
import { PlayerServerBehavior } from '../scripts/player/playerServerBehavior.ecs';

export const playerServerFactoryGenerator =
	(world: WorldEcs) =>
	({ name, pos, username }: { name: string; pos: IVec3; username: string }) => {
		const state = new PlayerState({ pos, skin: username });

		return new EntityEcs({
			name,
			world,
			components: {
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
					state.character,
				),
				[MovementServerEcs.name]: new MovementServerEcs(state.movement),
				[PlayerServerBehavior.name]: new PlayerServerBehavior({ state }),
			},
		});
	};
