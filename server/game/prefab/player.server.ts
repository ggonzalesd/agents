import { EntityEcs, type WorldEcs } from '#/ecs';
import { type IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { PlayerServerBehavior } from '../scripts/player/playerServerBehavior.ecs';

export const playerServerFactoryGenerator =
	(world: WorldEcs) =>
	({ name, pos }: { name: string; pos: IVec3 }) => {
		return new EntityEcs({
			name,
			world,
			components: {
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(pos),
				[PlayerServerBehavior.name]: new PlayerServerBehavior({ pos }),
			},
		});
	};
