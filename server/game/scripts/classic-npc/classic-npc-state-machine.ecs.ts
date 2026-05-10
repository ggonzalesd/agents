import { ComponentEcs, type EntityEcs } from '#/ecs';
import { Option } from '#/utils/Option';
import { PICKUP_GRACE_PERIOD_MS } from '#/state/inventory.state';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { AnimalStateEcs } from '../animal/animal-state.ecs';
import { TreeServerBehavior } from '../tree/treeServerBehavior.ecs';
import { BoxServerBehavior } from '../box/boxServerBehavior.ecs';
import { ItemServerBehavior } from '../item/itemServerBehavior.ecs';
import { ClassicNPCBehaviorStateEcs } from './classic-npc-behavior-state.ecs';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { ClassicNpcBehaviorState } from './classic-npc.types';
import {
	WorldEventBusEcs,
	WorldEventType,
	type EntityDamagedPayload,
} from '../world-event-bus.ecs';

type TargetCandidate = {
	entity: EntityEcs;
	distance: number;
};

export class ClassicNPCStateMachineEcs extends ComponentEcs {
	private static readonly PATROL_DELAY_MIN_MS = 2_000;
	private static readonly PATROL_DELAY_MAX_MS = 5_000;

	private entityParent: EntityEcs = null!;
	private character: CharacterBodyServerEcs = null!;
	private behaviorStateEcs: ClassicNPCBehaviorStateEcs = null!;
	private eventBus: WorldEventBusEcs = null!;
	private unsubscribeDamage: (() => void) | null = null;
	private pendingAttackerId: string | null = null;
	private _disabled = false;

	// COLLECTOR behavior fields
	private harvestInterestUntil = 0;
	private harvestTargetId: string | null = null;
	private collectTargetId: string | null = null;
	private harvestUntilAt = 0;

	onStart(): void {
		this.entityParent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found for ClassicNPCStateMachineEcs');

		this.character = this.entityParent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found on classic NPC');

		this.behaviorStateEcs = this.entityParent
			.get(ClassicNPCBehaviorStateEcs)
			.unwrap('ClassicNPCBehaviorStateEcs not found on classic NPC');

		this.eventBus = this.world
			.get(WorldEventBusEcs)
			.unwrap('WorldEventBusEcs not found');

		this.unsubscribeDamage = this.eventBus.on<EntityDamagedPayload>(
			WorldEventType.EntityDamaged,
			(entityName, payload) => {
				if (entityName !== this.parent) return;
				this.pendingAttackerId = payload.attackerId;
			},
		);

		this.callOnDelete(() => {
			this.unsubscribeDamage?.();
		});

		this.transitionTo(ClassicNpcBehaviorState.IDLE);
	}

	private scheduleNextPatrol(now: number): void {
		const delay =
			ClassicNPCStateMachineEcs.PATROL_DELAY_MIN_MS +
			Math.floor(
				Math.random() *
					(ClassicNPCStateMachineEcs.PATROL_DELAY_MAX_MS -
						ClassicNPCStateMachineEcs.PATROL_DELAY_MIN_MS),
			);
		this.behaviorStateEcs.nextPatrolAt = now + delay;
	}

