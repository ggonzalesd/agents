import { ComponentEcs } from '#/ecs';
import { GridPointState, type NPCState } from '#/state/game.state';
import { FollowPathEcs } from './follow-path.ecs';
import { StopMovementOption } from './stop-movement.class';

export class NpcPathDebugSyncEcs extends ComponentEcs {
	private followPath: FollowPathEcs = null!;
	private lastPathKey = '';

	constructor(private readonly state: NPCState) {
		super();
	}

	onStart(): void {
		this.followPath = this.world
			.getEntity(this.parent)
			.map((entity) => entity.getUnsafe(FollowPathEcs))
			.unwrap('FollowPathEcs not found');
	}

	onLoop(): void {
		const shouldClear =
			this.followPath.option instanceof StopMovementOption ||
			(this.followPath.option.isDone() && this.followPath.path.length === 0);

		if (shouldClear) {
			this.clearPath();
			return;
		}

		if (this.followPath.path.length === 0) {
			return;
		}

		const nextPathKey = this.followPath.path
			.map(([x, y]) => `${x}:${y}`)
			.join('|');

		if (this.state.debugPath.active && nextPathKey === this.lastPathKey) {
			return;
		}

		while (this.state.debugPath.points.length > this.followPath.path.length) {
			this.state.debugPath.points.pop();
		}

		for (let index = 0; index < this.followPath.path.length; index += 1) {
			const [x, y] = this.followPath.path[index];
			const currentPoint = this.state.debugPath.points[index];

			if (currentPoint) {
				currentPoint.x = x;
				currentPoint.y = y;
				continue;
			}

			this.state.debugPath.points.push(new GridPointState({ x, y }));
		}

		// console.log(`[NPC Path] ${this.parent}:`, this.followPath.path);

		this.state.debugPath.active = true;
		this.state.debugPath.revision += 1;
		this.lastPathKey = nextPathKey;
	}

	private clearPath(): void {
		if (!this.state.debugPath.active && this.lastPathKey === '') {
			return;
		}

		while (this.state.debugPath.points.length > 0) {
			this.state.debugPath.points.pop();
		}

		// console.log(`[NPC Path] ${this.parent}: cleared`);

		this.state.debugPath.active = false;
		this.state.debugPath.revision += 1;
		this.lastPathKey = '';
	}
}
