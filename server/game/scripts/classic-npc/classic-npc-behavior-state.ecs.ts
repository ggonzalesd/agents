import type { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import { actionsSchema } from '#/schema/actions.schema';
import type { NPCState } from '#/state/game.state';
import type { IVec3 } from '#/utils/math.util';
import type { ClassicNpcConfigDB } from '$/models/ClassicNPC.model';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import {
	ClassicNpcBehaviorState,
	ClassicNpcType,
	DEFAULT_CLASSIC_NPC_CONFIG,
	type ClassicNpcRuntimeConfig,
} from './classic-npc.types';

export class ClassicNPCBehaviorStateEcs extends ComponentEcs {
	public readonly sharedState: NPCState;
	public readonly config: ClassicNpcRuntimeConfig;
	public currentState = ClassicNpcBehaviorState.IDLE;
	public targetEntityId: string | null = null;
	public patrolTarget: { x: number; z: number } | null = null;
	public readonly spawnPoint: IVec3;
	public attackUntilAt = 0;
	public nextAttackAt = 0;
	public nextPatrolAt = 0;
	public lastKnownLife: number;
	private readonly queuedActions: Array<z.infer<typeof actionsSchema>> = [];

	constructor({
		state,
		config,
		spawnPoint,
	}: {
		state: NPCState;
		config?: ClassicNpcConfigDB | null;
		spawnPoint: IVec3;
	}) {
		super();
		this.sharedState = state;
		this.spawnPoint = { ...spawnPoint };
		this.lastKnownLife = state.character.life;
		this.config = {
			...DEFAULT_CLASSIC_NPC_CONFIG,
			...(config
				? {
					behaviorType: config.behaviorType,
					aggroRange: config.aggroRange,
					attackRange: config.attackRange,
					detectionRange: config.detectionRange,
					attackDurationSec: config.attackDurationSec,
					attackCooldownMs: config.attackCooldownMs,
					fleeHealthPercent: config.fleeHealthPercent,
					patrolRadius: config.patrolRadius,
					extraConfig: config.extraConfig,
				}
				: {}),
		};
	}

	onStart(): void {
		this.sharedState.npcType = ClassicNpcType.CLASSIC;
		this.sharedState.behaviorState = this.currentState;

		this.world
			.getEntity(this.parent)
			.map((entity) => entity.get(CharacterBodyServerEcs))
			.collapse()
			.ifSome((character) => {
				this.lastKnownLife = character.characterState.life;
			});
	}

	public setState(state: ClassicNpcBehaviorState): void {
		this.currentState = state;
		this.sharedState.behaviorState = state;
	}

	public queueAction(action: z.infer<typeof actionsSchema>): void {
		this.queuedActions.push(action);
	}

	public flushActions(): Array<z.infer<typeof actionsSchema>> {
		const actions = [...this.queuedActions];
		this.queuedActions.length = 0;
		return actions;
	}
}
