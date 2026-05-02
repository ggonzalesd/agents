type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export enum ClassicNpcBehaviorType {
	PASSIVE = 'PASSIVE',
	NEUTRAL = 'NEUTRAL',
	AGGRESSIVE = 'AGGRESSIVE',
	EXPLORER = 'EXPLORER',
	COLLECTOR = 'COLLECTOR',
	THIEF = 'THIEF',
}

export enum ClassicNpcDialogTrigger {
	PROXIMITY = 'PROXIMITY',
	INTERACT = 'INTERACT',
	QUEST_START = 'QUEST_START',
	QUEST_COMPLETE = 'QUEST_COMPLETE',
}

export interface ClassicNPCDB {
	id: string;
	description: string;
	skinUrl: string;
}

export interface ClassicNpcConfigDB {
	id: string;
	npcId: string;
	behaviorType: ClassicNpcBehaviorType;
	aggroRange: number;
	attackRange: number;
	detectionRange: number;
	attackDurationSec: number;
	attackCooldownMs: number;
	fleeHealthPercent: number | null;
	patrolRadius: number;
	extraConfig: JsonValue;
}
