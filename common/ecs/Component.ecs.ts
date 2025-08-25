import { v4 as uuidv4 } from 'uuid';

import type { WorldEcs } from './World.ecs';

export class ComponentEcs {
	active: boolean = true;
	isSetup: boolean = false;
	name: string;

	public _world: WorldEcs = null!;
	public parent: string | null = null;

	public set world(world: WorldEcs) {
		this._world = world;
	}

	public get world(): WorldEcs {
		if (this._world == null) {
			throw new Error('World is accessible only within onStart');
		}

		return this._world;
	}

	private __deferCallbacks: Set<() => void> = new Set();

	constructor() {
		this.name = uuidv4();
	}

	onStart() {}

	onLoop(_delta: number) {}

	onDelete() {
		this.__deferCallbacks.forEach((callback) => callback());
		this.__deferCallbacks.clear();
	}

	callOnDelete(...callback: Array<() => void>) {
		callback.forEach((cb) => this.__deferCallbacks.add(cb));
	}
}
