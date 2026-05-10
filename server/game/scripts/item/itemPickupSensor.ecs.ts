import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { PICKUP_GRACE_PERIOD_MS } from '#/state/inventory.state';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';
import { SensorDispatchEcs } from '../trigger/sensorDispatch.ecs';
import { ServerDataEcs } from '../serverData.ecs';

export class ItemPickupSensorEcs extends ComponentEcs {
	private isPicked = false;
	private graceRemainingMs = PICKUP_GRACE_PERIOD_MS;
	private isGracePeriodOver = false;
	private character: CharacterBodyServerEcs = null!;
	private physic: RAPIER.World = null!;
	private sensorCollider: RAPIER.Collider = null!;
	private unregister: (() => void) | null = null;

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
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL)
			.setEnabled(false);

		this.sensorCollider = this.physic.createCollider(
			sensorDesc,
			this.character.body,
		);

		this.callOnDelete(() => {
			this.unregister?.();
			this.physic.removeCollider(this.sensorCollider, true);
		});
	}

	onLoop(delta: number): void {
		if (this.isPicked) return;
		if (this.isGracePeriodOver) return;

		this.graceRemainingMs -= delta;

		if (this.graceRemainingMs <= 0) {
			this.isGracePeriodOver = true;
			this.activateSensor();
		}
	}

	private activateSensor(): void {
		this.sensorCollider.setEnabled(true);

		const dispatch = this.world
			.get(SensorDispatchEcs)
			.unwrap('SensorDispatchEcs not found');

		this.unregister = dispatch.register(
			this.sensorCollider.handle,
			(entityName, started) => {
				if (!started) return;
				if (this.isPicked) return;

				this.tryPickup(entityName);
			},
		);
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