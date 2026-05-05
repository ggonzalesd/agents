import * as RAPIER from '@dimforge/rapier3d-compat';

import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';
import { MapKey, mapRegistry } from '#/maps/maps';

import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { MapLoaderEcs } from '../../world/map-loader.ecs';
import { DynamicPathfinder } from '../../world/dynamic-pathfinder';
import type { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentRuntimeEcs } from '../experiment-runtime.ecs';
import { PlaceholderExperimentPhaseEcs } from '../placeholder-experiment-phase.ecs';
import { RequestGoldCoinPhaseEcs } from '../phases/request-gold-coin.phase.ecs';
import { DeliverMessagePhaseEcs } from '../phases/deliver-message.phase.ecs';
import { CollectItemPhaseEcs } from '../phases/collect-item.phase.ecs';
import { DefeatVillainNpcPhaseEcs } from '../phases/defeat-villain-npc.phase.ecs';
import { TradeItemPhaseEcs } from '../phases/trade-item.phase.ecs';
import { HuntAnimalsPhaseEcs } from '../phases/hunt-animals.phase.ecs';
import { CollectApplesPhaseEcs } from '../phases/collect-apples.phase.ecs';
import { EscortNpcPhaseEcs } from '../phases/escort-npc.phase.ecs';
import { treeServerFactory } from '$/game/prefab/tree.server';
import { boxServerFactory } from '$/game/prefab/box.server';
import { itemServerFactory } from '$/game/prefab/item.server';
import type { BoxSkin } from '#/state/box.state';
import * as SlotAllocator from '$/services/slot-allocator.service';
import type { ExperimentActor } from '$/services/experiment-orchestrator.service';

const EXPERIMENT_KEY = 'NPCS-SIN-LLMS';

const PLATFORM_HALF_EXTENT = 25;
const PLATFORM_HALF_HEIGHT = 1;
const PLATFORM_Y = 0;

type PhaseFactory = (
	definition: ExperimentPhaseDefinition,
	runtime: ExperimentRuntimeEcs,
) => ExperimentPhaseEcs;

const phaseFactories: {
	[string: string]: PhaseFactory;
} = {
	'request-gold-coin': (def, runtime) =>
		new RequestGoldCoinPhaseEcs(def, runtime),
	'deliver-message': (def, runtime) =>
		new DeliverMessagePhaseEcs(def, runtime),
	'collect-item': (def, runtime) =>
		new CollectItemPhaseEcs(def, runtime),
	'defeat-villain-npc': (def, runtime) =>
		new DefeatVillainNpcPhaseEcs(def, runtime),
	'trade-item': (def, runtime) =>
		new TradeItemPhaseEcs(def, runtime),
	'hunt-animals': (def, runtime) =>
		new HuntAnimalsPhaseEcs(def, runtime),
	'collect-apples': (def, runtime) =>
		new CollectApplesPhaseEcs(def, runtime),
	'escort-npc': (def, runtime) =>
		new EscortNpcPhaseEcs(def, runtime),
};

export class NpcsSinLlmsExperimentRuntimeEcs extends ExperimentRuntimeEcs {
	private slotRelease: (() => void) | null = null;
	private platformBodyHandle: number | null = null;
	private mapId: string | null = null;
	private pathfinder: DynamicPathfinder | null = null;

	constructor(actor: ExperimentActor, entityName: string) {
		super(actor, entityName, EXPERIMENT_KEY);
	}

	get experimentPathfinder(): DynamicPathfinder | null {
		return this.pathfinder;
	}

	protected async onExperimentMount(): Promise<void> {
		const { position, release } = SlotAllocator.allocateSlot(this.userId);
		this.slotRelease = release;

		console.log(
			'[NpcsSinLlms] OnExperimentMount: Allocated slot for user:',
			this.userId,
			'at position:',
			position,
		);

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData) {
			const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
				position.x,
				PLATFORM_Y,
				position.z,
			);
			const body = serverData.worldPhysic.createRigidBody(bodyDesc);
			serverData.worldPhysic.createCollider(
				RAPIER.ColliderDesc.cuboid(
					PLATFORM_HALF_EXTENT,
					PLATFORM_HALF_HEIGHT,
					PLATFORM_HALF_EXTENT,
				),
				body,
			);
			this.platformBodyHandle = body.handle;

			serverData.room.broadcast('experiment:platform:create', {
				userId: this.userId,
				x: position.x,
				y: PLATFORM_Y,
				z: position.z,
			});
		}

		this.mapId = `experiment-npcs-sin-llms-${this.userId}`;
		const experimentMap = mapRegistry[MapKey.ExperimentBasic];

		this.world.get(MapLoaderEcs).ifSome((loader) => {
			loader.registerInstanceFactory('tree', ({ world, name, pos }) =>
				treeServerFactory({ world, name, pos }),
			);
			loader.registerInstanceFactory('box', ({ world, name, pos, metadata }) =>
				boxServerFactory({
					world,
					name,
					pos,
					skin: (metadata.skin as BoxSkin) ?? 'box_stacked',
				}),
			);
			loader.registerInstanceFactory('item', ({ world, name, pos, metadata }) =>
				itemServerFactory({
					world,
					name,
					pos,
					stats: {
						type: (metadata.itemType as string) ?? 'wood',
						amount: (metadata.amount as number) ?? 1,
					},
					lifetime: 30_000,
				}),
			);
			loader.mountMap(this.mapId!, experimentMap, position);
		});

		this.pathfinder = new DynamicPathfinder(experimentMap, position);

		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(position, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(position);
			});
		});

		console.log(
			'[NpcsSinLlms] OnExperimentMount: Setup complete for user:',
			this.userId,
		);
	}

	protected async onExperimentUnmount(): Promise<void> {
		if (!this.slotRelease) return;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (serverData) {
			serverData.room.broadcast('experiment:platform:remove', {
				userId: this.userId,
			});

			if (this.platformBodyHandle !== null) {
				const platformBody = serverData.worldPhysic.getRigidBody(
					this.platformBodyHandle,
				);
				if (platformBody) {
					serverData.worldPhysic.removeRigidBody(platformBody);
				}
			}
		}

		this.platformBodyHandle = null;

		if (this.mapId !== null) {
			this.world.get(MapLoaderEcs).ifSome((loader) => {
				loader.unmountMap(this.mapId!);
			});
			this.mapId = null;
		}

		if (this.pathfinder !== null) {
			this.pathfinder.dispose();
			this.pathfinder = null;
		}

		const lobby = SlotAllocator.LOBBY_POSITION;
		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(lobby, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(lobby);
			});
		});

		this.slotRelease();
		this.slotRelease = null;
	}

	protected createPhaseComponent(
		definition: ExperimentPhaseDefinition,
	): ExperimentPhaseEcs {
		const factory = phaseFactories[definition.componentKey];
		return factory
			? factory(definition, this)
			: new PlaceholderExperimentPhaseEcs(definition, this);
	}
}
