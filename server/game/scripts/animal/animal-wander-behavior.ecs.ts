import { ComponentEcs, type EntityEcs } from '#/ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { FollowPositionOption } from '../entity/follow-path/follow-position.class';
import { AnimalProfileEcs } from './animal-profile.ecs';
import { AnimalStateEcs } from './animal-state.ecs';

export class AnimalWanderBehaviorEcs extends ComponentEcs {
	private pathfinder: WorldPathfinderEcs = null!;
	private entityParent: EntityEcs = null!;
	private followPath: FollowPathEcs = null!;
	private profile: AnimalProfileEcs = null!;
	private animalState: AnimalStateEcs = null!;

	onStart(): void {
		this.pathfinder = this.world
			.get(WorldPathfinderEcs)
			.unwrap('WorldPathfinderEcs not found');

		this.entityParent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found');

		this.followPath = this.entityParent
			.get(FollowPathEcs)
			.unwrap('FollowPathEcs not found');

		this.profile = this.entityParent
			.get(AnimalProfileEcs)
			.unwrap('AnimalProfileEcs not found');

		this.animalState = this.entityParent
			.get(AnimalStateEcs)
			.unwrap('AnimalStateEcs not found');

		this.animalState.nextDecisionAt = Date.now() + this.randomIdleMs();
	}

	onLoop(_delta: number): void {
		const now = Date.now();

		if (
			this.animalState.mode === 'flee' ||
			this.animalState.mode === 'threatened' ||
			this.animalState.mode === 'stare'
		) {
			return;
		}

		if (
			this.animalState.mode === 'wander' &&
			this.followPath.option.isDone()
		) {
			this.animalState.mode = 'idle';
			this.animalState.nextDecisionAt = now + this.randomIdleMs();
			return;
		}

		if (this.animalState.mode !== 'idle' || now < this.animalState.nextDecisionAt) {
			return;
		}

		const nextPosition = this.randomPointAroundHome();

		this.followPath.option = new FollowPositionOption({
			pathfinder: this.pathfinder,
			followPath: this.followPath,
			position: nextPosition,
			entity: this.entityParent,
		});

		this.animalState.mode = 'wander';
	}

	private randomIdleMs(): number {
		const { minIdleMs, maxIdleMs } = this.profile.profile;

		return minIdleMs + Math.floor(Math.random() * (maxIdleMs - minIdleMs));
	}

	private randomPointAroundHome(): { x: number; z: number } {
		const angle = Math.random() * Math.PI * 2;
		const distance = Math.random() * this.profile.profile.homeRadius;

		return {
			x: this.animalState.homePosition.x + Math.cos(angle) * distance,
			z: this.animalState.homePosition.z + Math.sin(angle) * distance,
		};
	}
}
