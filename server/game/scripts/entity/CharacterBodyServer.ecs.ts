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
				// Here you can apply damage or effects to the target entity
			});
	}
}
