import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { vec3Flatten, vec3Set } from '#/utils/math.util';
import type { IVec3 } from '#/utils/math.util';

import { ServerDataEcs } from '../serverData.ecs';
import type { CharacterBodyState } from '#/state/character-body.state';
import { MovementServerEcs } from './MovementServer.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';
import { TreeServerBehavior } from '../tree/treeServerBehavior.ecs';
import { BoxServerBehavior } from '../box/boxServerBehavior.ecs';
import { AnimalStateEcs } from '../animal/animal-state.ecs';
import {
	WorldEventBusEcs,
	WorldEventType,
	type EntityDamagedPayload,
} from '../world-event-bus.ecs';

interface CharacterBodyConfig {
	bodyType?: 'dynamic' | 'fixed';
	cuboidHalfExtents?: IVec3;
	capsuleRadius?: number;
	capsuleHalfHeight?: number;
	respawnPoint?: IVec3;
	deathBehavior?: 'respawn' | 'delete';
	isSensor?: boolean;
}

interface DamageContext {
	attackerId?: string;
}

export class CharacterBodyServerEcs extends ComponentEcs {
	private deathTimer: ReturnType<typeof setTimeout> | null = null;
	public physic: RAPIER.World = null!;
	public body: RAPIER.RigidBody = null!;
	public collider: RAPIER.Collider = null!;
	public serverData: ServerDataEcs = null!;
	public eventBus: WorldEventBusEcs = null!;

	constructor(
		public characterState: CharacterBodyState,
		private configShape: 'capsule' | 'cuboid' = 'capsule',
		private readonly config: CharacterBodyConfig = {},
	) {
		super();
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.physic = this.world
			.get(ServerDataEcs)
			.map(({ worldPhysic }) => worldPhysic)
			.unwrap('RAPIER World not found');

		this.eventBus = this.world
			.get(WorldEventBusEcs)
			.unwrap('WorldEventBusEcs not found');

		const bodyDesc =
			this.config.bodyType === 'fixed'
				? RAPIER.RigidBodyDesc.fixed()
				: RAPIER.RigidBodyDesc.dynamic();
		bodyDesc.setTranslation(...vec3Flatten(this.characterState.position));
		this.body = this.physic.createRigidBody(bodyDesc);
		this.body.userData = this.parent;

		const cuboidHalfExtents = this.config.cuboidHalfExtents ?? {
			x: 0.25,
			y: 0.25,
			z: 0.25,
		};
		const capsuleRadius = this.config.capsuleRadius ?? 0.5;
		const capsuleHalfHeight = this.config.capsuleHalfHeight ?? 0.5;
		const colliderDesc =
			this.configShape === 'capsule'
				? RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius)
				: RAPIER.ColliderDesc.cuboid(
						cuboidHalfExtents.x,
						cuboidHalfExtents.y,
						cuboidHalfExtents.z,
					).setFriction(2.0);

		if (this.config.isSensor) {
			colliderDesc
				.setSensor(true)
				.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
				.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
		}

		this.collider = this.physic.createCollider(colliderDesc, this.body);

		if (!this.config.isSensor) {
			this.collider.setRestitution(0.5);
		}

		if (this.config.bodyType !== 'fixed') {
			this.body.lockRotations(true, true);
		}

