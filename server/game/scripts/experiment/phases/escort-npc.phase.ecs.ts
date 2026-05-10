import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { triggerZoneServerFactory } from '../../../prefab/trigger-zone.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { ServerDataEcs } from '../../serverData.ecs';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import { MapLoaderEcs } from '../../world/map-loader.ecs';
import { DynamicPathfinder } from '../../world/dynamic-pathfinder';
import { ClassicNPCBehaviorStateEcs } from '../../classic-npc/classic-npc-behavior-state.ecs';
import { escortLabyrinthMap } from '#/maps/maps';
import type { DialogueConfig } from '../../classic-npc/dialogue/dialogue.types';
import * as RAPIER from '@dimforge/rapier3d-compat';

const NPC_IDENTIFIER = 'escort-npc';
const NPC_SKIN = 'kanye';
const LABYRINTH_MAP_KEY = 'escort-labyrinth';
const ESCORT_FLOOR_KEY = 'escort-floor';
const FLOOR_Y = 20;
const FLOOR_SIZE = 30;
const PLAYER_SPAWN_OFFSET = { x: -8, z: -11 };
const NPC_SPAWN_OFFSET = { x: -10, z: -11 };
const TRIGGER_OFFSET = { x: 11, z: 11 };

export class EscortNpcPhaseEcs extends ExperimentPhaseEcs {
	private npcName: string | null = null;
	private triggerName: string | null = null;
	private labyrinthPathfinder: DynamicPathfinder | null = null;
	private floorBodyHandle: number | null = null;
	private returnSlotPos: { x: number; y: number; z: number } | null = null;
	private rockInstanceIds: string[] = [];
	private resolved = false;

	protected onMountPhase(): void {
		this.resolved = false;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		if (!slotPos) return;

		this.returnSlotPos = { x: slotPos.x, y: slotPos.y, z: slotPos.z };

		const labyrinthPos = { x: slotPos.x, y: FLOOR_Y, z: slotPos.z };

		this.createFloor(labyrinthPos, serverData);
		this.teleportPlayer(labyrinthPos);
		this.loadLabyrinth(labyrinthPos);
		this.spawnNpc(userId, labyrinthPos, serverData.room);
		this.spawnTriggerZone(labyrinthPos);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus || !this.triggerName || !this.npcName) return;

		this.onEvent<{ triggerName: string }>(bus, WorldEventType.EntityEnterTrigger, this.npcName, (payload) => {
			if (payload.triggerName === this.triggerName) {
				this.handlePhaseSuccess();
			}
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.runtime.entityName, () => {
			this.handlePhaseFailure('Has muerto durante la escolta.');
		});

		if (this.npcName) {
			this.onEvent(bus, WorldEventType.EntityDeath, this.npcName, () => {
				this.handlePhaseFailure('El NPC ha muerto.');
			});
		}
	}

