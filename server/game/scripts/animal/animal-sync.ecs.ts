import { ComponentEcs } from '#/ecs';
import type { NPCState } from '#/state/game.state';
import { ServerDataEcs } from '../serverData.ecs';

export class AnimalSyncEcs extends ComponentEcs {
	private serverData: ServerDataEcs = null!;

	constructor(private readonly state: NPCState) {
		super();
	}

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		this.serverData.state.npcs.set(parent.name, this.state);

		this.callOnDelete(() => {
			this.serverData.state.npcs.delete(parent.name);
		});
	}
}
