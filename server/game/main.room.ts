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
import * as ProfileService from '$/services/profile.service';

import { playerServerFactoryGenerator } from './prefab/player.server';
import { worldServerFactory } from './prefab/world.server';
import { CharacterBodyServerEcs } from './scripts/entity/CharacterBodyServer.ecs';

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

	async onAuth(
		_client: Client<any, any>,
		_options: any,
		_context: AuthContext,
	) {
		const payloadOp = JwtService.verifyToken(_context.token);

		if (payloadOp.isNone()) {
			return false;
		}

		const payload = payloadOp.unwrap();

		const userInfo = await ProfileService.getUserInfo(payload.username);

		_client.userData = {
			payload,
			userInfo,
		};

		if (userInfo.profile.banned) {
			return false;
		}

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
		const userInfo = client.userData.userInfo as Awaited<
			ReturnType<typeof ProfileService.getUserInfo>
		>;

		this.worldEcs.addEntity(
			this.playerServerFactory({
				sessionId: client.sessionId,
				name: userInfo.agent.identifier,
				username: payload.username,
				pos: {
					x: userInfo.agent.positionX,
					y: userInfo.agent.positionY,
					z: userInfo.agent.positionZ,
				},
			}),
		);
	}

	async onLeave(client: Client<any, any>, _consented?: boolean): Promise<any> {
		const userInfo = client.userData?.userInfo as Awaited<
			ReturnType<typeof ProfileService.getUserInfo>
		>;

		const entity = this.worldEcs
			.getEntity(userInfo.agent.identifier)
			.unwrap('Entity not found on disconnect');

		const body = entity
			.get(CharacterBodyServerEcs)
			.map((c) => c.body)
			.unwrap('CharacterBodyServerEcs not found on disconnect');

		const position = body.translation();

		await ProfileService.saveUserInfo({
			identifier: userInfo.agent.identifier,
			agentData: {
				positionX: position.x,
				positionY: position.y,
				positionZ: position.z,
				metadata: {},
			},
			entityData: {
				life: 100,
				saturation: 100,
			},
		});

		this.worldEcs.deleteEntityById(userInfo.agent.identifier);
	}

	onUncaughtException(error: RoomException<this>, methodName: string): void {
		console.error(`${methodName} ${error.name}`, error);
	}
}
