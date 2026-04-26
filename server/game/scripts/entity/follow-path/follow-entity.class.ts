import type { EntityEcs } from '#/ecs';
import { posRealToGrid } from '#/utils/map.utils';
import type { WorldPathfinderEcs } from '../../world/world-grid.ecs';
import { CharacterBodyServerEcs } from '../CharacterBodyServer.ecs';
import type { IFollowOption } from './follow-option.interface';
import type { FollowPathEcs } from './follow-path.ecs';
import { StopMovementOption } from './stop-movement.class';

export class FollowEntityOption implements IFollowOption {
	private pathfinder: WorldPathfinderEcs;
	private followPath: FollowPathEcs;

	private updatePathTimer = Infinity;
	private stoppingDistance?: number;
	private flee: boolean;
	private cancelled = false;
	private settled = false;
	private onComplete?: () => void;
	private onFail?: (reason: string) => void;

	positionGetter?: () => { x: number; z: number };
	target: EntityEcs;

	character: CharacterBodyServerEcs = null!;

	constructor(props: {
		pathfinder: WorldPathfinderEcs;
		followPath: FollowPathEcs;
		target: EntityEcs;
		entity: EntityEcs;
		stoppingDistance?: number;
		flee?: boolean;
		onComplete?: () => void;
		onFail?: (reason: string) => void;
	}) {
		this.pathfinder = props.pathfinder;
		this.followPath = props.followPath;
		this.target = props.target;
		this.stoppingDistance = props.stoppingDistance;
		this.flee = props.flee ?? false;
		this.onComplete = props.onComplete;
		this.onFail = props.onFail;
		this.followPath.path = [];

		props.target.get(CharacterBodyServerEcs).ifSome((c) => {
			this.positionGetter = () => {
				const pos = c.body.translation();
				return { x: pos.x, z: pos.z };
			};

			c.callOnDelete(() => {
				this.fail(`Target entity ${this.target.name} is no longer available.`);
				this.followPath.option = new StopMovementOption();
			});
		});

		this.character = props.entity
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');
	}

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

	private stop(): void {
		this.cancelled = true;
		this.followPath.path = [];
		this.followPath.option = new StopMovementOption();
	}

	loop(_delta: number): void {
		if (!this.positionGetter) {
			const getter = this.target
				.get(CharacterBodyServerEcs)
				.map((c) => () => c.body.translation())
				.raw();

			if (getter == null) {
				this.fail(`Target entity ${this.target.name} is no longer available.`);
				this.stop();
				return;
			}

			this.positionGetter = getter;
		}

		if (this.stoppingDistance != null) {
			const targetPos = this.positionGetter();
			const myPos = this.character.body.translation();
			const dx = targetPos.x - myPos.x;
			const dz = targetPos.z - myPos.z;
			const distance = Math.sqrt(dx * dx + dz * dz);

			const shouldStop = this.flee
				? distance >= this.stoppingDistance
				: distance <= this.stoppingDistance;

			if (shouldStop) {
				this.complete();
				this.stop();
				return;
			}
		}

		if (this.updatePathTimer < 0) return;
		this.updatePathTimer += _delta / 1000;

		if (this.updatePathTimer <= 2.5) return;
		this.updatePathTimer = -1;

		const targetPos = this.positionGetter();
		const myPos = this.character.body.translation();

		let pathDest: { x: number; z: number };

		if (this.flee && this.stoppingDistance != null) {
			// Destination: a point behind the NPC (away from target) beyond stopping distance
			const dx = myPos.x - targetPos.x;
			const dz = myPos.z - targetPos.z;
			const len = Math.sqrt(dx * dx + dz * dz) || 1;
			const dirX = dx / len;
			const dirZ = dz / len;
			pathDest = {
				x: myPos.x + dirX * 2,
				z: myPos.z + dirZ * 2,
			};
		} else {
			pathDest = targetPos;
		}

		const targetGridPos = posRealToGrid(
			{ x: pathDest.x, z: pathDest.z },
			this.pathfinder.map,
		);

		const currentGridPos = posRealToGrid(
			{ x: myPos.x, z: myPos.z },
			this.pathfinder.map,
		);

		this.pathfinder
			.getPathFromAtoB(currentGridPos, targetGridPos)
			.then(({ result }) => {
				if (this.cancelled) return;
				if (result.length === 0) {
					this.fail(`No path available to ${this.target.name}.`);
					this.stop();
					return;
				}
				this.followPath.path = result;
			})
			.finally(() => {
				this.updatePathTimer = 0;
			});
	}

	isDone(): boolean {
		if (this.stoppingDistance == null || !this.positionGetter) return false;
		const targetPos = this.positionGetter();
		const myPos = this.character.body.translation();
		const dx = targetPos.x - myPos.x;
		const dz = targetPos.z - myPos.z;
		const distance = Math.sqrt(dx * dx + dz * dz);
		return this.flee
			? distance >= this.stoppingDistance
			: distance <= this.stoppingDistance;
	}

	toContextString(): string {
		return [
			`# Movement: ${this.flee ? 'Fleeing from' : 'Following'} Entity`,
			`- Target Entity ID: ${this.target.name}`,
			this.stoppingDistance != null
				? `- Stopping Distance: ${this.stoppingDistance}`
				: null,
		]
			.filter(Boolean)
			.join('\n');
	}
}
