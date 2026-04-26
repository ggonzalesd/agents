import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { vec3Set } from '#/utils/math.util';
import {
	CharacterAnimation,
	CharacterBone,
} from '#/state/character-animation';

import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import {
	cloneMesh,
	loadGLB,
	loadTexture,
	preloadGLB,
} from '@/utils/assets.utils';
import {
	getCharacterAnimationClipName,
	getCharacterModelConfig,
} from '@/game/character-models.registry';
import { findBone } from '@/utils/bone.util';
import { getItemModel } from '@/game/item-models.registry';
import { ClientAuthoritative } from './clientAuthoritative.ecs';
import type { CharacterBodyState } from '#/state/character-body.state';
import type { MovementState } from '#/state/movement.state';

const CROSSFADE_SECONDS = 0.15;

export class Character3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();
	public rigObject3D: THREE.Object3D = new THREE.Object3D();

	private renderClient: RenderClientEcs = null!;
	private colyseusClient: ColyseusClientEcs = null!;

	private actions: Record<CharacterAnimation, THREE.AnimationAction> = null!;
	private mixer: THREE.AnimationMixer = null!;
	private clientAuth: ClientAuthoritative | null = null;

	private currentLoopAction: THREE.AnimationAction | null = null;
	private oneShotAction: THREE.AnimationAction | null = null;
	private isDead = false;

	private weaponBone: THREE.Bone | null = null;
	private handItem: THREE.Object3D | null = null;
	private handItemRequestId = 0;

	public damageEffect = 0;
	public healEffect = 0;
	private damageMaterials: THREE.MeshStandardMaterial[] = [];

	constructor(
		private characterState: CharacterBodyState,
		private movementState: MovementState,
		private skin: string,
	) {
		super();

		const modelConfig = getCharacterModelConfig(this.skin);

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

		// Mark meshes as interactable entity by default; specific type can be inferred elsewhere
		mesh.userData = {
			canInteract: true,
			isEntity: true,
			parent: this.parent,
		};
		// this.object3D.add(sphere);

		// Skinning /3d/gordon.png with transparency
		const material = modelConfig.useSkinTexture
			? new THREE.MeshStandardMaterial({
					map: loadTexture(
						`${import.meta.env.VITE_API_URL}/api/v1/skin/${this.skin}.png`,
					),
				})
			: null;

		if (material) {
			material.transparent = true;
			this.damageMaterials = [material];
		}

		{
			const { mesh, mixer, actions } = cloneMesh(
				loadGLB(modelConfig.path),
				material ?? undefined,
				[
					getCharacterAnimationClipName(this.skin, CharacterAnimation.IDLE),
					getCharacterAnimationClipName(this.skin, CharacterAnimation.WALK),
					getCharacterAnimationClipName(this.skin, CharacterAnimation.ATTACK),
					getCharacterAnimationClipName(this.skin, CharacterAnimation.CONSUME),
					getCharacterAnimationClipName(this.skin, CharacterAnimation.JUMP),
					getCharacterAnimationClipName(this.skin, CharacterAnimation.DIE),
				],
			);

			this.actions = {
				[CharacterAnimation.IDLE]:
					actions[getCharacterAnimationClipName(this.skin, CharacterAnimation.IDLE)],
				[CharacterAnimation.WALK]:
					actions[getCharacterAnimationClipName(this.skin, CharacterAnimation.WALK)],
				[CharacterAnimation.ATTACK]:
					actions[
						getCharacterAnimationClipName(this.skin, CharacterAnimation.ATTACK)
					],
				[CharacterAnimation.CONSUME]:
					actions[
						getCharacterAnimationClipName(this.skin, CharacterAnimation.CONSUME)
					],
				[CharacterAnimation.JUMP]:
					actions[getCharacterAnimationClipName(this.skin, CharacterAnimation.JUMP)],
				[CharacterAnimation.DIE]:
					actions[getCharacterAnimationClipName(this.skin, CharacterAnimation.DIE)],
			};
			this.mixer = mixer;

			if (!material) {
				const damageMaterials = new Set<THREE.MeshStandardMaterial>();
				mesh.traverse((child) => {
					if (!(child instanceof THREE.Mesh)) return;

					const materials = Array.isArray(child.material)
						? child.material
						: [child.material];

					materials.forEach((childMaterial) => {
						if (childMaterial instanceof THREE.MeshStandardMaterial) {
							damageMaterials.add(childMaterial);
						}
					});
				});
				this.damageMaterials = [...damageMaterials];
			}

			this.actions[CharacterAnimation.IDLE]?.play();
			this.currentLoopAction = this.actions[CharacterAnimation.IDLE] ?? null;

			for (const oneShot of [
				CharacterAnimation.ATTACK,
				CharacterAnimation.CONSUME,
				CharacterAnimation.JUMP,
				CharacterAnimation.DIE,
			]) {
				const action = this.actions[oneShot];
				if (!action) continue;
				action.setLoop(THREE.LoopOnce, 1);
				action.clampWhenFinished = oneShot === CharacterAnimation.DIE;
			}

			mesh.position.set(0, modelConfig.positionY, 0);
			mesh.scale.setScalar(modelConfig.scale);
			mesh.rotateY(modelConfig.rotationY);
			mesh.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			this.rigObject3D.add(mesh);
			this.object3D.add(this.rigObject3D);

			this.weaponBone = findBone(mesh, CharacterBone.WEAPON_HAND);
		}
	}

	private clearHandItem(): void {
		this.handItemRequestId += 1;
		if (this.handItem) {
			this.handItem.parent?.remove(this.handItem);
			this.handItem.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose?.();
				}
			});
			this.handItem = null;
		}
	}

	private attachHandItem(itemType: string): void {
		if (!this.weaponBone) return;
		const model = getItemModel(itemType);
		if (!model) return;

		this.clearHandItem();
		const requestId = ++this.handItemRequestId;

		preloadGLB(model.path).then(([glb]) => {
			if (requestId !== this.handItemRequestId) return;
			if (!this.weaponBone) return;

			const holder = glb.scene.clone(true);
			holder.scale.setScalar(model.scale);

			this.weaponBone.add(holder);
			this.handItem = holder;
		});
	}

	private playOneShot(anim: CharacterAnimation): void {
		if (this.isDead) return;
		const action = this.actions[anim];
		if (!action) return;

		this.oneShotAction?.fadeOut(CROSSFADE_SECONDS);
		this.currentLoopAction?.fadeOut(CROSSFADE_SECONDS);

		action.reset().setEffectiveWeight(1).fadeIn(CROSSFADE_SECONDS).play();
		this.oneShotAction = action;
	}

	private setLoop(anim: CharacterAnimation): void {
		if (this.isDead) return;
		const next = this.actions[anim];
		if (!next || next === this.currentLoopAction) return;

		this.currentLoopAction?.fadeOut(CROSSFADE_SECONDS);
		next.reset().setEffectiveWeight(1).fadeIn(CROSSFADE_SECONDS).play();
		this.currentLoopAction = next;
	}

	private playDie(): void {
		const action = this.actions[CharacterAnimation.DIE];
		if (!action) return;
		this.isDead = true;
		this.oneShotAction?.fadeOut(CROSSFADE_SECONDS);
		this.currentLoopAction?.fadeOut(CROSSFADE_SECONDS);
		action.reset().setEffectiveWeight(1).fadeIn(CROSSFADE_SECONDS).play();
		this.oneShotAction = action;
	}

	private revive(): void {
		this.isDead = false;
		const die = this.actions[CharacterAnimation.DIE];
		die?.fadeOut(CROSSFADE_SECONDS);
		this.oneShotAction = null;
		const idle = this.actions[CharacterAnimation.IDLE];
		if (idle) {
			idle.reset().setEffectiveWeight(1).fadeIn(CROSSFADE_SECONDS).play();
			this.currentLoopAction = idle;
		}
	}

		onStart(): void {
			this.colyseusClient = this.world
				.get(ColyseusClientEcs)
				.unwrap('ColyseusClient not found!');
			const room = this.colyseusClient.connection
				.pick('room')
				.unwrap('Room not found!');

			room.onMessage(
				'agent:damaged',
				((message: { id: string }) => {
					if (message.id === this.parent) {
						this.damageEffect = 1.5;
					}
			}).bind(this),
		);

		room.onMessage(
			'agent:attack',
			((message: { id: string }) => {
				if (message.id === this.parent) {
					this.playOneShot(CharacterAnimation.ATTACK);
				}
			}).bind(this),
		);

		room.onMessage(
			'agent:jump',
			((message: { id: string }) => {
				if (message.id === this.parent) {
					this.playOneShot(CharacterAnimation.JUMP);
				}
			}).bind(this),
		);

		room.onMessage(
			'agent:consume',
			((message: { id: string; itemType?: string }) => {
				if (message.id === this.parent) {
					if (message.itemType) {
						this.attachHandItem(message.itemType);
					}
					this.playOneShot(CharacterAnimation.CONSUME);
				}
			}).bind(this),
		);

		room.onMessage(
			'agent:died',
			((message: { id: string }) => {
				if (message.id === this.parent) {
					this.playDie();
				}
			}).bind(this),
		);

		room.onMessage(
			'agent:healed',
			((message: { id: string }) => {
				if (message.id === this.parent) {
					this.healEffect = 1.5;
				}
			}).bind(this),
		);

		room.onMessage(
			'agent:respawn',
			((message: { id: string }) => {
				if (message.id === this.parent) {
					this.healEffect = 2.0;
					this.revive();
				}
			}).bind(this),
		);

		this.mixer.addEventListener('finished', (event) => {
			const finishedAction = (event as unknown as { action: THREE.AnimationAction }).action;
			if (finishedAction === this.actions[CharacterAnimation.CONSUME]) {
				this.clearHandItem();
			}
			if (
				finishedAction === this.oneShotAction &&
				finishedAction !== this.actions[CharacterAnimation.DIE]
			) {
				this.oneShotAction = null;
			}
		});

		this.callOnDelete(() => this.clearHandItem());

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
		// Propagate userData to all mesh children so raycaster hits carry the flags
		this.object3D.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.userData = {
					canInteract: true,
					isEntity: true,
					parent: this.parent,
				};
			}
		});

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

		if (this.damageEffect > 0) {
			this.damageEffect -= _delta * 0.002;

			this.damageMaterials.forEach((material) => {
				material.emissive = new THREE.Color(1, 0, 0);
				material.emissiveIntensity = Math.min(this.damageEffect, 1.25);
			});
		} else if (this.healEffect > 0) {
			this.healEffect -= _delta * 0.002;

			this.damageMaterials.forEach((material) => {
				material.emissive = new THREE.Color(0, 1, 0);
				material.emissiveIntensity = Math.min(this.healEffect, 1.25);
			});
		} else {
			this.damageEffect = 0;
			this.healEffect = 0;
			this.damageMaterials.forEach((material) => {
				material.emissiveIntensity = 0;
			});
		}

		if (this.isDead) return;

		const isMoving =
			this.clientAuth?.state.isMoving || this.movementState.isMoving;
		this.setLoop(isMoving ? CharacterAnimation.WALK : CharacterAnimation.IDLE);
	}
}
