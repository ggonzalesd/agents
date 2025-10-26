import type { EntityEcs } from '#/ecs';
import { posRealToGrid } from '#/utils/map.utils';
import type { WorldPathfinderEcs } from '../../world/world-grid.ecs';
import { CharacterBodyServerEcs } from '../CharacterBodyServer.ecs';
import type { IFollowOption } from './follow-option.interface';
import type { FollowPathEcs } from './follow-path.ecs';

export class FollowEntityOption implements IFollowOption {
	private pathfinder: WorldPathfinderEcs;
	private followPath: FollowPathEcs;

	private updatePathTimer = Infinity;

	positionGetter?: () => { x: number; z: number };
	target: EntityEcs;

	character: CharacterBodyServerEcs = null!;

	constructor(props: {
		pathfinder: WorldPathfinderEcs;
		followPath: FollowPathEcs;
		target: EntityEcs;
		entity: EntityEcs;
	}) {
		this.pathfinder = props.pathfinder;
		this.followPath = props.followPath;
		this.target = props.target;

		props.target.get(CharacterBodyServerEcs).ifSome((c) => {
			this.positionGetter = () => {
				const pos = c.body.translation();
				return { x: pos.x, z: pos.z };
			};

			c.callOnDelete(() => {
				this.followPath.option = {
					isDone: () => true,
					loop: () => {},
				};
			});
		});

		this.character = props.entity
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');
	}

	loop(_delta: number): void {
		if (!this.positionGetter) {
			const getter = this.target
				.get(CharacterBodyServerEcs)
				.map((c) => () => c.body.translation())
				.raw();

			if (getter == null) {
				this.followPath.option = {
					isDone: () => true,
					loop: () => {},
				};
				return;
			}

			this.positionGetter = getter;
		}

		if (this.updatePathTimer < 0) return;
		this.updatePathTimer += _delta / 1000;

		if (this.updatePathTimer <= 2.5) return;
		this.updatePathTimer = -1;

		// Get target position
		const targetPos = this.positionGetter();
		const targetGridPos = posRealToGrid(
			{ x: targetPos.x, z: targetPos.z },
			this.pathfinder.map,
		);

		// Get current position
		const currentPos = this.character.body.translation();
		const currentGridPos = posRealToGrid(
			{ x: currentPos.x, z: currentPos.z },
			this.pathfinder.map,
		);

		// Calculate new path
		this.pathfinder
			.getPathFromAtoB(currentGridPos, targetGridPos)
			// .set the new path
			.then(({ result }) => {
				this.followPath.path = result;
				console.log('FollowEntityOption: New path calculated', {
					from: currentGridPos,
					to: targetGridPos,
					pathLength: result.length,
				});
			})
			// on finally allow path recalculation again
			.finally(() => {
				this.updatePathTimer = 0;
			});
	}

	isDone(): boolean {
		return false;
	}
}
