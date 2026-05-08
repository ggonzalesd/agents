import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { FloatingTextState } from '#/state/floating-text.state';

import { FloatingTextRenderEcs } from '../scripts/common/floating-text-render.ecs';

export const floatingTextClientFactoryGenerator =
	(world: WorldEcs) =>
	(name: string, state: FloatingTextState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[FloatingTextRenderEcs.name]: new FloatingTextRenderEcs(state),
			},
		});
