import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { vec3Set } from '#/utils/math.util';
import { PICKUP_GRACE_PERIOD_MS, type ItemEntityState } from '#/state/inventory.state';
import { preloadGLB } from '@/utils/assets.utils';
import { getItemModel } from '@/game/item-models.registry';

export class Item3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();
	public mesh: THREE.Mesh;
	private meshContainer: THREE.Object3D = new THREE.Object3D();
	private ringContainer: THREE.Object3D = new THREE.Object3D();
	private glowRing!: THREE.Mesh;
	private graceRing: THREE.Mesh | null = null;
	private graceMaterial: THREE.MeshBasicMaterial | null = null;
	private graceElapsedMs = 0;
	private isGracePeriodOver = false;

	constructor(private state: ItemEntityState) {
		super();

		const collisionBox = new THREE.BoxGeometry(0.5, 0.5, 0.5);
		const collisionMaterial = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			wireframe: true,
			visible: false,
		});
		this.mesh = new THREE.Mesh(collisionBox, collisionMaterial);

		this.object3D.add(this.mesh);
		this.object3D.add(this.meshContainer);
		this.object3D.add(this.ringContainer);

		this.createGlowRing();

		const model = getItemModel(this.state.item.type);
		if (model) {
			preloadGLB(model.path)
				.then(([glb]) => {
					const clone = glb.scene.clone(true);
					this.meshContainer.add(clone);
					this.meshContainer.scale.setScalar(model.scale);
				})
				.catch((err) => {
					console.warn(`[Item3DEcs] Failed to load model for "${this.state.item.type}":`, err);
				});
		}
	}

	private createGlowRing(): void {
		const geometry = new THREE.RingGeometry(0.25, 0.35, 32);
		const material = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.4,
			side: THREE.DoubleSide,
			depthWrite: false,
		});

		this.glowRing = new THREE.Mesh(geometry, material);
		this.glowRing.rotation.x = -Math.PI / 2;
		this.glowRing.position.y = -0.2;

		this.ringContainer.add(this.glowRing);
	}

	private updateGraceVisual(elapsedMs: number): void {
		const progress = Math.min(elapsedMs / PICKUP_GRACE_PERIOD_MS, 1);

		if (!this.graceRing || !this.graceMaterial) {
			this.graceMaterial = new THREE.MeshBasicMaterial({
				color: 0xff4444,
				transparent: true,
				opacity: 0.5,
				side: THREE.DoubleSide,
				depthWrite: false,
			});
			const graceGeometry = new THREE.RingGeometry(0.35, 0.55, 32);
			this.graceRing = new THREE.Mesh(graceGeometry, this.graceMaterial);
			this.graceRing.rotation.x = -Math.PI / 2;
			this.graceRing.position.y = -0.19;
			this.ringContainer.add(this.graceRing);
		}

		const pulse = 0.5 + Math.sin(elapsedMs * 0.02) * 0.5;
		this.graceMaterial.opacity = (1 - progress) * 0.6 * pulse;

		const blinkFrequency = 6 + progress * 10;
		this.meshContainer.visible = Math.sin(elapsedMs * 0.001 * blinkFrequency) > 0;
	}

	private clearGraceVisual(): void {
		if (this.graceRing) {
			this.ringContainer.remove(this.graceRing);
			this.graceRing.geometry.dispose();
			this.graceRing = null;
		}
		if (this.graceMaterial) {
			this.graceMaterial.dispose();
			this.graceMaterial = null;
		}
		this.meshContainer.visible = true;
	}

	onStart(): void {
		this.mesh.userData = {
			canInteract: true,
			isItem: true,
			parent: this.parent,
		};

		const renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		const { proxy } = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		proxy(this.state.character.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.character.position);
		});

		renderClient.scene.add(this.object3D);
		this.callOnDelete(() => renderClient.scene.remove(this.object3D));
	}

	onLoop(delta: number): void {
		vec3Set(this.object3D.position, this.state.character.position);

		if (!this.isGracePeriodOver) {
			this.graceElapsedMs += delta;
			if (this.graceElapsedMs >= PICKUP_GRACE_PERIOD_MS) {
				this.isGracePeriodOver = true;
				this.clearGraceVisual();
			} else {
				this.updateGraceVisual(this.graceElapsedMs);
				return;
			}
		}

		this.meshContainer.rotation.y += 0.01;

		const time = performance.now() * 0.001;
		const scale = 1 + Math.sin(time * 2) * 0.1;
		this.ringContainer.scale.set(scale, scale, 1);
		this.ringContainer.rotation.y += 0.005;
	}
}