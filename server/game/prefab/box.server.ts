import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { BoxState, type BoxSkin } from '#/state/box.state';
import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { BoxServerBehavior } from '../scripts/box/boxServerBehavior.ecs';

interface BoxServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
	skin?: BoxSkin;
	dropItems?: string[];
}

export const boxServerFactory = ({
	world,
	name,
	pos,
	skin = 'box_stacked',
	dropItems,
}: BoxServerFactoryProps) => {
	const state = new BoxState(pos, skin);

	return new EntityEcs({
		name,
		world,
		components: {
			[RecordEcs.name]: new RecordEcs({
				stats: {
					id: name,
					name: 'Caja',
					type: 'box',
					description: 'Una caja rompible que suelta un item al destruirse.',
				},
			}),
			[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
				state.character,
				'cuboid',
				{
					bodyType: 'fixed',
					cuboidHalfExtents: { x: 0.45, y: 0.45, z: 0.45 },
				},
			),
			[BoxServerBehavior.name]: new BoxServerBehavior({ state, dropItems }),
		},
	});
};
