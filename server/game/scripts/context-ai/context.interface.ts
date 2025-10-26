import type { WorldEcs } from '#/ecs';

export interface IContextAI {
	onStart(world: WorldEcs, parentId?: string | null): void;
	toStringContext(): string;
}