	private transitionTo(state: ClassicNpcBehaviorState): void {
		const currentTargetId = this.behaviorStateEcs.targetEntityId;
		this.behaviorStateEcs.setState(state);

		if (state === ClassicNpcBehaviorState.IDLE) {
			this.behaviorStateEcs.patrolTarget = null;
			this.behaviorStateEcs.queueAction({ type: 'move-stop' });
			this.scheduleNextPatrol(Date.now());
			return;
		}

		if (state === ClassicNpcBehaviorState.PATROL) {
			const patrolTarget = this.pickPatrolTarget();
			this.behaviorStateEcs.patrolTarget = patrolTarget;
			this.behaviorStateEcs.queueAction({
				type: 'move-to-point',
				x: patrolTarget.x,
				z: patrolTarget.z,
			});
			return;
		}

		if (state === ClassicNpcBehaviorState.ALERT && currentTargetId) {
			this.behaviorStateEcs.queueAction({
				type: 'look-at-entity',
				entityId: currentTargetId,
			});
			return;
		}

		if (state === ClassicNpcBehaviorState.CHASE && currentTargetId) {
			this.behaviorStateEcs.queueAction({
				type: 'move-follow-entity',
				entityId: currentTargetId,
			});
			return;
		}

		if (state === ClassicNpcBehaviorState.ATTACK) {
			this.behaviorStateEcs.nextAttackAt = 0;
			this.behaviorStateEcs.queueAction({ type: 'move-stop' });
			return;
		}

		if (state === ClassicNpcBehaviorState.FLEE && currentTargetId) {
			this.behaviorStateEcs.queueAction({
				type: 'move-away-from-entity',
				entityId: currentTargetId,
				distance: Math.max(
					this.behaviorStateEcs.config.detectionRange,
					this.behaviorStateEcs.config.attackRange * 2,
				),
			});
			return;
		}

		if (state === ClassicNpcBehaviorState.RETURN) {
			this.behaviorStateEcs.queueAction({
				type: 'move-to-point',
				x: this.behaviorStateEcs.spawnPoint.x,
				z: this.behaviorStateEcs.spawnPoint.z,
			});
		}

		if (state === ClassicNpcBehaviorState.COLLECT && this.collectTargetId) {
			this.behaviorStateEcs.queueAction({
				type: 'move-close-to-entity',
				entityId: this.collectTargetId,
			});
		}

		if (state === ClassicNpcBehaviorState.HARVEST && this.harvestTargetId) {
			this.behaviorStateEcs.queueAction({
				type: 'move-close-to-entity',
				entityId: this.harvestTargetId,
			});
		}
	}

	private pickPatrolTarget(): { x: number; z: number } {
		const radius = this.behaviorStateEcs.config.patrolRadius;
		const origin = this.behaviorStateEcs.spawnPoint;
		if (radius <= 0) {
			return { x: origin.x, z: origin.z };
		}

		const angle = Math.random() * Math.PI * 2;
		const distance = Math.random() * radius;
		return {
			x: origin.x + Math.cos(angle) * distance,
			z: origin.z + Math.sin(angle) * distance,
		};
	}

	private distanceToPoint(point: { x: number; z: number }): number {
		const position = this.character.body.translation();
		return Math.hypot(position.x - point.x, position.z - point.z);
	}

