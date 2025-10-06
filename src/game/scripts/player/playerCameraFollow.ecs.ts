import * as THREE from 'three';
import type { Room } from 'colyseus.js';

import { vec3Add, vec3dNew, vec3Scale, vec3Up } from '#/utils/math.util';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState } from '#/state/game.state';

import type { GameInput } from '@/utils/input.utils';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { UIClientEcs } from '../uiClient.ecs';
import { RenderClientEcs } from '../renderClient.ecs';

import { Character3DEcs } from './character3D.ecs';

export class PlayerCameraFollowEcs extends ComponentEcs {
	room: Room<GameState> = null!;
	input: GameInput = null!;
	camera: THREE.Camera = null!;

	object3D: THREE.Object3D = null!;

	smoothCamera = new THREE.Vector3();
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

		this.input = this.world
			.get(UIClientEcs)
			.pick('input')
			.unwrap('No GameInput found');

		this.camera = this.world
			.get(RenderClientEcs)
			.pick('camera')
			.unwrap('No Camera found');

		const player = this.world.getEntity(this.parent).unwrap('No Player found');

		this.object3D = player
			.get(Character3DEcs)
			.unwrap('No Character3DEcs found').object3D;

		this.smoothCamera = this.camera.position.clone();
	}

	onLoop(_delta: number): void {
		if (this.room.sessionId !== this.parent) return;

		const obj = this.object3D;

		const radius = 5;

		const offset = vec3dNew(
			Math.sin(this.input.yaw) * Math.cos(this.input.pitch),
			Math.sin(this.input.pitch),
			Math.cos(this.input.yaw) * Math.cos(this.input.pitch),
		);

		const newSmooth = vec3Add(obj.position, vec3Scale(offset, radius));

		this.camera.position.lerp(newSmooth, 0.3);

		// Camera
		this.smoothCube = this.smoothCube.lerp(
			obj.position.clone().add(vec3Up()),
			0.1,
		);
		this.camera.lookAt(this.smoothCube);
	}
}
