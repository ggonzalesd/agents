import { ComponentEcs } from '#/ecs';

export type AnimalSpecies = 'deer' | 'siervo' | 'donkey' | 'wolf' | 'bull-brown' | 'bull-black';

export interface AnimalHuntConfig {
	huntRadius: number;
	huntCooldownMs: number;
	preySpecies: AnimalSpecies[];
	huntPlayers: boolean;
	huntNpcs: boolean;
}

export interface AnimalChargeConfig {
	chargeRadius: number;
	chargeRecoverMs: number;
}

export interface AnimalProfileProps {
	species: AnimalSpecies;
	attackDamage: number;
	canFlee: boolean;
	canCounterAttack: boolean;
	homeRadius: number;
	threatRadius: number;
	fleeDistance: number;
	minIdleMs: number;
	maxIdleMs: number;
	fleeRecoverMs: number;
	panicDurationMs: number;
	counterAttackRadius: number;
	stareAfterAttackMs: number;
	hunt?: AnimalHuntConfig;
	charge?: AnimalChargeConfig;
}

export class AnimalProfileEcs extends ComponentEcs {
	constructor(public readonly profile: AnimalProfileProps) {
		super();
	}
}
