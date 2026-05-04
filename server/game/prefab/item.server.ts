import { EntityEcs, type WorldEcs } from '#/ecs';
import type { ComponentEcs } from '#/ecs/Component.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { ItemEntityState } from '#/state/inventory.state';
import type { IVec3 } from '#/utils/math.util';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { ItemServerBehavior } from '../scripts/item/itemServerBehavior.ecs';
import { ItemLifetimeEcs } from '../scripts/item/item-lifetime.ecs';

interface ItemServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
	stats: {
		type: string;
		amount: number;
	};
	lifetime?: number;
}

export const itemServerFactory = ({
	world,
	name,
	pos,
	stats,
	lifetime,
}: ItemServerFactoryProps) => {
	const state = new ItemEntityState(pos, stats.type, stats.amount);

	const components: Record<string, ComponentEcs> = {
		[RecordEcs.name]: new RecordEcs({
			stats: {
				...stats,
				id: name,
				durability: 100,
			},
		}),
		[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
			state.character,
			'cuboid',
		),
		[ItemServerBehavior.name]: new ItemServerBehavior({ state }),
	};

	if (lifetime !== undefined) {
		components[ItemLifetimeEcs.name] = new ItemLifetimeEcs(lifetime);
	}

	return new EntityEcs({ name, world, components });
};
