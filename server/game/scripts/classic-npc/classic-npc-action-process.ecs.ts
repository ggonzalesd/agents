import type { z } from 'zod';

import { ComponentEcs, type EntityEcs } from '#/ecs';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';
import { actionsSchema } from '#/schema/actions.schema';
import { Option } from '#/utils/Option';
import { ITEM_REGISTRY } from '#/state/item-registry';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { FollowPositionOption } from '../entity/follow-path/follow-position.class';
import { StopMovementOption } from '../entity/follow-path/stop-movement.class';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { EntityPathfinderEcs } from '../entity/entity-pathfinder.ecs';
import { ClassicNPCBehaviorStateEcs } from './classic-npc-behavior-state.ecs';

type ClassicNpcAction = z.infer<typeof actionsSchema>;

export class ClassicNPCActionProcessEcs extends ComponentEcs {
	private static readonly CLOSE_TO_ENTITY_DISTANCE = 1.5;
	private behaviorStateEcs: ClassicNPCBehaviorStateEcs = null!;
	private serverData: ServerDataEcs = null!;
	private entityParent: EntityEcs = null!;

	onStart(): void {
		this.entityParent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found for ClassicNPCActionProcessEcs');

		this.behaviorStateEcs = this.entityParent
			.get(ClassicNPCBehaviorStateEcs)
			.unwrap('ClassicNPCBehaviorStateEcs not found on parent entity');

		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');
	}

	private resolvePathfinder(): Option<IPathfinder> {
		const entityPathfinder = this.entityParent
			.get(EntityPathfinderEcs)
			.map((c) => c.pathfinder);

		if (entityPathfinder.isSome()) return entityPathfinder;

		return this.world.get(WorldPathfinderEcs).map((w) => w as IPathfinder);
	}

	private getEquippedDamage(): number {
		const item = this.entityParent
			.get(InventoryServerEcs)
			.map((inv) => inv.inventoryState.items.get('0'))
			.raw();
		const def = item ? ITEM_REGISTRY[item.type] : undefined;
		return CharacterBodyServerEcs.ATTACK_DAMAGE + (def?.damage ?? 0);
	}

	private attackTargetEntity(entityId: string): void {
		Option.zip({
			self: this.entityParent.get(CharacterBodyServerEcs),
			target: this.world
				.getEntity(entityId)
				.map((entity) => entity.get(CharacterBodyServerEcs))
				.collapse(),
		}).ifSome(({ self, target }) => {
			const myPos = self.body.translation();
			const targetPos = target.body.translation();
			const dx = targetPos.x - myPos.x;
			const dz = targetPos.z - myPos.z;
			self.characterState.rotationY = -Math.atan2(dz, dx);
			self.attack(entityId, this.getEquippedDamage());
		});
	}

	private processAction(action: ClassicNpcAction): void {
		if (action.type === 'talk') {
			this.serverData.room.broadcast('agent:message', {
				id: this.parent,
				message: action.content,
			});
			return;
		}

		if (action.type === 'think') {
			this.serverData.room.broadcast('agent:thought', {
				id: this.parent,
				message: action.content,
			});
			return;
		}

		if (action.type === 'attack') {
			this.entityParent.get(CharacterBodyServerEcs).ifSome((character) => {
				character.attack(action.entityId, this.getEquippedDamage());
			});
			return;
		}

		if (action.type === 'attack-entity') {
			this.attackTargetEntity(action.entityId);
			return;
		}

		if (action.type === 'look-at-position') {
			this.entityParent.get(CharacterBodyServerEcs).ifSome((character) => {
				const myPos = character.body.translation();
				const dx = action.x - myPos.x;
				const dz = action.z - myPos.z;
				character.characterState.rotationY = -Math.atan2(dz, dx);
			});
			return;
		}

		if (action.type === 'look-at-entity') {
			Option.zip({
				self: this.entityParent.get(CharacterBodyServerEcs),
				target: this.world
					.getEntity(action.entityId)
					.map((entity) => entity.get(CharacterBodyServerEcs))
					.collapse(),
			}).ifSome(({ self, target }) => {
				const myPos = self.body.translation();
				const targetPos = target.body.translation();
				const dx = targetPos.x - myPos.x;
				const dz = targetPos.z - myPos.z;
				self.characterState.rotationY = -Math.atan2(dz, dx);
			});
			return;
		}

		if (action.type === 'move-follow-entity') {
			Option.zip({
				target: this.world.getEntity(action.entityId),
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.resolvePathfinder(),
			}).ifSome((zipped) => {
				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
				});
		});
			return;
		}

		if (action.type === 'move-close-to-entity') {
			Option.zip({
				target: this.world.getEntity(action.entityId),
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.resolvePathfinder(),
			}).ifSome((zipped) => {
				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
					stoppingDistance:
						ClassicNPCActionProcessEcs.CLOSE_TO_ENTITY_DISTANCE,
				});
			});
			return;
		}

		if (action.type === 'move-away-from-entity') {
			Option.zip({
				target: this.world.getEntity(action.entityId),
				followPath: this.entityParent.get(FollowPathEcs),
				pathfinder: this.resolvePathfinder(),
			}).ifSome((zipped) => {
				zipped.followPath.option = new FollowEntityOption({
					...zipped,
					entity: this.entityParent,
					stoppingDistance: action.distance,
					flee: true,
				});
			});
			return;
		}

		if (action.type === 'move-to-point') {
			this.entityParent.get(FollowPathEcs).ifSome((followPath) => {
				const pathfinderOpt = this.resolvePathfinder();
				if (pathfinderOpt.isNone()) return;
				followPath.option = new FollowPositionOption({
					pathfinder: pathfinderOpt.unwrap(),
					followPath,
					position: { x: action.x, z: action.z },
					entity: this.entityParent,
				});
			});
			return;
		}

		if (action.type === 'move-stop') {
			this.entityParent.get(FollowPathEcs).ifSome((followPath) => {
				followPath.option = new StopMovementOption();
			});
			return;
		}

		if (action.type === 'jump') {
			this.entityParent.get(MovementServerEcs).ifSome((movement) => {
				movement.movementState.isJumping = true;
			});
			return;
		}

		if (action.type === 'pick-item') {
			this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
				const slot = inventory.getAvailableSlot();
				if (slot != null) {
					inventory.pickItemEntity(action.itemId, slot);
				}
			});
			return;
		}

		if (action.type === 'drop-item') {
			this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
				inventory.dropItem(action.slot);
			});
			return;
		}

		if (action.type === 'move-item') {
			this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
				inventory.moveItem(action.fromSlot, action.toSlot);
			});
			return;
		}

		if (action.type === 'split-item') {
			this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
				inventory.splitItem(action.fromSlot, action.toSlot, action.quantity);
			});
			return;
		}

		if (action.type === 'consume-item') {
			this.entityParent.get(InventoryServerEcs).ifSome((inventory) => {
				const result = inventory.consumeItem(action.slot);
				if (result.success) {
					this.serverData.room.broadcast('agent:consume', {
						id: this.parent,
						itemType: result.itemType,
					});
					return;
				}

				this.serverData.room.broadcast('agent:consume-error', {
					id: this.parent,
					message: result.message,
				});
			});
		}
	}

	onLoop(): void {
		const actions = this.behaviorStateEcs.flushActions();
		for (const action of actions) {
			this.processAction(action);
		}
	}
}
