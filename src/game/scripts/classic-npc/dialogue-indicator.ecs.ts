import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { NPCState } from '#/state/game.state';
import { Character3DEcs } from '../player/character3D.ecs';
import { RenderClientEcs } from '../renderClient.ecs';

const INDICATOR_Y = 1.6;
const INDICATOR_SIZE = 0.35;

function createExclamationTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	const size = 128;
	canvas.width = size;
	canvas.height = size;

	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#facc15';
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = '#1c1917';
	ctx.font = 'bold 80px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('!', size / 2, size / 2 + 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

export class DialogueIndicatorEcs extends ComponentEcs {
	private spot: THREE.Object3D;
	private mesh: THREE.Mesh | null = null;
	private material: THREE.MeshBasicMaterial | null = null;
	private texture: THREE.CanvasTexture | null = null;
	private renderClient: RenderClientEcs = null!;
	private npcState: NPCState = null!;

	private lastHasOneShot = false;

	constructor() {
		super();
		this.spot = new THREE.Object3D();
	}

	onStart(): void {
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClient not found!');

		const parentEntity = this.world
			.getEntity(this.parent)
			.unwrap('Parent entity not found!');

		const object3D = parentEntity
			.get(Character3DEcs)
			.unwrap('Character3DEcs not found!').object3D;

		object3D.add(this.spot);

		this.npcState = parentEntity
			.get(RecordEcs)
			.unwrap('RecordEcs not found!')
			.getRecord<NPCState>('state')
			.unwrap('NPCState not found in RecordEcs');

		this.lastHasOneShot = this.npcState.hasOneShotDialogue;
		if (this.lastHasOneShot) {
			this.show();
		}

		this.callOnDelete(() => {
			this.disposeMesh();
			object3D.remove(this.spot);
		});
	}

	onLoop(_delta: number): void {
		const current = this.npcState.hasOneShotDialogue;
		if (current !== this.lastHasOneShot) {
			this.lastHasOneShot = current;
			if (current) {
				this.show();
			} else {
				this.hide();
			}
		}

		if (this.mesh) {
			this.spot.lookAt(this.renderClient.camera.position);
		}
	}

	private show(): void {
		if (this.mesh) return;

		this.texture = createExclamationTexture();
		this.material = new THREE.MeshBasicMaterial({
			map: this.texture,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
		});

		this.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(INDICATOR_SIZE, INDICATOR_SIZE),
			this.material,
		);
		this.mesh.position.y = INDICATOR_Y;
		this.spot.add(this.mesh);
	}

	private hide(): void {
		if (!this.mesh) return;
		this.disposeMesh();
	}

	private disposeMesh(): void {
		if (this.mesh) {
			this.spot.remove(this.mesh);
			this.mesh = null;
		}
		if (this.material) {
			this.material.dispose();
			this.material = null;
		}
		if (this.texture) {
			this.texture.dispose();
			this.texture = null;
		}
	}
}
