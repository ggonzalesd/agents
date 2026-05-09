import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { animalServerFactoryGenerator } from '$/game/prefab/animal.server';
import { floatingTextServerFactory } from '$/game/prefab/floating-text.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { FloatingTextServerEcs } from '../../floating-text/floating-text.server.ecs';
import {
	WorldEventBusEcs,
	WorldEventType,
	type EntityDamagedPayload,
} from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';
import { ANIMAL_SPAWN_CATALOG } from '../../animal/animal-spawn.catalog';

const NPC_SLUG_SUFFIX = '-npc-3';
const NPC_NAME_SUFFIX = '-npc-03';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';

const REQUIRED_KILLS = 3;
const MAX_ACTIVE_DEER = 6;
const DEER_SPAWN_RADIUS = 8;
const RESPAWN_INTERVAL_MS = 6000;

export class HuntAnimalsLlmPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private npcName: string | null = null;
	private counterName: string | null = null;
	private readonly spawnedDeerNames: string[] = [];
	private respawnInterval: ReturnType<typeof setInterval> | null = null;
	private deerCounter = 0;
	private killCount = 0;
	private readonly lastAttackerMap = new Map<string, string>();

	protected onMountPhase(): void {
		this.resolved = false;
		this.killCount = 0;
		this.deerCounter = 0;
		this.lastAttackerMap.clear();

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;
		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };

		this.npcName = `${userId}${NPC_NAME_SUFFIX}`;
		this.counterName = `${userId}-hunt-counter`;

		// Texto flotante — contador de kills
		const counterEntity = floatingTextServerFactory({
			world: this.world,
			name: this.counterName,
			pos: { x: slotPos.x, y: slotPos.y + 4, z: slotPos.z },
			text: `0 / ${REQUIRED_KILLS}`,
			foreground: '#ffffff',
			background: '#222222',
			fontSize: 22,
		});
		this.world.addEntity(counterEntity);

		this.spawnNpc(userId, this.npcName).catch((err: unknown) => {
			console.error('[HuntAnimalsLlmPhase] Error al spawnear NPC:', err);
		});

		this.startDeerRespawn(userId, slotPos);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		// Trackear último atacante de cada venado
		this.unsubs.push(
			bus.on<EntityDamagedPayload>(
				WorldEventType.EntityDamaged,
				(entityName, payload) => {
					if (this.spawnedDeerNames.includes(entityName)) {
						this.lastAttackerMap.set(entityName, payload.attackerId);
					}
				},
			),
		);

		// Muertes
		this.unsubs.push(
			bus.on(WorldEventType.EntityDeath, (deadEntity) => {
				if (deadEntity === this.npcName) {
					this.handlePhaseFailure('Tu aliado ha caído.');
					return;
				}
				if (deadEntity === entityName) {
					this.handlePhaseFailure('Has muerto.');
					return;
				}
				if (!this.spawnedDeerNames.includes(deadEntity)) return;

				const attackerId = this.lastAttackerMap.get(deadEntity);
				const idx = this.spawnedDeerNames.indexOf(deadEntity);
				if (idx !== -1) this.spawnedDeerNames.splice(idx, 1);
				this.lastAttackerMap.delete(deadEntity);

				// Solo cuentan kills del NPC LLM
				if (attackerId === this.npcName) {
					this.killCount++;
					this.updateCounter();
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

		if (this.counterName) {
			this.world.getEntity(this.counterName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.counterName = null;
		}

		for (const deerName of this.spawnedDeerNames) {
			this.world.getEntity(deerName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}
		this.spawnedDeerNames.length = 0;
		this.lastAttackerMap.clear();
	}

	private updateCounter(): void {
		if (!this.counterName) return;
		this.world.getEntity(this.counterName).ifSome((entity) => {
			entity.get(FloatingTextServerEcs).ifSome((ft) => {
				ft.setText(`${this.killCount} / ${REQUIRED_KILLS}`);
			});
		});
	}

	private async spawnNpc(userId: string, npcName: string): Promise<void> {
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		const npcRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: npcSlug },
			include: { entity: { include: { agent: true } } },
		});

		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };
		const pos = { x: slotPos.x + 2, y: slotPos.y, z: slotPos.z + 2 };

		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: npcName,
			display: 'Cazador',
			description: npcRecord.description,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
	}

	private spawnSingleDeer(
		userId: string,
		basePos: { x: number; y: number; z: number },
	): void {
		const deerCatalog = ANIMAL_SPAWN_CATALOG.deer;
		if (!deerCatalog) return;

		const variant =
			deerCatalog.variants[this.deerCounter % deerCatalog.variants.length];

		const angle = Math.random() * Math.PI * 2;
		const radius = 4 + Math.random() * (DEER_SPAWN_RADIUS - 4);
		const pos = {
			x: basePos.x + Math.cos(angle) * radius,
			y: basePos.y,
			z: basePos.z + Math.sin(angle) * radius,
		};

		const deerName = `hunt-llm-deer-${userId}-${this.deerCounter++}`;
		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

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
		this.spawnedDeerNames.push(deerName);
	}

	private startDeerRespawn(
		userId: string,
		basePos: { x: number; y: number; z: number },
	): void {
		for (let i = 0; i < MAX_ACTIVE_DEER; i++) {
			this.spawnSingleDeer(userId, basePos);
		}

		this.respawnInterval = setInterval(() => {
			while (this.spawnedDeerNames.length < MAX_ACTIVE_DEER) {
				this.spawnSingleDeer(userId, basePos);
			}
		}, RESPAWN_INTERVAL_MS);
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
