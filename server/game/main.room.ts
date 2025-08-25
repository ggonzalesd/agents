import {
	Room,
	ServerError,
	type AuthContext,
	type Client,
	type RoomException,
} from 'colyseus';

import { GameState, PlayerState } from '#/state/game.state';
import { WorldEcs } from '#/ecs/World.ecs';

export class MainRoom extends Room<GameState> {
	worldEcs: WorldEcs = null!;

	onCreate(options: any): void | Promise<any> {
		if (!['1', '2', 'main-room'].includes(options.id)) {
			throw new ServerError(401, 'Invalid room ID');
		}

		console.log({ options });

		this.state = new GameState();

		this.worldEcs = new WorldEcs();

		this.roomId = options.id;

		this.autoDispose = false;

		this.setSimulationInterval(this.onUpdate.bind(this), 1000 / 60);
	}

	onUpdate(_delta: number) {
		this.worldEcs.onUpdate(_delta);
	}

	onAuth(client: Client<any, any>, _options: any, _context: AuthContext) {
		console.log({ client: client.auth });

		return true;
	}

	onJoin(
		client: Client<any, any>,
		_options?: any,
		_auth?: any,
	): void | Promise<any> {
		this.state.players.set(client.sessionId, new PlayerState());
	}

	onLeave(client: Client<any, any>, _consented?: boolean): void | Promise<any> {
		this.state.players.delete(client.sessionId);
	}

	onUncaughtException(
		error: RoomException<this>,
		methodName:
			| 'onCreate'
			| 'onAuth'
			| 'onJoin'
			| 'onLeave'
			| 'onDispose'
			| 'onMessage'
			| 'setSimulationInterval'
			| 'setInterval'
			| 'setTimeout',
	): void {
		console.error(methodName + ' ' + error.name);
	}
}
