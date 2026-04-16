import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { vec3Flatten, vec3Set } from '#/utils/math.util';

import { ServerDataEcs } from '../serverData.ecs';
import type { CharacterBodyState } from '#/state/character-body.state';
import { MovementServerEcs } from './MovementServer.ecs';
import { NPCEventQueueEcs } from '../ai/npc-event-queue.ecs';

export class CharacterBodyServerEcs extends ComponentEcs {
	public physic: RAPIER.World = null!;
	public body: RAPIER.RigidBody = null!;
	public collider: RAPIER.Collider = null!;
	public serverData: ServerDataEcs = null!;

	constructor(
		public characterState: CharacterBodyState,
		private configShape: 'capsule' | 'cuboid' = 'capsule',
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

		const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
			...vec3Flatten(this.characterState.position),
		);
		this.body = this.physic.createRigidBody(bodyDesc);

		const colliderDesc =
			this.configShape === 'capsule'
				? RAPIER.ColliderDesc.capsule(0.5, 0.5)
				: RAPIER.ColliderDesc.cuboid(0.25, 0.25, 0.25).setFriction(2.0);
		this.collider = this.physic.createCollider(colliderDesc, this.body);

		this.collider.setRestitution(0.5);

		this.body.lockRotations(true, true);

		this.callOnDelete(() => {
			this.physic.removeCollider(this.collider, true);
			this.physic.removeRigidBody(this.body);
		});
	}

	onLoop(_delta: number): void {
		vec3Set(this.characterState.position, this.body.translation());
	}

	private static readonly SPAWN_POINT = { x: 0, y: 2, z: 0 };
	private static readonly ATTACK_DAMAGE = 10;

	public takeDamage(amount: number): void {
		this.characterState.life = Math.max(0, this.characterState.life - amount);

		this.serverData.room.broadcast('agent:damaged', {
			id: this.parent,
			amount,
			newLife: this.characterState.life,
		});

		if (this.characterState.life <= 0) {
			this.world.getEntity(this.parent).ifSome((entity) => {
				entity.get(NPCEventQueueEcs).ifSome((queue) => {
					queue.pushEvent(
						`You just died and respawned! You were killed.`,
						{ cause: 'death' },
						60,
					);
				});
			});
			this.respawn();
		}
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

	private respawn(): void {
		const sp = CharacterBodyServerEcs.SPAWN_POINT;
		this.body.setTranslation({ x: sp.x, y: sp.y, z: sp.z }, true);
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		this.characterState.life = this.characterState.maxLife;

		this.serverData.room.broadcast('agent:respawn', {
			id: this.parent,
		});
	}

	public attack(): void {
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

		this.world
			// Get all entities with CharacterBodyServerEcs and MovementServerEcs
			// INFO: MovementServerEcs is just to ensure we are targeting characters
			.getEntityLike({ body: CharacterBodyServerEcs, MovementServerEcs })
			// Exclude self
			.filter(({ entity }) => entity.name !== this.parent)
			// Calculate distance to offset position
			.map(({ entity, components: { body } }) => {
				const { x, y, z } = body.body.translation();
				const [dx, dy, dz] = [x - offsetX, y - offsetY, z - offsetZ];

				return {
					entity,
					body,
					distance: Math.sqrt(dx * dx + dy * dy + dz * dz),
				};
			})
			// Filter entities within attack range
			.filter(({ distance }) => distance <= attackRange)
			// Apply attack effects
			.forEach(({ entity, body }) => {
				console.log(`Entity ${entity.name} attacked by ${this.parent}!`);

				body.body.applyImpulse(
					{
						x: Math.cos(rotationY) * 5,
						y: 2,
						z: -Math.sin(rotationY) * 5,
					},
					true,
				);

				body.takeDamage(CharacterBodyServerEcs.ATTACK_DAMAGE);

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
			});
	}
}
