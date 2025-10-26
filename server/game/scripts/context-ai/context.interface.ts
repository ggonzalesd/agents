import type { EntityEcs, WorldEcs } from '#/ecs';

export interface IContextAI {
	onStart(world: WorldEcs, parent: EntityEcs): void;
	toStringContext(): string;
}
