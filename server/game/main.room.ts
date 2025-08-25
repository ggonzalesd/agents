import {
	Room,
	ServerError,
	type AuthContext,
	type Client,
	type RoomException,
} from 'colyseus';

import { GameState, PlayerState } from '#/state/game.state';
import { WorldEcs } from '#/ecs/World.ecs';
import { playerServerFactoryGenerator } from './prefab/player.server';
import { ServerDataEcs } from './scripts/serverData.ecs';

export class MainRoom extends Room<GameState> {
	worldEcs: WorldEcs = null!;

	playerServerFactory: ReturnType<typeof playerServerFactoryGenerator> = null!;

	onCreate(options: any): void | Promise<any> {
		if (!['1', '2', 'main-room'].includes(options.id)) {
			throw new ServerError(401, 'Invalid room ID');
		}

		this.state = new GameState();

		this.worldEcs = new WorldEcs({
			[ServerDataEcs.name]: new ServerDataEcs(this.state),
		});

		this.playerServerFactory = playerServerFactoryGenerator(this.worldEcs);

		console.log({ options });

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
		this.worldEcs.addEntity(this.playerServerFactory(client.sessionId));
	}

	onLeave(client: Client<any, any>, _consented?: boolean): void | Promise<any> {
		this.worldEcs.deleteEntityById(client.sessionId);
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
