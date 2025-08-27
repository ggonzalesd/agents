import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';

import type { PlayerState } from '#/state/game.state';
import { vec3Flatten, vec3Set, vec4Set } from '#/utils/math.util';

import { ColyseusClientEcs } from '../scripts/colyseusClient.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';
import { UIClientEcs } from '../scripts/uiClient.ecs';

class PlayerClientBehavior extends ComponentEcs {
	public state: PlayerState;

	public renderCli: RenderClientEcs = null!;
	public cube: THREE.Mesh = null!;
	public smoothCube: THREE.Vector3 = null!;

	constructor(state: PlayerState) {
		super();

		this.state = state;

		this.smoothCube = new THREE.Vector3(...vec3Flatten(state.position));
	}

	onStart(): void {
		const { proxy, room } = this.world
			.get(ColyseusClientEcs)
			.map(({ connection }) => connection)
			.collapse()
			.unwrap('Connection not found');

		this.renderCli = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		this.cube = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }),
		);
		this.renderCli.scene.add(this.cube);

		proxy(this.state.position).onChange(() => {
			vec3Set(this.cube.position, this.state.position);
		});
		proxy(this.state.rotation).onChange(() => {
			vec4Set(this.cube.quaternion, this.state.rotation);
		});

		this.callOnDelete(() => this.renderCli.scene.remove(this.cube));

		// Testing Actions
		this.world.get(UIClientEcs).ifSome(({ actionContext }) =>
			actionContext.listen('jump', () => {
				if (room.sessionId === this.parent) {
					room.send('jump');
				}
			}),
		);
	}

	onLoop(_delta: number): void {
		this.smoothCube = this.smoothCube.lerp(this.cube.position, 0.05);
		this.renderCli.camera.lookAt(this.smoothCube);
	}
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
