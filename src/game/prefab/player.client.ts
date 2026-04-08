import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { PlayerState } from '#/state/player.state';
import { MessageRenderEcs } from '../scripts/common/message-render.ecs';
import { VFXListenerEcs } from '../scripts/common/vfx-listener.ecs';

import { ClientAuthoritative } from '../scripts/player/clientAuthoritative.ecs';
import { Character3DEcs } from '../scripts/player/character3D.ecs';
import { PlayerCameraFollowEcs } from '../scripts/player/playerCameraFollow.ecs';
import { PlayerClientBehavior } from '../scripts/player/playerClientBehavior.ecs';

export const playerClientFactoryGenerator =
	(world: WorldEcs) => (name: string, state: PlayerState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({ state }),
				[ClientAuthoritative.name]: new ClientAuthoritative(),
				[Character3DEcs.name]: new Character3DEcs(
					state.character,
					state.movement,
					state.skin,
				),
				[MessageRenderEcs.name]: new MessageRenderEcs(),
				[VFXListenerEcs.name]: new VFXListenerEcs(state.movement),
				[PlayerCameraFollowEcs.name]: new PlayerCameraFollowEcs(),
				[PlayerClientBehavior.name]: new PlayerClientBehavior(),
			},
		});
