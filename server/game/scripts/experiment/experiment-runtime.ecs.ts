import { getExperimentPhaseByKey } from '#/experiments/guia-experimentacion-v4';
import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';
import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { DeferredTicker } from '#/ecs/lib/DeferredTicker';
import type { SubmitExperimentFeedbackRequest } from '#/schema/experiment.schema';

import * as ExperimentService from '$/services/experiment-orchestrator.service';
import type { UserExperimentState } from '$/db/user-experiment.db';

import { ServerDataEcs } from '../serverData.ecs';
import { ExperimentPhaseEcs } from './experiment-phase.ecs';
import { ExperimentManagerEcs } from './experiment-manager.ecs';

interface PendingPhaseData {
	phaseKey: string;
	componentKey: string;
	attemptNumber: number;
}

const PHASE_MOUNT_DELAY_MS = 4000;

export abstract class ExperimentRuntimeEcs extends ComponentEcs {
	private serverData: ServerDataEcs = null!;
	private isMounted = false;

	private activePhaseKey: string | null = null;
	private activePhaseComponentKey: string | null = null;
	private activeAttemptNumber = 0;

	private pendingPhaseData: PendingPhaseData | null = null;
	private readonly phaseMountTicker = new DeferredTicker();

	private awaitingFeedback = false;

	constructor(
		public readonly actor: ExperimentService.ExperimentActor,
		public readonly entityName: string,
		public readonly experimentKey: string,
	) {
		super();
	}

	public get userId(): string {
		return this.actor.userId;
	}

	private get phaseComponentName(): string {
		return `experiment-phase:${this.userId}`;
	}

	private get roomId(): string {
		return this.serverData.room.roomId;
	}

	// --- Hooks para subclases ---

	protected abstract onExperimentMount(): Promise<void>;
	protected abstract onExperimentUnmount(): Promise<void>;
	protected abstract createPhaseComponent(definition: ExperimentPhaseDefinition): ExperimentPhaseEcs;

	// --- Ciclo de vida ECS ---

	onStart(): void {
		this.serverData = this.world.get(ServerDataEcs).unwrap('ServerDataEcs not found');
		void this.mount();
	}

	onLoop(delta: number): void {
		this.phaseMountTicker.tick(delta);
	}

