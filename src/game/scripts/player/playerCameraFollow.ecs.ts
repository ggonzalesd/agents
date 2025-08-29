import * as THREE from 'three';
import type { Room } from 'colyseus.js';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState, PlayerState } from '#/state/game.state';

import { ColyseusClientEcs } from '../colyseusClient.ecs';
import { UIClientEcs } from '../uiClient.ecs';
import { RenderClientEcs } from '../renderClient.ecs';

import { Player3DEcs } from './player3D.ecs';
import { vec3Flatten } from '#/utils/math.util';

export class PlayerCameraFollowEcs extends ComponentEcs {
	room: Room<GameState> = null!;
	uiClient: UIClientEcs = null!;
	renderClient: RenderClientEcs = null!;

	player3D: Player3DEcs = null!;

	angleH = 0;
	angleV = 0;

	cameraSmooth = new THREE.Vector3();
	smoothCube = new THREE.Vector3();

	constructor() {
		super();
	}

	onStart(): void {
		this.room = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.pick('room')
			.unwrap('No Room found');

		this.uiClient = this.world.get(UIClientEcs).unwrap('No UIClientEcs found');

		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		const player = this.world.getEntity(this.parent).unwrap('No Player found');

		this.player3D = player.get(Player3DEcs).unwrap('No Player3DEcs found');

		this.cameraSmooth = this.renderClient.camera.position.clone();
	}

	onLoop(_delta: number): void {
		if (this.room.sessionId !== this.parent) return;

		this.angleH += (this.uiClient.input.moveX * Math.PI) / 180;
		this.angleV += (this.uiClient.input.moveY * Math.PI) / 180;

		if (this.angleH > Math.PI * 2) this.angleH -= Math.PI * 2;
		if (this.angleH < 0) this.angleH += Math.PI * 2;

		if (this.angleV > Math.PI / 2) this.angleV = Math.PI / 2;
		if (this.angleV < 0) this.angleV = 0;

		const cube = this.player3D.object3D;

		const radius = 5;
		const camX = cube.position.x + radius * Math.cos(this.angleH);
		const camZ = cube.position.z + radius * Math.sin(this.angleH);
		const camY = cube.position.y + radius * Math.sin(this.angleV);

		this.cameraSmooth.x = camX;
		this.cameraSmooth.y = camY;
		this.cameraSmooth.z = camZ;

		this.renderClient.camera.position.lerp(this.cameraSmooth, 0.3);

		// Camera
		this.smoothCube = this.smoothCube.lerp(
			cube.position.clone().add(new THREE.Vector3(0, 1, 0)),
			0.1,
		);
		this.renderClient.camera.lookAt(this.smoothCube);
	}
}
