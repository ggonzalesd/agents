import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { Character3DEcs } from '../player/character3D.ecs';
import { createTextTexture } from '@/utils/text.utils';
import { RenderClientEcs } from '../renderClient.ecs';
import { UIClientEcs } from '../uiClient.ecs';
import { ColyseusClientEcs } from '../colyseusClient.ecs';

export class MessageRenderEcs extends ComponentEcs {
	private spot: THREE.Object3D;
	private renderClient: RenderClientEcs = null!;
	private uiClient: UIClientEcs = null!;
	private colyseusClient: ColyseusClientEcs = null!;

	private messages: Array<{
		texture: THREE.CanvasTexture;
		material: THREE.MeshBasicMaterial;
		plane: THREE.Mesh;
		time: number;
	}> = [];

	constructor() {
		super();

		this.spot = new THREE.Object3D();
	}

	onStart(): void {
		this.colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('ColyseusClient not found!');
		const room = this.colyseusClient.connection
			.pick('room')
			.unwrap('Room not found!');

		room.onMessage(
			'agent:message',
			(({ id, message }: { id: string; message: string }) => {
				if (this.parent === id) {
					this.addMessage(message);
				}
			}).bind(this),
		);

		const parentEntity = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found!');

		const character3D = parentEntity
			.get(Character3DEcs)
			.unwrap('Character3D not found!');

		character3D.object3D.add(this.spot);

		this.renderClient = this.world
			.get(RenderClientEcs)
			.unwrap('RenderClient not found!');

		this.uiClient = this.world.get(UIClientEcs).unwrap('UIClient not found!');
	}

	onLoop(_delta: number): void {
		// Look at the camera

		this.spot.lookAt(this.renderClient.camera.position);

		for (let i = 0; i < this.messages.length; i++) {
			const message = this.messages[i];
			message.time -= _delta;
		}
		this.messages = this.messages.filter((message) => {
			if (message.time > 0) return true;

			if (message.material.map) {
				message.material.map.dispose();
			}

			message.material.dispose();
			message.plane.geometry.dispose();

			this.spot.remove(message.plane);

			return false;
		});
	}

	public addMessage(text: string) {
		const textTexture = createTextTexture(text);

		const textMaterial = new THREE.MeshBasicMaterial({
			map: textTexture.texture,
			transparent: true,
		});

		const textPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(
				textTexture.size.width / 100,
				textTexture.size.height / 100,
			),
			textMaterial,
		);
		textPlane.position.y = 1.1;

		this.spot.add(textPlane);

		for (let i = 0; i < this.messages.length; i++) {
			const message = this.messages[i];
			message.plane.position.y += textTexture.size.height / 100;
		}

		this.messages.push({
			texture: textTexture.texture,
			material: textMaterial,
			plane: textPlane,
			time: 5000,
		});
	}
}
