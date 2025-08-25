import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState } from '#/state/game.state';

export class ServerDataEcs extends ComponentEcs {
	public state: GameState;

	constructor(state: GameState) {
		super();
		this.state = state;
	}
}
