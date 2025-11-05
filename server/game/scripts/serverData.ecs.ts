import type * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState } from '#/state/game.state';
import type { Room } from 'colyseus';

export class ServerDataEcs extends ComponentEcs {
	public state: GameState;
	public worldPhysic: RAPIER.World;
	public room: Room<GameState>;

	constructor(
		state: GameState,
		worldPhysic: RAPIER.World,
		room: Room<GameState>,
	) {
		super();
		this.state = state;
		this.worldPhysic = worldPhysic;
		this.room = room;
	}
}
