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
import { LOGIN_TYPE } from '#/schema/auth.schema';
import type { AuthPayload } from '$/models/Payload.model';

import * as JwtService from '$/services/jwt.service';
import * as ProfileService from '$/services/profile.service';
import * as InventoryRepository from '$/db/inventory.db';

import * as PlayerPrefab from './prefab/player.server';
import * as WorldPrefab from './prefab/world.server';

import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { CharacterBodyServerEcs } from './scripts/entity/CharacterBodyServer.ecs';
import { InventoryServerEcs } from './scripts/entity/InventoryServer.ecs';
import { ItemState } from '#/state/inventory.state';
import { ExperimentManagerEcs } from './scripts/experiment/experiment-manager.ecs';
import type { StartExperimentRequest } from '#/schema/experiment.schema';
import * as ExperimentService from '$/services/experiment-orchestrator.service';
import { ClassicNpcDialogueEcs } from './scripts/classic-npc/dialogue/classic-npc-dialogue.ecs';
import { dialogueResponseMessageSchema } from '#/schema/dialogue.schema';

export class MainRoom extends Room<GameState> {
	worldEcs: WorldEcs = null!;
	worldPhy: RAPIER.World = null!;
	eventQueue: RAPIER.EventQueue = null!;

	playerServerFactory: ReturnType<
		typeof PlayerPrefab.playerServerFactoryGenerator
	> = null!;

	private expulsionTimers = new Map<string, ReturnType<typeof setTimeout>>();

