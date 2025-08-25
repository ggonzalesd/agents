import { v4 as uuidv4 } from 'uuid';

import type { EntityEcs } from './Entity.ecs';
import type { WorldEcs } from './World.ecs';

import { Option } from '#/utils/Option';

export class ComponentEcs {
	active: boolean = true;
	name: string;

	public world: WorldEcs = null!;
	public entity: Option<EntityEcs> = Option.none();

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
