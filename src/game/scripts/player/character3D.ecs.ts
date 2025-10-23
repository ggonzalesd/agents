import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { vec3Set } from '#/utils/math.util';

import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { cloneMesh, loadGLB, loadTexture } from '@/utils/assets.utils';
import { ClientAuthoritative } from './clientAuthoritative.ecs';
import type { CharacterBodyState } from '#/state/character-body.state';
import type { MovementState } from '#/state/movement.state';

export class Character3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();

	private renderClient: RenderClientEcs = null!;

	private actions: Record<'IDLE' | 'WALK', THREE.AnimationAction> = null!;
	private mixer: THREE.AnimationMixer = null!;
	private clientAuth: ClientAuthoritative | null = null;

	constructor(
		private characterState: CharacterBodyState,
		private movementState: MovementState,
		private skin: string,
	) {
		super();

		const mesh = new THREE.Mesh(
			new THREE.CapsuleGeometry(0.5, 1, 8),
			new THREE.MeshBasicMaterial({
				color: Math.random() * 0xffffff,
				wireframe: true,
				opacity: 0.1,
				transparent: true,
			}),
		);

		this.object3D.add(mesh);
		// this.object3D.add(sphere);

		// Skinning /3d/gordon.png with transparency
		const material = new THREE.MeshStandardMaterial({
			map: loadTexture(
				`${import.meta.env.VITE_API_URL}/api/v1/skin/${this.skin}.png`,
			),
		});
		material.transparent = true;

		{
			const { mesh, mixer, actions } = cloneMesh(
				loadGLB('/3d/SkinModel.glb'),
				material,
				['IDLE', 'WALK'],
			);

			this.actions = actions;
			this.mixer = mixer;

			mesh.position.set(0, -1, 0);
			mesh.rotateY(Math.PI / 2);
			mesh.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			this.object3D.add(mesh);
		}
	}

	onStart(): void {
		// World Components
		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('No RenderClientEcs found');

		// Colyseus Components
		this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		// Render Config
		this.renderClient.scene.add(this.object3D);
		this.callOnDelete(() => this.renderClient.scene.remove(this.object3D));

		this.clientAuth = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(ClientAuthoritative))
			.raw();
	}

	onLoop(_delta: number): void {
		this.mixer.update(_delta * 0.001);

		vec3Set(this.object3D.position, this.characterState.position);

		this.object3D.quaternion.setFromEuler(
			new THREE.Euler(0, this.characterState.rotationY, 0),
		);

		// TODO: Is Moving from Share State
		const isMoving =
			this.clientAuth?.state.isMoving || this.movementState.isMoving;
		if (isMoving) {
			this.actions.IDLE.stop();
			this.actions.WALK.play();
		} else {
			this.actions.WALK.stop();
			this.actions.IDLE.play();
		}
	}
}
