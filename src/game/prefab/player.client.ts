import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';

import type { GameState, PlayerState } from '#/state/game.state';
import { vec3Flatten, vec3Set, vec4Set } from '#/utils/math.util';

import { ColyseusClientEcs } from '../scripts/colyseusClient.ecs';
import { RenderClientEcs } from '../scripts/renderClient.ecs';
import { UIClientEcs } from '../scripts/uiClient.ecs';
import type { Room } from 'colyseus.js';

class PlayerClientBehavior extends ComponentEcs {
	public state: PlayerState;

	public renderCli: RenderClientEcs = null!;
	public cube: THREE.Mesh = null!;
	public smoothCube: THREE.Vector3 = null!;
	public uiCli: UIClientEcs = null!;

	public room: Room<GameState> = null!;

	constructor(state: PlayerState) {
		super();

		this.state = state;

		this.smoothCube = new THREE.Vector3(...vec3Flatten(state.position));
	}

	onStart(): void {
		this.uiCli = this.world.get(UIClientEcs).unwrap('No UIClientEcs found');

		const { proxy, room } = this.world
			.get(ColyseusClientEcs)
			.map(({ connection }) => connection)
			.collapse()
			.unwrap('Connection not found');

		this.room = room;

		this.renderCli = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		this.cube = new THREE.Mesh(
			new THREE.CapsuleGeometry(0.5, 1, 8),
			new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }),
		);
		this.renderCli.scene.add(this.cube);

		proxy(this.state.position).onChange(() => {
			vec3Set(this.cube.position, this.state.position);
		});

		this.callOnDelete(() => this.renderCli.scene.remove(this.cube));

		// Testing Actions
		this.world.get(UIClientEcs).ifSome(({ actions }) =>
			actions.listen('jump', () => {
				if (room.sessionId === this.parent) {
					room.send('jump');
				}
			}),
		);
	}

	onLoop(_delta: number): void {
		if (this.room.sessionId === this.parent) {
			this.smoothCube = this.smoothCube.lerp(this.cube.position, 0.05);
			this.renderCli.camera.lookAt(this.smoothCube);
		}

		if (Math.random() < 0.01) {
			console.log(this.uiCli.input.input.pressCount);
		}
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
