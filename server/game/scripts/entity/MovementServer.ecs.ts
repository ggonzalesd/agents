import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';

import {
	vec2Normalize,
	vec3Add,
	vec3dLerp,
	vec3Scale,
	vec3Set,
	vec3Up,
	type IVec2,
	type IVec3,
} from '#/utils/math.util';

import type { MovementState } from '#/state/movement.state';

import { vec3ToRapier } from '$/utils/math.utils';

import { ServerDataEcs } from '../serverData.ecs';

import { CharacterBodyServerEcs } from './CharacterBodyServer.ecs';

export class MovementServerEcs extends ComponentEcs {
	physic: RAPIER.World = null!;
	character: CharacterBodyServerEcs = null!;

	public direction: IVec3 = { x: 0, y: 0, z: 0 };
	public clientDirection: IVec2 = { x: 0, y: 0 };

	private serverData: ServerDataEcs = null!;

	constructor(public movementState: MovementState) {
		super();
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.physic = this.serverData.worldPhysic;

		this.character = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');
	}

	onLoop(_delta: number): void {
		const isGround = this.isGround();
		const umbral = isGround ? 0.25 : 0.05;

		const _clientDirection = vec2Normalize(this.clientDirection);
		const clientVector: IVec3 = {
			x: _clientDirection.x,
			y: 0,
			z: _clientDirection.y,
		};

		const moveDirection = vec3dLerp(this.direction, clientVector, umbral);
		vec3Set(this.direction, moveDirection);

		const vel = this.character.body.linvel();

		if (this.movementState.isMoving) {
			const speed = isGround ? 6 : 3;

			const newVel = vec3Add(vec3Scale(this.direction, speed), vec3Up(vel.y));
			this.character.body.setLinvel(vec3ToRapier(newVel), true);
		} else if (isGround) {
			const newVel = vec3Scale(vel, -0.1);
			this.character.body.applyImpulse(vec3ToRapier(newVel), true);
		}

		if (this.movementState.isJumping && isGround) {
			this.movementState.isJumping = false;
			this.character.body.applyImpulse(vec3ToRapier(vec3Up(10)), true);

			this.serverData.room.broadcast('agent:jump', {
				id: this.parent,
			});
		}
	}

	public isGround() {
		const position = this.character.body.translation();
		const ray = new RAPIER.Ray(position, new RAPIER.Vector3(0, -1.25, 0));
		return (
			this.physic.castRay(
				ray,
				1,
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				(c) => c !== this.character.collider,
			) != null
		);
	}
}
