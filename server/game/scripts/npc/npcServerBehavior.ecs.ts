import { ComponentEcs } from '#/ecs';
import { NPCState } from '#/state/game.state';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';

export class NpcServerBehavior extends ComponentEcs {
	public state: NPCState;

	public character: CharacterBodyServerEcs = null!;
	public serverData: ServerDataEcs = null!;

	constructor({ state }: { state: NPCState }) {
		super();
		this.state = state;
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
	}
}
