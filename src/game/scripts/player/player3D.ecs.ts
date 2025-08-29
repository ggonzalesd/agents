import * as THREE from 'three';
import type { Room } from 'colyseus.js';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { PlayerState } from '#/state/game.state';
import { vec3Set } from '#/utils/math.util';

import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseusClient.ecs';

export class Player3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();

	private renderClient: RenderClientEcs = null!;

	constructor(private state: PlayerState) {
		super();

		const mesh = new THREE.Mesh(
			new THREE.CapsuleGeometry(0.5, 1, 8),
			new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }),
		);

		mesh.castShadow = true;
		mesh.receiveShadow = true;

		this.object3D.add(mesh);
	}

	onStart(): void {
		// World Components
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		// Colyseus Components
		const { proxy } = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		// Render Config
		this.renderClient.scene.add(this.object3D);
		this.callOnDelete(() => this.renderClient.scene.remove(this.object3D));

		// Sync Position
		proxy(this.state.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.position);
		});
	}
}
