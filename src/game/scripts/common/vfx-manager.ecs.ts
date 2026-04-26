import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { loadTexture } from '@/utils/assets.utils';
import {
	VFX_EFFECTS,
	VFX_POOL_LIMIT,
	VFXSpread,
	type VFXEffectConfig,
	VFXEffectType,
} from './vfx.config';

interface VFXParticle {
	sprite: THREE.Sprite;
	velocity: THREE.Vector3;
	elapsed: number;
	duration: number;
	opacityStart: number;
	opacityEnd: number;
	baseScale: number;
	active: boolean;
}

interface TreeHitMessage {
	x: number;
	y: number;
	z: number;
}

interface BoxBreakMessage {
	x: number;
	y: number;
	z: number;
}

export class VFXManagerEcs extends ComponentEcs {
	private renderClient: RenderClientEcs = null!;
	private pool: VFXParticle[] = [];
	private textureCache = new Map<string, THREE.Texture>();
	private boundRoomId: string | null = null;

	private bindRoomListeners(): void {
		const room = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.pick('room')
			.raw();

		if (!room) return;
		if (this.boundRoomId === room.roomId) return;

		this.boundRoomId = room.roomId;
		room.onMessage('tree:hit', (message: TreeHitMessage) => {
			this.spawn(
				VFXEffectType.TreeHit,
				new THREE.Vector3(message.x, message.y, message.z),
			);
		});

		room.onMessage('box:break', (message: BoxBreakMessage) => {
			this.spawn(
				VFXEffectType.TreeHit,
				new THREE.Vector3(message.x, message.y, message.z),
			);
		});
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClientEcs not found');

		this.world.get(ColyseusClientEcs).ifSome((client) => {
			this.callOnDelete(
				client.alarm.subscribe(this.bindRoomListeners.bind(this)),
			);
		});
		this.bindRoomListeners();

		for (let i = 0; i < VFX_POOL_LIMIT; i++) {
			const material = new THREE.SpriteMaterial({
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			});
			const sprite = new THREE.Sprite(material);
			sprite.visible = false;
			this.renderClient.scene.add(sprite);

			this.pool.push({
				sprite,
				velocity: new THREE.Vector3(),
				elapsed: 0,
				duration: 0,
				opacityStart: 1,
				opacityEnd: 0,
				baseScale: 1,
				active: false,
			});
		}

		this.callOnDelete(() => {
			for (const p of this.pool) {
				this.renderClient.scene.remove(p.sprite);
				p.sprite.material.dispose();
			}
		});
	}

	private getTexture(path: string): THREE.Texture {
		const cached = this.textureCache.get(path);
		if (cached) return cached;

		const texture = loadTexture(path);
		this.textureCache.set(path, texture);
		return texture;
	}

	private acquireParticle(): VFXParticle | null {
		for (const p of this.pool) {
			if (!p.active) return p;
		}
		return null;
	}

	private computeVelocity(
		spread: VFXSpread,
		speedMin: number,
		speedMax: number,
	): THREE.Vector3 {
		const speed = speedMin + Math.random() * (speedMax - speedMin);
		const angle = Math.random() * Math.PI * 2;

		switch (spread) {
			case VFXSpread.Radial: {
				const elevation = (Math.random() - 0.3) * Math.PI;
				return new THREE.Vector3(
					Math.cos(angle) * Math.cos(elevation) * speed,
					Math.sin(elevation) * speed + 1,
					Math.sin(angle) * Math.cos(elevation) * speed,
				);
			}
			case VFXSpread.Upward:
				return new THREE.Vector3(
					Math.cos(angle) * speed * 0.3,
					speed,
					Math.sin(angle) * speed * 0.3,
				);
			case VFXSpread.Ring:
				return new THREE.Vector3(
					Math.cos(angle) * speed,
					0.2,
					Math.sin(angle) * speed,
				);
		}
	}

	spawn(type: VFXEffectType, position: THREE.Vector3): void {
		const config: VFXEffectConfig = VFX_EFFECTS[type];
		const texture = this.getTexture(config.texture);

		for (let i = 0; i < config.count; i++) {
			const particle = this.acquireParticle();
			if (!particle) break;

			const scale =
				config.scale[0] + Math.random() * (config.scale[1] - config.scale[0]);

			const material = particle.sprite.material as THREE.SpriteMaterial;
			material.map = texture;
			material.color.set(config.color);
			material.opacity = config.opacity[0];
			material.needsUpdate = true;

			particle.baseScale = scale;
			particle.sprite.scale.setScalar(scale);
			particle.sprite.position.copy(position);
			particle.sprite.visible = true;

			particle.velocity = this.computeVelocity(
				config.spread,
				config.speed[0],
				config.speed[1],
			);
			particle.elapsed = 0;
			particle.duration = config.duration;
			particle.opacityStart = config.opacity[0];
			particle.opacityEnd = config.opacity[1];
			particle.active = true;
		}
	}

	onLoop(delta: number): void {
		for (const p of this.pool) {
			if (!p.active) continue;

			p.elapsed += delta;
			const t = Math.min(p.elapsed / p.duration, 1);

			p.sprite.position.addScaledVector(p.velocity, delta * 0.001);
			p.velocity.y -= delta * 0.003; // gravity

			const material = p.sprite.material as THREE.SpriteMaterial;
			material.opacity = p.opacityStart + (p.opacityEnd - p.opacityStart) * t;

			p.sprite.scale.setScalar(p.baseScale * (1 - t * 0.5));

			if (t >= 1) {
				p.active = false;
				p.sprite.visible = false;
			}
		}
	}
}
