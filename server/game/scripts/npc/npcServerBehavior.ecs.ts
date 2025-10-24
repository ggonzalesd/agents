import { ComponentEcs } from '#/ecs';
import type { NPCState } from '#/state/game.state';
import { Option } from '#/utils/Option';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { FollowEntityOption } from '../entity/follow-path/follow-entity.class';
import { FollowPathEcs } from '../entity/follow-path/follow-path.ecs';
import { FollowPositionOption } from '../entity/follow-path/follow-position.class';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { PlayerServerBehavior } from '../player/playerServerBehavior.ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';

export class NpcServerBehavior extends ComponentEcs {
	public state: NPCState;

	public serverData: ServerDataEcs = null!;
	public pathfinder: WorldPathfinderEcs = null!;

	public character: CharacterBodyServerEcs = null!;
	public movement: MovementServerEcs = null!;

	public follower: FollowPathEcs = null!;

	public path: [number, number][] = [];
	public canRecalculatePath = true;

	constructor({ state }: { state: NPCState }) {
		super();
		this.state = state;
	}

	onStart(): void {
		this.pathfinder = this.world
			.get(WorldPathfinderEcs)
			.unwrap('WorldPathfinderEcs not found');

		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		const gameState = this.serverData.state;

		const parent = this.world.getEntity(this.parent).unwrap('Parent not found');

		gameState.npcs.set(parent.name, this.state);

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found');

		this.movement = parent
			.get(MovementServerEcs)
			.unwrap('MovementServerEcs not found');

		this.follower = parent.get(FollowPathEcs).unwrap('FollowPathEcs not found');

		setTimeout(() => {
			Option.of(
				this.world.getEntityLike({
					behavior: PlayerServerBehavior,
					character: CharacterBodyServerEcs,
				})[0],
			)
				.filter(() => Math.random() < 0.0)
				.ifSome(({ entity }) => {
					this.serverData.room.broadcast('agent:message', {
						id: this.parent,
						message: 'Following you now!',
					});

					this.follower.option = new FollowEntityOption({
						pathfinder: this.pathfinder,
						followPath: this.follower,
						target: entity,
						entity: this.world
							.getEntity(this.parent)
							.unwrap('Parent not found'),
					});
				});
		}, 7500);
	}

	onLoop(_delta: number): void {
		/* if (this.follower.option.isDone()) {
			// console.log('NPC returning to start position', {});

			const randX = Math.random() * 20 - 10;
			const randZ = Math.random() * 20 - 10;

			this.follower.option = new FollowPositionOption({
				pathfinder: this.pathfinder,
				followPath: this.follower,
				position: {
					x: randX,
					z: randZ,
				},
				entity: this.world.getEntity(this.parent).unwrap('Parent not found'),
			});
		} */
	}
}
