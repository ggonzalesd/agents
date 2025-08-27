import * as RAPIER from '@dimforge/rapier3d-compat';

import { vec3ToRapier } from '$/utils/math.utils';

import { ComponentEcs } from '#/ecs';
import {
	vec2Normalize,
	vec3Add,
	vec3dLerp,
	vec3Flatten,
	vec3Scale,
	vec3Set,
	vec3Up,
	type IVec2,
	type IVec3,
} from '#/utils/math.util';

import { ServerDataEcs } from '../serverData.ecs';

export class CharacterBodyServerEcs extends ComponentEcs {
	public physic: RAPIER.World = null!;
	public body: RAPIER.RigidBody = null!;
	public collider: RAPIER.Collider = null!;

	public isMoving = false;
	public isJumping = false;
	public direction: IVec3 = { x: 0, y: 0, z: 0 };
	public clientDirection: IVec2 = { x: 0, y: 0 };

	constructor(private iPos: IVec3) {
		super();
	}

	onStart(): void {
		this.physic = this.world
			.get(ServerDataEcs)
			.map(({ worldPhysic }) => worldPhysic)
			.unwrap('RAPIER World not found');

		const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
			...vec3Flatten(this.iPos),
		);
		this.body = this.physic.createRigidBody(bodyDesc);

		const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.5).setRestitution(
			0.8,
		);
		this.collider = this.physic.createCollider(colliderDesc, this.body);

		this.body.lockRotations(true, true);

		this.callOnDelete(() => {
			this.physic.removeCollider(this.collider, true);
			this.physic.removeRigidBody(this.body);
		});
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

		const vel = this.body.linvel();

		if (this.isMoving) {
			const speed = isGround ? 6 : 3;

			const newVel = vec3Add(vec3Scale(this.direction, speed), vec3Up(vel.y));
			this.body.setLinvel(vec3ToRapier(newVel), true);
		} else if (isGround) {
			const newVel = vec3Scale(vel, -0.1);
			this.body.applyImpulse(vec3ToRapier(newVel), true);
		}

		if (this.isJumping && isGround) {
			this.isJumping = false;
			this.body.applyImpulse(vec3ToRapier(vec3Up(15)), true);
		}
	}

	public isGround() {
		const position = this.body.translation();
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
				(c) => c !== this.collider,
			) != null
		);
	}
}
