import { ComponentEcs } from '#/ecs';
import { DeferEcs } from '#/ecs/lib/Defer.ecs';
import {
	getExperimentByKey,
	getExperimentPhaseByKey,
} from '#/experiments/guia-experimentacion-v4';

import * as ExperimentService from '$/services/experiment-orchestrator.service';
import type { ExperimentActor } from '$/services/experiment-orchestrator.service';

import { ServerDataEcs } from '../serverData.ecs';
import type { ExperimentRuntimeEcs } from './experiment-runtime.ecs';

export type ExperimentRuntimeFactory = (
	actor: ExperimentActor,
	entityName: string,
) => ExperimentRuntimeEcs;

const PHASE_COUNTDOWN_MS = 4000;
const PHASE_MESSAGE_SUCCESS_MS = 2000;
const PHASE_MESSAGE_FAIL_MS = 3000;
const PHASE_MESSAGE_AGAIN_MS = 1000;

interface PhaseFlowState {
	currentPhaseIndex: number;
	currentAttemptNumber: number;
	deferKeys: string[];
}

export class ExperimentManagerEcs extends ComponentEcs {
	private runtimes = new Map<string, ExperimentRuntimeEcs>();
	private entityToUser = new Map<string, string>();
	private phaseFlows = new Map<string, PhaseFlowState>();

	constructor(
		private readonly factories: { [key: string]: ExperimentRuntimeFactory },
	) {
		super();
	}

	private get defer(): DeferEcs {
		return this.world.get(DeferEcs).unwrap('DeferEcs not found');
	}

	private get serverData(): ServerDataEcs {
		return this.world.get(ServerDataEcs).unwrap('ServerDataEcs not found');
	}

	// --- API pública ---

	public hasActiveRuntime(userId: string): boolean {
		return this.runtimes.has(userId);
	}

	public getRuntime(userId: string): ExperimentRuntimeEcs | null {
		return this.runtimes.get(userId) ?? null;
	}

	public startExperiment(
		actor: ExperimentActor,
		entityName: string,
		experimentKey: string,
	): void {
		if (this.runtimes.has(actor.userId)) {
			throw new Error(`User ${actor.userId} already has an active experiment`);
		}

		const factory = this.factories[experimentKey];
		if (!factory) {
			throw new Error(
				`No runtime factory registered for experiment '${experimentKey}'`,
			);
		}

		const runtime = factory(actor, entityName);
		const runtimeKey = `experiment-runtime:${actor.userId}`;

		this.world.set(runtime, runtimeKey);
		this.runtimes.set(actor.userId, runtime);
		this.entityToUser.set(entityName, actor.userId);

		void this.mountExperimentAndStartFlow(actor.userId, experimentKey);
	}

	public stopExperiment(userId: string): void {
		this.cancelDeferredForUser(userId);
		this.phaseFlows.delete(userId);

		const runtime = this.runtimes.get(userId);
		if (!runtime) return;

		const runtimeKey = `experiment-runtime:${userId}`;
		this.world.unset(runtimeKey);
		this.runtimes.delete(userId);
		this.entityToUser.delete(runtime.entityName);
	}

	public onPlayerLeave(userId: string): void {
		this.stopExperiment(userId);
	}

	// --- Callbacks desde fases ---

	public handlePhaseSuccess(userId: string): void {
		const runtime = this.runtimes.get(userId);
		if (!runtime) return;

		const flow = this.phaseFlows.get(userId);
		if (!flow) return;

		this.showPhaseMessage(userId, 'Completado', '', PHASE_MESSAGE_SUCCESS_MS);

		const deferKey = `phase-success-${userId}-${Date.now()}`;
		flow.deferKeys.push(deferKey);
		this.defer.defer(PHASE_MESSAGE_SUCCESS_MS, () => {
			this.unmountPhaseForUser(userId);
			this.advanceToNextPhase(userId);
		}, deferKey);
	}

	public handlePhaseFailure(userId: string, reason: string): void {
		const runtime = this.runtimes.get(userId);
		if (!runtime) return;

		const flow = this.phaseFlows.get(userId);
		if (!flow) return;

		this.showPhaseMessage(userId, 'Fallaste', reason, PHASE_MESSAGE_FAIL_MS);

		const deferKey1 = `phase-fail-${userId}-${Date.now()}`;
		flow.deferKeys.push(deferKey1);
		this.defer.defer(PHASE_MESSAGE_FAIL_MS, () => {
			this.unmountPhaseForUser(userId);

			this.showPhaseMessage(userId, 'Again', '', PHASE_MESSAGE_AGAIN_MS);

			const deferKey2 = `phase-again-${userId}-${Date.now()}`;
			flow.deferKeys.push(deferKey2);
			this.defer.defer(PHASE_MESSAGE_AGAIN_MS, () => {
				this.mountCurrentPhase(userId);
			}, deferKey2);
		}, deferKey1);
	}

	// --- Flujo de fases ---

