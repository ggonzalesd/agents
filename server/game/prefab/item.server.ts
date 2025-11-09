import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { ItemEntityState } from '#/state/inventory.state';
import type { IVec3 } from '#/utils/math.util';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { ItemServerBehavior } from '../scripts/item/itemServerBehavior.ecs';

interface ItemServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
	stats: {
		type: string;
		amount: number;
	};
}

export const itemServerFactory = ({
	world,
	name,
	pos,
	stats,
}: ItemServerFactoryProps) => {
	const state = new ItemEntityState(pos, stats.type, stats.amount);

	return new EntityEcs({
		name: name,
		world: world,
		components: {
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
		},
	});
};
