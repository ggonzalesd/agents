import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { Character3DEcs } from '../player/character3D.ecs';
import { createTextTexture } from '@/utils/text.utils';
import { RenderClientEcs } from '../renderClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { UIClientEcs } from '../uiClient.ecs';

export class MessageRenderEcs extends ComponentEcs {
	private spot: THREE.Object3D;
	private uiClient: UIClientEcs = null!;
	private renderClient: RenderClientEcs = null!;
	private colyseusClient: ColyseusClientEcs = null!;

	private messages: Array<{
		texture: THREE.CanvasTexture;
		material: THREE.MeshBasicMaterial;
		plane: THREE.Mesh;
		time: number;
		height: number;
	}> = [];

	constructor() {
		super();

		this.spot = new THREE.Object3D();
	}

	/**
	 * Handles incoming agent messages.
	 * @param param0 Object containing the agent ID and message.
	 * @returns void
	 */
	private onAgentMessage({ id, message }: { id: string; message: string }) {
		if (this.parent !== id) return;

		this.addMessage(message);
		this.addToHistoryIfClose(id, message, 'talk');
	}

	private onAgentThought({ id, message }: { id: string; message: string }) {
		if (this.parent !== id) return;

		this.addMessage(message, { color: '#c4b5fd', background: '#1e1b4b' });
		this.addToHistoryIfClose(id, message, 'thought');
	}

	private addToHistoryIfClose(
		id: string,
		message: string,
		kind: 'talk' | 'thought',
	) {
		const thisCharacter = this.world
			.getEntity(this.parent)
			.map((entity) => entity.get(Character3DEcs))
			.collapse()
			.unwrap('Parent not found!');

		const otherCharacters = this.world
			.getEntity(this.colyseusClient.entityId)
			.map((entity) => entity.get(Character3DEcs))
			.collapse()
			.raw();

		if (!otherCharacters) return;

		const distance = thisCharacter.object3D.position.distanceTo(
			otherCharacters.object3D.position,
		);

		if (distance < 10) {
			this.uiClient.messageHistory.addMessage(
				`${id}-${kind}-${message}-${Date.now()}`,
				this.parent ?? 'Unknown',
				message,
				kind,
			);
		}
	}

	onStart(): void {
		this.uiClient = this.world.get(UIClientEcs).unwrap('UIClient not found!');

		this.colyseusClient = this.world
			.get(ColyseusClientEcs)
			.unwrap('ColyseusClient not found!');
		const room = this.colyseusClient.connection
			.pick('room')
			.unwrap('Room not found!');

		room.onMessage('agent:message', this.onAgentMessage.bind(this));
		room.onMessage('agent:thought', this.onAgentThought.bind(this));

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
	}

	onLoop(_delta: number): void {
		this.spot.lookAt(this.renderClient.camera.position);

		for (let i = 0; i < this.messages.length; i++) {
			this.messages[i].time -= _delta;
		}

		const prevLength = this.messages.length;
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

		if (this.messages.length !== prevLength) {
			this.recalculatePositions();
		}
	}

	private recalculatePositions() {
		let bottomY = 1.3;
		for (let i = this.messages.length - 1; i >= 0; i--) {
			const msg = this.messages[i];
			msg.plane.position.y = bottomY + msg.height / 2;
			bottomY += msg.height + 0.05;
		}
	}

	public addMessage(
		text: string,
		textOptions?: { color?: string; background?: string },
	) {
		const textTexture = createTextTexture(text, textOptions);
		const height = textTexture.size.height / 100;

		const textMaterial = new THREE.MeshBasicMaterial({
			map: textTexture.texture,
			transparent: true,
			depthWrite: false,
		});

		const textPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(textTexture.size.width / 100, height),
			textMaterial,
		);

		this.spot.add(textPlane);

		this.messages.push({
			texture: textTexture.texture,
			material: textMaterial,
			plane: textPlane,
			time: 10000,
			height,
		});

		this.recalculatePositions();
	}
}
