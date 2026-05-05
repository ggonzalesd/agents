import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { Character3DEcs } from '../player/character3D.ecs';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { RenderClientEcs } from '../renderClient.ecs';

interface RangeCreatePayload {
	npcName: string;
	radius: number;
}

interface RangeRemovePayload {
	npcName: string;
}

export class FollowRangeIndicatorEcs extends ComponentEcs {
	private ring: THREE.Mesh | null = null;
	private npcName: string | null = null;
	private scene: THREE.Scene = null!;
	private radius = 2;

	onStart(): void {
		this.scene = this.world
			.get(RenderClientEcs)
			.pick('scene')
			.unwrap('RenderClientEcs scene not found');

		const colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('ColyseusClientEcs not found');

		this.callOnDelete(
			colyseusClient.alarm.subscribe(() => {
				const room = colyseusClient.connection
					.pick('room')
					.unwrap('Room not found');

				room.onMessage('follow:range:create', (data: RangeCreatePayload) => {
					this.createIndicator(data);
				});

				room.onMessage('follow:range:remove', (_data: RangeRemovePayload) => {
					this.removeIndicator();
				});
			}),
		);

		this.callOnDelete(() => {
			this.removeIndicator();
		});
	}

	onLoop(_delta: number): void {
		if (!this.ring || !this.npcName) return;

		const npcEntity = this.world.getEntity(this.npcName).raw();
		if (!npcEntity) return;

		const npcObject = npcEntity.get(Character3DEcs).raw()?.object3D;
		if (!npcObject) return;

		this.ring.position.set(npcObject.position.x, npcObject.position.y + 0.05, npcObject.position.z);
	}

	private createIndicator(data: RangeCreatePayload): void {
		this.removeIndicator();

		this.npcName = data.npcName;
		this.radius = data.radius;

		const geometry = new THREE.RingGeometry(this.radius - 0.1, this.radius, 64);
		const material = new THREE.MeshBasicMaterial({
			color: 0x22ff22,
			transparent: true,
			opacity: 0.35,
			side: THREE.DoubleSide,
			depthWrite: false,
		});

		this.ring = new THREE.Mesh(geometry, material);
		this.ring.rotation.x = -Math.PI / 2;

		this.scene.add(this.ring);
	}

	private removeIndicator(): void {
		if (this.ring) {
			this.scene.remove(this.ring);
			this.ring.geometry.dispose();
			(this.ring.material as THREE.Material).dispose();
			this.ring = null;
		}
		this.npcName = null;
	}
}
