import { ComponentEcs } from '../Component.ecs';

type DeferredCallbackItemType = {
	callback: () => void;
	currentTime: number;
	maxTime: number;
};

export class DeferEcs extends ComponentEcs {
	private defereds: Map<string, DeferredCallbackItemType> = new Map();

	public onStart(): void {
		this.callOnDelete(() => {
			this.defereds.clear();
		});
	}

	public defer(time: number, callback: () => void, key?: string) {
		const _key = key ?? `defer-${Date.now()}-${Math.random()}`;
		this.defereds.set(_key, { callback, currentTime: 0, maxTime: time });

		const unload = () => {
			this.defereds.delete(_key);
		};

		return unload.bind(this);
	}

	onLoop(_delta: number): void {
		const keys = Array.from(this.defereds.keys());

		for (const key of keys) {
			const deferred = this.defereds.get(key);
			if (!deferred) continue;

			deferred.currentTime += _delta;
			if (deferred.currentTime >= deferred.maxTime) {
				deferred.callback();
				this.defereds.delete(key);
			}
		}
	}
}
