import { DeferredTicker } from '#/ecs/lib/DeferredTicker';

import { animalServerFactoryGenerator } from '../../../prefab/animal.server';
import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import type { AnimalProfileProps } from '../../animal/animal-profile.ecs';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { ServerDataEcs } from '../../serverData.ecs';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsSinLlmsExperimentRuntimeEcs } from '../handlers/npcs-sin-llms.experiment-runtime.ecs';

const BULL_IDENTIFIER = 'survive-bull';
const BULL_SKIN = 'bull-black';
const BULL_DISPLAY = 'Toro Negro';
const BULL_LIFE = 90_000;
const BULL_SPAWN_RADIUS = 10;
const SURVIVE_DURATION_MS = 10_000;

const NPC_IDENTIFIER = 'survive-bull-npc';
const NPC_SKIN = 'kanye';
const NPC_LIFE = 100;

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

export class SurviveBullPhaseEcs extends ExperimentPhaseEcs {
	private bullName: string | null = null;
	private npcName: string | null = null;
	private resolved = false;
	private phaseTicker = new DeferredTicker();

	protected onMountPhase(): void {
		this.resolved = false;
		this.bullName = null;
		this.npcName = null;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		this.spawnNpc(userId, basePos, serverData.room);
		this.spawnBull(userId, basePos);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		this.unsubs.push(
			bus.on(WorldEventType.EntityDeath, (entityName) => {
				if (entityName === this.npcName) {
					this.handlePhaseFailure('Tu aliado ha caído.');
					return;
				}
				if (entityName === this.bullName) {
					this.spawnBull(userId, basePos);
				}
			}),
		);

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

	private spawnNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${NPC_IDENTIFIER}-${userId}`;
		this.npcName = npcName;

		const factory = classicNpcServerFactoryGenerator(this.world);
		const pathfinder =
			(this.runtime as NpcsSinLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Aldeano',
			description: 'Un aldeano que necesita protección contra el toro.',
			skin: NPC_SKIN,
			pos,
			life: NPC_LIFE,
			maxLife: NPC_LIFE,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.NEUTRAL,
				aggroRange: 0,
				attackRange: 2,
				detectionRange: 10,
				attackDurationSec: 5,
				attackCooldownMs: 1500,
				fleeHealthPercent: 0.5,
				patrolRadius: 0,
				extraConfig: {},
			},
			room,
			pathfinder,
		});

		this.world.addEntity(npcEntity);
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

		const bullName = `${BULL_IDENTIFIER}-${userId}-${Date.now()}`;
		const factory = animalServerFactoryGenerator(this.world);
		const pathfinder =
			(this.runtime as NpcsSinLlmsExperimentRuntimeEcs).experimentPathfinder ??
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
}