	onDelete(): void {
		this.phaseMountTicker.cancel();
		this.pendingPhaseData = null;
		this.world.unset(this.phaseComponentName);
		this.activePhaseKey = null;
		this.activePhaseComponentKey = null;
		this.activeAttemptNumber = 0;

		if (this.isMounted) {
			this.isMounted = false;
			void this.onExperimentUnmount();

			const roomId = this.roomId;
			void ExperimentService.unmountExperimentForUser({
				userId: this.userId,
				experimentKey: this.experimentKey,
				roomId,
			}).catch((err) => {
				console.error(`[ExperimentRuntime] Failed to unmount experiment for ${this.userId}:`, err);
			});
		}

		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(RecordEcs).ifSome((record) => {
				record.setRecord('experiment', null);
			});
		});

		if (this.awaitingFeedback) {
			this.serverData.room.broadcast('experiment:awaiting-feedback', {
				userId: this.userId,
				experimentKey: this.experimentKey,
			});
		}

		super.onDelete();
	}

	// --- Gestión de fases ---

	private unloadCurrentPhase(): void {
		this.phaseMountTicker.cancel();
		this.pendingPhaseData = null;
		this.world.unset(this.phaseComponentName);
		this.activePhaseKey = null;
		this.activePhaseComponentKey = null;
		this.activeAttemptNumber = 0;
	}

	private loadPhase(
		phaseKey: string,
		componentKey: string,
		currentAttemptNumber: number,
	): void {
		const definition = getExperimentPhaseByKey(phaseKey, this.experimentKey);
		if (!definition) {
			throw new Error(
				`Experiment phase '${phaseKey}' not found for experiment '${this.experimentKey}'`,
			);
		}

		if (
			this.activePhaseKey === phaseKey &&
			this.activePhaseComponentKey === componentKey
		) {
			if (this.activeAttemptNumber !== currentAttemptNumber) {
				this.getCurrentPhaseComponent()?.onRestartPhase();
				this.activeAttemptNumber = currentAttemptNumber;
			}
			return;
		}

		this.unloadCurrentPhase();

		const component = this.createPhaseComponent(definition);
		this.world.set(component, this.phaseComponentName);
		this.activePhaseKey = phaseKey;
		this.activePhaseComponentKey = componentKey;
		this.activeAttemptNumber = currentAttemptNumber;
	}

	private syncFromExperiment(experiment: UserExperimentState | null): void {
		console.log(`[ExperimentRuntime] syncFromExperiment for ${this.userId}:`, {
			status: experiment?.status,
			currentPhaseIndex: experiment?.currentPhaseIndex,
			mountedAt: experiment?.mountedAt,
		});

		if (
			!experiment ||
			experiment.status !== 'IN_PROGRESS' ||
			experiment.mountedAt === null
		) {
			console.log(`[ExperimentRuntime] syncFromExperiment early exit: experiment not IN_PROGRESS or not mounted`);
			this.unloadCurrentPhase();
			return;
		}

		const currentPhase = experiment.phases.find(
			(p) => p.phaseIndex === experiment.currentPhaseIndex,
		);

		if (!currentPhase || currentPhase.status !== 'ACTIVE') {
			console.log(`[ExperimentRuntime] syncFromExperiment early exit: no active phase at index ${experiment.currentPhaseIndex}`);
			this.unloadCurrentPhase();
			return;
		}

		const definition = getExperimentPhaseByKey(currentPhase.phaseKey, this.experimentKey);
		if (!definition) {
			console.log(`[ExperimentRuntime] syncFromExperiment early exit: phase definition not found for key '${currentPhase.phaseKey}'`);
			this.unloadCurrentPhase();
			return;
		}

		const { phaseKey } = currentPhase;
		const { componentKey } = definition;
		const isNewPhase =
			this.activePhaseKey !== phaseKey ||
			this.activePhaseComponentKey !== componentKey;

		if (!isNewPhase) {
			if (this.activeAttemptNumber !== currentPhase.currentAttemptNumber) {
				this.getCurrentPhaseComponent()?.onRestartPhase();
				this.activeAttemptNumber = currentPhase.currentAttemptNumber;
			}
			return;
		}

		this.unloadCurrentPhase();

		if (currentPhase.currentAttemptNumber === 1) {
			console.log(`[ExperimentRuntime] Broadcasting experiment:phase:countdown for userId=${this.userId}, phaseIndex=${currentPhase.phaseIndex}`);
			this.serverData.room.broadcast('experiment:phase:countdown', {
				userId: this.userId,
				experimentKey: this.experimentKey,
				phaseIndex: currentPhase.phaseIndex,
				title: definition.title,
				description: definition.description,
			});

			this.pendingPhaseData = { phaseKey, componentKey, attemptNumber: currentPhase.currentAttemptNumber };
			this.phaseMountTicker.schedule(PHASE_MOUNT_DELAY_MS, () => {
				if (!this.pendingPhaseData) return;
				const pending = this.pendingPhaseData;
				this.pendingPhaseData = null;
				this.loadPhase(pending.phaseKey, pending.componentKey, pending.attemptNumber);
				this.world.getEntity(this.entityName).ifSome((entity) => {
					entity.get(RecordEcs).ifSome((record) => {
						record.setRecord('experiment', { key: this.experimentKey, phaseKey: pending.phaseKey });
					});
				});
			});
			return;
		}

		this.loadPhase(phaseKey, componentKey, currentPhase.currentAttemptNumber);

		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(RecordEcs).ifSome((record) => {
				record.setRecord('experiment', { key: this.experimentKey, phaseKey });
			});
		});
	}

	private async mount(): Promise<void> {
		try {
			await this.onExperimentMount();
			this.isMounted = true;

			console.log(`[ExperimentRuntime] Mounting experiment '${this.experimentKey}' for ${this.userId}`);
			const experiment = await ExperimentService.mountExperimentForUser({
				actor: this.actor,
				experimentKey: this.experimentKey,
				roomId: this.roomId,
			});

			this.syncFromExperiment(experiment);
		} catch (err) {
			console.error(`[ExperimentRuntime] Failed to mount experiment for ${this.userId}:`, err);

			if (this.isMounted) {
				this.isMounted = false;
				void this.onExperimentUnmount();
			}

			const errorMessage = err instanceof Error ? err.message : String(err);
			const targetClient = this.serverData.room.clients.find(
				(c) => (c.userData as { payload?: { id: string } } | undefined)?.payload?.id === this.userId,
			);
			targetClient?.send('experiment:error', { message: errorMessage });

			this.world
				.get(ExperimentManagerEcs)
				.ifSome((manager) => manager.stopExperiment(this.userId));
		}
	}

	// --- API pública ---

	public getCurrentPhaseComponent(): ExperimentPhaseEcs | null {
		return this.world.get(ExperimentPhaseEcs, this.phaseComponentName).raw();
	}

	public async failCurrentAttempt(): Promise<void> {
		try {
			const experiment = await ExperimentService.failCurrentAttemptFromWorld({
				userId: this.userId,
				experimentKey: this.experimentKey,
			});
			this.syncFromExperiment(experiment);
		} catch (err) {
			console.error(`[ExperimentRuntime] failCurrentAttempt error:`, err);
		}
	}

	public async resolveCurrentPhase(): Promise<void> {
		try {
			const experiment = await ExperimentService.resolveCurrentPhaseFromWorld({
				userId: this.userId,
				experimentKey: this.experimentKey,
			});
			this.syncFromExperiment(experiment);

			if (experiment.status === 'AWAITING_FEEDBACK') {
				this.awaitingFeedback = true;
				this.world
					.get(ExperimentManagerEcs)
					.ifSome((manager) => manager.stopExperiment(this.userId));
			}
		} catch (err) {
			console.error(`[ExperimentRuntime] resolveCurrentPhase error:`, err);
		}
	}

	public async submitFeedback(payload: SubmitExperimentFeedbackRequest): Promise<void> {
		try {
			await ExperimentService.submitExperimentFeedback({
				actor: this.actor,
				payload,
			});
		} catch (err) {
			console.error(`[ExperimentRuntime] submitFeedback error:`, err);
			throw err;
		}
	}
}