	private getTargetCandidateById(entityId: string): TargetCandidate | null {
		const target = this.world.getEntity(entityId).raw();
		if (!target) {
			return null;
		}

		const targetCharacter = target.get(CharacterBodyServerEcs).raw();
		if (!targetCharacter || targetCharacter.isDead) {
			return null;
		}

		const myPos = this.character.body.translation();
		const targetPos = targetCharacter.body.translation();
		return {
			entity: target,
			distance: Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z),
		};
	}

	private findNearestEntity(maxDistance: number): TargetCandidate | null {
		const myPos = this.character.body.translation();
		const candidates = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity, component }) => {
				return entity.name !== this.parent && !component.isDead;
			})
			.map(({ entity, component }) => {
				const targetPos = component.body.translation();
				return {
					entity,
					distance: Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z),
				};
			})
			.filter((candidate) => candidate.distance <= maxDistance)
			.sort((left, right) => left.distance - right.distance);

		return candidates[0] ?? null;
	}

	private findNearestAnimal(maxDistance: number): TargetCandidate | null {
		const myPos = this.character.body.translation();
		const candidates = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity, component }) => {
				if (entity.name === this.parent || component.isDead) return false;
				return entity.get(AnimalStateEcs).raw() != null;
			})
			.map(({ entity, component }) => {
				const targetPos = component.body.translation();
				return {
					entity,
					distance: Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z),
				};
			})
			.filter((candidate) => candidate.distance <= maxDistance)
			.sort((left, right) => left.distance - right.distance);

		return candidates[0] ?? null;
	}

	private findNearestItem(maxDistance: number): TargetCandidate | null {
		const myPos = this.character.body.translation();
		const now = Date.now();
		const candidates = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity }) => {
				if (entity.name === this.parent) return false;
				const itemBehavior = entity.get(ItemServerBehavior).raw();
				if (!itemBehavior) return false;
				if (now - itemBehavior.state.createdAtMs < PICKUP_GRACE_PERIOD_MS) return false;
				return true;
			})
			.map(({ entity, component }) => {
				const targetPos = component.body.translation();
				return {
					entity,
					distance: Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z),
				};
			})
			.filter((candidate) => candidate.distance <= maxDistance)
			.sort((left, right) => left.distance - right.distance);

		return candidates[0] ?? null;
	}

	private findNearestBox(maxDistance: number): TargetCandidate | null {
		const myPos = this.character.body.translation();
		const candidates = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity, component }) => {
				if (entity.name === this.parent || component.isDead) return false;
				return entity.get(BoxServerBehavior).raw() != null;
			})
			.map(({ entity, component }) => {
				const targetPos = component.body.translation();
				return {
					entity,
					distance: Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z),
				};
			})
			.filter((candidate) => candidate.distance <= maxDistance)
			.sort((left, right) => left.distance - right.distance);

		return candidates[0] ?? null;
	}

	private findNearestTree(maxDistance: number): TargetCandidate | null {
		const myPos = this.character.body.translation();
		const candidates = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity }) => {
				if (entity.name === this.parent) return false;
				return entity.get(TreeServerBehavior).raw() != null;
			})
			.map(({ entity, component }) => {
				const targetPos = component.body.translation();
				return {
					entity,
					distance: Math.hypot(targetPos.x - myPos.x, targetPos.z - myPos.z),
				};
			})
			.filter((candidate) => candidate.distance <= maxDistance)
			.sort((left, right) => left.distance - right.distance);

		return candidates[0] ?? null;
	}

	private shouldFlee(): boolean {
		const threshold = this.behaviorStateEcs.config.fleeHealthPercent;
		if (threshold == null) {
			return false;
		}

		const currentLifePercent =
			(this.character.characterState.life /
				this.character.characterState.maxLife) *
			100;

		return currentLifePercent <= threshold;
	}

	private canPatrol(): boolean {
		return this.behaviorStateEcs.config.patrolRadius > 0;
	}

	private beginCombat(target: TargetCandidate, now: number): void {
		this.behaviorStateEcs.targetEntityId = target.entity.name;
		this.behaviorStateEcs.attackUntilAt =
			now + this.behaviorStateEcs.config.attackDurationSec * 1000;
		this.transitionTo(ClassicNpcBehaviorState.ALERT);
	}

	private clearTarget(): void {
		this.behaviorStateEcs.targetEntityId = null;
	}

	private resolveReactiveTarget(now: number): void {
		const attackerId = this.pendingAttackerId;
		this.pendingAttackerId = null;
		if (!attackerId) return;

		const type = this.behaviorStateEcs.config.behaviorType;

		if (type === ClassicNpcBehaviorType.PASSIVE) return;

		if (type === ClassicNpcBehaviorType.HUNTER) {
			const target = this.getTargetCandidateById(attackerId);
			if (target && target.entity.get(AnimalStateEcs).raw() != null) {
				this.beginCombat(target, now);
			}
			return;
		}

		const target = this.getTargetCandidateById(attackerId);
		if (!target) return;

		const hasActiveTarget = this.behaviorStateEcs.targetEntityId != null;

		if (type === ClassicNpcBehaviorType.AGGRESSIVE && hasActiveTarget) return;

		this.beginCombat(target, now);
	}

	private resolveProactiveTarget(now: number): void {
		if (this.behaviorStateEcs.targetEntityId != null) return;

		const type = this.behaviorStateEcs.config.behaviorType;

		if (type === ClassicNpcBehaviorType.AGGRESSIVE) {
			const target = this.findNearestEntity(
				this.behaviorStateEcs.config.aggroRange,
			);
			if (target) this.beginCombat(target, now);
			return;
		}

		if (type === ClassicNpcBehaviorType.HUNTER) {
			const target = this.findNearestAnimal(
				this.behaviorStateEcs.config.aggroRange,
			);
			if (target) {
				this.beginCombat(target, now);
			}
		}

		if (type === ClassicNpcBehaviorType.COLLECTOR) {
			const aggroRange = this.behaviorStateEcs.config.aggroRange;

			// 1. Items en suelo (mayor prioridad)
			const item = this.findNearestItem(aggroRange);
			if (item) {
				this.collectTargetId = item.entity.name;
				this.transitionTo(ClassicNpcBehaviorState.COLLECT);
				return;
			}

			// 2. Cajas
			const box = this.findNearestBox(aggroRange);
			if (box) {
				this.harvestTargetId = box.entity.name;
				this.harvestUntilAt =
					now + this.behaviorStateEcs.config.attackDurationSec * 1000;
				this.transitionTo(ClassicNpcBehaviorState.HARVEST);
				return;
			}

			// 3. Árboles (sí no hay cooldown global)
			if (this.harvestInterestUntil < now) {
				const tree = this.findNearestTree(aggroRange);
				if (tree) {
					this.harvestTargetId = tree.entity.name;
					this.harvestUntilAt =
						now + this.behaviorStateEcs.config.attackDurationSec * 1000;
					this.transitionTo(ClassicNpcBehaviorState.HARVEST);
					return;
				}
			}
		}
	}

	public disable(playerEntityId: string): void {
		this._disabled = true;
		this.behaviorStateEcs.queueAction({ type: 'move-stop' });
		this.behaviorStateEcs.queueAction({ type: 'look-at-entity', entityId: playerEntityId });
	}

	public enable(): void {
		this._disabled = false;
	}

	onLoop(): void {
		if (this._disabled) return;

		if (this.character.isDead) {
			this.clearTarget();
			this.transitionTo(ClassicNpcBehaviorState.IDLE);
			return;
		}

		const now = Date.now();
		this.resolveReactiveTarget(now);
		this.resolveProactiveTarget(now);

		const target = Option.of(this.behaviorStateEcs.targetEntityId)
			.map((entityId) => this.getTargetCandidateById(entityId))
			.raw();

		if (
			target &&
			target.distance > this.behaviorStateEcs.config.detectionRange * 2
		) {
			this.clearTarget();
			this.transitionTo(ClassicNpcBehaviorState.RETURN);
			return;
		}

		if (
			target &&
			this.shouldFlee() &&
			this.behaviorStateEcs.currentState !== ClassicNpcBehaviorState.FLEE
		) {
			this.transitionTo(ClassicNpcBehaviorState.FLEE);
		}

		if (
			this.behaviorStateEcs.attackUntilAt > 0 &&
			now > this.behaviorStateEcs.attackUntilAt &&
			this.behaviorStateEcs.currentState !== ClassicNpcBehaviorState.RETURN &&
			this.behaviorStateEcs.currentState !== ClassicNpcBehaviorState.IDLE
		) {
			this.clearTarget();
			this.transitionTo(ClassicNpcBehaviorState.RETURN);
			return;
		}

		switch (this.behaviorStateEcs.currentState) {
			case ClassicNpcBehaviorState.IDLE:
				if (target) {
					this.transitionTo(ClassicNpcBehaviorState.ALERT);
					break;
				}

				if (this.canPatrol() && now >= this.behaviorStateEcs.nextPatrolAt) {
					this.transitionTo(ClassicNpcBehaviorState.PATROL);
				}
				break;

			case ClassicNpcBehaviorState.PATROL:
				if (target) {
					this.transitionTo(ClassicNpcBehaviorState.ALERT);
					break;
				}

				if (
					this.behaviorStateEcs.patrolTarget &&
					this.distanceToPoint(this.behaviorStateEcs.patrolTarget) <= 1.5
				) {
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
				}
				break;

			case ClassicNpcBehaviorState.ALERT:
				if (!target) {
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
					break;
				}

				if (target.distance <= this.behaviorStateEcs.config.attackRange) {
					this.transitionTo(ClassicNpcBehaviorState.ATTACK);
					break;
				}

				this.transitionTo(ClassicNpcBehaviorState.CHASE);
				break;

			case ClassicNpcBehaviorState.CHASE:
				if (!target) {
					this.clearTarget();
					this.transitionTo(ClassicNpcBehaviorState.RETURN);
					break;
				}

				if (target.distance <= this.behaviorStateEcs.config.attackRange) {
					this.transitionTo(ClassicNpcBehaviorState.ATTACK);
				}
				break;

			case ClassicNpcBehaviorState.ATTACK:
				if (!target) {
					this.clearTarget();
					this.transitionTo(ClassicNpcBehaviorState.RETURN);
					break;
				}

				if (target.distance > this.behaviorStateEcs.config.attackRange) {
					this.transitionTo(ClassicNpcBehaviorState.CHASE);
					break;
				}

				if (now >= this.behaviorStateEcs.nextAttackAt) {
					this.behaviorStateEcs.nextAttackAt =
						now + this.behaviorStateEcs.config.attackCooldownMs;
					this.behaviorStateEcs.queueAction({
						type: 'attack-entity',
						entityId: target.entity.name,
					});
				}
				break;

			case ClassicNpcBehaviorState.FLEE:
				if (!target) {
					this.clearTarget();
					this.transitionTo(ClassicNpcBehaviorState.RETURN);
					break;
				}

				if (target.distance >= this.behaviorStateEcs.config.detectionRange) {
					this.clearTarget();
					this.transitionTo(ClassicNpcBehaviorState.RETURN);
				}
				break;

			case ClassicNpcBehaviorState.RETURN:
				if (this.distanceToPoint(this.behaviorStateEcs.spawnPoint) <= 1.5) {
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
				}
				break;

			case ClassicNpcBehaviorState.COLLECT: {
				if (!this.collectTargetId) {
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
					break;
				}

				const collectTarget = this.getTargetCandidateById(this.collectTargetId);
				if (!collectTarget) {
					this.collectTargetId = null;
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
					break;
				}

				if (collectTarget.distance <= 1.5) {
					this.behaviorStateEcs.queueAction({
						type: 'pick-item',
						itemId: this.collectTargetId,
						slot: 0,
					});
					this.collectTargetId = null;
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
				}
				break;
			}

			case ClassicNpcBehaviorState.HARVEST: {
				if (!this.harvestTargetId) {
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
					break;
				}

				if (now > this.harvestUntilAt) {
					this.harvestInterestUntil = now + 10_000;
					this.harvestTargetId = null;
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
					break;
				}

				const harvestTarget = this.getTargetCandidateById(this.harvestTargetId);
				if (!harvestTarget) {
					this.harvestTargetId = null;
					this.transitionTo(ClassicNpcBehaviorState.IDLE);
					break;
				}

				if (harvestTarget.distance <= 2) {
					if (now >= this.behaviorStateEcs.nextAttackAt) {
						this.behaviorStateEcs.nextAttackAt =
							now + this.behaviorStateEcs.config.attackCooldownMs;
						this.behaviorStateEcs.queueAction({
							type: 'attack-entity',
							entityId: this.harvestTargetId,
						});
					}
				}
				break;
			}
		}
	}
}
