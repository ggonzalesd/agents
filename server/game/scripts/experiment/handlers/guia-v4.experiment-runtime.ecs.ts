import * as RAPIER from '@dimforge/rapier3d-compat';

import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';

import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentRuntimeEcs } from '../experiment-runtime.ecs';
import { PlaceholderExperimentPhaseEcs } from '../placeholder-experiment-phase.ecs';
import { JumpOrDieExperimentPhaseEcs } from '../phases/jump-or-die.phase.ecs';
import * as SlotAllocator from '$/services/slot-allocator.service';
import type { ExperimentActor } from '$/services/experiment-orchestrator.service';

const EXPERIMENT_KEY = 'GUIA-EXPERIMENTACION-V4';

const PLATFORM_HALF_EXTENT = 25;
const PLATFORM_HALF_HEIGHT = 1;
const PLATFORM_Y = 0;

type PhaseFactory = (
	definition: ExperimentPhaseDefinition,
	runtime: ExperimentRuntimeEcs,
) => ExperimentPhaseEcs;

const phaseFactories = new Map<string, PhaseFactory>([
	[
		'jump-or-die',
		(def, runtime) => new JumpOrDieExperimentPhaseEcs(def, runtime),
	],
]);

export class GuiaV4ExperimentRuntimeEcs extends ExperimentRuntimeEcs {
	private slotRelease: (() => void) | null = null;
	private platformBodyHandle: number | null = null;

	constructor(actor: ExperimentActor, entityName: string) {
		super(actor, entityName, EXPERIMENT_KEY);
	}

	protected async onExperimentMount(): Promise<void> {
		const { position, release } = SlotAllocator.allocateSlot(this.userId);
		this.slotRelease = release;

		console.log(
			'OnExperimentMount: Allocated slot for user:',
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
		console.log('OnExperimentMount: Created platform for user:', this.userId);

		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(position, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(position);
			});
		});

		console.log(
			'OnExperimentMount: Teleported character to platform for user:',
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
		const factory = phaseFactories.get(definition.componentKey);
		return factory
			? factory(definition, this)
			: new PlaceholderExperimentPhaseEcs(definition, this);
	}
}
