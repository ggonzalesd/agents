import { ComponentEcs } from '#/ecs';
import type { IVec3 } from '#/utils/math.util';

export type AnimalMode = 'idle' | 'wander' | 'threatened' | 'stare' | 'flee';

export class AnimalStateEcs extends ComponentEcs {
	public mode: AnimalMode = 'idle';
	public nextDecisionAt = 0;
	public lastThreatAt = 0;
	public threatEntityId: string | null = null;
	public lastAttackerId: string | null = null;
	public lastAttackedAt = 0;
	public lastHandledAttackAt = 0;
	public panicUntil = 0;
	public counterAttackDone = false;
	public stareUntil = 0;

	constructor(public readonly homePosition: IVec3) {
		super();
	}
}
