import type { EntityEcs } from '#/ecs';
import { posRealToGrid } from '#/utils/map.utils';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';
import { CharacterBodyServerEcs } from '../CharacterBodyServer.ecs';
import type { IFollowOption } from './follow-option.interface';
import type { FollowPathEcs } from './follow-path.ecs';

export class FollowPositionOption implements IFollowOption {
	done: boolean = false;
	private settled = false;

	pathfinder: WorldPathfinderEcs;
	followPath: FollowPathEcs;
	position: { x: number; z: number };
	pivotPosition?: { x: number; z: number } | null;
	private onComplete?: () => void;
	private onFail?: (reason: string) => void;

	character: CharacterBodyServerEcs = null!;

	constructor(props: {
		pathfinder: IPathfinder;
		followPath: FollowPathEcs;
		position: { x: number; z: number };
		entity: EntityEcs;
		pivotPosition?: { x: number; z: number } | null;
		onComplete?: () => void;
		onFail?: (reason: string) => void;
	}) {
		this.pathfinder = props.pathfinder;
		this.followPath = props.followPath;
		this.position = props.position;
		this.pivotPosition = props.pivotPosition;
		this.onComplete = props.onComplete;
		this.onFail = props.onFail;

		this.character = props.entity
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');
	}

	private canRecalculatePath = true;

	private complete(): void {
		if (this.settled) {
			return;
		}

		this.settled = true;
		this.onComplete?.();
	}

	private fail(reason: string): void {
		if (this.settled) {
			return;
		}

		this.settled = true;
		this.onFail?.(reason);
	}

	loop(_: number): void {
		if (this.done) return;

		// Update if stop moving
		if (this.followPath.timeSinceLast < 1 || !this.canRecalculatePath) return;

		// If too far from target position, recalculate path
		const targetPos = this.position;
		const currentPos = this.character.body.translation();

		const distX = targetPos.x - currentPos.x;
		const distZ = targetPos.z - currentPos.z;

		const distance = Math.sqrt(distX * distX + distZ * distZ);

		if (distance > 1) {
			// Get Current grid position
			const currentGridPos = posRealToGrid(
				{ x: currentPos.x, z: currentPos.z },
				this.pathfinder.map,
			);

			let targetGridPos: [number, number];

			// Go To target
			if (this.pivotPosition != null) {
				this.pivotPosition = null;
				targetGridPos = posRealToGrid(
					{ x: targetPos.x, z: targetPos.z },
					this.pathfinder.map,
				);
			} else {
				// Get random position around current position
				const randomOffsetX = (Math.random() - 0.5) * 10;
				const randomOffsetZ = (Math.random() - 0.5) * 10;
				this.pivotPosition = {
					x: currentPos.x + randomOffsetX,
					z: currentPos.z + randomOffsetZ,
				};

				targetGridPos = posRealToGrid(
					{ x: currentPos.x + randomOffsetX, z: currentPos.z + randomOffsetZ },
					this.pathfinder.map,
				);
			}

			this.pathfinder
				.getPathFromAtoB(currentGridPos, targetGridPos)
				// .set the new path
				.then(({ result }) => {
					if (result.length === 0) {
						this.fail(
							`No path available to point (${this.position.x}, ${this.position.z}).`,
						);
						this.done = true;
						this.followPath.path = [];
						return;
					}

					this.followPath.path = result;
				})
				// on finally allow path recalculation again
				.finally(() => {
					this.canRecalculatePath = true;
					this.followPath.timeSinceLast = 0;
				});
			this.canRecalculatePath = false;
		} else {
			this.done = true;
			this.complete();
		}
	}

	isDone(): boolean {
		return this.done;
	}

	toContextString(): string {
		return [
			'# Movement: Following Position',
			`- Target Position: ${this.position.x}, ${this.position.z}`,
		].join('\n');
	}
}
