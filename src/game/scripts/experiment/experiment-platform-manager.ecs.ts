import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { RenderClientEcs } from '../renderClient.ecs';

const PLATFORM_WIDTH = 50;
const PLATFORM_HEIGHT = 2;
const PLATFORM_DEPTH = 50;

const PLATFORM_MATERIAL = new THREE.MeshStandardMaterial({
	color: 0x888888,
	roughness: 0.9,
	metalness: 0.1,
});

const PLATFORM_GEOMETRY = new THREE.BoxGeometry(PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_DEPTH);

interface PlatformCreatePayload {
	userId: string;
	x: number;
	y: number;
	z: number;
}

interface PlatformRemovePayload {
	userId: string;
}

export class ExperimentPlatformManagerEcs extends ComponentEcs {
	private meshes = new Map<string, THREE.Mesh>();
	private scene: THREE.Scene = null!;

	onStart(): void {
		this.scene = this.world
			.get(RenderClientEcs)
			.pick('scene')
			.unwrap('RenderClientEcs scene not found');

		const colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('ColyseusClientEcs not found');

		this.callOnDelete(
			colyseusClient.alarm.subscribe(() => {
				const room = colyseusClient.connection
					.pick('room')
					.unwrap('Room not found');

				room.onMessage('experiment:platform:create', (data: PlatformCreatePayload) => {
					this.createPlatform(data);
				});

				room.onMessage('experiment:platform:remove', (data: PlatformRemovePayload) => {
					this.removePlatform(data.userId);
				});

				room.onMessage('escort:floor:create', (data: { id: string; x: number; y: number; z: number; width: number; depth: number }) => {
					this.createFloor(data);
				});

				room.onMessage('escort:floor:remove', (data: { id: string }) => {
					this.removePlatform(data.id);
				});
			}),
		);

		this.callOnDelete(() => {
			for (const mesh of this.meshes.values()) {
				this.scene.remove(mesh);
			}
			this.meshes.clear();
		});
	}

	private createPlatform(data: PlatformCreatePayload): void {
		this.removePlatform(data.userId);

		const mesh = new THREE.Mesh(PLATFORM_GEOMETRY, PLATFORM_MATERIAL);
		mesh.position.set(data.x, data.y, data.z);
		mesh.receiveShadow = true;
		mesh.castShadow = false;

		this.scene.add(mesh);
		this.meshes.set(data.userId, mesh);
	}

	private removePlatform(userId: string): void {
		const mesh = this.meshes.get(userId);
		if (!mesh) return;

		this.scene.remove(mesh);
		this.meshes.delete(userId);
	}

	private createFloor(data: { id: string; x: number; y: number; z: number; width: number; depth: number }): void {
		this.removePlatform(data.id);

		const geometry = new THREE.BoxGeometry(data.width, 1, data.depth);
		const mesh = new THREE.Mesh(geometry, PLATFORM_MATERIAL);
		mesh.position.set(data.x, data.y, data.z);
		mesh.receiveShadow = true;
		mesh.castShadow = false;

		this.scene.add(mesh);
		this.meshes.set(data.id, mesh);
	}
}
