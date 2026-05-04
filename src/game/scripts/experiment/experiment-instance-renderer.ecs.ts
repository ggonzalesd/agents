import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { loadGLB } from '@/utils/assets.utils';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { models } from '../render-map.util';

interface InstanceCreatePayload {
	id: string;
	type: string;
	x: number;
	y: number;
	z: number;
	metadata: Record<string, unknown>;
}

interface InstanceRemovePayload {
	id: string;
}

type InstanceRenderer = (payload: InstanceCreatePayload) => THREE.Object3D;

const instanceRenderers: Record<string, InstanceRenderer> = {
	rock: ({ x, y, z }) => {
		const model = models.largeRocks.values[Math.floor(Math.random() * models.largeRocks.values.length)];
		const glb = loadGLB(`${models.largeRocks.path}${model}`);
		const obj = new THREE.Object3D();
		obj.add(glb.scene.clone());
		const scale = Math.random() * 0.2 + 0.3;
		obj.scale.set(scale, scale, scale);
		obj.rotation.set(0, Math.random() * 2 * Math.PI, 0);
		obj.position.set(x, y, z);
		return obj;
	},
	tree: ({ x, y, z }) => {
		const model = models.trees.values[Math.floor(Math.random() * models.trees.values.length)];
		const glb = loadGLB(`${models.trees.path}${model}`);
		const obj = new THREE.Object3D();
		obj.add(glb.scene.clone());
		const scale = Math.random() * 1 + 2;
		obj.scale.set(scale, scale, scale);
		obj.rotation.set(0, Math.random() * 2 * Math.PI, 0);
		obj.position.set(x, y, z);
		return obj;
	},
};

export class ExperimentInstanceRendererEcs extends ComponentEcs {
	private objects = new Map<string, THREE.Object3D>();
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

				room.onMessage('experiment:instance:create', (data: InstanceCreatePayload) => {
					this.createInstance(data);
				});

				room.onMessage('experiment:instance:remove', (data: InstanceRemovePayload) => {
					this.removeInstance(data.id);
				});
			}),
		);

		this.callOnDelete(() => {
			for (const obj of this.objects.values()) {
				this.scene.remove(obj);
			}
			this.objects.clear();
		});
	}

	private createInstance(data: InstanceCreatePayload): void {
		this.removeInstance(data.id);

		const renderer = instanceRenderers[data.type];
		if (!renderer) return;

		const obj = renderer(data);
		this.scene.add(obj);
		this.objects.set(data.id, obj);
	}

	private removeInstance(id: string): void {
		const obj = this.objects.get(id);
		if (!obj) return;
		this.scene.remove(obj);
		this.objects.delete(id);
	}
}
