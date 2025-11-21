import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { vec3Set } from '#/utils/math.util';
import type { ItemEntityState } from '#/state/inventory.state';
import { preloadGLB } from '@/utils/assets.utils';

export class Item3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();
	public mesh: THREE.Object3D;
	private glowRing!: THREE.Mesh;

	constructor(private state: ItemEntityState) {
		super();

		// const typesColor = ['sword', 'potion', 'cookie', 'seeds', 'coin'] as const;
		const typesModelVegetables = {
			lettuce: 'food_ingredient_lettuce',
			carrot: 'food_ingredient_carrot',
			tomato: 'food_ingredient_tomato',
			cheese: 'food_ingredient_cheese',
			onion: 'food_ingredient_onion',
			ham: 'food_ingredient_ham',
			steak: 'food_ingredient_steak',
			potato: 'food_ingredient_potato',
		};

		const typesModelArmors = {
			sword: 'sword_1handed',
			potion: 'sword_2handed',
			cookie: 'shield_square',
			seeds: 'axe_1handed',
			coin: 'axe_2handed',
		};

		this.mesh = new THREE.Object3D();
		const scale = 0.5;

		// Crear outline brillante (círculo en el suelo)
		this.createGlowRing();

		if (this.state.item.type in typesModelVegetables) {
			preloadGLB(
				`/vegetables/Assets/gltf/${typesModelVegetables[this.state.item.type as keyof typeof typesModelVegetables]}.gltf`,
			).then((glb) => {
				this.mesh.add(glb[0].scene);
				this.mesh.scale.set(scale, scale, scale);
				this.mesh.rotation.set(0, 0, 0);
				this.object3D.add(this.mesh);
			});
		} else if (this.state.item.type in typesModelArmors) {
			preloadGLB(
				`/armors/Assets/gltf/${typesModelArmors[this.state.item.type as keyof typeof typesModelArmors]}.gltf`,
			).then((glb) => {
				this.mesh.add(glb[0].scene);
				this.mesh.scale.set(scale, scale, scale);
				this.mesh.rotation.set(0, 0, 0);
				this.object3D.add(this.mesh);
			});
		}
	}

	/**
	 * Crea un círculo brillante debajo del item para mejor visibilidad
	 */
	private createGlowRing(): void {
		// Círculo simple y eficiente con borde
		const geometry = new THREE.RingGeometry(0.25, 0.35, 32);
		const material = new THREE.MeshBasicMaterial({
			color: 0xffffff, // Blanco para visibilidad en cualquier superficie
			transparent: true,
			opacity: 0.4,
			side: THREE.DoubleSide,
			depthWrite: false, // Evita problemas de z-fighting
		});

		this.glowRing = new THREE.Mesh(geometry, material);
		this.glowRing.rotation.x = -Math.PI / 2; // Horizontal en el suelo
		this.glowRing.position.y = -0.2; // Muy cerca del suelo

		this.object3D.add(this.glowRing);
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

		// Colyseus Components
		const { proxy } = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.unwrap('No Connection found');

		// Sync Position
		proxy(this.state.character.position).onChange(() => {
			vec3Set(this.object3D.position, this.state.character.position);
		});

		// Render Config
		renderClient.scene.add(this.object3D);
		this.callOnDelete(() => renderClient.scene.remove(this.object3D));
	}

	onLoop(_delta: number): void {
		vec3Set(this.object3D.position, this.state.character.position);

		// Rotación lenta del item sobre su eje Y
		this.mesh.rotation.y += 0.01;

		// Pulsación suave del círculo brillante
		const time = performance.now() * 0.001; // Tiempo en segundos
		const scale = 1 + Math.sin(time * 2) * 0.1; // Pulsa entre 0.9 y 1.1
		this.glowRing.scale.set(scale, scale, 1);

		// Rotación del círculo (opcional, puedes comentarlo si no te gusta)
		this.glowRing.rotation.z += 0.005;
	}
}
