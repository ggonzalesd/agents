import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { vec3Set } from '#/utils/math.util';
import type { ItemEntityState } from '#/state/inventory.state';

export class Item3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();
	public mesh: THREE.Mesh;

	constructor(private state: ItemEntityState) {
		super();

		// const typesColor = ['sword', 'potion', 'cookie', 'seeds', 'coin'] as const;
		const typesColor = {
			sword: 0xff0000,
			potion: 0x0000ff,
			cookie: 0xffff00,
			seeds: 0x00ff00,
			coin: 0xffa500,
		};

		this.mesh = new THREE.Mesh(
			new THREE.BoxGeometry(0.5, 0.5, 0.5),
			new THREE.MeshBasicMaterial({
				color:
					typesColor[this.state.item.type as keyof typeof typesColor] ||
					0xffffff,
			}),
		);

		this.object3D.add(this.mesh);
	}

	onStart(): void {
		this.mesh.userData = {
			canInteract: true,
			isItem: true,
			parent: this.parent,
		};

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
		proxy(this.state.character.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.character.position);
		});

		// Render Config
		renderClient.scene.add(this.object3D);
		this.callOnDelete(() => renderClient.scene.remove(this.object3D));
	}

	onLoop(_delta: number): void {
		vec3Set(this.object3D.position, this.state.character.position);
	}
}
