import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { animalServerFactoryGenerator } from '../../../prefab/animal.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { ServerDataEcs } from '../../serverData.ecs';
import { WorldEventBusEcs, WorldEventType, type EntityDamagedPayload } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsSinLlmsExperimentRuntimeEcs } from '../handlers/npcs-sin-llms.experiment-runtime.ecs';
import { ANIMAL_SPAWN_CATALOG } from '../../animal/animal-spawn.catalog';

const NPC_IDENTIFIER = 'hunt-npc';
const NPC_SKIN = 'kanye';

const MAX_ACTIVE_DEER = 6;
const DEER_SPAWN_RADIUS = 8;
const RESPAWN_INTERVAL_MS = 6000;
const REQUIRED_KILLS = 10;

export class HuntAnimalsPhaseEcs extends ExperimentPhaseEcs {
	private npcName: string | null = null;
	private readonly spawnedDeerNames: string[] = [];
	private respawnInterval: ReturnType<typeof setInterval> | null = null;
	private deerCounter = 0;
	private killCount = 0;
	private resolved = false;
	private readonly lastAttackerMap = new Map<string, string>();

	protected onMountPhase(): void {
		this.killCount = 0;
		this.deerCounter = 0;
		this.resolved = false;
		this.lastAttackerMap.clear();

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		this.spawnNpc(userId, basePos, serverData.room);
		this.startDeerRespawn(userId);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		this.unsubs.push(
			bus.on<EntityDamagedPayload>(WorldEventType.EntityDamaged, (entityName, payload) => {
				if (!this.spawnedDeerNames.includes(entityName)) return;
				this.lastAttackerMap.set(entityName, payload.attackerId);
			}),
		);

		this.unsubs.push(
			bus.on(WorldEventType.EntityDeath, (entityName) => {
				if (entityName === this.npcName) {
					this.handlePhaseFailure('Tu aliado ha caído.');
					return;
				}
				if (entityName === this.runtime.entityName) {
					this.handlePhaseFailure('Has muerto.');
					return;
				}
				if (!this.spawnedDeerNames.includes(entityName)) return;

				const attackerId = this.lastAttackerMap.get(entityName);
				const idx = this.spawnedDeerNames.indexOf(entityName);
				if (idx !== -1) this.spawnedDeerNames.splice(idx, 1);
				this.lastAttackerMap.delete(entityName);

				if (attackerId === this.npcName || attackerId === this.runtime.entityName) {
					this.killCount++;
					if (this.killCount >= REQUIRED_KILLS) {
						this.handlePhaseSuccess();
					}
				}
			}),
		);
	}

	protected onUnmountPhase(): void {
		if (this.respawnInterval !== null) {
			clearInterval(this.respawnInterval);
			this.respawnInterval = null;
		}

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}

		for (const deerName of this.spawnedDeerNames) {
			this.world.getEntity(deerName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedDeerNames.length = 0;
		this.lastAttackerMap.clear();
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

	private spawnSingleDeer(userId: string): void {
		const deerCatalog = ANIMAL_SPAWN_CATALOG['deer'];
		if (!deerCatalog) return;

		const variant = deerCatalog.variants[this.deerCounter % deerCatalog.variants.length];

		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		const angle = Math.random() * Math.PI * 2;
		const radius = 4 + Math.random() * (DEER_SPAWN_RADIUS - 4);
		const pos = {
			x: basePos.x + Math.cos(angle) * radius,
			y: basePos.y,
			z: basePos.z + Math.sin(angle) * radius,
		};

		const deerName = `hunt-deer-${userId}-${this.deerCounter++}`;
		const factory = animalServerFactoryGenerator(this.world);
		const pathfinder =
			(this.runtime as NpcsSinLlmsExperimentRuntimeEcs).experimentPathfinder ?? undefined;

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
		this.spawnedDeerNames.push(deerName);
	}

	private startDeerRespawn(userId: string): void {
		for (let i = 0; i < MAX_ACTIVE_DEER; i++) {
			this.spawnSingleDeer(userId);
		}

		this.respawnInterval = setInterval(() => {
			while (this.spawnedDeerNames.length < MAX_ACTIVE_DEER) {
				this.spawnSingleDeer(userId);
			}
		}, RESPAWN_INTERVAL_MS);
	}

	private spawnNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;

		const factory = classicNpcServerFactoryGenerator(this.world);
		const pathfinder =
			(this.runtime as NpcsSinLlmsExperimentRuntimeEcs).experimentPathfinder ?? undefined;

		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Cazador',
			description: 'Un NPC cazador que persigue ciervos.',
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.HUNTER,
				aggroRange: 12,
				attackRange: 2,
				detectionRange: 15,
				attackDurationSec: 9999,
				attackCooldownMs: 1500,
				fleeHealthPercent: null,
				patrolRadius: 10,
				extraConfig: {},
			},
			room,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
	}
}
