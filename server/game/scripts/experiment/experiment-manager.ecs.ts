import { ComponentEcs } from '#/ecs';

import type { ExperimentActor } from '$/services/experiment-orchestrator.service';

import type { ExperimentRuntimeEcs } from './experiment-runtime.ecs';

export type ExperimentRuntimeFactory = (
	actor: ExperimentActor,
	entityName: string,
) => ExperimentRuntimeEcs;

export class ExperimentManagerEcs extends ComponentEcs {
	private runtimes = new Map<string, ExperimentRuntimeEcs>();
	private entityToUser = new Map<string, string>();

	constructor(
		private readonly factories: Map<string, ExperimentRuntimeFactory>,
	) {
		super();
	}

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

		const factory = this.factories.get(experimentKey);
		if (!factory) {
			throw new Error(`No runtime factory registered for experiment '${experimentKey}'`);
		}

		const runtime = factory(actor, entityName);
		const runtimeKey = `experiment-runtime:${actor.userId}`;

		this.world.set(runtime, runtimeKey);
		this.runtimes.set(actor.userId, runtime);
		this.entityToUser.set(entityName, actor.userId);
	}

	public stopExperiment(userId: string): void {
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

	onDelete(): void {
		for (const userId of [...this.runtimes.keys()]) {
			this.stopExperiment(userId);
		}
		super.onDelete();
	}
}
