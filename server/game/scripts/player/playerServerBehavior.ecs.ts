import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import type { IVec2 } from '#/utils/math.util';
import type { PlayerState } from '#/state/player.state';
import { ITEM_REGISTRY } from '#/state/item-registry';

import { ServerDataEcs } from '../serverData.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { WorldEventBusEcs, WorldEventType } from '../world-event-bus.ecs';
import { NPCContextEcs } from '../ai/npc-context.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import * as MissionService from '$/services/mission.service';
import {
	notifyNpcs,
	notifyEntity,
	notifyEntityById,
	consumeRewardFromInventory,
	giveRewardToAgent,
	returnRewardToCreator,
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
	public eventBus: WorldEventBusEcs = null!;

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

		this.eventBus = this.world
			.get(WorldEventBusEcs)
			.unwrap('WorldEventBusEcs not found');
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

				const entityId =
					'entityId' in message && typeof message.entityId === 'string'
						? message.entityId
						: undefined;

				this.character.attack(entityId, this.getEquippedDamage());

				break;
			}
			case 'drop': {
				const slot = ((message as any)?.itemId as number | undefined) ?? null;

			if (slot != null) {
				this.inventory.dropItem(slot);
			}

				break;
			}
			case 'move-item': {
				const fromSlot = (message as any)?.fromSlot as number | undefined;
				const toSlot = (message as any)?.toSlot as number | undefined;

			if (fromSlot != null && toSlot != null) {
				this.inventory.moveItem(fromSlot, toSlot);
			}

				break;
			}
			case 'split-item': {
				const fromSlot = (message as any)?.fromSlot as number | undefined;
				const toSlot = (message as any)?.toSlot as number | undefined;
				const quantity = (message as any)?.quantity as number | undefined;

			if (fromSlot != null && toSlot != null && quantity != null) {
				this.inventory.splitItem(fromSlot, toSlot, quantity);
			}

				break;
			}
			case 'eat-item': {
				const slot = (message as any)?.slot as number | undefined;

			if (slot != null) {
				const result = this.inventory.consumeItem(slot);
				if (result.success) {
						this.serverData.room.broadcast('agent:consume', {
							id: this.parent,
							itemType: result.itemType,
						});
					} else {
						this.serverData.room.broadcast('agent:consume-error', {
							id: this.parent,
							message: result.message,
						});
					}
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
					rewardItemType?: string;
					rewardItemQty?: string | number;
				};
				const dbCreate =
					this.record.getUnsafeRecord<z.infer<typeof dbSchema>>('db');
				const sessionCreate =
					this.record.getUnsafeRecord<z.infer<typeof sessionSchema>>('session');

				const parsedRewardQty = createMsg.rewardItemQty
					? Number(createMsg.rewardItemQty)
					: null;

				if (
					createMsg.rewardItemType &&
					parsedRewardQty &&
					parsedRewardQty > 0
				) {
					const consumed = consumeRewardFromInventory(
						this.inventory,
						createMsg.rewardItemType,
						parsedRewardQty,
					);
					if (!consumed) {
						const client = this.serverData.room.clients.find(
							(c) => c.sessionId === sessionCreate.id,
						);
						client?.send('mission:result', {
							success: false,
							error: 'No tienes el item requerido en tu inventario',
						});
						break;
					}
				}

				MissionService.createMission({
					creatorId: dbCreate.id,
					creatorType: 'USER',
					payload: {
						title: createMsg.title,
						description: createMsg.description,
						rewardItemType: createMsg.rewardItemType ?? null,
						rewardItemQty: parsedRewardQty,
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
						giveRewardToAgent(this.world, completeMsg.acceptorId, mission);
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
			case 'give-item': {
				const fromSlot = (message as any)?.fromSlot as number | undefined;
				const targetEntityId = (message as any)?.targetEntityId as string | undefined;

				if (fromSlot == null || !targetEntityId) break;

				const targetEntity = this.world.getEntity(targetEntityId).raw();
				if (!targetEntity) break;

				const targetInventory = targetEntity.get(InventoryServerEcs).raw();
				if (!targetInventory) break;

				const giverPos = this.character.body.translation();
				const targetChar = targetEntity.get(CharacterBodyServerEcs).raw();
				if (!targetChar) break;

				const targetPos = targetChar.body.translation();
				const distSq =
					(giverPos.x - targetPos.x) ** 2 +
					(giverPos.y - targetPos.y) ** 2 +
					(giverPos.z - targetPos.z) ** 2;

				if (distSq > 4) break;

				const result = this.inventory.giveItemTo(targetInventory, fromSlot);
				if (!result.success || !result.item) break;

				this.eventBus.emit(WorldEventType.InventoryItemGiven, this.parent ?? '', {
					item: { type: result.item.type, quantity: result.item.quantity },
					targetEntityId,
				});

				this.eventBus.emit(WorldEventType.InventoryItemReceived, targetEntityId, {
					item: { type: result.item.type, quantity: result.item.quantity },
					giverEntityId: this.parent,
				});

				const targetEventQueue = targetEntity.get(NPCEventQueueEcs).raw();
				if (targetEventQueue) {
					targetEventQueue.pushEvent(
						`Received item ${result.item.type} from ${this.parent}.`,
						{ item: { type: result.item.type, quantity: result.item.quantity }, giverEntityId: this.parent },
						2,
					);
				}

				for (const client of this.serverData.room.clients) {
					const identifier = (client.userData?.userInfo as any)?.agent?.identifier as string | undefined;
					if (identifier === targetEntityId) {
						client.send('inventory:item_received', {
							item: { type: result.item.type, quantity: result.item.quantity },
							giverEntityId: this.parent,
						});
						break;
					}
				}

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
						returnRewardToCreator(this.world, mission);
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

	private getEquippedDamage(): number {
		const item = this.inventory.inventoryState.items.get('0');
		const def = item ? ITEM_REGISTRY[item.type] : undefined;
		return CharacterBodyServerEcs.ATTACK_DAMAGE + (def?.damage ?? 0);
	}
}
