import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { vec3Set } from '#/utils/math.util';

import type { PlayerState } from '#/state/player.state';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseusClient.ecs';
import { cloneMesh, loadGLB, loadTexture } from '@/utils/assets.utils';
import { ClientAuthoritative } from './clientAuthoritative.ecs';

export class Player3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();

	private renderClient: RenderClientEcs = null!;

	private actions: Record<'IDLE' | 'WALK', THREE.AnimationAction> = null!;
	private mixer: THREE.AnimationMixer = null!;
	private clientAuth: ClientAuthoritative = null!;

	constructor(private state: PlayerState) {
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
				import.meta.env.VITE_API_URL + '/api/v1/skin/' + state.skin + '.png',
			),
		});
		material.transparent = true;

		{
			const { mesh, mixer, actions } = cloneMesh(
				loadGLB('/3d/SkinModel.glb'),
				material,
				['IDLE', 'WALK'],
			);

			console.log(actions);

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
		const { proxy } = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		// Render Config
		this.renderClient.scene.add(this.object3D);
		this.callOnDelete(() => this.renderClient.scene.remove(this.object3D));

		// Sync Position
		proxy(this.state.character.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.character.position);
		});

		this.clientAuth = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(ClientAuthoritative))
			.unwrap('No ClientAuthoritative found');
	}

	onLoop(_delta: number): void {
		this.mixer.update(_delta * 0.001);

		this.object3D.quaternion.setFromEuler(
			new THREE.Euler(0, this.state.character.rotationY, 0),
		);

		// TODO: Is Moving from Share State
		const isMoving =
			this.clientAuth.state.isMoving || this.state.movement.isMoving;
		if (isMoving) {
			this.actions.IDLE.stop();
			this.actions.WALK.play();
		} else {
			this.actions.WALK.stop();
			this.actions.IDLE.play();
		}
	}
}
