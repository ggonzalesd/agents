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
	public cameraSmooth: THREE.Vector3 = null!;
	public uiCli: UIClientEcs = null!;

	public angleH = 0;
	public angleV = 0;

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
			.pick('connection')
			.collapse()
			.unwrap('Connection not found');

		this.room = room;

		this.renderCli = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		this.cameraSmooth = this.renderCli.camera.position.clone();

		this.cube = new THREE.Mesh(
			new THREE.CapsuleGeometry(0.5, 1, 8),
			new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }),
		);
		this.cube.castShadow = true;
		this.cube.receiveShadow = true;
		this.renderCli.scene.add(this.cube);

		proxy(this.state.position).onChange(() => {
			vec3Set(this.cube.position, this.state.position);
		});

		this.callOnDelete(() => this.renderCli.scene.remove(this.cube));

		// Testing Actions
		this.world.get(UIClientEcs).ifSome(({ actions }) =>
			actions.listen('jump', () => {
				if (room.sessionId === this.parent) {
					this.room.send('client:action', { type: 'jump' });
				}
			}),
		);
	}

	onLoop(_delta: number): void {
		if (this.room.sessionId !== this.parent) return;

		this.angleH += (this.uiCli.input.moveX * Math.PI) / 180;
		this.angleV += (this.uiCli.input.moveY * Math.PI) / 180;

		if (this.angleH > Math.PI * 2) this.angleH -= Math.PI * 2;
		if (this.angleH < 0) this.angleH += Math.PI * 2;

		if (this.angleV > Math.PI / 2) this.angleV = Math.PI / 2;
		if (this.angleV < 0) this.angleV = 0;

		const radius = 5;
		const camX = this.cube.position.x + radius * Math.cos(this.angleH);
		const camZ = this.cube.position.z + radius * Math.sin(this.angleH);
		const camY = this.cube.position.y + radius * Math.sin(this.angleV);

		this.cameraSmooth.x = camX;
		this.cameraSmooth.y = camY;
		this.cameraSmooth.z = camZ;

		this.renderCli.camera.position.lerp(this.cameraSmooth, 0.3);

		// Camera
		this.smoothCube = this.smoothCube.lerp(
			this.cube.position.clone().add(new THREE.Vector3(0, 1, 0)),
			0.1,
		);
		this.renderCli.camera.lookAt(this.smoothCube);

		if (this.uiCli.input.down('Space') && this.room.connection.isOpen) {
			this.room.send('client:action', { type: 'jump' });
		}

		// Movement
		const isMoving = this.uiCli.input.anyPress('KeyW', 'KeyA', 'KeyS', 'KeyD');
		const axis = this.uiCli.input.axisPress('KeyW', 'KeyS', 'KeyD', 'KeyA');

		const u = new THREE.Vector3(1, 0, 0);
		u.applyQuaternion(this.renderCli.camera.quaternion);
		u.y = 0;
		const cameraAngle = Math.atan2(u.z, u.x);

		const angle = Math.atan2(axis.y, axis.x) - cameraAngle;

		if (this.room.connection.isOpen)
			this.room.send('client:state', { isMoving, direction: angle });
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
