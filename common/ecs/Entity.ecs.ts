import { v4 as uuidv4 } from 'uuid';

import type { ComponentEcs } from './Component.ecs';
import type { WorldEcs } from './World.ecs';

import { BaseEcs } from './Base.ecs';

export class EntityEcs extends BaseEcs {
	public name: string;
	public active: boolean = true;
	public deleted: boolean = false;

	public world: WorldEcs;

	constructor(props: {
		name?: string | null;
		world: WorldEcs;
		components: Record<string, ComponentEcs>;
	}) {
		super();
		const { components, world, name: _name } = props;
		this.name = _name ?? uuidv4();
		this.world = world;
		this.init(this.world, this.name, components);
	}

	onStart() {
		this.components.forEach((component) => {
			component.onStart();
			component.isSetup = true;
		});
	}

	onUpdate(delta: number) {
		if (!this.active) return;

		this.update(delta);
	}

	onDelete() {
		this.active = false;

		for (const component of this.components.values()) {
			component.onDelete();
		}
		this.components.clear();
	}
}
