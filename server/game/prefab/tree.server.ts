import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { CharacterBodyState } from '#/state/character-body.state';
import type { IVec3 } from '#/utils/math.util';

import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { TreeServerBehavior } from '../scripts/tree/treeServerBehavior.ecs';

interface TreeServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
}

export const treeServerFactory = ({
	world,
	name,
	pos,
}: TreeServerFactoryProps) => {
	const state = new CharacterBodyState(pos, 1, 1);

	return new EntityEcs({
		name,
		world,
		components: {
			[RecordEcs.name]: new RecordEcs({
				stats: {
					id: name,
					name: 'Arbol',
					type: 'tree',
					description: 'Un arbol que bloquea el paso y puede soltar items.',
				},
			}),
			[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
				state,
				'cuboid',
				{
					bodyType: 'fixed',
					cuboidHalfExtents: { x: 0.35, y: 1.5, z: 0.35 },
				},
			),
			[TreeServerBehavior.name]: new TreeServerBehavior(),
		},
	});
};
