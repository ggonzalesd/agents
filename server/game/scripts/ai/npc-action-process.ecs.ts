import { ComponentEcs } from '#/ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { NPCContextEcs } from './npc-context.ecs';

export class NPCActionProcessEcs extends ComponentEcs {
	serverData: ServerDataEcs = null!;

	npcContextEcs: NPCContextEcs = null!;

	onStart(): void {
		const parent = this.world
			.getEntity(this.parent)
			.unwrap('Parent not found for NPCActionProcessEcs');

		this.npcContextEcs = parent
			.get(NPCContextEcs)
			.unwrap('NPCContextEcs not found on parent entity');

		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');
	}

	onLoop(_delta: number): void {
		if (this.npcContextEcs.actions.length === 0) {
			return;
		}

		for (const action of this.npcContextEcs.actions) {
			// console.log('Processing NPC action:', { action });

			if (action.type === 'talk') {
				this.serverData.room.broadcast('agent:message', {
					id: this.parent,
					message: action.content,
				});
			}
		}
		this.npcContextEcs.actions = [];
	}
}
