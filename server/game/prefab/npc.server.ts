import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { NPCState } from '#/state/game.state';
import type { IVec3 } from '#/utils/math.util';
import { NPCActionProcessEcs } from '../scripts/ai/npc-action-process.ecs';
import { NPCContextEcs } from '../scripts/ai/npc-context.ecs';
import { NPCEventQueueEcs } from '../scripts/ai/npc-event-queue.ecs';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { FollowPathEcs } from '../scripts/entity/follow-path/follow-path.ecs';
import { NpcPathDebugSyncEcs } from '../scripts/entity/follow-path/npc-path-debug-sync.ecs';
import { InventoryServerEcs } from '../scripts/entity/InventoryServer.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';
import { NpcServerBehavior } from '../scripts/npc/npcServerBehavior.ecs';

export const npcServerFactoryGenerator =
	(world: WorldEcs) =>
	({
		name,
		display,
		pos,
		description,
		id,
		model,
		skin,
		life,
		maxLife,
	}: {
		name: string;
		display: string;
		pos: IVec3;
		description: string;
		id: string;
		model: string;
		skin?: string;
		life?: number;
		maxLife?: number;
	}) => {
		const state = new NPCState(pos, skin ?? name, life, maxLife, 'AI');
		state.hasInventory = true;

		return new EntityEcs({
			name,
			world,
			components: {
				// Basic data components
				[RecordEcs.name]: new RecordEcs({
					db: {
						id,
						model,
					},
					stats: {
						id: name,
						name: display,
						description,
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
				[NpcPathDebugSyncEcs.name]: new NpcPathDebugSyncEcs(state),
				[InventoryServerEcs.name]: new InventoryServerEcs(state.inventory),

				// NPC specific AI components
				[NPCContextEcs.name]: new NPCContextEcs(),
				[NPCActionProcessEcs.name]: new NPCActionProcessEcs(),
				[NpcServerBehavior.name]: new NpcServerBehavior({
					state,
				}),
			},
		});
	};