	private async mountExperimentAndStartFlow(
		userId: string,
		experimentKey: string,
	): Promise<void> {
		const runtime = this.runtimes.get(userId);
		if (!runtime) return;

		try {
			await runtime.mount();
			const experiment = await ExperimentService.mountExperimentForUser({
				actor: runtime.actor,
				experimentKey,
				roomId: runtime.roomId,
			});

			if (!experiment || experiment.status !== 'IN_PROGRESS') {
				return;
			}

			const currentPhase = experiment.phases.find(
				(p) => p.phaseIndex === experiment.currentPhaseIndex,
			);

			if (!currentPhase || currentPhase.status !== 'ACTIVE') {
				return;
			}

			const flow: PhaseFlowState = {
				currentPhaseIndex: experiment.currentPhaseIndex,
				currentAttemptNumber: currentPhase.currentAttemptNumber,
				deferKeys: [],
			};
			this.phaseFlows.set(userId, flow);

			if (currentPhase.currentAttemptNumber === 1) {
				this.startPhaseFlowWithCountdown(userId);
			} else {
				this.mountCurrentPhase(userId);
			}
		} catch (err) {
			console.error(`[ExperimentManager] Failed to mount experiment for ${userId}:`, err);
			this.stopExperiment(userId);
		}
	}

	private startPhaseFlowWithCountdown(userId: string): void {
		const runtime = this.runtimes.get(userId);
		const flow = this.phaseFlows.get(userId);
		if (!runtime || !flow) return;

		const catalogEntry = getExperimentByKey(runtime.experimentKey);
		if (!catalogEntry) return;

		const phaseDef = catalogEntry.phases[flow.currentPhaseIndex];
		if (!phaseDef) return;

		const definition = getExperimentPhaseByKey(phaseDef.key, runtime.experimentKey);
		if (!definition) return;

		this.serverData.room.broadcast('experiment:phase:countdown', {
			userId,
			experimentKey: runtime.experimentKey,
			phaseIndex: flow.currentPhaseIndex,
			title: definition.title,
			description: definition.description,
		});

		const deferKey = `phase-countdown-${userId}-${Date.now()}`;
		flow.deferKeys.push(deferKey);
		this.defer.defer(PHASE_COUNTDOWN_MS, () => {
			this.mountCurrentPhase(userId);
		}, deferKey);
	}

	private mountCurrentPhase(userId: string): void {
		const runtime = this.runtimes.get(userId);
		const flow = this.phaseFlows.get(userId);
		if (!runtime || !flow) return;

		const catalogEntry = getExperimentByKey(runtime.experimentKey);
		if (!catalogEntry) return;

		const phaseDef = catalogEntry.phases[flow.currentPhaseIndex];
		if (!phaseDef) return;

		const definition = getExperimentPhaseByKey(phaseDef.key, runtime.experimentKey);
		if (!definition) return;

		runtime.mountPhase(definition);
		runtime.activePhase?.mountPhase();
	}

	private unmountPhaseForUser(userId: string): void {
		const runtime = this.runtimes.get(userId);
		if (!runtime) return;
		runtime.unmountPhase();
	}

	private async advanceToNextPhase(userId: string): Promise<void> {
		const runtime = this.runtimes.get(userId);
		if (!runtime) return;

		try {
			const experiment = await ExperimentService.resolveCurrentPhaseFromWorld({
				userId,
				experimentKey: runtime.experimentKey,
			});

			if (experiment.status === 'AWAITING_FEEDBACK') {
				this.serverData.room.broadcast('experiment:awaiting-feedback', {
					userId,
					experimentKey: runtime.experimentKey,
				});
				return;
			}

			const currentPhase = experiment.phases.find(
				(p) => p.phaseIndex === experiment.currentPhaseIndex,
			);

			if (!currentPhase || currentPhase.status !== 'ACTIVE') {
				return;
			}

			const flow: PhaseFlowState = {
				currentPhaseIndex: experiment.currentPhaseIndex,
				currentAttemptNumber: currentPhase.currentAttemptNumber,
				deferKeys: [],
			};
			this.phaseFlows.set(userId, flow);

			this.startPhaseFlowWithCountdown(userId);
		} catch (err) {
			console.error(`[ExperimentManager] advanceToNextPhase error for ${userId}:`, err);
		}
	}

	// --- Mensajes ---

	private showPhaseMessage(
		userId: string,
		title: string,
		subtitle: string,
		durationMs: number,
	): void {
		const runtime = this.runtimes.get(userId);
		if (!runtime) return;

		this.serverData.room.broadcast('experiment:phase:message', {
			userId,
			experimentKey: runtime.experimentKey,
			title,
			subtitle,
			durationMs,
		});
	}

	// --- Limpieza ---

	private cancelDeferredForUser(userId: string): void {
		const flow = this.phaseFlows.get(userId);
		if (!flow) return;

		for (const key of flow.deferKeys) {
			this.defer.defer(0, () => {}, key);
		}
		flow.deferKeys = [];
	}

	onDelete(): void {
		for (const userId of [...this.runtimes.keys()]) {
			this.stopExperiment(userId);
		}
		super.onDelete();
	}
}
