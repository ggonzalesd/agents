import type { ClassicNpcConfigDB } from '$/models/ClassicNPC.model';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';

export enum ClassicNpcType {
	AI = 'AI',
	CLASSIC = 'CLASSIC',
}

export enum ClassicNpcBehaviorState {
	IDLE = 'IDLE',
	PATROL = 'PATROL',
	ALERT = 'ALERT',
	CHASE = 'CHASE',
	ATTACK = 'ATTACK',
	FLEE = 'FLEE',
	RETURN = 'RETURN',
	COLLECT = 'COLLECT',
	HARVEST = 'HARVEST',
}

export type ClassicNpcRuntimeConfig = Omit<ClassicNpcConfigDB, 'id' | 'npcId'>;

export const DEFAULT_CLASSIC_NPC_CONFIG: ClassicNpcRuntimeConfig = {
	behaviorType: ClassicNpcBehaviorType.PASSIVE,
	aggroRange: 10,
	attackRange: 2,
	detectionRange: 15,
	attackDurationSec: 10,
	attackCooldownMs: 1500,
	fleeHealthPercent: null,
	patrolRadius: 8,
	extraConfig: {},
};
