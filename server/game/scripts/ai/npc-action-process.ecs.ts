import { ComponentEcs, type EntityEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { Option } from '#/utils/Option';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';
import { NPCContextEcs } from './npc-context.ecs';
import { NPCEventQueueEcs } from './npc-event-queue.ecs';

import * as LLMService from '$/services/llm.service';
import * as LTMRepository from '$/db/ltm.db';
import { StopMovementOption } from '../entity/follow-path/stop-movement.class';

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

		console.log('NPC Actions: ', this.npcContextEcs.actions);
		console.log(JSON.stringify(this.npcContextEcs.actions, null, 2));
		for (const action of this.npcContextEcs.actions) {
			// console.log('Processing NPC action:', { action });

			if (action.type === 'talk') {
				this.serverData.room.broadcast('agent:message', {
					id: this.parent,
					message: action.content,
				});

				this.world
					.getEntityLike({ context: NPCContextEcs, event: NPCEventQueueEcs })
					.forEach(({ entity, components: { context, event } }) => {
						context.lastMessages.addMessage(
							action.content,
							this.parent ?? 'Unknown',
						);

						event.pushEvent(
							`${this.parent ?? 'Unknown'} says something.`,
							{
								from: this.parent,
								message: action.content,
							},
							this.parent === entity.name ? 0 : 10,
						);
					});
			}

			if (action.type === 'set-short-memory') {
				this.npcContextEcs.shortMemory.addMemory(action.value);
			}

			if (action.type === 'remove-short-memory') {
				this.npcContextEcs.shortMemory.deleteMemory(action.key);
			}

			if (action.type === 'move-follow-entity') {
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

			if (action.type === 'move-stop') {
				this.world
					.getEntity(this.parent)
					.map((entity) => entity.getUnsafe(FollowPathEcs))
					.ifSome((f) => {
						f.option = new StopMovementOption();
					});
			}

			if (action.type === 'jump') {
				this.world
					.getEntity(this.parent)
					.map((entity) => entity.getUnsafe(MovementServerEcs))
					.ifSome((movement) => {
						movement.movementState.isJumping = true;
					});
			}

			if (action.type === 'set-mood') {
				this.entityParent.get(RecordEcs).ifSome((r) => {
					const moodRecord = r.getUnsafeRecordOrDefault<{
						[key: string]: number;
					}>('mood');
					moodRecord[action.mood] = action.value;
				});
			}

			if (action.type === 'remove-mood') {
				this.entityParent.get(RecordEcs).ifSome((r) => {
					const moodRecord = r.getUnsafeRecordOrDefault<{
						[key: string]: number;
					}>('mood');
					delete moodRecord[action.mood];
				});
			}

			if (action.type === 'save-long-term-memory') {
				LLMService.embed([action.value]).then((embeddings) => {
					LTMRepository.saveLongTermMemory({
						embedding: embeddings[0],
						metadata: {},
						npcIdentifier: this.entityParent.name,
						text: action.value,
					}).then(({ embedding, ...ltm }) => {
						console.log('Saved LongTermMemory:', {
							...ltm,
							embeddingLength: embedding.length,
						});
					});
				});
			}

			if (action.type === 'retrieve-long-term-memory') {
				LLMService.embed([action.value]).then((embeddings) => {
					LTMRepository.retrieveLongTermMemory({
						npcIdentifier: this.entityParent.name,
						queryEmbedding: embeddings[0],
						limit: action.limit,
					}).then((ltms) => {
						this.npcContextEcs.longMemory.loadLongTermMemories(ltms);
					});
				});
			}
		}
		this.npcContextEcs.actions = [];
	}
}
