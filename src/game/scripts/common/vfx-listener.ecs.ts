import * as THREE from 'three';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { ColyseusClientEcs } from '../colyseus-client.ecs';
import { Character3DEcs } from '../player/character3D.ecs';
import { ClientAuthoritative } from '../player/clientAuthoritative.ecs';
import { VFXManagerEcs } from './vfx-manager.ecs';
import { VFXEffectType } from './vfx.config';
import type { MovementState } from '#/state/movement.state';

type AgentEvent = { id: string };

const EVENT_MAP: ReadonlyArray<[message: string, effect: VFXEffectType]> = [
	['agent:attack', VFXEffectType.Attack],
	['agent:attacked', VFXEffectType.Attacked],
	['agent:jump', VFXEffectType.Jump],
	['agent:healed', VFXEffectType.Healed],
	['agent:respawn', VFXEffectType.Respawn],
];

export class VFXListenerEcs extends ComponentEcs {
	private vfxManager: VFXManagerEcs = null!;
	private character3D: Character3DEcs = null!;
	private clientAuth: ClientAuthoritative | null = null;

	private positionRef = new THREE.Vector3();
	private runningCooldown = 0;

	private static readonly RUNNING_INTERVAL = 150;

	constructor(private movementState: MovementState) {
		super();
	}

	onStart(): void {
		this.vfxManager = this.world
			.get(VFXManagerEcs)
			.unwrap('VFXManagerEcs not found');

		this.character3D = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(Character3DEcs))
			.unwrap('Character3DEcs not found');

		this.clientAuth = this.world
			.getEntity(this.parent)
			.map((e) => e.get(ClientAuthoritative))
			.collapse()
			.raw();

		const room = this.world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.pick('room')
			.unwrap('Room not found');

		for (const [message, effectType] of EVENT_MAP) {
			room.onMessage(message, (data: AgentEvent) => {
				if (data.id !== this.parent) return;

				this.positionRef.copy(this.character3D.object3D.position);
				this.vfxManager.spawn(effectType, this.positionRef);
			});
		}
	}

	onLoop(delta: number): void {
		const isMoving =
			this.clientAuth?.state.isMoving || this.movementState.isMoving;

		if (!isMoving) {
			this.runningCooldown = 0;
			return;
		}

		this.runningCooldown -= delta;
		if (this.runningCooldown <= 0) {
			this.runningCooldown = VFXListenerEcs.RUNNING_INTERVAL;
			this.positionRef.copy(this.character3D.object3D.position);
			this.positionRef.y -= 1;
			this.vfxManager.spawn(VFXEffectType.Running, this.positionRef);
		}
	}
}
