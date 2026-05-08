import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { FloatingTextState } from '#/state/floating-text.state';
import { RenderClientEcs } from '../renderClient.ecs';
import { createTextTexture } from '@/utils/text.utils';

const SCALE_FACTOR = 100;

export class FloatingTextRenderEcs extends ComponentEcs {
	private spot: THREE.Object3D;
	private renderClient: RenderClientEcs = null!;

	private mesh: THREE.Mesh | null = null;
	private material: THREE.MeshBasicMaterial | null = null;

	private lastText: string = '';
	private lastForeground: string = '';
	private lastBackground: string = '';
	private lastFontSize: number = 0;

	constructor(private readonly state: FloatingTextState) {
		super();
		this.spot = new THREE.Object3D();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClient not found in FloatingTextRenderEcs!');

		this.renderClient.scene.add(this.spot);

		this.rebuildMesh();

		this.callOnDelete(() => {
			this.disposeMesh();
			this.renderClient.scene.remove(this.spot);
		});
	}

	onLoop(_delta: number): void {
		// Sync de posición — cubre tanto textos estáticos como adjuntos a un cuerpo
		const { x, y, z } = this.state.position;
		this.spot.position.set(x, y, z);

		this.spot.lookAt(this.renderClient.camera.position);

		const { text, foreground, background, fontSize } = this.state;

		if (
			text !== this.lastText ||
			foreground !== this.lastForeground ||
			background !== this.lastBackground ||
			fontSize !== this.lastFontSize
		) {
			this.rebuildMesh();
		}
	}

	private rebuildMesh(): void {
		const { text, foreground, background, fontSize } = this.state;

		this.lastText = text;
		this.lastForeground = foreground;
		this.lastBackground = background;
		this.lastFontSize = fontSize;

		this.disposeMesh();

		const { texture, size } = createTextTexture(text, {
			color: foreground,
			background,
			fontSize,
		});

		this.material = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
		});

		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(
				size.width / SCALE_FACTOR,
				size.height / SCALE_FACTOR,
			),
			this.material,
		);

		this.spot.add(this.mesh);
	}

	private disposeMesh(): void {
		if (!this.mesh) return;

		if (this.material?.map) {
			this.material.map.dispose();
		}
		this.material?.dispose();
		this.mesh.geometry.dispose();
		this.spot.remove(this.mesh);

		this.mesh = null;
		this.material = null;
	}
}
