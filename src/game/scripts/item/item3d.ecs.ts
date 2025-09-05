import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { ItemEntityState } from '#/state/game.state';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseusClient.ecs';
import { vec3Set } from '#/utils/math.util';

export class Item3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();

	constructor(private state: ItemEntityState) {
		super();

		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(0.5, 0.5, 0.5),
			new THREE.MeshBasicMaterial({
				color: Math.random() * 0xffffff,
				wireframe: true,
			}),
		);

		this.object3D.add(mesh);
	}

	onStart(): void {
		const renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		// Colyseus Components
		const { proxy } = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		// Sync Position
		proxy(this.state.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.position);
		});

		// Render Config
		renderClient.scene.add(this.object3D);
		this.callOnDelete(() => renderClient.scene.remove(this.object3D));

		console.log('Item3DEcs started', this.state);
	}
}
