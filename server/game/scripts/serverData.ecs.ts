import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState } from '#/state/game.state';

export class ServerDataEcs extends ComponentEcs {
	public state: GameState;
	public worldPhysic: RAPIER.World;

	constructor(state: GameState, worldPhysic: RAPIER.World) {
		super();
		this.state = state;
		this.worldPhysic = worldPhysic;
	}
}
