import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs';
import { vec3Flatten, vec3Set } from '#/utils/math.util';

import { ServerDataEcs } from '../serverData.ecs';
import type { CharacterBodyState } from '#/state/character-body.state';

export class CharacterBodyServerEcs extends ComponentEcs {
	public physic: RAPIER.World = null!;
	public body: RAPIER.RigidBody = null!;
	public collider: RAPIER.Collider = null!;

	constructor(
		public characterState: CharacterBodyState,
		private configShape: 'capsule' | 'cuboid' = 'capsule',
	) {
		super();
	}

	onStart(): void {
		this.physic = this.world
			.get(ServerDataEcs)
			.map(({ worldPhysic }) => worldPhysic)
			.unwrap('RAPIER World not found');

		const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
			...vec3Flatten(this.characterState.position),
		);
		this.body = this.physic.createRigidBody(bodyDesc);

		const colliderDesc =
			this.configShape === 'capsule'
				? RAPIER.ColliderDesc.capsule(0.5, 0.5)
				: RAPIER.ColliderDesc.cuboid(0.25, 0.25, 0.25)
						.setRestitution(0.1)
						.setFriction(0.0);
		this.collider = this.physic.createCollider(colliderDesc, this.body);

		this.collider.setRestitution(0.01);

		this.body.lockRotations(true, true);

		this.callOnDelete(() => {
			this.physic.removeCollider(this.collider, true);
			this.physic.removeRigidBody(this.body);
		});
	}

	onLoop(_delta: number): void {
		vec3Set(this.characterState.position, this.body.translation());
	}
}
