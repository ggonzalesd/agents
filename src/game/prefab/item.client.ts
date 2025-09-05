import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { ItemEntityState } from '#/state/game.state';
import { Item3DEcs } from '../scripts/item/item3d.ecs';

export const itemClientFactoryGenerator =
	(world: WorldEcs) => (name: string, state: ItemEntityState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({ state }),
				[Item3DEcs.name]: new Item3DEcs(state),
			},
		});
