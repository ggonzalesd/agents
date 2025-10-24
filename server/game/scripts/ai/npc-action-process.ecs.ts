import { ComponentEcs, type EntityEcs } from '#/ecs';
import { Option } from '#/utils/Option';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { NPCContextEcs } from './npc-context.ecs';

export class NPCActionProcessEcs extends ComponentEcs {
	serverData: ServerDataEcs = null!;

	npcContextEcs: NPCContextEcs = null!;

	entityParent: EntityEcs = null!;

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

		this.entityParent = parent;
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

			if (action.type === 'follow-entity') {
				Option.zip({
					target: this.world.getEntity(action.entityId),
					followPath: this.entityParent.get(FollowPathEcs),
					pathfinder: this.world.get(WorldPathfinderEcs),
				}).ifSome((zipped) => {
					zipped.followPath.option = new FollowEntityOption({
						...zipped,
						entity: this.entityParent,
					});
				});
			}
		}
		this.npcContextEcs.actions = [];
	}
}
