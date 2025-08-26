import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';

import type { PlayerState } from '#/state/game.state';

import { ColyseusClientEcs } from '../scripts/colyseusClient.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';

class PlayerClientBehavior extends ComponentEcs {
	public state: PlayerState;

	constructor(state: PlayerState) {
		super();

		this.state = state;
	}

	onStart(): void {
		const colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('No ColyseusClientEcs found');

		const { proxy } = colyseusClient.connection.unwrap('Connection not found');

		const renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }),
		);

		proxy(this.state.position).onChange(() => {
			cube.position.set(
				this.state.position.x,
				this.state.position.y,
				this.state.position.z,
			);
		});

		renderClient.scene.add(cube);

		this.callOnDelete(() => {
			renderClient.scene.remove(cube);
		});
	}

	onLoop(_delta: number): void {}
}

export const playerClientFactoryGenerator =
	(world: WorldEcs) => (name: string, state: PlayerState) =>
		new EntityEcs({
			name,
			world,
			components: {
				[PlayerClientBehavior.name]: new PlayerClientBehavior(state),
			},
		});
