import { ComponentEcs } from '#/ecs';
import { ItemEntityState } from '#/state/game.state';
import { vec3Set, type IVec3 } from '#/utils/math.util';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';

export class ItemServerBehavior extends ComponentEcs {
	public state: ItemEntityState;
	public character: CharacterBodyServerEcs = null!;

	constructor({ pos }: { pos: IVec3 }) {
		super();

		this.state = new ItemEntityState(pos, 'item');
	}

	onStart(): void {
		const serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.character = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe<CharacterBodyServerEcs>(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');

		const gameState = serverData.state;

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		gameState.items.set(parent.name, this.state);
	}

	onLoop(_delta: number): void {
		vec3Set(this.state.position, this.character.body.translation());
	}
}
