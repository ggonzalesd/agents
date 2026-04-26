import { ComponentEcs } from '#/ecs';

export interface AnimalProfileProps {
	species: 'deer';
	homeRadius: number;
	threatRadius: number;
	fleeDistance: number;
	minIdleMs: number;
	maxIdleMs: number;
	fleeRecoverMs: number;
	panicDurationMs: number;
	counterAttackRadius: number;
	stareAfterAttackMs: number;
}

export class AnimalProfileEcs extends ComponentEcs {
	constructor(public readonly profile: AnimalProfileProps) {
		super();
	}
}
