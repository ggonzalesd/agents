import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { FollowPathEcs } from '../../entity/follow-path/follow-path.ecs';
import { MovementServerEcs } from '../../entity/MovementServer.ecs';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import { MapLoaderEcs } from '../../world/map-loader.ecs';
import { DynamicPathfinder } from '../../world/dynamic-pathfinder';
import { followCircleMap } from '#/maps/maps';
import { posRealToGrid } from '#/utils/map.utils';
import type { DialogueConfig } from '../../classic-npc/dialogue/dialogue.types';
import * as RAPIER from '@dimforge/rapier3d-compat';

const NPC_IDENTIFIER = 'follow-npc';
const NPC_SKIN = 'kanye';
const MAP_KEY = 'follow-circle';
const FOLLOW_FLOOR_KEY = 'follow-floor';

const FLOOR_Y = 20;
const FLOOR_SIZE = 30;
const PLAYER_SPAWN_OFFSET = { x: -9, z: -9 };

const WAYPOINT_A = { x: 9, z: -10 };
const WAYPOINT_B = { x: -11, z: -10 };
const WAYPOINT_C = { x: -9, z: 11 };
const WAYPOINT_D = { x: 11, z: 11 };
const ROUTE_LAPS = 3;
const MAX_DISTANCE = 6;
const DISTANCE_CHECK_INTERVAL_MS = 200;
const PATH_CHECK_INTERVAL_MS = 500;

export class FollowNpcPhaseEcs extends ExperimentPhaseEcs {
	private npcName: string | null = null;
	private pathfinder: DynamicPathfinder | null = null;
	private distanceCheckInterval: ReturnType<typeof setInterval> | null = null;
	private pathCheckInterval: ReturnType<typeof setInterval> | null = null;
	private floorBodyHandle: number | null = null;
	private rockInstanceIds: string[] = [];
	private returnSlotPos: { x: number; y: number; z: number } | null = null;
	private resolved = false;
	private following = false;

	protected onMountPhase(): void {
		this.resolved = false;
		this.following = false;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		if (!slotPos) return;

		this.returnSlotPos = { x: slotPos.x, y: slotPos.y, z: slotPos.z };

		const basePos = { x: slotPos.x, y: FLOOR_Y, z: slotPos.z };

		this.createFloor(basePos, serverData);
		this.teleportPlayer(basePos);
		this.loadMap(basePos);
		this.spawnNpc(userId, basePos, serverData.room);
	}

	protected onUnmountPhase(): void {
		if (this.distanceCheckInterval !== null) {
			clearInterval(this.distanceCheckInterval);
			this.distanceCheckInterval = null;
		}

		if (this.pathCheckInterval !== null) {
			clearInterval(this.pathCheckInterval);
			this.pathCheckInterval = null;
		}

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData) {
			serverData.room.broadcast('follow:range:remove', {
				npcName: this.npcName,
			});
		}

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		this.unloadMap();
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

	private createFloor(
		pos: { x: number; y: number; z: number },
		serverData: {
			worldPhysic: import('@dimforge/rapier3d-compat').World;
			room: import('colyseus').Room;
		},
	): void {
		const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
			pos.x,
			pos.y,
			pos.z,
		);
		const body = serverData.worldPhysic.createRigidBody(bodyDesc);
		serverData.worldPhysic.createCollider(
			RAPIER.ColliderDesc.cuboid(FLOOR_SIZE / 2, 0.5, FLOOR_SIZE / 2),
			body,
		);
		this.floorBodyHandle = body.handle;

		serverData.room.broadcast('escort:floor:create', {
			id: FOLLOW_FLOOR_KEY,
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

		serverData.room.broadcast('escort:floor:remove', { id: FOLLOW_FLOOR_KEY });
	}

	private loadMap(basePos: { x: number; y: number; z: number }): void {
		const loader = this.world.get(MapLoaderEcs).raw();
		if (!loader) return;

		this.pathfinder = new DynamicPathfinder(followCircleMap, basePos);
		loader.mountMap(MAP_KEY, followCircleMap, basePos, this.pathfinder);

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const SOLID_CELL = 1;
		let instanceIndex = 0;

		followCircleMap.grid.forEach((row, z) => {
			row.forEach((cell, x) => {
				if (cell !== SOLID_CELL) return;

				const name = `map-${MAP_KEY}-instance-rock-${instanceIndex++}`;
				const worldX = x + followCircleMap.offsetX + basePos.x + 0.5;
				const worldZ = z + followCircleMap.offsetY + basePos.z + 0.5;

				this.rockInstanceIds.push(name);

				serverData.room.broadcast('experiment:instance:create', {
					id: name,
					type: 'rock',
					x: worldX,
					y: basePos.y,
					z: worldZ,
					metadata: {},
				});
			});
		});
	}

	private unloadMap(): void {
		const loader = this.world.get(MapLoaderEcs).raw();
		if (loader) {
			loader.unmountMap(MAP_KEY);
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

		if (this.pathfinder) {
			this.pathfinder.dispose();
			this.pathfinder = null;
		}
	}

	private teleportPlayer(basePos: { x: number; y: number; z: number }): void {
		const playerPos = {
			x: basePos.x + PLAYER_SPAWN_OFFSET.x,
			y: basePos.y + 1,
			z: basePos.z + PLAYER_SPAWN_OFFSET.z,
		};

		this.world.getEntity(this.runtime.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(playerPos, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(playerPos);
			});
		});
	}

