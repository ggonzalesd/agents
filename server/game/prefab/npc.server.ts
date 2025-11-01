import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { NPCState } from '#/state/game.state';
import type { IVec3 } from '#/utils/math.util';
import { NPCActionProcessEcs } from '../scripts/ai/npc-action-process.ecs';
import { NPCContextEcs } from '../scripts/ai/npc-context.ecs';
import { NPCEventQueueEcs } from '../scripts/ai/npc-event-queue.ecs';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { FollowPathEcs } from '../scripts/entity/follow-path/follow-path.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';
import { NpcServerBehavior } from '../scripts/npc/npcServerBehavior.ecs';

export const npcServerFactoryGenerator =
	(world: WorldEcs) =>
	({
		name,
		display,
		pos,
		description,
	}: {
		name: string;
		display: string;
		pos: IVec3;
		description: string;
	}) => {
		const state = new NPCState(pos, name);

		return new EntityEcs({
			name,
			world,
			components: {
				// Basic data components
				[RecordEcs.name]: new RecordEcs({
					stats: {
						id: name,
						name: display,
						description,
						life: 100,
					},
					mood: {
						happiness: 50,
					},
				}),
				// Events for NPC AI
				[NPCEventQueueEcs.name]: new NPCEventQueueEcs(),

				// Movement components
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
					state.character,
				),
				[MovementServerEcs.name]: new MovementServerEcs(state.movement),
				[FollowPathEcs.name]: new FollowPathEcs(),

				// NPC specific AI components
				[NPCContextEcs.name]: new NPCContextEcs(),
				[NPCActionProcessEcs.name]: new NPCActionProcessEcs(),
				[NpcServerBehavior.name]: new NpcServerBehavior({
					state,
				}),
			},
		});
	};
