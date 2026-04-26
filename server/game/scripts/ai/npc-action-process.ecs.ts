import { ComponentEcs, type EntityEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { Option } from '#/utils/Option';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { NPCContextEcs } from './npc-context.ecs';
import { NPCEventQueueEcs } from './npc-event-queue.ecs';

import * as ExperimentRepository from '$/db/experiment.db';
import * as LLMService from '$/services/llm.service';
import * as LTMRepository from '$/db/ltm.db';
import * as MissionService from '$/services/mission.service';
import {
	notifyEntity,
	notifyEntityById,
	consumeRewardFromInventory,
	giveRewardToAgent,
} from '../missions/mission-action.handler';
import { StopMovementOption } from '../entity/follow-path/stop-movement.class';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { FollowPositionOption } from '../entity/follow-path/follow-position.class';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';

export class NPCActionProcessEcs extends ComponentEcs {
	private static readonly CLOSE_TO_ENTITY_DISTANCE = 1.5;
	private static readonly ATTACK_RANGE = 2;
	private attackUntilResolvedTimers = new Set<ReturnType<typeof setTimeout>>();

	private pushNpcEvent(
		message: string,
		data: Record<string, unknown>,
		weight = 10,
	): void {
		this.npcContextEcs.eventQueue.pushEvent(message, data, weight);
	}

	serverData: ServerDataEcs = null!;

	npcContextEcs: NPCContextEcs = null!;

	entityParent: EntityEcs = null!;

	onStart(): void {
		const parent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found for NPCActionProcessEcs');

		this.npcContextEcs = parent
			.get(NPCContextEcs)
			.unwrap('NPCContextEcs not found on parent entity');

		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.entityParent = parent;

		this.callOnDelete(() => {
			for (const timer of this.attackUntilResolvedTimers) {
				clearTimeout(timer);
			}
			this.attackUntilResolvedTimers.clear();
		});
	}

	private scheduleAttackUntilResolvedAttempt(
		attempt: () => void,
		delayMs: number,
	): void {
		const timer = setTimeout(() => {
			this.attackUntilResolvedTimers.delete(timer);
			attempt();
		}, delayMs);

		this.attackUntilResolvedTimers.add(timer);
	}

	private isTargetResolved(entityId: string):
		| { resolved: true; outcome: 'gone' | 'dead' }
		| { resolved: false } {
		const target = this.world.getEntity(entityId).raw();
		if (!target) {
			return { resolved: true, outcome: 'gone' };
		}

		const body = target.get(CharacterBodyServerEcs).raw();
		if (body?.isDead) {
			return { resolved: true, outcome: 'dead' };
		}

		return { resolved: false };
	}

	private attackTargetEntity(entityId: string): boolean {
		return Option.zip({
			self: this.entityParent.get(CharacterBodyServerEcs),
			target: this.world
				.getEntity(entityId)
				.map((e) => e.get(CharacterBodyServerEcs))
				.collapse(),
		})
			.map(({ self, target }) => {
				const myPos = self.body.translation();
				const targetPos = target.body.translation();
				const dx = targetPos.x - myPos.x;
				const dz = targetPos.z - myPos.z;
				self.characterState.rotationY = -Math.atan2(dz, dx);
				self.attack(entityId);
				return true;
			})
			.orElse(false);
	}

	private runAttackUntilResolved(props: {
		entityId: string;
		remainingAttacks: number;
		retryDelayMs: number;
		maxAttacks: number;
	}): void {
		const resolved = this.isTargetResolved(props.entityId);
		if (resolved.resolved) {
			this.pushNpcEvent(
				`Se resolvió ${props.entityId}.`,
				{
					type: 'attack:resolved',
					entityId: props.entityId,
					outcome: resolved.outcome,
					attemptsUsed: props.maxAttacks - props.remainingAttacks,
				},
			);
			return;
		}

		if (props.remainingAttacks <= 0) {
			this.pushNpcEvent(
				`No se logró acabar con ${props.entityId}.`,
				{
					type: 'attack:failed',
					entityId: props.entityId,
					reason: 'max-attacks-reached',
					attemptsUsed: props.maxAttacks,
				},
			);
			return;
		}

		const self = this.entityParent.get(CharacterBodyServerEcs).raw();
		const targetEntity = this.world.getEntity(props.entityId).raw();
		const targetBody = targetEntity?.get(CharacterBodyServerEcs).raw();

		if (!self || !targetEntity || !targetBody) {
			this.pushNpcEvent(
				`No se pudo atacar a ${props.entityId}.`,
				{
					type: 'attack:failed',
					entityId: props.entityId,
					reason: 'target-unavailable',
				},
			);
			return;
		}

		const myPos = self.body.translation();
		const targetPos = targetBody.body.translation();
		const distance = Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z);

		if (distance > NPCActionProcessEcs.ATTACK_RANGE) {
			Option.zip({
				target: this.world.getEntity(props.entityId),
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.world.get(WorldPathfinderEcs),
			}).ifSome((zipped) => {
				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
					stoppingDistance: NPCActionProcessEcs.CLOSE_TO_ENTITY_DISTANCE,
					onComplete: () => {
						this.scheduleAttackUntilResolvedAttempt(
							() => this.runAttackUntilResolved(props),
							props.retryDelayMs,
						);
					},
					onFail: () => {
						this.pushNpcEvent(
							`No se pudo llegar hasta ${props.entityId} para atacarlo.`,
							{
								type: 'attack:failed',
								entityId: props.entityId,
								reason: 'unreachable',
							},
						);
					},
				});
			});
			return;
		}

		if (!this.attackTargetEntity(props.entityId)) {
			this.pushNpcEvent(
				`No se pudo atacar a ${props.entityId}.`,
				{
					type: 'attack:failed',
					entityId: props.entityId,
					reason: 'attack-unavailable',
				},
			);
			return;
		}

		this.scheduleAttackUntilResolvedAttempt(
			() =>
				this.runAttackUntilResolved({
					...props,
					remainingAttacks: props.remainingAttacks - 1,
				}),
			props.retryDelayMs,
		);
	}

	onLoop(_delta: number): void {
		if (this.npcContextEcs.actions.length === 0) {
			return;
		}

		const npcId = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(RecordEcs))
			.map((r) =>
				r
					.getRecord<{ id: string }>('db')
					.map((r) => r.id)
					.unsafe(),
			)
			.orElse(crypto.randomUUID());

		console.log('NPC Actions: ', this.npcContextEcs.actions);
		console.log(JSON.stringify(this.npcContextEcs.actions, null, 2));
		for (const action of this.npcContextEcs.actions) {
			// console.log('Processing NPC action:', { action });

			if (action.type === 'talk') {
				this.serverData.room.broadcast('agent:message', {
					id: this.parent,
					message: action.content,
				});

				this.world
					.getEntityLike({ context: NPCContextEcs, event: NPCEventQueueEcs })
					.forEach(({ entity, components: { context, event } }) => {
						context.lastMessages.addMessage(
							action.content,
							this.parent ?? 'Unknown',
						);

						event.pushEvent(
							`${this.parent ?? 'Unknown'} says something.`,
							{
								from: this.parent,
								message: action.content,
							},
							this.parent === entity.name ? 0 : 10,
						);
					});

				ExperimentRepository.saveExperimentHallucinationResults({
					npcId: npcId,
					relatedInfoInMemory: [
						this.npcContextEcs.shortMemory.toStringContext(),
						this.npcContextEcs.longMemory.toStringContext(),
					].join('\n'),
					message: this.npcContextEcs.lastMessages.toStringContext(),
				});
			}

			if (action.type === 'think') {
				this.serverData.room.broadcast('agent:thought', {
					id: this.parent,
					message: action.content,
				});

				this.npcContextEcs.eventQueue.pushEvent(
					`I thought: "${action.content}"`,
					{ from: this.parent, message: action.content },
					0,
				);
			}

		if (action.type === 'attack') {
			this.entityParent.get(CharacterBodyServerEcs).ifSome((character) => {
				character.attack(action.entityId);
			});
		}

		if (action.type === 'attack-entity') {
			Option.zip({
				self: this.entityParent.get(CharacterBodyServerEcs),
				target: this.world
					.getEntity(action.entityId)
					.map((e) => e.get(CharacterBodyServerEcs))
					.collapse(),
			}).ifSome(({ self, target }) => {
				const myPos = self.body.translation();
				const targetPos = target.body.translation();
				const dx = targetPos.x - myPos.x;
				const dz = targetPos.z - myPos.z;
				self.characterState.rotationY = -Math.atan2(dz, dx);
				self.attack(action.entityId);
			});
		}

		if (action.type === 'attack-until-resolved') {
			this.runAttackUntilResolved({
				entityId: action.entityId,
				remainingAttacks: action.maxAttacks,
				retryDelayMs: Math.round(action.retryDelaySec * 1000),
				maxAttacks: action.maxAttacks,
			});
		}

		if (action.type === 'look-at-position') {
			this.entityParent.get(CharacterBodyServerEcs).ifSome((character) => {
				const myPos = character.body.translation();
				const dx = action.x - myPos.x;
				const dz = action.z - myPos.z;
				character.characterState.rotationY = -Math.atan2(dz, dx);
			});
		}

		if (action.type === 'look-at-entity') {
			Option.zip({
				self: this.entityParent.get(CharacterBodyServerEcs),
				target: this.world
					.getEntity(action.entityId)
					.map((e) => e.get(CharacterBodyServerEcs))
					.collapse(),
			}).ifSome(({ self, target }) => {
				const myPos = self.body.translation();
				const targetPos = target.body.translation();
				const dx = targetPos.x - myPos.x;
				const dz = targetPos.z - myPos.z;
				self.characterState.rotationY = -Math.atan2(dz, dx);
			});
		}

			if (action.type === 'set-short-memory') {
				this.npcContextEcs.shortMemory.addMemory(action.value);
			}

			if (action.type === 'remove-short-memory') {
				this.npcContextEcs.shortMemory.deleteMemory(action.key);
			}

		if (action.type === 'move-follow-entity') {
			Option.zip({
				target: this.world.getEntity(action.entityId),
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.world.get(WorldPathfinderEcs),
			}).ifSome((zipped) => {
				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
				});
			});
		}

		if (action.type === 'move-close-to-entity') {
			const target = this.world.getEntity(action.entityId);
			if (target.isNone()) {
				this.pushNpcEvent(
					`No se pudo llegar hasta ${action.entityId}.`,
					{ type: 'movement:failed-close', entityId: action.entityId },
				);
				continue;
			}

			Option.zip({
				target,
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.world.get(WorldPathfinderEcs),
			}).ifSome((zipped) => {
				const onComplete = () => {
					this.pushNpcEvent(
						`Te acercaste a ${zipped.target.name}.`,
						{
							type: 'movement:arrived-close',
							entityId: zipped.target.name,
						},
					);
				};

				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
					stoppingDistance: NPCActionProcessEcs.CLOSE_TO_ENTITY_DISTANCE,
					onComplete,
					onFail: () => {
						this.pushNpcEvent(
							`No se pudo llegar hasta ${action.entityId}.`,
							{ type: 'movement:failed-close', entityId: action.entityId },
						);
					},
				});
			});
		}

		if (action.type === 'move-away-from-entity') {
			const target = this.world.getEntity(action.entityId);
			if (target.isNone()) {
				this.pushNpcEvent(
					`No se pudo huir de ${action.entityId}.`,
					{ type: 'movement:failed-away', entityId: action.entityId },
				);
				continue;
			}

			Option.zip({
				target,
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.world.get(WorldPathfinderEcs),
			}).ifSome((zipped) => {
				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
					stoppingDistance: action.distance,
					flee: true,
					onComplete: () => {
						this.pushNpcEvent(
							`Ya te alejaste lo suficiente de ${zipped.target.name}.`,
							{ type: 'movement:arrived-away', entityId: zipped.target.name },
						);
					},
					onFail: () => {
						this.pushNpcEvent(
							`No se pudo huir de ${action.entityId}.`,
							{ type: 'movement:failed-away', entityId: action.entityId },
						);
					},
				});
			});
		}

			if (action.type === 'move-to-point') {
				this.world
					.getEntity(this.parent)
					.map((entity) => entity.getUnsafe(FollowPathEcs))
					.ifSome((f) => {
						f.option = new FollowPositionOption({
							pathfinder: this.world.getUnsafe(WorldPathfinderEcs),
							followPath: f,
							position: { x: action.x, z: action.z },
							entity: this.entityParent,
							onComplete: () => {
								this.pushNpcEvent(
									'Ya llegaste al punto solicitado.',
									{ type: 'movement:arrived-point', x: action.x, z: action.z },
								);
							},
							onFail: () => {
								this.pushNpcEvent(
									'No se pudo llegar al punto solicitado.',
									{ type: 'movement:failed-point', x: action.x, z: action.z },
								);
							},
						});
					});
			}

			if (action.type === 'move-stop') {
				this.world
					.getEntity(this.parent)
					.map((entity) => entity.getUnsafe(FollowPathEcs))
					.ifSome((f) => {
						f.option = new StopMovementOption();
					});
			}

			if (action.type === 'jump') {
				this.world
					.getEntity(this.parent)
					.map((entity) => entity.getUnsafe(MovementServerEcs))
					.ifSome((movement) => {
						movement.movementState.isJumping = true;
					});
			}

			if (action.type === 'set-mood') {
				this.entityParent.get(RecordEcs).ifSome((r) => {
					const moodRecord = r.getUnsafeRecordOrDefault<{
						[key: string]: number;
					}>('mood');
					moodRecord[action.mood] = action.value;
				});
			}

			if (action.type === 'remove-mood') {
				this.entityParent.get(RecordEcs).ifSome((r) => {
					const moodRecord = r.getUnsafeRecordOrDefault<{
						[key: string]: number;
					}>('mood');
					delete moodRecord[action.mood];
				});
			}

			if (action.type === 'retrieve-long-term-memory') {
				LLMService.embed([action.value])
					.then((embeddings) =>
						LTMRepository.retrieveLongTermMemory({
							npcIdentifier: this.entityParent.name,
							queryEmbedding: embeddings[0],
							limit: action.limit,
							importance: action.importance,
						}),
					)
					.then((ltms) => {
						this.npcContextEcs.longMemory.loadLongTermMemories(ltms);
					})
					.catch((err) => {
						console.error('Failed to retrieve long-term memory:', err);
					});
			}

			if (action.type === 'pick-item') {
				this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
					const slot = inventory.getAvailableSlot();

					if (slot == null) {
						return;
					}

					inventory.pickItemEntity(action.itemId, slot);
				});
			}

			if (action.type === 'drop-item') {
				this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
					inventory.dropItem(action.slot);
				});
			}

			if (action.type === 'move-item') {
				this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
					inventory.moveItem(action.fromSlot, action.toSlot);
				});
			}

			if (action.type === 'split-item') {
				this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
					inventory.splitItem(action.fromSlot, action.toSlot, action.quantity);
				});
			}

			if (action.type === 'consume-item') {
				this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
					const result = inventory.consumeItem(action.slot);
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
				});
			}

			// Mission actions
			if (action.type === 'create-mission') {
				const parsedRewardQty = action.rewardItemQty
					? Number(action.rewardItemQty)
					: null;

				if (action.rewardItemType && parsedRewardQty && parsedRewardQty > 0) {
					const inventory = this.entityParent.getUnsafe(InventoryServerEcs);
					if (inventory) {
						const consumed = consumeRewardFromInventory(
							inventory,
							action.rewardItemType,
							parsedRewardQty,
						);
						if (!consumed) {
							console.error(
								'NPC does not have the required item for mission reward',
							);
							return;
						}
					}
				}

				MissionService.createMission({
					creatorId: npcId,
					creatorType: 'NPC',
					payload: {
						title: action.title,
						description: action.description,
						rewardItemType: action.rewardItemType ?? null,
						rewardItemQty: parsedRewardQty,
					},
				})
					.then((mission) => {
						this.npcContextEcs.missionsContext.addCreatedMission(mission);
						this.serverData.room.broadcast('mission:created', {
							mission,
							creatorName: this.parent,
						});
						console.log('NPC created mission:', mission.title);
					})
					.catch((err) => {
						console.error('Failed to create mission:', err);
					});
			}

			if (action.type === 'accept-mission') {
				MissionService.acceptMission({
					missionId: action.missionId,
					acceptorId: npcId,
					acceptorType: 'NPC',
				})
					.then(async (acceptance) => {
						const mission = this.npcContextEcs.missionsContext.getMissionById(
							action.missionId,
						);
						if (mission) {
							this.npcContextEcs.missionsContext.addAcceptedMission({
								...mission,
								acceptances: [acceptance],
							});
						}
						const fullMission = await MissionService.getMission(
							action.missionId,
						);
						this.serverData.room.broadcast('mission:accepted', {
							missionId: action.missionId,
							missionTitle: fullMission.title,
							acceptorName: this.parent,
							acceptorType: 'NPC',
						});
						notifyEntity(
							this.serverData.room,
							this.world,
							fullMission.creatorId,
							fullMission.creatorType,
							{
								type: 'mission:accepted',
								missionId: action.missionId,
								missionTitle: fullMission.title,
								acceptorName: this.parent ?? 'Unknown',
							},
						);
						console.log('NPC accepted mission:', action.missionId);
					})
					.catch((err) => {
						console.error('Failed to accept mission:', err);
					});
			}

			if (action.type === 'complete-mission') {
				MissionService.completeMission({
					missionId: action.missionId,
					acceptorId: action.acceptorId,
					creatorId: npcId,
					creatorType: 'NPC',
				})
					.then((mission) => {
						giveRewardToAgent(this.world, action.acceptorId, mission);
						this.npcContextEcs.missionsContext.removeMission(action.missionId);
						this.serverData.room.broadcast('mission:completed', {
							mission,
							acceptorId: action.acceptorId,
							validatorName: this.parent,
						});
						notifyEntityById(
							this.serverData.room,
							this.world,
							action.acceptorId,
							{
								type: 'mission:completed',
								missionId: action.missionId,
								missionTitle: mission.title,
								validatorName: this.parent ?? 'Unknown',
							},
						);
						console.log('NPC completed mission:', mission.title);
					})
					.catch((err) => {
						console.error('Failed to complete mission:', err);
					});
			}

			if (action.type === 'abandon-mission') {
				MissionService.abandonMission({
					missionId: action.missionId,
					acceptorId: npcId,
					acceptorType: 'NPC',
				})
					.then(async () => {
						this.npcContextEcs.missionsContext.removeMission(action.missionId);
						const mission = await MissionService.getMission(action.missionId);
						notifyEntity(
							this.serverData.room,
							this.world,
							mission.creatorId,
							mission.creatorType,
							{
								type: 'mission:abandoned',
								missionId: action.missionId,
								missionTitle: mission.title,
								abandonerName: this.parent ?? 'Unknown',
							},
						);
						console.log('NPC abandoned mission:', action.missionId);
					})
					.catch((err) => {
						console.error('Failed to abandon mission:', err);
					});
			}

			if (action.type === '@request-acting-again') {
				setTimeout(() => {
					this.npcContextEcs.eventQueue.pushEvent(
						'Requesting to act again.',
						{},
						10,
					);
				}, action.time * 1000);
			}
		}
		this.npcContextEcs.actions = [];
	}
}
