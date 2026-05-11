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

interface TreeHitPayload {
	id: string;
	attackerId: string;
	x: number;
	y: number;
	z: number;
}

interface SwayState {
	angle: number;
	velocity: number;
	axisSign: number; // +1 o -1, único por árbol
}

const SWAY_IMPULSE = 0.18;   // rad/s inyectado por golpe
const SWAY_STIFFNESS = 10;   // fuerza restauradora
const SWAY_DAMPING = 0.82;   // amortiguación por frame

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
	private swayStates = new Map<string, SwayState>();
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

				room.onMessage('tree:hit', (data: TreeHitPayload) => {
					const sway = this.swayStates.get(data.id);
					if (!sway) return;
					sway.velocity += sway.axisSign * SWAY_IMPULSE;
				});
			}),
		);

		this.callOnDelete(() => {
			for (const obj of this.objects.values()) {
				this.scene.remove(obj);
			}
			this.objects.clear();
			this.swayStates.clear();
		});
	}

	onLoop(delta: number): void {
		const dt = delta / 1000;

		for (const [id, sway] of this.swayStates) {
			if (Math.abs(sway.angle) < 0.0005 && Math.abs(sway.velocity) < 0.0005) continue;

			sway.velocity += -SWAY_STIFFNESS * sway.angle * dt;
			sway.velocity *= SWAY_DAMPING;
			sway.angle += sway.velocity;

			const obj = this.objects.get(id);
			if (obj) obj.rotation.z = sway.angle;
		}
	}

	private createInstance(data: InstanceCreatePayload): void {
		this.removeInstance(data.id);

		const renderer = instanceRenderers[data.type];
		if (!renderer) return;

		const obj = renderer(data);
		this.scene.add(obj);
		this.objects.set(data.id, obj);

		if (data.type === 'tree') {
			this.swayStates.set(data.id, {
				angle: 0,
				velocity: 0,
				axisSign: Math.random() > 0.5 ? 1 : -1,
			});
		}
	}

	private removeInstance(id: string): void {
		const obj = this.objects.get(id);
		if (!obj) return;
		this.scene.remove(obj);
		this.objects.delete(id);
		this.swayStates.delete(id);
	}
}

