import * as THREE from 'three';
import type { Room } from 'colyseus.js';

import { ComponentEcs } from '#/ecs/Component.ecs';
import type { GameState } from '#/state/game.state';

import type { GameInput } from '@/utils/input.utils';

import { RenderClientEcs } from '../renderClient.ecs';
import { UIClientEcs } from '../uiClient.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';

import { ClientAuthoritative } from './clientAuthoritative.ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { PlayerState } from '#/state/player.state';

export class PlayerClientBehavior extends ComponentEcs {
	public camera: THREE.Camera = null!;
	public input: GameInput = null!;
	public room: Room<GameState> = null!;
	public uiClient: UIClientEcs = null!;

	public clientAuthoritative: ClientAuthoritative = null!;
	public recordEcs: RecordEcs = null!;

	onStart(): void {
		const player = this.world.getEntity(this.parent).unwrap('No Player found');

		this.recordEcs = player.get(RecordEcs).unwrap('No RecordEcs found');

		this.recordEcs.getRecord('state').unwrap('No state record found');

		this.clientAuthoritative = player
			.get(ClientAuthoritative)
			.unwrap('No ClientAuthoritative found');

		this.uiClient = this.world.get(UIClientEcs).unwrap('No UIClientEcs found');

		this.input = this.uiClient.input;

		this.room = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.pick('room')
			.unwrap('Connection not found');

		this.camera = this.world
			.get(RenderClientEcs)
			.pick('camera')
			.unwrap('No RenderClientEcs found');

		// Testing Actions
		/* this.world.get(UIClientEcs).ifSome(({ actions }) =>
			actions.listen('jump', () => {
				if (room.sessionId === this.parent) {
					this.room.send('client:action', { type: 'jump' });
				}
			}),
		); */
	}

	onLoop(_delta: number): void {
		const state = this.recordEcs.getUnsafeRecord<PlayerState>('state');
		if (this.room.sessionId !== state.sessionId) return;

		if (this.input.down('KeyT')) {
			this.uiClient.game.setPause(true, 'MESSAGE');
			this.input.disabled = true;
		}

		if (this.input.down('KeyE')) {
			this.uiClient.game.setPause(true, 'INVENTORY');
			this.input.disabled = true;
		}

		if (this.input.down('Space') && this.room.connection.isOpen) {
			this.room.send('client:action', { type: 'jump' });
		}

		// Movement
		const isMoving = this.input.anyPress('KeyW', 'KeyA', 'KeyS', 'KeyD');
		const axis = this.input.axisPress('KeyW', 'KeyS', 'KeyD', 'KeyA');

		const u = new THREE.Vector3(1, 0, 0);
		u.applyQuaternion(this.camera.quaternion);
		u.y = 0;
		const cameraAngle = Math.atan2(u.z, u.x);

		const angle = Math.atan2(axis.y, axis.x) - cameraAngle;

		this.world.stacker.dispatch(
			'item-interact',
			((itemParent: string) => {
				this.room.send('client:action', { type: 'pick', itemParent });
			}).bind(this),
		);

		this.clientAuthoritative.update({
			isMoving,
			...(isMoving ? { direction: angle } : {}),
		});
	}
}
