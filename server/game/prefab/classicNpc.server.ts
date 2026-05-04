import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';
import { NPCState } from '#/state/game.state';
import type { IVec3 } from '#/utils/math.util';
import type { ClassicNpcConfigDB } from '$/models/ClassicNPC.model';
import { ClassicNPCActionProcessEcs } from '../scripts/classic-npc/classic-npc-action-process.ecs';
import { ClassicNPCBehaviorStateEcs } from '../scripts/classic-npc/classic-npc-behavior-state.ecs';
import { ClassicNPCStateMachineEcs } from '../scripts/classic-npc/classic-npc-state-machine.ecs';
import { ClassicNpcDialogueEcs } from '../scripts/classic-npc/dialogue/classic-npc-dialogue.ecs';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { EntityPathfinderEcs } from '../scripts/entity/entity-pathfinder.ecs';
import { FollowPathEcs } from '../scripts/entity/follow-path/follow-path.ecs';
import { NpcPathDebugSyncEcs } from '../scripts/entity/follow-path/npc-path-debug-sync.ecs';
import { InventoryServerEcs } from '../scripts/entity/InventoryServer.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';
import { NpcServerBehavior } from '../scripts/npc/npcServerBehavior.ecs';
import type { DialogueConfig } from '../scripts/classic-npc/dialogue/dialogue.types';
import type { Room } from 'colyseus';

export const classicNpcServerFactoryGenerator =
	(world: WorldEcs) =>
	({
		name,
		display,
		pos,
		description,
		id,
		config,
		skin,
		life,
		maxLife,
		dialogueConfig,
		room,
		pathfinder,
	}: {
		name: string;
		display: string;
		pos: IVec3;
		description: string;
		id: string;
		config?: ClassicNpcConfigDB | null;
		skin?: string;
		life?: number;
		maxLife?: number;
		dialogueConfig?: DialogueConfig;
		room?: Room;
		pathfinder?: IPathfinder;
	}) => {
		const state = new NPCState(pos, skin ?? name, life, maxLife, 'CLASSIC');
		if (dialogueConfig) state.hasDialogue = true;
		state.hasInventory = true;

		return new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({
					db: {
						id,
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
				[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
					state.character,
				),
				[MovementServerEcs.name]: new MovementServerEcs(state.movement),
				[FollowPathEcs.name]: new FollowPathEcs(),
				[NpcPathDebugSyncEcs.name]: new NpcPathDebugSyncEcs(state),
				[InventoryServerEcs.name]: new InventoryServerEcs(state.inventory),
				[NpcServerBehavior.name]: new NpcServerBehavior({ state }),
				[ClassicNPCBehaviorStateEcs.name]: new ClassicNPCBehaviorStateEcs({
					state,
					config,
					spawnPoint: pos,
				}),
			[ClassicNPCStateMachineEcs.name]: new ClassicNPCStateMachineEcs(),
			[ClassicNPCActionProcessEcs.name]: new ClassicNPCActionProcessEcs(),
			...(dialogueConfig && room
				? { [ClassicNpcDialogueEcs.name]: new ClassicNpcDialogueEcs(dialogueConfig, room, state) }
				: {}),
			...(pathfinder
				? { [EntityPathfinderEcs.name]: new EntityPathfinderEcs(pathfinder) }
				: {}),
		},
	});
	};
