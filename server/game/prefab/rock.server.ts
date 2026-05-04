import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { CharacterBodyState } from '#/state/character-body.state';
import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';

interface RockServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
}

export const rockServerFactory = ({
	world,
	name,
	pos,
}: RockServerFactoryProps) => {
	const state = new CharacterBodyState(pos, 1, 1);

	return new EntityEcs({
		name,
		world,
		components: {
			[RecordEcs.name]: new RecordEcs({
				stats: {
					id: name,
					name: 'Roca',
					type: 'rock',
					description: 'Una roca que bloquea el paso.',
				},
			}),
			[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
				state,
				'cuboid',
				{
					bodyType: 'fixed',
					cuboidHalfExtents: { x: 0.4, y: 0.8, z: 0.4 },
				},
			),
		},
	});
};
