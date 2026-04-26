import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { BoxState } from '#/state/box.state';

import { Box3DEcs } from '../scripts/box/box3d.ecs';
import { HealthBarRenderEcs } from '../scripts/common/health-bar-render.ecs';

export const boxClientFactoryGenerator =
	(world: WorldEcs) => (name: string, state: BoxState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({ state }),
				[Box3DEcs.name]: new Box3DEcs(state),
				[HealthBarRenderEcs.name]: new HealthBarRenderEcs(state.character),
			},
		});
