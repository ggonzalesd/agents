import { ComponentEcs } from '#/ecs';
import { NPCState } from '#/state/game.state';
import { posGridToReal, posRealToGrid } from '#/utils/map.utils';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { MovementServerEcs } from '../entity/MovementServer.ecs';
import { ServerDataEcs } from '../serverData.ecs';
import { WorldPathfinderEcs } from '../world/world-grid.ecs';

export class NpcServerBehavior extends ComponentEcs {
	public state: NPCState;

	public serverData: ServerDataEcs = null!;
	public pathfinder: WorldPathfinderEcs = null!;

	public character: CharacterBodyServerEcs = null!;
	public movement: MovementServerEcs = null!;

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
	}

	waitForNext: number = 0;

	onLoop(_delta: number): void {
		if (this.path.length === 0) {
			if (this.canRecalculatePath && Math.random() < 0.1) {
				this.canRecalculatePath = false;

				const { x, z } = this.character.body.translation();

				const startGrid = posRealToGrid({ x, z }, this.pathfinder.map);

				const endGrid = [
					Math.floor(Math.random() * 20),
					Math.floor(Math.random() * 20),
				] as [number, number];

				this.pathfinder
					.getPathFromAtoB(startGrid, endGrid)
					.then(({ result }) => {
						this.path = result;
					})
					.catch(() => {
						this.canRecalculatePath = true;
					});
			}

			return;
		}

		this.waitForNext += _delta / 1000;
		if (this.waitForNext > 2.5) {
			this.path = [];
			this.waitForNext = 0;
			this.canRecalculatePath = true;
			this.movement.movementState.isMoving = false;
			return;
		}

		if (this.path.length > 0) {
			const target = this.path[0];
			const { x, z } = this.character.body.translation();

			const targetReal = posGridToReal(
				{
					x: target[0],
					y: target[1],
				},
				this.pathfinder.map,
			);

			const dirX = targetReal.x - x;
			const dirZ = targetReal.z - z;

			const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);

			if (distance < 0.2) {
				this.path.shift();
				this.canRecalculatePath = true;
				this.movement.movementState.isMoving = false;
				this.waitForNext = 0;
			} else {
				const normDirX = dirX / distance;
				const normDirZ = dirZ / distance;

				this.character.characterState.rotationY = -Math.atan2(
					normDirZ,
					normDirX,
				);
				this.movement.clientDirection.x = normDirX;
				this.movement.clientDirection.y = normDirZ;
				this.movement.movementState.isMoving = true;
			}
		}
	}
}