	private findNearestFreeCell(gridPos: [number, number]): [number, number] {
		if (this.pathfinder?.isWalkable(gridPos[0], gridPos[1])) return gridPos;

		console.log(
			`//[ FOLLOW-NPC ]//: findNearestFreeCell: [${gridPos}] is NOT walkable, searching...`,
		);

		for (let radius = 1; radius <= 10; radius++) {
			for (let dx = -radius; dx <= radius; dx++) {
				for (let dy = -radius; dy <= radius; dy++) {
					if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
					const nx = gridPos[0] + dx;
					const ny = gridPos[1] + dy;
					if (this.pathfinder?.isWalkable(nx, ny)) {
						console.log(
							`//[ FOLLOW-NPC ]//: findNearestFreeCell: found [${nx}, ${ny}] at radius ${radius}`,
						);
						return [nx, ny];
					}
				}
			}
		}
		console.log(
			`//[ FOLLOW-NPC ]//: findNearestFreeCell: NO walkable cell found within radius 10, returning original [${gridPos}]`,
		);
		return gridPos;
	}

	private async computeFixedRoute(basePos: {
		x: number;
		z: number;
	}): Promise<[number, number][]> {
		if (!this.pathfinder) {
			console.log(`//[ FOLLOW-NPC ]//: computeFixedRoute: pathfinder is null`);
			return [];
		}

		const map = this.pathfinder.map;
		console.log(
			`//[ FOLLOW-NPC ]//: map.offsetX=${map.offsetX}, map.offsetY=${map.offsetY}, scale=${map.scale}`,
		);
		console.log(`//[ FOLLOW-NPC ]//: basePos=(${basePos.x}, ${basePos.z})`);

		const worldA = { x: basePos.x + WAYPOINT_A.x, z: basePos.z + WAYPOINT_A.z };
		const worldB = { x: basePos.x + WAYPOINT_B.x, z: basePos.z + WAYPOINT_B.z };
		const worldC = { x: basePos.x + WAYPOINT_C.x, z: basePos.z + WAYPOINT_C.z };
		const worldD = { x: basePos.x + WAYPOINT_D.x, z: basePos.z + WAYPOINT_D.z };

		const route: { x: number; z: number }[] = [worldA];

		for (let lap = 0; lap < ROUTE_LAPS; lap++) {
			route.push(worldA, worldB, worldC, worldD);
		}
		route.push(worldA);

		console.log(`//[ FOLLOW-NPC ]//: route: ${route.length} points`);
		console.log(
			`//[ FOLLOW-NPC ]//: A=(${worldA.x}, ${worldA.z}) B=(${worldB.x}, ${worldB.z}) C=(${worldC.x}, ${worldC.z}) D=(${worldD.x}, ${worldD.z})`,
		);

		const fullPath: [number, number][] = [];

		for (let i = 0; i < route.length - 1; i++) {
			const rawFrom = posRealToGrid(route[i], map);
			const rawTo = posRealToGrid(route[i + 1], map);
			const from = this.findNearestFreeCell(rawFrom);
			const to = this.findNearestFreeCell(rawTo);

			console.log(
				`//[ FOLLOW-NPC ]//: segment ${i}: world(${route[i].x.toFixed(1)}, ${route[i].z.toFixed(1)}) -> world(${route[i + 1].x.toFixed(1)}, ${route[i + 1].z.toFixed(1)})`,
			);
			console.log(`//[ FOLLOW-NPC ]//:   rawGrid: [${rawFrom}] -> [${rawTo}]`);
			console.log(`//[ FOLLOW-NPC ]//:   freeCell: [${from}] -> [${to}]`);
			console.log(
				`//[ FOLLOW-NPC ]//:   isWalkable from=${this.pathfinder.isWalkable(from[0], from[1])}, to=${this.pathfinder.isWalkable(to[0], to[1])}`,
			);

			try {
				const { result } = await this.pathfinder.getPathFromAtoB(from, to);
				console.log(`//[ FOLLOW-NPC ]//:   result: ${result.length} nodes`);

				if (result.length === 0) {
					console.log(`//[ FOLLOW-NPC ]//:   *** PATH FAILED *** segment ${i}`);
				}

				if (result.length > 0) {
					if (fullPath.length > 0) {
						fullPath.push(...result.slice(1));
					} else {
						fullPath.push(...result);
					}
				}
			} catch (err) {
				console.log(
					`//[ FOLLOW-NPC ]//:   *** EXCEPTION *** segment ${i}: ${err}`,
				);
			}
		}

		console.log(`//[ FOLLOW-NPC ]//: fullPath total: ${fullPath.length} nodes`);
		return fullPath;
	}

