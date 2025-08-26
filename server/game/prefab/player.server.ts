import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';
import { PlayerState } from '#/state/game.state';

import { ServerDataEcs } from '../scripts/serverData.ecs';
import { Option } from '#/utils/Option';

class RigidServerEcs extends ComponentEcs {
	public collider: RAPIER.Collider = null!;
	public body: RAPIER.RigidBody = null!;

	private __initialPos: { x: number; y: number; z: number };

	constructor(pos: { x: number; y: number; z: number }) {
		super();
		this.__initialPos = pos;
	}

	onStart(): void {
		const physic = this.world
			.get(ServerDataEcs)
			.map((sd) => sd.worldPhysic)
			.unwrap('RAPIER World not found');

		const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
			this.__initialPos.x,
			this.__initialPos.y,
			this.__initialPos.z,
		);

		this.body = physic.createRigidBody(bodyDesc);
		this.collider = physic.createCollider(
			RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setRestitution(0.8),
			this.body,
		);

		this.callOnDelete(() => {
			physic.removeCollider(this.collider, true);
			physic.removeRigidBody(this.body);
		});
	}
}

class PlayerServerBehavior extends ComponentEcs {
	public state: PlayerState;
	public body: Option<RAPIER.RigidBody> = Option.none();

	constructor(pos: { x: number; y: number; z: number }) {
		super();

		this.state = new PlayerState(pos);
	}

	onStart(): void {
		const serverDataOp = this.world.get(ServerDataEcs);

		const gameState = serverDataOp
			.map((serverData) => serverData.state)
			.unwrap('GameState not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		gameState.players.set(parent.name, this.state);

		this.callOnDelete(() => {
			gameState.players.delete(parent.name);
		});

		this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe(RigidServerEcs))
			.map((r) => r.body)
			.giveTo(this.body);
	}

	onLoop(_delta: number): void {
		this.body.ifSome((b) => {
			const translation = b.translation();

			this.state.position.x = translation.x;
			this.state.position.y = translation.y;
			this.state.position.z = translation.z;
		});
	}
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) =>
	(name: string, pos: { x: number; y: number; z: number }) => {
		return new EntityEcs({
			name,
			world,
			components: {
				[RigidServerEcs.name]: new RigidServerEcs(pos),
				[PlayerServerBehavior.name]: new PlayerServerBehavior(pos),
			},
		});
	};
