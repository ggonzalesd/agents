import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';

import type { PlayerState } from '#/state/game.state';
import { vec3Set, vec4Set } from '#/utils/math.util';

import { ColyseusClientEcs } from '../scripts/colyseusClient.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';
import { UIClientEcs } from '../scripts/uiClient.ecs';

class PlayerClientBehavior extends ComponentEcs {
	public state: PlayerState;

	constructor(state: PlayerState) {
		super();

		this.state = state;
	}

	onStart(): void {
		const { proxy, room } = this.world
			.get(ColyseusClientEcs)
			.map((c) => c.connection.unsafe())
			.unwrap('Connection not found');

		const renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }),
		);

		proxy(this.state.position).onChange(() => {
			vec3Set(cube.position, this.state.position);
		});
		proxy(this.state.rotation).onChange(() => {
			vec4Set(cube.quaternion, this.state.rotation);
		});
		renderClient.scene.add(cube);

		this.callOnDelete(() => renderClient.scene.remove(cube));

		// Testing Actions
		this.world.get(UIClientEcs).ifSome((uiCli) =>
			uiCli.actionContext.listen('jump', () => {
				if (room.sessionId === this.parent) {
					room.send('jump');
				}
			}),
		);
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
