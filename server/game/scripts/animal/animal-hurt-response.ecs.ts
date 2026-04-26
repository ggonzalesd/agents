import { ComponentEcs, type EntityEcs } from '#/ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { StopMovementOption } from '../entity/follow-path/stop-movement.class';
import { AnimalProfileEcs } from './animal-profile.ecs';
import { AnimalStateEcs } from './animal-state.ecs';

export class AnimalHurtResponseEcs extends ComponentEcs {
	private entityParent: EntityEcs = null!;
	private character: CharacterBodyServerEcs = null!;
	private followPath: FollowPathEcs = null!;
	private profile: AnimalProfileEcs = null!;
	private animalState: AnimalStateEcs = null!;

	onStart(): void {
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
	}

	onLoop(_delta: number): void {
		const now = Date.now();

		if (this.animalState.mode === 'stare') {
			const attacker = this.animalState.lastAttackerId
				? this.world.getEntity(this.animalState.lastAttackerId).raw()
				: null;

			const attackerBody = attacker?.get(CharacterBodyServerEcs).raw();
			if (attackerBody) {
				const myPos = this.character.body.translation();
				const targetPos = attackerBody.body.translation();
				const dx = targetPos.x - myPos.x;
				const dz = targetPos.z - myPos.z;
				this.character.characterState.rotationY = -Math.atan2(dz, dx);
			}

			if (now >= this.animalState.stareUntil) {
				this.animalState.mode = 'flee';
			}

			return;
		}

		if (this.animalState.lastAttackedAt <= this.animalState.lastHandledAttackAt) {
			return;
		}

		this.animalState.lastHandledAttackAt = this.animalState.lastAttackedAt;
		this.animalState.mode = 'threatened';
		this.animalState.panicUntil = now + this.profile.profile.panicDurationMs;
		this.animalState.counterAttackDone = false;

		const attacker = this.animalState.lastAttackerId
			? this.world.getEntity(this.animalState.lastAttackerId).raw()
			: null;

		if (!attacker) {
			this.animalState.mode = 'flee';
			return;
		}

		const attackerBody = attacker.get(CharacterBodyServerEcs).raw();
		if (!attackerBody) {
			this.animalState.mode = 'flee';
			return;
		}

		const myPos = this.character.body.translation();
		const targetPos = attackerBody.body.translation();
		const dx = targetPos.x - myPos.x;
		const dz = targetPos.z - myPos.z;
		const distance = Math.hypot(dx, dz);

		if (distance <= this.profile.profile.counterAttackRadius) {
			this.followPath.option = new StopMovementOption();
			this.character.characterState.rotationY = -Math.atan2(dz, dx);
			this.character.attack(attacker.name);
			this.animalState.counterAttackDone = true;
			this.animalState.mode = 'stare';
			this.animalState.stareUntil =
				now + this.profile.profile.stareAfterAttackMs;
			return;
		}

		this.animalState.mode = 'flee';
	}
}