		this.callOnDelete(() => {
			if (this.deathTimer) {
				clearTimeout(this.deathTimer);
				this.deathTimer = null;
			}
			this.physic.removeCollider(this.collider, true);
			this.physic.removeRigidBody(this.body);
		});
	}

	private static readonly VOID_THRESHOLD = -10;

	onLoop(_delta: number): void {
		if (!this.body) return;
		vec3Set(this.characterState.position, this.body.translation());

		if (
			!this.isDead &&
			this.body.translation().y < CharacterBodyServerEcs.VOID_THRESHOLD
		) {
			if (this.parent)
				this.eventBus.emit(WorldEventType.EntityFallVoid, this.parent);
			this.takeDamage(99999);
		}
	}

	private static readonly SPAWN_POINT = { x: 0, y: 2, z: 0 };
	public static readonly ATTACK_DAMAGE = 10;
	private static readonly DEATH_ANIMATION_MS = 600;

	public isDead = false;

	public takeDamage(amount: number, context: DamageContext = {}): void {
		if (this.isDead) return;

		this.characterState.life = Math.max(0, this.characterState.life - amount);

		this.serverData.room.broadcast('agent:damaged', {
			id: this.parent,
			amount,
			newLife: this.characterState.life,
			attackerId: context.attackerId,
		});

		if (this.parent) {
			const payload: EntityDamagedPayload = {
				attackerId: context.attackerId ?? 'unknown',
				amount,
			};
			this.eventBus.emit(WorldEventType.EntityDamaged, this.parent, payload);
		}

		if (context.attackerId) {
			this.world.getEntity(this.parent).ifSome((entity) => {
				entity.get(AnimalStateEcs).ifSome((animalState) => {
					animalState.lastAttackerId = context.attackerId ?? null;
					animalState.lastAttackedAt = Date.now();
					animalState.lastThreatAt = Date.now();
					animalState.threatEntityId = context.attackerId ?? null;
				});
			});
		}

		if (this.characterState.life <= 0) {
			this.isDead = true;
			this.serverData.room.broadcast('agent:died', {
				id: this.parent,
			});

			console.log(`Entity ${this.parent} has died.`);
			if (this.parent) {
				this.eventBus.emit(WorldEventType.EntityDeath, this.parent);
			}

			this.world.getEntity(this.parent).ifSome((entity) => {
				entity.get(NPCEventQueueEcs).ifSome((queue) => {
					queue.pushEvent(
						`You just died and respawned! You were killed.`,
						{ cause: 'death' },
						60,
					);
				});
			});

			this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);

			this.deathTimer = setTimeout(() => {
				if (!this.isDead) return;

				if (this.config.deathBehavior === 'delete') {
					this.world.getEntity(this.parent).ifSome((entity) => {
						this.world.deleteEntity(entity);
					});
					this.deathTimer = null;
					return;
				}

				this.respawn();
				this.isDead = false;
				this.deathTimer = null;
			}, CharacterBodyServerEcs.DEATH_ANIMATION_MS);
		}
	}

	public setRespawnPoint(pos: IVec3): void {
		this.config.respawnPoint = pos;
	}

	public heal(amount: number): void {
		const prev = this.characterState.life;
		this.characterState.life = Math.min(
			this.characterState.maxLife,
			this.characterState.life + amount,
		);
		const healed = this.characterState.life - prev;

		if (healed > 0) {
			this.serverData.room.broadcast('agent:healed', {
				id: this.parent,
				amount: healed,
				newLife: this.characterState.life,
			});
		}
	}

	public respawn(): void {
		const sp = this.config.respawnPoint ?? CharacterBodyServerEcs.SPAWN_POINT;
		this.body.setTranslation({ x: sp.x, y: sp.y, z: sp.z }, true);
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		this.characterState.life = this.characterState.maxLife;

		this.serverData.room.broadcast('agent:respawn', {
			id: this.parent,
		});
	}

	public attack(
		targetId?: string,
		damage: number = CharacterBodyServerEcs.ATTACK_DAMAGE,
		knockbackMultiplier: number = 1,
	): void {
		if (this.isDead) return;
		const position = this.body.translation();
		const rotation = this.characterState.rotationY;
		const rotationY = rotation;

		const offsetDistance = 1.5;
		const offsetX = position.x + offsetDistance * Math.cos(rotationY);
		const offsetZ = position.z - offsetDistance * Math.sin(rotationY);
		const offsetY = position.y + 0.0; // Slightly above ground

		// Attack Every Entity in Range
		const attackRange = 2.0;

		this.serverData.room.broadcast('agent:attack', {
			id: this.parent,
		});

		const candidates = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity }) => entity.name !== this.parent)
			.filter(({ entity }) => (targetId ? entity.name === targetId : true))
			.map(({ entity, component: body }) => {
				const { x, y, z } = body.body.translation();
				const [dx, dy, dz] = [x - offsetX, y - offsetY, z - offsetZ];

				return {
					entity,
					body,
					distance: Math.sqrt(dx * dx + dy * dy + dz * dz),
				};
			})
			.filter(({ distance }) => distance <= attackRange)
			.toSorted((a, b) => a.distance - b.distance);

		for (const { entity, body } of candidates) {
			const box = entity.get(BoxServerBehavior).raw();
			if (box) {
				box.onHit(damage, this.parent ?? 'unknown');
				break;
			}

			const tree = entity.get(TreeServerBehavior).raw();
			if (tree) {
				tree.onHit(this.parent ?? 'unknown');
				break;
			}

			if (!entity.getUnsafe(MovementServerEcs)) continue;

			console.log(`Entity ${entity.name} attacked by ${this.parent}!`);

			body.body.applyImpulse(
				{
					x: Math.cos(rotationY) * 5 * knockbackMultiplier,
					y: 2 * knockbackMultiplier,
					z: -Math.sin(rotationY) * 5 * knockbackMultiplier,
				},
				true,
			);

			body.takeDamage(damage, {
				attackerId: this.parent ?? undefined,
			});

			this.serverData.room.broadcast('agent:attacked', {
				id: entity.name,
			});

			entity.get(NPCEventQueueEcs).ifSome((queue) => {
				queue.pushEvent(
					`You have been attacked! by ${this.parent ?? 'Unknown'}`,
					{ attacker: this.parent },
					15,
				);
			});
			break;
		}
	}
}