	private async startFixedRoute(npcName: string): Promise<void> {
		if (!this.pathfinder) return;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const npcEntity = this.world.getEntity(npcName).raw();
		if (!npcEntity) return;

		const slotPos = getSlotPosition(this.runtime.userId);
		if (!slotPos) return;

		const basePos = { x: slotPos.x, z: slotPos.z };
		console.log(
			`//[ FOLLOW-NPC ]//: startFixedRoute: basePos=(${basePos.x}, ${basePos.z})`,
		);

		const fullPath = await this.computeFixedRoute(basePos);

		if (fullPath.length === 0) {
			this.handlePhaseFailure('No se pudo calcular la ruta.');
			return;
		}

		npcEntity.get(FollowPathEcs).ifSome((followPath) => {
			followPath.path = fullPath;
		});

		serverData.room.broadcast('follow:range:create', {
			npcName,
			radius: MAX_DISTANCE,
		});

		this.startDistanceCheck(npcName);
		this.startPathCheck(npcName);
	}

	private startPathCheck(npcName: string): void {
		this.pathCheckInterval = setInterval(() => {
			if (this.resolved) return;

			const npcEntity = this.world.getEntity(npcName).raw();
			if (!npcEntity) return;

			const followPath = npcEntity.get(FollowPathEcs).raw();
			if (!followPath) return;

			if (followPath.path.length === 0) {
				this.handlePhaseSuccess();
			}
		}, PATH_CHECK_INTERVAL_MS);
	}

	private startDistanceCheck(npcName: string): void {
		this.distanceCheckInterval = setInterval(() => {
			if (this.resolved) return;

			const npcEntity = this.world.getEntity(npcName).raw();
			if (!npcEntity) return;

			const npcBody = npcEntity.get(CharacterBodyServerEcs).raw();
			const playerBody = this.world
				.getEntity(this.runtime.entityName)
				.raw()
				?.get(CharacterBodyServerEcs)
				.raw();

			if (!npcBody || !playerBody) return;

			const npcPos = npcBody.body.translation();
			const playerPos = playerBody.body.translation();
			const dx = npcPos.x - playerPos.x;
			const dz = npcPos.z - playerPos.z;
			const distance = Math.sqrt(dx * dx + dz * dz);

			if (distance > MAX_DISTANCE) {
				this.handlePhaseFailure('Te alejaste demasiado del NPC.');
			}
		}, DISTANCE_CHECK_INTERVAL_MS);
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData && this.npcName) {
			serverData.room.broadcast('follow:range:remove', {
				npcName: this.npcName,
			});
		}

		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(reason: string): void {
		if (this.resolved) return;
		this.resolved = true;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData && this.npcName) {
			serverData.room.broadcast('follow:range:remove', {
				npcName: this.npcName,
			});
		}

		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, reason);
		});
	}

	private spawnNpc(
		userId: string,
		basePos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;

		const npcPos = {
			x: basePos.x + WAYPOINT_A.x,
			y: basePos.y + 1,
			z: basePos.z + WAYPOINT_A.z,
		};

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			variables: () => ({}),
			conversations: [
				{
					id: 'follow-ask',
					rootStatementId: 's_root',
					reusable: false,
					resumable: false,
					oneShot: false,
					enabled: true,
					onEnd: () => {
						if (this.following) {
							this.startFixedRoute(npcName);
						} else {
							this.handlePhaseFailure('No aceptaste seguir al NPC.');
						}
					},
					statements: {
						s_root: {
							id: 's_root',
							text: '¡Hey! ¿Quieres hacer una caminata conmigo? Dame unas vueltas por aquí y no te alejes mucho.',
							options: {
								o_accept: {
									id: 'o_accept',
									text: 'Claro, te sigo.',
									nextStatementId: 's_accept',
									onSelect: () => {
										this.following = true;
									},
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
							text: 'Perfecto. ¡Vamos! Mantente cerca de mí, no te vayas a perder.',
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
			display: 'Guía',
			description: 'Un NPC que te invita a seguirlo en un paseo.',
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
			pathfinder: this.pathfinder ?? undefined,
			room,
		});

		this.world.addEntity(npcEntity);

		npcEntity.get(MovementServerEcs).ifSome((movement) => {
			movement.walkSpeed = 3;
		});
	}
}
