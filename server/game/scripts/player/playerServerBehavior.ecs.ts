import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import type { IVec2 } from '#/utils/math.util';
import type { PlayerState } from '#/state/player.state';

import { ServerDataEcs } from '../serverData.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { NPCContextEcs } from '../ai/npc-context.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import * as MissionService from '$/services/mission.service';
import {
	notifyNpcs,
	notifyEntity,
	notifyEntityById,
} from '../missions/mission-action.handler';

const sessionSchema = z
	.object({
		id: z.string(),
	})
	.loose();

const dbSchema = z
	.object({
		id: z.string(),
	})
	.loose();

export class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;

	public character: CharacterBodyServerEcs = null!;
	public movement: MovementServerEcs = null!;
	public serverData: ServerDataEcs = null!;
	public inventory: InventoryServerEcs = null!;
	public record: RecordEcs = null!;

	constructor({ state }: { state: PlayerState }) {
		super();

		this.state = state;

		this.onClientState = this.onClientState.bind(this);
		this.onClientActions = this.onClientActions.bind(this);
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const gameState = this.serverData.state;

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		this.record = parent.get(RecordEcs).unwrap('RecordEcs not found');

		this.record
			.getRecord('session')
			.ifSome(sessionSchema.parse)
			.unwrap('Session record not found');

		this.inventory = parent
			.get(InventoryServerEcs)
			.unwrap('InventoryServerEcs not found');

		gameState.players.set(parent.name, this.state);

		this.callOnDelete(() => {
			gameState.players.delete(parent.name);
		});

		this.movement = parent
			.get(MovementServerEcs)
			.unwrap('MovementServerEcs not found');

		this.movement.movementState = this.state.movement;

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');
	}

	onLoop(_delta: number): void {
		const session =
			this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');

		this.world.stacker
			.one(`client:${session.id}:action`)
			.ifSome(this.onClientActions);

		this.world.stacker
			.one(`client:${session.id}:state`)
			.ifSome(this.onClientState);
	}

	onClientActions(message: unknown) {
		if (typeof message !== 'object' || message == null || !('type' in message))
			return;

		switch (message.type) {
			case 'jump':
				this.movement.movementState.isJumping = true;
				break;
			case 'pick': {
				console.log('PICK ACTION', message);

				const itemId =
					((message as any)?.itemParent as string | undefined) ?? '';

				const newId = this.inventory.getAvailableSlot();

				console.log('PICK ACTION', { itemId, newId });

				if (itemId && newId != null) {
					this.inventory.pickItemEntity(itemId, newId);
				}
				break;
			}
			case 'attack': {
				console.log('ATTACK ACTION', message);

				// Get Offset Position
				this.character.attack();

				break;
			}
			case 'drop': {
				console.log('DROP ACTION', message);

				const slot = ((message as any)?.itemId as number | undefined) ?? null;

				if (slot != null) {
					this.inventory.dropItem(slot);
				}

				break;
			}
			case 'message':
				// TODO:
				if ('message' in message && typeof message.message === 'string') {
					this.serverData.room.broadcast('agent:message', {
						id: this.parent,
						message: message.message,
					});

					this.world
						.getEntityLike({ context: NPCContextEcs, event: NPCEventQueueEcs })
						.forEach(({ entity: _, components: { context, event } }) => {
							context.lastMessages.addMessage(
								message.message as string,
								this.parent ?? 'Unknown',
							);

							event.pushEvent(
								`${this.parent} says something.`,
								{
									from: this.parent,
									message: message.message,
								},
								10,
							);
						});
				}
				break;
			case 'create-mission': {
				const createMsg = message as unknown as {
					title: string;
					description: string;
					reward?: string;
				};
				const dbCreate =
					this.record.getUnsafeRecord<z.infer<typeof dbSchema>>('db');
				const sessionCreate =
					this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');
				MissionService.createMission({
					creatorId: dbCreate.id,
					creatorType: 'USER',
					payload: {
						title: createMsg.title,
						description: createMsg.description,
						reward: createMsg.reward ?? null,
					},
				})
					.then((mission) => {
						this.serverData.room.broadcast('mission:created', {
							mission,
							creatorName: this.parent,
						});
						notifyNpcs(
							this.world,
							`${this.parent} created a new mission: "${mission.title}".`,
							{
								type: 'mission:created',
								missionId: mission.id,
								creatorName: this.parent ?? 'Unknown',
							},
						);
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionCreate.id,
						);
						client?.send('mission:result', {
							success: true,
							event: 'mission:created',
							data: mission,
						});
					})
					.catch((err) => {
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionCreate.id,
						);
						client?.send('mission:result', {
							success: false,
							error:
								err instanceof Error ? err.message : 'Failed to create mission',
						});
					});
				break;
			}
			case 'accept-mission': {
				const acceptMsg = message as unknown as { missionId: string };
				const dbAccept =
					this.record.getUnsafeRecord<z.infer<typeof dbSchema>>('db');
				const sessionAccept =
					this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');
				MissionService.acceptMission({
					missionId: acceptMsg.missionId,
					acceptorId: dbAccept.id,
					acceptorType: 'USER',
				})
					.then(async (acceptance) => {
						const mission = await MissionService.getMission(
							acceptMsg.missionId,
						);
						this.serverData.room.broadcast('mission:accepted', {
							missionId: acceptMsg.missionId,
							missionTitle: mission.title,
							acceptorName: this.parent,
							acceptorType: 'USER',
						});
						notifyEntity(
							this.serverData.room,
							this.world,
							mission.creatorId,
							mission.creatorType,
							{
								type: 'mission:accepted',
								missionId: acceptMsg.missionId,
								missionTitle: mission.title,
								acceptorName: this.parent ?? 'Unknown',
							},
						);
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionAccept.id,
						);
						client?.send('mission:result', {
							success: true,
							event: 'mission:accepted',
							data: acceptance,
						});
					})
					.catch((err) => {
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionAccept.id,
						);
						client?.send('mission:result', {
							success: false,
							error:
								err instanceof Error ? err.message : 'Failed to accept mission',
						});
					});
				break;
			}
			case 'complete-mission': {
				const completeMsg = message as unknown as {
					missionId: string;
					acceptorId: string;
				};
				const dbComplete =
					this.record.getUnsafeRecord<z.infer<typeof dbSchema>>('db');
				const sessionComplete =
					this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');
				MissionService.completeMission({
					missionId: completeMsg.missionId,
					acceptorId: completeMsg.acceptorId,
					creatorId: dbComplete.id,
					creatorType: 'USER',
				})
					.then((mission) => {
						this.serverData.room.broadcast('mission:completed', {
							mission,
							acceptorId: completeMsg.acceptorId,
							validatorName: this.parent,
						});
						notifyEntityById(
							this.serverData.room,
							this.world,
							completeMsg.acceptorId,
							{
								type: 'mission:completed',
								missionId: completeMsg.missionId,
								missionTitle: mission.title,
								validatorName: this.parent ?? 'Unknown',
							},
						);
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionComplete.id,
						);
						client?.send('mission:result', {
							success: true,
							event: 'mission:completed',
							data: mission,
						});
					})
					.catch((err) => {
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionComplete.id,
						);
						client?.send('mission:result', {
							success: false,
							error:
								err instanceof Error
									? err.message
									: 'Failed to complete mission',
						});
					});
				break;
			}
			case 'abandon-mission': {
				const abandonMsg = message as unknown as { missionId: string };
				const dbAbandon =
					this.record.getUnsafeRecord<z.infer<typeof dbSchema>>('db');
				const sessionAbandon =
					this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');
				MissionService.abandonMission({
					missionId: abandonMsg.missionId,
					acceptorId: dbAbandon.id,
					acceptorType: 'USER',
				})
					.then(async (acceptance) => {
						const mission = await MissionService.getMission(
							abandonMsg.missionId,
						);
						notifyEntity(
							this.serverData.room,
							this.world,
							mission.creatorId,
							mission.creatorType,
							{
								type: 'mission:abandoned',
								missionId: abandonMsg.missionId,
								missionTitle: mission.title,
								abandonerName: this.parent ?? 'Unknown',
							},
						);
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionAbandon.id,
						);
						client?.send('mission:result', {
							success: true,
							event: 'mission:abandoned',
							data: acceptance,
						});
					})
					.catch((err) => {
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionAbandon.id,
						);
						client?.send('mission:result', {
							success: false,
							error:
								err instanceof Error
									? err.message
									: 'Failed to abandon mission',
						});
					});
				break;
			}
			case 'cancel-mission': {
				const cancelMsg = message as unknown as { missionId: string };
				const dbCancel =
					this.record.getUnsafeRecord<z.infer<typeof dbSchema>>('db');
				const sessionCancel =
					this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');
				MissionService.cancelMission({
					missionId: cancelMsg.missionId,
					creatorId: dbCancel.id,
					creatorType: 'USER',
				})
					.then((mission) => {
						this.serverData.room.broadcast('mission:cancelled', {
							mission,
							creatorName: this.parent,
						});
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionCancel.id,
						);
						client?.send('mission:result', {
							success: true,
							event: 'mission:cancelled',
							data: mission,
						});
					})
					.catch((err) => {
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionCancel.id,
						);
						client?.send('mission:result', {
							success: false,
							error:
								err instanceof Error ? err.message : 'Failed to cancel mission',
						});
					});
				break;
			}
		}
	}

	onClientState(message: unknown) {
		if (typeof message !== 'object' || message == null) return;

		if (
			'isMoving' in message &&
			message.isMoving != null &&
			typeof message.isMoving === 'boolean'
		) {
			this.movement.movementState.isMoving = message.isMoving;
		}

		if (
			'direction' in message &&
			message.direction != null &&
			typeof message.direction === 'number'
		) {
			const angle = message.direction;
			const direction: IVec2 = {
				x: Math.cos(angle),
				y: -Math.sin(angle),
			};
			this.movement.clientDirection = direction;
			this.state.character.rotationY = angle;
		}
	}
}
