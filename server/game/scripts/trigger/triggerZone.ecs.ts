import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldEventBusEcs, WorldEventType } from '../world-event-bus.ecs';
import { SensorDispatchEcs } from './sensorDispatch.ecs';
import type { TriggerZoneState } from '#/state/trigger-zone.state';

export class TriggerZoneServerEcs extends ComponentEcs {
	public state: TriggerZoneState;
	private physic: RAPIER.World = null!;
	private body: RAPIER.RigidBody = null!;
	private collider: RAPIER.Collider = null!;
	private eventBus: WorldEventBusEcs = null!;
	private serverData: ServerDataEcs = null!;

	constructor({ state }: { state: TriggerZoneState }) {
		super();
		this.state = state;
	}

	onStart(): void {
		this.physic = this.world
			.get(ServerDataEcs)
			.map(({ worldPhysic }) => worldPhysic)
			.unwrap('RAPIER World not found');

		this.eventBus = this.world
			.get(WorldEventBusEcs)
			.unwrap('WorldEventBusEcs not found');

		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');
		this.serverData.state.triggerZones.set(parent.name, this.state);

		const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
			this.state.position.x,
			this.state.position.y,
			this.state.position.z,
		);
		this.body = this.physic.createRigidBody(bodyDesc);

		const colliderDesc = RAPIER.ColliderDesc.cylinder(
			this.state.height / 2,
			this.state.radius,
		)
			.setSensor(true)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
		this.collider = this.physic.createCollider(colliderDesc, this.body);

		const dispatch = this.world
			.get(SensorDispatchEcs)
			.unwrap('SensorDispatchEcs not found');

		const triggerName = this.parent ?? '';

		console.log(
			`TriggerZone "${triggerName}" created at position`,
			this.state.position,
		);
		const unregister = dispatch.register(
			this.collider.handle,
			(entityName, started) => {
				console.log(
					`Entity "${entityName}" ${
						started ? 'entered' : 'exited'
					} trigger "${triggerName}"`,
				);
				this.eventBus.emit(
					started
						? WorldEventType.EntityEnterTrigger
						: WorldEventType.EntityExitTrigger,
					entityName,
					{ triggerName },
				);
			},
		);

		this.callOnDelete(() => {
			unregister();
			this.serverData.state.triggerZones.delete(parent.name);
			this.physic.removeCollider(this.collider, true);
			this.physic.removeRigidBody(this.body);
		});
	}
}
