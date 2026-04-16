import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { Character3DEcs } from '../player/character3D.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { createBarTexture } from '@/utils/bar.utils';
import type { CharacterBodyState } from '#/state/character-body.state';

const BAR_Y_POSITION = 1.15;
const SCALE_FACTOR = 100;

export class HealthBarRenderEcs extends ComponentEcs {
	private spot: THREE.Object3D;
	private barMesh: THREE.Mesh | null = null;
	private barMaterial: THREE.MeshBasicMaterial | null = null;
	private renderClient: RenderClientEcs = null!;

	private lastLife = -1;
	private lastMaxLife = -1;

	constructor(private characterState: CharacterBodyState) {
		super();
		this.spot = new THREE.Object3D();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClient not found!');

		const character3D = this.world
			.getEntity(this.parent)
			.map((entity) => entity.get(Character3DEcs))
			.collapse()
			.unwrap('Character3D not found!');

		character3D.object3D.add(this.spot);

		this.rebuildBar();

		this.callOnDelete(() => {
			this.disposeBar();
			character3D.object3D.remove(this.spot);
		});
	}

	onLoop(_delta: number): void {
		this.spot.lookAt(this.renderClient.camera.position);

		const { life, maxLife } = this.characterState;
		if (life !== this.lastLife || maxLife !== this.lastMaxLife) {
			this.rebuildBar();
		}
	}

	private rebuildBar(): void {
		const { life, maxLife } = this.characterState;
		this.lastLife = life;
		this.lastMaxLife = maxLife;

		this.disposeBar();

		const { texture, size } = createBarTexture(life, maxLife);

		this.barMaterial = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			depthWrite: false,
		});

		this.barMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(size.width / SCALE_FACTOR, size.height / SCALE_FACTOR),
			this.barMaterial,
		);

		this.barMesh.position.y = BAR_Y_POSITION;
		this.spot.add(this.barMesh);
	}

	private disposeBar(): void {
		if (!this.barMesh) return;

		if (this.barMaterial?.map) {
			this.barMaterial.map.dispose();
		}
		this.barMaterial?.dispose();
		this.barMesh.geometry.dispose();
		this.spot.remove(this.barMesh);

		this.barMesh = null;
		this.barMaterial = null;
	}
}
