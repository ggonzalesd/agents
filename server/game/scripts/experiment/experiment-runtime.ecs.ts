import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';
import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import type { SubmitExperimentFeedbackRequest } from '#/schema/experiment.schema';

import * as ExperimentService from '$/services/experiment-orchestrator.service';

import { ServerDataEcs } from '../serverData.ecs';
import type { ExperimentPhaseEcs } from './experiment-phase.ecs';
import { ExperimentManagerEcs } from './experiment-manager.ecs';

export abstract class ExperimentRuntimeEcs extends ComponentEcs {
	private serverData: ServerDataEcs = null!;
	private _isMounted = false;
	private _activePhase: ExperimentPhaseEcs | null = null;

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

	public get isMounted(): boolean {
		return this._isMounted;
	}

	public get activePhase(): ExperimentPhaseEcs | null {
		return this._activePhase;
	}

	private get phaseComponentName(): string {
		return `experiment-phase:${this.userId}`;
	}

	public get roomId(): string {
		return this.serverData.room.roomId;
	}

	// --- Hooks para subclases ---

	protected abstract onExperimentMount(): Promise<void>;
	protected abstract onExperimentUnmount(): Promise<void>;
	protected abstract createPhaseComponent(definition: ExperimentPhaseDefinition): ExperimentPhaseEcs;

	// --- Ciclo de vida ECS ---

	onStart(): void {
		this.serverData = this.world.get(ServerDataEcs).unwrap('ServerDataEcs not found');
	}

	onDelete(): void {
		this.unmountPhase();

		if (this._isMounted) {
			this._isMounted = false;
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

		super.onDelete();
	}

	// --- Mount/Unmount del experimento ---

	public async mount(): Promise<void> {
		if (this._isMounted) return;

		try {
			await this.onExperimentMount();
			this._isMounted = true;

			console.log(`[ExperimentRuntime] Mounting experiment '${this.experimentKey}' for ${this.userId}`);
			await ExperimentService.mountExperimentForUser({
				actor: this.actor,
				experimentKey: this.experimentKey,
				roomId: this.roomId,
			});
		} catch (err) {
			console.error(`[ExperimentRuntime] Failed to mount experiment for ${this.userId}:`, err);

			if (this._isMounted) {
				this._isMounted = false;
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

	// --- Mount/Unmount de fases ---

	public mountPhase(definition: ExperimentPhaseDefinition): void {
		if (this._activePhase) return;

		const phase = this.createPhaseComponent(definition);
		this._activePhase = phase;
		this.world.set(phase, this.phaseComponentName);

		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(RecordEcs).ifSome((record) => {
				record.setRecord('experiment', { key: this.experimentKey, phaseKey: definition.key });
			});
		});
	}

	public unmountPhase(): void {
		if (!this._activePhase) return;

		this._activePhase.unmountPhase();
		this.world.unset(this.phaseComponentName);
		this._activePhase = null;

		this.world.getEntity(this.entityName).ifSome((entity) => {
			entity.get(RecordEcs).ifSome((record) => {
				record.setRecord('experiment', null);
			});
		});
	}

	public isPhaseMounted(): boolean {
		return this._activePhase !== null;
	}

	// --- Feedback ---

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
