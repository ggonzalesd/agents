import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { TriggerZoneState } from '#/state/trigger-zone.state';
import { TriggerZoneServerEcs } from '../scripts/trigger/triggerZone.ecs';
import type { IVec3 } from '#/utils/math.util';

interface TriggerZoneServerFactoryProps {
	world: WorldEcs;
	name: string;
	pos: IVec3;
	radius?: number;
	height?: number;
	color?: number;
}

export const triggerZoneServerFactory = ({
	world,
	name,
	pos,
	radius = 2,
	height = 4,
	color,
}: TriggerZoneServerFactoryProps) => {
	const state = new TriggerZoneState(pos, radius, height, color);

	return new EntityEcs({
		name,
		world,
		components: {
			[RecordEcs.name]: new RecordEcs({
				stats: {
					id: name,
					name: 'Trigger Zone',
					type: 'trigger_zone',
					description: 'Zona que detecta entrada y salida de entidades.',
				},
			}),
			[TriggerZoneServerEcs.name]: new TriggerZoneServerEcs({ state }),
		},
	});
};
