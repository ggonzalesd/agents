import type * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { ServerDataEcs } from '../serverData.ecs';

type SensorCallback = (entityName: string, started: boolean) => void;

export class SensorDispatchEcs extends ComponentEcs {
	private registrations = new Map<number, SensorCallback>();
	private physic: RAPIER.World = null!;

	register(handle: number, callback: SensorCallback): () => void {
		this.registrations.set(handle, callback);
		return () => {
			this.registrations.delete(handle);
		};
	}

	onStart(): void {
		this.physic = this.world
			.get(ServerDataEcs)
			.map(({ worldPhysic }) => worldPhysic)
			.unwrap('RAPIER World not found');
	}

	onLoop(_delta: number): void {
		const eventQueue = this.world
			.get(ServerDataEcs)
			.map(({ eventQueue }) => eventQueue)
			.unwrap('EventQueue not found');

		eventQueue.drainCollisionEvents((handle1, handle2, started) => {
			console.log(
				`Collision event: handle1=${handle1}, handle2=${handle2}, started=${started}`,
			);

			const cb1 = this.registrations.get(handle1);
			const cb2 = this.registrations.get(handle2);

			let callback: SensorCallback | undefined;
			let otherHandle: number;

			if (cb1) {
				callback = cb1;
				otherHandle = handle2;
			} else if (cb2) {
				callback = cb2;
				otherHandle = handle1;
			} else {
				return;
			}

			const otherCollider = this.physic.getCollider(otherHandle);
			const otherBody = otherCollider?.parent();
			const entityName = otherBody?.userData as string | undefined;
			if (entityName) {
				callback(entityName, started);
			}
		});
	}
}
