import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { floatingTextServerFactory } from '../../../prefab/floating-text.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { FloatingTextServerEcs } from '../../floating-text/floating-text.server.ecs';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { ServerDataEcs } from '../../serverData.ecs';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsSinLlmsExperimentRuntimeEcs } from '../handlers/npcs-sin-llms.experiment-runtime.ecs';

const VILLAIN_NPC_ID = 'villain-npc';
const VILLAIN_SKIN = 'kanye';
const SPAWN_OFFSET = 1.5;

export class DefeatVillainNpcPhaseEcs extends ExperimentPhaseEcs {
	private villainNpcName: string | null = null;
	private hintName: string | null = null;
	private resolved = false;

	protected onMountPhase(): void {
		this.resolved = false;
		this.hintName = null;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		if (!slotPos) return;

		const playerPos = { x: slotPos.x - SPAWN_OFFSET, y: slotPos.y, z: slotPos.z };
		const villainPos = { x: slotPos.x + SPAWN_OFFSET, y: slotPos.y, z: slotPos.z };

		const hintId = `${VILLAIN_NPC_ID}-hint-${userId}`;
		const hintEntity = floatingTextServerFactory({
			world: this.world,
			name: hintId,
			pos: { x: slotPos.x, y: slotPos.y, z: slotPos.z },
			text: 'Véncelo',
			foreground: '#ffffff',
			background: '#1a1a2e',
			fontSize: 18,
		});
		this.world.addEntity(hintEntity);
		this.hintName = hintId;

		this.teleportPlayer(playerPos);
		this.spawnVillainNpc(userId, villainPos, serverData.room);

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus || !this.villainNpcName) return;

		this.onEvent(bus, WorldEventType.EntityDeath, this.villainNpcName, () => {
			this.handlePhaseSuccess();
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.runtime.entityName, () => {
			this.handlePhaseFailure();
		});
	}

	protected onUnmountPhase(): void {
		if (this.villainNpcName) {
			this.world.getEntity(this.villainNpcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.villainNpcName = null;
		}
		if (this.hintName) {
			this.world.getEntity(this.hintName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.hintName = null;
		}
	}

	private teleportPlayer(pos: { x: number; y: number; z: number }): void {
		this.world.getEntity(this.runtime.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(pos, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(pos);
			});
		});
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, 'Has muerto a manos del villano.');
		});
	}

	private spawnVillainNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${VILLAIN_NPC_ID}-${userId}`;
		this.villainNpcName = npcName;

		const pathfinder =
			(this.runtime as NpcsSinLlmsExperimentRuntimeEcs).experimentPathfinder ?? undefined;

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Villano',
			description: 'Un NPC agresivo que quiere vencerte.',
			skin: VILLAIN_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.AGGRESSIVE,
				aggroRange: 15,
				attackRange: 2,
				detectionRange: 20,
				attackDurationSec: 9999,
				attackCooldownMs: 1500,
				fleeHealthPercent: null,
				patrolRadius: 0,
				extraConfig: {},
			},
			pathfinder,
			room,
			additionalComponents: {
				[FloatingTextServerEcs.name]: new FloatingTextServerEcs(pos, {
					text: '\u2694\uFE0F',
					foreground: '#ff4444',
					background: '#00000000',
					fontSize: 28,
					yOffset: 1,
				}),
			},
		});

		this.world.addEntity(npcEntity);
	}
}
