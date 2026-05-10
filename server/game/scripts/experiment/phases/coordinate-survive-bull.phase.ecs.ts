import { DeferredTicker } from '#/ecs/lib/DeferredTicker';
import prisma from '$/config/prisma.config';
import { animalServerFactoryGenerator } from '$/game/prefab/animal.server';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import type { AnimalProfileProps } from '../../animal/animal-profile.ecs';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';

const NPC_SLUG_SUFFIX = '-npc-8';
const NPC_NAME_SUFFIX = '-npc-08';
const NPC_SKIN = 'kanye';
const NPC_MODEL = 'gpt-4.1-mini';
const NPC_LIFE = 100;

const BULL_SKIN = 'bull-black';
const BULL_DISPLAY = 'Toro Negro';
const BULL_LIFE = 90_000;
const BULL_SPAWN_RADIUS = 10;

const SURVIVE_DURATION_MS = 15_000;

const bullExperimentProfile: AnimalProfileProps = {
	populationKey: 'bull',
	species: 'bull-black',
	attackDamage: 2,
	canFlee: false,
	canCounterAttack: true,
	homeRadius: 50,
	threatRadius: 0,
	fleeDistance: 0,
	minIdleMs: 1000,
	maxIdleMs: 2000,
	fleeRecoverMs: 0,
	panicDurationMs: 500,
	counterAttackRadius: 3.5,
	stareAfterAttackMs: 200,
	walkSpeed: 5,
	knockbackMultiplier: 3,
	charge: {
		chargeRadius: 50,
		chargeRecoverMs: 1500,
	},
	hunt: {
		huntCooldownMs: 1000,
		huntNpcs: true,
		huntPlayers: true,
		huntRadius: 200,
		preySpecies: [],
	},
};

export class CoordinateSurviveBullPhaseEcs extends ExperimentPhaseEcs {
	private bullName: string | null = null;
	private npcName: string | null = null;
	private resolved = false;
	private phaseTicker = new DeferredTicker();

	protected onMountPhase(): void {
		this.resolved = false;
		this.bullName = null;
		this.npcName = null;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handlePhaseFailure('Has muerto durante el combate contra el toro.');
		});

		const npcName = `${userId}${NPC_NAME_SUFFIX}`;
		this.npcName = npcName;

		this.onEvent(bus, WorldEventType.EntityDeath, this.npcName, () => {
			this.handlePhaseFailure('Tu guardián ha caído.');
		});

		const bullRespawnUnsub = bus.on(WorldEventType.EntityDeath, (entityName: string) => {
			if (entityName === this.bullName) {
				this.spawnBull(userId, basePos);
			}
		});
		this.unsubs.push(bullRespawnUnsub);

		this.spawnBull(userId, basePos);
		this.spawnNpc(userId, npcName).catch((err: unknown) => {
			console.error('[CoordinateSurviveBull] Error al spawnear NPC:', err);
		});

		this.phaseTicker.schedule(SURVIVE_DURATION_MS, () => {
			this.handlePhaseSuccess();
		});
	}

	public onLoop(delta: number): void {
		this.phaseTicker.tick(delta);
	}

	protected onUnmountPhase(): void {
		this.phaseTicker.cancel();

		if (this.bullName) {
			this.world.getEntity(this.bullName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.bullName = null;
		}

		if (this.npcName) {
			this.world.getEntity(this.npcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.npcName = null;
		}
	}

	private spawnBull(
		userId: string,
		basePos: { x: number; y: number; z: number },
	): void {
		if (this.bullName) {
			this.world.getEntity(this.bullName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
		}

		const angle = Math.random() * Math.PI * 2;
		const pos = {
			x: basePos.x + Math.cos(angle) * BULL_SPAWN_RADIUS,
			y: basePos.y,
			z: basePos.z + Math.sin(angle) * BULL_SPAWN_RADIUS,
		};

		const bullName = `coordinate-bull-${userId}-${Date.now()}`;
		const factory = animalServerFactoryGenerator(this.world);
		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const bullEntity = factory({
			name: bullName,
			display: BULL_DISPLAY,
			pos,
			skin: BULL_SKIN,
			life: BULL_LIFE,
			maxLife: BULL_LIFE,
			profile: bullExperimentProfile,
			pathfinder,
		});

		this.world.addEntity(bullEntity);
		this.bullName = bullName;
	}

	private async spawnNpc(
		userId: string,
		npcName: string,
	): Promise<void> {
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});
		const npcSlug = `${playerAgent.identifier}${NPC_SLUG_SUFFIX}`;

		const npcRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: npcSlug },
			include: { entity: { include: { agent: true } } },
		});

		const slotPos = getSlotPosition(userId);
		const pos = slotPos
			? { x: slotPos.x + 3, y: slotPos.y, z: slotPos.z + 3 }
			: { x: 3, y: 0, z: 3 };

		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const dynamicDescription = [
			npcRecord.description,
			'Estás en una arena con un toro negro que embiste sin piedad.',
			'Tu misión es coordinarte con el jugador para sobrevivir juntos.',
			'Puedes usar acciones como move-follow-entity, move-to-position, attack-until-resolved y flee-from-entity.',
			'Protege al jugador y evita que el toro lo aplaste. Habla en español. Sé valiente y estratégico.',
		].join(' ');

		const factory = npcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcRecord.id,
			identifier: npcRecord.entity.agent.identifier,
			name: npcName,
			display: 'Guardián',
			description: dynamicDescription,
			model: NPC_MODEL,
			skin: NPC_SKIN,
			pos,
			life: NPC_LIFE,
			maxLife: NPC_LIFE,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
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