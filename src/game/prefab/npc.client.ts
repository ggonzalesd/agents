import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { NPCState } from '#/state/game.state';
import { MessageRenderEcs } from '../scripts/common/message-render.ecs';
import { VFXListenerEcs } from '../scripts/common/vfx-listener.ecs';
import { Character3DEcs } from '../scripts/player/character3D.ecs';

export const npcClientFactoryGenerator =
	(world: WorldEcs) => (name: string, state: NPCState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({ state }),
				[Character3DEcs.name]: new Character3DEcs(
					state.character,
					state.movement,
					'user',
				),
				[MessageRenderEcs.name]: new MessageRenderEcs(),
				[VFXListenerEcs.name]: new VFXListenerEcs(state.movement),
			},
		});
