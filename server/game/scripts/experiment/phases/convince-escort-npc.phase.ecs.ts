import * as RAPIER from '@dimforge/rapier3d-compat';

import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { animalServerFactoryGenerator } from '$/game/prefab/animal.server';
import { triggerZoneServerFactory } from '$/game/prefab/trigger-zone.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { MapLoaderEcs } from '../../world/map-loader.ecs';
import { DynamicPathfinder } from '../../world/dynamic-pathfinder';
import {
	WorldEventBusEcs,
	WorldEventType,
} from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import { escortLabyrinthMap } from '#/maps/maps';
import { ANIMAL_SPAWN_CATALOG } from '../../animal/animal-spawn.catalog';

const NPC_SLUG_SUFFIX = '-npc-5';
const NPC_NAME_SUFFIX = '-npc-05';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';

const LABYRINTH_MAP_KEY = 'convince-escort-labyrinth';
const ESCORT_FLOOR_KEY = 'convince-escort-floor';
const FLOOR_Y = 20;
const FLOOR_SIZE = 30;
const PLAYER_SPAWN_OFFSET = { x: -11, z: -11 };
const NPC_SPAWN_OFFSET = { x: -10, z: -11 };
const DEER_SPAWN_OFFSET = { x: -7, z: -8 };
const TRIGGER_OFFSET = { x: 11, z: 11 };

export class ConvinceEscortNpcPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	private triggerName: string | null = null;
	private deerName: string | null = null;
	private labyrinthPathfinder: DynamicPathfinder | null = null;
	private floorBodyHandle: number | null = null;
	private returnSlotPos: { x: number; y: number; z: number } | null = null;
	private readonly rockInstanceIds: string[] = [];

	protected onMountPhase(): void {
		this.resolved = false;
		this.rockInstanceIds.length = 0;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;
		const slotPos = getSlotPosition(userId);
		if (!slotPos) return;

		this.returnSlotPos = { x: slotPos.x, y: slotPos.y, z: slotPos.z };
		const labyrinthPos = { x: slotPos.x, y: FLOOR_Y, z: slotPos.z };

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;
		this.deerName = `convince-escort-deer-${userId}`;
		this.triggerName = `convince-escort-trigger-${userId}`;

		this.createFloor(labyrinthPos, serverData);
		this.teleportPlayer(labyrinthPos);
		this.loadLabyrinth(labyrinthPos);
		this.spawnNpc(userId, labyrinthPos, this.npcName).catch((err: unknown) => {
			console.error('[ConvinceEscortNpc] Error al spawnear NPC:', err);
		});
		this.spawnDeer(labyrinthPos, this.deerName);
		this.spawnTriggerZone(labyrinthPos, this.triggerName);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		this.onEvent<{ triggerName: string }>(
			bus,
			WorldEventType.EntityEnterTrigger,
			this.npcName,
			(payload) => {
				if (payload.triggerName === this.triggerName) {
					this.handlePhaseSuccess();
				}
			},
		);

		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handlePhaseFailure('Has muerto durante la escolta.');
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.npcName, () => {
			this.handlePhaseFailure('Tu aliado ha caído.');
		});
	}

	protected onUnmountPhase(): void {
		this.unloadLabyrinth();

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		if (this.deerName) {
			this.world.getEntity(this.deerName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.deerName = null;
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
					body.setRespawnPoint(this.returnSlotPos);
					body.respawn();
				});
			});
			this.returnSlotPos = null;
		}
	}

	private teleportPlayer(pos: { x: number; y: number; z: number }): void {
		const playerPos = {
			x: pos.x + PLAYER_SPAWN_OFFSET.x,
			y: pos.y + 1,
			z: pos.z + PLAYER_SPAWN_OFFSET.z,
		};

		this.world.getEntity(this.runtime.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(playerPos, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(playerPos);
			});
		});
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
			const body = serverData.worldPhysic.getRigidBody(
				this.floorBodyHandle,
			);
			if (body) {
				serverData.worldPhysic.removeRigidBody(body);
			}
			this.floorBodyHandle = null;
		}

		serverData.room.broadcast('escort:floor:remove', {
			id: ESCORT_FLOOR_KEY,
		});
	}

	private loadLabyrinth(pos: { x: number; y: number; z: number }): void {
		const loader = this.world.get(MapLoaderEcs).raw();
		if (!loader) return;

		this.labyrinthPathfinder = new DynamicPathfinder(
			escortLabyrinthMap,
			pos,
		);
		loader.mountMap(
			LABYRINTH_MAP_KEY,
			escortLabyrinthMap,
			pos,
			this.labyrinthPathfinder,
		);

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const SOLID_CELL = 1;
		let instanceIndex = 0;

		escortLabyrinthMap.grid.forEach((row, z) => {
			row.forEach((cell, x) => {
				if (cell !== SOLID_CELL) return;

				const name = `map-${LABYRINTH_MAP_KEY}-instance-rock-${instanceIndex++}`;
				const worldX =
					x + escortLabyrinthMap.offsetX + pos.x + 0.5;
				const worldZ =
					z + escortLabyrinthMap.offsetY + pos.z + 0.5;

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
					serverData.room.broadcast('experiment:instance:remove', {
						id,
					});
				}
			}
			this.rockInstanceIds.length = 0;
		}

		if (this.labyrinthPathfinder) {
			this.labyrinthPathfinder.dispose();
			this.labyrinthPathfinder = null;
		}
	}

	private async spawnNpc(
		userId: string,
		labyrinthPos: { x: number; y: number; z: number },
		npcName: string,
	): Promise<void> {
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: {
				entities: { some: { Profile: { some: { userId } } } },
			},
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		const npcRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: npcSlug },
			include: { entity: { include: { agent: true } } },
		});

		const npcPos = {
			x: labyrinthPos.x + NPC_SPAWN_OFFSET.x,
			y: labyrinthPos.y + 1,
			z: labyrinthPos.z + NPC_SPAWN_OFFSET.z,
		};

		const pathfinder = this.labyrinthPathfinder ?? undefined;

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: npcName,
			display: 'Guía',
			description: npcRecord.description,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos: npcPos,
			life: 100,
			maxLife: 100,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
	}

	private spawnDeer(
		labyrinthPos: { x: number; y: number; z: number },
		deerName: string,
	): void {
		const deerCatalog = ANIMAL_SPAWN_CATALOG.deer;
		if (!deerCatalog) return;

		const variant = deerCatalog.variants[0];
		const pos = {
			x: labyrinthPos.x + DEER_SPAWN_OFFSET.x,
			y: labyrinthPos.y + 1,
			z: labyrinthPos.z + DEER_SPAWN_OFFSET.z,
		};

		const pathfinder = this.labyrinthPathfinder ?? undefined;

		const factory = animalServerFactoryGenerator(this.world);
		const deerEntity = factory({
			name: deerName,
			display: variant.display,
			pos,
			skin: variant.skin,
			life: variant.life,
			maxLife: variant.maxLife,
			profile: variant.profile,
			pathfinder,
		});

		this.world.addEntity(deerEntity);
	}

	private spawnTriggerZone(
		pos: { x: number; y: number; z: number },
		triggerName: string,
	): void {
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
}