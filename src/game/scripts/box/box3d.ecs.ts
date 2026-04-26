import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { BoxSkin, BoxState } from '#/state/box.state';
import { vec3Set } from '#/utils/math.util';

import { preloadGLB } from '@/utils/assets.utils';

import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { RenderClientEcs } from '../renderClient.ecs';

const BOX_MODEL_PATHS: Record<BoxSkin, string> = {
	box_stacked: '/dungeons/Assets/gltf/box_stacked.gltf',
	crate: '/vegetables/Assets/gltf/crate.gltf',
};
const BOX_SCALE = 0.9;
const HIT_DURATION = 300;
const HIT_BOUNCE_SCALE = 1.15;
const HIT_COLOR = new THREE.Color(0xff3333);

export class Box3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();

	private lastLife = -1;
	private hitTimer = 0;
	private originalMaterials: Map<
		THREE.Mesh,
		THREE.Material | THREE.Material[]
	> = new Map();

	constructor(private state: BoxState) {
		super();

		preloadGLB(BOX_MODEL_PATHS[this.state.skin]).then(([glb]) => {
			const model = glb.scene.clone();
			this.object3D.add(model);
			this.object3D.scale.set(BOX_SCALE, BOX_SCALE, BOX_SCALE);
		});
	}

	onStart(): void {
		const renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		const { proxy } = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		proxy(this.state.character).onChange(() => {
			const currentLife = this.state.character.life;
			if (this.lastLife >= 0 && currentLife < this.lastLife) {
				this.triggerHit();
			}
			this.lastLife = currentLife;
		});

		this.lastLife = this.state.character.life;

		proxy(this.state.character.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.character.position);
		});

		vec3Set(this.object3D.position, this.state.character.position);
		renderClient.scene.add(this.object3D);
		this.callOnDelete(() => renderClient.scene.remove(this.object3D));
	}

	onLoop(delta: number): void {
		vec3Set(this.object3D.position, this.state.character.position);

		if (this.hitTimer > 0) {
			this.hitTimer = Math.max(0, this.hitTimer - delta);
			const t = this.hitTimer / HIT_DURATION;

			const bounce =
				BOX_SCALE * (1 + (HIT_BOUNCE_SCALE - 1) * Math.sin(t * Math.PI));
			this.object3D.scale.set(bounce, bounce, bounce);

			if (this.hitTimer <= 0) {
				this.object3D.scale.set(BOX_SCALE, BOX_SCALE, BOX_SCALE);
				this.restoreMaterials();
			}
		}
	}

	private triggerHit(): void {
		this.hitTimer = HIT_DURATION;
		this.applyHitColor();
	}

	private applyHitColor(): void {
		this.originalMaterials.clear();
		this.object3D.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) return;
			this.originalMaterials.set(child, child.material);

			if (Array.isArray(child.material)) {
				child.material = child.material.map((mat: THREE.Material) => {
					const clone = mat.clone();
					if ('color' in clone)
						(clone as THREE.MeshStandardMaterial).color.copy(HIT_COLOR);
					return clone;
				});
			} else {
				const clone = child.material.clone();
				if ('color' in clone)
					(clone as THREE.MeshStandardMaterial).color.copy(HIT_COLOR);
				child.material = clone;
			}
		});
	}

	private restoreMaterials(): void {
		for (const [mesh, material] of this.originalMaterials) {
			if (Array.isArray(mesh.material)) {
				mesh.material.forEach((m: THREE.Material) => m.dispose());
			} else {
				mesh.material.dispose();
			}
			mesh.material = material;
		}
		this.originalMaterials.clear();
	}
}
