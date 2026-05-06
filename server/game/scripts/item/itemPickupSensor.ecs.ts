import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { SensorDispatchEcs } from '../trigger/sensorDispatch.ecs';
import { ServerDataEcs } from '../serverData.ecs';

export class ItemPickupSensorEcs extends ComponentEcs {
	private isPicked = false;
	private character: CharacterBodyServerEcs = null!;
	private physic: RAPIER.World = null!;
	private sensorCollider: RAPIER.Collider = null!;

	onStart(): void {
		this.physic = this.world
			.get(ServerDataEcs)
			.map(({ worldPhysic }) => worldPhysic)
			.unwrap('RAPIER World not found');

		this.character = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe<CharacterBodyServerEcs>(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');

		const sensorDesc = RAPIER.ColliderDesc.cuboid(0.75, 0.75, 0.75)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
		this.sensorCollider = this.physic.createCollider(
			sensorDesc,
			this.character.body,
		);

		const dispatch = this.world
			.get(SensorDispatchEcs)
			.unwrap('SensorDispatchEcs not found');

		const unregister = dispatch.register(
			this.sensorCollider.handle,
			(entityName, started) => {
				if (!started) return;
				if (this.isPicked) return;

				this.tryPickup(entityName);
			},
		);

		this.callOnDelete(() => {
			unregister();
			this.physic.removeCollider(this.sensorCollider, true);
		});
	}

	private tryPickup(entityName: string): void {
		const entity = this.world.getEntity(entityName).raw();
		if (!entity) return;

		const inventory = entity.get(InventoryServerEcs).raw();
		if (!inventory) return;

		const success = inventory.pickItemEntityByCollision(this.parent ?? '');
		if (success) {
			this.isPicked = true;
		}
	}
}
