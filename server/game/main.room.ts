import {
	OnCreateException,
	Room,
	ServerError,
	type AuthContext,
	type Client,
	type RoomException,
} from 'colyseus';

import { GameState, PlayerState } from '#/state/game.state';
import { HttpError } from '#/utils/HttpError';

export class MainRoom extends Room<GameState> {
	onCreate(options: any): void | Promise<any> {
		if (!['1', '2', 'main-room'].includes(options.id)) {
			throw new ServerError(401, 'Invalid room ID');
		}

		console.log({ options });

		this.state = new GameState();

		this.roomId = options.id;

		this.autoDispose = false;

		this.setSimulationInterval(this.onUpdate.bind(this), 1000 / 60);
	}

	onUpdate(delta: number) {}

	onAuth(client: Client<any, any>, options: any, context: AuthContext) {
		console.log({ client: client.auth });

		return true;
	}

	onJoin(
		client: Client<any, any>,
		options?: any,
		auth?: any,
	): void | Promise<any> {
		this.state.players.set(client.sessionId, new PlayerState());
	}

	onLeave(client: Client<any, any>, consented?: boolean): void | Promise<any> {
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
		console.error(error.name);
	}
}
