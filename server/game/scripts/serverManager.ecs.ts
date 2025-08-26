import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ServerDataEcs } from './serverData.ecs';

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

		this.callOnDelete(() => {
			physics.removeCollider(collider, true);
			physics.removeRigidBody(body);
		});
	}
}
