import { ComponentEcs } from '#/ecs';
import { NPCState } from '#/state/game.state';
import { vec3Set, type IVec3 } from '#/utils/math.util';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';

export class NpcServerBehavior extends ComponentEcs {
	public state: NPCState;

	public character: CharacterBodyServerEcs = null!;
	public serverData: ServerDataEcs = null!;

	constructor({ pos, username }: { pos: IVec3; username: string }) {
		super();

		this.state = new NPCState(pos, username);
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const gameState = this.serverData.state;

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		gameState.npcs.set(parent.name, this.state);

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');

		console.log('NPC added to game state', parent.name);

		parent.get(MovementServerEcs).ifSome((m) => {
			m.movementState = this.state.movement;
			m.movementState.isMoving = false;
			m.clientDirection = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
		});
	}

	onLoop(_delta: number): void {
		vec3Set(this.state.character.position, this.character.body.translation());
	}
}