	onCreate(options: any): void | Promise<void> {
		if (!['1', '2', 'main-room'].includes(options.id)) {
			throw new ServerError(401, 'Invalid room ID');
		}

		this.state = new GameState();
		this.worldPhy = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
		this.eventQueue = new RAPIER.EventQueue(true);

		this.worldEcs = WorldPrefab.worldServerFactory({
			state: this.state,
			worldPhysics: this.worldPhy,
			eventQueue: this.eventQueue,
			room: this,
		});

		this.playerServerFactory = PlayerPrefab.playerServerFactoryGenerator(
			this.worldEcs,
		);

		this.roomId = options.id;

		this.autoDispose = false;

		this.setSimulationInterval(this.onUpdate.bind(this), 1000 / 60);

		this.onMessage('client:state', this.onClientState.bind(this));
		this.onMessage('client:action', this.onClientAction.bind(this));
		this.onMessage('dialogue:start', this.onDialogueStart.bind(this));
		this.onMessage('dialogue:response', this.onDialogueResponse.bind(this));
		this.onMessage('dialogue:cancel', this.onDialogueCancel.bind(this));
		this.onMessage('experiment:start', this.onExperimentStart.bind(this));
		this.onMessage('experiment:stop', this.onExperimentStop.bind(this));
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

	private onDialogueStart(client: Client, message: unknown): void {
		const playerEntityId = client.userData?.userInfo?.agent?.identifier as
			| string
			| undefined;
		if (!playerEntityId) {
			client.send('dialogue:unavailable', { npcEntityId: '' });
			return;
		}

		const data = message as { npcEntityId?: string } | null;
		if (!data?.npcEntityId) {
			client.send('dialogue:unavailable', { npcEntityId: '' });
			return;
		}

		const npcEntity = this.worldEcs.getEntity(data.npcEntityId).raw();
		if (!npcEntity) {
			client.send('dialogue:unavailable', { npcEntityId: data.npcEntityId });
			return;
		}

		const dialogueEcs = npcEntity.get(ClassicNpcDialogueEcs).raw();
		if (!dialogueEcs) {
			client.send('dialogue:unavailable', { npcEntityId: data.npcEntityId });
			return;
		}

		dialogueEcs.startDialogue(playerEntityId);
	}

	private onDialogueResponse(client: Client, message: unknown): void {
		const playerEntityId = client.userData?.userInfo?.agent?.identifier as
			| string
			| undefined;
		if (!playerEntityId) return;

		const parsed = dialogueResponseMessageSchema.safeParse(message);
		if (!parsed.success) return;

		const npcEntity = this.worldEcs.getEntity(parsed.data.npcEntityId).raw();
		if (!npcEntity) return;

		const dialogueEcs = npcEntity.get(ClassicNpcDialogueEcs).raw();
		if (!dialogueEcs) return;

		dialogueEcs.receiveResponse(playerEntityId, message);
	}

	private onDialogueCancel(client: Client, message: unknown): void {
		const playerEntityId = client.userData?.userInfo?.agent?.identifier as
			| string
			| undefined;
		if (!playerEntityId) return;

		const data = message as { npcEntityId?: string } | null;
		if (!data?.npcEntityId) return;

		const npcEntity = this.worldEcs.getEntity(data.npcEntityId).raw();
		if (!npcEntity) return;

		const dialogueEcs = npcEntity.get(ClassicNpcDialogueEcs).raw();
		if (!dialogueEcs) return;

		dialogueEcs.cancelDialogue(playerEntityId);
	}

	private onExperimentStart(client: Client, message: unknown): void {
		const payload = client.userData?.payload as AuthPayload | undefined;
		const userInfo = client.userData?.userInfo as
			| Awaited<ReturnType<typeof ProfileService.getUserInfo>>
			| undefined;

		if (!payload || !userInfo) return;

		const body = message as StartExperimentRequest;
		if (!body?.experimentKey) return;

		const manager = this.worldEcs
			.get(ExperimentManagerEcs)
			.unwrap('ExperimentManagerEcs not found');

		if (manager.hasActiveRuntime(payload.id)) {
			client.send('experiment:error', {
				message: 'Ya tienes un experimento activo',
			});
			return;
		}

		try {
			manager.startExperiment(
				{ userId: payload.id, username: payload.username, role: payload.role },
				userInfo.agent.identifier,
				body.experimentKey,
			);
		} catch (err) {
			client.send('experiment:error', { message: String(err) });
		}
	}

	private onExperimentStop(client: Client, _message: unknown): void {
		const payload = client.userData?.payload as AuthPayload | undefined;
		if (!payload) return;

		const manager = this.worldEcs
			.get(ExperimentManagerEcs)
			.unwrap('ExperimentManagerEcs not found');

		manager.stopExperiment(payload.id);
	}

	onUpdate(_delta: number) {
		this.worldEcs.onUpdate(_delta);
		this.worldPhy.step(this.eventQueue);
	}

	async onDispose(): Promise<void> {
		for (const timer of this.expulsionTimers.values()) {
			clearTimeout(timer);
		}
		this.expulsionTimers.clear();

		const entitiesWithInventory = this.worldEcs.getEntityLike({
			inventory: InventoryServerEcs,
			record: RecordEcs,
		});

		const savePromises = entitiesWithInventory.map(({ components }) => {
			const dbRecord = components.record.getRecord<{ id: string }>('db');
			if (dbRecord.isNone()) return Promise.resolve();

			const entityId = dbRecord.unwrap().id;
			const inventoryEcs = components.inventory;

			const items = Array.from(inventoryEcs.inventoryState.items.entries()).map(
				([slot, item]) => {
					const metadata: Record<string, string> = {};
					item.metadata.forEach((value, key) => {
						metadata[key] = value;
					});
					return { slot, type: item.type, quantity: item.quantity, metadata };
				},
			);

			return InventoryRepository.saveInventory({ entityId, items });
		});

		await Promise.all(savePromises);

		this.worldEcs.onDelete();
		console.log('MainRoom disposed');
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

		if (
			payload.loginType === LOGIN_TYPE.REDEEM_TOKEN &&
			new Date() > new Date(payload.validUntil)
		) {
			return false;
		}

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

		const payload = client.userData.payload as AuthPayload;
		const userInfo = client.userData.userInfo as Awaited<
			ReturnType<typeof ProfileService.getUserInfo>
		>;

		const playerEntity = this.playerServerFactory({
			sessionId: client.sessionId,
			name: userInfo.agent.identifier,
			username: payload.username,
			entityId: userInfo.entity.id,
			life: userInfo.entity.life,
			maxLife: userInfo.entity.maxLife,
			skin: userInfo.user.skin ?? undefined,
			pos: {
				x: userInfo.agent.positionX,
				y: userInfo.agent.positionY,
				z: userInfo.agent.positionZ,
			},
		});

		const inventoryOp = playerEntity.get(InventoryServerEcs);
		if (inventoryOp.isSome()) {
			const inventoryEcs = inventoryOp.unwrap();
			const savedItems = await InventoryRepository.getItemsByEntityId({
				entityId: userInfo.entity.id,
			});
			for (const item of savedItems) {
				const metadata = (item.metadata ?? {}) as Record<string, string>;
				inventoryEcs.inventoryState.items.set(
					item.slot,
					new ItemState(item.type, item.quantity, metadata),
				);
			}
		}

		this.worldEcs.addEntity(playerEntity);

		// Auto-resume any IN_PROGRESS experiment the user had from a previous session
		try {
			const manager = this.worldEcs
				.get(ExperimentManagerEcs)
				.unwrap('ExperimentManagerEcs not found');

			if (!manager.hasActiveRuntime(payload.id)) {
				const inProgress =
					await ExperimentService.getInProgressExperimentForUser(payload.id);
				if (inProgress) {
					console.log(
						`[MainRoom] Auto-resuming experiment '${inProgress.experimentKey}' for ${payload.id}`,
					);
					manager.startExperiment(
						{
							userId: payload.id,
							username: payload.username,
							role: payload.role,
						},
						userInfo.agent.identifier,
						inProgress.experimentKey,
					);
				}
			}
		} catch (err) {
			console.error(
				'[MainRoom] Failed to auto-resume experiment for',
				payload.id,
				err,
			);
		}

		if (payload.loginType === LOGIN_TYPE.REDEEM_TOKEN) {
			this.scheduleExpulsion(client, payload);
		}
	}

	async onLeave(client: Client<any, any>, _consented?: boolean): Promise<any> {
		this.clearExpulsionTimer(client.sessionId);

		const payload = client.userData?.payload as AuthPayload | undefined;
		const userInfo = client.userData?.userInfo as
			| Awaited<ReturnType<typeof ProfileService.getUserInfo>>
			| undefined;

		if (!userInfo || !payload) return;

		const entityOp = this.worldEcs.getEntity(userInfo.agent.identifier);

		if (entityOp.isNone()) return;

		const entity = entityOp.unwrap();

		const characterBodyOp = entity.get(CharacterBodyServerEcs);

		if (characterBodyOp.isNone()) return;

		const characterBody = characterBodyOp.unwrap();

		const position = characterBody.body.translation();

		await ProfileService.saveUserInfo({
			identifier: userInfo.agent.identifier,
			agentData: {
				positionX: position.x,
				positionY: position.y,
				positionZ: position.z,
				metadata: {},
			},
			entityData: {
				life: characterBody.characterState.life,
				saturation: 100,
			},
		});

		const inventoryOp = entity.get(InventoryServerEcs);
		if (inventoryOp.isSome()) {
			const inventoryEcs = inventoryOp.unwrap();
			const items = Array.from(inventoryEcs.inventoryState.items.entries()).map(
				([slot, item]) => {
					const metadata: Record<string, string> = {};
					item.metadata.forEach((value, key) => {
						metadata[key] = value;
					});
					return { slot, type: item.type, quantity: item.quantity, metadata };
				},
			);

			await InventoryRepository.saveInventory({
				entityId: userInfo.entity.id,
				items,
			});
		}

		const manager = this.worldEcs
			.get(ExperimentManagerEcs)
			.unwrap('ExperimentManagerEcs not found');

		manager.onPlayerLeave(payload.id);

		this.worldEcs.deleteEntityById(userInfo.agent.identifier);
	}

	onUncaughtException(error: RoomException<this>, methodName: string): void {
		console.error(`${methodName} ${error.name}`, error);
	}

	private scheduleExpulsion(client: Client, payload: AuthPayload): void {
		const validUntil = new Date(payload.validUntil).getTime();
		const now = Date.now();
		const timeRemaining = validUntil - now;

		if (timeRemaining <= 0) {
			client.leave(4001);
			return;
		}

		const timer = setTimeout(() => {
			this.expulsionTimers.delete(client.sessionId);
			client.leave(4001);
		}, timeRemaining);

		this.expulsionTimers.set(client.sessionId, timer);
	}

	private clearExpulsionTimer(sessionId: string): void {
		const timer = this.expulsionTimers.get(sessionId);
		if (timer) {
			clearTimeout(timer);
			this.expulsionTimers.delete(sessionId);
		}
	}
}
