import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';
import { ComponentEcs } from '#/ecs';

import type { WorldEventBusEcs, WorldEventType } from '../world-event-bus.ecs';
import type { ExperimentRuntimeEcs } from './experiment-runtime.ecs';

type Unsubscribe = () => void;

export class ExperimentPhaseEcs extends ComponentEcs {
	public readonly definition: ExperimentPhaseDefinition;
	public runtimeUserId: string = '';
	protected runtime: ExperimentRuntimeEcs | null = null;
	protected unsubs: Unsubscribe[] = [];

	constructor(
		definition: ExperimentPhaseDefinition,
		runtime: ExperimentRuntimeEcs | null = null,
	) {
		super();
		this.definition = definition;
		this.runtime = runtime;
	}

	public get phaseKey(): string {
		return this.definition.key;
	}

	public get componentKey(): string {
		return this.definition.componentKey;
	}

	onStart(): void {
		this.onMountPhase();
	}

	onDelete(): void {
		this.onUnmountPhase();
		this.unsubs.forEach((u) => u());
		this.unsubs = [];
		super.onDelete();
	}

	protected onEvent<T = unknown>(
		bus: WorldEventBusEcs,
		type: WorldEventType,
		entityName: string,
		handler: (payload: T) => void,
	): void {
		console.log(`Subscribing to event ${type} for entity ${entityName}`);
		const unsub = bus.on<T>(type, (name, payload) => {
			console.log(
				`Received event ${type} for entity ${name} with payload:`,
				payload,
			);
			if (name === entityName) handler(payload);
		});
		this.unsubs.push(unsub);
	}

	protected onMountPhase(): void {}

	protected onUnmountPhase(): void {}

	public onRestartPhase(): void {}
}
