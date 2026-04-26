import { ComponentEcs, type EntityEcs } from '#/ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { StopMovementOption } from '../entity/follow-path/stop-movement.class';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { PlayerServerBehavior } from '../player/playerServerBehavior.ecs';
import { NpcServerBehavior } from '../npc/npcServerBehavior.ecs';
import { AnimalProfileEcs } from './animal-profile.ecs';
import { AnimalStateEcs } from './animal-state.ecs';

export class AnimalChargeBehaviorEcs extends ComponentEcs {
	private pathfinder: WorldPathfinderEcs = null!;
	private entityParent: EntityEcs = null!;
	private character: CharacterBodyServerEcs = null!;
	private followPath: FollowPathEcs = null!;
	private profile: AnimalProfileEcs = null!;
	private animalState: AnimalStateEcs = null!;
	private movement: MovementServerEcs = null!;
	private lastChargeCommandAt = 0;
	private lastAttackAt = 0;

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
		const chargeConfig = this.profile.profile.charge;
		if (!chargeConfig) return;

		if (
			this.animalState.mode === 'flee' ||
			this.animalState.mode === 'threatened' ||
			this.animalState.mode === 'stare'
		) {
			return;
		}

		const now = Date.now();
		const myPos = this.character.body.translation();
		const { chargeRadius, chargeRecoverMs } = chargeConfig;
		const { counterAttackRadius, attackDamage } = this.profile.profile;

		const target = this.findClosestThreat(myPos, chargeRadius);

		if (!target) {
			if (this.animalState.mode === 'charge') {
				const elapsed = now - this.animalState.lastThreatAt;
				if (elapsed >= chargeRecoverMs) {
					this.animalState.mode = 'idle';
					this.movement.movementState.isRunning = false;
					this.followPath.option = new StopMovementOption();
				}
			}
			return;
		}

		this.animalState.mode = 'charge';
		this.animalState.lastThreatAt = now;
		this.animalState.threatEntityId = target.name;
		this.movement.movementState.isRunning = true;

		const targetBody = target.get(CharacterBodyServerEcs).raw();
		if (targetBody) {
			const targetPos = targetBody.body.translation();
			const distance = Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z);

			if (distance <= counterAttackRadius && now - this.lastAttackAt >= 1000) {
				this.character.characterState.rotationY = -Math.atan2(
					targetPos.z - myPos.z,
					targetPos.x - myPos.x,
				);
				this.character.attack(target.name, attackDamage);
				this.lastAttackAt = now;
			}
		}

		if (now - this.lastChargeCommandAt >= 1000 || this.followPath.option.isDone()) {
			this.followPath.option = new FollowEntityOption({
				pathfinder: this.pathfinder,
				followPath: this.followPath,
				target,
				entity: this.entityParent,
				stoppingDistance: counterAttackRadius * 0.8,
				flee: false,
			});
			this.lastChargeCommandAt = now;
		}
	}

	private findClosestThreat(
		myPos: { x: number; y: number; z: number },
		chargeRadius: number,
	): EntityEcs | null {
		let closestEntity: EntityEcs | null = null;
		let closestDistance = Infinity;

		const checkEntity = (entity: EntityEcs, body: CharacterBodyServerEcs) => {
			if (entity.name === this.parent) return;
			if (body.isDead) return;
			const pos = body.body.translation();
			const distance = Math.hypot(pos.x - myPos.x, pos.z - myPos.z);
			if (distance < chargeRadius && distance < closestDistance) {
				closestDistance = distance;
				closestEntity = entity;
			}
		};

		this.world
			.getEntityLike({ behavior: PlayerServerBehavior, character: CharacterBodyServerEcs })
			.forEach(({ entity, components }) => checkEntity(entity, components.character));

		this.world
			.getEntityLike({ behavior: NpcServerBehavior, character: CharacterBodyServerEcs })
			.forEach(({ entity, components }) => checkEntity(entity, components.character));

		return closestEntity;
	}
}
