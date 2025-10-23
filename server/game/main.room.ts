import {
	Room,
	ServerError,
	type AuthContext,
	type Client,
	type RoomException,
} from 'colyseus';

import * as RAPIER from '@dimforge/rapier3d-compat';

import { GameState } from '#/state/game.state';
import type { WorldEcs } from '#/ecs/World.ecs';
import * as JwtService from '$/services/jwt.service';

import { playerServerFactoryGenerator } from './prefab/player.server';
import { npcServerFactoryGenerator } from './prefab/npc.server';
import { worldServerFactory } from './prefab/world.server';

export class MainRoom extends Room<GameState> {
	worldEcs: WorldEcs = null!;
	worldPhy: RAPIER.World = null!;

	playerServerFactory: ReturnType<typeof playerServerFactoryGenerator> = null!;

	onCreate(options: any): void | Promise<void> {
		if (!['1', '2', 'main-room'].includes(options.id)) {
			throw new ServerError(401, 'Invalid room ID');
		}

		this.state = new GameState();
		this.worldPhy = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

		this.worldEcs = worldServerFactory({
			state: this.state,
			worldPhysics: this.worldPhy,
			room: this,
		});

		this.playerServerFactory = playerServerFactoryGenerator(this.worldEcs);

		this.roomId = options.id;

		this.autoDispose = false;

		this.setSimulationInterval(this.onUpdate.bind(this), 1000 / 60);

		this.onMessage('client:state', this.onClientState.bind(this));
		this.onMessage('client:action', this.onClientAction.bind(this));
		this.onMessage('*', () => {});

		const npcServerFactory = npcServerFactoryGenerator(this.worldEcs);

		// Add some NPCs
		for (let i = 0; i < 3; i++) {
			this.worldEcs.addEntity(
				npcServerFactory({
					name: `npc_${i}_${Math.random().toString(36).substring(7)}`,
					pos: {
						x: (Math.random() - 0.5) * 20,
						y: 5,
						z: (Math.random() - 0.5) * 20,
					},
				}),
			);
		}
	}

	onClientAction(client: Client, message: any) {
		this.worldEcs.stacker.stackLoss(
			`client:${client.sessionId}:action`,
			message ?? {},
			10,
		);
	}

	onClientState(client: Client, message: any) {
		this.worldEcs.stacker.stackLoss(
			`client:${client.sessionId}:state`,
			message,
			5,
		);
	}

	onUpdate(_delta: number) {
		this.worldEcs.onUpdate(_delta);
		this.worldPhy.step();
	}

	onAuth(_client: Client<any, any>, _options: any, _context: AuthContext) {
		const payloadOp = JwtService.verifyToken(_context.token);

		if (payloadOp.isNone()) {
			return false;
		}

		const payload = payloadOp.unwrap();

		_client.userData = {
			payload,
		};

		// Check if another client with the same user is connected
		for (const c of this.clients) {
			if (c !== _client && c.userData?.payload?.username === payload.username) {
				return false;
			}
		}

		return true;
	}

	async onJoin(
		client: Client<any, any>,
		_options?: any,
		_auth?: any,
	): Promise<any> {
		if (!client.userData || !client.userData.payload) {
			return;
		}

		const payload = client.userData.payload as { username: string };

		this.worldEcs.addEntity(
			this.playerServerFactory({
				name: client.sessionId,
				username: payload.username,
				pos: {
					x: (Math.random() - 0.5) * 10,
					y: (Math.random() - 0.5) * 5 + 10,
					z: (Math.random() - 0.5) * 10,
				},
			}),
		);
	}

	async onLeave(client: Client<any, any>, _consented?: boolean): Promise<any> {
		this.worldEcs.deleteEntityById(client.sessionId);
	}

	onUncaughtException(error: RoomException<this>, methodName: string): void {
		console.error(`${methodName} ${error.name}`, error);
	}
}
