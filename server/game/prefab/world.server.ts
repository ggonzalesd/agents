import { WorldEcs } from '#/ecs';
import type { GameState } from '#/state/game.state';
import type RAPIER from '@dimforge/rapier3d-compat';

import { ServerDataEcs } from '../scripts/serverData.ecs';
import { ServerManagerEcs } from '../scripts/serverManager.ecs';
import type { Room } from 'colyseus';
import { WorldPathfinderEcs } from '../scripts/world/world-grid.ecs';
import { MapLoaderEcs } from '../scripts/world/map-loader.ecs';
import { AnimalSpawnerManagerEcs } from '../scripts/animal/animal-spawner-manager.ecs';
import { ExperimentManagerEcs } from '../scripts/experiment/experiment-manager.ecs';
import { WorldEventBusEcs } from '../scripts/world-event-bus.ecs';
import { GuiaV4ExperimentRuntimeEcs } from '../scripts/experiment/handlers/guia-v4.experiment-runtime.ecs';

const experimentFactories: ConstructorParameters<typeof ExperimentManagerEcs>[0] = new Map([
	['GUIA-EXPERIMENTACION-V4', (actor, entityName) => new GuiaV4ExperimentRuntimeEcs(actor, entityName)],
]);

export const worldServerFactory = ({
	state,
	worldPhysics,
	room,
}: {
	state: GameState;
	worldPhysics: RAPIER.World;
	room: Room<GameState>;
}) =>
	new WorldEcs({
		[ServerDataEcs.name]: new ServerDataEcs(state, worldPhysics, room),
		[WorldEventBusEcs.name]: new WorldEventBusEcs(),
		[ExperimentManagerEcs.name]: new ExperimentManagerEcs(experimentFactories),
		[WorldPathfinderEcs.name]: new WorldPathfinderEcs(),
		[MapLoaderEcs.name]: new MapLoaderEcs(),
		[ServerManagerEcs.name]: new ServerManagerEcs(),
		[AnimalSpawnerManagerEcs.name]: new AnimalSpawnerManagerEcs(),
	});
