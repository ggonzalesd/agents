import { EntityEcs, type WorldEcs } from '#/ecs';
import { NPCState } from '#/state/game.state';
import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { FollowPathEcs } from '../scripts/entity/follow-path/follow-path.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';
import { NpcServerBehavior } from '../scripts/npc/npcServerBehavior.ecs';

export const npcServerFactoryGenerator =
	(world: WorldEcs) =>
	({ name, pos }: { name: string; pos: IVec3 }) => {
		const state = new NPCState(pos, name);

		return new EntityEcs({
			name,
			world,
			components: {
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
					state.character,
				),
				[MovementServerEcs.name]: new MovementServerEcs(state.movement),
				[FollowPathEcs.name]: new FollowPathEcs(),
				[NpcServerBehavior.name]: new NpcServerBehavior({
					state,
				}),
			},
		});
	};
