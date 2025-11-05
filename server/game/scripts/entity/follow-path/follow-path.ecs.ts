import { ComponentEcs } from '#/ecs';
import { posGridToReal } from '#/utils/map.utils';
import { WorldPathfinderEcs } from '../../world/world-grid.ecs';
import { CharacterBodyServerEcs } from '../CharacterBodyServer.ecs';
import { MovementServerEcs } from '../MovementServer.ecs';
import type { IFollowOption } from './follow-option.interface';
import { StopMovementOption } from './stop-movement.class';

export class FollowPathEcs extends ComponentEcs {
	private pathfinder: WorldPathfinderEcs = null!;

	private movement: MovementServerEcs = null!;
	private character: CharacterBodyServerEcs = null!;

	public path: [number, number][] = [];
	public option: IFollowOption;

	constructor() {
		super();
		this.option = new StopMovementOption();
	}

	onStart(): void {
		this.pathfinder = this.world
			.get(WorldPathfinderEcs)
			.unwrap('WorldPathfinderEcs not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		this.movement = parent
			.get(MovementServerEcs)
			.unwrap('MovementServerEcs not found');

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');
	}

	timeSinceLast = 0;
	followPath(_delta: number) {
		this.timeSinceLast += _delta / 1000;
		if (this.path.length === 0) return;

		const nextGridPoint = this.path[0];
		const nextRealPoint = posGridToReal(
			{
				x: nextGridPoint[0],
				y: nextGridPoint[1],
			},
			this.pathfinder.map,
		);

		const realPosition = this.character.body.translation();

		const dirX = nextRealPoint.x - realPosition.x;
		const dirZ = nextRealPoint.z - realPosition.z;

		const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);

		if (distance < 0.1) {
			this.timeSinceLast = 0;
			this.path.shift();
			this.movement.movementState.isMoving = false;
			return;
		}

		const normDirX = dirX / distance;
		const normDirZ = dirZ / distance;

		this.character.characterState.rotationY = -Math.atan2(normDirZ, normDirX);
		this.movement.clientDirection.x = normDirX;
		this.movement.clientDirection.y = normDirZ;
		this.movement.movementState.isMoving = true;
	}

	onLoop(_delta: number): void {
		this.option.loop(_delta);

		this.followPath(_delta);
	}
}
