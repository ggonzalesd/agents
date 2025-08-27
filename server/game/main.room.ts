import {
	Room,
	ServerError,
	type AuthContext,
	type Client,
	type RoomException,
} from 'colyseus';

import * as RAPIER from '@dimforge/rapier3d-compat';

import { GameState } from '#/state/game.state';
import { WorldEcs } from '#/ecs/World.ecs';
import { playerServerFactoryGenerator } from './prefab/player.server';
import { ServerDataEcs } from './scripts/serverData.ecs';
import { ServerManagerEcs } from './scripts/serverManager.ecs';

export class MainRoom extends Room<GameState> {
	worldEcs: WorldEcs = null!;
	worldPhy: RAPIER.World = null!;

	playerServerFactory: ReturnType<typeof playerServerFactoryGenerator> = null!;

	onCreate(options: any): void | Promise<any> {
		if (!['1', '2', 'main-room'].includes(options.id)) {
			throw new ServerError(401, 'Invalid room ID');
		}

		this.state = new GameState();
		this.worldPhy = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

		this.worldEcs = new WorldEcs({
			[ServerDataEcs.name]: new ServerDataEcs(this.state, this.worldPhy),
			[ServerManagerEcs.name]: new ServerManagerEcs(),
		});

		this.playerServerFactory = playerServerFactoryGenerator(this.worldEcs);

		console.log({ options });

		this.roomId = options.id;

		this.autoDispose = false;

		this.setSimulationInterval(this.onUpdate.bind(this), 1000 / 60);

		this.onMessage('jump', this.onClientJump.bind(this));
	}

	onClientJump(client: Client, _: any) {
		// console.log('Message received:', message, client.sessionId);
		this.worldEcs.stacker.stackLoss(`client:${client.sessionId}:jump`, 1);
	}

	onUpdate(_delta: number) {
		this.worldEcs.onUpdate(_delta);
		this.worldPhy.step();
	}

	onAuth(_client: Client<any, any>, _options: any, _context: AuthContext) {
		console.log({ token: _context.token });

		return true;
	}

	async onJoin(
		client: Client<any, any>,
		_options?: any,
		_auth?: any,
	): Promise<any> {
		this.worldEcs.addEntity(
			this.playerServerFactory(client.sessionId, {
				x: (Math.random() - 0.5) * 5,
				y: (Math.random() - 0.5) * 5 + 10,
				z: (Math.random() - 0.5) * 5,
			}),
		);
	}

	async onLeave(client: Client<any, any>, _consented?: boolean): Promise<any> {
		this.worldEcs.deleteEntityById(client.sessionId);
	}

	onUncaughtException(error: RoomException<this>, methodName: string): void {
		console.error(methodName + ' ' + error.name, error);
	}
}
