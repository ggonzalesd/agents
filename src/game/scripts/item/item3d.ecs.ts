import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { vec3Set } from '#/utils/math.util';
import type { ItemEntityState } from '#/state/inventory.state';
import { preloadGLB } from '@/utils/assets.utils';

export class Item3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D();
	public mesh: THREE.Mesh;
	private glowRing!: THREE.Mesh;

	constructor(private state: ItemEntityState) {
		super();

		// const typesColor = ['sword', 'potion', 'cookie', 'seeds', 'coin'] as const;
		const typesModel = {
			default: {
				path: '/3d/',
				scale: 0.75,
				items: {
					potion: 'potion.glb',
					seeds: 'seeds.glb',
					coin: 'coin.glb',
					cookies: 'cookies.glb',
				},
			},
			vegetables: {
				path: '/vegetables/Assets/gltf/',
				scale: 0.75,
				items: {
					lettuce: 'food_ingredient_lettuce.gltf',
					carrot: 'food_ingredient_carrot.gltf',
					tomato: 'food_ingredient_tomato.gltf',
					cheese: 'food_ingredient_cheese.gltf',
					onion: 'food_ingredient_onion.gltf',
					ham: 'food_ingredient_ham.gltf',
					steak: 'food_ingredient_steak.gltf',
					potato: 'food_ingredient_potato.gltf',
				},
			},
			armors: {
				path: '/armors/Assets/gltf/',
				scale: 0.75,
				items: {
					sword: 'sword_1handed.gltf',
					potion: 'sword_2handed.gltf',
					cookie: 'shield_square.gltf',
					seeds: 'axe_1handed.gltf',
					coin: 'axe_2handed.gltf',
				},
			},
		};

		this.mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }),
		);
		this.object3D.add(this.mesh);

		// Crear outline brillante (círculo en el suelo)
		this.createGlowRing();

		// Cargar modelo según tipo
		const itemType = this.state.item.type;
		for (const category of Object.values(typesModel)) {
			if (itemType in category.items) {
				const modelName =
					category.items[itemType as keyof typeof category.items];
				preloadGLB(`${category.path}${modelName}`).then((glb) => {
					this.object3D.add(glb[0].scene);
					this.object3D.scale.set(
						category.scale,
						category.scale,
						category.scale,
					);
					this.mesh.scale.set(1, 1, 1);
					this.mesh.rotation.set(0, 0, 0);
				});
				break;
			}
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
