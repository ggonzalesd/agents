import { ComponentEcs, type EntityEcs } from '#/ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { StopMovementOption } from '../entity/follow-path/stop-movement.class';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { PlayerServerBehavior } from '../player/playerServerBehavior.ecs';
import { AnimalProfileEcs } from './animal-profile.ecs';
import { AnimalStateEcs } from './animal-state.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';

export class AnimalFleeBehaviorEcs extends ComponentEcs {
	private pathfinder: WorldPathfinderEcs = null!;
	private entityParent: EntityEcs = null!;
	private character: CharacterBodyServerEcs = null!;
	private followPath: FollowPathEcs = null!;
	private profile: AnimalProfileEcs = null!;
	private animalState: AnimalStateEcs = null!;
	private movement: MovementServerEcs = null!;
	private lastFleeCommandAt = 0;

	onStart(): void {
		this.pathfinder = this.world
			.get(WorldPathfinderEcs)
			.unwrap('WorldPathfinderEcs not found');

		this.entityParent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found');

		this.character = this.entityParent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');

		this.followPath = this.entityParent
			.get(FollowPathEcs)
			.unwrap('FollowPathEcs not found');

		this.profile = this.entityParent
			.get(AnimalProfileEcs)
			.unwrap('AnimalProfileEcs not found');

		this.animalState = this.entityParent
			.get(AnimalStateEcs)
			.unwrap('AnimalStateEcs not found');

		this.movement = this.entityParent
			.get(MovementServerEcs)
			.unwrap('MovementServerEcs not found');
	}

	onLoop(_delta: number): void {
		if (!this.profile.profile.canFlee) return;

		const now = Date.now();
		const myPosition = this.character.body.translation();
		const panicActive = now < this.animalState.panicUntil;

		if (this.animalState.mode === 'stare') {
			return;
		}

		const attackerThreat = this.animalState.lastAttackerId
			? this.world
				.getEntity(this.animalState.lastAttackerId)
				.map((entity) => ({ entity }))
				.raw()
			: null;

		const closestThreat = this.world
			.getEntityLike({
				behavior: PlayerServerBehavior,
				character: CharacterBodyServerEcs,
			})
			.map(({ entity, components }) => ({
				entity,
				distance: Math.hypot(
					components.character.body.translation().x - myPosition.x,
					components.character.body.translation().z - myPosition.z,
				),
			}))
			.filter(({ distance }) => distance <= this.profile.profile.threatRadius)
			.toSorted((a, b) => a.distance - b.distance)[0];

		const activeThreat = attackerThreat?.entity ? attackerThreat : closestThreat;

		if (activeThreat || panicActive) {
			const threatEntity = activeThreat?.entity ?? null;
			this.animalState.mode = 'flee';
			this.animalState.lastThreatAt = now;
			this.animalState.threatEntityId = threatEntity?.name ?? this.animalState.threatEntityId;
			this.movement.movementState.isRunning = true;

			if (
				threatEntity &&
				(now - this.lastFleeCommandAt >= 1000 || this.followPath.option.isDone())
			) {
				this.followPath.option = new FollowEntityOption({
					pathfinder: this.pathfinder,
					followPath: this.followPath,
					target: threatEntity,
					entity: this.entityParent,
					stoppingDistance: this.profile.profile.fleeDistance,
					flee: true,
				});
				this.lastFleeCommandAt = now;
			}

			return;
		}

		if (
			this.animalState.mode === 'flee' &&
			!panicActive &&
			now - this.animalState.lastThreatAt >= this.profile.profile.fleeRecoverMs
		) {
			this.animalState.mode = 'idle';
			this.animalState.threatEntityId = null;
			this.animalState.lastAttackerId = null;
			this.animalState.nextDecisionAt = now + this.profile.profile.minIdleMs;
			this.movement.movementState.isRunning = false;
			this.followPath.option = new StopMovementOption();
		}
	}
}
