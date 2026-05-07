import { ComponentEcs } from '#/ecs';

export type AnimalSpecies = 'deer' | 'siervo' | 'donkey' | 'wolf' | 'bull-brown' | 'bull-black';
export type AnimalPopulationKey = 'deer' | 'donkey' | 'wolf' | 'bull';

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

export interface AnimalDropConfig {
	itemType: string;
	quantity: number;
	chance: number;
}

export interface AnimalProfileProps {
	populationKey: AnimalPopulationKey;
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
	walkSpeed?: number;
	knockbackMultiplier?: number;
	hunt?: AnimalHuntConfig;
	charge?: AnimalChargeConfig;
	drop?: AnimalDropConfig;
}

export class AnimalProfileEcs extends ComponentEcs {
	constructor(public readonly profile: AnimalProfileProps) {
		super();
	}
}
