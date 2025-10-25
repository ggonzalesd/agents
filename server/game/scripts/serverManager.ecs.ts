import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ServerDataEcs } from './serverData.ecs';
import { itemServerFactory } from '../prefab/item.server';
import { npcServerFactoryGenerator } from '../prefab/npc.server';

export class ServerManagerEcs extends ComponentEcs {
	onStart(): void {
		const physics = this.world
			.get(ServerDataEcs)
			.map((sd) => sd.worldPhysic)
			.unwrap('World physic not found');

		// Create Plane
		const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0);
		const body = physics.createRigidBody(bodyDesc);

		const colliderDesc = RAPIER.ColliderDesc.cuboid(100, 1, 100);
		const collider = physics.createCollider(colliderDesc, body);

		// Random Object

		for (let i = 0; i < 10; i++) {
			const item = itemServerFactory({
				world: this.world,
				name: `item1_${Math.random().toString(36).substring(7)}`,
				pos: { x: 0, y: 5, z: Math.random() * 10 - 5 },
			});
			this.world.addEntity(item);
		}

		const npcServerFactory = npcServerFactoryGenerator(this.world);

		// Add some NPCs
		for (let i = 0; i < 1; i++) {
			this.world.addEntity(
				npcServerFactory({
					name: `npc_${i}_${Math.random().toString(36).substring(7)}`,
					pos: {
						x: (Math.random() - 0.5) * 20,
						y: 5,
						z: (Math.random() - 0.5) * 20,
					},
				}),
			);
		}

		this.callOnDelete(() => {
			physics.removeCollider(collider, true);
			physics.removeRigidBody(body);
		});
	}
}
