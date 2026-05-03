import { EntityEcs } from '#/ecs/Entity.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import type { TriggerZoneState } from '#/state/trigger-zone.state';

import { TriggerZone3DEcs } from '../scripts/trigger/triggerZone3d.ecs';

export const triggerZoneClientFactoryGenerator =
	(world: WorldEcs) => (name: string, state: TriggerZoneState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[RecordEcs.name]: new RecordEcs({ state }),
				[TriggerZone3DEcs.name]: new TriggerZone3DEcs(state),
			},
		});
