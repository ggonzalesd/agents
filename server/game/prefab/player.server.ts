import * as RAPIER from '@dimforge/rapier3d-compat';

import { ComponentEcs } from '#/ecs/Component.ecs';
import { PlayerState } from '#/state/game.state';
import { vec3Flatten, vec3Set, vec4Set, type IVec3 } from '#/utils/math.util';
import { Option } from '#/utils/Option';
import { EntityEcs, type WorldEcs } from '#/ecs';

import { ServerDataEcs } from '../scripts/serverData.ecs';

class RigidServerEcs extends ComponentEcs {
	public collider: RAPIER.Collider = null!;
	public body: RAPIER.RigidBody = null!;

	constructor(private __initialPos: IVec3) {
		super();
	}

	onStart(): void {
		const physic = this.world
			.get(ServerDataEcs)
			.map((sd) => sd.worldPhysic)
			.unwrap('RAPIER World not found');

		const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
			...vec3Flatten(this.__initialPos),
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

	constructor(pos: IVec3) {
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
			this.world.stacker.one(`client:${this.parent}:jump`).ifSome((_) => {
				b.applyImpulse({ x: 0, y: 5, z: 0 }, true);
			});

			vec3Set(this.state.position, b.translation());
			vec4Set(this.state.rotation, b.rotation());
		});
	}
}

export const playerServerFactoryGenerator =
	(world: WorldEcs) => (name: string, pos: IVec3) => {
		return new EntityEcs({
			name,
			world,
			components: {
				[RigidServerEcs.name]: new RigidServerEcs(pos),
				[PlayerServerBehavior.name]: new PlayerServerBehavior(pos),
			},
		});
	};
