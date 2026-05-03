import type { ExperimentPhaseDefinition } from '#/experiments/guia-experimentacion-v4';
import { ComponentEcs } from '#/ecs';

import type { WorldEventBusEcs, WorldEventType } from '../world-event-bus.ecs';
import type { ExperimentRuntimeEcs } from './experiment-runtime.ecs';

type Unsubscribe = () => void;

export class ExperimentPhaseEcs extends ComponentEcs {
	public readonly definition: ExperimentPhaseDefinition;
	public readonly runtime: ExperimentRuntimeEcs;
	private _isMounted = false;
	protected unsubs: Unsubscribe[] = [];

	constructor(
		definition: ExperimentPhaseDefinition,
		runtime: ExperimentRuntimeEcs,
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

	public get isMounted(): boolean {
		return this._isMounted;
	}

	public mountPhase(): void {
		if (this._isMounted) return;
		this._isMounted = true;
		this.onMountPhase();
	}

	public unmountPhase(): void {
		if (!this._isMounted) return;
		this._isMounted = false;
		this.onUnmountPhase();
		this.unsubs.forEach((u) => u());
		this.unsubs = [];
	}

	onStart(): void {}

	onDelete(): void {
		this.unmountPhase();
		super.onDelete();
	}

	protected onEvent<T = unknown>(
		bus: WorldEventBusEcs,
		type: WorldEventType,
		entityName: string,
		handler: (payload: T) => void,
	): void {
		const unsub = bus.on<T>(type, (name, payload) => {
			if (name === entityName) handler(payload);
		});
		this.unsubs.push(unsub);
	}

	protected onMountPhase(): void {}

	protected onUnmountPhase(): void {}
}
