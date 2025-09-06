import { EntityEcs, WorldEcs } from '#/ecs';
import { ItemEntityState } from '#/state/inventory.state';
import type { IVec3 } from '#/utils/math.util';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { ItemServerBehavior } from '../scripts/item/itemServerBehavior.ecs';

interface ItemServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
}

export const itemServerFactory = ({
	world,
	name,
	pos,
}: ItemServerFactoryProps) => {
	const state = new ItemEntityState(pos, 'item');

	return new EntityEcs({
		name: name,
		world: world,
		components: {
			[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
				state.character,
				'cuboid',
			),
			[ItemServerBehavior.name]: new ItemServerBehavior({ state }),
		},
	});
};
