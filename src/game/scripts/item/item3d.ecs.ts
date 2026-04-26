import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { vec3Set } from '#/utils/math.util';
import type { ItemEntityState } from '#/state/inventory.state';
import { preloadGLB } from '@/utils/assets.utils';
import { getItemModel } from '@/game/item-models.registry';

export class Item3DEcs extends ComponentEcs {
	public object3D: THREE.Object3D = new THREE.Object3D(); // Contenedor principal
	public mesh: THREE.Mesh; // Caja de colisión para interacción
	private meshContainer: THREE.Object3D = new THREE.Object3D(); // Para el modelo 3D
	private ringContainer: THREE.Object3D = new THREE.Object3D(); // Para el anillo brillante
	private glowRing!: THREE.Mesh;

	constructor(private state: ItemEntityState) {
		super();

		// Crear caja de colisión invisible
		const collisionBox = new THREE.BoxGeometry(0.5, 0.5, 0.5);
		const collisionMaterial = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			wireframe: true,
			visible: false, // Invisible pero con colisión
		});
		this.mesh = new THREE.Mesh(collisionBox, collisionMaterial);

		this.object3D.add(this.mesh);
		this.object3D.add(this.meshContainer);
		this.object3D.add(this.ringContainer);

		this.createGlowRing();

		const model = getItemModel(this.state.item.type);
		if (model) {
			preloadGLB(model.path).then((glb) => {
				this.meshContainer.add(glb[0].scene);
				this.meshContainer.scale.setScalar(model.scale);
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

		// Agregar al ringContainer
		this.ringContainer.add(this.glowRing);
	}

	onStart(): void {
		// userData en la caja de colisión para interacciones
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

		// Rotación lenta del meshContainer (solo el modelo, no todo)
		this.meshContainer.rotation.y += 0.01;

		// Pulsación suave del círculo brillante
		const time = performance.now() * 0.001; // Tiempo en segundos
		const scale = 1 + Math.sin(time * 2) * 0.1; // Pulsa entre 0.9 y 1.1
		this.ringContainer.scale.set(scale, scale, 1);

		// Rotación del círculo (opcional, puedes comentarlo si no te gusta)
		this.ringContainer.rotation.y += 0.005;
	}
}
