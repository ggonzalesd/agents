import { WorldEcs } from '#/ecs';
import type { GameState } from '#/state/game.state';
import type RAPIER from '@dimforge/rapier3d-compat';

import { ServerDataEcs } from '../scripts/serverData.ecs';
import { ServerManagerEcs } from '../scripts/serverManager.ecs';
import type { Room } from 'colyseus';
import { WorldPathfinderEcs } from '../scripts/world/world-grid.ecs';

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
		[WorldPathfinderEcs.name]: new WorldPathfinderEcs(),
		[ServerManagerEcs.name]: new ServerManagerEcs(),
	});
