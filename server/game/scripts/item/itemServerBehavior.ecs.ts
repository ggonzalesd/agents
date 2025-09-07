import { ComponentEcs } from '#/ecs';
import { ItemEntityState } from '#/state/inventory.state';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';

export class ItemServerBehavior extends ComponentEcs {
	public state: ItemEntityState;
	public character: CharacterBodyServerEcs = null!;

	constructor({ state }: { state: ItemEntityState }) {
		super();
		this.state = state;
	}

	onStart(): void {
		const serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.character = this.world
			.getEntity(this.parent)
			.map((p) => p.getUnsafe<CharacterBodyServerEcs>(CharacterBodyServerEcs))
			.unwrap('CharacterBodyServerEcs not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		serverData.state.items.set(parent.name, this.state);

		this.callOnDelete(() => {
			serverData.state.items.delete(parent.name);
		});
	}
}
