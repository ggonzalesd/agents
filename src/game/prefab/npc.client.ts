import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { NPCState } from '#/state/game.state';
import { HealthBarRenderEcs } from '../scripts/common/health-bar-render.ecs';
import { MessageRenderEcs } from '../scripts/common/message-render.ecs';
import { NpcPathRenderEcs } from '../scripts/common/npc-path-render.ecs';
import { VFXListenerEcs } from '../scripts/common/vfx-listener.ecs';
import { Character3DEcs } from '../scripts/player/character3D.ecs';
import { ClassicNpcDialogueClientEcs } from '../scripts/classic-npc/classic-npc-dialogue-client.ecs';
import { DialogueIndicatorEcs } from '../scripts/classic-npc/dialogue-indicator.ecs';

export const npcClientFactoryGenerator =
	(world: WorldEcs) =>
	(name: string, state: NPCState, hasDialogue = false) =>
		new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({ state }),
			[Character3DEcs.name]: new Character3DEcs(
				state.character,
				state.movement,
				state.skin,
				null,
			),
				[HealthBarRenderEcs.name]: new HealthBarRenderEcs(state.character),
				[MessageRenderEcs.name]: new MessageRenderEcs(),
				[NpcPathRenderEcs.name]: new NpcPathRenderEcs(state),
				[VFXListenerEcs.name]: new VFXListenerEcs(state.movement),
				[DialogueIndicatorEcs.name]: new DialogueIndicatorEcs(),
				...(hasDialogue ? { [ClassicNpcDialogueClientEcs.name]: new ClassicNpcDialogueClientEcs() } : {}),
			},
		});
