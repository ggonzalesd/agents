import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { PlayerState } from '#/state/game.state';
import { MessageRenderEcs } from '../scripts/common/message-render.ecs';

import { ClientAuthoritative } from '../scripts/player/clientAuthoritative.ecs';
import { Player3DEcs } from '../scripts/player/player3D.ecs';
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
				[Player3DEcs.name]: new Player3DEcs(state),
				[MessageRenderEcs.name]: new MessageRenderEcs(),
				[PlayerCameraFollowEcs.name]: new PlayerCameraFollowEcs(),
				[PlayerClientBehavior.name]: new PlayerClientBehavior(),
			},
		});
