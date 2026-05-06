import { EntityEcs, type WorldEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { NPCState } from '#/state/game.state';
import type { IVec3 } from '#/utils/math.util';
import type { IPathfinder } from '#/pathfinding/pathfinder.interface';
import { AnimalChargeBehaviorEcs } from '../scripts/animal/animal-charge-behavior.ecs';
import { AnimalDropOnDeathEcs } from '../scripts/animal/animal-drop-on-death.ecs';
import { AnimalFleeBehaviorEcs } from '../scripts/animal/animal-flee-behavior.ecs';
import { AnimalHuntBehaviorEcs } from '../scripts/animal/animal-hunt-behavior.ecs';
import { AnimalHurtResponseEcs } from '../scripts/animal/animal-hurt-response.ecs';
import { AnimalProfileEcs, type AnimalProfileProps } from '../scripts/animal/animal-profile.ecs';
import { AnimalStateEcs } from '../scripts/animal/animal-state.ecs';
import { AnimalSyncEcs } from '../scripts/animal/animal-sync.ecs';
import { AnimalWanderBehaviorEcs } from '../scripts/animal/animal-wander-behavior.ecs';
import { CharacterBodyServerEcs } from '../scripts/entity/CharacterBodyServer.ecs';
import { EntityPathfinderEcs } from '../scripts/entity/entity-pathfinder.ecs';
import { FollowPathEcs } from '../scripts/entity/follow-path/follow-path.ecs';
import { MovementServerEcs } from '../scripts/entity/MovementServer.ecs';

export const animalServerFactoryGenerator =
	(world: WorldEcs) =>
	({
		name,
		display,
		pos,
		skin,
		life,
		maxLife,
		profile,
		pathfinder,
	}: {
		name: string;
		display: string;
		pos: IVec3;
		skin: string;
		life: number;
		maxLife: number;
		profile: AnimalProfileProps;
		pathfinder?: IPathfinder;
	}) => {
		const state = new NPCState(pos, skin, life, maxLife, 'AI');

		const components: ConstructorParameters<typeof EntityEcs>[0]['components'] = {
			[RecordEcs.name]: new RecordEcs({
				stats: {
					kind: 'animal',
					name: display,
					populationKey: profile.populationKey,
					species: profile.species,
				},
			}),
			[AnimalSyncEcs.name]: new AnimalSyncEcs(state),
			[CharacterBodyServerEcs.name]: new CharacterBodyServerEcs(
				state.character,
				'cuboid',
				{
					deathBehavior: 'delete',
					cuboidHalfExtents: {
						x: 0.3,
						y: 0.35,
						z: 0.7,
					},
				},
			),
			[MovementServerEcs.name]: (() => {
				const movement = new MovementServerEcs(state.movement);
				if (profile.walkSpeed !== undefined) {
					movement.walkSpeed = profile.walkSpeed;
				}
				return movement;
			})(),
			[FollowPathEcs.name]: new FollowPathEcs(),
			[AnimalProfileEcs.name]: new AnimalProfileEcs(profile),
			[AnimalStateEcs.name]: new AnimalStateEcs(pos),
			[AnimalHurtResponseEcs.name]: new AnimalHurtResponseEcs(),
			[AnimalDropOnDeathEcs.name]: new AnimalDropOnDeathEcs(),
			[AnimalFleeBehaviorEcs.name]: new AnimalFleeBehaviorEcs(),
			[AnimalWanderBehaviorEcs.name]: new AnimalWanderBehaviorEcs(),
		};

		if (pathfinder) {
			components[EntityPathfinderEcs.name] = new EntityPathfinderEcs(pathfinder);
		}

		if (profile.hunt) {
			components[AnimalHuntBehaviorEcs.name] = new AnimalHuntBehaviorEcs();
		}

		if (profile.charge) {
			components[AnimalChargeBehaviorEcs.name] = new AnimalChargeBehaviorEcs();
		}

		return new EntityEcs({ name, world, components });
	};