	protected onUnmountPhase(): void {
		this.unloadLabyrinth();

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		if (this.triggerName) {
			this.world.getEntity(this.triggerName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.triggerName = null;
		}

		this.removeFloor();

		if (this.returnSlotPos) {
			this.world.getEntity(this.runtime.entityName).ifSome((entity) => {
				entity.get(CharacterBodyServerEcs).ifSome((body) => {
					body.setRespawnPoint(this.returnSlotPos!);
					body.respawn();
				});
			});
			this.returnSlotPos = null;
		}
	}

	private teleportPlayer(labyrinthPos: { x: number; y: number; z: number }): void {
		const playerPos = {
			x: labyrinthPos.x + PLAYER_SPAWN_OFFSET.x,
			y: labyrinthPos.y + 1,
			z: labyrinthPos.z + PLAYER_SPAWN_OFFSET.z,
		};

		this.world.getEntity(this.runtime.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(playerPos, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(playerPos);
			});
		});
	}

	private createFloor(pos: { x: number; y: number; z: number }, serverData: { worldPhysic: import('@dimforge/rapier3d-compat').World; room: import('colyseus').Room }): void {
		const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
		const body = serverData.worldPhysic.createRigidBody(bodyDesc);
		serverData.worldPhysic.createCollider(
			RAPIER.ColliderDesc.cuboid(FLOOR_SIZE / 2, 0.5, FLOOR_SIZE / 2),
			body,
		);
		this.floorBodyHandle = body.handle;

		serverData.room.broadcast('escort:floor:create', {
			id: ESCORT_FLOOR_KEY,
			x: pos.x,
			y: pos.y,
			z: pos.z,
			width: FLOOR_SIZE,
			depth: FLOOR_SIZE,
		});
	}

	private removeFloor(): void {
		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		if (this.floorBodyHandle !== null) {
			const body = serverData.worldPhysic.getRigidBody(this.floorBodyHandle);
			if (body) {
				serverData.worldPhysic.removeRigidBody(body);
			}
			this.floorBodyHandle = null;
		}

		serverData.room.broadcast('escort:floor:remove', { id: ESCORT_FLOOR_KEY });
	}

	private loadLabyrinth(pos: { x: number; y: number; z: number }): void {
		const loader = this.world.get(MapLoaderEcs).raw();
		if (!loader) return;

		this.labyrinthPathfinder = new DynamicPathfinder(escortLabyrinthMap, pos);
		loader.mountMap(LABYRINTH_MAP_KEY, escortLabyrinthMap, pos, this.labyrinthPathfinder);

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const SOLID_CELL = 1;
		let instanceIndex = 0;

		escortLabyrinthMap.grid.forEach((row, z) => {
			row.forEach((cell, x) => {
				if (cell !== SOLID_CELL) return;

				const name = `map-${LABYRINTH_MAP_KEY}-instance-rock-${instanceIndex++}`;
				const worldX = x + escortLabyrinthMap.offsetX + pos.x + 0.5;
				const worldZ = z + escortLabyrinthMap.offsetY + pos.z + 0.5;

				this.rockInstanceIds.push(name);

				serverData.room.broadcast('experiment:instance:create', {
					id: name,
					type: 'rock',
					x: worldX,
					y: pos.y,
					z: worldZ,
					metadata: {},
				});
			});
		});
	}

	private unloadLabyrinth(): void {
		const loader = this.world.get(MapLoaderEcs).raw();
		if (loader) {
			loader.unmountMap(LABYRINTH_MAP_KEY);
		}

		if (this.rockInstanceIds.length > 0) {
			const serverData = this.world.get(ServerDataEcs).raw();
			if (serverData) {
				for (const id of this.rockInstanceIds) {
					serverData.room.broadcast('experiment:instance:remove', { id });
				}
			}
			this.rockInstanceIds = [];
		}

		if (this.labyrinthPathfinder) {
			this.labyrinthPathfinder.dispose();
			this.labyrinthPathfinder = null;
		}
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(reason: string): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, reason);
		});
	}

	private spawnTriggerZone(pos: { x: number; y: number; z: number }): void {
		const userId = this.runtime.userId;
		const triggerName = `escort-trigger-${userId}`;
		this.triggerName = triggerName;

		const triggerPos = {
			x: pos.x + TRIGGER_OFFSET.x,
			y: pos.y + 1,
			z: pos.z + TRIGGER_OFFSET.z,
		};

		const triggerEntity = triggerZoneServerFactory({
			world: this.world,
			name: triggerName,
			pos: triggerPos,
			radius: 2,
			height: 4,
			color: 0x00ff00,
		});

		this.world.addEntity(triggerEntity);
	}

	private spawnNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;

		const npcPos = {
			x: pos.x + NPC_SPAWN_OFFSET.x,
			y: pos.y + 1,
			z: pos.z + NPC_SPAWN_OFFSET.z,
		};

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			variables: () => ({}),
			conversations: [
				{
					id: 'escort-ask',
					rootStatementId: 's_root',
					reusable: false,
					resumable: false,
					oneShot: true,
					enabled: true,
					onEnd: (ctx) => {
						if (ctx.playerEntityId) {
							this.world.getEntity(npcName).ifSome((entity) => {
								entity.get(ClassicNPCBehaviorStateEcs).ifSome((state) => {
									state.queueAction({
										type: 'move-follow-entity',
										entityId: ctx.playerEntityId,
									});
								});
							});
						}
					},
					statements: {
						s_root: {
							id: 's_root',
							text: '¡Eh, tú! Necesito llegar al otro lado de este laberinto. ¿Me escoltas?',
							options: {
								o_accept: {
									id: 'o_accept',
									text: 'Claro, te acompaño.',
									nextStatementId: 's_accept',
								},
								o_refuse: {
									id: 'o_refuse',
									text: 'Lo siento, no puedo ahora.',
									nextStatementId: 's_refuse',
								},
							},
						},
						s_accept: {
							id: 's_accept',
							text: 'Perfecto. Sígueme, pero ten cuidado con las rocas.',
							options: {
								o_ok: {
									id: 'o_ok',
									text: 'Entendido, vamos.',
									nextStatementId: null,
								},
							},
						},
						s_refuse: {
							id: 's_refuse',
							text: 'Qué lástima... Quizás otro día.',
							options: {
								o_end: {
									id: 'o_end',
									text: 'Lo siento.',
									nextStatementId: null,
								},
							},
						},
					},
				},
			],
		};

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Escolta',
			description: 'Un NPC que necesita ser escoltado a través del laberinto.',
			skin: NPC_SKIN,
			pos: npcPos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.PASSIVE,
				aggroRange: 0,
				attackRange: 0,
				detectionRange: 8,
				attackDurationSec: 0,
				attackCooldownMs: 0,
				fleeHealthPercent: null,
				patrolRadius: 0,
				extraConfig: {},
			},
			dialogueConfig,
			pathfinder: this.labyrinthPathfinder ?? undefined,
			room,
		});

		this.world.addEntity(npcEntity);
	}
}
